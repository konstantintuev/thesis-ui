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

-- Helper function to generate proper JSONB access for nested attributes
CREATE OR REPLACE FUNCTION jsonb_access(attribute TEXT) RETURNS TEXT AS
$$
DECLARE
    keys   TEXT[];
    access TEXT := '';
    i      INT;
BEGIN
    -- Split the attribute by dots (e.g., file_metadata.avgWordsPerPage becomes an array)
    keys := string_to_array(attribute, '.');

    -- Loop through each key and construct the proper access operator
    FOR i IN 1..array_length(keys, 1)
        LOOP
            IF i < array_length(keys, 1) THEN
                access := access || format('->%L', keys[i]);
            ELSE
                -- Last key gets '->>' to extract text
                access := access || format('->>%L', keys[i]);
            END IF;
        END LOOP;

    RETURN access;
END
$$ LANGUAGE plpgsql;

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
                metadata           JSONB,
                total_score        DOUBLE PRECISION,
                comparison_results JSONB
            )
AS
$$
DECLARE
    comp              RECORD;
    comparison_detail JSONB;
    condition_sql     TEXT;
    total_weight      FLOAT := 0;
    dynamic_sql       TEXT  := '';
    comparison_json   TEXT  := '';

BEGIN
    -- Loop through each comparison batch and build the scoring logic dynamically
    FOR comp IN SELECT * FROM rules WHERE rules.type = 'basic'
        LOOP
            -- Initialize the condition SQL for this batch
            condition_sql := '';

            -- Loop through each comparison in the comparison JSONB array
            FOR comparison_detail IN SELECT * FROM jsonb_array_elements(comp.comparison::jsonb) AS elem
                LOOP
                    -- Generate the JSONB access based on whether the attribute is nested or not
                    condition_sql := condition_sql || CASE
                        -- For equality check (eq)
                                                          WHEN (comparison_detail ->> 'comparator')::text = 'eq' THEN
                                                              format('metadata%s = %L AND ',
                                                                     jsonb_access((comparison_detail ->> 'attribute')::text),
                                                                     (comparison_detail ->> 'value')::text)

                        -- For inequality check (ne)
                                                          WHEN (comparison_detail ->> 'comparator')::text = 'ne' THEN
                                                              format('metadata%s != %L AND ',
                                                                     jsonb_access((comparison_detail ->> 'attribute')::text),
                                                                     (comparison_detail ->> 'value')::text)

                        -- For greater than (gt)
                                                          WHEN (comparison_detail ->> 'comparator')::text = 'gt' THEN
                                                              format('(metadata%s)::double precision > %L AND ',
                                                                     jsonb_access((comparison_detail ->> 'attribute')::text),
                                                                     (comparison_detail ->> 'value')::text)

                        -- For greater than or equal (gte)
                                                          WHEN (comparison_detail ->> 'comparator')::text = 'gte' THEN
                                                              format('(metadata%s)::double precision >= %L AND ',
                                                                     jsonb_access((comparison_detail ->> 'attribute')::text),
                                                                     (comparison_detail ->> 'value')::text)

                        -- For less than (lt)
                                                          WHEN (comparison_detail ->> 'comparator')::text = 'lt' THEN
                                                              format('(metadata%s)::double precision < %L AND ',
                                                                     jsonb_access((comparison_detail ->> 'attribute')::text),
                                                                     (comparison_detail ->> 'value')::text)

                        -- For less than or equal (lte)
                                                          WHEN (comparison_detail ->> 'comparator')::text = 'lte' THEN
                                                              format('(metadata%s)::double precision <= %L AND ',
                                                                     jsonb_access((comparison_detail ->> 'attribute')::text),
                                                                     (comparison_detail ->> 'value')::text)

                        -- For string contains (contain)
                                                          WHEN (comparison_detail ->> 'comparator')::text = 'contain'
                                                              THEN
                                                              format('metadata%s ILIKE ''%%%s%%'' AND ',
                                                                     jsonb_access((comparison_detail ->> 'attribute')::text),
                                                                     (comparison_detail ->> 'value')::text)

                        -- For string does not contain (not_contain)
                                                          WHEN (comparison_detail ->> 'comparator')::text = 'not_contain'
                                                              THEN
                                                              format('metadata%s NOT ILIKE ''%%%s%%'' AND ',
                                                                     jsonb_access((comparison_detail ->> 'attribute')::text),
                                                                     (comparison_detail ->> 'value')::text)

                        -- For "like" comparison
                                                          WHEN (comparison_detail ->> 'comparator')::text = 'like' THEN
                                                              format('metadata%s ILIKE ''%s'' AND ',
                                                                     jsonb_access((comparison_detail ->> 'attribute')::text),
                                                                     (comparison_detail ->> 'value')::text)

                        -- For "not like" comparison
                                                          WHEN (comparison_detail ->> 'comparator')::text = 'not_like'
                                                              THEN
                                                              format('metadata%s NOT ILIKE ''%s'' AND ',
                                                                     jsonb_access((comparison_detail ->> 'attribute')::text),
                                                                     (comparison_detail ->> 'value')::text)
                        -- For regular expression match (regex_match)
                                                          WHEN (comparison_detail ->> 'comparator')::text = 'regex_match'
                                                              THEN
                                                              format('metadata%s ~* %L AND ',
                                                                     jsonb_access((comparison_detail ->> 'attribute')::text),
                                                                     (comparison_detail ->> 'value')::text)

                        -- For regular expression not match (regex_not_match)
                                                          WHEN (comparison_detail ->> 'comparator')::text = 'not_regex_match'
                                                              THEN
                                                              format('metadata%s !~* %L AND ',
                                                                     jsonb_access((comparison_detail ->> 'attribute')::text),
                                                                     (comparison_detail ->> 'value')::text)

                        -- For "in" array comparison (works for comma-separated values)
                                                          WHEN (comparison_detail ->> 'comparator')::text = 'in' THEN
                                                              format(
                                                                      'metadata%s = ANY (string_to_array(%L, '','')) AND ',
                                                                      jsonb_access((comparison_detail ->> 'attribute')::text),
                                                                      (comparison_detail ->> 'value')::text)

                        -- For "not in" array comparison
                                                          WHEN (comparison_detail ->> 'comparator')::text = 'nin' THEN
                                                              format(
                                                                      'metadata%s != ALL (string_to_array(%L, '','')) AND ',
                                                                      jsonb_access((comparison_detail ->> 'attribute')::text),
                                                                      (comparison_detail ->> 'value')::text)
                        END;
                END LOOP;

            -- Remove the last ' AND ' from condition_sql
            condition_sql := left(condition_sql, length(condition_sql) - 5);

            -- Add the batch condition to the dynamic SQL
            dynamic_sql := dynamic_sql || format('CASE WHEN %s THEN %s ELSE 0 END + ', condition_sql, comp.weight);

            -- Build the JSONB for each comparison
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
                'SELECT *, ((%s) / NULLIF(%s, 0))::double precision AS total_score, jsonb_build_object(%s) AS comparison_results FROM files WHERE id = ANY ($1) ORDER BY total_score DESC;',
                dynamic_sql, total_weight, comparison_json);
    ELSE
        dynamic_sql := format(
                'SELECT *, ((%s) / NULLIF(%s, 0))::double precision AS total_score, jsonb_build_object(%s) AS comparison_results FROM files ORDER BY total_score DESC;',
                dynamic_sql, total_weight, comparison_json);
    END IF;

    -- Execute the dynamic SQL
    RETURN QUERY EXECUTE dynamic_sql USING file_ids;
END
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION flatten_json(json_data JSONB, parent_path TEXT DEFAULT '')
    RETURNS JSONB AS
$$
DECLARE
    json_pair          RECORD;
    key                TEXT;
    new_path           TEXT;
    flattened_metadata JSONB := '{}'; -- Store the flattened metadata here
BEGIN
    -- Handle JSON objects
    IF jsonb_typeof(json_data) = 'object' THEN
        FOR json_pair IN SELECT * FROM jsonb_each(json_data)
            LOOP
                key := json_pair.key;
                new_path := CASE WHEN parent_path = '' THEN key ELSE parent_path || '.' || key END;

                -- Recurse if the value is an object or array
                IF jsonb_typeof(json_pair.value) = 'object' OR jsonb_typeof(json_pair.value) = 'array' THEN
                    flattened_metadata := flattened_metadata || flatten_json(json_pair.value, new_path);
                ELSE
                    -- Otherwise, it's a terminal value (e.g., string, number, boolean)
                    flattened_metadata := flattened_metadata || jsonb_build_object(new_path, json_pair.value);
                END IF;
            END LOOP;
        -- Handle JSON arrays
    ELSIF jsonb_typeof(json_data) = 'array' THEN
        FOR i IN 0 .. jsonb_array_length(json_data) - 1
            LOOP
                new_path := parent_path || '[' || i || ']';
                flattened_metadata := flattened_metadata || flatten_json(json_data -> i, new_path);
            END LOOP;
    ELSE
        -- It's a primitive value (string, number, boolean, etc.)
        IF parent_path IS NOT NULL AND parent_path <> '' THEN
            flattened_metadata := jsonb_build_object(parent_path, json_data);
        END IF;
    END IF;

    RETURN flattened_metadata;
END
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION aggregate_metadata()
    RETURNS JSON AS
$$
DECLARE
    metadata_record    RECORD;
    flattened_metadata JSONB;
    metadata_paths     JSONB := '{}';
    occurrence_counter JSONB := '{}';
    samples            JSONB := '{}';
    types              JSONB := '{}';
    path               TEXT;
    value              JSONB; -- Keeping value as JSONB to preserve type
    current_occurrence INT;
    value_type         TEXT;
BEGIN
    -- Loop through each file in the files table
    FOR metadata_record IN SELECT metadata FROM files
        LOOP
            -- Flatten the metadata for each file (including nested structures)
            flattened_metadata := flatten_json(metadata_record.metadata::jsonb);

            -- Loop through each key-value pair in the flattened metadata (preserving types)
            FOR path, value IN SELECT * FROM jsonb_each(flattened_metadata)
                LOOP
                    -- Skip empty paths
                    IF path IS NOT NULL AND path <> '' THEN
                        -- Infer the type of the value and store it in `types`
                        value_type := jsonb_typeof(value);

                        -- Count occurrences of each path
                        IF occurrence_counter ? path THEN
                            -- Get current occurrence count, cast to integer, increment, and set back
                            current_occurrence := (occurrence_counter ->> path)::INT;
                            occurrence_counter :=
                                    jsonb_set(occurrence_counter, array [path], to_jsonb(current_occurrence + 1));
                        ELSE
                            occurrence_counter := jsonb_set(occurrence_counter, array [path], '1'::jsonb);
                            -- Store the first occurrence of the type
                            types := jsonb_set(types, array [path], to_jsonb(value_type));
                        END IF;

                        -- Store a sample of up to 2 unique values for each path
                        IF samples ? path THEN
                            -- Add value to sample array if not already present and if there are fewer than 2 values
                            IF jsonb_array_length(samples -> path) < 2 AND
                               NOT (samples -> path @> jsonb_build_array(value)) THEN
                                samples := jsonb_set(samples, array [path],
                                                     (samples -> path || jsonb_build_array(value))::jsonb);
                            END IF;
                        ELSE
                            -- Initialize the sample with the first value
                            samples := jsonb_set(samples, array [path], jsonb_build_array(value));
                        END IF;
                    END IF;
                END LOOP;
        END LOOP;

    -- Combine occurrence count, type, and sample into the final JSON structure
    metadata_paths := (SELECT jsonb_agg(jsonb_build_object(
            'path', key,
            'occurrence', occurrence_counter -> key,
            'sample', samples -> key,
            'type', types -> key
                                        ))
                       FROM jsonb_each(occurrence_counter));

    RETURN metadata_paths;
END
$$ LANGUAGE plpgsql;
