-- WORKSPACES

UPDATE workspaces
SET default_model = 'gpt-4-turbo-preview'
WHERE default_model = 'gpt-4-1106-preview';

UPDATE workspaces
SET default_model = 'gpt-3.5-turbo'
WHERE default_model = 'gpt-3.5-turbo-1106';

-- PRESETS

UPDATE presets
SET model = 'gpt-4-turbo-preview'
WHERE model = 'gpt-4-1106-preview';

UPDATE presets
SET model = 'gpt-3.5-turbo'
WHERE model = 'gpt-3.5-turbo-1106';

-- ASSISTANTS

UPDATE assistants
SET model = 'gpt-4-turbo-preview'
WHERE model = 'gpt-4-1106-preview';

UPDATE assistants
SET model = 'gpt-3.5-turbo'
WHERE model = 'gpt-3.5-turbo-1106';

-- CHATS

UPDATE chats
SET model = 'gpt-4-turbo-preview'
WHERE model = 'gpt-4-1106-preview';

UPDATE chats
SET model = 'gpt-3.5-turbo'
WHERE model = 'gpt-3.5-turbo-1106';

-- MESSAGES

UPDATE messages
SET model = 'gpt-4-turbo-preview'
WHERE model = 'gpt-4-1106-preview';

UPDATE messages
SET model = 'gpt-3.5-turbo'
WHERE model = 'gpt-3.5-turbo-1106';

