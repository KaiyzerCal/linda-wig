# N8N WORKFLOWS
## LINDA's Complete Operational Specification
## 17 Workflows — Full Detail

---

## SUPABASE — 7 TABLES

### Table 1: wig_customers
```
id                             (auto)
email                          (text, unique)
full_name                      (text)
source_brand                   (text)               — 'wig'|'skyforge_ai'|'bioneer'
source_asset                   (text)               — specific product that acquired them
source_channel                 (text)               — 'organic'|'linda_outreach'|'referral'
products_purchased             (text array)
total_spent                    (number)
customer_tier                  (text)               — 'entry'|'mid'|'high_value'|'vip'
active_sequence                (text)
funnel_stage                   (text)
email_1_sent_at                (timestamp)
email_2_sent_at                (timestamp)
email_3_sent_at                (timestamp)
email_4_sent_at                (timestamp)
email_5_sent_at                (timestamp)
cross_sell_eligible            (boolean) default false
cross_sell_sent                (boolean) default false
skyforge_offered               (boolean) default false
skyforge_purchased             (boolean) default false
skyforge_bundle_offered        (boolean) default false
skyforge_bundle_purchased      (boolean) default false
bioneer_offered                (boolean) default false
bioneer_purchased              (boolean) default false
architecture_set_offered       (boolean) default false
architecture_set_purchased     (boolean) default false
review_requested               (boolean) default false
review_left                    (boolean) default false
coaching_interest              (boolean) default false
created_at                     (timestamp)
updated_at                     (timestamp)
```

### Table 2: itg_institutional_leads
```
id                             (auto)
org_name                       (text)
contact_name                   (text)
contact_email                  (text)
org_type                       (text)
copies_needed                  (number)
quoted_price                   (number)
quote_sent_at                  (timestamp)
follow_up_1_sent_at            (timestamp)
follow_up_2_sent_at            (timestamp)
referral_sent_at               (timestamp)
referred_by                    (text)
status                         (text)               — 'new'|'quoted'|'negotiating'|'closed'|'dead'
notes                          (text)
created_at                     (timestamp)
```

### Table 3: wig_daily_metrics
```
date                           (date, unique)
ml_sales                       (number)
ml_revenue                     (number)
itg_sales                      (number)
itg_revenue                    (number)
workbook_sales                 (number)
workbook_revenue               (number)
architecture_set_sales         (number)
architecture_set_revenue       (number)
skyforge_individual_sales      (number)
skyforge_individual_revenue    (number)
skyforge_bundle_sales          (number)
skyforge_bundle_revenue        (number)
bioneer_sales                  (number)
bioneer_revenue                (number)
institutional_revenue          (number)
total_revenue                  (number)
new_customers                  (number)
returning_customers            (number)
cross_sells_sent               (number)
cross_sells_converted          (number)
reviews_requested              (number)
outreach_sent                  (number)
outreach_responses             (number)
outreach_converted             (number)
prospects_identified           (number)
institutional_contacted        (number)
```

### Table 4: linda_outreach_prospects
```
id                             (auto)
platform                       (text)               — 'reddit'|'twitter'|'linkedin'|'email'
handle_or_url                  (text)
full_name                      (text)
target_asset                   (text)               — 'modern_lovefair'|'itg'|'bioneer'|
                                                       'skyforge_individual'|'skyforge_bundle'|
                                                       'architecture_set'
outreach_type                  (text)               — 'individual'|'institutional'
post_content                   (text)
message_sent                   (text)
sent_at                        (timestamp)
response_received              (boolean) default false
response_text                  (text)
response_at                    (timestamp)
follow_up_1_sent_at            (timestamp)
follow_up_2_sent_at            (timestamp)
converted                      (boolean) default false
converted_to                   (text)
kill_condition_hit             (boolean) default false
status                         (text)               — 'queued'|'sent'|'responded'|'converted'|'dead'
created_at                     (timestamp)
```

### Table 5: linda_content_queue
```
id                             (auto)
platform                       (text)
asset                          (text)
content_type                   (text)
content_body                   (text)
generated_at                   (timestamp)
status                         (text)
posted_at                      (timestamp)
engagement_score               (number)
```

### Table 6: linda_institutional_targets
```
id                             (auto)
org_name                       (text)
org_type                       (text)
contact_name                   (text)
contact_title                  (text)
contact_email                  (text)
linkedin_url                   (text)
location                       (text)
copies_estimate                (number)
outreach_1_sent_at             (timestamp)
outreach_2_sent_at             (timestamp)
outreach_3_sent_at             (timestamp)
response_received              (boolean) default false
response_text                  (text)
status                         (text)
source                         (text)
created_at                     (timestamp)
```

### Table 7: skyforge_customers
```
id                             (auto)
email                          (text, unique)
full_name                      (text)
products_purchased             (text array)
total_skyward_spent            (number)
entry_product                  (text)
bundle_purchased               (boolean) default false
email_1_sent_at                (timestamp)
email_2_sent_at                (timestamp)
email_3_sent_at                (timestamp)
upsell_email_sent_at           (timestamp)
bundle_offer_sent_at           (timestamp)
architecture_set_offer_sent_at (timestamp)
review_requested               (boolean) default false
created_at                     (timestamp)
updated_at                     (timestamp)
```

---

## GUMROAD WEBHOOKS — ALL 12 PRODUCTS

**WIG BRAND:**
```
/webhook/wig-ml-purchase              Modern Lovefair ($17+)
/webhook/wig-itg-purchase             ITG Individual ($7.99)
/webhook/wig-itg-workbook-purchase    ITG Workbook ($4.99)
/webhook/wig-bundle-purchase          The Architecture Set ($37)
/webhook/wig-itg-institutional        ITG Institutional inquiry form
```

**SKYFORGE AI BRAND:**
```
/webhook/skyforge-chatgpt-money       ChatGPT Money Mastery ($3.99+)
/webhook/skyforge-image-gen           AI Image Generation Mastery ($3.99+)
/webhook/skyforge-prompt-playbook     AI Prompt Engineering Playbook ($3.99+)
/webhook/skyforge-ai-systems          AI Systems for Everyday Operators ($3.99)
/webhook/skyforge-master-chatgpt      Master ChatGPT 2026 ($3.99)
/webhook/skyforge-bundle              SkyforgeAI Mastery Collection ($37)
```

**BIONEER:**
```
/webhook/wig-bioneer-purchase         BIONEER ($16.99)
```

All 12 point to the same n8n cloud instance. One database. One morning brief. Complete visibility across every brand.

---

## ALL 17 WORKFLOWS

---

### WORKFLOW 1: Universal Purchase Intake
**Trigger:** Any of the 12 product webhooks
**Runs:** Real-time on every purchase

```
Webhook fires (any product, any brand)
↓
Extract: email, full_name, product, price, timestamp, webhook_source
↓
Identify brand from webhook source:
  IF webhook starts with 'wig-'        → source_brand = 'wig'
  IF webhook starts with 'skyforge-'   → source_brand = 'skyforge_ai'
  IF webhook = 'wig-bioneer-purchase'  → source_brand = 'bioneer'
↓
Check wig_customers for existing email
  IF exists → UPDATE products_purchased, total_spent, updated_at
  IF new    → INSERT full record, set customer_tier = 'entry'
↓
IF source_brand = 'skyforge_ai':
  ALSO upsert into skyforge_customers table
↓
Trigger correct email sequence workflow based on product
↓
UPDATE wig_daily_metrics: increment sales + revenue for correct product
```

---

### WORKFLOW 2: Modern Lovefair Purchase Sequence
**Trigger:** Workflow 1 routes here on ML purchase

```
Email 1 (immediate): Delivery + welcome
Email 2 (Day 3):     Implementation prompt — first move
Email 3 (Day 7):     Architecture Set cross-sell ($37)
  IF architecture_set_purchased = true → skip, send BIONEER offer
Email 4 (Day 14):    SkyforgeAI Mastery Collection ($37)
  IF skyforge_bundle_purchased = true → skip
Email 5 (Day 21):    BIONEER ($16.99)
  IF bioneer_purchased = true → skip
↓
Each send: SET email_N_sent_at = now, UPDATE funnel_stage
```

---

### WORKFLOW 3: ITG Individual Purchase Sequence
**Trigger:** Workflow 1 routes here on ITG purchase

```
Email 1 (immediate): Delivery + welcome
Email 2 (Day 2):     Workbook cross-sell ($4.99)
  IF workbook already purchased → skip
Email 3 (Day 5):     Implementation encouragement
Email 4 (Day 7):     Architecture Set ($37)
  IF architecture_set_purchased = true → skip
Email 5 (Day 14):    SkyforgeAI Mastery Collection ($37)
Email 6 (Day 21):    BIONEER ($16.99)
↓
Each send: SET email_N_sent_at = now, UPDATE funnel_stage
```

---

### WORKFLOW 4: ITG Workbook Purchase Sequence
**Trigger:** Workflow 1 routes here on Workbook purchase

```
Email 1 (immediate): Delivery + how to use with ITG
  IF itg NOT in products_purchased → include ITG upsell link
Email 2 (Day 5):     Progress check
Email 3 (Day 10):    Architecture Set ($37)
Email 4 (Day 18):    SkyforgeAI Mastery Collection ($37)
```

---

### WORKFLOW 5: Architecture Set Purchase Sequence
**Trigger:** Workflow 1 routes here on Architecture Set purchase

```
Email 1 (immediate): Delivery + welcome — both books
Email 2 (Day 3):     Modern Lovefair activation prompt
Email 3 (Day 7):     SkyforgeAI Mastery Collection ($37)
  IF skyforge_bundle_purchased = true → skip, send BIONEER
Email 4 (Day 14):    BIONEER ($16.99)
Email 5 (Day 21):    VIP coaching flag check
  IF total_spent > $60 → SET coaching_interest = true, flag in brief
```

---

### WORKFLOW 6: SkyforgeAI Individual Product Sequence
**Trigger:** Workflow 1 routes here on any individual SkyforgeAI purchase

```
Email 1 (immediate): Delivery + quick wins
Email 2 (Day 2):     Specific use case for their product
Email 3 (Day 5):     SkyforgeAI Mastery Collection upsell ($37)
  "You have one. Here's what the full collection unlocks."
  IF bundle_purchased = true → skip
Email 4 (Day 10):    Modern Lovefair ($17) — operator's internal edge
  IF ml_purchased = true → skip
Email 5 (Day 18):    BIONEER ($16.99)
  IF bioneer_purchased = true → skip
↓
UPDATE skyforge_customers: email timestamps
UPDATE wig_customers: cross-reference flags
```

---

### WORKFLOW 7: SkyforgeAI Bundle Purchase Sequence
**Trigger:** Workflow 1 routes here on SkyforgeAI Mastery Collection purchase

```
Email 1 (immediate): Delivery + recommended start order
Email 2 (Day 3):     Deep dive on highest-value tool in collection
Email 3 (Day 7):     Modern Lovefair ($17)
  "You have the AI operator stack. This is the mindset layer."
Email 4 (Day 14):    Architecture Set ($37)
  IF architecture_set_purchased = true → skip
Email 5 (Day 21):    BIONEER ($16.99)
  IF bioneer_purchased = true → skip
Email 6 (Day 30):    VIP coaching flag
  IF total_spent > $60 → SET coaching_interest = true
```

---

### WORKFLOW 8: BIONEER Purchase Sequence
**Trigger:** Workflow 1 routes here on BIONEER purchase

```
Email 1 (immediate): Delivery + welcome
Email 2 (Day 3):     Modern Lovefair ($17) — performance meets philosophy
  IF ml_purchased = true → skip
Email 3 (Day 7):     SkyforgeAI Mastery Collection ($37)
  "You're optimizing your body. Here's how to 10x your output with AI."
  IF skyforge_bundle_purchased = true → skip
Email 4 (Day 14):    Architecture Set ($37)
  IF architecture_set_purchased = true → skip
```

---

### WORKFLOW 9: ITG Institutional Pipeline
**Trigger:** `/webhook/wig-itg-institutional` form submission

```
Extract: org_name, contact_name, contact_email, org_type, copies_needed
↓
INSERT into itg_institutional_leads, status = 'new'
↓
Calculate quoted_price:
  1-49 copies:   $6.99/copy
  50-199 copies: $5.99/copy
  200+ copies:   $4.99/copy
↓
Email 1 (immediate): Quote with pricing + bulk order instructions
SET quote_sent_at = now, status = 'quoted'
↓
Day 3 no response: Follow-up 1
SET follow_up_1_sent_at = now
↓
Day 7 no response: Follow-up 2 (final)
SET follow_up_2_sent_at = now
↓
Day 14 no response: SET status = 'dead'
↓
IF response received: Flag to Bishop via Telegram
  "Institutional lead responded: [org_name] — [copies_needed] copies"
  SET status = 'negotiating'
```

---

### WORKFLOW 10: Universal Cross-Sell Router
**Trigger:** Scheduled — daily at 8:00am

```
Query wig_customers WHERE:
  cross_sell_eligible = true
  AND cross_sell_sent = false
  AND created_at > 30 days ago

FOR each customer:
  Build ownership matrix from products_purchased array

  Determine next best offer:
    IF owns ITG but NOT architecture_set       → offer Architecture Set ($37)
    IF owns ML but NOT skyforge_bundle         → offer SkyforgeAI Collection ($37)
    IF owns any SkyforgeAI but NOT bundle      → offer SkyforgeAI Collection ($37)
    IF owns anything but NOT bioneer
       AND 14+ days since last purchase        → offer BIONEER ($16.99)
    IF total_spent > $60
       AND coaching_interest = false           → SET coaching_interest = true

  Send appropriate cross-sell email
  SET cross_sell_sent = true, cross_sell_eligible = false
  UPDATE wig_daily_metrics: cross_sells_sent + 1
```

---

### WORKFLOW 11: Review Engine
**Trigger:** Scheduled — daily at 9:00am

```
Query wig_customers WHERE:
  review_requested = false
  AND created_at < 14 days ago
  AND products_purchased array length >= 1

FOR each eligible customer:
  Identify primary product (first purchase)
  Send review request email with direct Gumroad review link
  SET review_requested = true
  UPDATE wig_daily_metrics: reviews_requested + 1
```

---

### WORKFLOW 12: Morning Brief
**Trigger:** Scheduled — daily at 6:00am

```
Pull from wig_daily_metrics WHERE date = yesterday:
  Revenue by brand (WIG, SkyforgeAI, BIONEER, institutional)
  Total revenue vs prior 7-day average
  New customers vs returning
  Cross-sells sent and converted
  Reviews requested

Pull from linda_outreach_prospects WHERE sent_at > yesterday:
  Outreach sent by asset
  Responses received
  Conversions

Pull from itg_institutional_leads WHERE status = 'negotiating':
  Active deals + last activity

Pull from wig_customers WHERE coaching_interest = true:
  Count of VIP candidates

Format and send to Calvin via Telegram:
  "LINDA MORNING BRIEF — [date]

  REVENUE YESTERDAY
  WIG: $[amount] ([N] sales)
  SkyforgeAI: $[amount] ([N] sales)
  BIONEER: $[amount] ([N] sales)
  Institutional: $[amount]
  TOTAL: $[amount]
  7-day avg: $[amount]

  OUTREACH
  Sent: [N] | Responses: [N] | Converted: [N]

  INSTITUTIONAL PIPELINE
  Active deals: [N] | Awaiting response: [N]

  VIP POOL: [N] candidates flagged for coaching

  ACTION ITEMS: [any kill conditions triggered, errors, escalations]"
```

---

### WORKFLOW 13: Prospect Research Engine
**Trigger:** Scheduled — daily at 6:00am

```
Run searches via Serper/Brave API:

WIG targets:
  Reddit: r/Divorce, r/relationship_advice, r/survivinginfidelity,
          r/Marriage, r/dating_advice
  Query terms: "moving on", "starting over", "self improvement after divorce",
               "rebuilding confidence", "ex wife", "ex husband"

SkyforgeAI targets:
  Reddit: r/ChatGPT, r/artificial, r/AItools, r/Entrepreneur,
          r/passive_income, r/sidehustle, r/freelance
  Query terms: "make money with AI", "AI side hustle", "ChatGPT for business",
               "automate my workflow", "AI tools for work"

BIONEER targets:
  Reddit: r/Fitness, r/loseit, r/bodybuilding, r/intermittentfasting
  Query terms: "plateau", "need a program", "what should I do for fitness",
               "struggling with consistency"

FOR each result:
  IF post < 48 hours old
  AND author not in linda_outreach_prospects
  AND post shows genuine need (not spam/bot):
    INSERT into linda_outreach_prospects
    SET status = 'queued', target_asset = best match
    UPDATE wig_daily_metrics: prospects_identified + 1
```

---

### WORKFLOW 14: Individual Outreach Execution
**Trigger:** Scheduled — daily at 9:00am

```
Query linda_outreach_prospects WHERE status = 'queued'
LIMIT 15 per run (rate limit protection)

FOR each prospect:
  Call Claude API with message template for their target_asset:

  --- WIG: Modern Lovefair ---
  SYSTEM: "You are Linda, outreach coordinator for WIG.
  Write a direct message based on their post. They are going through
  something emotionally. Rules: Under 75 words. Reference something
  specific from their post. Lead with where they are — not where they
  should be. One sentence on what Modern Lovefair provides. End with
  a question or the link. Never say: I came across your post, I noticed,
  certainly, absolutely."
  USER: "Their post: [post_content] / Handle: [handle] / Link: [gumroad link]"

  --- WIG: ITG ---
  SYSTEM: "You are Linda, outreach coordinator for WIG.
  Write a direct message to someone dealing with incarceration — theirs
  or a family member's. Rules: Under 75 words. No pity. Reference
  their specific situation. One line on what ITG provides. End with
  a question or the link. Never say: I came across, I noticed,
  certainly, absolutely."
  USER: "Their post: [post_content] / Handle: [handle] / Link: [gumroad link]"

  --- BIONEER ---
  SYSTEM: "You are Linda, outreach coordinator for BIONEER.
  Write a direct message to someone struggling with fitness or body
  composition. Rules: Under 75 words. Acknowledge where they are
  without judgment. One line on what BIONEER provides. End with a
  question or the link. Never say: I came across, I noticed,
  certainly, absolutely."
  USER: "Their post: [post_content] / Handle: [handle] / Link: [gumroad link]"

  --- SkyforgeAI Individual ---
  SYSTEM: "You are Linda, outreach coordinator for SkyforgeAI.
  Write a direct message to someone interested in using AI to make money,
  save time, or build systems. Rules: Under 75 words. Reference something
  specific from their post. Lead with where they are. One sentence on
  what the relevant SkyforgeAI guide provides. End with a question or
  the link. Sound like a person who actually uses these tools.
  Never say: I came across, I noticed, certainly, absolutely."
  USER: "Their post: [post_content] / Handle: [handle] /
         Product: [most relevant SkyforgeAI guide] / Price: $3.99 /
         Link: [specific product gumroad link]"

  --- SkyforgeAI Bundle ---
  SYSTEM: "You are Linda, outreach coordinator for SkyforgeAI.
  Write a direct message pitching the SkyforgeAI Mastery Collection —
  5 complete guides for using AI to build income, automate work, and
  operate professionally. Rules: Under 80 words. Their post signals
  they are serious about AI as a professional or income tool. Lead
  with the complete picture — one system, not five products. $37 for
  all five — position as the obvious move for someone already committed.
  End with the link."
  USER: "Their post: [post_content] / Handle: [handle] /
         Bundle: SkyforgeAI Mastery Collection — 5 guides /
         Price: $37 / Link: [bundle gumroad link]"

↓
Send via platform API (Reddit DM or Twitter DM)
SET status = 'sent', sent_at = now
UPDATE wig_daily_metrics: outreach_sent + 1

↓ 48 hours no response:  Send Follow-up 1
↓ 96 hours no response:  Send Follow-up 2 (final)
↓ 7 days no response:    SET status = 'dead'

IF response_received = true:
  SET status = 'responded'
  UPDATE wig_daily_metrics: outreach_responses + 1
  IF converted = true:
    SET status = 'converted'
    UPDATE wig_daily_metrics: outreach_converted + 1
```

---

### WORKFLOW 15: Institutional Outreach Engine
**Trigger:** Scheduled — Monday, Wednesday, Friday at 8:00am

```
Query linda_institutional_targets WHERE:
  status NOT IN ('closed', 'dead')
  AND outreach_3_sent_at IS NULL

FOR each target:
  Determine which outreach step is next
  Generate message via Claude API:
    SYSTEM: "You are Linda, outreach coordinator for WIG.
    Write an institutional outreach email to a [org_type].
    Professional, direct, under 120 words. ITG bulk pricing:
    1-49 copies: $6.99 | 50-199: $5.99 | 200+: $4.99.
    Reference the organization type specifically."

  Send via Gmail
  SET outreach_N_sent_at = now
  UPDATE wig_daily_metrics: institutional_contacted + 1

IF 3 touchpoints sent with no response: SET status = 'dead'
```

---

### WORKFLOW 16: Response Monitor
**Trigger:** Scheduled — every 2 hours

```
Check Gmail for replies to:
  Institutional outreach emails
  Any buyer reply to email sequences

Check Reddit DM inbox for:
  Replies to outreach messages

FOR each response found:
  Match to record in linda_outreach_prospects or itg_institutional_leads
  SET response_received = true, response_text, response_at = now
  UPDATE wig_daily_metrics: outreach_responses + 1

  IF institutional response:
    Send Telegram alert to Calvin:
      "Institutional response: [org_name] — [status]"
    SET itg_institutional_leads.status = 'negotiating'

  IF individual response shows purchase intent:
    SET converted = true
    UPDATE wig_daily_metrics: outreach_converted + 1
```

---

### WORKFLOW 17: Kill Condition Monitor
**Trigger:** Scheduled — every 48 hours

```
Calculate response rates per asset over last 7 days:
  ML outreach rate           = responses / sent
  ITG outreach rate
  BIONEER outreach rate
  SkyforgeAI individual rate
  SkyforgeAI bundle rate
  Institutional outreach rate

IF any rate < 5%:
  Auto-adjust message angle (rotate to alternate template)
  Log to morning brief: "[Asset] angle adjusted — rate below 5%"

IF any rate > 10%:
  Auto-scale volume +25% for that asset
  Log to morning brief: "[Asset] volume increased 25% — rate above 10%"

SkyforgeAI-specific logic:
  IF individual rate < 5% → switch primary pitch to bundle
    (higher perceived value, same audience)
  IF bundle rate < 5%     → switch to individual entry product
    (lower friction at $3.99)

VIP coaching threshold:
  Query wig_customers WHERE total_spent > $60
  IF count > 5:
    Send Telegram to Calvin:
      "VIP coaching pool ready: [N] candidates. Review recommended."
  SET coaching_interest = true for all qualifying customers
```

---

## ERROR HANDLER

All workflows route errors to a central Error_Handler:

```
Capture: workflow_name, error_type, error_message, timestamp, affected_record_id
INSERT into error_log table (create if not exists)
Send Telegram alert to Calvin:
  "LINDA ERROR — [workflow_name]: [error_message]"
Do NOT retry automatically — flag for manual review
```

---

## DAILY SCHEDULE

```
6:00am        W13 — Prospect research across all platforms + subreddits
6:00am        W12 — Morning brief sent to Calvin via Telegram
8:00am        W10 — Cross-sell router evaluates all eligible customers
8:00am        W15 (MWF) — Institutional outreach sent
9:00am        W14 — Individual outreach messages sent
9:00am        W11 — Review requests sent to eligible customers
Every 2h      W16 — Response monitor: Gmail + Reddit
Every 48h     W17 — Kill conditions evaluated, angles adjusted
Real-time     W1–W9 — Fire on every purchase across all 12 products
```

---

## CROSS-BRAND FUNNEL LOGIC

```
SkyforgeAI buyer at $3.99 is a warm lead for:
  SkyforgeAI Mastery Collection ($37) — Day 5
  Modern Lovefair ($17)               — Day 10
  The Architecture Set ($37)          — Day 14
  BIONEER ($16.99)                    — Day 18

WIG buyer at $7.99 is a warm lead for:
  Architecture Set ($37)              — Day 7
  SkyforgeAI Mastery Collection ($37) — Day 14
  BIONEER ($16.99)                    — Day 21

BIONEER buyer is a warm lead for:
  Modern Lovefair ($17)               — Day 3
  SkyforgeAI Mastery Collection ($37) — Day 7
  Architecture Set ($37)              — Day 14

Maximum value customer owns everything:
  $3.99 + $37 + $17 + $7.99 + $16.99 = $82.97
  From a $3.99 entry point — 20.8x the entry purchase
  Fully automated. Zero additional content needed.
```

---

## BUILD ORDER FOR CALVIN

**Day 1 — Foundation (2 hours)**
1. Supabase: all 7 tables
2. Workflow 12: Morning Brief
3. Workflow 1: Universal Purchase Intake — test all 12 webhooks

**Day 2 — WIG Purchase Sequences (3 hours)**
4. Workflow 2: Modern Lovefair sequence
5. Workflow 3: ITG Individual sequence
6. Workflow 4: ITG Workbook sequence
7. Workflow 5: Architecture Set sequence
8. Workflow 9: ITG Institutional pipeline

**Day 3 — SkyforgeAI Sequences (2 hours)**
9. Workflow 6: SkyforgeAI individual sequence
10. Workflow 7: SkyforgeAI bundle sequence
11. Workflow 8: BIONEER sequence

**Day 4 — Intelligence Layer (2 hours)**
12. Workflow 10: Universal Cross-Sell Router
13. Workflow 11: Review Engine
14. Activate both only after all sequences confirmed working

**Day 5 — Outreach Engine (3 hours)**
15. API credentials: Serper/Brave, Reddit API, Anthropic API key
16. Workflow 13: Prospect Research Engine
17. Workflow 14: Individual Outreach Execution
18. Workflow 15: Institutional Outreach Engine
19. Workflow 16: Response Monitor
20. Workflow 17: Kill Condition Monitor

**Total: 12 hours across 5 days. Runs indefinitely after.**
