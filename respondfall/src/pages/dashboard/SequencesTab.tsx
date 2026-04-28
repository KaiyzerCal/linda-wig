import { clsx } from 'clsx'
import { ArrowRight, Star, Heart, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { useState } from 'react'
import { Client } from '../../lib/supabase'

function SequenceStep({ icon, trigger, message, outcome }: {
  icon: React.ReactNode
  trigger: string
  message: string
  outcome?: React.ReactNode
}) {
  return (
    <div className="flex gap-4 py-4 first:pt-0">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-white/5 border border-subtle flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="w-px flex-1 bg-subtle mt-2" />
      </div>
      <div className="flex-1 pb-4">
        <p className="text-xs text-text-secondary mb-1.5">{trigger}</p>
        <div className="bg-bg-secondary rounded-xl px-4 py-3 border border-subtle text-sm text-text-primary">
          {message}
        </div>
        {outcome && <div className="mt-3">{outcome}</div>}
      </div>
    </div>
  )
}

function SequenceCard({ title, subtitle, borderColor, icon, children, performance }: {
  title: string
  subtitle: string
  borderColor: string
  icon: React.ReactNode
  children: React.ReactNode
  performance?: React.ReactNode
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className={clsx('bg-card rounded-xl border border-subtle overflow-hidden border-l-4', borderColor)}>
      <button onClick={() => setOpen(o => !o)} className="w-full px-6 py-4 flex items-start gap-3 text-left hover:bg-white/[0.02] transition-colors">
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">{icon}</div>
        <div className="flex-1">
          <h3 className="text-sm font-bold font-heading text-text-primary">{title}</h3>
          <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-text-secondary" /> : <ChevronDown className="w-4 h-4 text-text-secondary" />}
      </button>
      {open && (
        <div className="px-6 pb-4 border-t border-subtle">
          <div className="pt-4">{children}</div>
          {performance}
        </div>
      )}
    </div>
  )
}

export function SequencesTab({ client }: { client: Client }) {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      {/* Lead Qualification */}
      <SequenceCard
        title="Lead Qualification Layer"
        subtitle="Activates when a caller replies to the recovery sequence. Categorises intent in 2 messages then auto-routes to booking or owner notification."
        borderColor="border-l-accent-blue"
        icon={<span className="text-accent-blue text-xs font-bold">Q</span>}
      >
        <SequenceStep
          icon={<div className="w-2 h-2 rounded-full bg-danger" />}
          trigger="Triggers on first inbound reply"
          message={`Thanks for reaching out to ${client.business_name}! To help you faster, what brings you in?`}
          outcome={
            <div className="flex gap-2 flex-wrap">
              {['Get a Quote', 'Book a Service', 'Ask a Question'].map(opt => (
                <span key={opt} className="text-xs bg-accent-blue/10 text-accent-blue border border-accent-blue/20 px-3 py-1 rounded-full">{opt}</span>
              ))}
            </div>
          }
        />
        <SequenceStep
          icon={<div className="w-2 h-2 rounded-full bg-danger" />}
          trigger="After reason selected — contextual follow-up"
          message="Great — can you briefly describe what you need? (e.g., 'roof repair estimate' or 'AC maintenance')"
        />
        <SequenceStep
          icon={<ArrowRight className="w-3.5 h-3.5 text-text-secondary" />}
          trigger="After follow-up answered — auto-route"
          message={`Got it! Here's your next step: Quote/Service → booking link sent • Question → owner notified instantly`}
          outcome={
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Quote', action: 'Booking Link', color: 'text-accent-blue border-accent-blue/30 bg-accent-blue/10' },
                { label: 'Service', action: 'Booking Link', color: 'text-success border-success/30 bg-success/10' },
                { label: 'Question', action: 'Owner alert', color: 'text-warning border-warning/30 bg-warning/10' },
              ].map(({ label, action, color }) => (
                <div key={label} className={clsx('rounded-xl px-3 py-2.5 border text-center', color)}>
                  <p className="text-xs font-semibold">{label}</p>
                  <p className="text-[10px] opacity-80 mt-0.5">→ {action}</p>
                </div>
              ))}
            </div>
          }
        />
      </SequenceCard>

      {/* Post-Job Review */}
      <SequenceCard
        title="Post-Job Review Request"
        subtitle="The flywheel is active: Mark a job complete → review request fires 2 hours later → more 5-star reviews → higher Google ranking → more calls to capture."
        borderColor="border-l-warning"
        icon={<Star className="w-4 h-4 text-warning" />}
      >
        <SequenceStep
          icon={<Star className="w-3.5 h-3.5 text-warning" />}
          trigger="Fires 2 hours after 'Mark Job Complete'"
          message={`Thanks for choosing ${client.business_name}! If we did a great job today, a quick Google review means the world to us: ${client.google_review_link ?? '{google_review_link}'} — only takes 30 seconds!`}
        />
        <div className="flex items-start gap-2.5 bg-success/10 border border-success/20 rounded-xl px-4 py-3 mt-2">
          <Info className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
          <p className="text-xs text-success">Go to Inbox → tap 'Mark Complete → Send Review Request' on any conversation to trigger this.</p>
        </div>
      </SequenceCard>

      {/* Referral */}
      <SequenceCard
        title="Referral Automation"
        subtitle="Triggers after job completion. Turns every happy customer into a referral source with unique tracking codes and automatic outreach."
        borderColor="border-l-danger"
        icon={<Heart className="w-4 h-4 text-danger" />}
      >
        <SequenceStep
          icon={<div className="w-2 h-2 rounded-full bg-warning" />}
          trigger="30 min after 'Mark Job Complete'"
          message={`Thanks for choosing ${client.business_name}! Know someone who could use our help? Reply with their name and we'll take care of the rest — you're helping them get great service.`}
        />
        <SequenceStep
          icon={<div className="w-2 h-2 rounded-full bg-danger" />}
          trigger="After referral name received"
          message="Awesome, thanks! We'll reach out to [Name]. Your unique referral code is REF-XXXXXX — we'll let you know when they book."
        />
        <div className="mt-2">
          <p className="text-xs text-text-secondary mb-2">Referral Pipeline</p>
          <div className="flex items-center gap-2 flex-wrap">
            {['SMS Sent', 'Name Captured', 'Code Issued', 'Converted'].map((step, i, arr) => (
              <div key={step} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-white/5 border border-subtle rounded-lg px-2.5 py-1.5">
                  <div className="w-2 h-2 rounded-full bg-accent-blue" />
                  <span className="text-xs text-text-secondary">{step}</span>
                </div>
                {i < arr.length - 1 && <ArrowRight className="w-3 h-3 text-text-secondary/40" />}
              </div>
            ))}
          </div>
        </div>
      </SequenceCard>

      {/* Performance */}
      <div className="bg-card rounded-xl border border-subtle p-5">
        <h3 className="text-sm font-bold font-heading text-text-primary mb-4">Sequence Performance</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Active Sequences', value: '—' },
            { label: 'Qualification Rate', value: '72%', color: 'text-success' },
            { label: 'Booking Conversion', value: '38%', color: 'text-accent-blue' },
            { label: 'Referrals Generated', value: '12', color: 'text-warning' },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center">
              <p className={clsx('text-2xl font-bold font-heading', color ?? 'text-text-primary')}>{value}</p>
              <p className="text-xs text-text-secondary mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
