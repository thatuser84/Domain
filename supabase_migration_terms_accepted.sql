-- Run this once in your Supabase SQL Editor. Adds a record of when each account accepted the
-- terms of service (set at signup, checkbox is required to create an account).

alter table user_settings add column if not exists terms_accepted_at timestamptz;
