import { useEffect, useState } from 'react'
import { supabase, Client, Message, MissedCall } from '../../lib/supabase'
import { StatCard } from '../../components/ui/StatCard'
import { Badge } from '../../components/ui/Badge'
import { Phone, MessageSquare, ArrowDownLeft, Voicemail, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { clsx } from 'clsx'

type ActivityItem =
  | { type: 'missed_call'; data: MissedCall }
  | { type: 'message'; data: Message }

export function ActivityTab({ client }: { client: Client }) {
  const [items, setItems] = useState<ActivityItem[]>([])
  const [stats, setStats] = useState({ missedToday: 0, smsSentToday: 0, missed30: 0, smsSent30: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAll()

    const msgChannel = supabase.channel(`activity-messages:${client.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `client_id=eq.${client.id}` },
        (payload) => {
          setItems(prev => [{ type: 'message', data: payload.new as Message }, ...prev])
        })
      .subscribe()

    const callChannel = supabase.channel(`activity-calls:${client.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'missed_calls', filter: `client_id=eq.${client.id}` },
        (payload) => {
          setItems(prev => [{ type: 'missed_call', data: payload.new as MissedCall }, ...prev])
          setStats(s => ({ ...s, missedToday: s.missedToday + 1, missed30: s.missed30 + 1 }))
        })
      .subscribe()

    return () => {
      supabase.removeChannel(msgChannel)
      supabase.removeChannel(callChannel)
    }
  }, [client.id])

  async function fetchAll() {
    setLoading(true)
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const days30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [messages, missedCalls, missedToday, smsSentToday, missed30, smsSent30] = await Promise.all([
      supabase.from('messages').select('*').eq('client_id', client.id).order('created_at', { ascending: false }).limit(100),
      supabase.from('missed_calls').select('*').eq('client_id', client.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('missed_calls').select('*', { count: 'exact', head: true }).eq('client_id', client.id).gte('created_at', todayStart),
      supabase.from('messages').select('*', { count: 'exact', head: true }).eq('client_id', client.id).eq('direction', 'outbound').gte('created_at', todayStart),
      supabase.from('missed_calls').select('*', { count: 'exact', head: true }).eq('client_id', client.id).gte('created_at', days30Ago),
      supabase.from('messages').select('*', { count: 'exact', head: true }).eq('client_id', client.id).eq('direction', 'outbound').gte('created_at', days30Ago),
    ])

    const combined: ActivityItem[] = [
      ...(messages.data ?? []).map(m => ({ type: 'message' as const, data: m })),
      ...(missedCalls.data ?? []).map(c => ({ type: 'missed_call' as const, data: c })),
    ].sort((a, b) => new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime())

    setItems(combined.slice(0, 100))
    setStats({
      missedToday: missedToday.count ?? 0,
      smsSentToday: smsSentToday.count ?? 0,
      missed30: missed30.count ?? 0,
      smsSent30: smsSent30.count ?? 0,
    })
    setLoading(false)
  }

  const revenueProtected = stats.missed30 * client.avg_job_value

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Missed Today" value={stats.missedToday} accent="red" />
        <StatCard label="SMS Sent Today" value={stats.smsSentToday} accent="green" />
        <StatCard
          label="Missed · 30 Days"
          value={stats.missed30}
          sub={`${stats.smsSent30} SMS total`}
          accent="blue"
        />
        <StatCard
          label="Revenue Protected"
          value={`$${revenueProtected.toLocaleString()}`}
          sub={`${stats.missed30} × $${client.avg_job_value}`}
          accent="orange"
        />
      </div>

      {/* Feed */}
      <div className="bg-card border border-subtle rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-subtle">
          <h2 className="text-sm font-semibold text-text-primary">Activity Feed</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-text-secondary text-sm">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-text-secondary text-sm">No activity yet. Calls will appear here in real-time.</div>
        ) : (
          <div className="divide-y divide-subtle">
            {items.map((item, idx) => (
              <ActivityRow key={idx} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ActivityRow({ item }: { item: ActivityItem }) {
  if (item.type === 'missed_call') {
    const call = item.data
    return (
      <div className="flex items-start gap-4 px-5 py-4 hover:bg-white/[0.02] group">
        <div className="w-8 h-8 rounded-full bg-danger/15 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Phone className="w-4 h-4 text-danger" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-text-primary">{call.caller_number}</span>
            <Badge variant="missed">MISSED</Badge>
            {call.sequence_triggered && (
              <span className="text-[10px] text-text-secondary">sequence triggered</span>
            )}
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Missed call (no-answer){call.voicemail_url ? ' · voicemail left' : ''}
          </p>
          {call.voicemail_url && (
            <button className="flex items-center gap-1 text-xs text-accent-blue mt-1 hover:text-accent-blue-light">
              <Voicemail className="w-3 h-3" />
              Play voicemail
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-text-secondary">
            {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}
          </span>
          <button className="opacity-0 group-hover:opacity-100 transition-opacity text-danger hover:text-danger/70">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    )
  }

  const msg = item.data
  const isOutbound = msg.direction === 'outbound'

  return (
    <div className="flex items-start gap-4 px-5 py-4 hover:bg-white/[0.02] group">
      <div className={clsx(
        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
        isOutbound ? 'bg-success/15' : 'bg-accent-blue/15'
      )}>
        {isOutbound
          ? <MessageSquare className="w-4 h-4 text-success" />
          : <ArrowDownLeft className="w-4 h-4 text-accent-blue" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-text-primary">{msg.caller_number}</span>
          {isOutbound ? (
            <>
              {msg.sequence_step && (
                <span className="text-[10px] text-text-secondary bg-white/5 px-1.5 py-0.5 rounded">Step {msg.sequence_step}</span>
              )}
              {msg.ai_generated && (
                <span className="text-[10px] text-accent-blue bg-accent-blue/10 px-1.5 py-0.5 rounded">· AI</span>
              )}
              <Badge variant="sent">SENT</Badge>
            </>
          ) : (
            <Badge variant="default">RECEIVED</Badge>
          )}
        </div>
        <p className="text-xs text-text-secondary mt-0.5 truncate">{msg.body}</p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-xs text-text-secondary">
          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
        </span>
        <button className="opacity-0 group-hover:opacity-100 transition-opacity text-danger hover:text-danger/70">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
