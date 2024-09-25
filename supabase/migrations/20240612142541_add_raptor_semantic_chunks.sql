create table "public"."file_items_attachable_content" (
    "id" uuid not null default uuid_generate_v4(),
    "created_at" timestamp with time zone not null default now(),
    "content" json
);


alter table "public"."file_items_attachable_content" enable row level security;

alter table "public"."file_items" add column "children" uuid[];

alter table "public"."file_items" add column "chunk_attachable_content" uuid;

alter table "public"."file_items" add column "chunk_index" integer;

alter table "public"."file_items" add column "layer_number" integer;

alter table "public"."file_items" alter column "local_embedding" type vector(1024); -- 1024 works for local w/ BGE M3

CREATE UNIQUE INDEX file_items_attachable_content_pkey ON public.file_items_attachable_content USING btree (id);

DO
$$
    BEGIN

        BEGIN
            alter table "public"."file_items_attachable_content"
                add constraint "file_items_attachable_content_pkey" PRIMARY KEY using index "file_items_attachable_content_pkey";

            alter table "public"."file_items"
                add constraint "public_file_items_chunk_attachable_content_fkey" FOREIGN KEY (chunk_attachable_content) REFERENCES file_items_attachable_content (id) ON UPDATE CASCADE ON DELETE SET DEFAULT not valid;
        EXCEPTION
            WHEN duplicate_table THEN -- postgres raises duplicate_table at surprising times. Ex.: for UNIQUE constraints.
            WHEN duplicate_object THEN
                RAISE NOTICE 'Table constraint file_items_attachable_content_pkey or public_file_items_chunk_attachable_content_fkey already exists';
        END;

    END
$$;

alter table "public"."file_items" validate constraint "public_file_items_chunk_attachable_content_fkey";

grant delete on table "public"."file_items_attachable_content" to "authenticated";

grant insert on table "public"."file_items_attachable_content" to "authenticated";

grant references on table "public"."file_items_attachable_content" to "authenticated";

grant select on table "public"."file_items_attachable_content" to "authenticated";

grant trigger on table "public"."file_items_attachable_content" to "authenticated";

grant truncate on table "public"."file_items_attachable_content" to "authenticated";

grant update on table "public"."file_items_attachable_content" to "authenticated";

grant delete on table "public"."file_items_attachable_content" to "service_role";

grant insert on table "public"."file_items_attachable_content" to "service_role";

grant references on table "public"."file_items_attachable_content" to "service_role";

grant select on table "public"."file_items_attachable_content" to "service_role";

grant trigger on table "public"."file_items_attachable_content" to "service_role";

grant truncate on table "public"."file_items_attachable_content" to "service_role";

grant update on table "public"."file_items_attachable_content" to "service_role";

alter table "public"."files" add column "metadata" jsonb;
