alter table "public"."workspaces" add column "default_chat_model" text not null default 'gpt-4-vision-preview'::text;

alter table "public"."workspaces" add constraint "workspaces_default_chat_model_check" CHECK ((char_length(default_chat_model) <= 1000)) not valid;

alter table "public"."workspaces" validate constraint "workspaces_default_chat_model_check";
