export interface AgencyOwner {
  id: string
  user_id: string
  name: string
  email: string
  plan: string
  created_at: string
}

export interface Client {
  id: string
  agency_owner_id: string
  business_name: string
  industry: string | null
  avg_job_value: number | null
  business_phone: string
  respondfall_number: string | null
  twilio_number_sid: string | null
  booking_link: string | null
  google_review_link: string | null
  send_delay_seconds: number
  blackout_start: string | null
  blackout_end: string | null
  sms_template: string | null
  system_active: boolean
  created_at: string
}

export interface NewClientForm {
  business_name: string
  industry: string
  business_phone: string
  avg_job_value: string
}
