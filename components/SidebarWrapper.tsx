'use client'

import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'

const PUBLIC_PATHS = ['/', '/cadastro']

export default function SidebarWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isPublic = PUBLIC_PATHS.includes(pathname)

  if (isPublic) {
    return <>{children}</>
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
      }}
    >
      <Sidebar />
      <main
        style={{
          flex: 1,
          padding: '40px',
          overflowX: 'hidden',
        }}
      >
        {children}
      </main>
    </div>
  )
}
