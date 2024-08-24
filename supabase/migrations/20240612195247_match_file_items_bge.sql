-- FUNCTIONS --

create function match_file_items_bge(
    query_embedding vector(1024),
    match_count int DEFAULT null,
    file_ids UUID[] DEFAULT null
)
    returns table
            (
                id                       UUID,
                file_id                  UUID,
                content                  TEXT,
                tokens                   INT,
                chunk_attachable_content uuid,
                similarity               float
            )
    language plpgsql
as
$$
    # variable_conflict use_column
begin
    return query
        select id,
               file_id,
               content,
               tokens,
               chunk_attachable_content,
               1 - (file_items.local_embedding <=> query_embedding) as similarity
        from file_items
        where (file_id = ANY (file_ids))
        order by file_items.local_embedding <=> query_embedding
        limit match_count;
end;
$$;


create function match_file_items_any_bge(
    query_embedding vector(1024),
    match_count int DEFAULT null,
    min_layer_number int DEFAULT 0
)
    returns table
            (
                id                       uuid,
                file_id                  uuid,
                user_id                  uuid,
                created_at               timestamp with time zone,
                updated_at               timestamp with time zone,
                sharing                  text,
                content                  text,
                local_embedding          vector(1024),
                openai_embedding         vector(1536),
                tokens                   integer,
                children                 uuid[],
                chunk_attachable_content uuid,
                chunk_index              integer,
                layer_number             integer,
                similarity               float
            )
    language plpgsql
as
$$
    # variable_conflict use_column
begin
    return query
        select *,
               1 - (file_items.local_embedding <=> query_embedding) as similarity
        from file_items
        where file_items.layer_number >= min_layer_number
        order by file_items.local_embedding <=> query_embedding
        limit match_count;
end;
$$;
