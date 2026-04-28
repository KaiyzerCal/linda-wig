import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')!

serve(async (req) => {
  const { areaCode } = await req.json()
  const creds = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)

  const params = new URLSearchParams({ AreaCode: areaCode, Limit: '10' })
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/AvailablePhoneNumbers/US/Local.json?${params}`

  const res = await fetch(url, {
    headers: { 'Authorization': `Basic ${creds}` },
  })

  if (!res.ok) {
    return new Response(JSON.stringify({ error: 'Twilio API error', status: res.status }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const data = await res.json()
  const numbers = (data.available_phone_numbers ?? []).map((n: Record<string, unknown>) => ({
    phoneNumber: n.phone_number,
    friendlyName: n.friendly_name,
    locality: n.locality,
    region: n.region,
  }))

  return new Response(JSON.stringify({ numbers }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
