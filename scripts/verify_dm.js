const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '/app/.env' })

;(async () => {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  const { data: alice } = await admin.from('profiles').select('id').eq('username', 'alice_ranchi').single()
  const { data: bob } = await admin.from('profiles').select('id').eq('username', 'bob_ranchi').single()

  // Clean up existing DM between them (for a fresh test)
  const { data: mine } = await admin.from('conversation_participants').select('conversation_id').eq('user_id', alice.id)
  const myIds = (mine || []).map(p => p.conversation_id)
  if (myIds.length > 0) {
    const { data: shared } = await admin.from('conversation_participants').select('conversation_id').eq('user_id', bob.id).in('conversation_id', myIds)
    for (const s of (shared || [])) {
      await admin.from('conversations').delete().eq('id', s.conversation_id)
    }
    console.log('Cleaned', (shared || []).length, 'existing conversations')
  }

  // Test the RPC using an anon client signed in as Alice
  const alicClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const { error: authErr } = await alicClient.auth.signInWithPassword({ email: 'alice.test@ranchiconnect.dev', password: 'Password123!' })
  if (authErr) { console.error('Auth fail:', authErr.message); process.exit(1) }

  const { data: convId, error } = await alicClient.rpc('create_direct_conversation', { other_user_id: bob.id })
  console.log('RPC result:', { convId, error: error?.message })

  if (convId) {
    // Send a message as Alice
    const { data: msg, error: me } = await alicClient.from('messages').insert({
      conversation_id: convId, sender_id: alice.id, content: 'Hi Bob! This is Alice testing DM.'
    }).select().single()
    console.log('Send message:', me ? me.message : `sent id=${msg.id.slice(0,8)}`)

    // Wait for trigger, check notification for Bob
    await new Promise(r => setTimeout(r, 800))
    const { data: notifs } = await admin.from('notifications').select('*').eq('user_id', bob.id).eq('type', 'message')
    console.log(`Bob's message notifications: ${notifs.length}`)
    notifs.forEach(n => console.log(`  message: "${n.message}"`))

    // Verify Alice can list the conversation
    const { data: myConvs, error: le } = await alicClient.from('conversation_participants').select('conversation_id').eq('user_id', alice.id)
    console.log('Alice conversations count:', myConvs?.length, le?.message || '')

    // Bob's view
    const bobClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    await bobClient.auth.signInWithPassword({ email: 'bob.test@ranchiconnect.dev', password: 'Password123!' })
    const { data: bobMsgs, error: be } = await bobClient.from('messages').select('*').eq('conversation_id', convId)
    console.log('Bob sees messages:', bobMsgs?.length, be?.message || '')

    // Bob replies
    const { error: rerr } = await bobClient.from('messages').insert({ conversation_id: convId, sender_id: bob.id, content: 'Hey Alice! Got it 👋' })
    console.log('Bob reply:', rerr ? rerr.message : 'sent')
  }
})()
