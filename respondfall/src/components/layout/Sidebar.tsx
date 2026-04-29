import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useClientContext } from '@/contexts/ClientContext'
import { useToast } from '@/contexts/ToastContext'
import type { NewClientForm } from '@/lib/types'

// ── Brand ────────────────────────────────────────────────────────
function EagleMark() {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6">
      <path d="M32 12 L36 28 L32 32 L28 28 Z" fill="#2d7ff9" opacity="0.95" />
      <path d="M32 24 L8 20 L14 30 L28 29 Z" fill="#2d7ff9" opacity="0.75" />
      <path d="M32 24 L56 20 L50 30 L36 29 Z" fill="#2d7ff9" opacity="0.75" />
      <path d="M14 30 L8 20 L6 36 L22 34 Z" fill="#10b981" opacity="0.85" />
      <path d="M50 30 L56 20 L58 36 L42 34 Z" fill="#10b981" opacity="0.85" />
      <path d="M28 30 L24 48 L32 44 L40 48 L36 30 Z" fill="#2d7ff9" opacity="0.8" />
      <circle cx="32" cy="10" r="4" fill="#f1f5f9" />
      <path d="M32 12 L35 15 L32 14 Z" fill="#fb923c" />
    </svg>
  )
}

// ── Helpers ──────────────────────────────────────────────────────
function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
}

const AVATAR_COLORS = [
  '#2d7ff9', '#10b981', '#fb923c', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f59e0b', '#6366f1',
]

function avatarColor(id: string) {
  let n = 0
  for (let i = 0; i < id.length; i++) n += id.charCodeAt(i)
  return AVATAR_COLORS[n % AVATAR_COLORS.length]
}

// ── Industry options ─────────────────────────────────────────────
const INDUSTRIES = [
  'HVAC',
  'Plumbing',
  'Electrical',
  'Roofing',
  'Landscaping / Lawn Care',
  'Pest Control',
  'Cleaning Services',
  'Auto Repair',
  'General Contracting',
  'Painting',
  'Flooring',
  'Pool Service',
  'Tree Service',
  'Moving',
  'Other',
]

// ── Add Client Modal ─────────────────────────────────────────────
const EMPTY_FORM: NewClientForm = {
  business_name: '',
  industry: '',
  business_phone: '',
  avg_job_value: '',
}

interface AddClientModalProps {
  agencyOwnerId: string
  onClose: () => void
  onSaved: () => void
}

function AddClientModal({ agencyOwnerId, onClose, onSaved }: AddClientModalProps) {
  const [form, setForm]       = useState<NewClientForm>(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  function setField(field: keyof NewClientForm, value: string) {
    setForm(f => ({ ...f, [field]: value }))
    setError(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.business_name.trim()) { setError('Business name is required.'); return }
    if (!form.business_phone.trim()) { setError('Business phone is required.'); return }

    setLoading(true)
    const { error: dbError } = await supabase.from('clients').insert({
      agency_owner_id: agencyOwnerId,
      business_name: form.business_name.trim(),
      industry: form.industry || null,
      business_phone: form.business_phone.trim(),
      avg_job_value: form.avg_job_value ? parseFloat(form.avg_job_value) : null,
    })
    setLoading(false)

    if (dbError) { setError(dbError.message); return }
    onSaved()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="card w-full max-w-md p-6 space-y-5"
        style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.6)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>
            Add Client
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors text-lg leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#9ca3af' }}>
              Business Name *
            </label>
            <input
              type="text"
              className="input-base"
              placeholder="Apex Plumbing Co."
              value={form.business_name}
              onChange={e => setField('business_name', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#9ca3af' }}>
              Industry
            </label>
            <select
              className="input-base"
              value={form.industry}
              onChange={e => setField('industry', e.target.value)}
              style={{ cursor: 'pointer' }}
            >
              <option value="">Select industry…</option>
              {INDUSTRIES.map(ind => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#9ca3af' }}>
              Business Phone *
            </label>
            <input
              type="tel"
              className="input-base"
              placeholder="+1 (555) 000-0000"
              value={form.business_phone}
              onChange={e => setField('business_phone', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#9ca3af' }}>
              Avg Job Value ($)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input-base"
              placeholder="350"
              value={form.avg_job_value}
              onChange={e => setField('avg_job_value', e.target.value)}
            />
          </div>

          {error && (
            <div
              className="rounded-lg px-3 py-2.5 text-xs font-medium"
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: 'var(--danger)',
              }}
              role="alert"
            >
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost flex-1 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 text-sm"
            >
              {loading ? 'Saving…' : 'Save Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────
export default function Sidebar() {
  const { owner, clients, activeClient, setActiveClient, refreshClients, loading } =
    useClientContext()
  const navigate            = useNavigate()
  const { toast }           = useToast()
  const [showModal, setShowModal] = useState(false)

  async function handleLogout() {
    try {
      await supabase.auth.signOut()
      navigate('/', { replace: true })
    } catch {
      toast('Logout failed — please try again', 'error')
    }
  }

  function handleSaved() {
    setShowModal(false)
    refreshClients()
    toast('Client added successfully', 'success')
  }

  return (
    <>
      <aside
        className="flex flex-col h-screen w-64 shrink-0 border-r border-gray-800"
        style={{ background: 'var(--surface)' }}
      >
        {/* ── Logo ── */}
        <div
          className="flex items-center gap-2.5 px-4 py-4 border-b border-gray-800"
        >
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
            style={{
              background: 'rgba(45,127,249,0.12)',
              boxShadow: '0 0 0 1px rgba(45,127,249,0.2)',
            }}
          >
            <EagleMark />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black tracking-[0.14em] uppercase leading-tight" style={{ color: 'var(--text)' }}>
              Respondfall
            </p>
            <p className="text-[9px] tracking-widest uppercase leading-tight" style={{ color: '#4b5563' }}>
              by SkyforgeAI
            </p>
          </div>
        </div>

        {/* ── Client list ── */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
          <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#4b5563' }}>
            Clients
          </p>

          {loading && (
            <div className="space-y-1.5 px-2">
              {[1, 2, 3].map(n => (
                <div
                  key={n}
                  className="h-12 rounded-lg animate-pulse"
                  style={{ background: '#1f2937' }}
                />
              ))}
            </div>
          )}

          {!loading && clients.length === 0 && (
            <p className="px-2 py-4 text-xs text-center" style={{ color: '#6b7280' }}>
              No clients yet.
            </p>
          )}

          {!loading && clients.map(client => {
            const isActive = activeClient?.id === client.id
            const bg = avatarColor(client.id)
            return (
              <button
                key={client.id}
                onClick={() => setActiveClient(client)}
                className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-all"
                style={{
                  background: isActive ? 'rgba(45,127,249,0.12)' : 'transparent',
                  outline: isActive ? '1px solid rgba(45,127,249,0.25)' : 'none',
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: bg }}
                >
                  {initials(client.business_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-xs font-semibold truncate leading-tight"
                    style={{ color: isActive ? 'var(--blue)' : 'var(--text)' }}
                  >
                    {client.business_name}
                  </p>
                  <p className="text-[10px] truncate leading-tight" style={{ color: '#6b7280' }}>
                    {client.business_phone}
                  </p>
                </div>
                {client.system_active && (
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: 'var(--brand)' }}
                    title="System active"
                  />
                )}
              </button>
            )
          })}
        </nav>

        {/* ── Add Client ── */}
        <div className="px-2 pb-3 border-t border-gray-800 pt-3">
          <button
            onClick={() => setShowModal(true)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{
              border: '1.5px dashed #374151',
              color: '#6b7280',
              background: 'transparent',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--blue)'
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--blue)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#374151'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#6b7280'
            }}
          >
            <span className="text-base leading-none">+</span>
            Add Client
          </button>
        </div>

        {/* ── Footer ── */}
        <div
          className="px-3 py-3 border-t border-gray-800 space-y-2"
          style={{ background: 'rgba(0,0,0,0.2)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
              style={{ background: 'var(--blue)' }}
            >
              {owner ? initials(owner.name) : '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate leading-tight" style={{ color: 'var(--text)' }}>
                {owner?.name ?? 'Agency Owner'}
              </p>
              <p className="text-[10px] leading-tight" style={{ color: '#10b981' }}>
                SkyforgeAI Partner
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all hover:opacity-80"
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: 'var(--danger)',
            }}
          >
            <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3" aria-hidden="true">
              <path
                d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M10 11l3-3-3-3M13 8H6"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
            Log out
          </button>
        </div>
      </aside>

      {showModal && owner && (
        <AddClientModal
          agencyOwnerId={owner.id}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}
