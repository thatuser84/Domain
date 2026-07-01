-- Run this once in your Supabase SQL Editor. Adds the true-private thread flag.
-- Message content for true_private chats is encrypted at rest server-side (see app.py /
-- TRUE_PRIVATE_ENCRYPTION_KEY) — this column just marks which chats get that treatment.

alter table chats add column if not exists true_private boolean not null default false;
