-- PANTHEON Schema v4 — Topic classification
-- Run in Supabase SQL Editor

ALTER TABLE pantheon_sessions ADD COLUMN IF NOT EXISTS topic TEXT;
