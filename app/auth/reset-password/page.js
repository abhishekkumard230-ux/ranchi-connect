'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { toast } from 'sonner'
import { MapPin, Loader2, Lock, CheckCircle2 } from 'lucide-react'

function ResetInner() {
  const supabase = createSupabaseBrowserClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pw1, setPw1] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)
  const [errMsg, setErrMsg] = useState(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    // The recovery link redirects here; Supabase auto-signs the user in temporarily so they can set a new password.
    const timeout = setTimeout(() => setReady(true), 4000)
    ;(async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        if (!data?.session) {
          const err = searchParams.get('error_description') || 'This reset link is invalid or has expired. Please request a new one.'
          setErrMsg(decodeURIComponent(err).replace(/\+/g,' '))
        }
      } catch (e) {
        setErrMsg(e?.message || 'Unable to verify reset link.')
      } finally {
        setReady(true)
        clearTimeout(timeout)
      }
    })()
    return () => clearTimeout(timeout)
  }, [supabase, searchParams])

  const submit = async (e) => {
    e.preventDefault()
    if (pw1.length < 6) { toast.error('Password must be at least 6 characters'); return }
    if (pw1 !== pw2) { toast.error('Passwords do not match'); return }
    setBusy(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pw1 })
      if (error) throw error
      setDone(true)
      toast.success('Password updated!')
      await supabase.auth.signOut()
      setTimeout(() => router.push('/?reset=1'), 1500)
    } catch (err) {
      toast.error(err.message || 'Failed to update password')
    } finally {
      setBusy(false)
    }
  }

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-orange-50 via-white to-emerald-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-500 to-emerald-500 shadow mb-3">
            <Lock className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Set a new password</h1>
          <p className="text-sm text-muted-foreground mt-1">Choose a strong password you haven&apos;t used before.</p>
        </div>

        {done ? (
          <Card className="shadow-xl">
            <CardContent className="pt-6 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-medium">Password updated! Redirecting to sign-in…</p>
            </CardContent>
          </Card>
        ) : errMsg ? (
          <Card className="shadow-xl">
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-red-500 mb-4">{errMsg}</p>
              <Link href="/" className="inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-emerald-500 text-white font-medium">Back to sign-in</Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-xl">
            <CardContent className="pt-6">
              <form onSubmit={submit} className="space-y-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">New password</label>
                  <Input type="password" value={pw1} onChange={e => setPw1(e.target.value)} minLength={6} required autoFocus />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Confirm password</label>
                  <Input type="password" value={pw2} onChange={e => setPw2(e.target.value)} minLength={6} required />
                </div>
                <Button type="submit" disabled={busy} className="w-full bg-gradient-to-r from-orange-500 to-emerald-500 text-white">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update password'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground mt-6">
          <MapPin className="h-3 w-3 inline" /> Ranchi Connect
        </p>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetInner />
    </Suspense>
  )
}
