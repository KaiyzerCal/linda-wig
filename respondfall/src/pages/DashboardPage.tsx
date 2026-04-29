import { useState } from 'react'
import ActivityTab   from './dashboard/ActivityTab'
import InboxTab      from './dashboard/InboxTab'
import SequencesTab  from './dashboard/SequencesTab'
import AnalyticsTab  from './dashboard/AnalyticsTab'
import ConnectTab    from './dashboard/ConnectTab'
import SettingsTab   from './dashboard/SettingsTab'
import { useClientContext } from '@/contexts/ClientContext'

type Tab = 'activity' | 'inbox' | 'sequences' | 'analytics' | 'connect' | 'settings'

const TABS: { id: Tab; label: string }[] = [
  { id: 'activity',  label: 'Activity'  },
  { id: 'inbox',     label: 'Inbox'     },
  { id: 'sequences', label: 'Sequences' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'connect',   label: 'Connect'   },
  { id: 'settings',  label: 'Settings'  },
]

export default function DashboardPage() {
  const { activeClient } = useClientContext()
  const [tab, setTab]    = useState<Tab>('activity')

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div
        className="flex items-center border-b border-gray-800 px-4 shrink-0 overflow-x-auto"
        style={{ background: 'var(--surface)' }}
      >
        {activeClient && (
          <span className="text-xs font-semibold mr-5 py-3 shrink-0" style={{ color: '#6b7280' }}>
            {activeClient.business_name}
          </span>
        )}

        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-3 py-3 text-sm font-medium transition-all relative shrink-0"
            style={{ color: tab === t.id ? 'var(--text)' : '#6b7280' }}
          >
            {t.label}
            {tab === t.id && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t"
                style={{ background: 'var(--blue)' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab content — Inbox needs full height for split layout */}
      <div className={`flex-1 ${tab === 'inbox' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {tab === 'activity'  && <ActivityTab />}
        {tab === 'inbox'     && <InboxTab />}
        {tab === 'sequences' && <SequencesTab />}
        {tab === 'analytics' && <AnalyticsTab />}
        {tab === 'connect'   && <ConnectTab />}
        {tab === 'settings'  && <SettingsTab />}
      </div>
    </div>
  )
}
