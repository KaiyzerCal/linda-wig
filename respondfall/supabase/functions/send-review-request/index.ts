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

serve(async (req) => {
  const { conversation_id } = await req.json()

  const { data: conv } = await supabase.from('conversations').select('*').eq('id', conversation_id).single()
  if (!conv) return new Response('Not found', { status: 404 })

  const { data: client } = await supabase.from('clients').select('*').eq('id', conv.client_id).single()
  if (!client) return new Response('Not found', { status: 404 })

  // MVP: send immediately (defer 2-hour scheduling to v2)
  const reviewBody = `Thanks for choosing ${client.business_name}! If we did a great job today, a quick Google review means the world to us: ${client.google_review_link ?? '[review link]'} — only takes 30 seconds!`
  const sid = await sendSMS(conv.caller_number, client.respondfall_number!, reviewBody)

  await supabase.from('messages').insert({
    client_id: client.id, caller_number: conv.caller_number, direction: 'outbound',
    body: reviewBody, twilio_message_sid: sid, message_type: 'review_request', status: 'sent',
  })

  // Schedule referral 30 min after review (call send-referral edge function)
  // For MVP: trigger immediately after 30 min delay via another invocation
  const referralDelay = 30 * 60 * 1000
  setTimeout(async () => {
    await supabase.functions.invoke('send-referral', { body: { conversation_id } })
  }, referralDelay)

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
})
