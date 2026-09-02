import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Handles OAuth + email-confirmation callbacks: exchanges the ?code=... for a session cookie,
// then redirects the user according to the `next` param (or the flow type).
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') || '/'
  const type = searchParams.get('type') // 'signup' | 'recovery' | 'invite' | 'magiclink' | 'email_change'
  const errorDescription = searchParams.get('error_description')

  if (errorDescription) {
    const target = type === 'recovery' ? '/auth/reset-password' : (type === 'signup' ? '/auth/verified' : '/')
    return NextResponse.redirect(`${origin}${target}?error=${encodeURIComponent(errorDescription)}`)
  }

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      const target = type === 'recovery' ? '/auth/reset-password' : (type === 'signup' ? '/auth/verified' : '/')
      return NextResponse.redirect(`${origin}${target}?error=${encodeURIComponent(error.message)}`)
    }
    // Success. Where do we send them?
    // - Signup verification -> dedicated success page
    // - Recovery -> reset password page
    // - Everything else (OAuth, magic link) -> home
    if (type === 'signup') return NextResponse.redirect(`${origin}/auth/verified`)
    if (type === 'recovery') return NextResponse.redirect(`${origin}/auth/reset-password`)
    return NextResponse.redirect(`${origin}${next}`)
  }

  return NextResponse.redirect(`${origin}/?auth_error=missing_code`)
}
