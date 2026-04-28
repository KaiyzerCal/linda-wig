import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useClientContext } from '@/contexts/ClientContext'
import type { RealtimeChannel } from '@supabase/supabase-js'

// ── Types ─────────────────────────────────────────────────────────
interface MissedCallRow {
  id: string
  client_id: string
  caller_number: string
  call_sid: string
  sequence_triggered: boolean
  created_at: string
}

interface MessageRow {
  id: string
  client_id: string
  caller_number: string
  direction: 'inbound' | 'outbound'
  body: string
  sequence_step: number | null
  message_type: string
  ai_generated: boolean
  status: string
  created_at: string
}

type FeedEventType = 'missed_call' | 'sms_sent' | 'sms_received'

interface FeedEvent {
  id: string
  type: FeedEventType
  callerNumber: string
  timestamp: string
  body?: string
  sequenceStep?: number | null
  aiGenerated?: boolean
}

interface Stats {
  missedToday: number
  smsSentToday: number
  missed30Days: number
  revenueProtected: number
}

// ── Helpers ───────────────────────────────────────────────────────
function startOfDay(): string {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString()
}

function startOf30Days(): string {
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
}

function formatPhone(p: string) {
  const d = p.replace(/\D/g, '')
  if (d.length === 11 && d[0] === '1') {
    return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`
  }
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  return p
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60)  return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return new Date(iso).toLocaleDateString()
}

function missedCallToEvent(r: MissedCallRow): FeedEvent {
  return { id: `mc-${r.id}`, type: 'missed_call', callerNumber: r.caller_number, timestamp: r.created_at }
}

function messageToEvent(r: MessageRow): FeedEvent {
  return {
    id:           `msg-${r.id}`,
    type:         r.direction === 'inbound' ? 'sms_received' : 'sms_sent',
    callerNumber: r.caller_number,
    timestamp:    r.created_at,
    body:         r.body,
    sequenceStep: r.sequence_step,
    aiGenerated:  r.ai_generated,
  }
}

function mergeSorted(a: FeedEvent[], b: FeedEvent[]): FeedEvent[] {
  return [...a, ...b].sort((x, y) =>
    new Date(y.timestamp).getTime() - new Date(x.timestamp).getTime(),
  )
}

// ── Stat card ─────────────────────────────────────────────────────
function StatCard({
  label, value, sub, accent,
}: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div
      className="card px-4 py-3 flex flex-col gap-0.5"
      style={accent ? { borderColor: `${accent}33` } : {}}
    >
      <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#6b7280' }}>
        {label}
      </span>
      <span className="text-2xl font-bold tabular-nums" style={{ color: accent ?? 'var(--text)' }}>
        {value}
      </span>
      {sub && <span className="text-[10px]" style={{ color: '#6b7280' }}>{sub}</span>}
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────────
function EventBadge({ type }: { type: FeedEventType }) {
  const map: Record<FeedEventType, { label: string; color: string; bg: string }> = {
    missed_call:  { label: 'MISSED', color: 'var(--danger)', bg: 'rgba(239,68,68,0.12)' },
    sms_sent:     { label: 'SENT',   color: 'var(--brand)',  bg: 'rgba(16,185,129,0.12)' },
    sms_received: { label: 'REPLY',  color: 'var(--blue)',   bg: 'rgba(45,127,249,0.12)' },
  }
  const { label, color, bg } = map[type]
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold tracking-widest"
      style={{ color, background: bg }}
    >
      {label}
    </span>
  )
}

// ── Main component ────────────────────────────────────────────────
export default function ActivityTab() {
  const { activeClient } = useClientContext()
  const [events, setEvents]   = useState<FeedEvent[]>([])
  const [stats, setStats]     = useState<Stats>({ missedToday: 0, smsSentToday: 0, missed30Days: 0, revenueProtected: 0 })
  const [loading, setLoading] = useState(true)
  const channelRef            = useRef<RealtimeChannel | null>(null)

  async function loadData(clientId: string, avgJobValue: number | null) {
    setLoading(true)

    const todayISO   = startOfDay()
    const thirtyISO  = startOf30Days()

    const [
      { data: missedCalls },
      { data: messages },
      { data: missedToday },
      { data: smsSentToday },
      { data: missed30 },
    ] = await Promise.all([
      supabase.from('missed_calls').select('*').eq('client_id', clientId).order('created_at', { ascending: false }).limit(100),
      supabase.from('messages').select('*').eq('client_id', clientId).neq('status', 'scheduled').order('created_at', { ascending: false }).limit(200),
      supabase.from('missed_calls').select('id', { count: 'exact', head: true }).eq('client_id', clientId).gte('created_at', todayISO),
      supabase.from('messages').select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('direction', 'outbound').neq('status', 'scheduled').gte('created_at', todayISO),
      supabase.from('missed_calls').select('id', { count: 'exact', head: true }).eq('client_id', clientId).gte('created_at', thirtyISO),
    ])

    const mcEvents  = (missedCalls ?? []).map(r => missedCallToEvent(r as MissedCallRow))
    const msgEvents = (messages ?? []).map(r => messageToEvent(r as MessageRow))
    setEvents(mergeSorted(mcEvents, msgEvents))

    const m30 = missed30?.length ?? 0
    setStats({
      missedToday:     missedToday?.length ?? 0,
      smsSentToday:    smsSentToday?.length ?? 0,
      missed30Days:    m30,
      revenueProtected: m30 * (avgJobValue ?? 0),
    })

    setLoading(false)
  }

  // Realtime subscription
  function subscribe(clientId: string) {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase
      .channel(`activity:${clientId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'missed_calls', filter: `client_id=eq.${clientId}` },
        payload => {
          const ev = missedCallToEvent(payload.new as MissedCallRow)
          setEvents(prev => [ev, ...prev])
          setStats(s => ({
            ...s,
            missedToday:  s.missedToday + 1,
            missed30Days: s.missed30Days + 1,
            revenueProtected: (s.missed30Days + 1) * (activeClient?.avg_job_value ?? 0),
          }))
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `client_id=eq.${clientId}` },
        payload => {
          const row = payload.new as MessageRow
          if (row.status === 'scheduled') return
          const ev = messageToEvent(row)
          setEvents(prev => [ev, ...prev])
          if (row.direction === 'outbound') {
            setStats(s => ({ ...s, smsSentToday: s.smsSentToday + 1 }))
          }
        },
      )
      .subscribe()

    channelRef.current = channel
  }

  useEffect(() => {
    if (!activeClient) return
    loadData(activeClient.id, activeClient.avg_job_value)
    subscribe(activeClient.id)
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [activeClient?.id])

  if (!activeClient) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm" style={{ color: '#6b7280' }}>Select a client to view activity.</p>
      </div>
    )
  }

  return (
    <div className="px-6 py-8 space-y-6 max-w-3xl mx-auto">

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Missed Today"    value={stats.missedToday}  accent="var(--danger)" />
        <StatCard label="SMS Sent Today"  value={stats.smsSentToday} accent="var(--brand)" />
        <StatCard label="Missed 30 Days"  value={stats.missed30Days} />
        <StatCard
          label="Revenue Protected"
          value={`$${stats.revenueProtected.toLocaleString()}`}
          sub={activeClient.avg_job_value ? `${stats.missed30Days} × $${activeClient.avg_job_value}` : 'Set avg job value'}
          accent="var(--orange)"
        />
      </div>

      {/* ── Feed ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6b7280' }}>
            Activity Feed
          </h3>
          <span className="text-[10px]" style={{ color: '#4b5563' }}>
            Live · auto-updates
          </span>
        </div>

        {loading && (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(n => (
              <div key={n} className="h-14 rounded-lg animate-pulse" style={{ background: '#111827' }} />
            ))}
          </div>
        )}

        {!loading && events.length === 0 && (
          <div className="card px-5 py-10 text-center space-y-2">
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              No activity yet
            </p>
            <p className="text-xs" style={{ color: '#6b7280' }}>
              Events will appear here as missed calls and messages come in.
            </p>
          </div>
        )}

        {!loading && events.map(ev => (
          <div
            key={ev.id}
            className="card px-4 py-3 flex items-start gap-3"
          >
            {/* Left: badge + phone */}
            <div className="flex flex-col gap-1 min-w-[110px] shrink-0">
              <EventBadge type={ev.type} />
              <span className="font-mono text-xs font-semibold" style={{ color: 'var(--text)' }}>
                {formatPhone(ev.callerNumber)}
              </span>
            </div>

            {/* Center: description */}
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-xs" style={{ color: '#9ca3af' }}>
                {ev.type === 'missed_call' && 'Missed call — SMS sequence triggered'}
                {ev.type === 'sms_sent' && (
                  <>
                    SMS sent
                    {ev.sequenceStep != null && (
                      <span
                        className="ml-1.5 badge badge-gray"
                        style={{ verticalAlign: 'middle' }}
                      >
                        Step {ev.sequenceStep}
                      </span>
                    )}
                    {ev.aiGenerated && (
                      <span className="ml-1.5 badge badge-blue" style={{ verticalAlign: 'middle' }}>
                        AI
                      </span>
                    )}
                  </>
                )}
                {ev.type === 'sms_received' && (
                  <>
                    Inbound reply
                    {ev.aiGenerated && (
                      <span className="ml-1.5 badge badge-blue" style={{ verticalAlign: 'middle' }}>
                        AI
                      </span>
                    )}
                  </>
                )}
              </p>

              {ev.body && (
                <p
                  className="text-xs truncate rounded px-2 py-1"
                  style={{
                    background: '#1a2030',
                    borderLeft: '2px solid #374151',
                    color: '#9ca3af',
                    fontStyle: 'italic',
                  }}
                  title={ev.body}
                >
                  {ev.body}
                </p>
              )}
            </div>

            {/* Right: time */}
            <span
              className="text-[10px] shrink-0 tabular-nums pt-0.5"
              style={{ color: '#4b5563' }}
            >
              {timeAgo(ev.timestamp)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
