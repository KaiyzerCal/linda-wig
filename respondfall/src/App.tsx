import { Routes, Route, Navigate } from 'react-router-dom'
import AuthPage from '@/pages/AuthPage'
import AppLayout from '@/components/layout/AppLayout'
import DashboardPage from '@/pages/DashboardPage'

export default function App() {
  return (
    <Routes>
      <Route path="/"     element={<Navigate to="/auth" replace />} />
      <Route path="/auth" element={<AuthPage />} />

      <Route
        path="/dashboard"
        element={
          <AppLayout>
            <DashboardPage />
          </AppLayout>
        }
      />
    </Routes>
  )
}
