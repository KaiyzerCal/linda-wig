// Edge function — send a Google review request SMS and schedule referral for +30 min.
// Called from the Inbox "Complete → Review" action button.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, preflight, json, err } from '../_shared/cors.ts'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return preflight()

  const accountSid     = Deno.env.get('TWILIO_ACCOUNT_SID')
  const authToken      = Deno.env.get('TWILIO_AUTH_TOKEN')
  const supabaseUrl    = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!accountSid || !authToken || !supabaseUrl || !serviceRoleKey) {
    return err('Server environment not configured', 500)
  }

  // Verify JWT ownership
  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '')
  const { data: { user }, error: authErr } = await userClient.auth.getUser(jwt)
  if (authErr || !user) return err('Unauthorized', 401)

  let clientId = '', callerNumber = ''
  try {
    const body  = await req.json()
    clientId     = String(body.clientId     ?? '')
    callerNumber = String(body.callerNumber ?? '')
  } catch {
    return err('Invalid request body')
  }

  if (!clientId || !callerNumber) return err('clientId and callerNumber are required')

  const db = createClient(supabaseUrl, serviceRoleKey)

  // Verify ownership
  const { data: ownerRow } = await db
    .from('agency_owners')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!ownerRow) return err('Agency owner not found', 403)

  const { data: client } = await db
    .from('clients')
    .select('id, business_name, respondfall_number, google_review_link, system_active')
    .eq('id', clientId)
    .eq('agency_owner_id', ownerRow.id)
    .single()

  if (!client) return err('Client not found or access denied', 403)
  if (!client.respondfall_number) return err('No Twilio number provisioned', 400)

  if (!client.google_review_link) {
    return err('No Google review link configured — add one in Settings', 400)
  }

  // Check opt-out
  const { data: optOut } = await db
    .from('opt_outs')
    .select('id')
    .eq('client_id', clientId)
    .eq('phone_number', callerNumber)
    .maybeSingle()

  if (optOut) return err('This contact has opted out', 400)

  const reviewBody =
    `Thanks for choosing ${client.business_name}! We'd really appreciate a quick review — ` +
    `it only takes 30 seconds: ${client.google_review_link}`

  // Send review request SMS
  const twilioRes = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: client.respondfall_number,
        To:   callerNumber,
        Body: reviewBody,
      }).toString(),
    },
  )

  if (!twilioRes.ok) {
    console.error('Twilio review send failed:', await twilioRes.text())
    return err('Failed to send review request SMS', 502)
  }

  const twilioData = await twilioRes.json()

  // Insert review request message
  await db.from('messages').insert({
    client_id:          clientId,
    caller_number:      callerNumber,
    direction:          'outbound',
    body:               reviewBody,
    twilio_message_sid: twilioData.sid ?? null,
    message_type:       'review_request',
    ai_generated:       false,
    status:             'sent',
  })

  // Mark conversation as closed
  await db
    .from('conversations')
    .update({ status: 'closed', last_message_at: new Date().toISOString() })
    .eq('client_id', clientId)
    .eq('caller_number', callerNumber)

  // Schedule referral request for +30 minutes
  const referralBody =
    `Hey! Do you know anyone who could use help from ${client.business_name}? ` +
    `Reply with their name and we'll make sure to take great care of them — and you! 😊`

  await db.from('messages').insert({
    client_id:     clientId,
    caller_number: callerNumber,
    direction:     'outbound',
    body:          referralBody,
    message_type:  'referral',
    ai_generated:  false,
    status:        'scheduled',
    scheduled_at:  new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  })

  return json({ success: true })
})
