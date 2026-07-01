-- Run this once in your Supabase SQL Editor. Adds real image avatar support alongside the
-- existing emoji/letter avatar field. The storage bucket itself ("character-avatars", public) was
-- created directly via the Storage API, not SQL — nothing to do for that part.

alter table characters add column if not exists avatar_url text;
