-- ============================================================
-- Respondfall — Initial Schema
-- ============================================================
-- All tables use UUIDs and have RLS enabled.
-- Frontend uses anon/user JWT; edge functions use service_role.
-- ============================================================

-- ----------------------------------------------------------------
-- 1. agency_owners
-- ----------------------------------------------------------------
create table if not exists public.agency_owners (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  name             text not null,
  email            text not null,
  plan             text not null default 'free',
  created_at       timestamptz not null default now(),

  constraint agency_owners_user_id_key unique (user_id),
  constraint agency_owners_email_key   unique (email)
);

alter table public.agency_owners enable row level security;

-- Owners can only see and edit their own row
create policy "agency_owners: select own"
  on public.agency_owners for select
  using (auth.uid() = user_id);

create policy "agency_owners: insert own"
  on public.agency_owners for insert
  with check (auth.uid() = user_id);

create policy "agency_owners: update own"
  on public.agency_owners for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- 2. clients
-- ----------------------------------------------------------------
create table if not exists public.clients (
  id                    uuid primary key default gen_random_uuid(),
  agency_owner_id       uuid not null references public.agency_owners (id) on delete cascade,
  business_name         text not null,
  industry              text,
  avg_job_value         numeric(10, 2),
  business_phone        text not null,
  respondfall_number    text,                   -- Twilio number shown to callers
  twilio_number_sid     text,                   -- SID for the provisioned Twilio number
  booking_link          text,
  google_review_link    text,
  send_delay_seconds    integer not null default 30,
  blackout_start        time,                   -- local time, e.g. 21:00
  blackout_end          time,                   -- local time, e.g. 08:00
  sms_template          text,                   -- optional custom template
  system_active         boolean not null default true,
  created_at            timestamptz not null default now()
);

alter table public.clients enable row level security;

-- Agency owner sees only their own clients
create policy "clients: select own"
  on public.clients for select
  using (
    agency_owner_id in (
      select id from public.agency_owners where user_id = auth.uid()
    )
  );

create policy "clients: insert own"
  on public.clients for insert
  with check (
    agency_owner_id in (
      select id from public.agency_owners where user_id = auth.uid()
    )
  );

create policy "clients: update own"
  on public.clients for update
  using (
    agency_owner_id in (
      select id from public.agency_owners where user_id = auth.uid()
    )
  )
  with check (
    agency_owner_id in (
      select id from public.agency_owners where user_id = auth.uid()
    )
  );

create policy "clients: delete own"
  on public.clients for delete
  using (
    agency_owner_id in (
      select id from public.agency_owners where user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------
-- 3. missed_calls
-- ----------------------------------------------------------------
create table if not exists public.missed_calls (
  id                  uuid primary key default gen_random_uuid(),
  client_id           uuid not null references public.clients (id) on delete cascade,
  caller_number       text not null,
  call_sid            text not null,
  voicemail_url       text,
  sequence_triggered  boolean not null default false,
  created_at          timestamptz not null default now(),

  constraint missed_calls_call_sid_key unique (call_sid)
);

alter table public.missed_calls enable row level security;

create policy "missed_calls: select via client ownership"
  on public.missed_calls for select
  using (
    client_id in (
      select c.id from public.clients c
      join public.agency_owners ao on ao.id = c.agency_owner_id
      where ao.user_id = auth.uid()
    )
  );

-- Writes are service_role only (edge functions)
-- No insert/update/delete policy for anon/authenticated intentionally.

-- ----------------------------------------------------------------
-- 4. messages
-- ----------------------------------------------------------------
create table if not exists public.messages (
  id                  uuid primary key default gen_random_uuid(),
  client_id           uuid not null references public.clients (id) on delete cascade,
  caller_number       text not null,
  direction           text not null check (direction in ('inbound', 'outbound')),
  body                text not null,
  twilio_message_sid  text,
  sequence_step       integer,                  -- null = AI reply, 1/2/3 = sequence
  message_type        text not null default 'sms', -- sms | review_request | referral
  ai_generated        boolean not null default false,
  status              text not null default 'sent', -- sent | delivered | failed | received
  created_at          timestamptz not null default now()
);

create index messages_client_caller_idx on public.messages (client_id, caller_number, created_at desc);
create index messages_created_at_idx    on public.messages (created_at desc);

alter table public.messages enable row level security;

create policy "messages: select via client ownership"
  on public.messages for select
  using (
    client_id in (
      select c.id from public.clients c
      join public.agency_owners ao on ao.id = c.agency_owner_id
      where ao.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------
-- 5. conversations
-- ----------------------------------------------------------------
create table if not exists public.conversations (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references public.clients (id) on delete cascade,
  caller_number    text not null,
  status           text not null default 'open', -- open | booked | closed | opted_out
  intent           text,                          -- AI-detected intent label
  opted_out        boolean not null default false,
  sequence_paused  boolean not null default false,
  last_message_at  timestamptz not null default now(),
  created_at       timestamptz not null default now(),

  constraint conversations_client_caller_key unique (client_id, caller_number)
);

create index conversations_client_status_idx on public.conversations (client_id, status);
create index conversations_last_message_idx  on public.conversations (last_message_at desc);

alter table public.conversations enable row level security;

create policy "conversations: select via client ownership"
  on public.conversations for select
  using (
    client_id in (
      select c.id from public.clients c
      join public.agency_owners ao on ao.id = c.agency_owner_id
      where ao.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------
-- 6. opt_outs
-- ----------------------------------------------------------------
create table if not exists public.opt_outs (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients (id) on delete cascade,
  phone_number text not null,
  created_at   timestamptz not null default now(),

  constraint opt_outs_client_phone_key unique (client_id, phone_number)
);

alter table public.opt_outs enable row level security;

create policy "opt_outs: select via client ownership"
  on public.opt_outs for select
  using (
    client_id in (
      select c.id from public.clients c
      join public.agency_owners ao on ao.id = c.agency_owner_id
      where ao.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------
-- 7. referrals
-- ----------------------------------------------------------------
create table if not exists public.referrals (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references public.clients (id) on delete cascade,
  referrer_number  text not null,
  referred_name    text,
  referral_code    text not null,
  status           text not null default 'pending', -- pending | contacted | converted
  created_at       timestamptz not null default now(),

  constraint referrals_referral_code_key unique (referral_code)
);

create index referrals_client_idx on public.referrals (client_id);

alter table public.referrals enable row level security;

create policy "referrals: select via client ownership"
  on public.referrals for select
  using (
    client_id in (
      select c.id from public.clients c
      join public.agency_owners ao on ao.id = c.agency_owner_id
      where ao.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------
-- Realtime — enable publications for live inbox/activity
-- ----------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.missed_calls;
