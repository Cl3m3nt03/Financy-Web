import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/lib/providers'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#09090B',
}

export const metadata: Metadata = {
  title: 'Wealth Tracker',
  description: 'Gérez votre patrimoine personnel',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Financy',
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        {/* Prevent flash of wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('financy-theme');
            if (t === 'light') document.documentElement.classList.add('light');
          } catch(e) {}
        ` }} />
      </head>
      <body className={`${inter.className} bg-background text-text-primary antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
