import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')!

async function sendSMS(to: string, from: string, body: string): Promise<string | null> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`
  const creds = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
  })
  const data = await res.json()
  return data.sid ?? null
}

// This function is called ~30 minutes after Step 1 for each missed call
// Triggered by a Supabase pg_cron job or via POST with { client_id, caller_number }
serve(async (req) => {
  const { client_id, caller_number } = await req.json()

  const { data: client } = await supabase.from('clients').select('*').eq('id', client_id).single()
  if (!client || !client.system_active) return new Response('Skipped', { status: 200 })

  // Check opt-out
  const { data: optOut } = await supabase.from('opt_outs').select('id')
    .eq('client_id', client_id).eq('phone_number', caller_number).maybeSingle()
  if (optOut) return new Response('Opted out', { status: 200 })

  // Check if inbound reply received (sequence_paused)
  const { data: conv } = await supabase.from('conversations').select('*')
    .eq('client_id', client_id).eq('caller_number', caller_number).single()
  if (conv?.sequence_paused) return new Response('Paused', { status: 200 })

  // Check if Step 2 already sent
  const { data: existing } = await supabase.from('messages').select('id')
    .eq('client_id', client_id).eq('caller_number', caller_number)
    .eq('sequence_step', 2).maybeSingle()
  if (existing) return new Response('Already sent', { status: 200 })

  const body = `Hey, still hoping to connect — ${client.business_name} has availability this week. Book anytime: ${client.booking_link ?? ''}`
  const sid = await sendSMS(caller_number, client.respondfall_number!, body)

  await supabase.from('messages').insert({
    client_id, caller_number, direction: 'outbound', body,
    twilio_message_sid: sid, sequence_step: 2, message_type: 'sequence', status: 'sent',
  })

  return new Response('Sent', { status: 200 })
})
