import { useState, useEffect, useRef } from 'react'
import { supabase, Client, Conversation, Message } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { formatDistanceToNow } from 'date-fns'
import { Send, CheckCircle, Square, MessageSquare } from 'lucide-react'
import { clsx } from 'clsx'

export function InboxTab({ client }: { client: Client }) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchConversations()

    const channel = supabase.channel(`inbox-convs:${client.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `client_id=eq.${client.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') setConversations(p => [payload.new as Conversation, ...p])
          else if (payload.eventType === 'UPDATE') setConversations(p => p.map(c => c.id === (payload.new as Conversation).id ? payload.new as Conversation : c))
        })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [client.id])

  useEffect(() => {
    if (!selected) return
    fetchMessages(selected.caller_number)

    const channel = supabase.channel(`inbox-msgs:${client.id}:${selected.caller_number}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `client_id=eq.${client.id}` },
        (payload) => {
          const msg = payload.new as Message
          if (msg.caller_number === selected.caller_number) {
            setMessages(p => [...p, msg])
          }
        })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selected?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function fetchConversations() {
    setLoadingConvs(true)
    const { data } = await supabase.from('conversations').select('*').eq('client_id', client.id).order('last_message_at', { ascending: false })
    setConversations(data ?? [])
    setLoadingConvs(false)
  }

  async function fetchMessages(callerNumber: string) {
    setLoadingMsgs(true)
    const { data } = await supabase.from('messages').select('*').eq('client_id', client.id).eq('caller_number', callerNumber).order('created_at', { ascending: true })
    setMessages(data ?? [])
    setLoadingMsgs(false)
  }

  async function handleSend() {
    if (!reply.trim() || !selected) return
    setSending(true)
    await supabase.from('messages').insert({
      client_id: client.id,
      caller_number: selected.caller_number,
      direction: 'outbound',
      body: reply.trim(),
      message_type: 'manual',
      status: 'sent',
    })
    setReply('')
    setSending(false)
  }

  async function handleMarkComplete() {
    if (!selected) return
    await supabase.from('conversations').update({ status: 'complete' }).eq('id', selected.id)
    await supabase.functions.invoke('send-review-request', { body: { conversation_id: selected.id } })
    setSelected(p => p ? { ...p, status: 'complete' } : p)
  }

  async function handleStopSequence() {
    if (!selected) return
    await supabase.from('conversations').update({ sequence_paused: true }).eq('id', selected.id)
    setSelected(p => p ? { ...p, sequence_paused: true } : p)
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Thread list */}
      <div className="w-72 border-r border-subtle flex flex-col flex-shrink-0">
        <div className="px-4 py-3 border-b border-subtle">
          <h2 className="text-sm font-semibold text-text-primary">Conversations</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="p-4 text-center text-text-secondary text-sm">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-text-secondary text-sm">No conversations yet</div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setSelected(conv)}
                className={clsx(
                  'w-full text-left px-4 py-3.5 border-b border-subtle transition-colors',
                  selected?.id === conv.id ? 'bg-accent-blue/10' : 'hover:bg-white/[0.03]'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-text-primary">{conv.caller_number}</span>
                  <span className="text-[10px] text-text-secondary">
                    {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {conv.opted_out && <span className="text-[10px] text-danger">Opted out</span>}
                  {conv.sequence_paused && <span className="text-[10px] text-warning">Seq. paused</span>}
                  {conv.intent && <span className="text-[10px] text-accent-blue capitalize">{conv.intent}</span>}
                  {conv.status === 'complete' && <span className="text-[10px] text-success">Complete</span>}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Conversation view */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
              Select a conversation
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-5 py-3 border-b border-subtle flex items-center justify-between">
              <div>
                <span className="font-semibold text-text-primary">{selected.caller_number}</span>
                {selected.intent && (
                  <span className="ml-2 text-xs text-accent-blue bg-accent-blue/10 px-2 py-0.5 rounded-full capitalize">{selected.intent}</span>
                )}
              </div>
              <div className="flex gap-2">
                {!selected.sequence_paused && (
                  <Button variant="secondary" onClick={handleStopSequence} className="text-xs py-1.5">
                    <Square className="w-3 h-3" />
                    Stop Sequence
                  </Button>
                )}
                {selected.status !== 'complete' && (
                  <Button variant="success" onClick={handleMarkComplete} className="text-xs py-1.5">
                    <CheckCircle className="w-3 h-3" />
                    Complete → Review
                  </Button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {loadingMsgs ? (
                <div className="text-center text-text-secondary text-sm">Loading...</div>
              ) : messages.map(msg => (
                <div
                  key={msg.id}
                  className={clsx('flex', msg.direction === 'outbound' ? 'justify-end' : 'justify-start')}
                >
                  <div className={clsx(
                    'max-w-[75%] rounded-2xl px-4 py-2.5',
                    msg.direction === 'outbound'
                      ? 'bg-accent-blue text-white rounded-br-sm'
                      : 'bg-card border border-subtle text-text-primary rounded-bl-sm'
                  )}>
                    <p className="text-sm leading-relaxed">{msg.body}</p>
                    <div className={clsx('flex items-center gap-2 mt-1.5', msg.direction === 'outbound' ? 'justify-end' : 'justify-start')}>
                      {msg.sequence_step && (
                        <span className="text-[10px] opacity-70">Step {msg.sequence_step}</span>
                      )}
                      {msg.ai_generated && (
                        <span className="text-[10px] opacity-70">· AI</span>
                      )}
                      <span className="text-[10px] opacity-60">
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Reply box */}
            <div className="p-4 border-t border-subtle">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder={`Reply as ${client.business_name}...`}
                  disabled={selected.opted_out || selected.status === 'complete'}
                  className="flex-1 bg-bg-secondary border border-subtle rounded-xl px-4 py-2.5 text-text-primary text-sm placeholder-text-secondary/50 focus:outline-none focus:border-active disabled:opacity-50"
                />
                <Button onClick={handleSend} disabled={sending || !reply.trim() || selected.opted_out || selected.status === 'complete'}>
                  <Send className="w-4 h-4" />
                  SEND
                </Button>
              </div>
              {selected.opted_out && (
                <p className="text-xs text-danger mt-2">This contact has opted out of messages.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
