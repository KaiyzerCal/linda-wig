import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useClientContext } from '@/contexts/ClientContext'

// ── Date helpers ──────────────────────────────────────────────────
function daysAgoISO(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

function startOfWeekISO() {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay()) // Sunday
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString()
}

function fmtDate(iso: string | null) {
  if (!iso) return 'Never'
  const d  = new Date(iso)
  const s  = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 60)    return `${s}s ago`
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return d.toLocaleDateString()
}

// ── Data shape ────────────────────────────────────────────────────
interface AnalyticsData {
  missed7:       number
  missed30:      number
  smsSent7:      number
  smsSent30:     number
  totalConvos:   number
  withIntent:    number
  optOutCount:   number
  weekMissed:    number
  weekSmsSent:   number
  lastMissedCall: string | null
  lastSuccessfulSend: string | null
  consecutiveFails: number
}

// ── Shared card ───────────────────────────────────────────────────
function Card({
  title, accent, children,
}: { title: string; accent?: string; children: React.ReactNode }) {
  return (
    <div
      className="card p-5 space-y-4"
      style={accent ? { borderTopWidth: 2, borderTopColor: accent } : {}}
    >
      <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6b7280' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

function StatPill({
  label, value, accent,
}: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-800 last:border-0">
      <span className="text-xs" style={{ color: '#9ca3af' }}>{label}</span>
      <span className="text-sm font-bold tabular-nums" style={{ color: accent ?? 'var(--text)' }}>
        {value}
      </span>
    </div>
  )
}

function HealthDot({ ok }: { ok: boolean }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full"
      style={{ background: ok ? 'var(--brand)' : 'var(--danger)' }}
    />
  )
}

// ── Main component ────────────────────────────────────────────────
export default function AnalyticsTab() {
  const { activeClient } = useClientContext()
  const [data, setData]       = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeClient) return

    async function load() {
      setLoading(true)
      const id = activeClient!.id

      const [
        { count: missed7 },
        { count: missed30 },
        { count: smsSent7 },
        { count: smsSent30 },
        { count: totalConvos },
        { count: withIntent },
        { count: optOutCount },
        { count: weekMissed },
        { count: weekSmsSent },
        { data: lastCall },
        { data: lastSend },
        { count: fails },
      ] = await Promise.all([
        supabase.from('missed_calls').select('*', { count: 'exact', head: true })
          .eq('client_id', id).gte('created_at', daysAgoISO(7)),
        supabase.from('missed_calls').select('*', { count: 'exact', head: true })
          .eq('client_id', id).gte('created_at', daysAgoISO(30)),
        supabase.from('messages').select('*', { count: 'exact', head: true })
          .eq('client_id', id).eq('direction', 'outbound').eq('status', 'sent')
          .gte('created_at', daysAgoISO(7)),
        supabase.from('messages').select('*', { count: 'exact', head: true })
          .eq('client_id', id).eq('direction', 'outbound').eq('status', 'sent')
          .gte('created_at', daysAgoISO(30)),
        supabase.from('conversations').select('*', { count: 'exact', head: true })
          .eq('client_id', id),
        supabase.from('conversations').select('*', { count: 'exact', head: true })
          .eq('client_id', id).not('intent', 'is', null),
        supabase.from('opt_outs').select('*', { count: 'exact', head: true })
          .eq('client_id', id),
        supabase.from('missed_calls').select('*', { count: 'exact', head: true })
          .eq('client_id', id).gte('created_at', startOfWeekISO()),
        supabase.from('messages').select('*', { count: 'exact', head: true })
          .eq('client_id', id).eq('direction', 'outbound').eq('status', 'sent')
          .gte('created_at', startOfWeekISO()),
        supabase.from('missed_calls').select('created_at')
          .eq('client_id', id).order('created_at', { ascending: false }).limit(1),
        supabase.from('messages').select('created_at')
          .eq('client_id', id).eq('direction', 'outbound').eq('status', 'sent')
          .order('created_at', { ascending: false }).limit(1),
        supabase.from('messages').select('*', { count: 'exact', head: true })
          .eq('client_id', id).eq('direction', 'outbound').eq('status', 'failed'),
      ])

      setData({
        missed7:       missed7    ?? 0,
        missed30:      missed30   ?? 0,
        smsSent7:      smsSent7   ?? 0,
        smsSent30:     smsSent30  ?? 0,
        totalConvos:   totalConvos  ?? 0,
        withIntent:    withIntent   ?? 0,
        optOutCount:   optOutCount  ?? 0,
        weekMissed:    weekMissed   ?? 0,
        weekSmsSent:   weekSmsSent  ?? 0,
        lastMissedCall:     (lastCall?.[0] as { created_at: string } | undefined)?.created_at ?? null,
        lastSuccessfulSend: (lastSend?.[0] as { created_at: string } | undefined)?.created_at ?? null,
        consecutiveFails:   fails ?? 0,
      })
      setLoading(false)
    }

    load()
  }, [activeClient?.id])

  if (!activeClient) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm" style={{ color: '#6b7280' }}>Select a client to view analytics.</p>
      </div>
    )
  }

  const avgJobValue    = activeClient.avg_job_value ?? 0
  const revenueProtected = (data?.missed30 ?? 0) * avgJobValue
  const roi            = avgJobValue > 0
    ? Math.round(((revenueProtected - 97) / 97) * 100) // assume $97/mo plan
    : null
  const qualRate       = data && data.totalConvos > 0
    ? Math.round((data.withIntent / data.totalConvos) * 100)
    : 0
  const twilioOk       = !!(activeClient.respondfall_number)

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-5">
      <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>
        Analytics — {activeClient.business_name}
      </h2>

      {/* ── Revenue hero ── */}
      <div
        className="card p-6 space-y-1"
        style={{ borderTopWidth: 3, borderTopColor: 'var(--orange)' }}
      >
        <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#6b7280' }}>
          Revenue Protected (30 days)
        </p>
        <p className="text-5xl font-black tabular-nums" style={{ color: 'var(--orange)' }}>
          {loading ? '—' : `$${revenueProtected.toLocaleString()}`}
        </p>
        <div className="flex items-center gap-4 pt-1">
          <p className="text-xs" style={{ color: '#6b7280' }}>
            {loading ? '…' : `${data?.missed30 ?? 0} missed calls × $${avgJobValue.toLocaleString()} avg job value`}
          </p>
          {roi !== null && !loading && (
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{
                background: roi >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                color: roi >= 0 ? 'var(--brand)' : 'var(--danger)',
              }}
            >
              {roi >= 0 ? '+' : ''}{roi}% ROI vs plan cost
            </span>
          )}
          {avgJobValue === 0 && (
            <span className="text-xs" style={{ color: '#fb923c' }}>
              Set avg job value in Settings to calculate revenue
            </span>
          )}
        </div>
      </div>

      {/* ── 2×2 stat grid ── */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: '7-Day Missed Calls',  value: data?.missed7,   accent: 'var(--danger)' },
          { label: '7-Day SMS Sent',      value: data?.smsSent7,  accent: 'var(--brand)' },
          { label: '30-Day Missed Calls', value: data?.missed30,  accent: 'var(--danger)' },
          { label: '30-Day SMS Sent',     value: data?.smsSent30, accent: 'var(--brand)' },
        ].map(c => (
          <div
            key={c.label}
            className="card px-4 py-3 space-y-0.5"
            style={{ borderTopWidth: 2, borderTopColor: c.accent }}
          >
            <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#6b7280' }}>
              {c.label}
            </p>
            <p className="text-3xl font-bold tabular-nums" style={{ color: c.accent }}>
              {loading ? '—' : (c.value ?? 0)}
            </p>
          </div>
        ))}
      </div>

      {/* ── Weekly report ── */}
      <Card title="Weekly Report" accent="var(--blue)">
        <div className="space-y-1">
          <div
            className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg mb-3"
            style={{ background: 'rgba(45,127,249,0.08)', border: '1px solid rgba(45,127,249,0.2)' }}
          >
            <span>📅</span>
            <span style={{ color: '#9ca3af' }}>
              Auto-sent every Monday — configure recipient in Settings → Notifications
            </span>
          </div>

          <p className="text-xs font-semibold mb-2" style={{ color: '#9ca3af' }}>
            This week so far
          </p>
          <StatPill label="Missed calls"   value={loading ? '—' : (data?.weekMissed ?? 0)}  accent="var(--danger)" />
          <StatPill label="SMS sent"       value={loading ? '—' : (data?.weekSmsSent ?? 0)} accent="var(--brand)" />
          <StatPill label="Qualification rate" value={loading ? '—' : `${qualRate}%`}       accent="var(--blue)" />
          <StatPill
            label="Revenue protected"
            value={loading || avgJobValue === 0 ? '—' : `$${((data?.weekMissed ?? 0) * avgJobValue).toLocaleString()}`}
            accent="var(--orange)"
          />
        </div>
      </Card>

      {/* ── TCPA compliance ── */}
      <Card title="TCPA Compliance">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <HealthDot ok />
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              STOP keyword honored
            </span>
          </div>
          <p className="text-xs pl-4" style={{ color: '#6b7280' }}>
            Respondfall automatically opts out any contact that replies STOP, UNSUBSCRIBE, CANCEL,
            QUIT, or END. Opted-out contacts are permanently blocked from all future messages.
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-gray-800">
            <span className="text-xs" style={{ color: '#9ca3af' }}>Total opt-outs</span>
            <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>
              {loading ? '—' : (data?.optOutCount ?? 0)}
            </span>
          </div>
        </div>
      </Card>

      {/* ── System health ── */}
      <Card title="System Health">
        <div className="space-y-2">
          <StatPill
            label="Last missed call recorded"
            value={loading ? '—' : fmtDate(data?.lastMissedCall ?? null)}
          />
          <StatPill
            label="Last successful SMS sent"
            value={loading ? '—' : fmtDate(data?.lastSuccessfulSend ?? null)}
          />
          <StatPill
            label="Failed sends (all time)"
            value={loading ? '—' : (data?.consecutiveFails ?? 0)}
            accent={data && data.consecutiveFails > 0 ? 'var(--danger)' : undefined}
          />

          <div className="flex items-center justify-between pt-2 border-t border-gray-800">
            <span className="text-xs" style={{ color: '#9ca3af' }}>Twilio number provisioned</span>
            <div className="flex items-center gap-1.5">
              <HealthDot ok={twilioOk} />
              <span
                className="text-xs font-semibold"
                style={{ color: twilioOk ? 'var(--brand)' : 'var(--danger)' }}
              >
                {twilioOk ? activeClient.respondfall_number : 'Not provisioned'}
              </span>
            </div>
          </div>

          {!twilioOk && (
            <p className="text-xs" style={{ color: '#fb923c' }}>
              No Twilio number provisioned — go to Settings → Phone Numbers to claim one.
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}
