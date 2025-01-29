import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Monitor SIM',
  description: 'Sistema Integrado de Monitoramento',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
      </body>
    </html>
  )
}
