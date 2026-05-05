-- NAVI.EXE — MBTI Class Evolution System migration
-- Run in Supabase SQL Editor or via supabase db push

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_evolution_tier integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS mbti_type text,
  ADD COLUMN IF NOT EXISTS character_class text;

-- Index for fast tier-crossing detection queries
CREATE INDEX IF NOT EXISTS profiles_last_evolution_tier_idx ON profiles(last_evolution_tier);
