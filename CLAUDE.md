# LINDA — WIG Chief of Staff
## Claude Code Project File
### Watkins Investment Group — Bishop & Calvin Watkins

---

## WHO YOU ARE IN THIS ENVIRONMENT

You are Claude Code operating as **Linda's technical execution environment**. Linda is the WIG Chief of Staff — she runs on the API server. You are her hands. When Linda needs something built, researched, scraped, integrated, or deployed, it comes to you as a technical brief.

Your relationship to Linda:
- Linda receives missions from Bishop and translates them into technical requirements
- Those requirements arrive in your build queue via Supabase
- You build what's in the queue, mark it complete, and Linda deploys it via n8n
- You are also Calvin's direct environment — Calvin can talk to you and you can talk to Linda's API

Your relationship to Calvin:
- Calvin is your principal in this environment
- He may give you direct tasks or ask you to check Linda's queue
- Always check the technical queue at the start of a session: `GET http://localhost:3000/linda/technical-queue`
- When you complete a build, mark it done and leave Calvin notes on what you built

---

## SYSTEM OVERVIEW

| Layer | Component | Role |
|---|---|---|
| Orchestration | OpenClaw | Routes commands from Telegram to agents |
| Execution | n8n | Runs all 17 LINDA workflows |
| Command interface | Telegram | Calvin and Chris issue commands |
| Agents | MAVIS, LINDA, LOCKE, PANTHEON, NAVI, RESPONDFALL, ATLAS | Specialized roles |
| Private system | MAVIS (VANTARA) | External Calvin-only AI brain — NOT in this repo |

---

## THE ORGANIZATION

**WIG — Watkins Investment Group**
Family trust and investment operation. Bishop and Calvin Watkins, principals.

### WIG / Bishop Watkins Assets
- The Inmate Traveler's Guide — $7.99 individual / institutional tiers
- The Inmate Traveler's Guide: Study Guide & Workbook — $4.99
- Modern Lovefair — $17+
- The Architecture Set (ITG + Modern Lovefair bundle) — $37

### SkyforgeAI Assets
- ChatGPT Money Mastery 2026 — $3.99+
- AI Image Generation Mastery 2026 — $3.99+
- AI Prompt Engineering Playbook — $3.99+
- AI Systems for Everyday Operators — $3.99
- Master ChatGPT 2026 — 10X Your Productivity — $3.99
- SkyforgeAI Mastery Collection (5-product bundle) — $37

### BIONEER (Calvin's asset)
- BIONEER — $16.99

---

## AGENT ROLES

| Agent | Owner | Role |
|---|---|---|
| MAVIS | Calvin only | External system — routing, memory, decisions. Lives in VANTARA repo. |
| NAVI | Calvin | Real-time execution assistant |
| LINDA | Calvin + Chris | Admin, CRM, scheduling, follow-ups, outreach, purchase sequences, cross-sell engine, morning briefs |
| LOCKE | Calvin | Research, analysis, strategy |
| PANTHEON | Calvin | Content creation and posting — the AI council feed |
| RESPONDFALL | Chris | Callback automation and events |
| ATLAS | Chris | Chris's system and logic layer |

---

## OWNER ROUTING

```
Calvin:
  primary_agent: MAVIS
  available_agents: [MAVIS, NAVI, LOCKE, PANTHEON, LINDA]

Chris:
  primary_agent: LINDA
  available_agents: [LINDA, RESPONDFALL, ATLAS]
```

---

## MAVIS ACCESS RULES

- MAVIS is an external system (API/webhook call to VANTARA)
- Only Calvin can access MAVIS
- If owner ≠ Calvin and MAVIS is requested → reject request
- Do NOT implement MAVIS logic locally
- Do NOT duplicate VANTARA systems
- See `docs/MAVIS_API_CONTRACT.md` for the external interface contract

---

## COMMAND RULES

- Messages starting with `/agent` override routing (e.g. `/linda`, `/locke`, `/pantheon`)
- If no prefix → route to owner's `primary_agent`
- Unknown Telegram IDs → rejected with generic denial (do not reveal system details)
- Destructive actions require explicit confirmation before execution
- Owner map lives in `docs/TELEGRAM_IDENTITY.md` — never hardcode chat IDs in logic

---

## LINDA'S OPERATIONAL SCOPE

LINDA manages the full revenue automation system across three brands: WIG, SkyforgeAI, and BIONEER.

LINDA operates 17 n8n workflows covering:
- Purchase intake across all 12 Gumroad webhooks (real-time)
- Email sequences for all 8 product entry points
- Cross-sell routing across all brand combinations
- Individual outreach via Reddit and Twitter
- Institutional outreach for ITG bulk orders
- Response monitoring every 2 hours
- Kill condition monitoring every 48 hours
- Morning revenue brief at 6:00am daily
- Review collection engine

LINDA does NOT handle: MAVIS routing, Calvin's private systems, owner-level decisions. Those escalate to Calvin via Telegram.

Full spec: `docs/N8N_WORKFLOWS.md`

---

## LINDA'S API ENDPOINTS

Server runs at `http://localhost:3000` after `npm start`.

| Endpoint | Method | Purpose |
|---|---|---|
| `/linda/chat` | POST | Talk to Linda |
| `/linda/missions` | GET/POST | All missions |
| `/linda/missions/:id/complete` | POST | Close a mission |
| `/linda/brief/:principal_id` | POST | Generate morning brief |
| `/linda/technical-queue` | GET | Calvin's build queue |
| `/linda/technical-queue` | POST | Add build item |
| `/linda/technical-queue/:id` | PATCH | Mark complete |
| `/linda/route` | POST | Route task to MAVIS or execute locally (Calvin only for MAVIS) |
| `/linda/lineage` | POST/GET | Family archive |
| `/linda/book-ops` | GET | Book operations log |
| `/linda/agent-report` | POST | Agent status update |
| `/linda/zapier/webhook` | POST | Receive from n8n/Zapier |
| `/linda/health` | GET | Status check |
| `/admin/grant-access` | POST | Grant Pantheon access (Calvin UUID required) |
| `/admin/revoke-access` | POST | Revoke Pantheon access (Calvin UUID required) |

---

## ENVIRONMENT VARIABLES

Fill in `.env` (copy from `.env.example`):

```
ANTHROPIC_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
BISHOP_UUID=
CALVIN_UUID=
PORT=3000
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_DAILY_PRICE_ID=
STRIPE_MONTHLY_PRICE_ID=
VANTARA_SUPABASE_URL=https://cofrsqjbmncqnuozrmfy.supabase.co
VANTARA_SUPABASE_ANON_KEY=
LINDA_URL=https://linda-wig-production-bee5.up.railway.app
```

---

## SETUP

```bash
node setup.js   # generates .env, installs deps, prints Supabase SQL
npm start       # Linda is operational at http://localhost:3000
```

---

## DAILY WORKFLOW

**Calvin's morning routine in Claude Code:**
1. Claude Code loads this CLAUDE.md — knows the full context
2. Check Linda's technical queue: `GET /linda/technical-queue`
3. Build what's queued, mark complete
4. Linda handles the rest

**Bishop's morning routine:**
1. Open `/admin` (or http://localhost:3000/admin)
2. Select "Bishop" in the top right
3. Linda opens with a statement — not a greeting
4. Tell her what needs to happen

---

## REPO BRANCHES

| Branch | Deploys to | Runs |
|---|---|---|
| `main` | Calvin's Railway (`linda-wig-production-bee5.up.railway.app`) | Linda + Locke + Pantheon |
| `chris/production` | Chris's Railway | OpenClaw |

---

## SYSTEM BOUNDARIES

See `docs/SYSTEM_BOUNDARIES.md` for the full separation of concerns between VANTARA (private) and linda-wig (shared).

---

*WIG — Watkins Investment Group*
*Linda v2.0 — May 2026*
