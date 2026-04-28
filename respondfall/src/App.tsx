import { Routes, Route, Navigate } from 'react-router-dom'
import AuthPage from '@/pages/AuthPage'

// Placeholder — replaced in later steps
const Dashboard = () => (
  <div className="flex flex-1 items-center justify-center">
    <div className="text-center space-y-2">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--brand)' }}>
        Respondfall
      </h1>
      <p className="text-gray-400 text-sm">Dashboard — coming in Step 4</p>
    </div>
  </div>
)

export default function App() {
  return (
    <Routes>
      <Route path="/"          element={<Navigate to="/auth" replace />} />
      <Route path="/auth"      element={<AuthPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  )
}
