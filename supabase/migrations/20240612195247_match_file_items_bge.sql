-- FUNCTIONS --

create function match_file_items_bge(
    query_embedding vector(1024),
    match_count int DEFAULT null,
    file_ids UUID[] DEFAULT null
)
    returns table
            (
                id         UUID,
                file_id    UUID,
                content    TEXT,
                tokens     INT,
                similarity float
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
               1 - (file_items.local_embedding <=> query_embedding) as similarity
        from file_items
        where (file_id = ANY (file_ids))
        order by file_items.local_embedding <=> query_embedding
        limit match_count;
end;
$$;


create function match_file_items_any_bge(
    query_embedding vector(1024),
    match_count int DEFAULT null
)
    returns table
            (
                id         UUID,
                file_id    UUID,
                content    TEXT,
                tokens     INT,
                similarity float
            )
    language plpgsql
as
$$
    # variable_conflict use_column
begin
    return query
        select id::UUID,
               file_id::UUID,
               content::TEXT,
               tokens::INT,
               1 - (file_items.local_embedding <=> query_embedding) as similarity
        from file_items
        order by file_items.local_embedding <=> query_embedding
        limit match_count;
end;
$$;
