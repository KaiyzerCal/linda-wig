# Respondfall — n8n Workflows

These six workflow JSON files replace all seven Supabase Edge Functions. Import them into your n8n instance in the order listed below.

---

## Import Order

| File | Workflow | Trigger |
|---|---|---|
| `01-twilio-inbound.json` | Twilio Inbound | Webhook (POST) |
| `02-step-two-scheduler.json` | Step Two Scheduler | Schedule — every 5 min |
| `03-review-request.json` | Send Review Request | Webhook (POST) |
| `04-send-inbox-reply.json` | Send Inbox Reply | Webhook (POST) |
| `05-number-search.json` | Number Search | Webhook (POST) |
| `06-provision-number.json` | Provision Number | Webhook (POST) |

**Import:** n8n → Workflows → Import from File → select each JSON.

---

## Credential Setup

Create one credential in n8n → Credentials → New:

**Type:** HTTP Basic Auth  
**Name:** `Respondfall Twilio Basic Auth`  
**Username:** your Twilio Account SID  
**Password:** your Twilio Auth Token  

This credential is shared by all six workflows.

---

## Environment Variables

Add these in n8n → Settings → Variables. All use the `RESPONDFALL_` prefix to isolate from any other workflows (e.g. Linda) running in the same n8n instance.

| Variable | Value |
|---|---|
| `RESPONDFALL_SUPABASE_URL` | `https://your-project.supabase.co` |
| `RESPONDFALL_SUPABASE_SERVICE_KEY` | Service role key from Supabase Dashboard → API |
| `RESPONDFALL_TWILIO_ACCOUNT_SID` | Twilio Console → Account Info |
| `RESPONDFALL_TWILIO_AUTH_TOKEN` | Twilio Console → Account Info |
| `RESPONDFALL_ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |

---

## After Import — Required Edits

Two hard-coded URLs in the JSON files need to be updated to your actual n8n instance URL before activating:

### `01-twilio-inbound.json`
Search for `your-instance.app.n8n.cloud` and replace all occurrences with your actual n8n hostname. These appear in:
- The TwiML `<Dial>` action URL
- The `<Number>` statusCallback URL
- The `Handle Voice Call` node (TwiML string)

### `06-provision-number.json`
Same — replace `your-instance.app.n8n.cloud` in the Twilio VoiceUrl, StatusCallbackUrl, and SmsUrl fields.

The easiest way: open each workflow in n8n, find the Code/HTTP Request nodes, and update the URL strings.

---

## Webhook URLs (after activation)

Once each workflow is **Active**, copy the webhook URLs from the Webhook node trigger panel. You'll need:

| Purpose | Env var / Twilio setting |
|---|---|
| Twilio voice + SMS webhook | Set in Twilio Console on the provisioned number (or let `06-provision-number` set it automatically) |
| Frontend calls | Set `VITE_N8N_BASE_URL` in Vercel to the base of your webhook URLs (everything before `/respondfall/...`) |

---

## Workflow Summaries

### 01 — Twilio Inbound
Entry point for all Twilio traffic. Validates the HMAC-SHA1 Twilio signature, then branches:
- **Voice call**: Returns TwiML to forward the call to the business phone, with a StatusCallback so missed calls are detected.
- **Voice StatusCallback** (missed call): Checks system_active, dedup, opt-out, blackout window → sends Step 1 SMS immediately → schedules Step 2 in the `messages` table.
- **Inbound SMS**: Handles STOP (opt-out), referral name replies, and AI qualification via `claude-sonnet-4-6`. Notifies the agency owner if the lead asks a question.

### 02 — Step Two Scheduler
Runs every 5 minutes. Queries `messages` for `message_type=step2` rows where `scheduled_at` has passed and `twilio_sid` is null (not yet sent). Skips if the conversation has any inbound reply (lead already responded). Sends via Twilio and marks the row with the `twilio_sid`.

### 03 — Send Review Request
JWT-verified. Sends a Google Review SMS to the lead, closes the conversation (`status=review_sent`), and schedules a referral message 30 minutes later.

### 04 — Send Inbox Reply
JWT-verified. Verifies ownership chain (JWT → agency_owner → client → conversation), sends SMS via Twilio, inserts the message into Supabase.

### 05 — Number Search
Calls Twilio AvailablePhoneNumbers API filtered by area code and returns up to 10 results.

### 06 — Provision Number
Purchases a Twilio number, configures its Voice/SMS/StatusCallback URLs to point at Workflow 01, and updates the `clients` table with `respondfall_number` and `twilio_number_sid`.

---

## Supabase (unchanged)

Respondfall's Supabase project handles:
- Auth (email/magic link)
- RLS-protected database (7 tables)
- Realtime subscriptions (inbox, activity feed, TopBar unread badge)

The `supabase/migrations/` files still apply to your dedicated Respondfall Supabase project. n8n only replaces the automation layer — Supabase stays.
