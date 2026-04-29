import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

type Tab = 'signin' | 'signup' | 'magic'

interface FormState {
  email: string
  password: string
}

// SkyforgeAI eagle mark — geometric SVG
function EagleLogo() {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-10 h-10"
      aria-label="SkyforgeAI"
    >
      {/* Body */}
      <path
        d="M32 12 L36 28 L32 32 L28 28 Z"
        fill="#2d7ff9"
        opacity="0.95"
      />
      {/* Left wing */}
      <path
        d="M32 24 L8 20 L14 30 L28 29 Z"
        fill="#2d7ff9"
        opacity="0.75"
      />
      {/* Right wing */}
      <path
        d="M32 24 L56 20 L50 30 L36 29 Z"
        fill="#2d7ff9"
        opacity="0.75"
      />
      {/* Left wing tip sweep */}
      <path
        d="M14 30 L8 20 L6 36 L22 34 Z"
        fill="#10b981"
        opacity="0.85"
      />
      {/* Right wing tip sweep */}
      <path
        d="M50 30 L56 20 L58 36 L42 34 Z"
        fill="#10b981"
        opacity="0.85"
      />
      {/* Tail */}
      <path
        d="M28 30 L24 48 L32 44 L40 48 L36 30 Z"
        fill="#2d7ff9"
        opacity="0.8"
      />
      {/* Head */}
      <circle cx="32" cy="10" r="4" fill="#f1f5f9" />
      {/* Beak */}
      <path d="M32 12 L35 15 L32 14 Z" fill="#fb923c" />
    </svg>
  )
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'signin', label: 'Sign In' },
  { id: 'signup', label: 'Sign Up' },
  { id: 'magic',  label: 'Magic Link' },
]

export default function AuthPage() {
  const navigate = useNavigate()
  const [tab, setTab]         = useState<Tab>('signin')
  const [form, setForm]       = useState<FormState>({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [notice, setNotice]   = useState<string | null>(null)

  function handleField(field: keyof FormState, value: string) {
    setForm(f => ({ ...f, [field]: value }))
    setError(null)
    setNotice(null)
  }

  function switchTab(t: Tab) {
    setTab(t)
    setError(null)
    setNotice(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setLoading(true)

    try {
      if (tab === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        })
        if (error) throw error
        navigate('/dashboard/activity', { replace: true })

      } else if (tab === 'signup') {
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
        })
        if (error) throw error
        setNotice('Check your inbox to confirm your email, then sign in.')

      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email: form.email,
          options: { emailRedirectTo: `${window.location.origin}/dashboard/activity` },
        })
        if (error) throw error
        setNotice('Magic link sent — check your inbox.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const submitLabel = {
    signin: loading ? 'Signing in…' : 'Sign In',
    signup: loading ? 'Creating account…' : 'Create Account',
    magic:  loading ? 'Sending link…' : 'Send Magic Link',
  }[tab]

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between px-4 py-10"
      style={{ background: 'var(--dark)' }}
    >
      {/* ── Main card ── */}
      <div className="flex-1 flex items-center justify-center w-full">
        <div className="w-full max-w-sm space-y-8">

          {/* Logo + brand */}
          <div className="flex flex-col items-center gap-4">
            <div
              className="relative flex items-center justify-center w-20 h-20 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(45,127,249,0.18) 0%, rgba(45,127,249,0.04) 70%)',
                boxShadow: '0 0 0 1px rgba(45,127,249,0.25), 0 0 32px rgba(45,127,249,0.3)',
              }}
            >
              <EagleLogo />
            </div>

            <div className="text-center space-y-1">
              <h1
                className="text-2xl font-black tracking-[0.18em] uppercase"
                style={{ color: 'var(--text)' }}
              >
                Respondfall
              </h1>
              <p className="text-xs font-medium tracking-widest uppercase" style={{ color: '#6b7280' }}>
                Missed Call Revenue Recovery
              </p>
            </div>
          </div>

          {/* Card */}
          <div className="card p-6 space-y-6">

            {/* Tabs */}
            <div
              className="flex rounded-lg p-1 gap-1"
              style={{ background: '#0a0b0f' }}
              role="tablist"
              aria-label="Authentication options"
            >
              {TABS.map(t => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => switchTab(t.id)}
                  className="flex-1 rounded-md py-2 text-xs font-semibold transition-all"
                  style={{
                    background: tab === t.id ? 'var(--surface)' : 'transparent',
                    color: tab === t.id ? 'var(--text)' : '#6b7280',
                    boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,0.4)' : 'none',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: '#9ca3af' }}
                  >
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@example.com"
                    className="input-base"
                    value={form.email}
                    onChange={e => handleField('email', e.target.value)}
                  />
                </div>

                {tab !== 'magic' && (
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-xs font-medium mb-1.5"
                      style={{ color: '#9ca3af' }}
                    >
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                      required
                      placeholder={tab === 'signup' ? 'Min 8 characters' : '••••••••'}
                      minLength={tab === 'signup' ? 8 : undefined}
                      className="input-base"
                      value={form.password}
                      onChange={e => handleField('password', e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Feedback */}
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

              {notice && (
                <div
                  className="rounded-lg px-3 py-2.5 text-xs font-medium"
                  style={{
                    background: 'rgba(16,185,129,0.1)',
                    border: '1px solid rgba(16,185,129,0.25)',
                    color: 'var(--brand)',
                  }}
                  role="status"
                >
                  {notice}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {submitLabel}
              </button>
            </form>

            {/* Tab-specific helper text */}
            {tab === 'magic' && (
              <p className="text-center text-xs" style={{ color: '#6b7280' }}>
                No password needed — we'll email you a one-click link.
              </p>
            )}
            {tab === 'signup' && (
              <p className="text-center text-xs" style={{ color: '#6b7280' }}>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchTab('signin')}
                  className="underline hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--blue)' }}
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="mt-8 text-center text-xs" style={{ color: '#374151' }}>
        Powered by{' '}
        <span className="font-semibold" style={{ color: '#4b5563' }}>
          SkyforgeAI
        </span>
        {' · '}Enterprise-Grade Infrastructure
      </footer>
    </div>
  )
}
