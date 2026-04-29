// Edge function — process scheduled Step 2 follow-up SMS messages.
// Call this on a schedule (e.g. pg_cron every 5 minutes):
//   SELECT cron.schedule('step-two-processor', '*/5 * * * *',
//     $$SELECT net.http_post(url := '<SUPABASE_URL>/functions/v1/send-step-two',
//       headers := '{"Authorization":"Bearer <SERVICE_KEY>"}'::jsonb) $$);
//
// Skips the message if any inbound reply has arrived since Step 1.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { preflight, json, err } from '../_shared/cors.ts'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return preflight()

  const accountSid     = Deno.env.get('TWILIO_ACCOUNT_SID')
  const authToken      = Deno.env.get('TWILIO_AUTH_TOKEN')
  const supabaseUrl    = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!accountSid || !authToken || !supabaseUrl || !serviceRoleKey) {
    return err('Server environment not configured', 500)
  }

  const db = createClient(supabaseUrl, serviceRoleKey)
  const now = new Date().toISOString()

  // Find all Step 2 messages that are due and not yet sent
  const { data: pending, error: fetchErr } = await db
    .from('messages')
    .select('id, client_id, caller_number, body, clients(respondfall_number, system_active)')
    .eq('direction', 'outbound')
    .eq('sequence_step', 2)
    .eq('status', 'scheduled')
    .lte('scheduled_at', now)
    .limit(50)

  if (fetchErr) return err(fetchErr.message, 500)
  if (!pending || pending.length === 0) return json({ processed: 0 })

  let sent = 0
  let skipped = 0

  for (const msg of pending) {
    const client = (msg as Record<string, unknown>).clients as {
      respondfall_number: string | null
      system_active: boolean
    } | null

    // Skip if client inactive or no number
    if (!client?.system_active || !client?.respondfall_number) {
      await db.from('messages').update({ status: 'skipped' }).eq('id', msg.id)
      skipped++
      continue
    }

    // Check if conversation has received any inbound reply after Step 1 was sent
    const { data: inboundReplies } = await db
      .from('messages')
      .select('id')
      .eq('client_id', msg.client_id)
      .eq('caller_number', msg.caller_number)
      .eq('direction', 'inbound')
      .limit(1)

    if (inboundReplies && inboundReplies.length > 0) {
      // Human engaged — skip Step 2
      await db.from('messages').update({ status: 'skipped' }).eq('id', msg.id)
      skipped++
      continue
    }

    // Check opt-out
    const { data: optOut } = await db
      .from('opt_outs')
      .select('id')
      .eq('client_id', msg.client_id)
      .eq('phone_number', msg.caller_number)
      .maybeSingle()

    if (optOut) {
      await db.from('messages').update({ status: 'skipped' }).eq('id', msg.id)
      skipped++
      continue
    }

    // Check conversation not paused
    const { data: convo } = await db
      .from('conversations')
      .select('sequence_paused, opted_out')
      .eq('client_id', msg.client_id)
      .eq('caller_number', msg.caller_number)
      .maybeSingle()

    if (convo?.sequence_paused || convo?.opted_out) {
      await db.from('messages').update({ status: 'skipped' }).eq('id', msg.id)
      skipped++
      continue
    }

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
          To:   msg.caller_number as string,
          Body: msg.body as string,
        }).toString(),
      },
    )

    if (!twilioRes.ok) {
      console.error(`Twilio failed for ${msg.id}:`, await twilioRes.text())
      await db.from('messages').update({ status: 'failed' }).eq('id', msg.id)
      continue
    }

    const twilioData = await twilioRes.json()
    await db
      .from('messages')
      .update({ status: 'sent', twilio_message_sid: twilioData.sid ?? null })
      .eq('id', msg.id)

    sent++
  }

  return json({ processed: sent + skipped, sent, skipped })
})
