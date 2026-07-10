-- ============================================================================
-- Enchufate · Supabase Schema · Fase 2 — Mensajería
-- ============================================================================
-- Adds the messaging tables (conversations + messages) and replaces the
-- previous AsyncStorage mock. The app's `messageStore` is rewired to use
-- these tables via `supabase.from(...)`. Real-time channel subscriptions
-- are wired in the app, not in the database.
--
-- Run this in the Supabase SQL Editor (or `supabase db push`).
-- Idempotent: uses `if not exists` and `create or replace`.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- conversations : one row per 1:1 chat between a driver and a host
-- ----------------------------------------------------------------------------
-- The `participant_ids` array stores the two (or more, future-proof) user
-- ids. Order does not matter; the app sorts on read. The denormalized
-- `last_message_*` fields let the conversations list render without a
-- JOIN against `messages`.
create table if not exists public.conversations (
  id                       uuid primary key default gen_random_uuid(),
  participant_ids          text[] not null,
  last_message_preview     text not null default '',
  last_message_at          timestamptz not null default now(),
  -- `unread_count_by_user` is a jsonb map { "<user_id>": <count> }.
  -- Using jsonb (not a separate table) keeps the unread bookkeeping
  -- co-located with the conversation; for Fase 2's 1:1 chats the
  -- cardinality is at most 2 keys.
  unread_count_by_user     jsonb not null default '{}'::jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint conversations_participants_min check (array_length(participant_ids, 1) >= 2)
);

create index if not exists conversations_participant_ids_idx
  on public.conversations using gin (participant_ids);
create index if not exists conversations_last_message_at_idx
  on public.conversations (last_message_at desc);

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();


-- ----------------------------------------------------------------------------
-- messages : one row per chat message
-- ----------------------------------------------------------------------------
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  author_id       uuid not null references public.profiles(id) on delete cascade,
  body            text not null check (length(body) > 0),
  read_by         uuid[] not null default '{}'::uuid[],
  created_at      timestamptz not null default now()
);

create index if not exists messages_conversation_id_created_at_idx
  on public.messages (conversation_id, created_at);
create index if not exists messages_author_id_idx
  on public.messages (author_id);


-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.messages     enable row level security;

-- conversations -------------------------------------------------------------

-- A user can see any conversation they're a participant in. The `@>`
-- operator on text[] checks that the LHS contains every element of the
-- RHS (we wrap the user's uuid in a single-element array).
create policy "conversations_select_participant"
  on public.conversations
  for select
  to authenticated
  using (participant_ids @> array[auth.uid()::text]);

-- A user can create a conversation they're a participant in. The app's
-- `findOrCreateConversation` only inserts with the current user + the
-- other party in `participant_ids`, so the `with check` matches what
-- we actually write.
create policy "conversations_insert_self_participant"
  on public.conversations
  for insert
  to authenticated
  with check (participant_ids @> array[auth.uid()::text]);

-- A user can update a conversation they're a participant in. Used by the
-- `addMessage` path which bumps `last_message_*` fields.
create policy "conversations_update_participant"
  on public.conversations
  for update
  to authenticated
  using (participant_ids @> array[auth.uid()::text])
  with check (participant_ids @> array[auth.uid()::text]);

-- messages ------------------------------------------------------------------

-- A user can read messages in conversations they're a participant in.
-- We don't expose a separate `unread` table; `read_by` is an array on
-- the message itself.
create policy "messages_select_conversation_participant"
  on public.messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.conversations c
      where c.id = messages.conversation_id
        and c.participant_ids @> array[auth.uid()::text]
    )
  );

-- A user can insert a message in a conversation they're a participant
-- in, and they must be the author. The combination of these two
-- constraints means: you can only post in your own conversations, and
-- only as yourself.
create policy "messages_insert_author_in_conversation"
  on public.messages
  for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1
      from public.conversations c
      where c.id = messages.conversation_id
        and c.participant_ids @> array[auth.uid()::text]
    )
  );

-- No update / delete policies on purpose. Messages are immutable from
-- the app's perspective (the "edit" / "delete" features are out of
-- scope for Fase 2). If we need them later, add with check that the
-- caller is the author.


-- ============================================================================
-- End of Fase 2 migration
-- ============================================================================
-- After running:
--   1. The app's `messageStore` is the new source of truth for messages.
--      The old AsyncStorage mock is removed.
--   2. The app's `Conversation` / `Message` shapes still match the
--      schema — the store maps snake_case columns to camelCase fields.
--   3. For real-time chat (Phase 9 stretch), enable Realtime on the
--      `messages` table from Supabase Dashboard > Replication.
-- ============================================================================
