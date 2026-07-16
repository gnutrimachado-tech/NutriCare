'use client'

import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'

const AUTH_ROUTES = ['/', '/cadastro']

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthPage = AUTH_ROUTES.includes(pathname)

  if (isAuthPage) {
    return <>{children}</>
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '40px' }}>
        {children}
      </main>
    </div>
  )
}
