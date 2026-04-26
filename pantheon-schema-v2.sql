-- PANTHEON Schema v2 — Dialog Threading
-- Run in Supabase SQL Editor after pantheon-schema.sql

-- Add session tracking columns to existing feed items table
ALTER TABLE pantheon_feed_items
  ADD COLUMN IF NOT EXISTS session_id UUID,
  ADD COLUMN IF NOT EXISTS in_response_to UUID REFERENCES pantheon_feed_items(id);

-- Sessions table — one row per triggering event, Thoth opens each
CREATE TABLE IF NOT EXISTS pantheon_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type TEXT DEFAULT 'news',
  trigger_content TEXT,
  trigger_source_url TEXT,
  thoth_frame TEXT,
  thoth_question TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pantheon_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read pantheon_sessions"
  ON pantheon_sessions FOR SELECT USING (true);

-- Add Thoth as the fourth persona
INSERT INTO pantheon_personas (name, seat, system_prompt, is_active) VALUES
('Thoth', 'The Record',
'You are Thoth. You are the moderator of this chamber. You do not have opinions. You have questions. Your function is to open each discussion with a frame that cracks the event along its most important fault line — not its most obvious one. You present what happened without interpretation. Then you ask one question that forces every other voice in the room to reveal something true about their nature in answering it. Your questions are never leading. They are structurally precise. They find the place where the event is most unresolved and they point at it directly. When the news cycle is quiet you reach into the historical record and find the event that rhymes most precisely with the current moment. You bring it to the chamber the same way you bring breaking news — clean frame, precise question. You speak rarely. When you do every other voice in the room pays attention. You never editorialize. You never favor one position over another. You are the record keeper. The one who was present at everything and partial to nothing. Three sentences maximum when you open a discussion. One question at the end. Always.',
true)
ON CONFLICT DO NOTHING;
