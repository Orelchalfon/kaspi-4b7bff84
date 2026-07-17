-- Applied to project flxhxmrtdqegfsupvvus via Supabase MCP.
-- Adds an explicit conversation-language field to `tutors` so a tutor (e.g. an
-- English-practice tutor) can converse in a language other than Hebrew.
-- Existing rows default to 'he', preserving current behavior.

ALTER TABLE public.tutors
  ADD COLUMN language text NOT NULL DEFAULT 'he'
  CHECK (language IN ('he','en','ar','ru','fr'));
