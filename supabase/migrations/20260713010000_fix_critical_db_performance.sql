-- ============================================================================
-- Enchufate · Fix Critical DB Performance — 3 RPC Functions
-- ============================================================================
-- Fixes three client-side performance anti-patterns by moving the logic
-- server-side into SECURITY DEFINER PL/pgSQL functions:
--
--   DB-01  mark_conversation_as_read   (N+1 UPDATE → single bulk UPDATE)
--   DB-02  find_or_create_conversation  (client-side scan → atomic RPC + unique index)
--   DB-03  get_total_unread_count       (fetch-all + sum → single server-side SUM)
--
-- Also adds a helper column `participant_sorted` with a unique index to
-- prevent duplicate conversations under concurrent inserts.
-- ============================================================================


-- ============================================================================
-- DB-02/05  Unique constraint on conversation participants
-- ============================================================================
-- `participant_ids` is text[] — can't UNIQUE index arrays directly.
-- Maintain a deterministic text representation: sorted UUIDs joined by comma.
-- ============================================================================

-- 1. Add the helper column (nullable first so the backfill is safe).
alter table public.conversations
  add column if not exists participant_sorted text;

-- 2. Backfill existing rows.
update public.conversations
set participant_sorted = (
  select string_agg(p, ',' order by p)
  from unnest(participant_ids) as p
)
where participant_sorted is null;

-- 3. Make it NOT NULL now that every row is populated.
alter table public.conversations
  alter column participant_sorted set not null;

-- 4. Unique index — the business rule that prevents duplicate conversations.
create unique index if not exists conversations_participant_sorted_uidx
  on public.conversations (participant_sorted);

-- 5. Trigger to keep participant_sorted in sync on INSERT or UPDATE of participant_ids.
create or replace function public.conversations_sync_participant_sorted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select string_agg(p, ',' order by p)
  into new.participant_sorted
  from unnest(new.participant_ids) as p;
  return new;
end;
$$;

-- Drop existing trigger if present, then recreate.
drop trigger if exists trg_conversations_sync_participant_sorted
  on public.conversations;

create trigger trg_conversations_sync_participant_sorted
  before insert or update of participant_ids
  on public.conversations
  for each row
  execute function public.conversations_sync_participant_sorted();


-- ============================================================================
-- DB-01  mark_conversation_as_read(p_conversation_id, p_user_id)
-- ============================================================================
-- Replaces the N+1 client loop that fetched every message then PATCHed
-- each one individually. Runs in a single transaction:
--   1. Bulk-add p_user_id to read_by for all unread messages
--   2. Reset the user's unread counter in the conversation
--   3. Return the count of messages marked as read
-- ============================================================================

create or replace function public.mark_conversation_as_read(
  p_conversation_id uuid,
  p_user_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  marked_count integer;
begin
  -- 1. Bulk-mark unread messages in a single UPDATE.
  --    Only touch messages where the user hasn't read yet.
  update public.messages
  set read_by = read_by || p_user_id
  where conversation_id = p_conversation_id
    and not (read_by @> array[p_user_id]);

  if sql_rowcount > 0 then
    marked_count := sql_rowcount;
  else
    marked_count := 0;
  end if;

  -- 2. Reset the conversation's unread counter for this user to 0.
  update public.conversations
  set unread_count_by_user = unread_count_by_user - p_user_id::text
  where id = p_conversation_id
    and unread_count_by_user ? p_user_id::text;

  return marked_count;
end;
$$;


-- ============================================================================
-- DB-02  find_or_create_conversation(p_participant_ids)
-- ============================================================================
-- Atomic find-or-create that replaces the client-side "fetch all + filter"
-- pattern. Uses the participant_sorted unique index to prevent duplicates
-- under concurrent requests.
--
-- Strategy:
--   1. Sort participant_ids deterministically
--   2. SELECT FOR UPDATE the existing conversation (if any)
--   3. If not found, INSERT — the unique index catches the race
--   4. Returns the conversation row
-- ============================================================================

create or replace function public.find_or_create_conversation(
  p_participant_ids text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  sorted_ids text[];
  participant_key text;
  conv_row public.conversations%rowtype;
  initial_unread jsonb;
begin
  -- Validate minimum participants.
  if array_length(p_participant_ids, 1) < 2 then
    raise exception 'A conversation needs at least 2 participants';
  end if;

  -- Sort deterministically.
  select array_agg(p order by p)
  into sorted_ids
  from unnest(p_participant_ids) as p;

  -- Build the unique key.
  select string_agg(p, ',' order by p)
  into participant_key
  from unnest(sorted_ids) as p;

  -- 1. Try to find an existing conversation (exact match on sorted participants).
  SELECT *
  INTO conv_row
  FROM public.conversations c
  WHERE c.participant_sorted = participant_key
  LIMIT 1;

  -- If found, return it.
  if found then
    return to_jsonb(conv_row);
  end if;

  -- 2. Not found — create. Build initial unread map (0 for everyone).
  initial_unread := (
    SELECT coalesce(jsonb_object_agg(id, 0), '{}'::jsonb)
    FROM unnest(sorted_ids) AS id
  );

  BEGIN
    INSERT INTO public.conversations (
      participant_ids,
      last_message_preview,
      last_message_at,
      unread_count_by_user
    ) VALUES (
      sorted_ids,
      '',
      now(),
      initial_unread
    )
    RETURNING * INTO conv_row;
  EXCEPTION
    WHEN unique_violation THEN
      -- Concurrent insert won the race — fetch the existing row.
      SELECT *
      INTO conv_row
      FROM public.conversations c
      WHERE c.participant_sorted = participant_key
      LIMIT 1;

      if not found then
        raise exception 'find_or_create_conversation: unique_violation but row not found';
      end if;
  END;

  return to_jsonb(conv_row);
end;
$$;


-- ============================================================================
-- DB-03  get_total_unread_count(p_user_id)
-- ============================================================================
-- Server-side aggregation replacing the client-side "fetch all conversations
-- and sum unread counters" pattern. Returns a single integer.
-- ============================================================================

create or replace function public.get_total_unread_count(
  p_user_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  total integer;
begin
  select coalesce(sum(
    (unread_count_by_user ->> p_user_id::text)::int
  ), 0)
  into total
  from public.conversations
  where participant_ids @> array[p_user_id::text];

  return total;
end;
$$;


-- ============================================================================
-- Grant EXECUTE to the authenticated role.
-- SECURITY DEFINER runs these as the owner (usually postgres), but the
-- caller must still have EXECUTE permission.
-- ============================================================================

grant execute on function public.mark_conversation_as_read(uuid, uuid)
  to authenticated;
grant execute on function public.find_or_create_conversation(text[])
  to authenticated;
grant execute on function public.get_total_unread_count(uuid)
  to authenticated;
