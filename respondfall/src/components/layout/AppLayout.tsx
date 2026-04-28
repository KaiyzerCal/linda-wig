import { ReactNode } from 'react'
import { ClientProvider } from '@/contexts/ClientContext'
import Sidebar from './Sidebar'

interface AppLayoutProps {
  children: ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <ClientProvider>
      <div className="flex h-screen overflow-hidden" style={{ background: 'var(--dark)' }}>
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </ClientProvider>
  )
}
