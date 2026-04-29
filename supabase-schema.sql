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

-- Pantheon Sources — global source library
CREATE TABLE IF NOT EXISTS pantheon_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  rss_feed TEXT,
  tier INTEGER NOT NULL,
  tier_label TEXT NOT NULL,
  region TEXT NOT NULL,
  bias_note TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tier 1 — Wire Services
INSERT INTO pantheon_sources (name, url, rss_feed, tier, tier_label, region, bias_note) VALUES
('Reuters', 'https://www.reuters.com', 'https://feeds.reuters.com/reuters/topNews', 1, 'Wire Service', 'Global', NULL),
('Associated Press', 'https://apnews.com', 'https://apnews.com/rss', 1, 'Wire Service', 'Global', NULL),
('Agence France-Presse', 'https://www.afp.com', 'https://www.afp.com/en/agency/press-releases-newsletter', 1, 'Wire Service', 'Global — Francophone authority', NULL),
('Bloomberg', 'https://www.bloomberg.com', 'https://feeds.bloomberg.com/markets/news.rss', 1, 'Wire Service', 'Global — Finance and markets', NULL);

-- Tier 2 — Global Broadcasters
INSERT INTO pantheon_sources (name, url, rss_feed, tier, tier_label, region, bias_note) VALUES
('BBC World News', 'https://www.bbc.com/news/world', 'http://feeds.bbci.co.uk/news/world/rss.xml', 2, 'Global Broadcaster', 'Global', NULL),
('Al Jazeera English', 'https://www.aljazeera.com', 'https://www.aljazeera.com/xml/rss/all.xml', 2, 'Global Broadcaster', 'MENA — Global South', NULL),
('Deutsche Welle', 'https://www.dw.com/en', 'https://rss.dw.com/xml/rss-en-world', 2, 'Global Broadcaster', 'Europe — Africa', NULL),
('France 24', 'https://www.france24.com/en', 'https://www.france24.com/en/rss', 2, 'Global Broadcaster', 'Europe — MENA — Sahel', NULL),
('NHK World', 'https://www3.nhk.or.jp/nhkworld', 'https://www3.nhk.or.jp/nhkworld/en/news/feeds/rss.xml', 2, 'Global Broadcaster', 'East Asia — Pacific', NULL),
('Channel News Asia', 'https://www.channelnewsasia.com', 'https://www.channelnewsasia.com/rssfeeds/8395986', 2, 'Global Broadcaster', 'Southeast Asia', NULL),
('Euronews', 'https://www.euronews.com', 'https://www.euronews.com/rss?format=mrss&level=theme&name=news', 2, 'Global Broadcaster', 'Europe', NULL),
('RFI English', 'https://www.rfi.fr/en', 'https://www.rfi.fr/en/rss', 2, 'Global Broadcaster', 'Francophone Africa — Global', NULL),
('CGTN', 'https://www.cgtn.com', 'https://www.cgtn.com/subscribe/rss/section/world.xml', 2, 'Global Broadcaster', 'China — Global', 'State voice. Include for full spectrum. Fen sees it clearly.'),
('RT', 'https://www.rt.com', 'https://www.rt.com/rss/', 2, 'Global Broadcaster', 'Russia — Global', 'State voice. Include for full spectrum. Fen sees it clearly.');

-- Tier 3 — Newspapers of Record
INSERT INTO pantheon_sources (name, url, rss_feed, tier, tier_label, region, bias_note) VALUES
('The New York Times', 'https://www.nytimes.com', 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', 3, 'Newspaper of Record', 'USA — Global', NULL),
('The Guardian', 'https://www.theguardian.com', 'https://www.theguardian.com/world/rss', 3, 'Newspaper of Record', 'UK — Global', NULL),
('Financial Times', 'https://www.ft.com', 'https://www.ft.com/rss/home/uk', 3, 'Newspaper of Record', 'Global — Finance', NULL),
('The Washington Post', 'https://www.washingtonpost.com', 'https://feeds.washingtonpost.com/rss/world', 3, 'Newspaper of Record', 'USA — Global', NULL),
('The Economist', 'https://www.economist.com', 'https://www.economist.com/rss', 3, 'Newspaper of Record', 'Global — Systemic analysis', NULL),
('Der Spiegel International', 'https://www.spiegel.de/international', 'https://www.spiegel.de/international/index.rss', 3, 'Newspaper of Record', 'Germany — Europe', NULL),
('Le Monde English', 'https://www.lemonde.fr/en', 'https://www.lemonde.fr/rss/en_une.xml', 3, 'Newspaper of Record', 'France — Europe', NULL),
('El País English', 'https://english.elpais.com', 'https://feeds.elpais.com/mrss-s/pages/ep/site/english.elpais.com/portada', 3, 'Newspaper of Record', 'Spain — Latin America', NULL),
('Corriere della Sera', 'https://www.corriere.it', NULL, 3, 'Newspaper of Record', 'Italy — Mediterranean', NULL),
('Times of India', 'https://timesofindia.indiatimes.com', 'https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms', 3, 'Newspaper of Record', 'India — South Asia', NULL),
('South China Morning Post', 'https://www.scmp.com', 'https://www.scmp.com/rss/91/feed', 3, 'Newspaper of Record', 'China — East Asia', NULL),
('Haaretz English', 'https://www.haaretz.com/english-edition', 'https://www.haaretz.com/cmlink/1.628765', 3, 'Newspaper of Record', 'Israel — MENA', NULL),
('The Hindu', 'https://www.thehindu.com', 'https://www.thehindu.com/news/national/?service=rss', 3, 'Newspaper of Record', 'India', NULL),
('Dawn', 'https://www.dawn.com', 'https://www.dawn.com/feeds/home', 3, 'Newspaper of Record', 'Pakistan — South Asia', NULL),
('Daily Maverick', 'https://www.dailymaverick.co.za', 'https://www.dailymaverick.co.za/dmrss/', 3, 'Newspaper of Record', 'South Africa — Africa', NULL),
('The East African', 'https://www.theeastafrican.co.ke', NULL, 3, 'Newspaper of Record', 'East Africa', NULL),
('Sydney Morning Herald', 'https://www.smh.com.au', 'https://www.smh.com.au/rss/world.xml', 3, 'Newspaper of Record', 'Australia — Pacific', NULL),
('The Globe and Mail', 'https://www.theglobeandmail.com', 'https://www.theglobeandmail.com/arc/outboundfeeds/rss/category/world/', 3, 'Newspaper of Record', 'Canada — Arctic — Commonwealth', NULL);

-- Tier 4 — Regional Specialists
INSERT INTO pantheon_sources (name, url, rss_feed, tier, tier_label, region, bias_note) VALUES
('Middle East Eye', 'https://www.middleeasteye.net', 'https://www.middleeasteye.net/rss', 4, 'Regional Specialist', 'MENA', NULL),
('Arab News', 'https://www.arabnews.com', 'https://www.arabnews.com/rss.xml', 4, 'Regional Specialist', 'Gulf — Saudi Arabia', NULL),
('The New Arab', 'https://www.newarab.com', 'https://www.newarab.com/rss.xml', 4, 'Regional Specialist', 'Pan-Arab', NULL),
('Nikkei Asia', 'https://asia.nikkei.com', 'https://asia.nikkei.com/rss/feed/nar', 4, 'Regional Specialist', 'Asia — Japan — Finance', NULL),
('The Straits Times', 'https://www.straitstimes.com', 'https://www.straitstimes.com/news/world/rss.xml', 4, 'Regional Specialist', 'Singapore — ASEAN', NULL),
('Bangkok Post', 'https://www.bangkokpost.com', 'https://www.bangkokpost.com/rss/data/world.xml', 4, 'Regional Specialist', 'Southeast Asia — Thailand', NULL),
('Frontier Myanmar', 'https://www.frontiermyanmar.net', 'https://www.frontiermyanmar.net/en/feed', 4, 'Regional Specialist', 'Myanmar', 'One of few remaining free voices from Myanmar.'),
('The Africa Report', 'https://www.theafricareport.com', 'https://www.theafricareport.com/feed/', 4, 'Regional Specialist', 'Pan-Africa', NULL),
('AllAfrica', 'https://allafrica.com', 'https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf', 4, 'Regional Specialist', 'Africa — 130+ sources aggregated', NULL),
('Agencia EFE', 'https://www.efe.com/en', 'https://www.efe.com/efe/english/rss/', 4, 'Regional Specialist', 'Latin America — Spanish-speaking world', NULL),
('Infobae', 'https://www.infobae.com', 'https://www.infobae.com/feeds/rss/', 4, 'Regional Specialist', 'Latin America — Argentina', NULL),
('Folha de S.Paulo', 'https://www.folha.uol.com.br', 'https://feeds.folha.uol.com.br/mundo/rss091.xml', 4, 'Regional Specialist', 'Brazil — South America', NULL);

-- Tier 5 — Epistemic Feeds
INSERT INTO pantheon_sources (name, url, rss_feed, tier, tier_label, region, bias_note) VALUES
('Foreign Affairs', 'https://www.foreignaffairs.com', 'https://www.foreignaffairs.com/rss.xml', 5, 'Epistemic Feed', 'Global — Long-form geopolitics', NULL),
('Foreign Policy', 'https://foreignpolicy.com', 'https://foreignpolicy.com/feed/', 5, 'Epistemic Feed', 'Global — Strategy and policy', NULL),
('The Intercept', 'https://theintercept.com', 'https://theintercept.com/feed/?rss', 5, 'Epistemic Feed', 'Global — Adversarial investigative', NULL),
('ProPublica', 'https://www.propublica.org', 'https://feeds.propublica.org/propublica/main', 5, 'Epistemic Feed', 'USA — Institutions and power', NULL),
('Bellingcat', 'https://www.bellingcat.com', 'https://www.bellingcat.com/feed/', 5, 'Epistemic Feed', 'Global — Open-source intelligence', NULL),
('Global Voices', 'https://globalvoices.org', 'https://globalvoices.org/feed/', 5, 'Epistemic Feed', 'Global — Citizen journalism 167 countries', NULL),
('Rest of World', 'https://restofworld.org', 'https://restofworld.org/feed/latest', 5, 'Epistemic Feed', 'Global South — Technology impact', NULL),
('The Conversation', 'https://theconversation.com', 'https://theconversation.com/us/articles.atom', 5, 'Epistemic Feed', 'Global — Academic expertise', NULL),
('Project Syndicate', 'https://www.project-syndicate.org', 'https://www.project-syndicate.org/rss', 5, 'Epistemic Feed', 'Global — Nobel laureates and senior thinkers', NULL),
('RAND Corporation', 'https://www.rand.org', 'https://www.rand.org/pubs/rss/latest_products.xml', 5, 'Epistemic Feed', 'Global — Policy research and strategic analysis', NULL),
('Chatham House', 'https://www.chathamhouse.org', 'https://www.chathamhouse.org/rss.xml', 5, 'Epistemic Feed', 'Global — UK foreign policy think tank', NULL),
('Council on Foreign Relations', 'https://www.cfr.org', 'https://www.cfr.org/rss/all', 5, 'Epistemic Feed', 'Global — US foreign policy establishment', NULL),
('International Crisis Group', 'https://www.crisisgroup.org', 'https://www.crisisgroup.org/rss.xml', 5, 'Epistemic Feed', 'Global — Real-time conflict monitoring', NULL),
('ACLED', 'https://acleddata.com', 'https://acleddata.com/feed/', 5, 'Epistemic Feed', 'Global — Armed conflict location and event data', NULL);

-- Add source_id to pantheon_sessions (run after pantheon_sessions table exists)
-- ALTER TABLE pantheon_sessions ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES pantheon_sources(id);

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
