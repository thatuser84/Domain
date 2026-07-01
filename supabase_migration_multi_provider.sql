-- Run this once in your Supabase SQL Editor. Generalizes per-user roleplay-model settings beyond
-- just Groq — provider presets (Groq/OpenAI/OpenRouter) plus a fully custom OpenAI-compatible
-- endpoint option. Existing groq_api_key/groq_model values get migrated into the new columns.

alter table user_settings add column if not exists provider text not null default 'groq';
alter table user_settings add column if not exists base_url text;
alter table user_settings add column if not exists api_key text;
alter table user_settings add column if not exists model text;

update user_settings set api_key = groq_api_key where api_key is null and groq_api_key is not null;
update user_settings set model = groq_model where model is null and groq_model is not null;

alter table user_settings drop column if exists groq_api_key;
alter table user_settings drop column if exists groq_model;
