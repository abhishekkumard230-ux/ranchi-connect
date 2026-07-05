'use client'
import { createBrowserClient } from '@supabase/ssr'

let _client = null

export function createSupabaseBrowserClient() {
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    // eslint-disable-next-line no-console
    console.error('[Ranchi Connect] Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel.')
    if (typeof window !== 'undefined') {
      window.__RANCHI_CONFIG_ERROR__ = 'Missing Supabase env vars in this environment.'
    }
    // Return a stub client that fails safely so the app doesn't hang
    return {
      auth: {
        getSession: async () => ({ data: { session: null }, error: new Error('Supabase not configured') }),
        getUser: async () => ({ data: { user: null }, error: new Error('Supabase not configured') }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: async () => ({ data: null, error: new Error('Supabase not configured') }),
        signUp: async () => ({ data: null, error: new Error('Supabase not configured') }),
        signInWithOAuth: async () => ({ data: null, error: new Error('Supabase not configured') }),
        signOut: async () => ({ error: null }),
      },
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }), single: async () => ({ data: null, error: null }) }), in: () => ({ data: [], error: null }), order: () => ({ range: async () => ({ data: [], error: null }), limit: async () => ({ data: [], error: null }) }) }),
        insert: async () => ({ data: null, error: new Error('Supabase not configured') }),
        update: async () => ({ data: null, error: new Error('Supabase not configured') }),
        delete: async () => ({ data: null, error: new Error('Supabase not configured') }),
      }),
      channel: () => ({ on: function () { return this }, subscribe: () => this, send: () => {} }),
      removeChannel: () => {},
      rpc: async () => ({ data: null, error: new Error('Supabase not configured') }),
      storage: { from: () => ({ upload: async () => ({ error: new Error('Supabase not configured') }), getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
    }
  }
  _client = createBrowserClient(url, key)
  return _client
}
