create table if not exists "public"."file_upload_queue" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "target_collection_id" uuid
);


alter table "public"."file_upload_queue" enable row level security;

CREATE UNIQUE INDEX IF NOT EXISTS file_upload_queue_pkey ON public.file_upload_queue USING btree (id);

DO
$$
    BEGIN
        IF NOT EXISTS (SELECT 1
                       FROM pg_constraint
                       WHERE conname = 'file_upload_queue_pkey') THEN
            ALTER TABLE "public"."file_upload_queue"
                ADD CONSTRAINT "file_upload_queue_pkey" PRIMARY KEY USING INDEX "file_upload_queue_pkey";
        ELSE
            RAISE NOTICE 'Constraint file_upload_queue_pkey already exists';
        END IF;

        IF NOT EXISTS (SELECT 1
                       FROM pg_constraint
                       WHERE conname = 'public_file_upload_queue_target_collection_id_fkey') THEN
            ALTER TABLE "public"."file_upload_queue"
                ADD CONSTRAINT "public_file_upload_queue_target_collection_id_fkey" FOREIGN KEY (target_collection_id)
                    REFERENCES collections (id) ON UPDATE CASCADE ON DELETE SET NULL NOT VALID;
        ELSE
            RAISE NOTICE 'Foreign key constraint public_file_upload_queue_target_collection_id_fkey already exists';
        END IF;
    END
$$;

alter table "public"."file_upload_queue" validate constraint "public_file_upload_queue_target_collection_id_fkey";

grant delete on table "public"."file_upload_queue" to "anon";

grant insert on table "public"."file_upload_queue" to "anon";

grant references on table "public"."file_upload_queue" to "anon";

grant select on table "public"."file_upload_queue" to "anon";

grant trigger on table "public"."file_upload_queue" to "anon";

grant truncate on table "public"."file_upload_queue" to "anon";

grant update on table "public"."file_upload_queue" to "anon";

grant delete on table "public"."file_upload_queue" to "authenticated";

grant insert on table "public"."file_upload_queue" to "authenticated";

grant references on table "public"."file_upload_queue" to "authenticated";

grant select on table "public"."file_upload_queue" to "authenticated";

grant trigger on table "public"."file_upload_queue" to "authenticated";

grant truncate on table "public"."file_upload_queue" to "authenticated";

grant update on table "public"."file_upload_queue" to "authenticated";

grant delete on table "public"."file_upload_queue" to "service_role";

grant insert on table "public"."file_upload_queue" to "service_role";

grant references on table "public"."file_upload_queue" to "service_role";

grant select on table "public"."file_upload_queue" to "service_role";

grant trigger on table "public"."file_upload_queue" to "service_role";

grant truncate on table "public"."file_upload_queue" to "service_role";

grant update on table "public"."file_upload_queue" to "service_role";


