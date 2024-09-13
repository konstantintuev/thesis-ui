-- Useless for me, not implemented originally and slow without indexes

drop policy "Allow view access to non-private assistants" on assistants;
drop policy "Allow view access to non-private chats" on chats;
drop policy "Allow view access to collection files for non-private collectio" on collection_files;
drop policy "Allow view access to non-private collections" on collections;
drop policy "Allow view access to non-private file items" on file_items;
drop policy "Allow view access to non-private files" on files;
drop policy "Allow view access to files for non-private collections" on files;
drop policy "Allow view access to messages for non-private chats" on messages;
drop policy "Allow view access to non-private models" on models;
drop policy "Allow view access to non-private presets" on presets;
drop policy "Allow view access to non-private prompts" on prompts;
drop policy "Allow view access to non-private tools" on tools;
drop policy "Allow view access to non-private workspaces" on workspaces;
