import type { Metadata } from 'next'
import './globals.css'
import SidebarWrapper from '@/components/SidebarWrapper'

export const metadata: Metadata = {
  title: 'NutriCare',
  description: 'Sistema Profissional para Nutricionistas',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>
        <SidebarWrapper>{children}</SidebarWrapper>
      </body>
    </html>
  )
}
