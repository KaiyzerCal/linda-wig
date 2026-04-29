-- WIG Linda — Supabase Schema
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard

-- Principals (Bishop and Calvin)
CREATE TABLE IF NOT EXISTS principals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('bishop', 'calvin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO principals (name, role) VALUES
  ('Bishop Watkins', 'bishop'),
  ('Calvin Watkins', 'calvin');

-- Missions (tasks from Bishop)
CREATE TABLE IF NOT EXISTS missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  principal_id UUID REFERENCES principals(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'complete', 'archived')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Technical Queue (build items for Calvin)
CREATE TABLE IF NOT EXISTS technical_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done')),
  assigned_to TEXT DEFAULT 'calvin',
  calvin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Conversation History (Linda's memory)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  principal_id UUID REFERENCES principals(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lineage (family archive)
CREATE TABLE IF NOT EXISTS lineage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Book Operations Log
CREATE TABLE IF NOT EXISTS book_ops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation TEXT NOT NULL,
  details JSONB,
  status TEXT DEFAULT 'logged',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Reports
CREATE TABLE IF NOT EXISTS agent_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL,
  status TEXT NOT NULL,
  report TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- After running, grab UUIDs for .env:
-- SELECT id, name, role FROM principals;

-- Pantheon ingest schedule (pg_cron — enable the pg_cron extension in Supabase first)
-- Schedule: every 6 hours (0 */6 * * *)
-- SELECT cron.schedule('pantheon_ingest', '0 */6 * * *', $$
--   SELECT net.http_post(
--     url := current_setting('app.settings.pantheon_trigger_url'),
--     body := '{}'::jsonb
--   );
-- $$);
