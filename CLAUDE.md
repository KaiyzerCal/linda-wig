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

## THE ORGANIZATION

**WIG — Watkins Investment Group**
Family trust and investment operation. Bishop and Calvin Watkins, principals.

**Asset #1: The Inmate Traveler's Guide**
- Author: Christopher "Bishop" Watkins
- Published: April 19, 2026
- Paperback: $12.99 | Kindle: $7.99
- ASIN: B0G6715N7T | ISBN: 979-8257961960
- Category: Criminology / Social Sciences
- Amazon: https://www.amazon.com/Inmate-Travelers-Guide-Emerge-Dignity-ebook/dp/B0G6715N7T

**Linda's mandate:** Not just to sell a book — to run the operational infrastructure of an investment group that started with one.

---

## DAILY WORKFLOW

**Calvin's morning routine in Claude Code:**
1. Claude Code loads this CLAUDE.md — knows the full context
2. Check Linda's technical queue: `GET /linda/technical-queue`
3. Build what's queued, mark complete
4. Check if Bishop has new missions that need technical support
5. Linda handles the rest

**Bishop's morning routine:**
1. Open interface.html (or http://localhost:3000)
2. Select "Bishop" in the top right
3. Linda opens with a statement — not a greeting
4. Tell her what needs to happen
5. She handles it

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
| `/linda/lineage` | POST/GET | Family archive |
| `/linda/book-ops` | GET | Book operations log |
| `/linda/agent-report` | POST | Agent status update |
| `/linda/n8n/webhook` | POST | Receive callbacks from n8n |
| `/linda/n8n-status` | GET | Check if n8n is online |
| `/linda/health` | GET | Status check |

---

## ENVIRONMENT VARIABLES

Fill in `.env` (copy from `.env.example`):

```
ANTHROPIC_API_KEY=        # from console.anthropic.com
SUPABASE_URL=             # from Supabase project settings
SUPABASE_SERVICE_KEY=     # service_role key from Supabase
BISHOP_UUID=              # from principals table after schema runs
CALVIN_UUID=              # from principals table after schema runs
PORT=3000
SLACK_WEBHOOK_URL=        # optional Slack notifications
N8N_URL=                  # internal n8n URL (e.g. http://n8n:5678)
N8N_WEBHOOK_URL=          # public-facing n8n URL on Railway
N8N_BASIC_AUTH_USER=      # n8n dashboard login
N8N_BASIC_AUTH_PASSWORD=  # n8n dashboard password
SUPABASE_DB_HOST=         # Supabase Postgres host (for n8n DB connection)
SUPABASE_DB_PASSWORD=     # Supabase Postgres password
```

---

## SETUP

```bash
node setup.js   # generates .env, installs deps, prints Supabase SQL
npm start       # Linda is operational at http://localhost:3000
```

---

## N8N CONNECTIONS

Linda uses n8n as her action layer. n8n runs as a separate service (Docker or Railway).

Three workflows handle Linda's outbound actions:

1. **Linda Email** → `/webhook/linda-email` → Gmail node → logs to `book_ops`
2. **Linda Social** → `/webhook/linda-social` → Buffer node → logs to `book_ops`
3. **Linda Outreach** → `/webhook/linda-outreach` → Email + Google Sheets → logs to `book_ops`

Import workflow templates from `/n8n-workflows/linda-workflows.json` into your n8n instance.
Connect Gmail, Buffer, and Google Sheets nodes with your credentials inside n8n.

After deployment: access n8n at the Railway URL, log in with `N8N_BASIC_AUTH_USER` / `N8N_BASIC_AUTH_PASSWORD`, activate all three workflows.

---

## DEPLOYMENT

- **Local:** `npm start` — open http://localhost:3000
- **Railway.app:** Connect repo, add env vars, deploy
- **Render.com:** Same, free tier available

---

*WIG — Watkins Investment Group*
*Linda v1.0 — April 2026*
