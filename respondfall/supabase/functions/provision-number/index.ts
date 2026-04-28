// Edge function — purchase a Twilio number and attach it to a client.
// Configures VoiceUrl, StatusCallback, and SmsUrl to point at twilio-webhook.
// All credentials from server env only.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, preflight, json, err } from '../_shared/cors.ts'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return preflight()

  const accountSid      = Deno.env.get('TWILIO_ACCOUNT_SID')
  const authToken       = Deno.env.get('TWILIO_AUTH_TOKEN')
  const supabaseUrl     = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!accountSid || !authToken || !supabaseUrl || !serviceRoleKey) {
    return err('Server environment not configured', 500)
  }

  let clientId = '', phoneNumber = ''
  try {
    const body = await req.json()
    clientId    = String(body.clientId ?? '')
    phoneNumber = String(body.phoneNumber ?? '')
  } catch {
    return err('Invalid request body')
  }

  if (!clientId || !phoneNumber) {
    return err('clientId and phoneNumber are required')
  }

  // Webhook base URL: supabase project functions root
  const webhookBase = `${supabaseUrl}/functions/v1/twilio-webhook`

  // Purchase the number
  const purchaseRes = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        PhoneNumber:    phoneNumber,
        VoiceUrl:       webhookBase,
        VoiceMethod:    'POST',
        // StatusCallback fires when a call ends — used for missed-call detection
        StatusCallback:       webhookBase,
        StatusCallbackMethod: 'POST',
        SmsUrl:    webhookBase,
        SmsMethod: 'POST',
      }).toString(),
    },
  )

  if (!purchaseRes.ok) {
    const text = await purchaseRes.text()
    console.error('Twilio purchase error:', text)
    return err('Failed to provision number with Twilio', 502)
  }

  const purchased = await purchaseRes.json()
  const sid: string = purchased.sid

  // Persist to clients table
  const db = createClient(supabaseUrl, serviceRoleKey)
  const { error: dbErr } = await db
    .from('clients')
    .update({
      respondfall_number: phoneNumber,
      twilio_number_sid:  sid,
    })
    .eq('id', clientId)

  if (dbErr) {
    console.error('DB update error:', dbErr.message)
    // Number purchased but DB failed — log the SID so it can be recovered
    return err(`Number provisioned (SID: ${sid}) but DB update failed: ${dbErr.message}`, 500)
  }

  return json({ success: true, phoneNumber, sid })
})
