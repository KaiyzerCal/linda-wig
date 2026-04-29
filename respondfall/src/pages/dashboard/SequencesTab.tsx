import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useClientContext } from '@/contexts/ClientContext'

// ── Types ─────────────────────────────────────────────────────────
interface PerfStats {
  activeSequences: number
  totalConversations: number
  withIntent: number
  referralsGenerated: number
}

// ── Shared primitives ─────────────────────────────────────────────
function SectionCard({
  accent, title, badge, children,
}: {
  accent: string
  title: string
  badge: string
  children: React.ReactNode
}) {
  return (
    <div
      className="card overflow-hidden"
      style={{ borderColor: `${accent}30`, borderTopColor: accent, borderTopWidth: 2 }}
    >
      <div className="px-5 pt-4 pb-3 flex items-center gap-3 border-b border-gray-800">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{title}</h3>
        <span
          className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{ background: `${accent}18`, color: accent }}
        >
          {badge}
        </span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function MsgPreview({ body, vars }: { body: string; vars?: Record<string, string> }) {
  const rendered = vars
    ? body.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`)
    : body
  return (
    <div
      className="rounded-xl px-4 py-3 text-xs leading-relaxed"
      style={{ background: '#0a0b0f', border: '1px solid #1f2937', color: '#9ca3af' }}
    >
      {rendered}
    </div>
  )
}

// ── Section 1: Lead Qualification ─────────────────────────────────
function LeadQualificationSection() {
  const BLUE = '#2d7ff9'

  return (
    <SectionCard accent={BLUE} title="Lead Qualification Layer" badge="Auto-AI">
      <div className="space-y-4">
        {/* Flow nodes */}
        <div className="flex items-start gap-0">

          {/* Node 1 */}
          <div className="flex flex-col items-center">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
              style={{ background: `${BLUE}18`, border: `1.5px solid ${BLUE}40` }}
            >
              📲
            </div>
            <div className="w-px flex-1 mt-1" style={{ background: '#1f2937', minHeight: 32 }} />
          </div>
          <div className="ml-3 pt-1.5 pb-6 flex-1">
            <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>
              Inbound SMS received
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: '#6b7280' }}>
              Customer replies to your missed-call recovery text
            </p>
          </div>

        </div>

        <div className="flex items-start gap-0">
          {/* Node 2 */}
          <div className="flex flex-col items-center">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
              style={{ background: `${BLUE}18`, border: `1.5px solid ${BLUE}40` }}
            >
              🤖
            </div>
            <div className="w-px flex-1 mt-1" style={{ background: '#1f2937', minHeight: 32 }} />
          </div>
          <div className="ml-3 pt-1.5 pb-6 flex-1">
            <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>
              Claude Sonnet qualifies intent
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: '#6b7280' }}>
              Categorizes as <span style={{ color: BLUE }}>quote</span>,{' '}
              <span style={{ color: BLUE }}>service</span>, or{' '}
              <span style={{ color: BLUE }}>question</span> — replies instantly
            </p>
          </div>
        </div>

        {/* Route fork */}
        <div className="ml-5 grid grid-cols-3 gap-2">
          {[
            { label: 'Quote', desc: 'Booking link appended', icon: '📅', color: '#10b981' },
            { label: 'Service', desc: 'Booking link appended', icon: '🔧', color: BLUE },
            { label: 'Question', desc: 'Owner alerted via SMS', icon: '❓', color: '#fb923c' },
          ].map(r => (
            <div
              key={r.label}
              className="rounded-lg px-3 py-2.5 space-y-1"
              style={{ background: `${r.color}10`, border: `1px solid ${r.color}25` }}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{r.icon}</span>
                <span className="text-xs font-semibold" style={{ color: r.color }}>{r.label}</span>
              </div>
              <p className="text-[10px]" style={{ color: '#6b7280' }}>{r.desc}</p>
            </div>
          ))}
        </div>

        {/* Q2 contextual */}
        <div className="flex items-start gap-0 mt-2">
          <div className="flex flex-col items-center">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
              style={{ background: `${BLUE}18`, border: `1.5px solid ${BLUE}40` }}
            >
              💬
            </div>
          </div>
          <div className="ml-3 pt-1.5 flex-1">
            <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>
              Contextual follow-up replies
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: '#6b7280' }}>
              All subsequent replies in the thread use the detected intent as context — no re-qualification
            </p>
          </div>
        </div>
      </div>
    </SectionCard>
  )
}

// ── Section 2: Post-Job Review ────────────────────────────────────
function ReviewSection({ businessName, reviewLink }: { businessName: string; reviewLink: string | null }) {
  const GOLD = '#f59e0b'

  return (
    <SectionCard accent={GOLD} title="Post-Job Review Request" badge="1-tap trigger">
      <div className="space-y-4">

        {/* Trigger info */}
        <div
          className="flex items-start gap-3 rounded-lg px-4 py-3"
          style={{ background: `${GOLD}0d`, border: `1px solid ${GOLD}25` }}
        >
          <span className="text-lg mt-0.5">💡</span>
          <div>
            <p className="text-xs font-semibold" style={{ color: GOLD }}>How to trigger</p>
            <p className="text-[11px] mt-0.5" style={{ color: '#9ca3af' }}>
              Open the{' '}
              <span className="font-semibold" style={{ color: 'var(--text)' }}>Inbox tab</span>
              , select a conversation, then click{' '}
              <span
                className="inline font-semibold px-1.5 py-0.5 rounded text-[10px]"
                style={{ background: '#10b98120', color: '#10b981' }}
              >
                Complete → Review
              </span>
              . Review SMS fires immediately; referral queues +30 min later.
            </p>
          </div>
        </div>

        {/* Flow */}
        <div className="flex items-center gap-2 text-xs">
          {[
            { icon: '✅', label: 'Mark Complete' },
            { icon: '⏱', label: 'Immediate' },
            { icon: '⭐', label: 'Review SMS' },
          ].map((s, i) => (
            <div key={s.label} className="flex items-center gap-2">
              <div
                className="flex items-center gap-1.5 rounded-lg px-3 py-2"
                style={{ background: '#1f2937', border: '1px solid #374151' }}
              >
                <span>{s.icon}</span>
                <span style={{ color: 'var(--text)' }}>{s.label}</span>
              </div>
              {i < 2 && <span style={{ color: '#4b5563' }}>→</span>}
            </div>
          ))}
        </div>

        {/* Message preview */}
        <MsgPreview
          body="Thanks for choosing {business_name}! We'd really appreciate a quick review — it only takes 30 seconds: {google_review_link}"
          vars={{
            business_name: businessName,
            google_review_link: reviewLink || 'https://g.page/r/your-place/review',
          }}
        />

        {!reviewLink && (
          <p className="text-[11px]" style={{ color: '#fb923c' }}>
            ⚠ No Google review link set — add one in Settings → Revenue Multipliers.
          </p>
        )}
      </div>
    </SectionCard>
  )
}

// ── Section 3: Referral Automation ───────────────────────────────
function ReferralSection({ businessName }: { businessName: string }) {
  const RED = '#ef4444'

  const pipeline = [
    { label: 'SMS Sent',     icon: '📤', color: '#6b7280' },
    { label: 'Name Captured', icon: '📝', color: '#fb923c' },
    { label: 'Code Issued',  icon: '🎟',  color: RED },
    { label: 'Converted',    icon: '💰',  color: '#10b981' },
  ]

  return (
    <SectionCard accent={RED} title="Referral Automation" badge="+30 min after review">
      <div className="space-y-4">

        {/* Pipeline */}
        <div className="flex items-center justify-between gap-1">
          {pipeline.map((stage, i) => (
            <div key={stage.label} className="flex items-center gap-1 flex-1">
              <div
                className="flex-1 flex flex-col items-center gap-1 rounded-lg px-2 py-2.5"
                style={{ background: `${stage.color}12`, border: `1px solid ${stage.color}25` }}
              >
                <span className="text-base">{stage.icon}</span>
                <span className="text-[10px] font-medium text-center" style={{ color: stage.color }}>
                  {stage.label}
                </span>
              </div>
              {i < pipeline.length - 1 && (
                <span className="text-[10px] shrink-0" style={{ color: '#374151' }}>→</span>
              )}
            </div>
          ))}
        </div>

        {/* Flow timing */}
        <div className="flex items-center gap-2 text-xs">
          {[
            { icon: '✅', label: 'Mark Complete' },
            { icon: '⏱', label: '+30 min' },
            { icon: '🔗', label: 'Referral SMS' },
          ].map((s, i) => (
            <div key={s.label} className="flex items-center gap-2">
              <div
                className="flex items-center gap-1.5 rounded-lg px-3 py-2"
                style={{ background: '#1f2937', border: '1px solid #374151' }}
              >
                <span>{s.icon}</span>
                <span style={{ color: 'var(--text)' }}>{s.label}</span>
              </div>
              {i < 2 && <span style={{ color: '#4b5563' }}>→</span>}
            </div>
          ))}
        </div>

        {/* Referral ask */}
        <MsgPreview
          body={`Hey! Do you know anyone who could use help from ${businessName}? Reply with their name and we'll make sure to take great care of them — and you! 😊`}
        />

        {/* Code confirmation example */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium" style={{ color: '#6b7280' }}>
            When customer replies with a name:
          </p>
          <MsgPreview
            body={`Thanks for the referral! We'll reach out to [Name] soon. Your referral code is REF-K7MX2P — mention it on your next service for a discount!`}
          />
        </div>
      </div>
    </SectionCard>
  )
}

// ── Performance row ───────────────────────────────────────────────
function PerfRow({ stats, loading }: { stats: PerfStats; loading: boolean }) {
  const qualRate = stats.totalConversations > 0
    ? Math.round((stats.withIntent / stats.totalConversations) * 100)
    : 0

  const cards = [
    { label: 'Active Sequences', value: loading ? '—' : stats.activeSequences, accent: '#2d7ff9' },
    { label: 'Qualification Rate', value: loading ? '—' : `${qualRate}%`, accent: '#10b981' },
    { label: 'Booking Conversion', value: '—', sub: 'coming soon', accent: '#f59e0b' },
    { label: 'Referrals Generated', value: loading ? '—' : stats.referralsGenerated, accent: '#ef4444' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map(c => (
        <div
          key={c.label}
          className="card px-4 py-3 space-y-0.5"
          style={{ borderTopWidth: 2, borderTopColor: c.accent }}
        >
          <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#6b7280' }}>
            {c.label}
          </p>
          <p className="text-2xl font-bold tabular-nums" style={{ color: c.accent }}>
            {c.value}
          </p>
          {c.sub && <p className="text-[10px]" style={{ color: '#4b5563' }}>{c.sub}</p>}
        </div>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────
export default function SequencesTab() {
  const { activeClient } = useClientContext()
  const [stats, setStats]     = useState<PerfStats>({
    activeSequences: 0, totalConversations: 0, withIntent: 0, referralsGenerated: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeClient) return

    async function load() {
      setLoading(true)
      const clientId = activeClient!.id

      const [
        { count: active },
        { count: total },
        { count: withIntent },
        { count: referrals },
      ] = await Promise.all([
        supabase.from('conversations').select('*', { count: 'exact', head: true })
          .eq('client_id', clientId).eq('sequence_paused', false).eq('status', 'open'),
        supabase.from('conversations').select('*', { count: 'exact', head: true })
          .eq('client_id', clientId),
        supabase.from('conversations').select('*', { count: 'exact', head: true })
          .eq('client_id', clientId).not('intent', 'is', null),
        supabase.from('referrals').select('*', { count: 'exact', head: true })
          .eq('client_id', clientId),
      ])

      setStats({
        activeSequences:    active    ?? 0,
        totalConversations: total     ?? 0,
        withIntent:         withIntent ?? 0,
        referralsGenerated: referrals  ?? 0,
      })
      setLoading(false)
    }

    load()
  }, [activeClient?.id])

  if (!activeClient) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm" style={{ color: '#6b7280' }}>Select a client to view sequences.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-5">
      <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>
        Sequences — {activeClient.business_name}
      </h2>

      <LeadQualificationSection />
      <ReviewSection
        businessName={activeClient.business_name}
        reviewLink={activeClient.google_review_link}
      />
      <ReferralSection businessName={activeClient.business_name} />
      <PerfRow stats={stats} loading={loading} />
    </div>
  )
}
