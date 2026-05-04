# SYSTEM BOUNDARIES
## Separation of concerns: VANTARA (private) vs linda-wig (shared)

---

## BELONGS IN VANTARA (Calvin-only, private repo)

- MAVIS core logic, memory, decision engine
- Calvin's personal AI routing and context
- MAVIS_SHARDs and MAVIS_MEMORY_PACKETs
- Any agent that has access to Calvin's private context
- MAVIS webhook URL and API key
- Calvin's personal financial data, investment logic, private decisions

**VANTARA is never referenced in this repo except via the external API contract in `docs/MAVIS_API_CONTRACT.md`.**

---

## BELONGS IN LINDA-WIG (shared execution layer)

- All 17 LINDA n8n workflows
- OpenClaw routing layer and pseudocode
- n8n workflow definitions and specs
- Telegram command interface and routing logic
- Supabase tables: `wig_customers`, `skyforge_customers`, `itg_institutional_leads`, `wig_daily_metrics`, `linda_outreach_prospects`, `linda_content_queue`, `linda_institutional_targets`
- LOCKE, PANTHEON, NAVI, RESPONDFALL, ATLAS agent docs
- All Gumroad webhook handlers (12 products)
- Pantheon feed, sessions, subscriber management
- WIG, SkyforgeAI, BIONEER revenue automation

---

## PROHIBITED IN THIS REPO

- No MAVIS logic implemented locally
- No duplication of VANTARA systems
- No Chris-accessible path to MAVIS (direct or indirect)
- No hardcoded API keys, chat IDs, or secrets anywhere in source files
- No MAVIS webhook URL or MAVIS API key
- No Calvin's private context or personal financial data

---

## EXTERNAL API BOUNDARY

MAVIS is called only via the contract defined in `docs/MAVIS_API_CONTRACT.md`:
- Endpoint: `<MAVIS_WEBHOOK_URL>` (stored in n8n credentials only)
- Auth: `Bearer <MAVIS_API_KEY>` (stored in n8n credentials only)
- Caller: only `/linda/route` in server.js, only when `telegram_user_id` matches Calvin
- No other file or workflow in this repo may call MAVIS

---

## CHRIS'S BOUNDARIES

Chris's available agents: LINDA, RESPONDFALL, ATLAS

Chris does NOT have access to:
- MAVIS (any path — direct, indirect, via LINDA, via any workflow)
- Calvin's personal context
- VANTARA systems
- Pantheon admin controls (unless explicitly granted by Calvin via `/admin/grant-access`)

---

## SECRET STORAGE HIERARCHY

| Secret type | Where it lives |
|---|---|
| API keys (Anthropic, Stripe, etc.) | Railway environment variables |
| MAVIS webhook + key | n8n credentials only |
| Telegram chat IDs | n8n credentials only |
| Supabase service key | Railway environment variables |
| Vantara Supabase key | Railway environment variables |

Nothing sensitive is committed to this repo. `.env` is gitignored. `.env.example` has placeholders only.
