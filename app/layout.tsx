import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/lib/providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Wealth Tracker',
  description: 'Gérez votre patrimoine personnel',
  manifest: '/manifest.json',
  themeColor: '#C9A84C',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Financy',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <body className={`${inter.className} bg-background text-text-primary antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
