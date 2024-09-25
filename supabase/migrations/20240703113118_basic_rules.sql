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
    comparison jsonb                    not null,
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

-- Everyone authenticated read rules
create policy "Enable read access to rule folders"
    on "public"."folders"
    as permissive
    for select
    to authenticated
    using (type = 'rules');

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


CREATE OR REPLACE FUNCTION attribute_to_jsonpath(attribute TEXT) RETURNS TEXT AS
$$
DECLARE
    keys     TEXT[];
    jsonpath TEXT := '$';
    i        INT;
BEGIN
    -- Split the attribute by dots
    keys := string_to_array(attribute, '.');

    -- Append recursive descent to the last key
    jsonpath := jsonpath || '.';

    FOR i IN 1..array_length(keys, 1) - 1
        LOOP
            jsonpath := jsonpath || keys[i] || '.';
        END LOOP;

    -- Add recursive descent before the last key
    jsonpath := jsonpath || '**.' || keys[array_length(keys, 1)];

    RETURN jsonpath;
END
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION rank_files(file_ids UUID[] DEFAULT NULL, rule_ids UUID[] DEFAULT NULL)
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

    -- Variables for constructing conditions
    attr              TEXT;
    comp_op           TEXT;
    comp_value        TEXT;
    jsonpath          TEXT;
    condition_part    TEXT;
    operator          TEXT;
    pattern           TEXT;
    values_array      TEXT[];
    conditions        TEXT;
    i                 INT;
BEGIN
    -- Loop through each comparison batch and build the scoring logic dynamically
    FOR comp IN SELECT * FROM rules WHERE rules.type = 'basic' AND
        -- If rule_ids is not NULL, check if the rule id is in the array
        ((rule_ids IS NOT NULL AND rules.id = ANY(rule_ids))
        -- ...otherwise match any
            OR rule_ids IS NULL
        )
        LOOP
            -- Initialize the condition SQL for this batch
            condition_sql := '';

            -- Loop through each comparison in the comparison JSONB array
            FOR comparison_detail IN SELECT * FROM jsonb_array_elements(comp.comparison::jsonb) AS elem
                LOOP
                    -- Extract comparison details
                    attr := comparison_detail ->> 'attribute';
                    comp_op := comparison_detail ->> 'comparator';
                    comp_value := comparison_detail ->> 'value';
                    jsonpath := attribute_to_jsonpath(attr);
                    condition_part := '';

                    -- Build condition based on comparator
                    IF comp_op IN ('eq', 'ne', 'gt', 'gte', 'lt', 'lte') THEN
                        -- Map comparators to JSONPath operators
                        DECLARE
                            op_mapping  JSONB := jsonb_build_object(
                                    'eq', '==',
                                    'ne', '!=',
                                    'gt', '>',
                                    'gte', '>=',
                                    'lt', '<',
                                    'lte', '<='
                                                 );
                            jsonpath_op TEXT  := op_mapping ->> comp_op;
                        BEGIN
                            -- Determine if value is numeric
                            IF comp_value ~ '^\d+(\.\d+)?$' THEN
                                -- Numeric comparison
                                condition_part := format(
                                        'jsonb_path_exists(metadata, %L)',
                                        jsonpath || format(' ? (@ %s %s)', jsonpath_op, comp_value)
                                                  );
                            ELSE
                                -- String comparison
                                condition_part := format(
                                        'jsonb_path_exists(metadata, %L)',
                                        jsonpath || format(' ? (@ %s "%s")', jsonpath_op, comp_value)
                                                  );
                            END IF;
                        END;
                    ELSIF comp_op IN ('contain', 'not_contain') THEN
                        operator := CASE WHEN comp_op = 'contain' THEN 'like_regex' ELSE '!like_regex' END;
                        pattern := '.*' || regexp_replace(comp_value, '(["\\])', '\\\1', 'g') || '.*';
                        condition_part := format(
                                'jsonb_path_exists(metadata, %L)',
                                jsonpath || format(' ? (@ %s "%s" flag "i")', operator, pattern)
                                          );
                    ELSIF comp_op IN ('like', 'not_like') THEN
                        operator := CASE WHEN comp_op = 'like' THEN 'like_regex' ELSE '!like_regex' END;
                        pattern := regexp_replace(comp_value, '(["\\%_])', '\\\1', 'g');
                        pattern := '^' || pattern || '$';
                        condition_part := format(
                                'jsonb_path_exists(metadata, %L)',
                                jsonpath || format(' ? (@ %s "%s" flag "i")', operator, pattern)
                                          );
                    ELSIF comp_op IN ('regex_match', 'not_regex_match') THEN
                        operator := CASE WHEN comp_op = 'regex_match' THEN 'like_regex' ELSE '!like_regex' END;
                        condition_part := format(
                                'jsonb_path_exists(metadata, %L)',
                                jsonpath || format(' ? (@ %s "%s" flag "i")', operator, comp_value)
                                          );
                    ELSIF comp_op IN ('in', 'nin') THEN
                        values_array := string_to_array(comp_value, ',');
                        conditions := '';
                        operator := CASE WHEN comp_op = 'in' THEN '==' ELSE '!=' END;
                        FOR i IN array_lower(values_array, 1)..array_upper(values_array, 1)
                            LOOP
                                conditions := conditions || format('@ %s "%s"', operator, trim(values_array[i]));
                                IF i < array_upper(values_array, 1) THEN
                                    conditions := conditions || ' || ';
                                END IF;
                            END LOOP;
                        condition_part := format(
                                'jsonb_path_exists(metadata, %L)',
                                jsonpath || format(' ? (%s)', conditions)
                                          );
                    ELSE
                        RAISE EXCEPTION 'Unsupported comparator: %', comp_op;
                    END IF;

                    -- Append the condition part
                    condition_sql := condition_sql || condition_part || ' AND ';
                END LOOP;

            -- Remove the last ' AND ' from condition_sql
            IF condition_sql <> '' THEN
                condition_sql := left(condition_sql, length(condition_sql) - 5);
            END IF;

            -- Add the condition to the dynamic SQL
            IF condition_sql <> '' THEN
                dynamic_sql := dynamic_sql || format('CASE WHEN %s THEN %s ELSE 0 END + ', condition_sql, comp.weight);

                -- Build the comparison_results JSONB
                comparison_json := comparison_json ||
                                   format('''%s'', CASE WHEN %s THEN true ELSE false END, ', comp.name, condition_sql);

                -- Update total_weight
                total_weight := total_weight + comp.weight;
            END IF;

        END LOOP;

    -- Finalize dynamic SQL
    IF dynamic_sql <> '' THEN
        dynamic_sql := left(dynamic_sql, length(dynamic_sql) - 3);
    ELSE
        dynamic_sql := '0';
    END IF;

    -- Finalize comparison_results JSONB
    IF comparison_json <> '' THEN
        comparison_json := left(comparison_json, length(comparison_json) - 2);
    ELSE
        comparison_json := '''''';
    END IF;

    -- Construct the final SQL query
    IF file_ids IS NOT NULL THEN
        dynamic_sql := format(
                'SELECT *, ((%s) / NULLIF(%s, 0))::double precision AS total_score,
                jsonb_build_object(%s) AS comparison_results
                FROM files WHERE id = ANY ($1) ORDER BY total_score DESC;',
                dynamic_sql, total_weight, comparison_json);
    ELSE
        dynamic_sql := format(
                'SELECT *, ((%s) / NULLIF(%s, 0))::double precision AS total_score,
                jsonb_build_object(%s) AS comparison_results
                FROM files ORDER BY total_score DESC;',
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
                new_path := CASE
                                WHEN parent_path = '' THEN key
                                ELSE parent_path || '.' || key
                    END;

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
                -- Check if the element in the array is an object
                IF jsonb_typeof(json_data -> i) = 'object' THEN
                    -- Recurse into the object with the index included in the path
                    flattened_metadata := flattened_metadata || flatten_json(json_data -> i, parent_path);
                ELSE
                    -- Handle non-object values in arrays
                    new_path := parent_path || '[' || i || ']';
                    flattened_metadata := flattened_metadata || flatten_json(json_data -> i, new_path);
                END IF;
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
    simplified_path    TEXT; -- To hold the path without array indices
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
                    -- Remove array indices from the path
                    simplified_path := regexp_replace(path, '\[\d+\]', '', 'g');

                    -- Skip empty paths
                    IF simplified_path IS NOT NULL AND simplified_path <> '' THEN
                        -- Infer the type of the value and store it in `types`
                        value_type := jsonb_typeof(value);

                        -- Count occurrences of each simplified path
                        IF occurrence_counter ? simplified_path THEN
                            -- Get current occurrence count, cast to integer, increment, and set back
                            current_occurrence := (occurrence_counter ->> simplified_path)::INT;
                            occurrence_counter := jsonb_set(occurrence_counter, array [simplified_path],
                                                            to_jsonb(current_occurrence + 1));
                        ELSE
                            occurrence_counter := jsonb_set(occurrence_counter, array [simplified_path], '1'::jsonb);
                            -- Store the first occurrence of the type
                            types := jsonb_set(types, array [simplified_path], to_jsonb(value_type));
                        END IF;

                        -- Store a sample of up to 2 unique values for each simplified path
                        IF samples ? simplified_path THEN
                            -- Add value to sample array if not already present and if there are fewer than 2 values
                            IF jsonb_array_length(samples -> simplified_path) < 2 AND
                               NOT (samples -> simplified_path @> jsonb_build_array(value)) THEN
                                samples := jsonb_set(samples, array [simplified_path],
                                                     (samples -> simplified_path || jsonb_build_array(value))::jsonb);
                            END IF;
                        ELSE
                            -- Initialize the sample with the first value
                            samples := jsonb_set(samples, array [simplified_path], jsonb_build_array(value));
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