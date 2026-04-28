import { useEffect, useState } from 'react'
import { supabase, Message } from '../lib/supabase'

export function useMessages(clientId: string | null, callerNumber?: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clientId) { setLoading(false); return }
    fetchMessages()

    const channel = supabase
      .channel(`messages:${clientId}:${callerNumber ?? 'all'}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `client_id=eq.${clientId}`,
      }, (payload) => {
        const msg = payload.new as Message
        if (!callerNumber || msg.caller_number === callerNumber) {
          setMessages(prev => [...prev, msg])
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [clientId, callerNumber])

  async function fetchMessages() {
    setLoading(true)
    let query = supabase
      .from('messages')
      .select('*')
      .eq('client_id', clientId!)
      .order('created_at', { ascending: true })

    if (callerNumber) {
      query = query.eq('caller_number', callerNumber)
    }

    const { data } = await query
    setMessages(data ?? [])
    setLoading(false)
  }

  async function sendManualReply(callerNumber: string, body: string) {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        client_id: clientId!,
        caller_number: callerNumber,
        direction: 'outbound',
        body,
        message_type: 'manual',
        status: 'sent',
      })
      .select()
      .single()
    return { data, error }
  }

  return { messages, loading, sendManualReply, refetch: fetchMessages }
}
