import {
  useState, useEffect, useRef, FormEvent, useCallback,
} from 'react'
import { supabase } from '@/lib/supabase'
import { n8nPost } from '@/lib/n8n'
import { useClientContext } from '@/contexts/ClientContext'
import { useToast } from '@/contexts/ToastContext'
import type { RealtimeChannel } from '@supabase/supabase-js'

// ── Types ─────────────────────────────────────────────────────────
interface ConvoRow {
  id: string
  client_id: string
  caller_number: string
  status: string
  intent: string | null
  opted_out: boolean
  sequence_paused: boolean
  last_message_at: string
}

interface MsgRow {
  id: string
  client_id: string
  caller_number: string
  direction: 'inbound' | 'outbound'
  body: string
  twilio_message_sid: string | null
  sequence_step: number | null
  message_type: string
  ai_generated: boolean
  status: string
  created_at: string
}

interface ThreadSummary extends ConvoRow {
  preview: string
  unreadCount: number
}

// ── Helpers ───────────────────────────────────────────────────────
function formatPhone(p: string) {
  const d = p.replace(/\D/g, '')
  if (d.length === 11 && d[0] === '1') return `(${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`
  return p
}

function timeLabel(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60)    return `${secs}s`
  if (secs < 3600)  return `${Math.floor(secs / 60)}m`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`
  return new Date(iso).toLocaleDateString()
}

function intentColor(intent: string | null) {
  if (!intent) return '#6b7280'
  const m: Record<string, string> = { quote: '#10b981', service: '#2d7ff9', question: '#fb923c' }
  return m[intent] ?? '#6b7280'
}

// ── Intent badge ──────────────────────────────────────────────────
function IntentBadge({ intent }: { intent: string | null }) {
  if (!intent) return null
  return (
    <span
      className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
      style={{ background: `${intentColor(intent)}20`, color: intentColor(intent) }}
    >
      {intent}
    </span>
  )
}

// ── Thread list item ──────────────────────────────────────────────
function ThreadItem({
  thread, active, onClick,
}: { thread: ThreadSummary; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 px-4 py-3 text-left transition-all border-b border-gray-800"
      style={{ background: active ? 'rgba(45,127,249,0.08)' : 'transparent' }}
    >
      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white mt-0.5"
        style={{ background: active ? 'var(--blue)' : '#374151' }}
      >
        {formatPhone(thread.caller_number).slice(1, 3)}
      </div>

      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-xs font-semibold font-mono truncate"
            style={{ color: active ? 'var(--blue)' : 'var(--text)' }}
          >
            {formatPhone(thread.caller_number)}
          </span>
          <span className="text-[10px] shrink-0" style={{ color: '#4b5563' }}>
            {timeLabel(thread.last_message_at)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-1">
          <p className="text-[11px] truncate" style={{ color: '#6b7280' }}>
            {thread.preview || 'No messages yet'}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            <IntentBadge intent={thread.intent} />
            {thread.unreadCount > 0 && (
              <span
                className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                style={{ background: 'var(--blue)' }}
              >
                {thread.unreadCount > 9 ? '9+' : thread.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

// ── Chat bubble ───────────────────────────────────────────────────
function Bubble({ msg }: { msg: MsgRow }) {
  const out = msg.direction === 'outbound'
  return (
    <div className={`flex ${out ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`max-w-[72%] space-y-1 ${out ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Labels row */}
        <div className={`flex items-center gap-1.5 ${out ? 'flex-row-reverse' : 'flex-row'}`}>
          {msg.sequence_step != null && (
            <span className="badge badge-gray text-[9px]">Step {msg.sequence_step}</span>
          )}
          {msg.ai_generated && (
            <span className="badge badge-blue text-[9px]">AI</span>
          )}
          {msg.message_type === 'review_request' && (
            <span className="badge badge-brand text-[9px]">Review</span>
          )}
          {msg.message_type === 'referral' && (
            <span className="badge badge-orange text-[9px]">Referral</span>
          )}
        </div>

        {/* Bubble */}
        <div
          className="rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed"
          style={out
            ? { background: 'var(--blue)', color: '#fff', borderBottomRightRadius: '4px' }
            : { background: '#1f2937', color: 'var(--text)', borderBottomLeftRadius: '4px' }
          }
        >
          {msg.body}
        </div>

        {/* Timestamp */}
        <span className="text-[10px]" style={{ color: '#4b5563' }}>
          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {out && msg.status === 'failed' && (
            <span style={{ color: 'var(--danger)' }}> · Failed</span>
          )}
        </span>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────
export default function InboxTab() {
  const { activeClient } = useClientContext()

  const [threads, setThreads]   = useState<ThreadSummary[]>([])
  const [search, setSearch]     = useState('')
  const [activeThread, setActiveThread] = useState<ThreadSummary | null>(null)
  const [messages, setMessages] = useState<MsgRow[]>([])
  const [loadingThreads, setLoadingThreads] = useState(true)
  const [loadingMsgs, setLoadingMsgs]       = useState(false)

  const [replyBody, setReplyBody]   = useState('')
  const [sending, setSending]       = useState(false)
  const [sendErr, setSendErr]       = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [actionMsg, setActionMsg]   = useState<string | null>(null)

  const bottomRef   = useRef<HTMLDivElement>(null)
  const channelRef  = useRef<RealtimeChannel | null>(null)
  const { toast }   = useToast()

  // ── Load threads ───────────────────────────────────────────────
  const loadThreads = useCallback(async (clientId: string) => {
    setLoadingThreads(true)

    const { data: convos } = await supabase
      .from('conversations')
      .select('*')
      .eq('client_id', clientId)
      .order('last_message_at', { ascending: false })
      .limit(100)

    if (!convos) { setLoadingThreads(false); return }

    // For each conversation grab the latest message for preview + unread count
    const summaries: ThreadSummary[] = await Promise.all(
      convos.map(async (c: ConvoRow) => {
        const { data: latest } = await supabase
          .from('messages')
          .select('body, direction')
          .eq('client_id', clientId)
          .eq('caller_number', c.caller_number)
          .neq('status', 'scheduled')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        const { count: unread } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', clientId)
          .eq('caller_number', c.caller_number)
          .eq('direction', 'inbound')
          .gte('created_at', c.last_message_at) // approximate unread

        return {
          ...c,
          preview:     latest ? `${latest.direction === 'outbound' ? 'You: ' : ''}${latest.body}` : '',
          unreadCount: unread ?? 0,
        }
      }),
    )

    setThreads(summaries)
    setLoadingThreads(false)
  }, [])

  // ── Load messages for a thread ─────────────────────────────────
  async function loadMessages(clientId: string, callerNumber: string) {
    setLoadingMsgs(true)
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('client_id', clientId)
      .eq('caller_number', callerNumber)
      .neq('status', 'scheduled')
      .order('created_at', { ascending: true })
      .limit(200)
    setMessages((data ?? []) as MsgRow[])
    setLoadingMsgs(false)
  }

  // ── Realtime subscription ──────────────────────────────────────
  function subscribe(clientId: string) {
    if (channelRef.current) supabase.removeChannel(channelRef.current)

    const channel = supabase
      .channel(`inbox:${clientId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `client_id=eq.${clientId}` },
        payload => {
          const msg = payload.new as MsgRow
          if (msg.status === 'scheduled') return

          // Append if it belongs to the open thread
          setActiveThread(cur => {
            if (cur?.caller_number === msg.caller_number) {
              setMessages(prev => [...prev, msg])
            }
            return cur
          })

          // Refresh thread preview
          setThreads(prev =>
            prev.map(t => {
              if (t.client_id === clientId && t.caller_number === msg.caller_number) {
                return {
                  ...t,
                  preview:     `${msg.direction === 'outbound' ? 'You: ' : ''}${msg.body}`,
                  last_message_at: msg.created_at,
                  unreadCount: msg.direction === 'inbound' ? t.unreadCount + 1 : t.unreadCount,
                }
              }
              return t
            }).sort((a, b) =>
              new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime(),
            ),
          )
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `client_id=eq.${clientId}` },
        payload => {
          const updated = payload.new as ConvoRow
          setThreads(prev =>
            prev.map(t =>
              t.id === updated.id ? { ...t, ...updated } : t,
            ),
          )
          setActiveThread(cur =>
            cur?.id === updated.id ? { ...cur, ...updated } : cur,
          )
        },
      )
      .subscribe()

    channelRef.current = channel
  }

  useEffect(() => {
    if (!activeClient) return
    loadThreads(activeClient.id)
    subscribe(activeClient.id)
    setActiveThread(null)
    setMessages([])
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [activeClient?.id, loadThreads])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function openThread(thread: ThreadSummary) {
    setActiveThread(thread)
    setReplyBody('')
    setSendErr(null)
    setActionMsg(null)
    if (activeClient) loadMessages(activeClient.id, thread.caller_number)
    // Clear unread badge
    setThreads(prev => prev.map(t => t.id === thread.id ? { ...t, unreadCount: 0 } : t))
  }

  // ── Send reply ─────────────────────────────────────────────────
  async function handleSend(e: FormEvent) {
    e.preventDefault()
    if (!replyBody.trim() || !activeClient || !activeThread || sending) return

    setSending(true)
    setSendErr(null)

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token ?? ''

    try {
      await n8nPost(
        '/respondfall/send-inbox-reply',
        { conversationId: activeThread.id, message: replyBody.trim() },
        { Authorization: `Bearer ${token}` },
      )
      setReplyBody('')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Send failed — check Twilio configuration in Settings'
      setSendErr(msg)
      toast(msg, 'error')
    } finally {
      setSending(false)
    }
  }

  // ── Stop Sequence ──────────────────────────────────────────────
  async function handleStopSequence() {
    if (!activeClient || !activeThread || actionBusy) return
    setActionBusy(true)
    const { error } = await supabase
      .from('conversations')
      .update({ sequence_paused: true })
      .eq('client_id', activeClient.id)
      .eq('caller_number', activeThread.caller_number)
    setActionBusy(false)
    if (error) { toast(error.message, 'error'); return }
    setActionMsg('Sequence stopped.')
    toast('Sequence paused for this contact', 'info')
  }

  // ── Complete → Review ──────────────────────────────────────────
  async function handleReview() {
    if (!activeClient || !activeThread || actionBusy) return
    setActionBusy(true)
    setActionMsg(null)

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token ?? ''

    try {
      await n8nPost(
        '/respondfall/send-review-request',
        { conversationId: activeThread.id },
        { Authorization: `Bearer ${token}` },
      )
      setActionMsg('Review request sent! Referral scheduled for +30 min.')
      toast('Review request sent — referral queued for +30 min', 'success')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to send review request'
      setActionMsg(`Error: ${msg}`)
      toast(msg, 'error')
    } finally {
      setActionBusy(false)
    }
  }

  const filteredThreads = threads.filter(t =>
    search === '' || t.caller_number.includes(search.replace(/\D/g, '')),
  )

  if (!activeClient) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm" style={{ color: '#6b7280' }}>Select a client to view the inbox.</p>
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Thread list ─────────────────────────────────────────── */}
      <div
        className="w-72 shrink-0 flex flex-col border-r border-gray-800 overflow-hidden"
        style={{ background: 'var(--surface)' }}
      >
        {/* Search */}
        <div className="p-3 border-b border-gray-800">
          <input
            type="text"
            className="input-base text-xs"
            placeholder="Search by phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loadingThreads && (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="h-14 rounded-lg animate-pulse" style={{ background: '#1f2937' }} />
              ))}
            </div>
          )}

          {!loadingThreads && filteredThreads.length === 0 && (
            <div className="p-6 text-center">
              <p className="text-xs" style={{ color: '#6b7280' }}>
                {search ? 'No matching conversations.' : 'No conversations yet.'}
              </p>
            </div>
          )}

          {!loadingThreads && filteredThreads.map(thread => (
            <ThreadItem
              key={thread.id}
              thread={thread}
              active={activeThread?.id === thread.id}
              onClick={() => openThread(thread)}
            />
          ))}
        </div>
      </div>

      {/* ── Conversation ────────────────────────────────────────── */}
      {!activeThread ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              Select a conversation
            </p>
            <p className="text-xs" style={{ color: '#6b7280' }}>
              Choose a thread on the left to view messages.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* ── Action bar ── */}
          <div
            className="flex items-center justify-between px-5 py-3 border-b border-gray-800 shrink-0"
            style={{ background: 'var(--surface)' }}
          >
            <div className="space-y-0.5">
              <p className="text-sm font-semibold font-mono" style={{ color: 'var(--text)' }}>
                {formatPhone(activeThread.caller_number)}
              </p>
              <div className="flex items-center gap-2">
                {activeThread.intent && <IntentBadge intent={activeThread.intent} />}
                {activeThread.sequence_paused && (
                  <span className="badge badge-gray text-[9px]">Sequence paused</span>
                )}
                {activeThread.opted_out && (
                  <span className="badge badge-danger text-[9px]">Opted out</span>
                )}
                {activeThread.status === 'closed' && (
                  <span className="badge badge-gray text-[9px]">Closed</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {actionMsg && (
                <span
                  className="text-xs"
                  style={{ color: actionMsg.startsWith('Error') ? 'var(--danger)' : 'var(--brand)' }}
                >
                  {actionMsg}
                </span>
              )}
              <button
                type="button"
                onClick={handleStopSequence}
                disabled={actionBusy || activeThread.sequence_paused}
                className="btn-ghost text-xs px-3 py-2 border border-gray-700"
                style={{ opacity: activeThread.sequence_paused ? 0.4 : 1 }}
              >
                Stop Sequence
              </button>
              <button
                type="button"
                onClick={handleReview}
                disabled={actionBusy || activeThread.opted_out}
                className="btn-brand text-xs px-3 py-2"
                style={{ opacity: activeThread.opted_out ? 0.4 : 1 }}
              >
                {actionBusy ? 'Sending…' : 'Complete → Review'}
              </button>
            </div>
          </div>

          {/* ── Messages ── */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {loadingMsgs ? (
              <div className="space-y-3">
                {[1, 2, 3].map(n => (
                  <div
                    key={n}
                    className={`h-10 w-56 rounded-2xl animate-pulse ${n % 2 === 0 ? 'ml-auto' : ''}`}
                    style={{ background: '#1f2937' }}
                  />
                ))}
              </div>
            ) : messages.length === 0 ? (
              <p className="text-xs text-center py-8" style={{ color: '#6b7280' }}>
                No messages in this conversation yet.
              </p>
            ) : (
              messages.map(msg => <Bubble key={msg.id} msg={msg} />)
            )}
            <div ref={bottomRef} />
          </div>

          {/* ── Reply box ── */}
          <div
            className="px-4 py-3 border-t border-gray-800 shrink-0"
            style={{ background: 'var(--surface)' }}
          >
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                type="text"
                className="input-base flex-1 text-sm"
                placeholder={
                  activeThread.opted_out
                    ? 'Contact has opted out'
                    : 'Type a reply…'
                }
                disabled={activeThread.opted_out || sending}
                value={replyBody}
                onChange={e => { setReplyBody(e.target.value); setSendErr(null) }}
                maxLength={320}
              />
              <button
                type="submit"
                disabled={!replyBody.trim() || activeThread.opted_out || sending}
                className="btn-primary px-4 text-sm shrink-0"
              >
                {sending ? 'Sending…' : 'Send'}
              </button>
            </form>
            {sendErr && (
              <p className="mt-1.5 text-xs" style={{ color: 'var(--danger)' }}>{sendErr}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
