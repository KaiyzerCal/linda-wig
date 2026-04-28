import { clsx } from 'clsx'
import { Phone, Zap } from 'lucide-react'
import { Client } from '../../lib/supabase'

export type DashTab = 'activity' | 'inbox' | 'sequences' | 'analytics' | 'settings' | 'connect'

const tabs: { id: DashTab; label: string }[] = [
  { id: 'activity', label: 'Activity' },
  { id: 'inbox', label: 'Inbox' },
  { id: 'sequences', label: 'Sequences' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'settings', label: 'Settings' },
  { id: 'connect', label: 'Connect' },
]

export function TopBar({
  client,
  activeTab,
  onTabChange,
  unreadCount,
}: {
  client: Client
  activeTab: DashTab
  onTabChange: (tab: DashTab) => void
  unreadCount: number
}) {
  return (
    <div className="border-b border-subtle">
      {/* Header row */}
      <div className="px-6 pt-5 pb-3 flex items-center gap-4">
        <div className="flex-1">
          <h1 className="text-xl font-bold font-heading text-text-primary">{client.business_name}</h1>
          <div className="flex items-center gap-3 mt-1">
            {client.respondfall_number && (
              <span className="flex items-center gap-1.5 text-sm text-text-secondary">
                <Phone className="w-3.5 h-3.5" />
                {client.respondfall_number}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-xs bg-accent-blue/15 text-accent-blue px-2.5 py-1 rounded-full border border-accent-blue/30">
              <Zap className="w-3 h-3" />
              Respondfall AI Active
            </span>
          </div>
        </div>
        <div className={clsx(
          'px-3 py-1.5 rounded-full text-xs font-bold tracking-widest border',
          client.system_active
            ? 'bg-success/15 text-success border-success/30'
            : 'bg-danger/15 text-danger border-danger/30'
        )}>
          {client.system_active ? '● SYSTEM ACTIVE' : '● SYSTEM PAUSED'}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-6 gap-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className={clsx(
              'px-4 py-2.5 text-sm font-medium transition-colors relative flex items-center gap-2',
              activeTab === t.id
                ? 'text-accent-blue border-b-2 border-accent-blue -mb-px'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            {t.label}
            {t.id === 'inbox' && unreadCount > 0 && (
              <span className="bg-danger text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
