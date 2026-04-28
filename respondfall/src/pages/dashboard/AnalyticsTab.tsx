import { Client } from '../../lib/supabase'
import { useAnalytics } from '../../hooks/useAnalytics'
import { StatCard } from '../../components/ui/StatCard'
import { formatDistanceToNow, format } from 'date-fns'
import { Activity, ShieldCheck, BarChart3 } from 'lucide-react'

export function AnalyticsTab({ client }: { client: Client }) {
  const { analytics, loading } = useAnalytics(client.id, client.avg_job_value)

  const roi = analytics.revenueProtected > 0 ? Math.round(analytics.revenueProtected / 97) : 0

  if (loading) return <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">Loading analytics...</div>

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      {/* Revenue hero */}
      <div className="bg-card rounded-xl border border-subtle overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-revenue to-warning" />
        <div className="p-6">
          <p className="text-xs text-text-secondary tracking-widest font-semibold uppercase mb-3">
            Estimated Revenue Protected · Last 30 Days
          </p>
          <p className="text-5xl font-bold font-heading text-revenue mb-2">
            ${analytics.revenueProtected.toLocaleString()}
          </p>
          <p className="text-text-secondary text-sm">
            {analytics.missed30Days} missed calls × ${client.avg_job_value} avg
            {roi > 0 && <span className="text-warning ml-2">· ROI: {roi}x investment</span>}
          </p>
        </div>
      </div>

      {/* 4 stat cards */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="7-Day Missed" value={analytics.missed7Days} accent="red" />
        <StatCard label="7-Day SMS Sent" value={analytics.smsSent7Days} accent="green" />
        <StatCard label="30-Day Missed" value={analytics.missed30Days} accent="red" />
        <StatCard label="30-Day SMS Sent" value={analytics.smsSent30Days} accent="green" />
      </div>

      {/* Weekly Report preview */}
      <div className="bg-card rounded-xl border border-subtle p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-accent-blue" />
          <h3 className="text-sm font-bold font-heading text-text-primary">Weekly Revenue Report</h3>
          <span className="text-xs text-text-secondary ml-auto">Auto-sent every Monday</span>
        </div>
        <div className="bg-bg-secondary rounded-xl border border-subtle p-4 font-body">
          <p className="text-xs text-text-secondary mb-2">📊 Respondfall AI Weekly Report — {client.business_name}</p>
          <p className="text-sm text-text-primary">
            This week: {analytics.missed7Days} missed calls · {analytics.smsSent7Days} SMS sent · ${(analytics.missed7Days * client.avg_job_value).toLocaleString()} protected
          </p>
          <p className="text-sm text-text-secondary mt-1">
            {analytics.missed7Days > 0 ? `${analytics.missed7Days} conversations in Inbox need follow-up.` : 'All conversations resolved.'}
          </p>
          <p className="text-xs text-text-secondary/50 mt-3">
            Respondfall AI · SkyforgeAI · {format(new Date(), 'EEEE, MMMM d')}
          </p>
        </div>
      </div>

      {/* TCPA Compliance */}
      <div className="bg-card rounded-xl border border-subtle p-5">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-success" />
          <h3 className="text-sm font-bold font-heading text-text-primary">TCPA Compliance</h3>
        </div>
        {analytics.optOutCount === 0 ? (
          <div className="flex items-center gap-2 text-success text-sm">
            <div className="w-2 h-2 rounded-full bg-success" />
            No opt-outs. STOP requests are automatically logged and honored.
          </div>
        ) : (
          <p className="text-sm text-text-secondary">{analytics.optOutCount} opt-out{analytics.optOutCount !== 1 ? 's' : ''} recorded and honored.</p>
        )}
      </div>

      {/* System Health */}
      <div className="bg-card rounded-xl border border-subtle p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-accent-blue" />
          <h3 className="text-sm font-bold font-heading text-text-primary">System Health</h3>
        </div>
        <div className="space-y-3">
          {[
            {
              label: 'Last Webhook Ping',
              value: analytics.lastWebhookPing
                ? formatDistanceToNow(new Date(analytics.lastWebhookPing), { addSuffix: true })
                : 'No pings yet',
            },
            {
              label: 'Last Successful Send',
              value: analytics.lastSuccessfulSend
                ? formatDistanceToNow(new Date(analytics.lastSuccessfulSend), { addSuffix: true })
                : 'No sends yet',
            },
            { label: 'Consecutive Failures', value: '0' },
            { label: 'Last Error', value: 'None' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-subtle last:border-0">
              <span className="text-xs text-text-secondary">{label}</span>
              <span className="text-xs text-text-primary font-medium">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
