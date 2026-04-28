import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')!
const APP_URL = Deno.env.get('VITE_APP_URL') ?? Deno.env.get('APP_URL') ?? ''

serve(async (req) => {
  const { phoneNumber, clientId } = await req.json()
  const creds = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)
  const webhookUrl = `${APP_URL}/functions/v1/twilio-webhook`

  // Purchase the number
  const purchaseRes = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${creds}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        PhoneNumber: phoneNumber,
        VoiceUrl: webhookUrl,
        VoiceMethod: 'POST',
        StatusCallback: webhookUrl,
        StatusCallbackMethod: 'POST',
        SmsUrl: webhookUrl,
        SmsMethod: 'POST',
      }).toString(),
    }
  )

  if (!purchaseRes.ok) {
    const err = await purchaseRes.json()
    return new Response(JSON.stringify({ error: err.message ?? 'Purchase failed' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const purchased = await purchaseRes.json()

  // Save to client record
  await supabase
    .from('clients')
    .update({
      respondfall_number: purchased.phone_number,
      twilio_number_sid: purchased.sid,
    })
    .eq('id', clientId)

  return new Response(
    JSON.stringify({ phoneNumber: purchased.phone_number, sid: purchased.sid }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
