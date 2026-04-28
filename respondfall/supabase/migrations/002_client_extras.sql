-- ============================================================
-- Respondfall — Migration 002: client extras
-- ============================================================

-- Notification preferences stored as JSONB on the client row
alter table public.clients
  add column if not exists notification_prefs jsonb not null
  default '{"missed_call_alerts":true,"inbound_reply_alerts":true,"weekly_report":false}'::jsonb;

-- Allow scheduling follow-up messages (Step 2 SMS sequence)
alter table public.messages
  add column if not exists scheduled_at timestamptz;

create index if not exists messages_scheduled_idx
  on public.messages (scheduled_at)
  where scheduled_at is not null and status = 'scheduled';
