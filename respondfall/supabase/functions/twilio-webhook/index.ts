// Twilio webhook edge function — handles all inbound Twilio events.
//
// Event routing:
//   POST (MessageSid)                        → inbound SMS flow
//   POST (CallSid, no DialCallStatus)        → initial voice call → TwiML dial
//   POST (CallSid + DialCallStatus)          → dial result → missed call flow
//
// All secrets read from Deno.env only.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── Twilio signature validation ───────────────────────────────────────────────
async function validateSignature(
  authToken: string,
  incoming: string,
  url: string,
  params: Record<string, string>,
): Promise<boolean> {
  const sorted = Object.keys(params).sort()
  let data = url
  for (const k of sorted) data += k + params[k]

  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(authToken),
    { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'],
  )
  const sig     = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  const computed = btoa(String.fromCharCode(...new Uint8Array(sig)))
  return computed === incoming
}

// ── Twilio send SMS ───────────────────────────────────────────────────────────
async function sendSms(
  accountSid: string, authToken: string,
  from: string, to: string, body: string,
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
  if (!res.ok) { console.error('sendSms failed:', await res.text()); return null }
  return ((await res.json()) as { sid?: string }).sid ?? null
}

// ── TwiML response ────────────────────────────────────────────────────────────
function twiml(xml: string) {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response>${xml}</Response>`,
    { headers: { 'Content-Type': 'text/xml' } },
  )
}

// ── Anthropic AI — intent qualification ──────────────────────────────────────
interface QualifyResult { intent: string; reply: string }

async function aiQualify(
  apiKey: string,
  businessName: string,
  industry: string,
  inboundMessage: string,
): Promise<QualifyResult> {
  const system =
    `You are ${businessName} (${industry}). ` +
    `A potential customer just texted. ` +
    `Categorize their intent as quote, service, or question. ` +
    `Reply ONLY with valid JSON: {"intent":"quote|service|question","reply":"<friendly SMS under 160 chars>"}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system,
      messages: [{ role: 'user', content: inboundMessage }],
    }),
  })

  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`)

  const data   = await res.json()
  const raw: string = data.content?.[0]?.text ?? ''

  try {
    const cleaned = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
    const parsed  = JSON.parse(cleaned) as QualifyResult
    return {
      intent: String(parsed.intent ?? 'question').toLowerCase(),
      reply:  String(parsed.reply  ?? '').slice(0, 160),
    }
  } catch {
    // Graceful fallback — treat as question, use raw text as reply
    console.warn('AI JSON parse failed, using raw text as reply')
    return { intent: 'question', reply: raw.slice(0, 160) }
  }
}

// ── Anthropic AI — contextual reply ──────────────────────────────────────────
async function aiReply(
  apiKey: string,
  businessName: string,
  industry: string,
  intent: string,
  inboundMessage: string,
): Promise<string> {
  const system =
    `You are an SMS assistant for ${businessName}, a ${industry} company. ` +
    `The customer's intent is: ${intent}. ` +
    `Reply helpfully and naturally in under 160 characters. ` +
    `No JSON — reply text only.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 160,
      system,
      messages: [{ role: 'user', content: inboundMessage }],
    }),
  })

  if (!res.ok) throw new Error(`Anthropic reply ${res.status}`)
  const data = await res.json()
  return String(data.content?.[0]?.text ?? '').slice(0, 160)
}

// ── Blackout window check (UTC times) ────────────────────────────────────────
function inBlackout(start: string | null, end: string | null): boolean {
  if (!start || !end) return false
  const hhmm  = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const now   = new Date()
  const cur   = now.getUTCHours() * 60 + now.getUTCMinutes()
  const s     = hhmm(start)
  const e     = hhmm(end)
  return s > e ? cur >= s || cur < e : cur >= s && cur < e
}

// ── SMS template renderer ─────────────────────────────────────────────────────
function renderTemplate(tpl: string | null, vars: Record<string, string>): string {
  const base =
    tpl ||
    "Hi! This is {business_name}. We missed your call — we'd love to help! " +
    'Reply here or book online: {booking_link}'
  return base.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`)
}

// ── Main handler ──────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  const accountSid     = Deno.env.get('TWILIO_ACCOUNT_SID')
  const authToken      = Deno.env.get('TWILIO_AUTH_TOKEN')
  const supabaseUrl    = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anthropicKey   = Deno.env.get('ANTHROPIC_API_KEY')

  if (!accountSid || !authToken || !supabaseUrl || !serviceRoleKey || !anthropicKey) {
    console.error('Missing required env vars')
    return new Response('Server misconfigured', { status: 500 })
  }

  const bodyText = await req.text()
  const params   = Object.fromEntries(new URLSearchParams(bodyText).entries())

  // Signature validation
  const sig   = req.headers.get('X-Twilio-Signature') ?? ''
  const valid = await validateSignature(authToken, sig, req.url, params)
  if (!valid) {
    console.warn('Invalid Twilio signature')
    return new Response('Forbidden', { status: 403 })
  }

  const db = createClient(supabaseUrl, serviceRoleKey)

  // ════════════════════════════════════════════════════════════════════════════
  // INBOUND SMS
  // ════════════════════════════════════════════════════════════════════════════
  if (params.MessageSid) {
    const from    = params.From
    const to      = params.To
    const msgBody = (params.Body ?? '').trim()

    const { data: client } = await db
      .from('clients')
      .select('*')
      .eq('respondfall_number', to)
      .single()

    if (!client || !client.system_active) return twiml('')

    // Insert inbound message
    await db.from('messages').insert({
      client_id:          client.id,
      caller_number:      from,
      direction:          'inbound',
      body:               msgBody,
      twilio_message_sid: params.MessageSid,
      message_type:       'sms',
      ai_generated:       false,
      status:             'received',
    })

    // Upsert conversation timestamp
    await db.from('conversations').upsert(
      { client_id: client.id, caller_number: from, last_message_at: new Date().toISOString() },
      { onConflict: 'client_id,caller_number', ignoreDuplicates: false },
    )

    // STOP keyword → opt out
    if (/^(stop|unsubscribe|cancel|quit|end)$/i.test(msgBody)) {
      await db.from('opt_outs').upsert(
        { client_id: client.id, phone_number: from },
        { onConflict: 'client_id,phone_number', ignoreDuplicates: true },
      )
      await db.from('conversations')
        .update({ status: 'opted_out', opted_out: true, sequence_paused: true })
        .eq('client_id', client.id).eq('caller_number', from)

      await sendSms(accountSid, authToken, to, from,
        'You have been unsubscribed and will receive no further messages.')
      return twiml('')
    }

    // Check opt-out
    const { data: optOut } = await db.from('opt_outs').select('id')
      .eq('client_id', client.id).eq('phone_number', from).maybeSingle()
    if (optOut) return twiml('')

    // Fetch conversation state
    const { data: convo } = await db.from('conversations')
      .select('intent, sequence_paused, status')
      .eq('client_id', client.id).eq('caller_number', from).maybeSingle()

    // Check if last outbound was a referral request — if so, treat reply as a referral name
    const { data: lastReferralMsg } = await db.from('messages')
      .select('id, created_at')
      .eq('client_id', client.id).eq('caller_number', from)
      .eq('direction', 'outbound').eq('message_type', 'referral').eq('status', 'sent')
      .order('created_at', { ascending: false }).limit(1).maybeSingle()

    if (lastReferralMsg) {
      // Any inbound after a sent referral message = referral name reply
      const supabaseFnUrl = `${supabaseUrl}/functions/v1/send-referral`
      fetch(supabaseFnUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode:         'process_reply',
          clientId:     client.id,
          callerNumber: from,
          referredName: msgBody,
        }),
      }).catch(e => console.error('send-referral call failed:', e))
      return twiml('')
    }

    let replyText: string
    let aiGenerated = true
    let intentToSet: string | null = null

    try {
      if (!convo?.intent) {
        // ── No intent yet — full qualification ──────────────────────────────
        const result = await aiQualify(
          anthropicKey,
          client.business_name,
          client.industry ?? 'service',
          msgBody,
        )

        intentToSet = result.intent
        replyText   = result.reply

        // Append booking link for quote or service intents
        if (['quote', 'service'].includes(result.intent) && client.booking_link) {
          const linkSuffix = ` Book now: ${client.booking_link}`
          if ((replyText + linkSuffix).length <= 160) {
            replyText = replyText + linkSuffix
          }
        }

        // Notify owner via SMS if intent is a question (not a booking-ready lead)
        if (result.intent === 'question' && client.business_phone) {
          const ownerAlert =
            `Respondfall: New question from ${from} for ${client.business_name}: "${msgBody.slice(0, 80)}"`
          sendSms(accountSid, authToken, to, client.business_phone, ownerAlert)
            .catch(e => console.error('Owner alert failed:', e))
        }

        // Update conversation intent
        await db.from('conversations')
          .update({ intent: result.intent, sequence_paused: true })
          .eq('client_id', client.id).eq('caller_number', from)

      } else {
        // ── Intent known — contextual AI reply ──────────────────────────────
        replyText = await aiReply(
          anthropicKey,
          client.business_name,
          client.industry ?? 'service',
          convo.intent,
          msgBody,
        )
      }
    } catch (e) {
      console.error('AI error:', e)
      replyText    = `Thanks for reaching out to ${client.business_name}! We'll be in touch shortly.`
      aiGenerated  = false
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
      status:             sid ? 'sent' : 'failed',
    })

    return twiml('')
  }

  // ════════════════════════════════════════════════════════════════════════════
  // INCOMING VOICE CALL — return TwiML to forward to business
  // ════════════════════════════════════════════════════════════════════════════
  if (params.CallSid && !params.DialCallStatus) {
    const to = params.To

    const { data: client } = await db.from('clients')
      .select('business_phone, business_name')
      .eq('respondfall_number', to).single()

    if (!client?.business_phone) {
      return twiml('<Say>Sorry, this number is unavailable. Goodbye.</Say><Hangup/>')
    }

    const actionUrl = `${req.url.split('?')[0]}?event=dial_result`
    return twiml(
      `<Dial action="${actionUrl}" method="POST" timeout="20" callerId="${to}">` +
        `<Number>${client.business_phone}</Number>` +
      `</Dial>`,
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // DIAL RESULT — missed call detection and SMS recovery
  // ════════════════════════════════════════════════════════════════════════════
  if (params.CallSid && params.DialCallStatus) {
    const dialStatus = params.DialCallStatus
    const from       = params.From
    const to         = params.To
    const callSid    = params.CallSid

    if (!['no-answer', 'busy', 'failed'].includes(dialStatus)) {
      return twiml('<Hangup/>')
    }

    const { data: client } = await db.from('clients').select('*')
      .eq('respondfall_number', to).single()

    if (!client || !client.system_active) return twiml('<Hangup/>')

    // Opt-out check
    const { data: optOut } = await db.from('opt_outs').select('id')
      .eq('client_id', client.id).eq('phone_number', from).maybeSingle()
    if (optOut) return twiml('<Hangup/>')

    // Blackout check
    if (inBlackout(client.blackout_start, client.blackout_end)) {
      console.log('Blackout active — skipping SMS for', from)
      return twiml('<Hangup/>')
    }

    // Dedup by call_sid
    const { data: existing } = await db.from('missed_calls').select('id')
      .eq('call_sid', callSid).maybeSingle()
    if (existing) return twiml('<Hangup/>')

    // Record missed call + upsert conversation
    await db.from('missed_calls').insert({
      client_id: client.id, caller_number: from,
      call_sid: callSid, sequence_triggered: false,
    })
    await db.from('conversations').upsert(
      { client_id: client.id, caller_number: from, last_message_at: new Date().toISOString() },
      { onConflict: 'client_id,caller_number', ignoreDuplicates: false },
    )

    // Wait send_delay, then fire Step 1
    const delay = Math.min((client.send_delay_seconds ?? 30) * 1000, 120_000)
    await new Promise(r => setTimeout(r, delay))

    const step1Body = renderTemplate(client.sms_template, {
      business_name: client.business_name,
      booking_link:  client.booking_link ?? 'reply to schedule',
    })

    const step1Sid = await sendSms(accountSid, authToken, to, from, step1Body)

    await db.from('messages').insert({
      client_id: client.id, caller_number: from,
      direction: 'outbound', body: step1Body,
      twilio_message_sid: step1Sid, sequence_step: 1,
      message_type: 'sms', ai_generated: false,
      status: step1Sid ? 'sent' : 'failed',
    })

    await db.from('missed_calls').update({ sequence_triggered: true }).eq('call_sid', callSid)

    // Schedule Step 2 at +30 min
    const step2Body =
      `Following up from ${client.business_name}! Still need help? ` +
      `Reply YES and we'll reach out right away.`

    await db.from('messages').insert({
      client_id: client.id, caller_number: from,
      direction: 'outbound', body: step2Body,
      sequence_step: 2, message_type: 'sms',
      ai_generated: false, status: 'scheduled',
      scheduled_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    })

    return twiml('<Hangup/>')
  }

  return new Response('Unrecognized event', { status: 400 })
})
