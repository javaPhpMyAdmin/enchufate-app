-- ============================================================================
-- Enchufate · DB-04  send_message RPC
-- ============================================================================
-- Consolidates the 3-round-trip client flow (INSERT message → SELECT
-- conversation → UPDATE conversation) into a single server-side transaction.
--
-- The function:
--   1. Validates the sender is a participant in the conversation
--   2. INSERTs the message (with read_by = [sender])
--   3. UPDATEs the conversation: last_message_preview, last_message_at,
--      unread_count_by_user (increments for every participant except sender)
--   4. Returns the new message + participant_ids as jsonb
--
-- Push notification logic stays client-side (it calls an Edge Function).
-- ============================================================================


create or replace function public.send_message(
  p_conversation_id uuid,
  p_sender_id       uuid,
  p_content         text,
  p_type            text default 'text'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_message    public.messages%rowtype;
  conv           record;
  preview        text;
  next_unread    jsonb;
  rid            text;
  msg_created_at timestamptz;
begin
  -- ── Validate input ────────────────────────────────────────────────
  if p_content is null or length(trim(p_content)) = 0 then
    raise exception 'send_message: empty content';
  end if;

  -- ── Fetch conversation + verify sender is a participant ───────────
  select c.id, c.participant_ids
  into conv
  from public.conversations c
  where c.id = p_conversation_id;

  if not found then
    raise exception 'send_message: conversation % not found', p_conversation_id;
  end if;

  if not (conv.participant_ids @> array[p_sender_id::text]) then
    raise exception 'send_message: sender % is not a participant', p_sender_id;
  end if;

  -- ── Build preview (truncated to ~80 chars) ────────────────────────
  preview := case
    when length(p_content) > 80
      then substring(p_content from 1 for 77) || E'\u2026'
    else p_content
  end;

  -- Use a single timestamp for both message and conversation update
  -- so they are consistent within the transaction.
  msg_created_at := now();

  -- ── 1. INSERT the message ─────────────────────────────────────────
  insert into public.messages (conversation_id, author_id, body, read_by, created_at)
  values (p_conversation_id, p_sender_id, p_content, ARRAY[p_sender_id]::uuid[], msg_created_at)
  returning * into new_message;

  -- ── 2. UPDATE the conversation ────────────────────────────────────
  -- Build the next unread map: increment everyone except the sender.
  next_unread := coalesce(
    (select unread_count_by_user from public.conversations where id = p_conversation_id),
    '{}'::jsonb
  );

  for rid in select unnest(conv.participant_ids)
  loop
    if rid <> p_sender_id::text then
      next_unread := next_unread || jsonb_build_object(
        rid, coalesce((next_unread ->> rid)::int, 0) + 1
      );
    end if;
  end loop;

  update public.conversations
  set last_message_preview = preview,
      last_message_at      = msg_created_at,
      unread_count_by_user = next_unread
  where id = p_conversation_id;

  -- ── 3. Return message + participant_ids ───────────────────────────
  -- participant_ids are included so the client can build the push
  -- notification recipient list without an extra round trip.
  return jsonb_build_object(
    'id',              new_message.id,
    'conversation_id', new_message.conversation_id,
    'author_id',       new_message.author_id,
    'body',            new_message.body,
    'read_by',         to_jsonb(new_message.read_by),
    'created_at',      new_message.created_at,
    'participant_ids', to_jsonb(conv.participant_ids)
  );
end;
$$;


-- ============================================================================
-- Grant EXECUTE to the authenticated role.
-- ============================================================================

grant execute on function public.send_message(uuid, uuid, text, text)
  to authenticated;
