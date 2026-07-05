const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '/app/.env' })
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

;(async () => {
  const { data: alice } = await admin.from('profiles').select('id').eq('username', 'alice_ranchi').single()
  const { data: bob } = await admin.from('profiles').select('id').eq('username', 'bob_ranchi').single()
  const cats = ['news','events','questions','buysell','jobs','recommendations','general']
  const titles = [
    'Best chaat in Main Road?', 'Ranchi Marathon 2026 registration open',
    'New restaurant opened in Kanke', 'Traffic jam near Kutchery Chowk daily 5-7 PM',
    'Looking for Hindi tutor', 'MG Marg beautification project update',
    'Selling used Royal Enfield 350', 'Any recommendations for good gyms?',
    'Job opening at TCS Ranchi', 'Best schools in Ashok Nagar?',
    'Water shortage in Doranda area', 'Ranchi weather this weekend',
    'Free eye camp at Rajendra Institute', 'Cheap fruit market timings',
    'Coding meetup at Firayalal',
  ]
  for (let i = 0; i < titles.length; i++) {
    const owner = i % 2 === 0 ? alice.id : bob.id
    await admin.from('posts').insert({
      user_id: owner,
      title: titles[i],
      content: `Post #${i+1}: ${titles[i]}. Anyone with info please share your thoughts in the comments!`,
      category: cats[i % cats.length],
    })
  }
  const { count } = await admin.from('posts').select('*', { count: 'exact', head: true })
  console.log(`Total posts now: ${count}`)
})()
