import { Routes, Route, Navigate } from 'react-router-dom'

// Placeholder pages — replaced in later steps
const Dashboard = () => (
  <div className="flex flex-1 items-center justify-center">
    <div className="text-center space-y-2">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--brand)' }}>
        Respondfall
      </h1>
      <p className="text-gray-400 text-sm">Missed call recovery — coming soon</p>
    </div>
  </div>
)

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Dashboard />} />
      {/* Additional routes wired in later steps */}
    </Routes>
  )
}
