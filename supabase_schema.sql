-- Run this once in your Supabase project's SQL Editor (dashboard -> SQL Editor -> New query -> Run).
-- Sets up the tables characterground needs, scoped per-user via auth.users, plus RLS as a backstop
-- (the Flask app talks to Postgres with the service_role key, which bypasses RLS and enforces
-- per-user scoping itself — these policies just mean nothing leaks even if that key path changes).

create table if not exists characters (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  persona text not null,
  scenario text,
  first_message text,
  avatar text,
  rating text not null default 'explicit',
  created_at timestamptz not null default now()
);

create index if not exists characters_user_id_idx on characters(user_id);

create table if not exists messages (
  id bigint generated always as identity primary key,
  character_id bigint not null references characters(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_character_id_idx on messages(character_id);

-- moderation flag log — see supabase_migration_moderation.sql for the full comment
create table if not exists moderation_flags (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  character_id bigint references characters(id) on delete set null,
  source text not null check (source in ('user_message', 'assistant_reply', 'character_sheet')),
  content text not null,
  category text not null,
  reasoning text,
  created_at timestamptz not null default now()
);

create index if not exists moderation_flags_user_id_idx on moderation_flags(user_id);
create index if not exists moderation_flags_created_at_idx on moderation_flags(created_at desc);

-- per-user groq config — each account brings its own api key, so usage is billed to them, not
-- to whoever runs this instance.
create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  groq_api_key text,
  groq_model text,
  updated_at timestamptz not null default now()
);

alter table characters enable row level security;
alter table messages enable row level security;
alter table moderation_flags enable row level security;
alter table user_settings enable row level security;

create policy "characters_select_own" on characters for select using (auth.uid() = user_id);
create policy "characters_insert_own" on characters for insert with check (auth.uid() = user_id);
create policy "characters_update_own" on characters for update using (auth.uid() = user_id);
create policy "characters_delete_own" on characters for delete using (auth.uid() = user_id);

create policy "messages_select_own" on messages for select using (
  exists (select 1 from characters c where c.id = messages.character_id and c.user_id = auth.uid())
);
create policy "messages_insert_own" on messages for insert with check (
  exists (select 1 from characters c where c.id = messages.character_id and c.user_id = auth.uid())
);
create policy "messages_update_own" on messages for update using (
  exists (select 1 from characters c where c.id = messages.character_id and c.user_id = auth.uid())
);
create policy "messages_delete_own" on messages for delete using (
  exists (select 1 from characters c where c.id = messages.character_id and c.user_id = auth.uid())
);

-- moderation_flags: no policies on purpose — only reachable via the service_role key (server-side).
-- Review it from the Supabase dashboard's Table Editor, not through the app's data API.

create policy "user_settings_select_own" on user_settings for select using (auth.uid() = user_id);
create policy "user_settings_insert_own" on user_settings for insert with check (auth.uid() = user_id);
create policy "user_settings_update_own" on user_settings for update using (auth.uid() = user_id);
create policy "user_settings_delete_own" on user_settings for delete using (auth.uid() = user_id);
