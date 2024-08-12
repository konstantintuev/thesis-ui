--------------- COLLECTION CHAT CREATOR ---------------

-- TABLE --

CREATE TABLE IF NOT EXISTS chat_collection_creator
(
    -- REQUIRED RELATIONSHIPS
    user_id       UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    chat_id       UUID        NOT NULL REFERENCES chats (id) ON DELETE CASCADE,
    collection_id UUID        NOT NULL REFERENCES collections (id) ON DELETE CASCADE,

    PRIMARY KEY (chat_id, collection_id),

    -- METADATA
    created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMPTZ
);

-- INDEXES --

CREATE INDEX idx_chat_collection_creator_chat_id ON chat_collection_creator (chat_id);

-- RLS --

ALTER TABLE chat_collection_creator
    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own chat_collection_creator"
    ON chat_collection_creator
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- TRIGGERS --

CREATE TRIGGER update_chat_files_updated_at
    BEFORE UPDATE
    ON chat_collection_creator
    FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

--------------- COLLECTION CHAT CONSUMER ---------------

-- TABLE --

CREATE TABLE IF NOT EXISTS chat_collection_consumer
(
    -- REQUIRED RELATIONSHIPS
    user_id       UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    chat_id       UUID        NOT NULL REFERENCES chats (id) ON DELETE CASCADE,
    collection_id UUID        NOT NULL REFERENCES collections (id) ON DELETE CASCADE,

    PRIMARY KEY (chat_id, collection_id),

    -- METADATA
    created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMPTZ
);

-- INDEXES --

CREATE INDEX idx_chat_collection_consumer_chat_id ON chat_collection_consumer (chat_id);

-- RLS --

ALTER TABLE chat_collection_consumer
    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own chat_collection_consumer"
    ON chat_collection_consumer
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- TRIGGERS --

CREATE TRIGGER update_chat_files_updated_at
    BEFORE UPDATE
    ON chat_collection_consumer
    FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();