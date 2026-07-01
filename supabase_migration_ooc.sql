-- Run this once in your Supabase SQL Editor. Adds the out-of-character message flag for the new
-- "/" command — a message starting with "/" talks to the model directly instead of being an
-- in-character line, and gets tagged so both the UI and the model's own context treat it that way.

alter table messages add column if not exists is_ooc boolean not null default false;
