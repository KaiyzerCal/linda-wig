import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--dark)' }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--blue)', borderTopColor: 'transparent' }}
          />
          <span className="text-xs" style={{ color: '#6b7280' }}>Loading…</span>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/" replace />

  return <Outlet />
}
