const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

;(async () => {
  // Find Alice's user id
  const { data: profiles } = await admin.from('profiles').select('*').in('username', ['alice_ranchi', 'bob_ranchi'])
  console.log('Profiles:', profiles.map(p => `${p.username} (${p.id.slice(0,8)})`))
  const alice = profiles.find(p => p.username === 'alice_ranchi')
  const bob = profiles.find(p => p.username === 'bob_ranchi')

  // Follows
  const { data: follows } = await admin.from('follows').select('*')
  console.log('\nFollows:', follows.length)
  follows.forEach(f => {
    const from = profiles.find(p => p.id === f.follower_id)?.username || f.follower_id.slice(0,8)
    const to = profiles.find(p => p.id === f.following_id)?.username || f.following_id.slice(0,8)
    console.log(`  ${from} -> ${to}`)
  })

  // Likes  
  const { data: likes } = await admin.from('likes').select('*, posts(title, user_id)')
  console.log('\nLikes:', likes.length)
  likes.forEach(l => {
    const from = profiles.find(p => p.id === l.user_id)?.username || l.user_id.slice(0,8)
    console.log(`  ${from} liked "${l.posts?.title || 'untitled'}"`)
  })

  // Comments
  const { data: comments } = await admin.from('comments').select('*, posts(title)').order('created_at')
  console.log('\nComments:', comments.length)
  comments.forEach(c => {
    const from = profiles.find(p => p.id === c.user_id)?.username || c.user_id.slice(0,8)
    console.log(`  ${from}: "${c.content.substring(0,60)}" on "${c.posts?.title || '-'}"`)
  })

  // Notifications for Alice
  const { data: notifs } = await admin.from('notifications').select('*').eq('user_id', alice.id).order('created_at', { ascending: false })
  console.log(`\n=== Alice's notifications: ${notifs.length} ===`)
  notifs.forEach(n => {
    const from = profiles.find(p => p.id === n.actor_id)?.username || n.actor_id?.slice(0,8)
    console.log(`  [${n.read ? 'read' : 'UNREAD'}] ${n.type} from @${from}`)
  })

  // Notifications for Bob (mentions triggered by Alice's post @bob_ranchi)
  const { data: notifs2 } = await admin.from('notifications').select('*').eq('user_id', bob.id)
  console.log(`\n=== Bob's notifications: ${notifs2.length} ===`)
  notifs2.forEach(n => {
    const from = profiles.find(p => p.id === n.actor_id)?.username || n.actor_id?.slice(0,8)
    console.log(`  [${n.read ? 'read' : 'UNREAD'}] ${n.type} from @${from}`)
  })
})()
