import type { Metadata, Viewport } from 'next'
import { Geologica, Roboto_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from '@/lib/providers'

const geologica = Geologica({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-geologica',
  display: 'swap',
})

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-mono',
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#08090A',
}

export const metadata: Metadata = {
  title: 'Finexa',
  description: 'Gérez votre patrimoine personnel',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Finexa',
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${geologica.variable} ${robotoMono.variable}`}>
      <head>
        {/* Prevent flash of wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('finexa-theme');
            if (t === 'light') document.documentElement.classList.add('light');
          } catch(e) {}
        ` }} />
      </head>
      <body className="font-sans bg-background text-text-primary antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
