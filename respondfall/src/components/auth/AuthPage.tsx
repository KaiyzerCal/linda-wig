import { useState } from 'react'
import { Bird } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../ui/Button'
import { clsx } from 'clsx'

type Tab = 'signin' | 'signup' | 'magic'

export function AuthPage() {
  const [tab, setTab] = useState<Tab>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const { signIn, signUp, signInWithMagicLink } = useAuth()

  const tabLabels: { id: Tab; label: string }[] = [
    { id: 'signin', label: 'SIGN IN' },
    { id: 'signup', label: 'SIGN UP' },
    { id: 'magic', label: 'MAGIC LINK' },
  ]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (tab === 'signin') {
        const { error } = await signIn(email, password)
        if (error) setMessage({ type: 'error', text: error.message })
      } else if (tab === 'signup') {
        const { error } = await signUp(email, password)
        if (error) setMessage({ type: 'error', text: error.message })
        else setMessage({ type: 'success', text: 'Check your email to confirm your account.' })
      } else {
        const { error } = await signInWithMagicLink(email)
        if (error) setMessage({ type: 'error', text: error.message })
        else setMessage({ type: 'success', text: 'Magic link sent — check your inbox.' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="relative">
              <Bird className="w-10 h-10 text-accent-blue" strokeWidth={1.5} />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-revenue" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-heading tracking-[0.2em] text-text-primary">
                RESPONDFALL
              </h1>
              <p className="text-xs text-text-secondary tracking-widest">BY SKYFORGEAI</p>
            </div>
          </div>
          <p className="text-text-secondary text-sm">Missed call recovery for service businesses</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-subtle rounded-2xl p-8">
          {/* Tabs */}
          <div className="flex border-b border-subtle mb-6">
            {tabLabels.map(t => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setMessage(null) }}
                className={clsx(
                  'flex-1 py-2.5 text-xs font-semibold tracking-widest transition-colors',
                  tab === t.id
                    ? 'text-accent-blue border-b-2 border-accent-blue -mb-px'
                    : 'text-text-secondary hover:text-text-primary'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-text-secondary mb-1.5 font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@skyforgeai.com"
                className="w-full bg-bg-secondary border border-subtle rounded-lg px-4 py-2.5 text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-active text-sm"
              />
            </div>

            {tab !== 'magic' && (
              <div>
                <label className="block text-xs text-text-secondary mb-1.5 font-medium">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-bg-secondary border border-subtle rounded-lg px-4 py-2.5 text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-active text-sm"
                />
              </div>
            )}

            {message && (
              <div className={clsx(
                'rounded-lg px-4 py-3 text-sm',
                message.type === 'error' ? 'bg-danger/10 text-danger border border-danger/20' : 'bg-success/10 text-success border border-success/20'
              )}>
                {message.text}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full justify-center py-3">
              {loading ? 'Loading...' : tab === 'signin' ? 'Sign In' : tab === 'signup' ? 'Create Account' : 'Send Magic Link'}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-text-secondary/50 mt-6 tracking-wide">
          Powered by SkyforgeAI · Enterprise-Grade Infrastructure
        </p>
      </div>
    </div>
  )
}
