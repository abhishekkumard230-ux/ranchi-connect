'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import ThreadedComments from '@/components/ranchi/threaded-comments'
import UserProfileView from '@/components/ranchi/user-profile-view'
import { toast } from 'sonner'
import { Heart, MessageCircle, Share2, Link2, Flag, ArrowLeft, MapPin, MoreVertical, Trash2 } from 'lucide-react'

function timeAgo(date) {
  const s = Math.floor((new Date() - new Date(date)) / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24); if (d < 30) return `${d}d ago`
  return new Date(date).toLocaleDateString()
}

const CATEGORY_LABELS = {
  news: 'News', events: 'Events', questions: 'Questions',
  buysell: 'Buy & Sell', jobs: 'Jobs', recommendations: 'Recommendations', general: 'General',
}

export default function PostPageClient({ post, author, related }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [likeCount, setLikeCount] = useState(0)
  const [liked, setLiked] = useState(false)
  const [commentCount, setCommentCount] = useState(0)
  const [viewProfileId, setViewProfileId] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user || null))
  }, [supabase])

  const loadCounts = useCallback(async () => {
    const [likesRes, commentsRes] = await Promise.all([
      supabase.from('likes').select('user_id', { count: 'exact' }).eq('post_id', post.id),
      supabase.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', post.id),
    ])
    setLikeCount(likesRes.count || 0)
    setCommentCount(commentsRes.count || 0)
    if (user) {
      const isLiked = (likesRes.data || []).some(l => l.user_id === user.id)
      setLiked(isLiked)
    }
  }, [supabase, post.id, user])

  useEffect(() => { loadCounts() }, [loadCounts])

  // Realtime like count
  useEffect(() => {
    const ch = supabase.channel(`post-${post.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes', filter: `post_id=eq.${post.id}` }, () => loadCounts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${post.id}` }, () => {
        supabase.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', post.id).then(r => setCommentCount(r.count || 0))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [post.id, supabase, loadCounts])

  const toggleLike = async () => {
    if (!user) { toast.error('Sign in to like'); return }
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikeCount(c => c + (wasLiked ? -1 : 1))
    if (wasLiked) {
      await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', user.id)
    } else {
      const { error } = await supabase.from('likes').insert({ post_id: post.id, user_id: user.id })
      if (error) {
        setLiked(wasLiked); setLikeCount(c => c + (wasLiked ? 1 : -1))
        toast.error(error.message)
      }
    }
  }

  const copyLink = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    try { await navigator.clipboard.writeText(url); toast.success('Link copied!') }
    catch { toast.error('Copy failed') }
  }

  const share = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    const title = post.title || 'Post on Ranchi Connect'
    if (navigator.share) {
      try { await navigator.share({ title, text: post.content?.substring(0, 100), url }) } catch { /* user cancelled */ }
    } else {
      copyLink()
    }
  }

  const report = async () => {
    if (!user) { toast.error('Sign in to report'); return }
    const reason = prompt('Why are you reporting this post?')
    if (!reason) return
    const { error } = await supabase.from('reports').insert({ reporter_id: user.id, post_id: post.id, reason })
    if (error) toast.error(error.message)
    else toast.success('Reported. Thank you.')
  }

  const del = async () => {
    if (!confirm('Delete this post?')) return
    const { error } = await supabase.from('posts').delete().eq('id', post.id)
    if (error) return toast.error(error.message)
    toast.success('Deleted')
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/40 via-background to-emerald-50/40 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3 max-w-3xl">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-emerald-500 flex items-center justify-center">
              <MapPin className="h-4 w-4 text-white" />
            </div>
            <div className="font-bold text-lg bg-gradient-to-r from-orange-600 to-emerald-600 bg-clip-text text-transparent">Ranchi Connect</div>
          </Link>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={share}><Share2 className="h-4 w-4 mr-1.5" />Share</Button>
          <Button variant="ghost" size="sm" onClick={copyLink}><Link2 className="h-4 w-4 mr-1.5" />Copy</Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-3xl grid md:grid-cols-3 gap-6">
        <article className="md:col-span-2 space-y-4">
          <Card className="overflow-hidden shadow-md">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <button onClick={() => setViewProfileId(author?.id)} className="flex items-center gap-3 group">
                  <Avatar className="h-12 w-12 border-2 border-background shadow group-hover:ring-2 group-hover:ring-orange-400 transition">
                    <AvatarImage src={author?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-orange-500 to-emerald-500 text-white font-semibold">
                      {(author?.full_name || author?.username || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <div className="font-semibold group-hover:underline">{author?.full_name || author?.username || 'User'}</div>
                    <div className="text-xs text-muted-foreground">@{author?.username} · {timeAgo(post.created_at)}</div>
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{CATEGORY_LABELS[post.category] || post.category}</Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={report}><Flag className="h-4 w-4 mr-2" />Report</DropdownMenuItem>
                      {user?.id === post.user_id && <DropdownMenuItem onClick={del} className="text-red-600"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {post.title && <h1 className="text-2xl font-bold leading-tight">{post.title}</h1>}
              <div className="text-base whitespace-pre-wrap leading-relaxed">{post.content}</div>

              {post.image_url && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={post.image_url} alt={post.title || 'Post image'} className="w-full rounded-lg border" />
              )}

              <div className="flex items-center gap-4 pt-3 border-t">
                <button onClick={toggleLike} className={`flex items-center gap-1.5 text-sm hover:text-red-500 transition ${liked ? 'text-red-500 font-medium' : ''}`}>
                  <Heart className={`h-5 w-5 ${liked ? 'fill-current' : ''}`} />
                  {likeCount}
                </button>
                <div className="flex items-center gap-1.5 text-sm">
                  <MessageCircle className="h-5 w-5" />
                  {commentCount}
                </div>
                <div className="flex-1" />
                <Button variant="outline" size="sm" onClick={share}><Share2 className="h-4 w-4 mr-1.5" />Share</Button>
              </div>
            </CardContent>
          </Card>

          {/* Comments Section */}
          <Card>
            <CardContent className="p-5">
              <h2 className="text-lg font-semibold mb-3">Comments ({commentCount})</h2>
              <ThreadedComments postId={post.id} currentUser={user} supabase={supabase} onOpenProfile={setViewProfileId} />
            </CardContent>
          </Card>
        </article>

        {/* Sidebar: author + related */}
        <aside className="space-y-4">
          {/* Author preview */}
          <Card>
            <CardContent className="p-4 text-center">
              <Avatar className="h-16 w-16 mx-auto mb-3">
                <AvatarImage src={author?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-orange-500 to-emerald-500 text-white text-xl">
                  {(author?.full_name || author?.username || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="font-semibold">{author?.full_name || author?.username}</div>
              <div className="text-xs text-muted-foreground mb-2">@{author?.username}</div>
              {author?.bio && <p className="text-xs text-muted-foreground line-clamp-3">{author.bio}</p>}
              <Button size="sm" variant="outline" onClick={() => setViewProfileId(author?.id)} className="mt-3 w-full">View Profile</Button>
            </CardContent>
          </Card>

          {/* Related posts */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3">Related in {CATEGORY_LABELS[post.category]}</h3>
              <div className="space-y-3">
                {related.length === 0 && <p className="text-xs text-muted-foreground">No related posts.</p>}
                {related.map(r => (
                  <Link href={`/post/${r.id}`} key={r.id} className="block hover:bg-muted/60 rounded p-2 -mx-2 transition">
                    <div className="text-sm font-medium line-clamp-2">{r.title || r.content?.substring(0, 60)}</div>
                    <div className="text-xs text-muted-foreground mt-1">by {r.author?.full_name || r.author?.username} · {timeAgo(r.created_at)}</div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </aside>
      </main>

      <UserProfileView
        userId={viewProfileId}
        open={!!viewProfileId}
        onOpenChange={(v) => !v && setViewProfileId(null)}
        supabase={supabase}
        currentUser={user}
        onOpenProfile={setViewProfileId}
      />
    </div>
  )
}
