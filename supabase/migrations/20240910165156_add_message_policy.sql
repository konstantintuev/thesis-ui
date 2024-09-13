drop policy "Allow full access to own messages" on "public"."messages";

drop policy "Allow full access to team messages" on "public"."messages";

create policy "Allow read to own and team messages"
on "public"."messages"
as permissive
for select
to authenticated
    using (((user_id = auth.uid())) OR ((EXISTS (SELECT 1
                                                 FROM chats
                                                 WHERE (chats.id = messages.chat_id)))));

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

create policy "Allow insert with sequential check to messages"
    on "public"."messages"
    as permissive
    for insert
    to authenticated
    -- owns the message, can access it and message is sequential
    with check (((((user_id = auth.uid())) OR ((EXISTS (SELECT 1
                                                        FROM chats
                                                        WHERE (chats.id = messages.chat_id)))))
                     AND is_message_sequential(sequence_number, chat_id)));

create policy "Allow update without sequential check to messages"
    on "public"."messages"
    as permissive
    for update
    to authenticated
    -- can see the message
    using (((user_id = auth.uid())) OR ((EXISTS (SELECT 1
                                                 FROM chats
                                                 WHERE (chats.id = messages.chat_id)))))
    -- owns the message
    with check (((user_id = auth.uid())));

create policy "Allow delete without sequential check to messages"
    on "public"."messages"
    as permissive
    for delete
    to authenticated
    -- can see the message and owns it
    using (((user_id = auth.uid())) AND ((EXISTS (SELECT 1
                                                 FROM chats
                                                 WHERE (chats.id = messages.chat_id)))));
