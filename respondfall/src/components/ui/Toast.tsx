import { useToast } from '@/contexts/ToastContext'
import type { Toast } from '@/contexts/ToastContext'

const STYLES: Record<Toast['type'], { bg: string; border: string; color: string; icon: string }> = {
  success: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', color: 'var(--brand)',  icon: '✓' },
  error:   { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  color: 'var(--danger)', icon: '✕' },
  info:    { bg: 'rgba(45,127,249,0.12)', border: 'rgba(45,127,249,0.3)', color: 'var(--blue)',   icon: 'ℹ' },
}

function ToastItem({ toast }: { toast: Toast }) {
  const { dismiss } = useToast()
  const s = STYLES[toast.type]

  return (
    <div
      className="flex items-start gap-3 rounded-xl px-4 py-3 shadow-2xl min-w-[260px] max-w-sm"
      style={{
        background:  s.bg,
        border:      `1px solid ${s.border}`,
        backdropFilter: 'blur(12px)',
        animation: 'slideIn 0.2s ease',
      }}
      role="alert"
    >
      <span className="text-sm font-bold mt-0.5 shrink-0" style={{ color: s.color }}>
        {s.icon}
      </span>
      <p className="text-xs flex-1 leading-relaxed" style={{ color: 'var(--text)' }}>
        {toast.message}
      </p>
      <button
        onClick={() => dismiss(toast.id)}
        className="shrink-0 text-xs opacity-50 hover:opacity-100 transition-opacity mt-0.5"
        style={{ color: 'var(--text)' }}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}

export default function ToastContainer() {
  const { toasts } = useToast()

  if (toasts.length === 0) return null

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(16px); }
          to   { opacity: 1; transform: translateX(0);    }
        }
      `}</style>
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} />
          </div>
        ))}
      </div>
    </>
  )
}
