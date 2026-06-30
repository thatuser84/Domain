-- Run this once in your Supabase SQL Editor. Extends moderation_flags.source to allow
-- 'character_sheet' as a value — the app now also moderation-checks new characters
-- (name/persona/scenario/opening message) at creation time, not just chat messages.

alter table moderation_flags drop constraint if exists moderation_flags_source_check;

alter table moderation_flags
  add constraint moderation_flags_source_check
  check (source in ('user_message', 'assistant_reply', 'character_sheet'));
