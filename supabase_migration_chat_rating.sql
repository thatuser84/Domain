-- Run this once in your Supabase SQL Editor. Moves the live tone-dial to be per-chat-thread
-- instead of per-character, so two different chats with the same character can run at different
-- heat levels. characters.rating still exists and is used as the default when starting a new
-- thread, but the chat's own rating is what actually drives the roleplay model going forward.

alter table chats add column if not exists rating text;

-- backfill existing chats with their character's current rating so nothing goes blank
update chats
set rating = characters.rating
from characters
where chats.character_id = characters.id
  and chats.rating is null;

alter table chats alter column rating set not null;
alter table chats alter column rating set default 'explicit';
