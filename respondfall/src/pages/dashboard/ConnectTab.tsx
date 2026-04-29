import { useState } from 'react'
import { useClientContext } from '@/contexts/ClientContext'

// ── Types ─────────────────────────────────────────────────────────
type DeviceId  = 'iphone' | 'android' | 'gvoice' | 'landline' | 'ringcentral' | 'openphone'
type CarrierId = 'att' | 'tmobile' | 'verizon' | 'other'

interface Device  { id: DeviceId;  label: string; icon: string }
interface Carrier { id: CarrierId; label: string }

const DEVICES: Device[] = [
  { id: 'iphone',      label: 'iPhone',       icon: '🍎' },
  { id: 'android',     label: 'Android',      icon: '🤖' },
  { id: 'gvoice',      label: 'Google Voice', icon: '📞' },
  { id: 'landline',    label: 'Landline / VoIP', icon: '☎️' },
  { id: 'ringcentral', label: 'RingCentral',  icon: '💼' },
  { id: 'openphone',   label: 'OpenPhone',    icon: '📱' },
]

const CARRIERS: Carrier[] = [
  { id: 'att',     label: 'AT&T' },
  { id: 'tmobile', label: 'T-Mobile' },
  { id: 'verizon', label: 'Verizon' },
  { id: 'other',   label: 'Other' },
]

// ── Forwarding code logic ─────────────────────────────────────────
function stripToDigits(num: string) {
  // Remove +1 prefix for codes that want bare digits
  return num.replace(/\D/g, '').replace(/^1/, '')
}

function e164(num: string) {
  // Normalise to +1XXXXXXXXXX
  const d = num.replace(/\D/g, '')
  return d.startsWith('1') ? `+${d}` : `+1${d}`
}

interface CodeBlock {
  label: string
  enable:  string
  disable: string
  note?: string
}

function getCodeBlock(device: DeviceId, carrier: CarrierId, number: string): CodeBlock | null {
  const digits = stripToDigits(number)
  const full   = e164(number)

  // ── App/platform devices — no carrier-specific codes ────────────
  if (device === 'gvoice') {
    return {
      label:  'Google Voice',
      enable: 'Settings-based',
      disable: 'Settings-based',
      note:
        'Open Google Voice → ⚙ Settings → Calls → Incoming calls → ' +
        "enable forwarding to your Respondfall number, then set \"When I don't answer\" " +
        `to forward to ${number}.`,
    }
  }
  if (device === 'ringcentral') {
    return {
      label:  'RingCentral',
      enable: 'Admin portal',
      disable: 'Admin portal',
      note:
        `Log into your RingCentral admin portal → Phone System → Call Handling & Forwarding → ` +
        `add ${number} as a forwarding destination with "No Answer" trigger (timeout 20s).`,
    }
  }
  if (device === 'openphone') {
    return {
      label:  'OpenPhone',
      enable: 'App settings',
      disable: 'App settings',
      note:
        `In the OpenPhone app go to your number settings → Call Forwarding → ` +
        `enable "Forward unanswered calls" and enter ${number}.`,
    }
  }
  if (device === 'landline') {
    return {
      label:  'Landline / VoIP',
      enable: 'Contact your provider',
      disable: 'Contact your provider',
      note:
        `Call your phone provider and ask them to enable "No-Answer Call Forwarding" ` +
        `to ${number}. Most providers can activate this in under 5 minutes. ` +
        'Some VoIP portals (Vonage, Ooma, Spectrum Voice) have a self-serve call-forwarding page under Settings.',
    }
  }

  // ── Mobile devices — carrier-specific dial codes ────────────────
  if (carrier === 'att') {
    return {
      label:   'AT&T — No Answer Forward',
      enable:  `*61*${full}*11*20#`,
      disable: '##61#',
      note:    'Dials out like a regular call. You will hear a confirmation tone.',
    }
  }
  if (carrier === 'tmobile') {
    return {
      label:   'T-Mobile — No Answer Forward',
      enable:  `**004*${full}#`,
      disable: '##004#',
      note:    'Activates conditional call forwarding for no-answer, busy, and unreachable.',
    }
  }
  if (carrier === 'verizon') {
    return {
      label:   'Verizon — No Answer Forward',
      enable:  `*71${digits}`,
      disable: '*73',
      note:    'Dial and press Call. Listen for 3 beeps, then hang up to confirm.',
    }
  }
  // Other carrier
  return {
    label:   'Generic — No Answer Forward (GSM)',
    enable:  `**61*${full}**20#`,
    disable: '##61#',
    note:
      'This is the standard GSM code. If it does not work, contact your carrier and ask ' +
      'to enable "No-Answer Call Forwarding" to ' + number + '.',
  }
}

// ── Copy button ───────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: select the text
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
      style={{
        background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(45,127,249,0.12)',
        border:     `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'rgba(45,127,249,0.25)'}`,
        color:      copied ? 'var(--brand)' : 'var(--blue)',
      }}
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}

// ── Code display row ──────────────────────────────────────────────
function CodeRow({ label, code }: { label: string; code: string }) {
  const isDialCode = !['Settings-based', 'Admin portal', 'App settings', 'Contact your provider']
    .includes(code)

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#6b7280' }}>
        {label}
      </p>
      <div className="flex items-center gap-2">
        <div
          className="flex-1 font-mono text-sm px-3 py-2.5 rounded-lg"
          style={{ background: '#0a0b0f', border: '1px solid #1f2937', color: 'var(--text)' }}
        >
          {code}
        </div>
        {isDialCode && <CopyButton text={code} />}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────
export default function ConnectTab() {
  const { activeClient } = useClientContext()
  const [device,  setDevice]  = useState<DeviceId>('iphone')
  const [carrier, setCarrier] = useState<CarrierId>('att')
  const [numCopied, setNumCopied] = useState(false)

  const showCarriers = device === 'iphone' || device === 'android'
  const respondNumber = activeClient?.respondfall_number ?? null

  const codeBlock = respondNumber
    ? getCodeBlock(device, carrier, respondNumber)
    : null

  async function copyNumber() {
    if (!respondNumber) return
    try {
      await navigator.clipboard.writeText(respondNumber)
      setNumCopied(true)
      setTimeout(() => setNumCopied(false), 2000)
    } catch {}
  }

  if (!activeClient) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm" style={{ color: '#6b7280' }}>Select a client to view connection setup.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
      <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>
        Connect — {activeClient.business_name}
      </h2>

      {/* ── Respondfall number ── */}
      <div className="card p-5 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6b7280' }}>
          Your Respondfall Number
        </h3>

        {respondNumber ? (
          <div className="flex items-center gap-3">
            <div
              className="flex-1 flex items-center gap-2.5 px-4 py-3 rounded-lg font-mono text-lg font-bold"
              style={{
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.25)',
                color: 'var(--brand)',
              }}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: 'var(--brand)' }}
              />
              {respondNumber}
            </div>
            <button
              type="button"
              onClick={copyNumber}
              className="px-4 py-3 rounded-lg text-sm font-semibold transition-all shrink-0"
              style={{
                background: numCopied ? 'rgba(16,185,129,0.15)' : 'rgba(45,127,249,0.12)',
                border:     `1px solid ${numCopied ? 'rgba(16,185,129,0.3)' : 'rgba(45,127,249,0.25)'}`,
                color:      numCopied ? 'var(--brand)' : 'var(--blue)',
              }}
            >
              {numCopied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        ) : (
          <div
            className="px-4 py-3 rounded-lg text-sm"
            style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.25)', color: '#fb923c' }}
          >
            No number provisioned yet — go to Settings → Phone Numbers to claim one.
          </div>
        )}

        {/* How it works */}
        <div
          className="flex items-start gap-3 rounded-lg px-4 py-3"
          style={{ background: '#111827', border: '1px solid #1f2937' }}
        >
          <span className="text-lg mt-0.5">📡</span>
          <p className="text-xs" style={{ color: '#9ca3af' }}>
            <span className="font-semibold" style={{ color: 'var(--text)' }}>How it works:</span>{' '}
            Give this number to your customers. All calls forward to your real business phone.
            If a call goes unanswered, Respondfall automatically texts the caller within seconds.
            Replies land in your Inbox.
          </p>
        </div>
      </div>

      {/* ── Device selection ── */}
      <div className="card p-5 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6b7280' }}>
          Your Device
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {DEVICES.map(d => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDevice(d.id)}
              className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-xs font-medium transition-all"
              style={{
                background: device === d.id ? 'rgba(45,127,249,0.12)' : '#1f2937',
                border:     `1.5px solid ${device === d.id ? 'rgba(45,127,249,0.4)' : '#374151'}`,
                color:      device === d.id ? 'var(--blue)' : '#9ca3af',
              }}
            >
              <span className="text-2xl">{d.icon}</span>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Carrier tabs (mobile only) ── */}
      {showCarriers && (
        <div className="card p-5 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6b7280' }}>
            Carrier
          </h3>
          <div
            className="flex rounded-lg p-1 gap-1"
            style={{ background: '#0a0b0f' }}
          >
            {CARRIERS.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCarrier(c.id)}
                className="flex-1 py-2 rounded-md text-xs font-semibold transition-all"
                style={{
                  background: carrier === c.id ? 'var(--surface)' : 'transparent',
                  color:      carrier === c.id ? 'var(--text)' : '#6b7280',
                  boxShadow:  carrier === c.id ? '0 1px 3px rgba(0,0,0,0.4)' : 'none',
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Forwarding instructions ── */}
      {!respondNumber && (
        <div
          className="card px-5 py-4 text-xs"
          style={{ color: '#6b7280', borderStyle: 'dashed' }}
        >
          Provision a Respondfall number in Settings to see forwarding codes.
        </div>
      )}

      {respondNumber && codeBlock && (
        <div className="card p-5 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6b7280' }}>
            {codeBlock.label}
          </h3>

          {/* Settings-based devices */}
          {!showCarriers || ['gvoice', 'landline', 'ringcentral', 'openphone'].includes(device) ? (
            <div
              className="rounded-lg px-4 py-3 text-xs leading-relaxed"
              style={{ background: '#111827', border: '1px solid #1f2937', color: '#9ca3af' }}
            >
              {codeBlock.note}
            </div>
          ) : (
            <>
              {/* Enable / disable codes */}
              <div className="grid grid-cols-2 gap-3">
                <CodeRow label="Enable forwarding — dial this" code={codeBlock.enable} />
                <CodeRow label="Disable forwarding — dial this" code={codeBlock.disable} />
              </div>

              {/* Note */}
              {codeBlock.note && (
                <div
                  className="rounded-lg px-4 py-3 text-xs leading-relaxed"
                  style={{ background: '#111827', border: '1px solid #1f2937', color: '#9ca3af' }}
                >
                  💡 {codeBlock.note}
                </div>
              )}

              {/* Confirmation bar */}
              <div
                className="flex items-start gap-3 rounded-lg px-4 py-3"
                style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}
              >
                <span className="text-base">✅</span>
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold" style={{ color: 'var(--brand)' }}>
                    After dialing the enable code:
                  </p>
                  <p style={{ color: '#9ca3af' }}>
                    Your phone will ring as normal. If you don't answer within ~20 seconds,
                    the call forwards to your Respondfall number. The missed caller receives
                    an automated text within {activeClient.send_delay_seconds ?? 30} seconds.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
