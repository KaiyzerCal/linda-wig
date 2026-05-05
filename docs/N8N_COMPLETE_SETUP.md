# COMPLETE N8N SETUP & WORKFLOW
## All Systems — Books · SkyforgeAI · Web Design · Marine · Linda Outreach
## Token-Optimized · Production-Ready

---

## PART 1: INFRASTRUCTURE SETUP

---

### STEP 1: N8N INSTANCE

**Recommended: n8n Cloud (free tier to start)**
- Go to: https://app.n8n.cloud
- Sign up → Create workspace → Note your instance URL:
  `https://[your-name].app.n8n.cloud`
- All webhook URLs follow this pattern:
  `https://[your-name].app.n8n.cloud/webhook/[workflow-name]`

**Environment variables to set in n8n (Settings → Variables):**
```
ANTHROPIC_API_KEY       = sk-ant-...
SUPABASE_URL            = https://[project].supabase.co
SUPABASE_SERVICE_KEY    = eyJ...
GMAIL_CLIENT_ID         = [from Google Cloud Console]
GMAIL_CLIENT_SECRET     = [from Google Cloud Console]
STRIPE_SECRET_KEY       = sk_live_...
STRIPE_WEBHOOK_SECRET   = whsec_...
CALENDLY_API_KEY        = [from Calendly developer settings]
REDDIT_CLIENT_ID        = [from Reddit app settings]
REDDIT_CLIENT_SECRET    = [from Reddit app settings]
SERPER_API_KEY          = [from serper.dev]
TOMORROW_API_KEY        = [from tomorrow.io — weather alerts]
```

---

### STEP 2: SUPABASE SETUP

Go to: https://supabase.com → New project → Run these SQL scripts in order.

---

#### SQL SCRIPT 1: CORE TABLES

```sql
-- Master customer table (all brands)
CREATE TABLE wig_customers (
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

-- Skyforge AI brand tracking
CREATE TABLE skyforge_customers (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                       TEXT UNIQUE NOT NULL REFERENCES wig_customers(email),
  full_name                   TEXT,
  products_purchased          TEXT[] DEFAULT '{}',
  total_skyforge_spent        DECIMAL(10,2) DEFAULT 0,
  entry_product               TEXT,
  bundle_purchased            BOOLEAN DEFAULT FALSE,
  email_1_sent_at             TIMESTAMPTZ,
  email_2_sent_at             TIMESTAMPTZ,
  email_3_sent_at             TIMESTAMPTZ,
  upsell_email_sent_at        TIMESTAMPTZ,
  bundle_offer_sent_at        TIMESTAMPTZ,
  architecture_set_offer_sent_at TIMESTAMPTZ,
  review_requested            BOOLEAN DEFAULT FALSE,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- ITG institutional leads
CREATE TABLE itg_institutional_leads (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_name              TEXT NOT NULL,
  contact_name          TEXT,
  contact_email         TEXT,
  org_type              TEXT,
  copies_needed         INTEGER,
  quoted_price          DECIMAL(10,2),
  quote_sent_at         TIMESTAMPTZ,
  follow_up_1_sent_at   TIMESTAMPTZ,
  follow_up_2_sent_at   TIMESTAMPTZ,
  referral_sent_at      TIMESTAMPTZ,
  referred_by           TEXT,
  status                TEXT DEFAULT 'new',
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Daily metrics (all brands)
CREATE TABLE wig_daily_metrics (
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
```

---

#### SQL SCRIPT 2: OUTREACH TABLES

```sql
-- Linda's outreach prospects (all brands)
CREATE TABLE linda_outreach_prospects (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform              TEXT,
  handle_or_url         TEXT,
  full_name             TEXT,
  target_asset          TEXT,
  outreach_type         TEXT DEFAULT 'individual',
  post_content          TEXT,
  message_sent          TEXT,
  sent_at               TIMESTAMPTZ,
  response_received     BOOLEAN DEFAULT FALSE,
  response_text         TEXT,
  response_at           TIMESTAMPTZ,
  follow_up_1_sent_at   TIMESTAMPTZ,
  follow_up_2_sent_at   TIMESTAMPTZ,
  converted             BOOLEAN DEFAULT FALSE,
  converted_to          TEXT,
  kill_condition_hit    BOOLEAN DEFAULT FALSE,
  status                TEXT DEFAULT 'queued',
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Linda content queue (social posts)
CREATE TABLE linda_content_queue (
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
CREATE TABLE linda_institutional_targets (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_name              TEXT,
  org_type              TEXT,
  contact_name          TEXT,
  contact_title         TEXT,
  contact_email         TEXT,
  linkedin_url          TEXT,
  location              TEXT,
  copies_estimate       INTEGER,
  outreach_1_sent_at    TIMESTAMPTZ,
  outreach_2_sent_at    TIMESTAMPTZ,
  outreach_3_sent_at    TIMESTAMPTZ,
  response_received     BOOLEAN DEFAULT FALSE,
  response_text         TEXT,
  status                TEXT DEFAULT 'identified',
  source                TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### SQL SCRIPT 3: WEB DESIGN TABLES

```sql
-- Web design prospects
CREATE TABLE wp_leads (
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
CREATE TABLE wp_qualified_leads (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name         TEXT NOT NULL,
  contact_name          TEXT,
  phone                 TEXT NOT NULL,
  email                 TEXT,
  business_type         TEXT,
  current_website       TEXT,
  project_goals         TEXT[],
  timeline              TEXT,
  budget_range          TEXT,
  best_call_time        TEXT,
  lead_score            INTEGER DEFAULT 0,
  nurture_track         TEXT DEFAULT 'standard',
  email_1_sent_at       TIMESTAMPTZ,
  email_2_sent_at       TIMESTAMPTZ,
  email_3_sent_at       TIMESTAMPTZ,
  calendly_link_sent    BOOLEAN DEFAULT FALSE,
  appointment_booked    BOOLEAN DEFAULT FALSE,
  appointment_date      TIMESTAMPTZ,
  proposal_sent_at      TIMESTAMPTZ,
  proposal_amount       DECIMAL(10,2),
  deposit_received      BOOLEAN DEFAULT FALSE,
  deposit_amount        DECIMAL(10,2),
  deposit_received_at   TIMESTAMPTZ,
  status                TEXT DEFAULT 'qualified',
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Web design projects (post-deposit)
CREATE TABLE wp_projects (
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
```

---

#### SQL SCRIPT 4: MARINE TABLES

```sql
-- Marine leads (raw research)
CREATE TABLE marine_leads (
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
CREATE TABLE marine_qualified_leads (
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
CREATE TABLE marine_projects (
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

-- Live material pricing (Calvin maintains weekly)
CREATE TABLE marine_pricing (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name  TEXT NOT NULL,
  unit       TEXT,
  price      DECIMAL(10,2) NOT NULL,
  trend      TEXT DEFAULT 'stable',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed pricing data
INSERT INTO marine_pricing (item_name, unit, price, trend) VALUES
  ('Composite decking', 'per linear ft', 4.20, 'stable'),
  ('Concrete pilings 12in', 'per unit', 380.00, 'up'),
  ('Marine-grade hardware', 'per lb', 12.40, 'stable'),
  ('Boat lift 10K lb', 'per unit', 8200.00, 'down'),
  ('Seawall panel 6ft', 'per section', 220.00, 'stable'),
  ('Pressure-treated lumber', 'per board ft', 3.80, 'stable'),
  ('Marine caulk', 'per tube', 18.00, 'stable'),
  ('Stainless hardware kit', 'per project', 450.00, 'stable');
```

---

#### SQL SCRIPT 5: SYSTEM TABLES

```sql
-- Email templates (ALL fixed email copy lives here)
CREATE TABLE email_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_name TEXT NOT NULL,
  email_number  INTEGER NOT NULL,
  brand         TEXT,
  subject       TEXT NOT NULL,
  body_html     TEXT NOT NULL,
  variables     TEXT[],
  UNIQUE(sequence_name, email_number)
);

-- System prompts (Linda's AI personas — kept short)
CREATE TABLE system_prompts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_name TEXT UNIQUE NOT NULL,
  model       TEXT NOT NULL,
  content     TEXT NOT NULL,
  max_tokens  INTEGER DEFAULT 500,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Kill condition thresholds
CREATE TABLE kill_conditions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_name     TEXT UNIQUE NOT NULL,
  metric_name       TEXT NOT NULL,
  threshold_min     DECIMAL(5,2),
  threshold_max     DECIMAL(5,2),
  current_value     DECIMAL(5,2) DEFAULT 0,
  status            TEXT DEFAULT 'healthy',
  last_evaluated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed kill conditions
INSERT INTO kill_conditions (workflow_name, metric_name, threshold_min) VALUES
  ('book_outreach', 'response_rate_pct', 5.0),
  ('skyforge_outreach', 'response_rate_pct', 5.0),
  ('marine_outreach', 'response_rate_pct', 5.0),
  ('institutional_outreach', 'response_rate_pct', 5.0),
  ('email_sequences', 'open_rate_pct', 20.0),
  ('cross_sell_router', 'conversion_rate_pct', 3.0);

-- System prompts seed (all under 200 tokens)
INSERT INTO system_prompts (prompt_name, model, content, max_tokens) VALUES
(
  'score_reddit_prospect',
  'claude-haiku-4-5-20251001',
  'Score this Reddit post for purchase intent for a digital product. Return ONLY a JSON object: {"score": 1-10, "target_asset": "modern_lovefair|itg|bioneer|skyforge_individual|skyforge_bundle", "reason": "one sentence"}. Score 10 = explicit need, 7-9 = strong signal, 4-6 = adjacent, 1-3 = weak.',
  100
),
(
  'score_marine_prospect',
  'claude-haiku-4-5-20251001',
  'Score this marine construction lead. Return ONLY JSON: {"score": 1-10, "lead_type": "hoa|commercial|residential|marina", "priority": "immediate|standard|nurture", "reason": "one sentence"}. Score 10 = active need + budget + decision maker, 7-9 = strong indicators, below 7 = lower priority.',
  100
),
(
  'write_book_outreach',
  'claude-sonnet-4-20250514',
  'You are Linda, coordinator for Watkins Investment Group. Write a Reddit/Twitter DM under 75 words. Reference their specific post. Lead with empathy or acknowledgment. One sentence max on the product. End with a soft question or door — not a close. Never say: certainly, absolutely, I noticed your post, I came across.',
  300
),
(
  'write_marine_first_contact',
  'claude-sonnet-4-20250514',
  'You are Linda, coordinator for Fred''s Marine Construction. Write a cold email under 120 words to a waterfront property owner or manager. Reference their specific property or business. One sentence on what Fred''s does. One clear ask: a 5-minute call or project form. Professional but personal. Never open with: I hope this finds you well.',
  400
),
(
  'write_marine_caller_packet',
  'claude-sonnet-4-20250514',
  'Generate a marine sales caller packet. Include: (1) 60-word personalized call opener referencing their specific project type and property, (2) 3 bullet key talking points, (3) 3 pre-written objection responses for: "we have a contractor", "send info first", "getting other quotes". Format clearly with labels. Keep total under 350 words.',
  600
),
(
  'write_marine_bid',
  'claude-sonnet-4-20250514',
  'Generate a professional marine construction bid document from these site visit notes. Write a scope description paragraph, project timeline, and terms section. Use formal contractor language. The pricing table is provided separately — write only the narrative sections. Keep professional and specific to the noted scope.',
  800
),
(
  'write_institutional_email',
  'claude-sonnet-4-20250514',
  'You are Linda for Watkins Investment Group. Write a cold institutional outreach email under 120 words. Lead with their mission. One sentence on The Inmate Traveler''s Guide. One sentence on institutional pricing. One CTA. Close with Bishop Watkins / WIG. Never open with: I hope this email finds you well, I wanted to reach out.',
  400
),
(
  'generate_morning_brief',
  'claude-sonnet-4-20250514',
  'Assemble a daily operations brief from the provided JSON data. Write in clear prose with a revenue section, pipeline section, outreach section, and action needed section. Action needed only appears if something requires human decision. Otherwise end with: Nothing needs you today. Keep total under 300 words.',
  600
),
(
  'generate_social_content',
  'claude-sonnet-4-20250514',
  'Generate daily social content for 4 platforms from the provided asset and topic context. Write: (1) X/Twitter thread opener + 3 follow-up tweets, (2) Instagram caption with line breaks, (3) LinkedIn post professional tone, (4) TikTok script 30-45 seconds. Each platform gets appropriately formatted content. Never use hashtag spam.',
  800
),
(
  'write_web_design_outreach',
  'claude-sonnet-4-20250514',
  'You are Linda, coordinator for a web design studio. Write a cold outreach email under 100 words to a local business owner. Reference their specific business name and what you observed about their web presence. One sentence on what the studio does. One clear ask. Professional but conversational.',
  350
),
(
  'generate_web_proposal',
  'claude-sonnet-4-20250514',
  'Generate a professional web design proposal from the provided scope bullets. Include: project overview paragraph, deliverables list, timeline, and investment section with deposit highlighted. Use professional agency language. The pricing figures are provided — write the narrative around them.',
  600
),
(
  'write_kill_condition_note',
  'claude-haiku-4-5-20251001',
  'Write one sentence (under 20 words) describing what automatic adjustment was made to fix the underperforming metric. Be specific. No fluff.',
  50
);
```

---

### STEP 3: GUMROAD WEBHOOKS

Go to each product on Gumroad → Edit → Settings → Add webhook:

| Product | Webhook URL |
|---|---|
| Modern Lovefair ($17+) | `[n8n-url]/webhook/wig-ml-purchase` |
| ITG Individual ($7.99) | `[n8n-url]/webhook/wig-itg-purchase` |
| ITG Workbook ($4.99) | `[n8n-url]/webhook/wig-itg-workbook-purchase` |
| The Architecture Set ($37) | `[n8n-url]/webhook/wig-bundle-purchase` |
| ChatGPT Money Mastery | `[n8n-url]/webhook/skyforge-chatgpt-money` |
| AI Image Generation Mastery | `[n8n-url]/webhook/skyforge-image-gen` |
| AI Prompt Engineering Playbook | `[n8n-url]/webhook/skyforge-prompt-playbook` |
| AI Systems for Everyday Operators | `[n8n-url]/webhook/skyforge-ai-systems` |
| Master ChatGPT 2026 | `[n8n-url]/webhook/skyforge-master-chatgpt` |
| SkyforgeAI Mastery Collection ($37) | `[n8n-url]/webhook/skyforge-bundle` |
| BIONEER ($16.99) — Calvin's account | `[n8n-url]/webhook/wig-bioneer-purchase` |

Event type for all: **Sale**

---

## PART 2: ALL 34 WORKFLOWS

---

### WORKFLOW 1: Universal Purchase Intake
**Trigger:** Any Gumroad purchase webhook (all 11 products)
**Runs:** Real-time

```
NODE 1: Webhook
  Path: set per product above
  Method: POST
  Response: 200 immediately

NODE 2: Code node — Extract & identify
  const assetMap = {
    'wig-ml-purchase':             { brand: 'wig', asset: 'modern_lovefair', col: 'ml' },
    'wig-itg-purchase':            { brand: 'wig', asset: 'itg', col: 'itg' },
    'wig-itg-workbook-purchase':   { brand: 'wig', asset: 'itg_workbook', col: 'workbook' },
    'wig-bundle-purchase':         { brand: 'wig', asset: 'architecture_set', col: 'architecture_set' },
    'skyforge-chatgpt-money':      { brand: 'skyforge_ai', asset: 'chatgpt_money', col: 'skyforge_individual' },
    'skyforge-image-gen':          { brand: 'skyforge_ai', asset: 'image_gen', col: 'skyforge_individual' },
    'skyforge-prompt-playbook':    { brand: 'skyforge_ai', asset: 'prompt_playbook', col: 'skyforge_individual' },
    'skyforge-ai-systems':         { brand: 'skyforge_ai', asset: 'ai_systems', col: 'skyforge_individual' },
    'skyforge-master-chatgpt':     { brand: 'skyforge_ai', asset: 'master_chatgpt', col: 'skyforge_individual' },
    'skyforge-bundle':             { brand: 'skyforge_ai', asset: 'skyforge_bundle', col: 'skyforge_bundle' },
    'wig-bioneer-purchase':        { brand: 'bioneer', asset: 'bioneer', col: 'bioneer' },
  };

NODE 3: Supabase — Check existing customer
  Table: wig_customers | Filter: email = input email

NODE 4: IF returning → UPDATE products_purchased + total_spent
         IF new → INSERT full record

NODE 5: Supabase — Upsert daily metrics (date = TODAY)
  Increment correct sales + revenue columns

NODE 6: Route to product sequence workflow
  Switch on asset value
```

---

### WORKFLOW 2: Modern Lovefair Email Sequence
**Trigger:** Called by W1 | Hourly schedule check

```
ALL EMAILS USE TEMPLATES FROM email_templates TABLE — ZERO API CALLS

Email 1: immediate — delivery + welcome
Email 2: 72hrs — implementation prompt, first move
Email 3: 96hrs — Architecture Set cross-sell ($37)
  → cross_sell_eligible = true
Email 4: 7 days — BIONEER cross-sell ($16.99)
  → bioneer_offered = true
Email 5: 7 days — review request
  → review_requested = true, funnel_stage = 'ML_DONE'
```

---

### WORKFLOW 3: ITG Individual Email Sequence
**Trigger:** Called by W1 | Hourly check

```
Email 1: immediate — delivery + how to use
Email 2: 72hrs — what the system doesn't tell you
Email 3: 96hrs — for the family waiting outside
  → cross_sell_eligible = true
Email 4: 7 days — Modern Lovefair cross-sell
Email 5: 7 days — Amazon review request
  → review_requested = true, funnel_stage = 'ITG_DONE'
```

---

### WORKFLOW 4: ITG Workbook Email Sequence
**Trigger:** Called by W1 | Hourly check

```
Email 1: immediate — workbook delivery
Email 2: 72hrs — the section most people skip
Email 3: 10 days —
  IF 'itg' NOT in products: offer ITG ($7.99)
  ELSE: offer Modern Lovefair ($17)
  → review_requested = true, funnel_stage = 'WORKBOOK_DONE'
```

---

### WORKFLOW 5: Architecture Set Email Sequence
**Trigger:** Called by W1 | Hourly check

```
Email 1: immediate — both books delivered
  → mark itg + modern_lovefair in products_purchased
  → customer_tier = 'mid'
Email 2: 72hrs — shared thesis
Email 3: 96hrs — BIONEER cross-sell
  → bioneer_offered = true
Email 4: 7 days — dual review request
  → review_requested = true, funnel_stage = 'BUNDLE_DONE'
```

---

### WORKFLOW 6: SkyforgeAI Individual Product Sequence
**Trigger:** Called by W1 | Hourly check

```
Email 1: immediate — delivery (template by entry_product)
Email 2: 72hrs — product-specific value (template per entry_product)
Email 3: 96hrs — bundle upsell
  → skyforge_bundle_offered = true, cross_sell_eligible = true
Email 4: 7 days — WIG cross-sell
  → skyforge_offered = true
Email 5: 7 days — review request
  → review_requested = true, funnel_stage = 'SKYFORGE_DONE'
```

---

### WORKFLOW 7: SkyforgeAI Bundle Sequence
**Trigger:** Called by W1 | Hourly check

```
Email 1: immediate — all 5 files + recommended order
  → skyforge_bundle_purchased = true, customer_tier = 'mid'
Email 2: 72hrs — operator vs user mindset
Email 3: 96hrs — WIG cross-sell
  → architecture_set_offered = true
Email 4: 7 days — BIONEER cross-sell
  → bioneer_offered = true
Email 5: 7 days — review request
  → review_requested = true, funnel_stage = 'SKYFORGE_BUNDLE_DONE'
```

---

### WORKFLOW 8: BIONEER Intake + Cross-Sell Back
**Trigger:** BIONEER webhook | Hourly check

```
Email 1: immediate — delivery (Calvin's copy)
Email 2: 72hrs — Modern Lovefair cross-sell
  IF not owned → cross_sell_sent = true
Email 3: 96hrs — SkyforgeAI Mastery Collection cross-sell
  → skyforge_offered = true
Email 4: 7 days — review request
  → review_requested = true, funnel_stage = 'BIONEER_DONE'
```

---

### WORKFLOW 9: ITG Institutional Pipeline
**Trigger:** Institutional form webhook | Schedule follow-ups

```
NODE 1: Webhook — form submission
NODE 2: INSERT itg_institutional_leads, status = 'new'

NODE 3: IF copies_needed >= 200:
  → Alert Bishop immediately, status = 'needs_bishop', STOP

NODE 4: Calculate quote:
  <= 10 copies: $14.99/ea | <= 50: $12.00/ea | <= 200: $10.00/ea

NODE 5: Send quote email (template)
  → status = 'quoted', quote_sent_at = NOW()

FOLLOW-UPS:
  Day 3 → follow-up 1 (template)
  Day 7 → follow-up 2 (template)
  Day 14 → status = 'dead'

IF response received:
  → Alert Bishop via Telegram
  → status = 'negotiating'
```

---

### WORKFLOW 10: Universal Cross-Sell Router
**Trigger:** Schedule — daily 8am

```
Query wig_customers WHERE cross_sell_eligible = true AND cross_sell_sent = false

FOR each customer:
  Build offer from products_purchased array:
    owns ITG, not architecture_set    → Architecture Set ($37)
    owns ML, not skyforge_bundle      → SkyforgeAI Collection ($37)
    owns any skyforge, not bundle     → SkyforgeAI Collection ($37)
    owns anything, not bioneer, 14d+  → BIONEER ($16.99)
    total_spent > $60                 → coaching_interest = true

  Pull template, fill slots, send
  → cross_sell_sent = true
  → wig_daily_metrics: cross_sells_sent + 1
```

---

### WORKFLOW 11: Review Engine
**Trigger:** Schedule — daily 9am

```
Query wig_customers WHERE funnel_stage LIKE '%DONE'
  AND review_requested = false
  AND created_at < NOW() - 10 days
LIMIT 50

FOR each: pull template by source_asset, fill slots, send
→ review_requested = true
→ 7-day follow-up if review_left still false (one follow-up only)
```

---

### WORKFLOW 12: Morning Brief Assembly
**Trigger:** Schedule — daily 6am

```
NODE 1: Pull from Supabase in one batch:
  - wig_daily_metrics (yesterday)
  - coaching_interest count
  - institutional leads needing Bishop
  - kill_conditions alerts
  - marine bids awaiting Fred
  - wp proposals open

NODE 2: Anthropic Sonnet (ONE call)
  System: [system_prompts: 'generate_morning_brief']
  User: [all data as JSON]
  Max tokens: 600

NODE 3: Gmail → Bishop
NODE 4: IF errors or kill conditions: separate email → Calvin
```

---

### WORKFLOW 13: Linda's Prospect Research (Books + SkyforgeAI)
**Trigger:** Schedule — daily 6am Mon–Fri

```
NODE 1: Reddit API — search rotating keyword sets
  Week A: "self improvement identity presence"
  Week B: "make money chatgpt ai tools"
  Week C: "incarceration prison family support"
  Week D: "ai productivity automation workflow"
  sort: new | limit: 50 | t: day

NODE 2: Haiku score each post (one call per post)
  System: [system_prompts: 'score_reddit_prospect']
  Max tokens: 100

NODE 3: IF score >= 6 AND not duplicate:
  INSERT linda_outreach_prospects, status = 'queued'
  → wig_daily_metrics: prospects_identified + 1

NODE 4: Mark top 15 of day as priority queue
```

---

### WORKFLOW 14: Linda's Outreach Execution (Books + SkyforgeAI)
**Trigger:** Schedule — daily 9am

```
Pull linda_outreach_prospects WHERE status = 'queued' LIMIT 15

FOR each:
  Sonnet call — personalized DM
  System: [system_prompts: 'write_book_outreach']
  Max tokens: 300

  Reddit API — POST to /api/compose
  UPDATE: status = 'sent', sent_at = NOW()
  → wig_daily_metrics: outreach_sent + 1

FOLLOW-UPS:
  48hrs → follow-up 1 (Sonnet, different angle)
  96hrs → follow-up 2 (shorter)
  7 days → status = 'dead'
```

---

### WORKFLOW 15: Linda's Institutional Outreach
**Trigger:** Schedule — Mon, Wed, Fri 8am

```
Serper.dev search: "public defender office [rotating city] contact email"
Cities: Miami, Stuart, WPB, Atlanta, Chicago, Houston, NYC, Philadelphia, Detroit, Baltimore

Deduplicate against linda_institutional_targets
IF not duplicate AND score >= 7: INSERT

Sonnet call per target
System: [system_prompts: 'write_institutional_email']
Max tokens: 400

Gmail send → UPDATE outreach_1_sent_at
→ wig_daily_metrics: institutional_contacted + 1

FOLLOW-UPS: Day 3, Day 7 (templates)
Day 14 no response → status = 'dead'
```

---

### WORKFLOW 16: Response Monitor
**Trigger:** Schedule — every 2 hours

```
Gmail search: unread institutional replies → match + alert Bishop
Gmail search: UNSUBSCRIBE → add to optout list

Reddit API: check /message/inbox
→ Match to linda_outreach_prospects
→ Sonnet: generate contextual reply (continue conversation)
→ Send reply via Reddit API
→ wig_daily_metrics: outreach_responses + 1
```

---

### WORKFLOW 17: Kill Condition Monitor
**Trigger:** Schedule — every 48 hours

```
Calculate response rates from Supabase for each tracked metric
Compare against kill_conditions thresholds

IF below threshold_min:
  → status = 'alert'
  → Haiku: write adjustment note (1 sentence)
  → Rotate message angle for next outreach batch
  → Queue note for morning brief

IF performing > threshold * 1.5:
  → Increase daily outreach cap +20% for that asset

IF coaching_interest customers > 5:
  → Flag to morning brief: "5+ VIP candidates. Coaching offer ready."
```

---

### WORKFLOW 18: Social Content Generation
**Trigger:** Schedule — daily 5am

```
Rotate asset + topic by day:
  Mon: skyforge_bundle — AI income systems
  Tue: modern_lovefair — identity and attraction
  Wed: itg — dignity under pressure
  Thu: bioneer — physical discipline
  Fri: skyforge_individual — AI productivity tip

ONE Sonnet call (all 4 platforms)
System: [system_prompts: 'generate_social_content']
Max tokens: 800

Parse into 4 posts → INSERT linda_content_queue, status = 'pending'
Flag in morning brief: "Today's content ready for review."
```

---

### WORKFLOW 19: Social Posting + Engagement Monitor
**Trigger:** Bishop approval webhook

```
Pull approved content for today

POST to Twitter/X API v2: /2/tweets
POST to LinkedIn API: /v2/ugcPosts

UPDATE linda_content_queue: status = 'posted'

6 hours later: pull engagement metrics from each platform
Write engagement_score to linda_content_queue
IF score > avg * 1.5 → flag as proven angle
IF score < avg * 0.5 → flag for angle rotation
```

---

### WORKFLOW 20: Social-to-Funnel Capture
**Trigger:** Schedule — every 2 hours

```
Twitter API: check mentions + replies on recent posts
LinkedIn API: check post comments

Buying signals: "link", "how", "price", "where", "interested", "need this"

IF comment/reply: Sonnet reply with Gumroad link
IF DM: route to Workflow 14 with post context
UPDATE source_channel = 'social' on any resulting buyer
```

---

### WORKFLOW 21: Web Design Prospect Research
**Trigger:** Schedule — Mon–Fri 7am

```
Google Places API — rotating niches:
  Mon: restaurants
  Tue: contractors, plumbers, roofers, electricians
  Wed: medical, dental offices
  Thu: law firms, solo practitioners
  Fri: beauty salons, fitness studios

Filter: rating 3.5–4.5, user_ratings_total 10–200
Check website via HEAD request + Google PageSpeed API
Score: no website +3, slow/outdated +2, not mobile +1

INSERT wp_leads WHERE score >= 5 AND not duplicate
→ wig_daily_metrics: wp_leads_found + count
```

---

### WORKFLOW 22: Web Design First Contact
**Trigger:** Schedule — daily 9am

```
Pull wp_leads WHERE lead_score >= 7 AND outreach_sent = false LIMIT 15

FOR each:
  Sonnet call
  System: [system_prompts: 'write_web_design_outreach']
  User: business name, type, location, website status
  Max tokens: 350

  Gmail send
  UPDATE: outreach_sent = true
  → wig_daily_metrics: outreach_sent + 1
```

---

### WORKFLOW 23: Web Design Qualification Intake
**Trigger:** Form submission webhook

```
Auto-disqualify:
  budget = 'under_500' → decline template → STOP
  location out of area → decline → STOP
  no phone → request phone → 24hr wait → STOP

Score and assign nurture_track:
  budget $1500–3000: +3 | $3000+: +4
  timeline ASAP: +2 | 3 months: +1 | exploring: slow track

INSERT wp_qualified_leads
Gmail: notify coordinator
→ wig_daily_metrics: wp_qualified + 1
→ Trigger Workflow 24
```

---

### WORKFLOW 24: Web Design Nurture Sequence
**Trigger:** W23 → Hourly schedule check

```
STANDARD TRACK (ASAP or 3 months):
  Email 1: immediate — confirmation + process overview (template)
  Email 2: Day 2 — portfolio example matching niche (template + portfolio URL)
  Email 3: Day 5 — proposal invitation with Calendly link (template)
    → calendly_link_sent = true

SLOW TRACK (exploring):
  Email 1: immediate — confirmation (template)
  Monthly value emails (template series)
  Calendly invitation: Day 28

IF Calendly sent + no booking after 5 days:
  → Re-engagement email (template)
  7 more days no response → status = 'nurture_stale'
```

---

### WORKFLOW 25: Web Design Discovery → Proposal
**Trigger:** Calendly booking webhook

```
NODE 1: Match booking to wp_qualified_leads by email
UPDATE: appointment_booked = true, appointment_date = [time]

NODE 2: Gmail — pre-call prep to prospect (1hr before, template)
NODE 3: Gmail — full lead brief to coordinator

POST-CALL: You submit 3 scope bullets + agreed_price via form

NODE 4: Sonnet call
System: [system_prompts: 'generate_web_proposal']
User: client name, scope bullets, price, deposit, timeline
Max tokens: 600

NODE 5: Stripe API — create payment link
  Amount: price * 0.25 (25% deposit)
  Metadata: lead_id, business_name

NODE 6: Gmail — send proposal with Stripe link embedded
→ proposal_sent_at = NOW()
→ wig_daily_metrics: wp_appointments + 1
```

---

### WORKFLOW 26: Web Design Deposit → Project Start
**Trigger:** Stripe payment webhook

```
Verify STRIPE_WEBHOOK_SECRET signature
Extract: amount, metadata.lead_id

UPDATE wp_qualified_leads: deposit_received = true, status = 'won'
INSERT wp_projects: all client + scope details, balance_due

Gmail → client: kickoff confirmation (template)
Gmail → Bishop: "[Business] deposit received — $[amount]. Balance: $[amount]."

FOLLOW-UP if no deposit 48hrs: one follow-up template
7 days no deposit → status = 'lost'
```

---

### WORKFLOW 27: Web Design Pipeline Health
**Trigger:** Schedule — every 48 hours

```
Pull wp_qualified_leads WHERE proposal_sent AND deposit_received = false

FOR each open proposal > 48hrs: send follow-up template

Calculate (pure n8n math — no API):
  close_rate = deposit_received / proposal_sent * 100
  Best performing niche: GROUP BY business_type, rank by close_rate
  Log summary to morning brief note field
```

---

### WORKFLOW 28: Marine Prospect Research
**Trigger:** Schedule — Mon–Fri 6am + Real-time weather trigger

```
NODE 1: Martin County permit API
  permit_type: dock, seawall, marine, boat_lift
  date range: 3–7 years ago (renewal window)

NODE 2: Palm Beach County permit API (same structure)

NODE 3: Score WITHOUT AI (pure data):
  base = 5
  dock/seawall permit: +2
  permit 3–5 years ago: +2 | 5–7 years: +1
  commercial property: +1
  property_value > 500k: +1

NODE 4: Google Maps API — waterfront HOA + marina search
  Radius: 25 miles from Stuart + WPB centers

NODE 5: Haiku score (only for Google Maps results, not permits)
  System: [system_prompts: 'score_marine_prospect']
  Batch up to 10 per call | Max tokens: 100 each

NODE 6: INSERT marine_leads WHERE score >= 7 AND not duplicate

WEATHER TRIGGER (runs continuously):
  Tomorrow.io API: windSpeed > 45mph OR precipitationIntensity > 2in
  IF threshold: immediately trigger Workflow 29 storm batch (no cap)

→ wig_daily_metrics: marine_leads_found + count
```

---

### WORKFLOW 29: Marine First Contact Outreach
**Trigger:** Daily 8am + Storm trigger from W28

```
Pull marine_leads WHERE lead_score >= 7 AND outreach_sent = false
LIMIT 20 (unlimited for storm trigger)

FOR each:
  Sonnet call
  System: [system_prompts: 'write_marine_first_contact']
  User: property, type, market, source, permit date, project context
  Max tokens: 400

  Gmail send from marine coordinator alias
  UPDATE: outreach_sent = true
  → wig_daily_metrics: marine_leads_found + 1

FOLLOW-UPS:
  48hrs → follow-up 1 (template)
  7 days → follow-up 2 (shorter template)
  14 days → status = 'dead'
```

---

### WORKFLOW 30: Marine Qualification Intake
**Trigger:** Marine qualification form webhook

```
Auto-disqualify:
  budget < $10k → decline → STOP
  location outside Martin + Palm Beach → decline → STOP
  no phone → request → 24hr wait → STOP

Score:
  budget $40k–100k: +2 | $100k+: +3
  timeline ASAP: +2 | commercial: +1 | HOA: +2

nurture_track:
  ASAP/3mo + score >= 7 → 'priority'
  6 months → 'standard'
  planning → 'slow'

INSERT marine_qualified_leads
Gmail: notify caller immediately → Trigger W31
→ wig_daily_metrics: marine_qualified + 1
```

---

### WORKFLOW 31: Marine Caller Packet Generation
**Trigger:** W30 | Hourly check for priority queue

```
Pull marine_qualified_leads WHERE caller_packet_sent = false
  AND nurture_track IN ('priority', 'standard')
ORDER BY lead_score DESC

FOR each:
  Pull current marine_pricing from Supabase

  Sonnet call (highest-value marine AI call)
  System: [system_prompts: 'write_marine_caller_packet']
  User: contact, phone, property, project_type, budget, timeline,
        scope_notes, market, top 5 pricing items, lead_score
  Max tokens: 600

  UPDATE: caller_packet_sent = true
  INSERT to caller dashboard (priority order by lead_score)

Caller logs outcome via form:
  appointment_booked | voicemail_left | callback_requested | not_interested
  → Webhook updates call_outcome
  IF appointment_booked → Trigger W32
```

---

### WORKFLOW 32: Marine Appointment → Matt Briefed
**Trigger:** Calendly booking webhook (Matt's calendar)

```
Match to marine_qualified_leads by email/phone
UPDATE: appointment_booked = true, appointment_date = [time]

Gmail → client: confirmation template
  "Matt will be at [address] on [date/time]."

Haiku call — pre-visit brief for Matt
  User: lead details, current pricing, scope context, bid target range
  Max tokens: 300

Write brief to matt_site_briefs table
→ wig_daily_metrics: marine_appointments + 1
```

---

### WORKFLOW 33: Marine Bid Generation → Fred Approval
**Trigger:** Matt submits site visit notes via form webhook

```
Receive Matt's 4–5 bullet points + lead_id

Pull marine_pricing from Supabase

Code node — pricing table (pure math, no AI):
  Parse notes for quantities
  Apply pricing: materials + labor + permits + 18% margin
  = total bid amount

Pull insurance options matching project type + scope range

Sonnet call — narrative only (not numbers)
System: [system_prompts: 'write_marine_bid']
User: site notes, project type, market, client name
Max tokens: 800

Assemble: narrative (Sonnet) + pricing table (math) + insurance options

UPDATE marine_qualified_leads: bid_generated = true, bid_amount = total
INSERT to fred_approval_queue

Gmail → Fred: "New bid ready: [Client] — $[total]"
```

---

### WORKFLOW 34: Fred Approval → Bid Submission + Deposit
**Trigger:** Fred clicks approve (webhook)

```
Receive: bid_id, fred_approved = true, insurance_selected

UPDATE marine_qualified_leads: fred_approved = true

Generate final bid PDF (Code node + PDF library)
  Include Fred's license number + selected insurance

Stripe API — create payment link
  Amount: bid_amount * 0.25 (25% deposit)

Gmail → client: bid PDF + Stripe deposit link
  "To secure your project start date: [DEPOSIT BUTTON]"

DEPOSIT RECEIVED (Stripe webhook):
  INSERT marine_projects
  Gmail → client: kickoff confirmation (template)
  Gmail → Bishop: "[Client] $[deposit] received. Balance: $[amount]."

FOLLOW-UP if no deposit:
  48hrs → one follow-up template
  7 days → status = 'lost'
```

---

## PART 3: BUILD ORDER FOR CALVIN

**Day 1 — Database (2 hours)**
1. Create Supabase project
2. Run SQL Scripts 1–5 in order
3. Verify all tables created
4. Add all email template copy to `email_templates` table (18+ rows)
5. Verify system_prompts seeded correctly

**Day 2 — Foundation workflows (3 hours)**
6. Workflow 12 (Morning Brief) — get Linda's eyes working first
7. Workflow 1 (Universal Purchase Intake) — test all 11 webhooks
8. Verify data flows into Supabase correctly

**Day 3 — Purchase sequences (3 hours)**
9. Workflows 2–8 (all brand sequences)
10. Workflow 9 (Institutional pipeline — test auto-quote at every tier)

**Day 4 — Intelligence layer (2 hours)**
11. Workflow 10 (Cross-sell router — test all ownership combinations)
12. Workflow 11 (Review engine)
13. Workflow 17 (Kill condition monitor)

**Day 5 — Web design workflows (2 hours)**
14. Workflows 21–27 (research → contact → qualify → nurture → proposal → deposit → health)

**Day 6 — Marine workflows (3 hours)**
15. Set up Tomorrow.io weather API
16. Workflows 28–34 (research → outreach → qualify → caller → appointment → bid → approval)

**Day 7 — Outreach + social (2 hours)**
17. Reddit API developer credentials
18. Workflows 13–16 (prospect research, outreach, institutional, response monitor)
19. Workflows 18–20 (social content, posting, funnel capture)

**Total: 7 days. System runs indefinitely after.**

---

## PART 4: WHAT EACH PERSON TOUCHES

**You (Bishop)**
- Morning brief: read daily, act on ACTION NEEDED items only
- Content approval: approve/reject social content before posting
- Storm events: confirm Linda's outreach blast went out
- Coaching candidates: decide when to deploy coaching offer

**Calvin**
- Days 1–7: build
- Weekly: update `marine_pricing` table with current supplier quotes
- Workflow errors: fix when flagged in brief

**Phone caller (marine)**
- Dashboard: caller queue sorted by priority
- Call, log outcome in 2 clicks
- Book into Matt's Calendly during the call

**Matt**
- Calendar: check daily, go to sites
- Post-visit: submit 4–5 bullet notes via form
- Receives pre-visit brief automatically before each appointment

**Fred**
- Dashboard: bids waiting approval
- Read bid, select insurance, click approve
- Receives deposit confirmation automatically

---

## PART 5: DAILY SYSTEM SCHEDULE

```
5:00am      W18 — Social content generated for Bishop review
6:00am      W12 — Morning brief assembled and sent
6:00am      W13 — Book/Skyforge prospect research
6:00am      W28 — Marine prospect research
7:00am      W21 — Web design prospect research
8:00am      W10 — Cross-sell router
8:00am      W15 (MWF) — Institutional outreach
9:00am      W11 — Review requests
9:00am      W14 — Book/Skyforge outreach DMs
9:00am      W22 — Web design outreach
9:00am      W29 — Marine outreach
Every 2hrs  W16 — Response monitor: Gmail + Reddit
Every 48hrs W17 — Kill conditions evaluated
Real-time   W1–W9, W23, W30 — Fire on purchase/form submission
Real-time   W28 (weather) — Storm threshold trigger
Real-time   W26, W34 — Fire on deposit received
```

---

## PART 6: API COST SUMMARY

| Call type | Model | Daily volume | Daily cost |
|---|---|---|---|
| Email sequences | Template | ~200 | $0.00 |
| Cross-sell routing | n8n logic | ~40 | $0.00 |
| WP/Marine disqualification | n8n logic | ~15 | $0.00 |
| Kill condition math | n8n math | ~6 | $0.00 |
| Lead scoring (books) | Haiku | ~30 | $0.03 |
| Lead scoring (marine Maps) | Haiku | ~10 | $0.01 |
| Matt pre-visit briefs | Haiku | ~3 | $0.01 |
| Kill condition notes | Haiku | ~2 | $0.002 |
| Book/Sky outreach DMs | Sonnet | ~15 | $0.12 |
| Marine first contact | Sonnet | ~10 | $0.10 |
| Marine caller scripts | Sonnet | ~5 | $0.08 |
| WP first contact | Sonnet | ~10 | $0.10 |
| WP proposals | Sonnet | ~1 | $0.02 |
| Marine bid narrative | Sonnet | ~0.5 | $0.01 |
| Institutional outreach | Sonnet | ~8 (MWF) | $0.10 |
| Morning brief | Sonnet × 1 | 1 | $0.02 |
| Social content | Sonnet × 1 | 1 | $0.02 |
| **TOTAL DAILY** | | | **~$0.66** |
| **TOTAL MONTHLY** | | | **~$20** |
