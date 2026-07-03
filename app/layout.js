import './globals.css'
import { Providers } from './providers'

export const metadata = {
  title: 'Ranchi Connect — Community of Ranchi',
  description: 'The exclusive online community for Ranchi residents. Share news, events, questions, listings, jobs and recommendations with your neighbours.',
  keywords: ['Ranchi', 'Jharkhand', 'community', 'social network', 'news', 'events', 'jobs', 'buy sell'],
  openGraph: {
    title: 'Ranchi Connect',
    description: 'The exclusive online community for Ranchi residents.',
    type: 'website',
  },
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
