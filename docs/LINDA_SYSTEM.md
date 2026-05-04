# LINDA — System Document
## Primary Operational Agent — Revenue Automation & CRM

---

## PURPOSE

LINDA is the revenue automation and operational backbone of WIG, SkyforgeAI, and BIONEER. She runs continuously via n8n, handling everything from the moment a customer makes a purchase through the full lifecycle of cross-sells, reviews, and outreach. She is Calvin's and Chris's shared execution agent.

---

## RESPONSIBILITIES

- Purchase intake and routing across all 12 Gumroad webhooks
- Email sequences for all 8 product entry points
- Cross-sell routing across all brand combinations
- Individual outreach via Reddit and Twitter (WIG, SkyforgeAI, BIONEER targets)
- Institutional outreach for ITG bulk orders
- Response monitoring every 2 hours
- Kill condition monitoring and angle adjustment every 48 hours
- Morning revenue brief to Calvin at 6:00am daily
- Review collection engine
- CRM maintenance across `wig_customers` and `skyforge_customers` tables

---

## INPUT TYPES

- Gumroad purchase webhooks (real-time, all 12 products)
- Scheduled n8n triggers (daily, bi-daily, every 2 hours)
- Telegram commands from Calvin or Chris (via OpenClaw routing)
- Manual trigger from `/linda/chat` endpoint

---

## OUTPUT TYPES

- Automated emails (purchase delivery, sequences, cross-sells, reviews)
- Reddit and Twitter DMs (outreach)
- Institutional emails via Gmail
- Telegram morning brief to Calvin
- Supabase records (customers, prospects, metrics, institutional leads)
- Telegram escalation alerts (institutional responses, VIP flags, errors)

---

## EXAMPLE COMMANDS

```
"Send the morning brief early"
"How many cross-sells went out this week?"
"Flag [email] as VIP"
"Add institutional lead: [org name], [contact], [copies needed]"
"What's the current outreach conversion rate?"
```

---

## WHEN NOT TO USE LINDA

- MAVIS routing decisions → escalate to Calvin
- Calvin's private context or personal AI tasks → MAVIS
- Deep research or strategy → LOCKE
- Content creation for Pantheon feed → PANTHEON
- Any task requiring owner-level authority → escalate to Calvin via Telegram

---

## FULL OPERATIONAL SCOPE

LINDA manages revenue automation across three brands:

**WIG / Bishop Watkins:**
- The Inmate Traveler's Guide ($7.99 + institutional tiers)
- ITG Study Guide & Workbook ($4.99)
- Modern Lovefair ($17+)
- The Architecture Set — ITG + ML bundle ($37)

**SkyforgeAI:**
- 5 individual guides ($3.99 each)
- SkyforgeAI Mastery Collection bundle ($37)

**BIONEER (Calvin):**
- BIONEER ($16.99)

Maximum customer value: $82.97 (all products). From a $3.99 entry point — 20.8x automated.

Full workflow specifications: `docs/N8N_WORKFLOWS.md`
