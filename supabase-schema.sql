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

-- Locke conversation history
CREATE TABLE IF NOT EXISTS locke_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  principal_id UUID REFERENCES principals(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS on all Linda tables (service_role key is used server-side)
ALTER TABLE principals DISABLE ROW LEVEL SECURITY;
ALTER TABLE missions DISABLE ROW LEVEL SECURITY;
ALTER TABLE technical_queue DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE lineage DISABLE ROW LEVEL SECURITY;
ALTER TABLE book_ops DISABLE ROW LEVEL SECURITY;
ALTER TABLE agent_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE locke_conversations DISABLE ROW LEVEL SECURITY;

-- After running, grab UUIDs for .env:
-- SELECT id, name, role FROM principals;

-- ============================================================
-- WIG REVENUE AUTOMATION TABLES (n8n workflows)
-- Run after the core tables above
-- ============================================================

-- Master customer table (all brands)
CREATE TABLE IF NOT EXISTS wig_customers (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                       TEXT UNIQUE NOT NULL,
  full_name                   TEXT,
  source_brand                TEXT CHECK (source_brand IN ('wig','skyforge_ai','bioneer')),
  source_asset                TEXT,
  source_channel              TEXT DEFAULT 'organic',
  products_purchased          TEXT[] DEFAULT '{}',
  total_spent                 DECIMAL(10,2) DEFAULT 0,
  customer_tier               TEXT DEFAULT 'entry',
  active_sequence             TEXT,
  funnel_stage                TEXT DEFAULT 'EMAIL_1',
  email_1_sent_at             TIMESTAMPTZ,
  email_2_sent_at             TIMESTAMPTZ,
  email_3_sent_at             TIMESTAMPTZ,
  email_4_sent_at             TIMESTAMPTZ,
  email_5_sent_at             TIMESTAMPTZ,
  cross_sell_eligible         BOOLEAN DEFAULT FALSE,
  cross_sell_sent             BOOLEAN DEFAULT FALSE,
  skyforge_offered            BOOLEAN DEFAULT FALSE,
  skyforge_purchased          BOOLEAN DEFAULT FALSE,
  skyforge_bundle_offered     BOOLEAN DEFAULT FALSE,
  skyforge_bundle_purchased   BOOLEAN DEFAULT FALSE,
  bioneer_offered             BOOLEAN DEFAULT FALSE,
  bioneer_purchased           BOOLEAN DEFAULT FALSE,
  architecture_set_offered    BOOLEAN DEFAULT FALSE,
  architecture_set_purchased  BOOLEAN DEFAULT FALSE,
  review_requested            BOOLEAN DEFAULT FALSE,
  review_left                 BOOLEAN DEFAULT FALSE,
  coaching_interest           BOOLEAN DEFAULT FALSE,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- SkyforgeAI brand tracking
CREATE TABLE IF NOT EXISTS skyforge_customers (
  id                             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                          TEXT UNIQUE NOT NULL REFERENCES wig_customers(email),
  full_name                      TEXT,
  products_purchased             TEXT[] DEFAULT '{}',
  total_skyforge_spent           DECIMAL(10,2) DEFAULT 0,
  entry_product                  TEXT,
  bundle_purchased               BOOLEAN DEFAULT FALSE,
  email_1_sent_at                TIMESTAMPTZ,
  email_2_sent_at                TIMESTAMPTZ,
  email_3_sent_at                TIMESTAMPTZ,
  upsell_email_sent_at           TIMESTAMPTZ,
  bundle_offer_sent_at           TIMESTAMPTZ,
  architecture_set_offer_sent_at TIMESTAMPTZ,
  review_requested               BOOLEAN DEFAULT FALSE,
  created_at                     TIMESTAMPTZ DEFAULT NOW(),
  updated_at                     TIMESTAMPTZ DEFAULT NOW()
);

-- ITG institutional leads
CREATE TABLE IF NOT EXISTS itg_institutional_leads (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_name            TEXT NOT NULL,
  contact_name        TEXT,
  contact_email       TEXT,
  org_type            TEXT,
  copies_needed       INTEGER,
  quoted_price        DECIMAL(10,2),
  quote_sent_at       TIMESTAMPTZ,
  follow_up_1_sent_at TIMESTAMPTZ,
  follow_up_2_sent_at TIMESTAMPTZ,
  referral_sent_at    TIMESTAMPTZ,
  referred_by         TEXT,
  status              TEXT DEFAULT 'new',
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Daily metrics (all brands)
CREATE TABLE IF NOT EXISTS wig_daily_metrics (
  date                        DATE PRIMARY KEY DEFAULT CURRENT_DATE,
  ml_sales                    INTEGER DEFAULT 0,
  ml_revenue                  DECIMAL(10,2) DEFAULT 0,
  itg_sales                   INTEGER DEFAULT 0,
  itg_revenue                 DECIMAL(10,2) DEFAULT 0,
  workbook_sales              INTEGER DEFAULT 0,
  workbook_revenue            DECIMAL(10,2) DEFAULT 0,
  architecture_set_sales      INTEGER DEFAULT 0,
  architecture_set_revenue    DECIMAL(10,2) DEFAULT 0,
  skyforge_individual_sales   INTEGER DEFAULT 0,
  skyforge_individual_revenue DECIMAL(10,2) DEFAULT 0,
  skyforge_bundle_sales       INTEGER DEFAULT 0,
  skyforge_bundle_revenue     DECIMAL(10,2) DEFAULT 0,
  bioneer_sales               INTEGER DEFAULT 0,
  bioneer_revenue             DECIMAL(10,2) DEFAULT 0,
  institutional_revenue       DECIMAL(10,2) DEFAULT 0,
  total_revenue               DECIMAL(10,2) DEFAULT 0,
  new_customers               INTEGER DEFAULT 0,
  returning_customers         INTEGER DEFAULT 0,
  cross_sells_sent            INTEGER DEFAULT 0,
  cross_sells_converted       INTEGER DEFAULT 0,
  reviews_requested           INTEGER DEFAULT 0,
  outreach_sent               INTEGER DEFAULT 0,
  outreach_responses          INTEGER DEFAULT 0,
  outreach_converted          INTEGER DEFAULT 0,
  prospects_identified        INTEGER DEFAULT 0,
  institutional_contacted     INTEGER DEFAULT 0,
  wp_leads_found              INTEGER DEFAULT 0,
  wp_qualified                INTEGER DEFAULT 0,
  wp_appointments             INTEGER DEFAULT 0,
  marine_leads_found          INTEGER DEFAULT 0,
  marine_qualified            INTEGER DEFAULT 0,
  marine_appointments         INTEGER DEFAULT 0
);

-- Linda outreach prospects (all brands)
CREATE TABLE IF NOT EXISTS linda_outreach_prospects (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform            TEXT,
  handle_or_url       TEXT,
  full_name           TEXT,
  target_asset        TEXT,
  outreach_type       TEXT DEFAULT 'individual',
  post_content        TEXT,
  message_sent        TEXT,
  sent_at             TIMESTAMPTZ,
  response_received   BOOLEAN DEFAULT FALSE,
  response_text       TEXT,
  response_at         TIMESTAMPTZ,
  follow_up_1_sent_at TIMESTAMPTZ,
  follow_up_2_sent_at TIMESTAMPTZ,
  converted           BOOLEAN DEFAULT FALSE,
  converted_to        TEXT,
  kill_condition_hit  BOOLEAN DEFAULT FALSE,
  status              TEXT DEFAULT 'queued',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Linda content queue (social posts)
CREATE TABLE IF NOT EXISTS linda_content_queue (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform         TEXT,
  asset            TEXT,
  content_type     TEXT,
  content_body     TEXT,
  generated_at     TIMESTAMPTZ DEFAULT NOW(),
  status           TEXT DEFAULT 'pending',
  posted_at        TIMESTAMPTZ,
  engagement_score INTEGER DEFAULT 0
);

-- Institutional outreach targets
CREATE TABLE IF NOT EXISTS linda_institutional_targets (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_name           TEXT,
  org_type           TEXT,
  contact_name       TEXT,
  contact_title      TEXT,
  contact_email      TEXT,
  linkedin_url       TEXT,
  location           TEXT,
  copies_estimate    INTEGER,
  outreach_1_sent_at TIMESTAMPTZ,
  outreach_2_sent_at TIMESTAMPTZ,
  outreach_3_sent_at TIMESTAMPTZ,
  response_received  BOOLEAN DEFAULT FALSE,
  response_text      TEXT,
  status             TEXT DEFAULT 'identified',
  source             TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Web design leads (raw research)
CREATE TABLE IF NOT EXISTS wp_leads (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name    TEXT NOT NULL,
  business_type    TEXT,
  address          TEXT,
  phone            TEXT,
  email            TEXT,
  website_url      TEXT,
  website_score    INTEGER,
  lead_score       INTEGER DEFAULT 0,
  outreach_sent    BOOLEAN DEFAULT FALSE,
  outreach_sent_at TIMESTAMPTZ,
  responded        BOOLEAN DEFAULT FALSE,
  status           TEXT DEFAULT 'identified',
  source           TEXT DEFAULT 'google_maps',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Qualified web design leads
CREATE TABLE IF NOT EXISTS wp_qualified_leads (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name      TEXT NOT NULL,
  contact_name       TEXT,
  phone              TEXT NOT NULL,
  email              TEXT,
  business_type      TEXT,
  current_website    TEXT,
  project_goals      TEXT[],
  timeline           TEXT,
  budget_range       TEXT,
  best_call_time     TEXT,
  lead_score         INTEGER DEFAULT 0,
  nurture_track      TEXT DEFAULT 'standard',
  email_1_sent_at    TIMESTAMPTZ,
  email_2_sent_at    TIMESTAMPTZ,
  email_3_sent_at    TIMESTAMPTZ,
  calendly_link_sent BOOLEAN DEFAULT FALSE,
  appointment_booked BOOLEAN DEFAULT FALSE,
  appointment_date   TIMESTAMPTZ,
  proposal_sent_at   TIMESTAMPTZ,
  proposal_amount    DECIMAL(10,2),
  deposit_received   BOOLEAN DEFAULT FALSE,
  deposit_amount     DECIMAL(10,2),
  deposit_received_at TIMESTAMPTZ,
  status             TEXT DEFAULT 'qualified',
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Web design projects (post-deposit)
CREATE TABLE IF NOT EXISTS wp_projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id       UUID REFERENCES wp_qualified_leads(id),
  business_name TEXT,
  contact_name  TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  project_scope TEXT,
  total_value   DECIMAL(10,2),
  deposit_paid  DECIMAL(10,2),
  balance_due   DECIMAL(10,2),
  start_date    DATE,
  status        TEXT DEFAULT 'active',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Marine leads (raw research)
CREATE TABLE IF NOT EXISTS marine_leads (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name    TEXT,
  contact_name     TEXT,
  phone            TEXT,
  email            TEXT,
  address          TEXT,
  market           TEXT CHECK (market IN ('stuart','west_palm_beach')),
  lead_type        TEXT,
  source           TEXT,
  permit_date      DATE,
  lead_score       INTEGER DEFAULT 0,
  outreach_sent    BOOLEAN DEFAULT FALSE,
  outreach_sent_at TIMESTAMPTZ,
  responded        BOOLEAN DEFAULT FALSE,
  status           TEXT DEFAULT 'identified',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Qualified marine leads
CREATE TABLE IF NOT EXISTS marine_qualified_leads (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name         TEXT,
  contact_name          TEXT NOT NULL,
  phone                 TEXT NOT NULL,
  email                 TEXT,
  property_address      TEXT,
  market                TEXT,
  project_type          TEXT[],
  property_type         TEXT,
  timeline              TEXT,
  budget_range          TEXT,
  scope_notes           TEXT,
  lead_score            INTEGER DEFAULT 0,
  caller_packet_sent    BOOLEAN DEFAULT FALSE,
  caller_packet_sent_at TIMESTAMPTZ,
  call_outcome          TEXT,
  appointment_booked    BOOLEAN DEFAULT FALSE,
  appointment_date      TIMESTAMPTZ,
  site_visit_notes      TEXT,
  bid_generated         BOOLEAN DEFAULT FALSE,
  bid_sent_at           TIMESTAMPTZ,
  bid_amount            DECIMAL(10,2),
  fred_approved         BOOLEAN DEFAULT FALSE,
  fred_approved_at      TIMESTAMPTZ,
  deposit_received      BOOLEAN DEFAULT FALSE,
  deposit_amount        DECIMAL(10,2),
  status                TEXT DEFAULT 'qualified',
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Marine projects (post-deposit)
CREATE TABLE IF NOT EXISTS marine_projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id       UUID REFERENCES marine_qualified_leads(id),
  client_name   TEXT,
  market        TEXT,
  project_scope TEXT,
  total_value   DECIMAL(10,2),
  deposit_paid  DECIMAL(10,2),
  balance_due   DECIMAL(10,2),
  start_date    DATE,
  status        TEXT DEFAULT 'active',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Marine material pricing (Calvin maintains weekly)
CREATE TABLE IF NOT EXISTS marine_pricing (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name  TEXT NOT NULL,
  unit       TEXT,
  price      DECIMAL(10,2) NOT NULL,
  trend      TEXT DEFAULT 'stable',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO marine_pricing (item_name, unit, price, trend) VALUES
  ('Composite decking', 'per linear ft', 4.20, 'stable'),
  ('Concrete pilings 12in', 'per unit', 380.00, 'up'),
  ('Marine-grade hardware', 'per lb', 12.40, 'stable'),
  ('Boat lift 10K lb', 'per unit', 8200.00, 'down'),
  ('Seawall panel 6ft', 'per section', 220.00, 'stable'),
  ('Pressure-treated lumber', 'per board ft', 3.80, 'stable'),
  ('Marine caulk', 'per tube', 18.00, 'stable'),
  ('Stainless hardware kit', 'per project', 450.00, 'stable')
ON CONFLICT DO NOTHING;

-- Email templates (all fixed copy lives here)
CREATE TABLE IF NOT EXISTS email_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_name TEXT NOT NULL,
  email_number  INTEGER NOT NULL,
  brand         TEXT,
  subject       TEXT NOT NULL,
  body_html     TEXT NOT NULL,
  variables     TEXT[],
  UNIQUE(sequence_name, email_number)
);

-- System prompts (Linda's AI personas)
CREATE TABLE IF NOT EXISTS system_prompts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_name TEXT UNIQUE NOT NULL,
  model       TEXT NOT NULL,
  content     TEXT NOT NULL,
  max_tokens  INTEGER DEFAULT 500,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO system_prompts (prompt_name, model, content, max_tokens) VALUES
('score_reddit_prospect', 'claude-haiku-4-5-20251001',
 'Score this Reddit post for purchase intent for a digital product. Return ONLY a JSON object: {"score": 1-10, "target_asset": "modern_lovefair|itg|bioneer|skyforge_individual|skyforge_bundle", "reason": "one sentence"}. Score 10 = explicit need, 7-9 = strong signal, 4-6 = adjacent, 1-3 = weak.',
 100),
('score_marine_prospect', 'claude-haiku-4-5-20251001',
 'Score this marine construction lead. Return ONLY JSON: {"score": 1-10, "lead_type": "hoa|commercial|residential|marina", "priority": "immediate|standard|nurture", "reason": "one sentence"}. Score 10 = active need + budget + decision maker, 7-9 = strong indicators, below 7 = lower priority.',
 100),
('write_book_outreach', 'claude-sonnet-4-6',
 'You are Linda, coordinator for Watkins Investment Group. Write a Reddit/Twitter DM under 75 words. Reference their specific post. Lead with empathy or acknowledgment. One sentence max on the product. End with a soft question or door — not a close. Never say: certainly, absolutely, I noticed your post, I came across.',
 300),
('write_marine_first_contact', 'claude-sonnet-4-6',
 'You are Linda, coordinator for Fred''s Marine Construction. Write a cold email under 120 words to a waterfront property owner or manager. Reference their specific property or business. One sentence on what Fred''s does. One clear ask: a 5-minute call or project form. Professional but personal. Never open with: I hope this finds you well.',
 400),
('write_marine_caller_packet', 'claude-sonnet-4-6',
 'Generate a marine sales caller packet. Include: (1) 60-word personalized call opener referencing their specific project type and property, (2) 3 bullet key talking points, (3) 3 pre-written objection responses for: "we have a contractor", "send info first", "getting other quotes". Format clearly with labels. Keep total under 350 words.',
 600),
('write_marine_bid', 'claude-sonnet-4-6',
 'Generate a professional marine construction bid document from these site visit notes. Write a scope description paragraph, project timeline, and terms section. Use formal contractor language. The pricing table is provided separately — write only the narrative sections. Keep professional and specific to the noted scope.',
 800),
('write_institutional_email', 'claude-sonnet-4-6',
 'You are Linda for Watkins Investment Group. Write a cold institutional outreach email under 120 words. Lead with their mission. One sentence on The Inmate Traveler''s Guide. One sentence on institutional pricing. One CTA. Close with Bishop Watkins / WIG. Never open with: I hope this email finds you well, I wanted to reach out.',
 400),
('generate_morning_brief', 'claude-sonnet-4-6',
 'Assemble a daily operations brief from the provided JSON data. Write in clear prose with a revenue section, pipeline section, outreach section, and action needed section. Action needed only appears if something requires human decision. Otherwise end with: Nothing needs you today. Keep total under 300 words.',
 600),
('generate_social_content', 'claude-sonnet-4-6',
 'Generate daily social content for 4 platforms from the provided asset and topic context. Write: (1) X/Twitter thread opener + 3 follow-up tweets, (2) Instagram caption with line breaks, (3) LinkedIn post professional tone, (4) TikTok script 30-45 seconds. Each platform gets appropriately formatted content. Never use hashtag spam.',
 800),
('write_web_design_outreach', 'claude-sonnet-4-6',
 'You are Linda, coordinator for a web design studio. Write a cold outreach email under 100 words to a local business owner. Reference their specific business name and what you observed about their web presence. One sentence on what the studio does. One clear ask. Professional but conversational.',
 350),
('generate_web_proposal', 'claude-sonnet-4-6',
 'Generate a professional web design proposal from the provided scope bullets. Include: project overview paragraph, deliverables list, timeline, and investment section with deposit highlighted. Use professional agency language. The pricing figures are provided — write the narrative around them.',
 600),
('write_kill_condition_note', 'claude-haiku-4-5-20251001',
 'Write one sentence (under 20 words) describing what automatic adjustment was made to fix the underperforming metric. Be specific. No fluff.',
 50)
ON CONFLICT (prompt_name) DO NOTHING;

-- Kill condition thresholds
CREATE TABLE IF NOT EXISTS kill_conditions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_name     TEXT UNIQUE NOT NULL,
  metric_name       TEXT NOT NULL,
  threshold_min     DECIMAL(5,2),
  threshold_max     DECIMAL(5,2),
  current_value     DECIMAL(5,2) DEFAULT 0,
  status            TEXT DEFAULT 'healthy',
  last_evaluated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO kill_conditions (workflow_name, metric_name, threshold_min) VALUES
  ('book_outreach', 'response_rate_pct', 5.0),
  ('skyforge_outreach', 'response_rate_pct', 5.0),
  ('marine_outreach', 'response_rate_pct', 5.0),
  ('institutional_outreach', 'response_rate_pct', 5.0),
  ('email_sequences', 'open_rate_pct', 20.0),
  ('cross_sell_router', 'conversion_rate_pct', 3.0)
ON CONFLICT (workflow_name) DO NOTHING;

-- Disable RLS on revenue automation tables
ALTER TABLE wig_customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE skyforge_customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE itg_institutional_leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE wig_daily_metrics DISABLE ROW LEVEL SECURITY;
ALTER TABLE linda_outreach_prospects DISABLE ROW LEVEL SECURITY;
ALTER TABLE linda_content_queue DISABLE ROW LEVEL SECURITY;
ALTER TABLE linda_institutional_targets DISABLE ROW LEVEL SECURITY;
ALTER TABLE wp_leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE wp_qualified_leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE wp_projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE marine_leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE marine_qualified_leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE marine_projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE marine_pricing DISABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_prompts DISABLE ROW LEVEL SECURITY;
ALTER TABLE kill_conditions DISABLE ROW LEVEL SECURITY;
