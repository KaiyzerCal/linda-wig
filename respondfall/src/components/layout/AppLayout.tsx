import { Outlet, useLocation } from 'react-router-dom'
import { ClientProvider } from '@/contexts/ClientContext'
import { ToastProvider } from '@/contexts/ToastContext'
import ToastContainer from '@/components/ui/Toast'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function AppLayout() {
  const { pathname } = useLocation()
  // Inbox needs overflow-hidden for its split-panel layout
  const isInbox = pathname === '/dashboard/inbox'

  return (
    <ClientProvider>
      <ToastProvider>
        <div className="flex h-screen overflow-hidden" style={{ background: 'var(--dark)' }}>
          {/* Left sidebar */}
          <Sidebar />

          {/* Right column */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <TopBar />
            <main className={`flex-1 ${isInbox ? 'overflow-hidden' : 'overflow-y-auto'}`}>
              <Outlet />
            </main>
          </div>
        </div>

        <ToastContainer />
      </ToastProvider>
    </ClientProvider>
  )
}
