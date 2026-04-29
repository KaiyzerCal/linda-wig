# Respondfall — Deployment Guide

## Prerequisites

- [Supabase](https://supabase.com) account (free tier)
- [Twilio](https://twilio.com) account (trial is fine to start)
- [Anthropic](https://console.anthropic.com) API key
- [Vercel](https://vercel.com) account (free tier)
- [Supabase CLI](https://supabase.com/docs/guides/cli) installed

---

## Environment Variables

### Frontend (Vercel) — add in Vercel Dashboard → Project → Settings → Environment Variables

| Variable | Where to get it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API → `anon` `public` key |
| `VITE_APP_URL` | Your Vercel deployment URL, e.g. `https://respondfall.vercel.app` |

### Edge Functions (Supabase) — add via Supabase Dashboard → Edge Functions → Manage Secrets

| Variable | Where to get it | Exposure |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API → `service_role` key | **Server only — never expose to frontend** |
| `SUPABASE_ANON_KEY` | Same as `VITE_SUPABASE_ANON_KEY` above | Used by `send-inbox-reply` to verify JWT |
| `TWILIO_ACCOUNT_SID` | [Twilio Console](https://console.twilio.com) → Account Info | **Server only** |
| `TWILIO_AUTH_TOKEN` | Twilio Console → Account Info → Auth Token | **Server only** |
| `ANTHROPIC_API_KEY` | [Anthropic Console](https://console.anthropic.com) → API Keys | **Server only** |

> **Security rule:** Variables without `VITE_` prefix must **never** be set in Vercel or exposed to the browser. They live only in Supabase edge function secrets.

---

## Step-by-Step Deployment

### 1 — Supabase project

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login
supabase login

# Link to your project (get Project ID from Supabase Dashboard → Project Settings)
supabase link --project-ref YOUR_PROJECT_REF
```

### 2 — Run database migrations

```bash
supabase db push
```

This applies both migration files in order:
- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_client_extras.sql`

### 3 — Deploy edge functions

```bash
supabase functions deploy twilio-webhook
supabase functions deploy send-step-two
supabase functions deploy send-review-request
supabase functions deploy send-referral
supabase functions deploy search-numbers
supabase functions deploy provision-number
supabase functions deploy send-inbox-reply
```

### 4 — Set edge function secrets

In Supabase Dashboard → Edge Functions → Manage Secrets, add:

```
TWILIO_ACCOUNT_SID      = your_twilio_account_sid_here
TWILIO_AUTH_TOKEN       = your_twilio_auth_token_here
ANTHROPIC_API_KEY       = your_anthropic_api_key_here
SUPABASE_SERVICE_ROLE_KEY = your_supabase_service_role_key_here
SUPABASE_ANON_KEY       = your_supabase_anon_key_here
```

Or via CLI:
```bash
supabase secrets set TWILIO_ACCOUNT_SID=your_value
supabase secrets set TWILIO_AUTH_TOKEN=your_value
supabase secrets set ANTHROPIC_API_KEY=your_value
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_value
supabase secrets set SUPABASE_ANON_KEY=your_value
```

### 5 — Deploy to Vercel

```bash
# From the respondfall/ directory
vercel

# Or connect via GitHub:
# Vercel Dashboard → New Project → Import from GitHub
# Set Root Directory to: respondfall
```

Set these environment variables in Vercel Dashboard → Project → Settings → Environment Variables:
```
VITE_SUPABASE_URL     = https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY = your_anon_key
VITE_APP_URL           = https://your-app.vercel.app
```

### 6 — Schedule Step 2 SMS (pg_cron)

In Supabase Dashboard → SQL Editor, run:

```sql
-- Enable pg_cron extension (if not already enabled)
create extension if not exists pg_cron;

-- Schedule send-step-two every 5 minutes
select cron.schedule(
  'send-step-two',
  '*/5 * * * *',
  $$
  select net.http_post(
    url  := 'https://YOUR_PROJECT.supabase.co/functions/v1/send-step-two',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  )
  $$
);
```

Replace `YOUR_PROJECT` and `YOUR_SERVICE_ROLE_KEY` with your values.

---

## Final Checklist

- [ ] Supabase project created
- [ ] Database migrations pushed: `supabase db push`
- [ ] All 7 edge functions deployed
- [ ] Edge function secrets set (5 variables)
- [ ] Vercel project created and connected to GitHub repo
- [ ] Root directory set to `respondfall` in Vercel
- [ ] All 3 `VITE_` environment variables added in Vercel dashboard
- [ ] `VITE_APP_URL` set to your live Vercel URL
- [ ] `pg_cron` job created for `send-step-two`
- [ ] Auth email confirmation URL updated in Supabase → Auth → URL Configuration → Site URL → set to your Vercel URL
- [ ] Test: sign up → add a client → provision a Twilio number → dial the number from another phone → don't answer → confirm SMS arrives → reply → confirm AI response arrives in Inbox

---

## Twilio Webhook URL

When you provision a number through the Respondfall Settings tab, the webhook URL is set automatically to:

```
https://YOUR_PROJECT.supabase.co/functions/v1/twilio-webhook
```

If you need to set it manually in the Twilio console:
- Voice webhook (HTTP POST): above URL
- Status callback (HTTP POST): above URL
- SMS webhook (HTTP POST): above URL

---

## Local Development

```bash
# In respondfall/
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

npm install
npm run dev
# App available at http://localhost:5173
```

For edge functions locally:
```bash
supabase start          # starts local Supabase
supabase functions serve # serves edge functions locally
```
