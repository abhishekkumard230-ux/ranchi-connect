'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { MapPin, RefreshCw } from 'lucide-react'

export default function GlobalError({ error, reset }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-orange-50 via-white to-emerald-50 dark:from-slate-900">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-orange-500 to-emerald-500 shadow-xl mb-6">
          <MapPin className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
        <p className="text-sm text-muted-foreground mb-6">{error?.message || 'An unexpected error occurred.'}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-emerald-500 text-white font-medium shadow">
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
          <Link href="/" className="inline-flex items-center px-4 py-2 rounded-lg border font-medium">Home</Link>
        </div>
      </div>
    </div>
  )
}
