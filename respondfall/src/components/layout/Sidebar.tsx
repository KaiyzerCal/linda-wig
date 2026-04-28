import { useState } from 'react'
import { Bird, Plus, LogOut, Phone } from 'lucide-react'
import { clsx } from 'clsx'
import { Client, AgencyOwner } from '../../lib/supabase'
import { Button } from '../ui/Button'

type Industry = 'plumbing' | 'hvac' | 'roofing' | 'electrical' | 'landscaping' | 'general'

interface AddClientForm {
  business_name: string
  industry: Industry
  avg_job_value: number
  business_phone: string
}

export function Sidebar({
  clients,
  selectedClient,
  onSelectClient,
  onAddClient,
  agencyOwner,
  onSignOut,
}: {
  clients: Client[]
  selectedClient: Client | null
  onSelectClient: (client: Client) => void
  onAddClient: (data: AddClientForm) => Promise<void>
  agencyOwner: AgencyOwner | null
  onSignOut: () => void
}) {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<AddClientForm>({
    business_name: '',
    industry: 'general',
    avg_job_value: 300,
    business_phone: '',
  })
  const [submitting, setSubmitting] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    await onAddClient(form)
    setForm({ business_name: '', industry: 'general', avg_job_value: 300, business_phone: '' })
    setShowModal(false)
    setSubmitting(false)
  }

  return (
    <>
      <aside className="w-64 bg-bg-secondary border-r border-subtle flex flex-col h-screen flex-shrink-0">
        {/* Logo */}
        <div className="p-5 border-b border-subtle">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Bird className="w-7 h-7 text-accent-blue" strokeWidth={1.5} />
              <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-revenue" />
            </div>
            <div>
              <div className="text-sm font-bold font-heading tracking-[0.2em] text-text-primary">RESPONDFALL</div>
              <div className="text-[10px] text-text-secondary tracking-widest">BY SKYFORGEAI</div>
            </div>
          </div>
        </div>

        {/* Client list */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] text-text-secondary tracking-widest font-semibold uppercase">Client Accounts</span>
            <button
              onClick={() => setShowModal(true)}
              className="text-text-secondary hover:text-accent-blue transition-colors"
              title="Add client"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            {clients.map(client => (
              <button
                key={client.id}
                onClick={() => onSelectClient(client)}
                className={clsx(
                  'w-full text-left rounded-xl p-3 transition-all border',
                  selectedClient?.id === client.id
                    ? 'bg-accent-blue/15 border-accent-blue/40 text-text-primary'
                    : 'bg-card/50 border-subtle hover:bg-card hover:border-white/15 text-text-secondary'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold font-heading flex-shrink-0',
                    selectedClient?.id === client.id ? 'bg-accent-blue text-white' : 'bg-white/10 text-text-secondary'
                  )}>
                    {client.business_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-semibold truncate">{client.business_name}</p>
                    {client.respondfall_number ? (
                      <p className="text-xs text-text-secondary truncate flex items-center gap-1">
                        <Phone className="w-2.5 h-2.5" />
                        {client.respondfall_number}
                      </p>
                    ) : (
                      <p className="text-xs text-warning truncate">No number yet</p>
                    )}
                  </div>
                </div>
              </button>
            ))}

            {clients.length === 0 && (
              <p className="text-text-secondary text-xs text-center py-6">No clients yet.<br />Add your first one!</p>
            )}
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="w-full mt-3 py-2.5 border border-dashed border-subtle rounded-xl text-xs text-text-secondary hover:border-accent-blue hover:text-accent-blue transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Client
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-subtle">
          <div className="text-xs text-text-secondary mb-3">
            <div className="font-medium text-text-primary truncate">{agencyOwner?.email ?? 'Agency Owner'}</div>
            <div className="text-[10px] tracking-wide mt-0.5">SkyforgeAI Partner</div>
          </div>
          <button
            onClick={onSignOut}
            className="flex items-center gap-2 text-xs text-text-secondary hover:text-danger transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Add Client Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-subtle rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold font-heading text-text-primary mb-5">Add Client</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">Business Name *</label>
                <input
                  type="text"
                  required
                  value={form.business_name}
                  onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))}
                  className="w-full bg-bg-secondary border border-subtle rounded-lg px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-active"
                  placeholder="ABC Plumbing Co."
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">Industry</label>
                <select
                  value={form.industry}
                  onChange={e => setForm(f => ({ ...f, industry: e.target.value as Industry }))}
                  className="w-full bg-bg-secondary border border-subtle rounded-lg px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-active"
                >
                  {['plumbing', 'hvac', 'roofing', 'electrical', 'landscaping', 'general'].map(i => (
                    <option key={i} value={i}>{i.charAt(0).toUpperCase() + i.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">Avg Job Value ($)</label>
                <input
                  type="number"
                  value={form.avg_job_value}
                  onChange={e => setForm(f => ({ ...f, avg_job_value: parseInt(e.target.value) || 300 }))}
                  className="w-full bg-bg-secondary border border-subtle rounded-lg px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-active"
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">Business Phone</label>
                <input
                  type="tel"
                  value={form.business_phone}
                  onChange={e => setForm(f => ({ ...f, business_phone: e.target.value }))}
                  className="w-full bg-bg-secondary border border-subtle rounded-lg px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-active"
                  placeholder="+15551234567"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" onClick={() => setShowModal(false)} className="flex-1 justify-center">Cancel</Button>
                <Button type="submit" disabled={submitting} className="flex-1 justify-center">
                  {submitting ? 'Adding...' : 'Add Client'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
