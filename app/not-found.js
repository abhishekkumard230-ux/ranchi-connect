import Link from 'next/link'
import { MapPin } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-orange-50 via-white to-emerald-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-orange-500 to-emerald-500 shadow-xl mb-6">
          <MapPin className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold mb-2">404</h1>
        <p className="text-lg font-medium mb-1">This corner of Ranchi doesn&apos;t exist yet.</p>
        <p className="text-sm text-muted-foreground mb-6">The page you&apos;re looking for was moved, removed, or never existed.</p>
        <Link href="/" className="inline-flex items-center px-5 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-emerald-500 text-white font-medium shadow-md hover:shadow-lg transition">
          Back to Feed
        </Link>
      </div>
    </div>
  )
}
