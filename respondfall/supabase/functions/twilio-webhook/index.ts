// Twilio webhook edge function — handles all inbound Twilio events.
//
// Routes:
//   POST  (CallSid present, no DialCallStatus) → initial call: return TwiML dial
//   POST  (CallSid + DialCallStatus)            → dial result: missed call flow
//   POST  (MessageSid present)                  → inbound SMS flow
//
// All secrets from process.env / Deno.env only.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── Twilio signature validation ───────────────────────────────────────────────
async function validateSignature(
  authToken: string,
  incomingSignature: string,
  url: string,
  params: Record<string, string>,
): Promise<boolean> {
  const sorted = Object.keys(params).sort()
  let data = url
  for (const key of sorted) data += key + params[key]

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(authToken),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  const computed = btoa(String.fromCharCode(...new Uint8Array(sig)))
  return computed === incomingSignature
}

// ── Twilio REST helpers ───────────────────────────────────────────────────────
async function sendSms(
  accountSid: string,
  authToken: string,
  from: string,
  to: string,
  body: string,
): Promise<string | null> {
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: from, To: to, Body: body }).toString(),
    },
  )
  if (!res.ok) {
    console.error('sendSms failed:', await res.text())
    return null
  }
  const data = await res.json()
  return data.sid ?? null
}

// ── TwiML helpers ─────────────────────────────────────────────────────────────
function twimlResponse(xml: string) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${xml}</Response>`, {
    headers: { 'Content-Type': 'text/xml' },
  })
}

// ── Anthropic AI helper ───────────────────────────────────────────────────────
interface AiResult {
  intent: string
  reply: string
}

async function runAiQualification(
  apiKey: string,
  businessName: string,
  industry: string,
  inboundMessage: string,
): Promise<AiResult> {
  const system =
    `You are an SMS assistant for ${businessName}, a ${industry} company. ` +
    `A potential customer texted. Categorize their intent as: quote, service, question, or other. ` +
    `Keep the reply under 160 characters and friendly. ` +
    `Respond ONLY with valid JSON: {"intent":"<category>","reply":"<text>"}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system,
      messages: [{ role: 'user', content: inboundMessage }],
    }),
  })

  if (!res.ok) throw new Error(`Anthropic error: ${res.status}`)
  const data = await res.json()
  const text: string = data.content?.[0]?.text ?? ''

  try {
    // Strip markdown code fences if present
    const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
    return JSON.parse(cleaned) as AiResult
  } catch {
    return { intent: 'other', reply: text.slice(0, 160) }
  }
}

async function runAiReply(
  apiKey: string,
  businessName: string,
  industry: string,
  intent: string,
  inboundMessage: string,
): Promise<string> {
  const system =
    `You are an SMS assistant for ${businessName}, a ${industry} company. ` +
    `Customer intent: ${intent}. Reply helpfully in under 160 characters. ` +
    `No JSON — just the reply text.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 160,
      system,
      messages: [{ role: 'user', content: inboundMessage }],
    }),
  })

  if (!res.ok) throw new Error(`Anthropic reply error: ${res.status}`)
  const data = await res.json()
  return (data.content?.[0]?.text ?? '').slice(0, 160)
}

// ── Blackout check ────────────────────────────────────────────────────────────
function isInBlackout(blackoutStart: string | null, blackoutEnd: string | null): boolean {
  if (!blackoutStart || !blackoutEnd) return false

  const now   = new Date()
  const hhmm  = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const cur   = now.getUTCHours() * 60 + now.getUTCMinutes()
  const start = hhmm(blackoutStart)
  const end   = hhmm(blackoutEnd)

  // Overnight window (e.g. 21:00 → 08:00)
  return start > end ? (cur >= start || cur < end) : (cur >= start && cur < end)
}

// ── Render SMS template ───────────────────────────────────────────────────────
function renderTemplate(
  template: string | null,
  vars: Record<string, string>,
): string {
  const tpl =
    template ||
    'Hi! This is {business_name}. We missed your call — we\'d love to help! ' +
    'Reply here or book online: {booking_link}'
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`)
}

// ── Main handler ──────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  const accountSid     = Deno.env.get('TWILIO_ACCOUNT_SID')
  const authToken      = Deno.env.get('TWILIO_AUTH_TOKEN')
  const supabaseUrl    = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anthropicKey   = Deno.env.get('ANTHROPIC_API_KEY')

  if (!accountSid || !authToken || !supabaseUrl || !serviceRoleKey || !anthropicKey) {
    console.error('Missing required environment variables')
    return new Response('Server misconfigured', { status: 500 })
  }

  // Parse form body
  const bodyText = await req.text()
  const params   = Object.fromEntries(new URLSearchParams(bodyText).entries())

  // Validate Twilio signature
  const signature = req.headers.get('X-Twilio-Signature') ?? ''
  const url       = req.url
  const valid     = await validateSignature(authToken, signature, url, params)
  if (!valid) {
    console.warn('Invalid Twilio signature from', req.headers.get('x-forwarded-for'))
    return new Response('Forbidden', { status: 403 })
  }

  const db = createClient(supabaseUrl, serviceRoleKey)

  // ── Route: Inbound SMS ───────────────────────────────────────────────────────
  if (params.MessageSid) {
    const from      = params.From
    const to        = params.To       // our Twilio number
    const body      = (params.Body ?? '').trim()

    // Find client by respondfall_number
    const { data: client } = await db
      .from('clients')
      .select('*, agency_owners(name)')
      .eq('respondfall_number', to)
      .single()

    if (!client) {
      console.warn('No client found for number', to)
      return twimlResponse('')
    }

    if (!client.system_active) return twimlResponse('')

    // Insert inbound message
    await db.from('messages').insert({
      client_id:          client.id,
      caller_number:      from,
      direction:          'inbound',
      body,
      twilio_message_sid: params.MessageSid,
      message_type:       'sms',
      ai_generated:       false,
      status:             'received',
    })

    // Update conversation last_message_at
    await db.from('conversations')
      .upsert(
        { client_id: client.id, caller_number: from, last_message_at: new Date().toISOString() },
        { onConflict: 'client_id,caller_number', ignoreDuplicates: false },
      )

    // STOP keyword → opt out
    if (/^(stop|unsubscribe|cancel|quit|end)$/i.test(body)) {
      await db.from('opt_outs').upsert(
        { client_id: client.id, phone_number: from },
        { onConflict: 'client_id,phone_number', ignoreDuplicates: true },
      )
      await db.from('conversations')
        .update({ status: 'opted_out', opted_out: true, sequence_paused: true })
        .eq('client_id', client.id)
        .eq('caller_number', from)

      await sendSms(
        accountSid, authToken, to, from,
        'You have been unsubscribed and will receive no further messages.',
      )
      return twimlResponse('')
    }

    // Check opt-out
    const { data: optOut } = await db
      .from('opt_outs')
      .select('id')
      .eq('client_id', client.id)
      .eq('phone_number', from)
      .maybeSingle()

    if (optOut) return twimlResponse('')

    // Get conversation intent
    const { data: convo } = await db
      .from('conversations')
      .select('intent, sequence_paused')
      .eq('client_id', client.id)
      .eq('caller_number', from)
      .maybeSingle()

    let replyText: string
    let aiGenerated = true

    try {
      if (!convo?.intent) {
        // First reply — qualify intent
        const result = await runAiQualification(
          anthropicKey,
          client.business_name,
          client.industry ?? 'service',
          body,
        )
        replyText = result.reply

        await db.from('conversations')
          .update({ intent: result.intent, sequence_paused: true })
          .eq('client_id', client.id)
          .eq('caller_number', from)
      } else {
        // Intent known — AI contextual reply
        replyText = await runAiReply(
          anthropicKey,
          client.business_name,
          client.industry ?? 'service',
          convo.intent,
          body,
        )
      }
    } catch (e) {
      console.error('AI error:', e)
      replyText = `Thanks for reaching out to ${client.business_name}! We'll be in touch shortly.`
      aiGenerated = false
    }

    const sid = await sendSms(accountSid, authToken, to, from, replyText)

    await db.from('messages').insert({
      client_id:          client.id,
      caller_number:      from,
      direction:          'outbound',
      body:               replyText,
      twilio_message_sid: sid,
      message_type:       'sms',
      ai_generated:       aiGenerated,
      status:             'sent',
    })

    return twimlResponse('')
  }

  // ── Route: Incoming voice call (initial) ─────────────────────────────────────
  if (params.CallSid && !params.DialCallStatus) {
    const to = params.To

    const { data: client } = await db
      .from('clients')
      .select('business_phone, business_name')
      .eq('respondfall_number', to)
      .single()

    if (!client?.business_phone) {
      return twimlResponse('<Say>Sorry, this number is not configured. Goodbye.</Say><Hangup/>')
    }

    // Dial the real business number; action fires when dial completes
    const actionUrl = `${req.url.split('?')[0]}?event=dial_result`
    return twimlResponse(
      `<Dial action="${actionUrl}" method="POST" timeout="20" callerId="${to}">` +
        `<Number>${client.business_phone}</Number>` +
      `</Dial>`,
    )
  }

  // ── Route: Dial result (missed call detection) ────────────────────────────────
  if (params.CallSid && params.DialCallStatus) {
    const dialStatus = params.DialCallStatus // no-answer | busy | failed | completed
    const from       = params.From
    const to         = params.To
    const callSid    = params.CallSid

    // Only trigger SMS recovery for missed calls
    if (!['no-answer', 'busy', 'failed'].includes(dialStatus)) {
      return twimlResponse('<Hangup/>')
    }

    const { data: client } = await db
      .from('clients')
      .select('*')
      .eq('respondfall_number', to)
      .single()

    if (!client || !client.system_active) return twimlResponse('<Hangup/>')

    // Check opt-out
    const { data: optOut } = await db
      .from('opt_outs')
      .select('id')
      .eq('client_id', client.id)
      .eq('phone_number', from)
      .maybeSingle()

    if (optOut) return twimlResponse('<Hangup/>')

    // Check blackout
    if (isInBlackout(client.blackout_start, client.blackout_end)) {
      console.log('Blackout active — skipping SMS for', from)
      return twimlResponse('<Hangup/>')
    }

    // Prevent duplicate processing for same call
    const { data: existing } = await db
      .from('missed_calls')
      .select('id')
      .eq('call_sid', callSid)
      .maybeSingle()

    if (existing) return twimlResponse('<Hangup/>')

    // Record missed call
    await db.from('missed_calls').insert({
      client_id:  client.id,
      caller_number: from,
      call_sid:   callSid,
      sequence_triggered: false,
    })

    // Upsert conversation
    await db.from('conversations').upsert(
      { client_id: client.id, caller_number: from, last_message_at: new Date().toISOString() },
      { onConflict: 'client_id,caller_number', ignoreDuplicates: false },
    )

    // Wait send_delay then fire Step 1 SMS
    const delay = Math.min((client.send_delay_seconds ?? 30) * 1000, 120_000)
    await new Promise(r => setTimeout(r, delay))

    const step1Body = renderTemplate(client.sms_template, {
      business_name: client.business_name,
      booking_link:  client.booking_link ?? 'reply to schedule',
    })

    const step1Sid = await sendSms(accountSid, authToken, to, from, step1Body)

    await db.from('messages').insert({
      client_id:          client.id,
      caller_number:      from,
      direction:          'outbound',
      body:               step1Body,
      twilio_message_sid: step1Sid,
      sequence_step:      1,
      message_type:       'sms',
      ai_generated:       false,
      status:             'sent',
    })

    // Mark missed call as sequence triggered
    await db.from('missed_calls')
      .update({ sequence_triggered: true })
      .eq('call_sid', callSid)

    // Schedule Step 2 (30 min later) — picked up by process-scheduled function
    const step2At = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    const step2Body =
      `Following up from ${client.business_name}! Still need help? ` +
      `Reply YES and we'll reach out right away.`

    await db.from('messages').insert({
      client_id:     client.id,
      caller_number: from,
      direction:     'outbound',
      body:          step2Body,
      sequence_step: 2,
      message_type:  'sms',
      ai_generated:  false,
      status:        'scheduled',
      scheduled_at:  step2At,
    })

    return twimlResponse('<Hangup/>')
  }

  return new Response('Unrecognized event', { status: 400 })
})
