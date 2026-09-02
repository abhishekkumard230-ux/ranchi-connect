import './globals.css'
import { Providers } from './providers'

const RAW_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://ranchi-connect.vercel.app'
// Guard against malformed values so the whole app doesn't crash at render time
let APP_URL = 'https://ranchi-connect.vercel.app'
try {
  APP_URL = new URL(RAW_URL).origin
} catch (_) {
  APP_URL = 'https://ranchi-connect.vercel.app'
}

export const metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'Ranchi Connect — Community of Ranchi',
    template: '%s | Ranchi Connect',
  },
  description: 'The exclusive online community for Ranchi residents. Share news, events, questions, listings, jobs and recommendations with your neighbours.',
  keywords: ['Ranchi', 'Jharkhand', 'community', 'social network', 'news', 'events', 'jobs', 'buy sell', 'Ranchi Connect'],
  authors: [{ name: 'Ranchi Connect' }],
  openGraph: {
    title: 'Ranchi Connect',
    description: 'The exclusive online community for Ranchi residents.',
    type: 'website',
    locale: 'en_IN',
    url: APP_URL,
    siteName: 'Ranchi Connect',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ranchi Connect',
    description: 'The exclusive online community for Ranchi residents.',
  },
  icons: {
    icon: [
      { url: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Cdefs%3E%3ClinearGradient id=%22g%22 x1=%220%22 x2=%221%22 y1=%220%22 y2=%221%22%3E%3Cstop offset=%220%22 stop-color=%22%23f97316%22/%3E%3Cstop offset=%221%22 stop-color=%22%2310b981%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width=%22100%22 height=%22100%22 rx=%2220%22 fill=%22url(%23g)%22/%3E%3Cpath d=%22M50 25c-8 0-15 7-15 15 0 12 15 30 15 30s15-18 15-30c0-8-7-15-15-15zm0 20a5 5 0 110-10 5 5 0 010 10z%22 fill=%22white%22/%3E%3C/svg%3E' },
    ],
  },
  robots: { index: true, follow: true },
}

export const viewport = {
  themeColor: '#f97316',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
