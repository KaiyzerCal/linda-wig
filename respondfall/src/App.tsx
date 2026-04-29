import { Routes, Route, Navigate } from 'react-router-dom'
import AuthPage      from '@/pages/AuthPage'
import AppLayout     from '@/components/layout/AppLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
import ActivityTab   from '@/pages/dashboard/ActivityTab'
import InboxTab      from '@/pages/dashboard/InboxTab'
import SequencesTab  from '@/pages/dashboard/SequencesTab'
import AnalyticsTab  from '@/pages/dashboard/AnalyticsTab'
import ConnectTab    from '@/pages/dashboard/ConnectTab'
import SettingsTab   from '@/pages/dashboard/SettingsTab'

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<AuthPage />} />

      {/* Protected dashboard — all share AppLayout (Sidebar + TopBar) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<AppLayout />}>
          <Route index element={<Navigate to="activity" replace />} />
          <Route path="activity"  element={<ActivityTab />} />
          <Route path="inbox"     element={<InboxTab />} />
          <Route path="sequences" element={<SequencesTab />} />
          <Route path="analytics" element={<AnalyticsTab />} />
          <Route path="connect"   element={<ConnectTab />} />
          <Route path="settings"  element={<SettingsTab />} />
        </Route>
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
