-- Run this once in your Supabase SQL Editor. Adds the minor-safe-mode lock column.
-- When true, the roleplay model ignores whatever the character's normal tone-dial rating is and
-- is hard-restricted to non-sexual content for that character, no matter what. This is a distinct
-- concept from the user-facing rating dial — it's set by the moderation system, never by the user
-- directly picking it from the dropdown.

alter table characters add column if not exists minor_safe_mode boolean not null default false;
