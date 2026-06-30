-- Run this once in your Supabase SQL Editor. Adds per-user groq settings and drops the old
-- shared/global settings table (the app no longer reads or writes it).

create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  groq_api_key text,
  groq_model text,
  updated_at timestamptz not null default now()
);

alter table user_settings enable row level security;

create policy "user_settings_select_own" on user_settings for select using (auth.uid() = user_id);
create policy "user_settings_insert_own" on user_settings for insert with check (auth.uid() = user_id);
create policy "user_settings_update_own" on user_settings for update using (auth.uid() = user_id);
create policy "user_settings_delete_own" on user_settings for delete using (auth.uid() = user_id);

drop table if exists settings;
