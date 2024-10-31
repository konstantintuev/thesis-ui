alter table "public"."profiles" add column "role" text not null default 'user'::text;

create policy "Access to role admin"
on "public"."files"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.role = 'admin'::text) AND (profiles.user_id = ( SELECT auth.uid() AS uid))))));



