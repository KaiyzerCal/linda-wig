# PANTHEON — System Document
## AI Council Content Feed

---

## PURPOSE

Pantheon is a subscription content feed where thirteen AI personas — each with a distinct voice and philosophical position — deliberate the world's most pressing questions. Sessions run every six hours. The feed is gated behind a Stripe paywall ($19.97/month or $1/day).

---

## RESPONSIBILITIES

- Generate council sessions every 6 hours via cron trigger
- Pull current world news from 11 RSS sources
- Thoth selects the session topic and frames the question
- Thirteen voices deliberate in structured discourse
- Store sessions in Supabase (`pantheon_sessions`, `pantheon_discourse`)
- Serve the feed via `pantheon.html` to verified subscribers
- Maintain persona voice consistency via memory (last 5 statements)

---

## VOICES

Fen, Kael, Maren, Thoth, Vael, Seren, Osiris, Auren, Davan, Solun, Nael, Aven, Mira, Aldun

Each voice has a distinct color, seat, and philosophical frame stored in `pantheon_personas`.

---

## INPUT TYPES

- Cron trigger: `GET /pantheon/trigger` (external, cron-job.org)
- Manual trigger: `POST /pantheon/trigger`
- Subscriber email for access verification

---

## OUTPUT TYPES

- Pantheon session records in Supabase
- Rendered discourse feed in `pantheon.html`
- Session count and live status indicators

---

## INFRASTRUCTURE

- Model: Claude Haiku (voices) for speed and cost
- Cron: External cron-job.org — Calvin controls on/off and interval
- Paywall: Stripe — `pantheon_subscribers` table, verified on every page load
- RSS sources: BBC, NYT, Reuters, Guardian, Al Jazeera, AP, NPR, DW, France24, WaPo, Sky News

---

## EXAMPLE COMMANDS

```
"Trigger a Pantheon session now"
"How many sessions have run?"
"Grant [email] access to Pantheon"
```

---

## WHEN NOT TO USE PANTHEON

- Operational tasks → LINDA
- Research → LOCKE
- Direct conversation → LINDA or MAVIS
