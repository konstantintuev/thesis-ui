-- Create Tables
create table "public"."team_chats"
(
    "team_id"    uuid                     not null,
    "created_at" timestamp with time zone not null default now(),
    "chat_id"    uuid                     not null
);

create table "public"."team_members"
(
    "team_id"    uuid                     not null,
    "created_at" timestamp with time zone not null default now(),
    "user_id"    uuid                     not null,
    "team_lead"  boolean                  not null default false
);

create table "public"."teams"
(
    "id"          uuid                     not null default uuid_generate_v4(),
    "created_at"  timestamp with time zone not null default now(),
    "name"        text                     not null,
    "description" text                     not null,
    "user_id"     uuid                     not null default auth.uid()
);

-- Indexes
CREATE INDEX idx_team_chats_team_id ON team_chats (team_id);
CREATE INDEX idx_team_chats_chat_id ON team_chats (chat_id);

-- Enable Row Level Security
alter table "public"."team_chats"
    enable row level security;
alter table "public"."team_members"
    enable row level security;
alter table "public"."teams"
    enable row level security;

-- Alter Tables with some relevant columns
alter table "public"."chat_files"
    add column "query_related_metadata" json;
alter table "public"."chat_files"
    add column "score_metadata" json;
alter table "public"."workspaces"
    add column "file_processor" text not null default 'pdf_to_md_gpt4o'::text;

-- Create Indexes
CREATE UNIQUE INDEX team_chats_pkey ON public.team_chats USING btree (team_id, chat_id);
CREATE UNIQUE INDEX team_members_pkey ON public.team_members USING btree (team_id, user_id);
CREATE UNIQUE INDEX teams_name_key ON public.teams USING btree (name);
CREATE UNIQUE INDEX teams_pkey ON public.teams USING btree (id);

-- Add Primary Key Constraints
alter table "public"."team_chats"
    add constraint "team_chats_pkey" PRIMARY KEY using index "team_chats_pkey";
alter table "public"."team_members"
    add constraint "team_members_pkey" PRIMARY KEY using index "team_members_pkey";
alter table "public"."teams"
    add constraint "teams_pkey" PRIMARY KEY using index "teams_pkey";

-- Add Foreign Key Constraints
alter table "public"."team_chats"
    add constraint "public_team_chats_chat_id_fkey" FOREIGN KEY (chat_id) REFERENCES chats (id) ON UPDATE CASCADE ON DELETE CASCADE not valid;
alter table "public"."team_chats"
    validate constraint "public_team_chats_chat_id_fkey";
alter table "public"."team_chats"
    add constraint "public_team_chats_team_id_fkey" FOREIGN KEY (team_id) REFERENCES teams (id) ON UPDATE CASCADE ON DELETE CASCADE not valid;
alter table "public"."team_chats"
    validate constraint "public_team_chats_team_id_fkey";

alter table "public"."team_members"
    add constraint "public_team_members_team_id_fkey" FOREIGN KEY (team_id) REFERENCES teams (id) ON UPDATE CASCADE ON DELETE CASCADE not valid;
alter table "public"."team_members"
    validate constraint "public_team_members_team_id_fkey";
alter table "public"."team_members"
    add constraint "public_team_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users (id) ON UPDATE CASCADE ON DELETE CASCADE not valid;
alter table "public"."team_members"
    validate constraint "public_team_members_user_id_fkey";

-- Add Unique Constraints
alter table "public"."teams"
    add constraint "teams_name_key" UNIQUE using index "teams_name_key";

-- Create Functions
CREATE OR REPLACE FUNCTION public.get_emails_by_user_ids(user_ids uuid[])
    RETURNS TABLE
            (
                email character varying
            )
    LANGUAGE plpgsql
    SECURITY DEFINER
AS
$function$
BEGIN
    RETURN QUERY SELECT au.email FROM auth.users au WHERE au.id = ANY ($1);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_ids_by_emails(email text[])
    RETURNS TABLE
            (
                id uuid
            )
    LANGUAGE plpgsql
    SECURITY DEFINER
AS
$function$
BEGIN
    RETURN QUERY SELECT au.id FROM auth.users au WHERE au.email = ANY ($1);
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_member_in_same_team(_member_team_id uuid)
    RETURNS boolean
    LANGUAGE sql
    SECURITY DEFINER
AS
$function$
Select EXISTS (SELECT 1 FROM team_members tm WHERE ((tm.team_id = _member_team_id) AND (tm.user_id = auth.uid())));
$function$;

-- Grants
grant delete, insert, references, select, trigger, truncate, update on table "public"."team_chats" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."team_chats" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."team_chats" to "service_role";

grant delete, insert, references, select, trigger, truncate, update on table "public"."team_members" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."team_members" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."team_members" to "service_role";

grant delete, insert, references, select, trigger, truncate, update on table "public"."teams" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."teams" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."teams" to "service_role";

-- Policies
create policy "Allow full access to team chat_collection_consumer"
    on "public"."chat_collection_consumer"
    as permissive
    for all
    to public
    using ((EXISTS (SELECT 1
                    FROM team_chats
                    WHERE (team_chats.chat_id = chat_collection_consumer.chat_id))))
    with check ((EXISTS (SELECT 1
                         FROM team_chats
                         WHERE (team_chats.chat_id = chat_collection_consumer.chat_id))));

create policy "Allow full access to team chat_collection_creator"
    on "public"."chat_collection_creator"
    as permissive
    for all
    to public
    using ((EXISTS (SELECT 1
                    FROM team_chats
                    WHERE (team_chats.chat_id = chat_collection_creator.chat_id))))
    with check ((EXISTS (SELECT 1
                         FROM team_chats
                         WHERE (team_chats.chat_id = chat_collection_creator.chat_id))));

create policy "Allow full access to team chat_files"
    on "public"."chat_files"
    as permissive
    for all
    to public
    using ((EXISTS (SELECT 1
                    FROM team_chats
                    WHERE (team_chats.chat_id = chat_files.chat_id))))
    with check ((EXISTS (SELECT 1
                         FROM team_chats
                         WHERE (team_chats.chat_id = chat_files.chat_id))));

create policy "Allow full access to team chats"
    on "public"."chats"
    as permissive
    for all
    to public
    using ((EXISTS (SELECT 1
                    FROM team_chats
                    WHERE (team_chats.chat_id = chats.id))))
    with check ((EXISTS (SELECT 1
                         FROM team_chats
                         WHERE (team_chats.chat_id = chats.id))));

create policy "Allow full access to team collection_files"
    on "public"."collection_files"
    as permissive
    for select
    to public
    using ((EXISTS (SELECT 1
                    FROM collections
                    WHERE (collections.id = collection_files.collection_id))));

create policy "Allow full access if can access chat_collection_consumer/chat_c"
    on "public"."collections"
    as permissive
    for all
    to public
    using (((EXISTS (SELECT 1
                     FROM chat_collection_consumer
                     WHERE (chat_collection_consumer.collection_id = collections.id))) OR (EXISTS (SELECT 1
                                                                                                   FROM chat_collection_creator
                                                                                                   WHERE (chat_collection_creator.collection_id = collections.id)))))
    with check (((EXISTS (SELECT 1
                          FROM chat_collection_consumer
                          WHERE (chat_collection_consumer.collection_id = collections.id))) OR (EXISTS (SELECT 1
                                                                                                        FROM chat_collection_creator
                                                                                                        WHERE (chat_collection_creator.collection_id = collections.id)))));

create policy "Allow view access to file_item if file in chat or collection"
    on "public"."file_items"
    as permissive
    for select
    to public
    using (((EXISTS (SELECT 1
                     FROM chat_files
                     WHERE (chat_files.file_id = file_items.file_id))) OR (EXISTS (SELECT 1
                                                                                   FROM collection_files
                                                                                   WHERE (collection_files.file_id = file_items.file_id)))));

create policy "Allow view access to team files - access to chat_files or collection"
    on "public"."files"
    as permissive
    for select
    to public
    using (((EXISTS (SELECT 1
                     FROM chat_files
                     WHERE (chat_files.file_id = files.id))) OR (EXISTS (SELECT 1
                                                                         FROM collection_files
                                                                         WHERE (collection_files.file_id = files.id)))));

create policy "Allow full access to team message files"
    on "public"."message_file_items"
    as permissive
    for all
    to public
    using ((EXISTS (SELECT 1
                    FROM messages
                    WHERE (messages.id = message_file_items.message_id))))
    with check ((EXISTS (SELECT 1
                         FROM messages
                         WHERE (messages.id = message_file_items.message_id))));

create policy "Allow full access to team messages"
    on "public"."messages"
    as permissive
    for all
    to public
    using ((EXISTS (SELECT 1
                    FROM chats
                    WHERE (chats.id = messages.chat_id))))
    with check ((EXISTS (SELECT 1
                         FROM chats
                         WHERE (chats.id = messages.chat_id))));

create policy "Allow adding/removing/querying chats for team members"
    on "public"."team_chats"
    as permissive
    for all
    to public
    using (is_member_in_same_team(team_id))
    with check (is_member_in_same_team(team_id));

create policy "Enable delete for users based on user_id"
    on "public"."team_members"
    as permissive
    for delete
    to public
    using (((SELECT auth.uid() AS uid) = user_id));

create policy "Enable insert for authenticated users only"
    on "public"."team_members"
    as permissive
    for insert
    to authenticated
    with check (true);

create policy "Enable read access for members of same team"
    on "public"."team_members"
    as permissive
    for select
    to public
    using (is_member_in_same_team(team_id));

create policy "Enable delete for users based on team lead"
    on "public"."teams"
    as permissive
    for delete
    to public
    using ((EXISTS (SELECT 1
                    FROM team_members
                    WHERE ((team_members.team_id = teams.id) AND (team_members.user_id = auth.uid()) AND
                           (team_members.team_lead = true)))));

create policy "Enable insert for authenticated users only"
    on "public"."teams"
    as permissive
    for insert
    to authenticated
    with check (true);

create policy "Enable read access for all users"
    on "public"."teams"
    as permissive
    for select
    to public
    using (true);

create policy "Enable update for users based on team lead"
    on "public"."teams"
    as permissive
    for update
    to public
    using ((EXISTS (SELECT 1
                    FROM team_members
                    WHERE ((team_members.team_id = teams.id) AND (team_members.user_id = auth.uid()) AND
                           (team_members.team_lead = true)))))
    with check ((EXISTS (SELECT 1
                         FROM team_members
                         WHERE ((team_members.team_id = teams.id) AND (team_members.user_id = auth.uid()) AND
                                (team_members.team_lead = true)))));

create policy "Allow full access to team chat folders"
    on "public"."folders"
    as permissive
    for all
    to public
    using (folders.type = 'chats' AND EXISTS (SELECT 1
                   FROM chats
                   WHERE (chats.folder_id = folders.id)))
    with check (folders.type = 'chats' AND EXISTS (SELECT 1
                          FROM chats
                          WHERE (chats.folder_id = folders.id)));

create policy "Allow full access to team collection folders"
    on "public"."folders"
    as permissive
    for all
    to public
    using (folders.type = 'collections' AND EXISTS (SELECT 1
                   FROM collections
                   WHERE (collections.folder_id = folders.id)))
    with check (folders.type = 'collections' AND EXISTS (SELECT 1
        FROM collections
        WHERE (collections.folder_id = folders.id)));

create policy "Allow full access to team files folders"
    on "public"."folders"
    as permissive
    for all
    to public
    using (folders.type = 'files' AND EXISTS (SELECT 1
                     FROM files
                     WHERE (files.folder_id = folders.id)))
    with check (folders.type = 'files' AND EXISTS (SELECT 1
                          FROM files
                          WHERE (files.folder_id = folders.id)));

create policy "Allow read access to files you access - team"
    on "storage"."objects"
    as permissive
    for select
    to public
    using ((EXISTS (SELECT 1
                    FROM files
                    WHERE (files.file_path = objects.name))));
