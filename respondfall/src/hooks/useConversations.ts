import { useEffect, useState } from 'react'
import { supabase, Conversation } from '../lib/supabase'

export function useConversations(clientId: string | null) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clientId) { setLoading(false); return }
    fetchConversations()

    const channel = supabase
      .channel(`conversations:${clientId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations',
        filter: `client_id=eq.${clientId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setConversations(prev => [payload.new as Conversation, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setConversations(prev =>
            prev.map(c => c.id === (payload.new as Conversation).id ? payload.new as Conversation : c)
          )
        } else if (payload.eventType === 'DELETE') {
          setConversations(prev => prev.filter(c => c.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [clientId])

  async function fetchConversations() {
    setLoading(true)
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .eq('client_id', clientId!)
      .order('last_message_at', { ascending: false })
    setConversations(data ?? [])
    setLoading(false)
  }

  async function pauseSequence(conversationId: string) {
    return supabase
      .from('conversations')
      .update({ sequence_paused: true })
      .eq('id', conversationId)
  }

  async function markComplete(conversationId: string) {
    return supabase
      .from('conversations')
      .update({ status: 'complete' })
      .eq('id', conversationId)
  }

  const unreadCount = conversations.filter(c => c.status === 'active' && !c.opted_out).length

  return { conversations, loading, unreadCount, pauseSequence, markComplete, refetch: fetchConversations }
}
