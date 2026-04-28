import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type AgencyOwner = {
  id: string
  user_id: string
  name: string | null
  email: string | null
  plan: string
  created_at: string
}

export type Client = {
  id: string
  agency_owner_id: string
  business_name: string
  industry: string
  avg_job_value: number
  business_phone: string | null
  respondfall_number: string | null
  twilio_number_sid: string | null
  booking_link: string | null
  google_review_link: string | null
  send_delay_seconds: number
  blackout_start: number
  blackout_end: number
  sms_template: string
  system_active: boolean
  created_at: string
}

export type MissedCall = {
  id: string
  client_id: string
  caller_number: string
  call_sid: string | null
  voicemail_url: string | null
  sequence_triggered: boolean
  created_at: string
}

export type Message = {
  id: string
  client_id: string
  caller_number: string
  direction: 'outbound' | 'inbound'
  body: string
  twilio_message_sid: string | null
  sequence_step: number | null
  message_type: string
  ai_generated: boolean
  status: string
  created_at: string
}

export type Conversation = {
  id: string
  client_id: string
  caller_number: string
  status: string
  intent: string | null
  opted_out: boolean
  sequence_paused: boolean
  last_message_at: string
  created_at: string
}

export type OptOut = {
  id: string
  client_id: string
  phone_number: string
  created_at: string
}

export type Referral = {
  id: string
  client_id: string
  referrer_number: string | null
  referred_name: string | null
  referral_code: string
  status: string
  created_at: string
}
