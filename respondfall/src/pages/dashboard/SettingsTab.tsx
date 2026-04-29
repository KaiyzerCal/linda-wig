import { useState, useEffect, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useClientContext } from '@/contexts/ClientContext'
import { useToast } from '@/contexts/ToastContext'
import type { Client } from '@/lib/types'

// ── Constants ─────────────────────────────────────────────────────
const INDUSTRIES = [
  'HVAC', 'Plumbing', 'Electrical', 'Roofing', 'Landscaping / Lawn Care',
  'Pest Control', 'Cleaning Services', 'Auto Repair', 'General Contracting',
  'Painting', 'Flooring', 'Pool Service', 'Tree Service', 'Moving', 'Other',
]

const DEFAULT_TEMPLATE =
  "Hi! This is {business_name}. We missed your call — we'd love to help! " +
  'Reply here or book online: {booking_link}'

interface NotifPrefs {
  missed_call_alerts: boolean
  inbound_reply_alerts: boolean
  weekly_report: boolean
}

interface SettingsForm {
  business_name: string
  industry: string
  avg_job_value: string
  business_phone: string
  sms_template: string
  send_delay_seconds: number
  blackout_start: string
  blackout_end: string
  booking_link: string
  google_review_link: string
  notification_prefs: NotifPrefs
}

interface AvailableNumber {
  phoneNumber: string
  friendlyName: string
  locality: string | null
  region: string | null
}

// ── Section wrapper ───────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5 space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6b7280' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

// ── Field row ─────────────────────────────────────────────────────
function Field({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: '#9ca3af' }}>
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[10px]" style={{ color: '#6b7280' }}>{hint}</p>}
    </div>
  )
}

// ── Toggle ────────────────────────────────────────────────────────
function Toggle({
  checked, onChange, label,
}: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between cursor-pointer py-1 group">
      <span className="text-sm" style={{ color: 'var(--text)' }}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative w-10 h-5 rounded-full transition-colors shrink-0"
        style={{ background: checked ? 'var(--brand)' : '#374151' }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
          style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }}
        />
      </button>
    </label>
  )
}

// ── Phone Numbers section ─────────────────────────────────────────
function PhoneNumbersSection({
  client,
  onProvisioned,
}: { client: Client; onProvisioned: () => void }) {
  const [areaCode, setAreaCode]           = useState('')
  const [searching, setSearching]         = useState(false)
  const [results, setResults]             = useState<AvailableNumber[]>([])
  const [selected, setSelected]           = useState<AvailableNumber | null>(null)
  const [provisioning, setProvisioning]   = useState(false)
  const [searchError, setSearchError]     = useState<string | null>(null)
  const [provisionError, setProvisionError] = useState<string | null>(null)

  async function searchNumbers() {
    if (!/^\d{3}$/.test(areaCode)) { setSearchError('Enter a 3-digit area code'); return }
    setSearchError(null)
    setResults([])
    setSelected(null)
    setSearching(true)
    try {
      const { data, error } = await supabase.functions.invoke('search-numbers', {
        body: { areaCode },
      })
      if (error) throw error
      setResults((data as { numbers: AvailableNumber[] }).numbers ?? [])
      if ((data as { numbers: AvailableNumber[] }).numbers?.length === 0) {
        setSearchError('No numbers available in that area code. Try another.')
      }
    } catch (e: unknown) {
      setSearchError(e instanceof Error ? e.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  async function provisionNumber() {
    if (!selected) return
    setProvisionError(null)
    setProvisioning(true)
    try {
      const { data, error } = await supabase.functions.invoke('provision-number', {
        body: { clientId: client.id, phoneNumber: selected.phoneNumber },
      })
      if (error) throw error
      if ((data as { success?: boolean })?.success) {
        setResults([])
        setSelected(null)
        setAreaCode('')
        onProvisioned()
      }
    } catch (e: unknown) {
      setProvisionError(e instanceof Error ? e.message : 'Provisioning failed')
    } finally {
      setProvisioning(false)
    }
  }

  return (
    <Section title="Phone Numbers">
      {/* Current Respondfall number */}
      <Field label="Respondfall Number">
        {client.respondfall_number ? (
          <div
            className="input-base flex items-center gap-2 font-mono select-all"
            style={{ color: 'var(--brand)', borderColor: 'rgba(16,185,129,0.3)' }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: 'var(--brand)' }}
            />
            {client.respondfall_number}
          </div>
        ) : (
          <div
            className="input-base text-xs"
            style={{ color: '#6b7280', borderStyle: 'dashed' }}
          >
            No number provisioned yet — search below
          </div>
        )}
      </Field>

      {/* Search available numbers */}
      <Field
        label={client.respondfall_number ? 'Replace Number' : 'Claim a Number'}
        hint="Search by US area code. Numbers are purchased via Twilio."
      >
        <div className="flex gap-2">
          <input
            type="text"
            className="input-base w-28"
            placeholder="415"
            maxLength={3}
            value={areaCode}
            onChange={e => { setAreaCode(e.target.value.replace(/\D/g, '')); setSearchError(null) }}
            onKeyDown={e => e.key === 'Enter' && searchNumbers()}
          />
          <button
            type="button"
            onClick={searchNumbers}
            disabled={searching}
            className="btn-primary px-4 text-sm"
          >
            {searching ? 'Searching…' : 'Search'}
          </button>
        </div>
        {searchError && (
          <p className="mt-1.5 text-xs" style={{ color: 'var(--danger)' }}>{searchError}</p>
        )}
      </Field>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-1.5">
          {results.map(n => (
            <button
              key={n.phoneNumber}
              type="button"
              onClick={() => setSelected(s => s?.phoneNumber === n.phoneNumber ? null : n)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all"
              style={{
                background: selected?.phoneNumber === n.phoneNumber
                  ? 'rgba(45,127,249,0.12)'
                  : '#1f2937',
                border: `1px solid ${selected?.phoneNumber === n.phoneNumber
                  ? 'rgba(45,127,249,0.4)'
                  : '#374151'}`,
              }}
            >
              <span className="font-mono text-sm" style={{ color: 'var(--text)' }}>
                {n.friendlyName}
              </span>
              {(n.locality || n.region) && (
                <span className="text-xs" style={{ color: '#6b7280' }}>
                  {[n.locality, n.region].filter(Boolean).join(', ')}
                </span>
              )}
            </button>
          ))}

          {selected && (
            <div className="pt-1 space-y-2">
              {provisionError && (
                <p className="text-xs" style={{ color: 'var(--danger)' }}>{provisionError}</p>
              )}
              <button
                type="button"
                onClick={provisionNumber}
                disabled={provisioning}
                className="btn-brand w-full text-sm"
              >
                {provisioning ? 'Provisioning…' : `Claim ${selected.friendlyName}`}
              </button>
            </div>
          )}
        </div>
      )}
    </Section>
  )
}

// ── Main component ────────────────────────────────────────────────
export default function SettingsTab() {
  const { activeClient, refreshClients } = useClientContext()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [form, setForm]         = useState<SettingsForm | null>(null)
  const [saving, setSaving]     = useState(false)
  const [saveMsg, setSaveMsg]   = useState<string | null>(null)
  const [saveErr, setSaveErr]   = useState<string | null>(null)
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0) // 0=idle 1=confirm 2=deleting

  // Populate form from active client
  useEffect(() => {
    if (!activeClient) return
    setForm({
      business_name:     activeClient.business_name,
      industry:          activeClient.industry ?? '',
      avg_job_value:     activeClient.avg_job_value?.toString() ?? '',
      business_phone:    activeClient.business_phone,
      sms_template:      activeClient.sms_template ?? DEFAULT_TEMPLATE,
      send_delay_seconds: activeClient.send_delay_seconds,
      blackout_start:    activeClient.blackout_start ?? '',
      blackout_end:      activeClient.blackout_end ?? '',
      booking_link:      activeClient.booking_link ?? '',
      google_review_link: activeClient.google_review_link ?? '',
      notification_prefs: (activeClient as Client & { notification_prefs?: NotifPrefs })
        .notification_prefs ?? {
        missed_call_alerts:  true,
        inbound_reply_alerts: true,
        weekly_report:        false,
      },
    })
    setDeleteStep(0)
    setSaveMsg(null)
    setSaveErr(null)
  }, [activeClient?.id])

  function setField<K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) {
    setForm(f => f ? { ...f, [key]: value } : f)
    setSaveMsg(null)
    setSaveErr(null)
  }

  function setNotifPref(key: keyof NotifPrefs, value: boolean) {
    setForm(f =>
      f ? { ...f, notification_prefs: { ...f.notification_prefs, [key]: value } } : f,
    )
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!form || !activeClient) return
    setSaving(true)
    setSaveMsg(null)
    setSaveErr(null)

    const { error } = await supabase
      .from('clients')
      .update({
        business_name:      form.business_name.trim(),
        industry:           form.industry || null,
        avg_job_value:      form.avg_job_value ? parseFloat(form.avg_job_value) : null,
        business_phone:     form.business_phone.trim(),
        sms_template:       form.sms_template.trim() || null,
        send_delay_seconds: form.send_delay_seconds,
        blackout_start:     form.blackout_start || null,
        blackout_end:       form.blackout_end || null,
        booking_link:       form.booking_link.trim() || null,
        google_review_link: form.google_review_link.trim() || null,
        notification_prefs: form.notification_prefs,
      })
      .eq('id', activeClient.id)

    setSaving(false)
    if (error) { setSaveErr(error.message); toast(error.message, 'error'); return }
    setSaveMsg('Changes saved.')
    toast('Settings saved', 'success')
    refreshClients()
  }

  async function handleDelete() {
    if (!activeClient) return
    if (deleteStep === 0) { setDeleteStep(1); return }
    setDeleteStep(2)
    await supabase.from('clients').delete().eq('id', activeClient.id)
    refreshClients()
    navigate('/dashboard', { replace: true })
  }

  if (!activeClient || !form) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm" style={{ color: '#6b7280' }}>Select a client to view settings.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="max-w-2xl mx-auto px-6 py-8 space-y-5">
      <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>
        Settings — {activeClient.business_name}
      </h2>

      {/* ── Business Profile ── */}
      <Section title="Business Profile">
        <Field label="Business Name">
          <input
            type="text"
            className="input-base"
            value={form.business_name}
            onChange={e => setField('business_name', e.target.value)}
            required
          />
        </Field>
        <Field label="Industry">
          <select
            className="input-base"
            value={form.industry}
            onChange={e => setField('industry', e.target.value)}
            style={{ cursor: 'pointer' }}
          >
            <option value="">Select industry…</option>
            {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </Field>
        <Field label="Average Job Value ($)" hint="Used to calculate Revenue Protected.">
          <input
            type="number"
            min="0"
            step="0.01"
            className="input-base"
            placeholder="350"
            value={form.avg_job_value}
            onChange={e => setField('avg_job_value', e.target.value)}
          />
        </Field>
        <Field label="Business Phone" hint="The real number Respondfall forwards calls to.">
          <input
            type="tel"
            className="input-base"
            placeholder="+1 (555) 000-0000"
            value={form.business_phone}
            onChange={e => setField('business_phone', e.target.value)}
            required
          />
        </Field>
      </Section>

      {/* ── Phone Numbers ── */}
      <PhoneNumbersSection client={activeClient} onProvisioned={refreshClients} />

      {/* ── SMS Config ── */}
      <Section title="SMS Configuration">
        <Field
          label="Message Template"
          hint="Use {business_name} and {booking_link} as placeholders."
        >
          <textarea
            className="input-base resize-none"
            rows={3}
            value={form.sms_template}
            onChange={e => setField('sms_template', e.target.value)}
            placeholder={DEFAULT_TEMPLATE}
          />
          <div className="flex gap-2 mt-1.5">
            {['{business_name}', '{booking_link}'].map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => setField('sms_template', form.sms_template + tag)}
                className="badge badge-blue cursor-pointer hover:opacity-80 transition-opacity"
              >
                {tag}
              </button>
            ))}
          </div>
        </Field>
        <Field
          label="Send Delay (seconds)"
          hint="How long to wait after a missed call before sending the first SMS."
        >
          <input
            type="number"
            min="0"
            max="120"
            className="input-base"
            value={form.send_delay_seconds}
            onChange={e => setField('send_delay_seconds', parseInt(e.target.value) || 0)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Blackout Start" hint="UTC time — no SMS sent from this hour…">
            <input
              type="time"
              className="input-base"
              value={form.blackout_start}
              onChange={e => setField('blackout_start', e.target.value)}
            />
          </Field>
          <Field label="Blackout End" hint="…until this hour.">
            <input
              type="time"
              className="input-base"
              value={form.blackout_end}
              onChange={e => setField('blackout_end', e.target.value)}
            />
          </Field>
        </div>
      </Section>

      {/* ── Revenue Multipliers ── */}
      <Section title="Revenue Multipliers">
        <Field label="Booking Link" hint="CRITICAL — paste your scheduling or booking URL here.">
          <div className="relative">
            <input
              type="url"
              className="input-base pr-20"
              placeholder="https://calendly.com/your-link"
              value={form.booking_link}
              onChange={e => setField('booking_link', e.target.value)}
              style={!form.booking_link ? { borderColor: 'rgba(251,146,60,0.5)' } : {}}
            />
            <span
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(251,146,60,0.15)', color: 'var(--orange)' }}
            >
              CRITICAL
            </span>
          </div>
          {!form.booking_link && (
            <p className="mt-1 text-xs" style={{ color: 'var(--orange)' }}>
              Without a booking link, SMS sequences cannot convert missed calls.
            </p>
          )}
        </Field>
        <Field label="Google Review Link" hint="Sent after a completed job to capture reviews.">
          <input
            type="url"
            className="input-base"
            placeholder="https://g.page/r/your-place/review"
            value={form.google_review_link}
            onChange={e => setField('google_review_link', e.target.value)}
          />
        </Field>
      </Section>

      {/* ── Notifications ── */}
      <Section title="Notifications">
        <Toggle
          label="Missed call alerts"
          checked={form.notification_prefs.missed_call_alerts}
          onChange={v => setNotifPref('missed_call_alerts', v)}
        />
        <Toggle
          label="Inbound reply alerts"
          checked={form.notification_prefs.inbound_reply_alerts}
          onChange={v => setNotifPref('inbound_reply_alerts', v)}
        />
        <Toggle
          label="Weekly report email"
          checked={form.notification_prefs.weekly_report}
          onChange={v => setNotifPref('weekly_report', v)}
        />
      </Section>

      {/* ── Save ── */}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        {saveMsg && (
          <span className="text-xs font-medium" style={{ color: 'var(--brand)' }}>{saveMsg}</span>
        )}
        {saveErr && (
          <span className="text-xs font-medium" style={{ color: 'var(--danger)' }}>{saveErr}</span>
        )}
      </div>

      {/* ── Danger Zone ── */}
      <Section title="Danger Zone">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Delete client</p>
            <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
              Permanently removes this client and all associated data.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteStep === 2}
            className="shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: deleteStep === 1
                ? 'rgba(239,68,68,0.2)'
                : 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: 'var(--danger)',
            }}
          >
            {deleteStep === 0 && 'Delete Client'}
            {deleteStep === 1 && 'Confirm Delete'}
            {deleteStep === 2 && 'Deleting…'}
          </button>
        </div>
        {deleteStep === 1 && (
          <p className="text-xs" style={{ color: 'var(--danger)' }}>
            Click again to permanently delete <strong>{activeClient.business_name}</strong>.
            This cannot be undone.
          </p>
        )}
      </Section>
    </form>
  )
}
