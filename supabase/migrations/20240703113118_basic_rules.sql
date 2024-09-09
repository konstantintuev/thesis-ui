CREATE OR REPLACE FUNCTION aggregate_json_metadata_keys()
    RETURNS TABLE
            (
                key         TEXT,
                value_types TEXT[]
            )
AS
$$
BEGIN
    RETURN QUERY
        WITH json_keys AS (SELECT jsonb_object_keys(metadata)                           AS key,
                                  jsonb_typeof(metadata -> jsonb_object_keys(metadata)) AS value_type
                           FROM files),
             distinct_keys AS (SELECT DISTINCT key, value_type
                               FROM json_keys)
        SELECT key,
               array_agg(DISTINCT value_type) AS value_types
        FROM distinct_keys
        GROUP BY key
        ORDER BY key;
END;
$$ LANGUAGE plpgsql;

create table if not exists rules(
    id         uuid                     not null default uuid_generate_v4(),
    weight     double precision         not null,
    name       text                     not null,
    comparison json                     not null,
    user_id    uuid                     not null default auth.uid(),
    type       text                     not null default 'basic'::text,
    created_at timestamp with time zone not null default now(),
    folder_id  uuid                     null,
    constraint rules_pkey primary key (id),
    constraint rules_name_key unique (name),
    constraint public_comparisons_user_id_fkey foreign key (user_id) references auth.users (id) on update cascade on delete cascade,
    constraint public_rules_folder_id_fkey foreign key (folder_id) references folders (id) on update cascade on delete set null,
    constraint comparisons_type_check check (
        (
            type = any (array ['basic'::text, 'advanced'::text])
            )
        ),
    constraint comparisons_name_check check (
        (
            name <> ''
        )
        ),
    constraint comparisons_weight_check check (
        (
            weight > 0
            )
        )
) tablespace pg_default;

alter table "public"."rules" enable row level security;

create policy "Enable read access to rule folders"
    on "public"."folders"
    as permissive
    for select
    to public
    using ((EXISTS (SELECT 1
                    FROM rules
                    WHERE (rules.folder_id = folders.id))));

create policy "Enable delete for users based on user_id"
    on "public"."rules"
    as restrictive
    for delete
    to authenticated
    using (((SELECT auth.uid() AS uid) = user_id));


create policy "Select for authenticated and change for own"
    on "public"."rules"
    as permissive
    for all
    to authenticated
    using (true)
    with check ((user_id = auth.uid()));



CREATE OR REPLACE FUNCTION rank_files(file_ids UUID[] DEFAULT NULL)
    RETURNS TABLE
            (
                id                 UUID,
                user_id            UUID,
                folder_id          UUID,
                created_at         TIMESTAMPTZ,
                updated_at         TIMESTAMPTZ,
                sharing            TEXT,
                description        TEXT,
                file_path          TEXT,
                name               TEXT,
                size               INTEGER,
                tokens             INTEGER,
                type               TEXT,
                metadata           JSON,
                total_score        DOUBLE PRECISION,
                comparison_results JSON
            )
AS
$$
DECLARE
    comp              RECORD;
    comparison_detail JSON;
    condition_sql     TEXT;
    total_weight      FLOAT := 0;
    dynamic_sql       TEXT  := '';
    comparison_json   TEXT  := '';
BEGIN
    -- Loop through each comparison batch and build the scoring logic dynamically
    FOR comp IN SELECT * FROM rules where type = 'basic'
        LOOP
            -- Initialize the condition SQL for this batch
            condition_sql := '';

            -- Loop through each comparison in the comparison JSON array
            FOR comparison_detail IN SELECT * FROM json_array_elements(comp.comparison::json) AS elem
                LOOP
                    condition_sql := condition_sql || CASE
                                                          WHEN (comparison_detail ->> 'comparator')::text = 'eq' THEN
                                                              format('metadata->>%L = %L AND ',
                                                                     (comparison_detail ->> 'attribute')::text,
                                                                     (comparison_detail ->> 'value')::text)
                                                          WHEN (comparison_detail ->> 'comparator')::text = 'ne' THEN
                                                              format('metadata->>%L != %L AND ',
                                                                     (comparison_detail ->> 'attribute')::text,
                                                                     (comparison_detail ->> 'value')::text)
                                                          WHEN (comparison_detail ->> 'comparator')::text = 'gt' THEN
                                                              format('(metadata->>%L)::double precision > %L AND ',
                                                                     (comparison_detail ->> 'attribute')::text,
                                                                     (comparison_detail ->> 'value')::text)
                                                          WHEN (comparison_detail ->> 'comparator')::text = 'gte' THEN
                                                              format('(metadata->>%L)::double precision >= %L AND ',
                                                                     (comparison_detail ->> 'attribute')::text,
                                                                     (comparison_detail ->> 'value')::text)
                                                          WHEN (comparison_detail ->> 'comparator')::text = 'lt' THEN
                                                              format('(metadata->>%L)::double precision < %L AND ',
                                                                     (comparison_detail ->> 'attribute')::text,
                                                                     (comparison_detail ->> 'value')::text)
                                                          WHEN (comparison_detail ->> 'comparator')::text = 'lte' THEN
                                                              format('(metadata->>%L)::double precision <= %L AND ',
                                                                     (comparison_detail ->> 'attribute')::text,
                                                                     (comparison_detail ->> 'value')::text)
                                                          WHEN (comparison_detail ->> 'comparator')::text = 'contain'
                                                              THEN
                                                              format('metadata->>%L LIKE %L AND ',
                                                                     (comparison_detail ->> 'attribute')::text,
                                                                     '%%' || (comparison_detail ->> 'value')::text ||
                                                                     '%%')
                                                          WHEN (comparison_detail ->> 'comparator')::text = 'not_contain'
                                                              THEN
                                                              format('metadata->>%L NOT LIKE %L AND ',
                                                                     (comparison_detail ->> 'attribute')::text,
                                                                     '%%' || (comparison_detail ->> 'value')::text ||
                                                                     '%%')
                                                          WHEN (comparison_detail ->> 'comparator')::text = 'like' THEN
                                                              format('metadata->>%L LIKE %L AND ',
                                                                     (comparison_detail ->> 'attribute')::text,
                                                                     (comparison_detail ->> 'value')::text)
                                                          WHEN (comparison_detail ->> 'comparator')::text = 'not_like'
                                                              THEN
                                                              format('metadata->>%L NOT LIKE %L AND ',
                                                                     (comparison_detail ->> 'attribute')::text,
                                                                     (comparison_detail ->> 'value')::text)
                                                          WHEN (comparison_detail ->> 'comparator')::text = 'in' THEN
                                                              format(
                                                                      'metadata->>%L = ANY (string_to_array(%L, '','')) AND ',
                                                                      (comparison_detail ->> 'attribute')::text,
                                                                      (comparison_detail ->> 'value')::text)
                                                          WHEN (comparison_detail ->> 'comparator')::text = 'nin' THEN
                                                              format(
                                                                      'metadata->>%L != ALL (string_to_array(%L, '','')) AND ',
                                                                      (comparison_detail ->> 'attribute')::text,
                                                                      (comparison_detail ->> 'value')::text)
                        END;
                END LOOP;

            -- Remove the last ' AND ' from condition_sql
            condition_sql := left(condition_sql, length(condition_sql) - 5);

            -- Add the batch condition to the dynamic SQL
            dynamic_sql := dynamic_sql || format('CASE WHEN %s THEN %s ELSE 0 END + ', condition_sql, comp.weight);

            -- Build the JSON for each comparison
            comparison_json := comparison_json ||
                               format('''%s'', CASE WHEN %s THEN true ELSE false END, ', comp.name,
                                      condition_sql);

            -- Add to total weight if condition_sql is valid
            IF condition_sql IS NOT NULL AND condition_sql <> '' THEN
                total_weight := total_weight + comp.weight;
            END IF;
        END LOOP;

    -- Remove the last ' + ' from dynamic_sql
    dynamic_sql := left(dynamic_sql, length(dynamic_sql) - 3);

    -- Remove the last ', ' from comparison_json
    comparison_json := left(comparison_json, length(comparison_json) - 2);

    -- Construct the final SQL query
    IF file_ids IS NOT NULL THEN
        dynamic_sql := format(
                'SELECT *, ((%s) / NULLIF(%s, 0))::double precision AS total_score, json_build_object(%s) AS comparison_results FROM files WHERE id = ANY ($1) ORDER BY total_score DESC;',
                dynamic_sql, total_weight, comparison_json);
    ELSE
        dynamic_sql := format(
                'SELECT *, ((%s) / NULLIF(%s, 0))::double precision AS total_score, json_build_object(%s) AS comparison_results FROM files ORDER BY total_score DESC;',
                dynamic_sql, total_weight, comparison_json);
    END IF;

    -- Execute the dynamic SQL
    RETURN QUERY EXECUTE dynamic_sql USING file_ids;
END
$$ LANGUAGE plpgsql;




