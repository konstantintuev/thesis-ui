drop policy "Allow full access to own messages" on "public"."messages";

drop policy "Allow full access to team messages" on "public"."messages";

create policy "Allow full access to own messages"
on "public"."messages"
as permissive
for all
to public
using ((user_id = auth.uid()))
with check (((user_id = auth.uid()) AND is_message_sequential(sequence_number, chat_id)));


create policy "Allow full access to team messages"
on "public"."messages"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM chats
  WHERE (chats.id = messages.chat_id))))
with check (((EXISTS ( SELECT 1
   FROM chats
  WHERE (chats.id = messages.chat_id))) AND (user_id = auth.uid()) AND is_message_sequential(sequence_number, chat_id)));



CREATE OR REPLACE FUNCTION public.is_message_sequential(_sequence_number integer, _chat_id uuid)
    RETURNS boolean
    LANGUAGE sql
    SECURITY DEFINER
AS
$function$
Select NOT EXISTS (SELECT 1
                   FROM messages msg
                   WHERE (msg.chat_id = _chat_id AND msg.sequence_number >= _sequence_number));
$function$
;