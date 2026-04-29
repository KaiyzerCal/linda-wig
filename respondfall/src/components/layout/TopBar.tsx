import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useClientContext } from '@/contexts/ClientContext'
import { useToast } from '@/contexts/ToastContext'
import type { RealtimeChannel } from '@supabase/supabase-js'

const NAV_TABS = [
  { path: 'activity',  label: 'Activity'  },
  { path: 'inbox',     label: 'Inbox'     },
  { path: 'sequences', label: 'Sequences' },
  { path: 'analytics', label: 'Analytics' },
  { path: 'connect',   label: 'Connect'   },
  { path: 'settings',  label: 'Settings'  },
] as const

function useInboxUnread(clientId: string | undefined) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!clientId) return
    let ch: RealtimeChannel | null = null

    async function fetchUnread() {
      const { count: n } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('status', 'open')
        .eq('opted_out', false)
      setCount(n ?? 0)
    }

    fetchUnread()

    ch = supabase
      .channel(`topbar-unread:${clientId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'conversations',
        filter: `client_id=eq.${clientId}`,
      }, () => fetchUnread())
      .subscribe()

    return () => { if (ch) supabase.removeChannel(ch) }
  }, [clientId])

  return count
}

export default function TopBar() {
  const { activeClient, refreshClients } = useClientContext()
  const { toast }   = useToast()
  const [toggling, setToggling] = useState(false)

  const unread = useInboxUnread(activeClient?.id)

  async function toggleSystem() {
    if (!activeClient || toggling) return
    setToggling(true)
    try {
      const next = !activeClient.system_active
      const { error } = await supabase
        .from('clients')
        .update({ system_active: next })
        .eq('id', activeClient.id)
      if (error) throw error
      await refreshClients()
      toast(
        next ? 'System activated — missed calls will trigger SMS.' : 'System paused — no SMS will be sent.',
        next ? 'success' : 'info',
      )
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Failed to update system status', 'error')
    } finally {
      setToggling(false)
    }
  }

  if (!activeClient) {
    return (
      <div
        className="h-12 shrink-0 border-b border-gray-800 flex items-center px-5"
        style={{ background: 'var(--surface)' }}
      >
        <span className="text-xs" style={{ color: '#4b5563' }}>No client selected</span>
      </div>
    )
  }

  return (
    <div
      className="shrink-0 border-b border-gray-800 flex items-stretch"
      style={{ background: 'var(--surface)' }}
    >
      {/* ── Client info + controls ── */}
      <div className="flex items-center gap-4 px-5 py-2.5 border-r border-gray-800 min-w-0">
        {/* Client name + phone */}
        <div className="min-w-0">
          <p className="text-xs font-semibold truncate leading-tight" style={{ color: 'var(--text)' }}>
            {activeClient.business_name}
          </p>
          <p className="text-[10px] font-mono leading-tight" style={{ color: '#6b7280' }}>
            {activeClient.respondfall_number ?? activeClient.business_phone}
          </p>
        </div>

        {/* AI active pill */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0"
          style={{
            background: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.25)',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
            style={{ background: 'var(--brand)' }}
          />
          <span className="text-[10px] font-semibold whitespace-nowrap" style={{ color: 'var(--brand)' }}>
            Respondfall AI Active
          </span>
        </div>

        {/* System toggle */}
        <button
          type="button"
          onClick={toggleSystem}
          disabled={toggling}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0"
          style={{
            background: activeClient.system_active
              ? 'rgba(16,185,129,0.1)'
              : 'rgba(239,68,68,0.1)',
            border: `1px solid ${activeClient.system_active
              ? 'rgba(16,185,129,0.25)'
              : 'rgba(239,68,68,0.25)'}`,
            color: activeClient.system_active ? 'var(--brand)' : 'var(--danger)',
            opacity: toggling ? 0.6 : 1,
          }}
          title={activeClient.system_active ? 'Click to pause SMS delivery' : 'Click to activate SMS delivery'}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: activeClient.system_active ? 'var(--brand)' : 'var(--danger)' }}
          />
          {toggling ? 'Updating…' : activeClient.system_active ? 'Active' : 'Inactive'}
        </button>
      </div>

      {/* ── Tab nav ── */}
      <nav className="flex items-stretch overflow-x-auto">
        {NAV_TABS.map(tab => (
          <NavLink
            key={tab.path}
            to={`/dashboard/${tab.path}`}
            className="relative flex items-center gap-1.5 px-4 text-sm font-medium transition-colors whitespace-nowrap"
            style={({ isActive }) => ({
              color: isActive ? 'var(--text)' : '#6b7280',
            })}
          >
            {({ isActive }) => (
              <>
                {tab.label}
                {tab.path === 'inbox' && unread > 0 && (
                  <span
                    className="flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold text-white"
                    style={{ background: 'var(--blue)' }}
                  >
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t"
                    style={{ background: 'var(--blue)' }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
