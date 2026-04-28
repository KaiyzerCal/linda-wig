import { useState } from 'react'
import { Client } from '../../lib/supabase'
import { Copy, Phone, Info } from 'lucide-react'
import { clsx } from 'clsx'

type Device = 'iphone' | 'android' | 'google_voice' | 'landline' | 'ringcentral' | 'openphone'
type Carrier = 'att' | 'tmobile' | 'verizon' | 'other'

const forwardingCodes: Record<Device, Record<Carrier, { enable: string; disable: string; note?: string }>> = {
  iphone: {
    att: { enable: '*61*{number}*11*20#', disable: '##61#' },
    tmobile: { enable: '**004*{number}#', disable: '##004#' },
    verizon: { enable: '*71{number}', disable: '*73' },
    other: { enable: '*61*{number}*11*20#', disable: '##61#' },
  },
  android: {
    att: { enable: '*61*{number}*11*20#', disable: '##61#' },
    tmobile: { enable: '**004*{number}#', disable: '##004#' },
    verizon: { enable: '*71{number}', disable: '*73' },
    other: { enable: '*61*{number}*11*20#', disable: '##61#' },
  },
  google_voice: {
    att: { enable: '', disable: '', note: 'Configure in Google Voice settings → Calls → Forward to...' },
    tmobile: { enable: '', disable: '', note: 'Configure in Google Voice settings → Calls → Forward to...' },
    verizon: { enable: '', disable: '', note: 'Configure in Google Voice settings → Calls → Forward to...' },
    other: { enable: '', disable: '', note: 'Configure in Google Voice settings → Calls → Forward to...' },
  },
  landline: {
    att: { enable: '*92 then {number}', disable: '*93', note: 'Dial from your landline' },
    tmobile: { enable: 'Varies by provider', disable: 'Varies', note: 'Contact your provider' },
    verizon: { enable: '*92 then {number}', disable: '*93' },
    other: { enable: 'Contact your provider', disable: 'Contact your provider' },
  },
  ringcentral: {
    att: { enable: '', disable: '', note: 'Configure in RingCentral admin portal → Phone System → Call Handling' },
    tmobile: { enable: '', disable: '', note: 'Configure in RingCentral admin portal → Phone System → Call Handling' },
    verizon: { enable: '', disable: '', note: 'Configure in RingCentral admin portal → Phone System → Call Handling' },
    other: { enable: '', disable: '', note: 'Configure in RingCentral admin portal → Phone System → Call Handling' },
  },
  openphone: {
    att: { enable: '', disable: '', note: 'Configure in OpenPhone settings → Routing → Missed calls' },
    tmobile: { enable: '', disable: '', note: 'Configure in OpenPhone settings → Routing → Missed calls' },
    verizon: { enable: '', disable: '', note: 'Configure in OpenPhone settings → Routing → Missed calls' },
    other: { enable: '', disable: '', note: 'Configure in OpenPhone settings → Routing → Missed calls' },
  },
}

const devices: { id: Device; label: string; icon: string }[] = [
  { id: 'iphone', label: 'iPhone', icon: '📱' },
  { id: 'android', label: 'Android', icon: '🤖' },
  { id: 'google_voice', label: 'Google Voice', icon: '📞' },
  { id: 'landline', label: 'Landline/VoIP', icon: '☎️' },
  { id: 'ringcentral', label: 'RingCentral', icon: '🔔' },
  { id: 'openphone', label: 'OpenPhone', icon: '📲' },
]

const carriers: { id: Carrier; label: string }[] = [
  { id: 'att', label: 'AT&T' },
  { id: 'tmobile', label: 'T-Mobile' },
  { id: 'verizon', label: 'Verizon' },
  { id: 'other', label: 'Other' },
]

export function ConnectTab({ client }: { client: Client }) {
  const [device, setDevice] = useState<Device>('iphone')
  const [carrier, setCarrier] = useState<Carrier>('att')
  const [copied, setCopied] = useState<string | null>(null)

  const number = client.respondfall_number ?? 'No number yet'
  const numberE164 = client.respondfall_number?.replace(/\D/g, '') ?? ''
  const codes = forwardingCodes[device][carrier]

  function formatCode(template: string) {
    return template.replace('{number}', `+1${numberE164}`)
  }

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5 max-w-2xl">
      {/* Respondfall Number */}
      <div className="bg-card rounded-xl border border-subtle p-5">
        <h3 className="text-sm font-bold font-heading text-text-primary mb-4">Your Respondfall Number</h3>
        <div className="flex items-center gap-4 mb-4">
          <div className="text-2xl font-bold font-heading text-success bg-success/10 border border-success/20 px-5 py-2.5 rounded-full">
            {number}
          </div>
          <button
            onClick={() => copyToClipboard(number, 'main')}
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors border border-subtle rounded-lg px-3 py-2"
          >
            <Copy className="w-4 h-4" />
            {copied === 'main' ? 'Copied!' : 'Copy Number'}
          </button>
        </div>
        {client.business_phone && (
          <div className="flex items-start gap-2 bg-accent-blue/10 border border-accent-blue/20 rounded-xl px-4 py-3">
            <Info className="w-4 h-4 text-accent-blue flex-shrink-0 mt-0.5" />
            <p className="text-xs text-accent-blue">
              Your Business Number: {client.business_phone} → missed calls forward to {number}
            </p>
          </div>
        )}
      </div>

      {/* Forwarding Setup */}
      <div className="bg-card rounded-xl border border-subtle p-5">
        <h3 className="text-sm font-bold font-heading text-text-primary mb-1">Conditional Call Forwarding Setup</h3>
        <p className="text-xs text-text-secondary mb-5">
          Your phone still rings normally. Only missed calls forward to your Respondfall number.
        </p>

        {/* Device selector */}
        <div className="mb-4">
          <p className="text-xs text-text-secondary mb-2 font-medium">Select your device:</p>
          <div className="grid grid-cols-3 gap-2">
            {devices.map(d => (
              <button
                key={d.id}
                onClick={() => setDevice(d.id)}
                className={clsx(
                  'flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-xs font-medium transition-colors',
                  device === d.id
                    ? 'bg-accent-blue/15 border-accent-blue/40 text-accent-blue'
                    : 'border-subtle text-text-secondary hover:border-white/20 hover:text-text-primary'
                )}
              >
                <span className="text-xl">{d.icon}</span>
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Carrier tabs (shown for phone-based devices) */}
        {['iphone', 'android'].includes(device) && (
          <div className="mb-5">
            <p className="text-xs text-text-secondary mb-2 font-medium">Select your carrier:</p>
            <div className="flex gap-1 bg-bg-secondary rounded-xl p-1">
              {carriers.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCarrier(c.id)}
                  className={clsx(
                    'flex-1 py-2 rounded-lg text-xs font-semibold transition-colors',
                    carrier === c.id ? 'bg-accent-blue text-white' : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Code display */}
        {codes.note ? (
          <div className="bg-bg-secondary rounded-xl border border-subtle p-4">
            <p className="text-sm text-text-primary">{codes.note}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {codes.enable && (
              <div>
                <p className="text-xs text-text-secondary mb-2">Enable forwarding — dial this:</p>
                <div className="flex items-center gap-3 bg-bg-secondary rounded-xl border border-subtle px-4 py-3">
                  <code className="flex-1 text-sm font-mono text-success tracking-wider">
                    {formatCode(codes.enable)}
                  </code>
                  <button
                    onClick={() => copyToClipboard(formatCode(codes.enable), 'enable')}
                    className="text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                {copied === 'enable' && <p className="text-xs text-success mt-1">Copied!</p>}
              </div>
            )}

            {codes.disable && (
              <div>
                <p className="text-xs text-text-secondary mb-2">Disable forwarding:</p>
                <div className="flex items-center gap-3 bg-bg-secondary rounded-xl border border-subtle px-4 py-3 opacity-60">
                  <code className="flex-1 text-sm font-mono text-text-secondary tracking-wider">
                    {codes.disable}
                  </code>
                  <button
                    onClick={() => copyToClipboard(codes.disable, 'disable')}
                    className="text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {number !== 'No number yet' && (
              <div className="flex items-start gap-2 bg-success/10 border border-success/20 rounded-xl px-4 py-3 mt-2">
                <span className="text-success">✓</span>
                <p className="text-xs text-success">
                  After dialing, you'll hear a confirmation tone. Missed calls will now route through Respondfall and trigger your SMS sequence automatically.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Phone number warning */}
      {!client.respondfall_number && (
        <div className="flex items-start gap-3 bg-warning/10 border border-warning/20 rounded-xl px-4 py-4">
          <Phone className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-warning">No Respondfall number yet</p>
            <p className="text-xs text-text-secondary mt-1">
              Go to Settings → Phone Numbers to search and claim your Respondfall number first.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
