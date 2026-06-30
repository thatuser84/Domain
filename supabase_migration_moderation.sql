-- Run this once in your Supabase SQL Editor. Adds the moderation flag log.
-- character_id uses "on delete set null" (not cascade) on purpose — deleting a character
-- shouldn't wipe the evidence trail of why something got flagged.
--
-- NOTE: already applied to this project. Kept here for reference / fresh installs. See
-- supabase_migration_character_sheet_check.sql for a follow-up that extends the source column.

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

alter table moderation_flags enable row level security;
-- No policies on purpose, same pattern as the old settings table: only reachable via the
-- service_role key (server-side). Nobody can read flags through the public API, including the
-- flagged user themselves — review this table from the Supabase dashboard's Table Editor.
