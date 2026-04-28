import { useEffect, useState } from 'react'
import { supabase, Client, AgencyOwner } from '../lib/supabase'

export function useClients(agencyOwner: AgencyOwner | null) {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!agencyOwner) { setLoading(false); return }
    fetchClients()
  }, [agencyOwner])

  async function fetchClients() {
    setLoading(true)
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('agency_owner_id', agencyOwner!.id)
      .order('created_at', { ascending: true })
    setClients(data ?? [])
    setLoading(false)
  }

  async function addClient(payload: {
    business_name: string
    industry: string
    avg_job_value: number
    business_phone: string
  }) {
    const { data, error } = await supabase
      .from('clients')
      .insert({ ...payload, agency_owner_id: agencyOwner!.id })
      .select()
      .single()
    if (data) setClients(prev => [...prev, data])
    return { data, error }
  }

  async function updateClient(id: string, updates: Partial<Client>) {
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (data) setClients(prev => prev.map(c => c.id === id ? data : c))
    return { data, error }
  }

  async function deleteClient(id: string) {
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (!error) setClients(prev => prev.filter(c => c.id !== id))
    return { error }
  }

  return { clients, loading, addClient, updateClient, deleteClient, refetch: fetchClients }
}
