import type { Metadata } from 'next'
import './globals.css'
import SidebarWrapper from '@/components/SidebarWrapper'
import Providers from '@/components/Providers'

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
        <Providers>
          <SidebarWrapper>{children}</SidebarWrapper>
        </Providers>
      </body>
    </html>
  )
}
