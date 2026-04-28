-- Respondfall Initial Schema
-- Run this in Supabase SQL Editor or via: npx supabase db push

-- Agency owners (one per Supabase auth user)
CREATE TABLE agency_owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  email text,
  plan text DEFAULT 'partner',
  created_at timestamptz DEFAULT now()
);

-- Client businesses managed by agency owners
CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_owner_id uuid REFERENCES agency_owners(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  industry text DEFAULT 'general',
  avg_job_value integer DEFAULT 300,
  business_phone text,
  respondfall_number text,
  twilio_number_sid text,
  booking_link text,
  google_review_link text,
  send_delay_seconds integer DEFAULT 5,
  blackout_start integer DEFAULT 22,
  blackout_end integer DEFAULT 7,
  sms_template text DEFAULT 'Hey, {business_name} here — sorry we missed you! Book here: {booking_link}. Reply STOP.',
  system_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Every inbound missed call event
CREATE TABLE missed_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  caller_number text NOT NULL,
  call_sid text,
  voicemail_url text,
  sequence_triggered boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Every SMS sent or received
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  caller_number text NOT NULL,
  direction text CHECK (direction IN ('outbound', 'inbound')),
  body text NOT NULL,
  twilio_message_sid text,
  sequence_step integer,
  message_type text DEFAULT 'sequence',
  ai_generated boolean DEFAULT false,
  status text DEFAULT 'sent',
  created_at timestamptz DEFAULT now()
);

-- Conversation threads (one per caller_number per client)
CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  caller_number text NOT NULL,
  status text DEFAULT 'active',
  intent text,
  opted_out boolean DEFAULT false,
  sequence_paused boolean DEFAULT false,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(client_id, caller_number)
);

-- Opt-outs (TCPA compliance)
CREATE TABLE opt_outs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(client_id, phone_number)
);

-- Referrals
CREATE TABLE referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  referrer_number text,
  referred_name text,
  referral_code text UNIQUE DEFAULT 'REF-' || upper(substring(gen_random_uuid()::text, 1, 6)),
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE agency_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE missed_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE opt_outs ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "agency_owners_self" ON agency_owners
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "clients_owner" ON clients
  FOR ALL USING (
    agency_owner_id IN (
      SELECT id FROM agency_owners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "missed_calls_owner" ON missed_calls
  FOR ALL USING (
    client_id IN (
      SELECT c.id FROM clients c
      JOIN agency_owners ao ON ao.id = c.agency_owner_id
      WHERE ao.user_id = auth.uid()
    )
  );

CREATE POLICY "messages_owner" ON messages
  FOR ALL USING (
    client_id IN (
      SELECT c.id FROM clients c
      JOIN agency_owners ao ON ao.id = c.agency_owner_id
      WHERE ao.user_id = auth.uid()
    )
  );

CREATE POLICY "conversations_owner" ON conversations
  FOR ALL USING (
    client_id IN (
      SELECT c.id FROM clients c
      JOIN agency_owners ao ON ao.id = c.agency_owner_id
      WHERE ao.user_id = auth.uid()
    )
  );

CREATE POLICY "opt_outs_owner" ON opt_outs
  FOR ALL USING (
    client_id IN (
      SELECT c.id FROM clients c
      JOIN agency_owners ao ON ao.id = c.agency_owner_id
      WHERE ao.user_id = auth.uid()
    )
  );

CREATE POLICY "referrals_owner" ON referrals
  FOR ALL USING (
    client_id IN (
      SELECT c.id FROM clients c
      JOIN agency_owners ao ON ao.id = c.agency_owner_id
      WHERE ao.user_id = auth.uid()
    )
  );

-- Trigger: auto-create agency_owner row on new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO agency_owners (user_id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Enable Realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE missed_calls;
