const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '/app/.env' })

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

;(async () => {
  const { data: alice } = await admin.from('profiles').select('*').eq('username', 'alice_ranchi').single()
  const { data: bob } = await admin.from('profiles').select('*').eq('username', 'bob_ranchi').single()
  const { data: alicePost } = await admin.from('posts').select('*').eq('user_id', alice.id).order('created_at', { ascending: false }).limit(1).single()
  console.log('Alice post:', alicePost?.title)

  // Bob likes Alice's post
  const { error: le } = await admin.from('likes').insert({ post_id: alicePost.id, user_id: bob.id })
  console.log('Like:', le ? le.message : 'inserted')

  // Bob comments on Alice's post
  const { error: ce } = await admin.from('comments').insert({ post_id: alicePost.id, user_id: bob.id, content: 'Awesome @alice_ranchi!' })
  console.log('Comment:', ce ? ce.message : 'inserted')

  // Wait for triggers
  await new Promise(r => setTimeout(r, 1500))

  // Check notifications now
  const { data: notifs } = await admin.from('notifications').select('*').eq('user_id', alice.id).order('created_at', { ascending: false })
  console.log(`\n=== Alice notifications: ${notifs.length} ===`)
  notifs.forEach(n => console.log(`  ${n.type} at ${n.created_at}`))
})()
