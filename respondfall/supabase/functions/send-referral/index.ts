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
  const { conversation_id, referred_name } = await req.json()

  const { data: conv } = await supabase.from('conversations').select('*').eq('id', conversation_id).single()
  if (!conv) return new Response('Not found', { status: 404 })

  const { data: client } = await supabase.from('clients').select('*').eq('id', conv.client_id).single()
  if (!client) return new Response('Not found', { status: 404 })

  if (referred_name) {
    // Customer replied with a name — create referral and send code
    const { data: referral } = await supabase.from('referrals').insert({
      client_id: client.id,
      referrer_number: conv.caller_number,
      referred_name,
    }).select().single()

    const body = `Awesome, thanks! We'll reach out to ${referred_name}. Your unique referral code is ${referral?.referral_code ?? 'REF-XXXXXX'} — we'll let you know when they book.`
    const sid = await sendSMS(conv.caller_number, client.respondfall_number!, body)

    await supabase.from('messages').insert({
      client_id: client.id, caller_number: conv.caller_number, direction: 'outbound',
      body, twilio_message_sid: sid, message_type: 'referral', status: 'sent',
    })
  } else {
    // Initial referral ask
    const body = `Thanks for choosing ${client.business_name}! Know someone who could use our help? Reply with their name and we'll take care of the rest — you're helping them get great service.`
    const sid = await sendSMS(conv.caller_number, client.respondfall_number!, body)

    await supabase.from('messages').insert({
      client_id: client.id, caller_number: conv.caller_number, direction: 'outbound',
      body, twilio_message_sid: sid, message_type: 'referral', status: 'sent',
    })
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
})
