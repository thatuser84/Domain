-- Run this once in your Supabase SQL Editor. This is the big one — adds multi-chat-per-character
-- support and the community/discovery feature (visibility + tags). Existing chat history is
-- preserved: every current character gets one default "Chat" thread created for it, and all its
-- existing messages get attached to that thread.

-- ---------------------------------------------------------------------------
-- 1. New chats table — a character can now have many independent conversation threads.
-- ---------------------------------------------------------------------------
create table if not exists chats (
  id bigint generated always as identity primary key,
  character_id bigint not null references characters(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Chat',
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create index if not exists chats_character_id_idx on chats(character_id);
create index if not exists chats_user_id_idx on chats(user_id);

-- ---------------------------------------------------------------------------
-- 2. Migrate messages from character_id to chat_id, preserving existing history.
-- ---------------------------------------------------------------------------
alter table messages add column if not exists chat_id bigint references chats(id) on delete cascade;

-- one default chat per existing character (covers characters with zero messages too)
insert into chats (character_id, user_id, title, created_at)
select c.id, c.user_id, 'Chat', c.created_at
from characters c
where not exists (select 1 from chats ch where ch.character_id = c.id);

-- attach existing messages to that default chat
update messages m
set chat_id = ch.id
from chats ch
where ch.character_id = m.character_id
  and m.chat_id is null;

alter table messages alter column chat_id set not null;

-- drop the old character_id-based policies BEFORE dropping the column they reference
drop policy if exists "messages_select_own" on messages;
drop policy if exists "messages_insert_own" on messages;
drop policy if exists "messages_update_own" on messages;
drop policy if exists "messages_delete_own" on messages;

alter table messages drop column if exists character_id;

-- ---------------------------------------------------------------------------
-- 3. Visibility + tags on characters, for the community/discovery page.
-- ---------------------------------------------------------------------------
alter table characters add column if not exists visibility text not null default 'private';
alter table characters drop constraint if exists characters_visibility_check;
alter table characters add constraint characters_visibility_check check (visibility in ('private', 'public'));
alter table characters add column if not exists tags text[] not null default '{}';

create index if not exists characters_visibility_idx on characters(visibility) where visibility = 'public';

-- ---------------------------------------------------------------------------
-- 4. RLS: chats table, and messages policies updated to go through chats instead of character_id.
-- ---------------------------------------------------------------------------
alter table chats enable row level security;

create policy "chats_select_own" on chats for select using (auth.uid() = user_id);
create policy "chats_insert_own" on chats for insert with check (auth.uid() = user_id);
create policy "chats_update_own" on chats for update using (auth.uid() = user_id);
create policy "chats_delete_own" on chats for delete using (auth.uid() = user_id);

-- (old character_id-based policies already dropped above, before the column drop)
create policy "messages_select_own" on messages for select using (
  exists (select 1 from chats ch where ch.id = messages.chat_id and ch.user_id = auth.uid())
);
create policy "messages_insert_own" on messages for insert with check (
  exists (select 1 from chats ch where ch.id = messages.chat_id and ch.user_id = auth.uid())
);
create policy "messages_update_own" on messages for update using (
  exists (select 1 from chats ch where ch.id = messages.chat_id and ch.user_id = auth.uid())
);
create policy "messages_delete_own" on messages for delete using (
  exists (select 1 from chats ch where ch.id = messages.chat_id and ch.user_id = auth.uid())
);

-- Public characters become visible to everyone for browsing, on top of the existing own-only policy.
create policy "characters_select_public" on characters for select using (visibility = 'public');
