import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { startOfDay, subDays } from 'date-fns'

export type Analytics = {
  missedToday: number
  smsSentToday: number
  missed30Days: number
  smsSent30Days: number
  missed7Days: number
  smsSent7Days: number
  revenueProtected: number
  optOutCount: number
  lastWebhookPing: string | null
  lastSuccessfulSend: string | null
}

export function useAnalytics(clientId: string | null, avgJobValue: number) {
  const [analytics, setAnalytics] = useState<Analytics>({
    missedToday: 0,
    smsSentToday: 0,
    missed30Days: 0,
    smsSent30Days: 0,
    missed7Days: 0,
    smsSent7Days: 0,
    revenueProtected: 0,
    optOutCount: 0,
    lastWebhookPing: null,
    lastSuccessfulSend: null,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clientId) { setLoading(false); return }
    fetchAnalytics()
  }, [clientId, avgJobValue])

  async function fetchAnalytics() {
    setLoading(true)
    const now = new Date()
    const todayStart = startOfDay(now).toISOString()
    const days30Ago = subDays(now, 30).toISOString()
    const days7Ago = subDays(now, 7).toISOString()

    const [
      { count: missedToday },
      { count: smsSentToday },
      { count: missed30Days },
      { count: smsSent30Days },
      { count: missed7Days },
      { count: smsSent7Days },
      { count: optOutCount },
      { data: lastSend },
    ] = await Promise.all([
      supabase.from('missed_calls').select('*', { count: 'exact', head: true })
        .eq('client_id', clientId!).gte('created_at', todayStart),
      supabase.from('messages').select('*', { count: 'exact', head: true })
        .eq('client_id', clientId!).eq('direction', 'outbound').gte('created_at', todayStart),
      supabase.from('missed_calls').select('*', { count: 'exact', head: true })
        .eq('client_id', clientId!).gte('created_at', days30Ago),
      supabase.from('messages').select('*', { count: 'exact', head: true })
        .eq('client_id', clientId!).eq('direction', 'outbound').gte('created_at', days30Ago),
      supabase.from('missed_calls').select('*', { count: 'exact', head: true })
        .eq('client_id', clientId!).gte('created_at', days7Ago),
      supabase.from('messages').select('*', { count: 'exact', head: true })
        .eq('client_id', clientId!).eq('direction', 'outbound').gte('created_at', days7Ago),
      supabase.from('opt_outs').select('*', { count: 'exact', head: true })
        .eq('client_id', clientId!),
      supabase.from('messages').select('created_at').eq('client_id', clientId!)
        .eq('direction', 'outbound').eq('status', 'sent').order('created_at', { ascending: false }).limit(1),
    ])

    const lastPing = await supabase.from('missed_calls').select('created_at')
      .eq('client_id', clientId!).order('created_at', { ascending: false }).limit(1)

    setAnalytics({
      missedToday: missedToday ?? 0,
      smsSentToday: smsSentToday ?? 0,
      missed30Days: missed30Days ?? 0,
      smsSent30Days: smsSent30Days ?? 0,
      missed7Days: missed7Days ?? 0,
      smsSent7Days: smsSent7Days ?? 0,
      revenueProtected: (missed30Days ?? 0) * avgJobValue,
      optOutCount: optOutCount ?? 0,
      lastWebhookPing: lastPing.data?.[0]?.created_at ?? null,
      lastSuccessfulSend: lastSend?.[0]?.created_at ?? null,
    })
    setLoading(false)
  }

  return { analytics, loading, refetch: fetchAnalytics }
}
