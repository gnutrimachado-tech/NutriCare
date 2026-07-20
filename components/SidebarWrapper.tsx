'use client'

import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'

export default function SidebarWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const isPublic =
    pathname === '/' ||
    pathname.startsWith('/cadastro') ||
    pathname.startsWith('/redefinir-senha') ||
    pathname.startsWith('/formulario-paciente')

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
