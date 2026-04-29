// Edge function — send an SMS reply from the Inbox tab.
// Validates the JWT to ensure the caller owns the client.
// All Twilio credentials from Deno.env only.
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

  // Verify caller JWT — must be an authenticated agency owner
  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '')
  const { data: { user }, error: authErr } = await userClient.auth.getUser(jwt)
  if (authErr || !user) return err('Unauthorized', 401)

  let clientId = '', callerNumber = '', body = ''
  try {
    const payload = await req.json()
    clientId     = String(payload.clientId     ?? '')
    callerNumber = String(payload.callerNumber ?? '')
    body         = String(payload.body         ?? '').trim()
  } catch {
    return err('Invalid request body')
  }

  if (!clientId || !callerNumber || !body) {
    return err('clientId, callerNumber, and body are required')
  }

  const db = createClient(supabaseUrl, serviceRoleKey)

  // Verify ownership: client must belong to this user's agency_owner row
  const { data: ownerRow } = await db
    .from('agency_owners')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!ownerRow) return err('Agency owner not found', 403)

  const { data: client } = await db
    .from('clients')
    .select('id, respondfall_number, system_active')
    .eq('id', clientId)
    .eq('agency_owner_id', ownerRow.id)
    .single()

  if (!client) return err('Client not found or access denied', 403)
  if (!client.respondfall_number) return err('No Twilio number provisioned for this client', 400)

  // Send SMS
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
        Body: body,
      }).toString(),
    },
  )

  let messageSid: string | null = null
  if (twilioRes.ok) {
    const twilioData = await twilioRes.json()
    messageSid = twilioData.sid ?? null
  } else {
    console.error('Twilio send failed:', await twilioRes.text())
    return err('Failed to send SMS via Twilio', 502)
  }

  // Insert to messages table
  const { data: msg, error: dbErr } = await db
    .from('messages')
    .insert({
      client_id:          clientId,
      caller_number:      callerNumber,
      direction:          'outbound',
      body,
      twilio_message_sid: messageSid,
      message_type:       'sms',
      ai_generated:       false,
      status:             'sent',
    })
    .select()
    .single()

  if (dbErr) return err(dbErr.message, 500)

  // Update conversation last_message_at + unpause if it was paused manually
  await db
    .from('conversations')
    .upsert(
      {
        client_id:       clientId,
        caller_number:   callerNumber,
        last_message_at: new Date().toISOString(),
      },
      { onConflict: 'client_id,caller_number', ignoreDuplicates: false },
    )

  return json({ message: msg })
})
