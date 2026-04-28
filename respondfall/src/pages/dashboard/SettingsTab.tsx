import { useState, useEffect } from 'react'
import { supabase, Client } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Phone, AlertTriangle, Search } from 'lucide-react'
import { clsx } from 'clsx'

type TwilioNumber = { phoneNumber: string; friendlyName: string; locality: string; region: string }

export function SettingsTab({ client, onUpdate, onDelete }: {
  client: Client
  onUpdate: (updates: Partial<Client>) => Promise<void>
  onDelete: () => Promise<void>
}) {
  const [form, setForm] = useState({
    business_name: client.business_name,
    industry: client.industry,
    avg_job_value: client.avg_job_value,
    business_phone: client.business_phone ?? '',
    sms_template: client.sms_template,
    send_delay_seconds: client.send_delay_seconds,
    blackout_start: client.blackout_start,
    blackout_end: client.blackout_end,
    booking_link: client.booking_link ?? '',
    google_review_link: client.google_review_link ?? '',
    system_active: client.system_active,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [areaCode, setAreaCode] = useState('')
  const [searchingNumbers, setSearchingNumbers] = useState(false)
  const [availableNumbers, setAvailableNumbers] = useState<TwilioNumber[]>([])
  const [provisioning, setProvisioning] = useState(false)

  useEffect(() => {
    setForm({
      business_name: client.business_name,
      industry: client.industry,
      avg_job_value: client.avg_job_value,
      business_phone: client.business_phone ?? '',
      sms_template: client.sms_template,
      send_delay_seconds: client.send_delay_seconds,
      blackout_start: client.blackout_start,
      blackout_end: client.blackout_end,
      booking_link: client.booking_link ?? '',
      google_review_link: client.google_review_link ?? '',
      system_active: client.system_active,
    })
  }, [client.id])

  async function handleSave() {
    setSaving(true)
    await onUpdate(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setSaving(false)
  }

  async function handleDelete() {
    setDeleting(true)
    await onDelete()
    setDeleting(false)
  }

  async function searchNumbers() {
    if (!areaCode.trim()) return
    setSearchingNumbers(true)
    setAvailableNumbers([])
    try {
      const { data } = await supabase.functions.invoke('search-twilio-numbers', {
        body: { areaCode: areaCode.trim() }
      })
      setAvailableNumbers(data?.numbers ?? [])
    } catch {
      // Edge functions not deployed yet — show placeholder
      setAvailableNumbers([
        { phoneNumber: '+15555550101', friendlyName: '(555) 555-0101', locality: 'Sample City', region: 'CA' },
        { phoneNumber: '+15555550102', friendlyName: '(555) 555-0102', locality: 'Sample City', region: 'CA' },
      ])
    } finally {
      setSearchingNumbers(false)
    }
  }

  async function claimNumber(number: TwilioNumber) {
    setProvisioning(true)
    try {
      await supabase.functions.invoke('provision-twilio-number', {
        body: { phoneNumber: number.phoneNumber, clientId: client.id }
      })
    } finally {
      setProvisioning(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5 max-w-2xl">
      {/* Business Profile */}
      <Section title="Business Profile">
        <Field label="Business Name">
          <input
            type="text"
            value={form.business_name}
            onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))}
            className={inputClass}
          />
        </Field>
        <Field label="Industry">
          <select
            value={form.industry}
            onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
            className={inputClass}
          >
            {['plumbing', 'hvac', 'roofing', 'electrical', 'landscaping', 'general'].map(i => (
              <option key={i} value={i}>{i.charAt(0).toUpperCase() + i.slice(1)}</option>
            ))}
          </select>
        </Field>
        <Field label="Avg Job Value ($)">
          <input
            type="number"
            value={form.avg_job_value}
            onChange={e => setForm(f => ({ ...f, avg_job_value: parseInt(e.target.value) || 0 }))}
            className={inputClass}
          />
        </Field>
        <Field label="System Active">
          <button
            onClick={() => setForm(f => ({ ...f, system_active: !f.system_active }))}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors',
              form.system_active
                ? 'bg-success/15 text-success border-success/30'
                : 'bg-danger/15 text-danger border-danger/30'
            )}
          >
            <div className={clsx('w-2 h-2 rounded-full', form.system_active ? 'bg-success' : 'bg-danger')} />
            {form.system_active ? 'Active' : 'Paused'}
          </button>
        </Field>
      </Section>

      {/* Phone Numbers */}
      <Section title="Phone Numbers">
        {client.respondfall_number && (
          <div className="flex items-center gap-2 mb-4">
            <Phone className="w-4 h-4 text-success" />
            <span className="text-sm text-text-secondary">Current Respondfall Number:</span>
            <span className="text-sm font-semibold text-success bg-success/10 px-3 py-1 rounded-full border border-success/20">
              {client.respondfall_number}
            </span>
          </div>
        )}
        <Field label="Your Business Phone (calls forward FROM here)">
          <input
            type="tel"
            value={form.business_phone}
            onChange={e => setForm(f => ({ ...f, business_phone: e.target.value }))}
            placeholder="+15551234567"
            className={inputClass}
          />
        </Field>
        <Field label="Search Available Numbers">
          <div className="flex gap-2">
            <input
              type="text"
              value={areaCode}
              onChange={e => setAreaCode(e.target.value)}
              placeholder="Area code (e.g. 512) or city"
              className={clsx(inputClass, 'flex-1')}
              onKeyDown={e => e.key === 'Enter' && searchNumbers()}
            />
            <Button onClick={searchNumbers} disabled={searchingNumbers} variant="secondary" className="flex-shrink-0">
              <Search className="w-4 h-4" />
              {searchingNumbers ? 'Searching...' : 'SEARCH'}
            </Button>
          </div>
        </Field>
        {availableNumbers.length > 0 && (
          <div className="mt-3 space-y-2">
            {availableNumbers.map(num => (
              <div key={num.phoneNumber} className="flex items-center justify-between bg-bg-secondary border border-subtle rounded-xl px-4 py-3">
                <div>
                  <span className="text-sm font-semibold text-text-primary">{num.friendlyName}</span>
                  <span className="text-xs text-text-secondary ml-2">{num.locality}, {num.region}</span>
                </div>
                <Button onClick={() => claimNumber(num)} disabled={provisioning} className="text-xs py-1.5">
                  {provisioning ? 'Claiming...' : 'Claim'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* SMS Configuration */}
      <Section title="SMS Configuration">
        <Field label="Initial SMS Template">
          <textarea
            value={form.sms_template}
            onChange={e => setForm(f => ({ ...f, sms_template: e.target.value }))}
            rows={3}
            className={clsx(inputClass, 'resize-none')}
          />
          <p className="text-xs text-text-secondary mt-1">Use &#123;business_name&#125; and &#123;booking_link&#125; as placeholders</p>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Send Delay (seconds)">
            <input
              type="number"
              value={form.send_delay_seconds}
              onChange={e => setForm(f => ({ ...f, send_delay_seconds: parseInt(e.target.value) || 5 }))}
              className={inputClass}
            />
          </Field>
          <div />
          <Field label="Blackout Start (hour, 24h)">
            <input
              type="number"
              min={0}
              max={23}
              value={form.blackout_start}
              onChange={e => setForm(f => ({ ...f, blackout_start: parseInt(e.target.value) }))}
              className={inputClass}
            />
          </Field>
          <Field label="Blackout End (hour, 24h)">
            <input
              type="number"
              min={0}
              max={23}
              value={form.blackout_end}
              onChange={e => setForm(f => ({ ...f, blackout_end: parseInt(e.target.value) }))}
              className={inputClass}
            />
          </Field>
        </div>
      </Section>

      {/* Revenue Multipliers */}
      <Section title="Revenue Multipliers">
        <Field label="Booking Link ★ CRITICAL">
          <input
            type="url"
            value={form.booking_link}
            onChange={e => setForm(f => ({ ...f, booking_link: e.target.value }))}
            placeholder="https://calendly.com/yourbusiness"
            className={inputClass}
          />
        </Field>
        <Field label="Google Review Link ★ POST-JOB REVIEW REQUESTS">
          <input
            type="url"
            value={form.google_review_link}
            onChange={e => setForm(f => ({ ...f, google_review_link: e.target.value }))}
            placeholder="https://g.page/r/..."
            className={inputClass}
          />
        </Field>
      </Section>

      {/* Save */}
      <Button onClick={handleSave} disabled={saving} className="w-full justify-center py-3 text-base">
        {saving ? 'Saving...' : saved ? '✓ Saved!' : 'SAVE CHANGES'}
      </Button>

      {/* Danger Zone */}
      <Section title="Danger Zone" titleColor="text-danger">
        <p className="text-sm text-text-secondary mb-4">
          Permanently remove this client and all associated data. This cannot be undone.
        </p>
        {!confirmDelete ? (
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            <AlertTriangle className="w-4 h-4" />
            Delete Client
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-danger font-semibold">Are you absolutely sure? Type the business name to confirm:</p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button>
              <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Yes, Delete Permanently'}
              </Button>
            </div>
          </div>
        )}
      </Section>
    </div>
  )
}

const inputClass = 'w-full bg-bg-secondary border border-subtle rounded-lg px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-active'

function Section({ title, titleColor, children }: { title: string; titleColor?: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl border border-subtle p-5">
      <h3 className={clsx('text-sm font-bold font-heading mb-4', titleColor ?? 'text-text-primary')}>{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-text-secondary mb-1.5 font-medium">{label}</label>
      {children}
    </div>
  )
}
