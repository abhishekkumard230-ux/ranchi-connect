import { createSupabaseServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PostPageClient from './PostPageClient'

export async function generateMetadata({ params }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: post } = await supabase.from('posts').select('id, title, content, image_url, category, user_id').eq('id', id).maybeSingle()
  if (!post) return { title: 'Post not found - Ranchi Connect' }

  const { data: author } = await supabase.from('profiles').select('username, full_name').eq('id', post.user_id).maybeSingle()
  const title = (post.title || post.content?.substring(0, 60) || 'Post').substring(0, 80)
  const description = post.content?.substring(0, 160) || 'A post from Ranchi Connect'
  const authorName = author?.full_name || author?.username || 'Ranchi resident'

  return {
    title: `${title} — by ${authorName} on Ranchi Connect`,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      images: post.image_url ? [{ url: post.image_url }] : [],
    },
    twitter: {
      card: post.image_url ? 'summary_large_image' : 'summary',
      title,
      description,
      images: post.image_url ? [post.image_url] : undefined,
    },
  }
}

export default async function PostPage({ params }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: post } = await supabase.from('posts').select('*').eq('id', id).maybeSingle()
  if (!post) return notFound()

  const { data: author } = await supabase.from('profiles').select('*').eq('id', post.user_id).maybeSingle()

  // Related posts - same category, excluding this one
  const { data: relatedRaw } = await supabase
    .from('posts')
    .select('id, title, content, category, image_url, created_at, user_id')
    .eq('category', post.category)
    .neq('id', id)
    .order('created_at', { ascending: false })
    .limit(4)

  // Fetch author profiles for related posts
  const relatedUserIds = [...new Set((relatedRaw || []).map(p => p.user_id))]
  let relProfMap = {}
  if (relatedUserIds.length > 0) {
    const { data: profs } = await supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', relatedUserIds)
    profs?.forEach(p => { relProfMap[p.id] = p })
  }
  const related = (relatedRaw || []).map(p => ({ ...p, author: relProfMap[p.user_id] }))

  return <PostPageClient post={post} author={author} related={related} />
}
