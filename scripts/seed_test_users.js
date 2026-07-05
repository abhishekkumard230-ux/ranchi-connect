// Seed 2 test users via Supabase admin API (auto-confirmed).
// Usage: node scripts/seed_test_users.js
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Missing env vars')
  process.exit(1)
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

const users = [
  { email: 'alice.test@ranchiconnect.dev', password: 'Password123!', username: 'alice_ranchi', full_name: 'Alice Kumari' },
  { email: 'bob.test@ranchiconnect.dev', password: 'Password123!', username: 'bob_ranchi', full_name: 'Bob Singh' },
]

;(async () => {
  for (const u of users) {
    // Delete existing user if exists (idempotent)
    const { data: list } = await admin.auth.admin.listUsers()
    const existing = list?.users?.find(x => x.email === u.email)
    if (existing) {
      await admin.auth.admin.deleteUser(existing.id)
      console.log('Deleted existing:', u.email)
    }

    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { username: u.username, full_name: u.full_name },
    })
    if (error) { console.error('Create failed', u.email, error.message); continue }
    console.log('Created:', u.email, 'id:', data.user.id)
  }
})()
