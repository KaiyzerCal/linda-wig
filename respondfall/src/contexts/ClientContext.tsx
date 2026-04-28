import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react'
import { supabase } from '@/lib/supabase'
import type { Client, AgencyOwner } from '@/lib/types'

interface ClientContextValue {
  owner: AgencyOwner | null
  clients: Client[]
  activeClient: Client | null
  setActiveClient: (client: Client) => void
  refreshClients: () => Promise<void>
  loading: boolean
}

const ClientContext = createContext<ClientContextValue | null>(null)

export function ClientProvider({ children }: { children: ReactNode }) {
  const [owner, setOwner]               = useState<AgencyOwner | null>(null)
  const [clients, setClients]           = useState<Client[]>([])
  const [activeClient, setActiveClient] = useState<Client | null>(null)
  const [loading, setLoading]           = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: ownerRow } = await supabase
        .from('agency_owners')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (!ownerRow) return
      setOwner(ownerRow as AgencyOwner)

      const { data: rows } = await supabase
        .from('clients')
        .select('*')
        .eq('agency_owner_id', ownerRow.id)
        .order('created_at', { ascending: true })

      const list = (rows ?? []) as Client[]
      setClients(list)

      // Keep active selection valid after refresh
      setActiveClient(prev => {
        if (!prev) return list[0] ?? null
        return list.find(c => c.id === prev.id) ?? list[0] ?? null
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  return (
    <ClientContext.Provider
      value={{ owner, clients, activeClient, setActiveClient, refreshClients: fetchAll, loading }}
    >
      {children}
    </ClientContext.Provider>
  )
}

export function useClientContext() {
  const ctx = useContext(ClientContext)
  if (!ctx) throw new Error('useClientContext must be used inside ClientProvider')
  return ctx
}
