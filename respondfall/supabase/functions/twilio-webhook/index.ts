import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.20.1'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')!

async function validateTwilioSignature(req: Request, rawBody: string): Promise<boolean> {
  const url = req.url
  const signature = req.headers.get('x-twilio-signature') ?? ''
  const params = new URLSearchParams(rawBody)
  const sortedKeys = [...params.keys()].sort()
  let data = url
  for (const key of sortedKeys) {
    data += key + (params.get(key) ?? '')
  }
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(TWILIO_AUTH_TOKEN), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)))
  return signature === expected
}

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

function isBlackout(hour: number, start: number, end: number): boolean {
  if (start > end) return hour >= start || hour < end
  return hour >= start && hour < end
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`)
}

async function handleMissedCall(params: URLSearchParams) {
  const callerNumber = params.get('From') ?? ''
  const respondfallNumber = params.get('To') ?? ''
  const callSid = params.get('CallSid') ?? ''

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('respondfall_number', respondfallNumber)
    .single()

  if (!client) return

  // Check opt-out
  const { data: optOut } = await supabase
    .from('opt_outs')
    .select('id')
    .eq('client_id', client.id)
    .eq('phone_number', callerNumber)
    .maybeSingle()

  if (optOut) return

  // Check blackout
  const currentHour = new Date().getHours()
  if (isBlackout(currentHour, client.blackout_start, client.blackout_end)) {
    await supabase.from('missed_calls').insert({
      client_id: client.id, caller_number: callerNumber, call_sid: callSid, sequence_triggered: false
    })
    return
  }

  // Insert missed call
  await supabase.from('missed_calls').insert({
    client_id: client.id, caller_number: callerNumber, call_sid: callSid, sequence_triggered: true
  })

  // Upsert conversation
  await supabase.from('conversations').upsert(
    { client_id: client.id, caller_number: callerNumber, last_message_at: new Date().toISOString() },
    { onConflict: 'client_id,caller_number', ignoreDuplicates: false }
  )

  if (!client.system_active) return

  // Wait send_delay_seconds
  await new Promise(r => setTimeout(r, (client.send_delay_seconds ?? 5) * 1000))

  const body = fillTemplate(client.sms_template, {
    business_name: client.business_name,
    booking_link: client.booking_link ?? '',
  })

  const msgSid = await sendSMS(callerNumber, respondfallNumber, body)

  await supabase.from('messages').insert({
    client_id: client.id,
    caller_number: callerNumber,
    direction: 'outbound',
    body,
    twilio_message_sid: msgSid,
    sequence_step: 1,
    message_type: 'sequence',
    status: 'sent',
  })
}

async function handleInboundSMS(params: URLSearchParams) {
  const callerNumber = params.get('From') ?? ''
  const respondfallNumber = params.get('To') ?? ''
  const messageBody = params.get('Body') ?? ''
  const msgSid = params.get('MessageSid') ?? ''

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('respondfall_number', respondfallNumber)
    .single()

  if (!client) return

  // Insert inbound message
  await supabase.from('messages').insert({
    client_id: client.id,
    caller_number: callerNumber,
    direction: 'inbound',
    body: messageBody,
    twilio_message_sid: msgSid,
    message_type: 'sequence',
    status: 'received',
  })

  // Check STOP
  const normalized = messageBody.trim().toUpperCase()
  if (['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'].includes(normalized)) {
    await supabase.from('opt_outs').upsert(
      { client_id: client.id, phone_number: callerNumber },
      { onConflict: 'client_id,phone_number' }
    )
    await supabase.from('conversations').update({ opted_out: true, sequence_paused: true })
      .eq('client_id', client.id).eq('caller_number', callerNumber)

    const reply = "You've been unsubscribed. Reply START to re-subscribe."
    const sid = await sendSMS(callerNumber, respondfallNumber, reply)
    await supabase.from('messages').insert({
      client_id: client.id, caller_number: callerNumber, direction: 'outbound',
      body: reply, twilio_message_sid: sid, message_type: 'sequence', status: 'sent',
    })
    return
  }

  // Re-subscribe
  if (['START', 'YES', 'UNSTOP'].includes(normalized)) {
    await supabase.from('opt_outs').delete().eq('client_id', client.id).eq('phone_number', callerNumber)
    await supabase.from('conversations').update({ opted_out: false }).eq('client_id', client.id).eq('caller_number', callerNumber)
    return
  }

  // Check opt-out
  const { data: optOut } = await supabase.from('opt_outs').select('id')
    .eq('client_id', client.id).eq('phone_number', callerNumber).maybeSingle()
  if (optOut) return

  // Get conversation
  const { data: conv } = await supabase.from('conversations').select('*')
    .eq('client_id', client.id).eq('caller_number', callerNumber).single()

  // Pause sequence on human reply
  if (conv && !conv.sequence_paused) {
    await supabase.from('conversations').update({ sequence_paused: true, last_message_at: new Date().toISOString() })
      .eq('id', conv.id)
  }

  if (!client.system_active) return

  let aiReply: string
  let intent: string | null = null

  try {
    if (!conv?.intent) {
      // Qualify intent
      const completion = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        messages: [{
          role: 'user',
          content: `System: You are a helpful assistant for ${client.business_name}, a ${client.industry} company.
A customer just replied to a missed call SMS. Categorize their intent as one of:
- "quote" (wants a price estimate)
- "service" (wants to book a service)
- "question" (has a general question)
Reply ONLY with JSON: {"intent": "quote"|"service"|"question", "reply": "<your SMS reply>"}
The reply should: acknowledge their message, ask one clarifying question, keep it under 160 chars.

Customer message: ${messageBody}`,
        }],
      })
      const text = (completion.content[0] as { text: string }).text.trim()
      const parsed = JSON.parse(text)
      intent = parsed.intent
      aiReply = parsed.reply
      await supabase.from('conversations').update({ intent }).eq('client_id', client.id).eq('caller_number', callerNumber)
    } else {
      // Contextual AI reply
      const completion = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `System: You are ${client.business_name}'s friendly AI assistant. Reply naturally to this customer SMS.
Be helpful, brief (under 160 chars), professional. If they want to book, include: ${client.booking_link ?? 'our booking link'}.

Customer message: ${messageBody}`,
        }],
      })
      aiReply = (completion.content[0] as { text: string }).text.trim()
    }
  } catch {
    aiReply = `Thanks for reaching out to ${client.business_name}! We'll get back to you shortly.`
  }

  const sid = await sendSMS(callerNumber, respondfallNumber, aiReply)
  await supabase.from('messages').insert({
    client_id: client.id, caller_number: callerNumber, direction: 'outbound',
    body: aiReply, twilio_message_sid: sid, message_type: 'ai_reply', ai_generated: true, status: 'sent',
  })
}

serve(async (req) => {
  const rawBody = await req.text()
  const params = new URLSearchParams(rawBody)

  // Validate Twilio signature (skip in dev if no auth token)
  if (TWILIO_AUTH_TOKEN) {
    const valid = await validateTwilioSignature(req, rawBody)
    if (!valid) return new Response('Unauthorized', { status: 403 })
  }

  const callStatus = params.get('CallStatus')
  const numMedia = params.get('NumMedia')

  if (callStatus && ['no-answer', 'busy', 'failed'].includes(callStatus)) {
    await handleMissedCall(params)
    return new Response('<?xml version="1.0"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' }
    })
  }

  if (numMedia !== null || params.get('Body')) {
    await handleInboundSMS(params)
    return new Response('<?xml version="1.0"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' }
    })
  }

  return new Response('OK', { status: 200 })
})
