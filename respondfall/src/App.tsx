import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useClients } from './hooks/useClients'
import { useConversations } from './hooks/useConversations'
import { AuthPage } from './components/auth/AuthPage'
import { Sidebar } from './components/layout/Sidebar'
import { TopBar, DashTab } from './components/layout/TopBar'
import { ActivityTab } from './pages/dashboard/ActivityTab'
import { InboxTab } from './pages/dashboard/InboxTab'
import { SequencesTab } from './pages/dashboard/SequencesTab'
import { AnalyticsTab } from './pages/dashboard/AnalyticsTab'
import { SettingsTab } from './pages/dashboard/SettingsTab'
import { ConnectTab } from './pages/dashboard/ConnectTab'
import { Client } from './lib/supabase'
import { Bird } from 'lucide-react'

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="text-center">
        <Bird className="w-12 h-12 text-accent-blue mx-auto mb-4 animate-pulse" strokeWidth={1.5} />
        <p className="text-text-secondary text-sm tracking-widest">RESPONDFALL</p>
      </div>
    </div>
  )
}

export default function App() {
  const { session, agencyOwner, loading, signOut } = useAuth()
  const { clients, addClient, updateClient, deleteClient } = useClients(agencyOwner)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [activeTab, setActiveTab] = useState<DashTab>('activity')
  const { unreadCount } = useConversations(selectedClient?.id ?? null)

  if (loading) return <LoadingScreen />
  if (!session) return <AuthPage />

  const client = selectedClient ?? clients[0] ?? null

  async function handleAddClient(data: Parameters<typeof addClient>[0]) {
    const { data: newClient } = await addClient(data)
    if (newClient) {
      setSelectedClient(newClient)
      setActiveTab('settings')
    }
  }

  async function handleUpdateClient(updates: Partial<Client>) {
    if (!client) return
    await updateClient(client.id, updates)
  }

  async function handleDeleteClient() {
    if (!client) return
    await deleteClient(client.id)
    setSelectedClient(null)
    setActiveTab('activity')
  }

  return (
    <div className="min-h-screen bg-bg-primary flex">
      <Sidebar
        clients={clients}
        selectedClient={client}
        onSelectClient={(c) => { setSelectedClient(c); setActiveTab('activity') }}
        onAddClient={handleAddClient}
        agencyOwner={agencyOwner}
        onSignOut={signOut}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        {client ? (
          <>
            <TopBar
              client={client}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              unreadCount={unreadCount}
            />
            <div className="flex-1 flex overflow-hidden">
              {activeTab === 'activity' && <ActivityTab client={client} />}
              {activeTab === 'inbox' && <InboxTab client={client} />}
              {activeTab === 'sequences' && <SequencesTab client={client} />}
              {activeTab === 'analytics' && <AnalyticsTab client={client} />}
              {activeTab === 'settings' && (
                <SettingsTab
                  client={client}
                  onUpdate={handleUpdateClient}
                  onDelete={handleDeleteClient}
                />
              )}
              {activeTab === 'connect' && <ConnectTab client={client} />}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div>
              <Bird className="w-16 h-16 text-accent-blue/20 mx-auto mb-4" strokeWidth={1} />
              <h2 className="text-xl font-bold font-heading text-text-primary mb-2">Welcome to Respondfall</h2>
              <p className="text-text-secondary text-sm max-w-xs">
                Add your first client to start capturing missed call revenue automatically.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
