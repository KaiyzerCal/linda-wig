// Edge function — process a scheduled referral request.
// Also called by twilio-webhook when an inbound SMS arrives and the last
// outbound message for that conversation was message_type='referral':
//   { mode: 'process_reply', clientId, callerNumber, referredName }
//
// When mode = 'send' (default): send the scheduled referral SMS.
// When mode = 'process_reply': generate REF code, insert referrals row,
//   send confirmation back to the referrer.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { preflight, json, err } from '../_shared/cors.ts'

// Generate a short unique referral code
function makeRefCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'REF-'
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return preflight()

  const accountSid     = Deno.env.get('TWILIO_ACCOUNT_SID')
  const authToken      = Deno.env.get('TWILIO_AUTH_TOKEN')
  const supabaseUrl    = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!accountSid || !authToken || !supabaseUrl || !serviceRoleKey) {
    return err('Server environment not configured', 500)
  }

  let mode = 'send', clientId = '', callerNumber = '', referredName = ''
  try {
    const body  = await req.json()
    mode         = String(body.mode         ?? 'send')
    clientId     = String(body.clientId     ?? '')
    callerNumber = String(body.callerNumber ?? '')
    referredName = String(body.referredName ?? '').trim()
  } catch {
    return err('Invalid request body')
  }

  if (!clientId || !callerNumber) return err('clientId and callerNumber are required')

  const db = createClient(supabaseUrl, serviceRoleKey)

  const { data: client } = await db
    .from('clients')
    .select('id, business_name, respondfall_number, system_active')
    .eq('id', clientId)
    .single()

  if (!client) return err('Client not found', 404)
  if (!client.respondfall_number) return err('No Twilio number provisioned', 400)

  async function sendSms(to: string, body: string): Promise<string | null> {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: client!.respondfall_number!,
          To:   to,
          Body: body,
        }).toString(),
      },
    )
    if (!res.ok) { console.error('Twilio failed:', await res.text()); return null }
    return ((await res.json()) as { sid?: string }).sid ?? null
  }

  // ── Mode: process_reply — customer replied with a referred name ────────────
  if (mode === 'process_reply') {
    if (!referredName) return err('referredName is required for process_reply mode')

    // Generate a unique code (retry up to 3 times on collision)
    let code = ''
    for (let attempt = 0; attempt < 3; attempt++) {
      const candidate = makeRefCode()
      const { data: existing } = await db
        .from('referrals')
        .select('id')
        .eq('referral_code', candidate)
        .maybeSingle()
      if (!existing) { code = candidate; break }
    }
    if (!code) return err('Could not generate unique referral code', 500)

    // Insert referral record
    await db.from('referrals').insert({
      client_id:       clientId,
      referrer_number: callerNumber,
      referred_name:   referredName,
      referral_code:   code,
      status:          'pending',
    })

    const confirmBody =
      `Thanks for the referral! We'll reach out to ${referredName} soon. ` +
      `Your referral code is ${code} — mention it on your next service for a discount!`

    const sid = await sendSms(callerNumber, confirmBody)

    await db.from('messages').insert({
      client_id:          clientId,
      caller_number:      callerNumber,
      direction:          'outbound',
      body:               confirmBody,
      twilio_message_sid: sid,
      message_type:       'referral',
      ai_generated:       false,
      status:             sid ? 'sent' : 'failed',
    })

    return json({ success: true, referralCode: code })
  }

  // ── Mode: send — dispatch the scheduled referral SMS ──────────────────────

  // Check opt-out
  const { data: optOut } = await db
    .from('opt_outs')
    .select('id')
    .eq('client_id', clientId)
    .eq('phone_number', callerNumber)
    .maybeSingle()

  if (optOut) return json({ skipped: true, reason: 'opted_out' })

  // Check the scheduled message exists
  const { data: scheduled } = await db
    .from('messages')
    .select('id, body')
    .eq('client_id', clientId)
    .eq('caller_number', callerNumber)
    .eq('message_type', 'referral')
    .eq('status', 'scheduled')
    .order('scheduled_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!scheduled) return json({ skipped: true, reason: 'no_scheduled_message' })

  const sid = await sendSms(callerNumber, scheduled.body as string)

  await db
    .from('messages')
    .update({ status: sid ? 'sent' : 'failed', twilio_message_sid: sid })
    .eq('id', scheduled.id)

  return json({ success: true, sent: !!sid })
})
