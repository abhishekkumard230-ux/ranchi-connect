'use client'
import Link from 'next/link'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, MapPin, LogIn } from 'lucide-react'

function VerifiedInner() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-orange-50 via-white to-emerald-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-red-500/10 text-red-500 shadow mb-4">
            <MapPin className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Verification failed</h1>
          <p className="text-sm text-muted-foreground mb-6">{decodeURIComponent(errorDescription || error).replace(/\+/g, ' ')}</p>
          <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-emerald-500 text-white font-medium shadow">
            <LogIn className="h-4 w-4" /> Back to Sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-orange-50 via-white to-emerald-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-emerald-500/10 text-emerald-500 shadow mb-5">
          <CheckCircle2 className="h-11 w-11" />
        </div>
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-orange-600 to-emerald-600 bg-clip-text text-transparent">Email verified successfully!</h1>
        <p className="text-sm text-muted-foreground mb-8">Please log in to continue and start connecting with fellow Ranchi residents.</p>
        <Link href="/?verified=1" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-orange-500 to-emerald-500 text-white font-medium shadow-lg hover:shadow-xl transition">
          <LogIn className="h-4 w-4" /> Log in to Ranchi Connect
        </Link>
      </div>
    </div>
  )
}

export default function VerifiedPage() {
  return (
    <Suspense fallback={null}>
      <VerifiedInner />
    </Suspense>
  )
}
