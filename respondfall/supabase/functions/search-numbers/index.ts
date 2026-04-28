// Edge function — search available Twilio numbers by area code
// All Twilio credentials read from server env only; never exposed to frontend.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders, preflight, json, err } from '../_shared/cors.ts'

interface AvailableNumber {
  phoneNumber: string
  friendlyName: string
  locality: string | null
  region: string | null
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return preflight()

  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const authToken  = Deno.env.get('TWILIO_AUTH_TOKEN')

  if (!accountSid || !authToken) {
    return err('Twilio credentials not configured', 500)
  }

  let areaCode = ''
  try {
    const body = await req.json()
    areaCode = String(body.areaCode ?? '').replace(/\D/g, '').slice(0, 3)
  } catch {
    return err('Invalid request body')
  }

  if (!areaCode || areaCode.length !== 3) {
    return err('areaCode must be a 3-digit US area code')
  }

  const url = new URL(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/AvailablePhoneNumbers/US/Local.json`,
  )
  url.searchParams.set('AreaCode', areaCode)
  url.searchParams.set('Limit', '10')
  url.searchParams.set('VoiceEnabled', 'true')
  url.searchParams.set('SmsEnabled', 'true')

  const twilioRes = await fetch(url.toString(), {
    headers: {
      Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
    },
  })

  if (!twilioRes.ok) {
    const text = await twilioRes.text()
    console.error('Twilio error:', text)
    return err('Failed to fetch available numbers from Twilio', 502)
  }

  const data = await twilioRes.json()
  const numbers: AvailableNumber[] = (data.available_phone_numbers ?? []).map(
    (n: Record<string, string>) => ({
      phoneNumber:  n.phone_number,
      friendlyName: n.friendly_name,
      locality:     n.locality ?? null,
      region:       n.region ?? null,
    }),
  )

  return json({ numbers })
})
