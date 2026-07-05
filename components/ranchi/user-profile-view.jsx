'use client'
import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { MapPin, Calendar, Heart, MessageCircle, UserPlus, UserCheck, Loader2, ArrowLeft, X } from 'lucide-react'

function timeAgo(date) {
  const s = Math.floor((new Date() - new Date(date)) / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24); if (d < 30) return `${d}d ago`
  return new Date(date).toLocaleDateString()
}

export default function UserProfileView({ userId, open, onOpenChange, supabase, currentUser, onOpenProfile }) {
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0, likes: 0 })
  const [isFollowing, setIsFollowing] = useState(false)
  const [followBusy, setFollowBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  const isOwn = currentUser?.id === userId

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    // profile
    const { data: p } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    setProfile(p)
    // posts
    const { data: ps } = await supabase.from('posts').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50)
    setPosts(ps || [])
    // stats
    const postIds = (ps || []).map(x => x.id)
    const [{ count: followersC }, { count: followingC }, likesRes] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
      postIds.length > 0 ? supabase.from('likes').select('*', { count: 'exact', head: true }).in('post_id', postIds) : Promise.resolve({ count: 0 }),
    ])
    setStats({
      posts: (ps || []).length,
      followers: followersC || 0,
      following: followingC || 0,
      likes: likesRes.count || 0,
    })
    // isFollowing
    if (currentUser && !isOwn) {
      const { data: f } = await supabase.from('follows').select('id').eq('follower_id', currentUser.id).eq('following_id', userId).maybeSingle()
      setIsFollowing(!!f)
    }
    setLoading(false)
  }, [userId, supabase, currentUser, isOwn])

  useEffect(() => { if (open) load() }, [open, load])

  const toggleFollow = async () => {
    if (!currentUser) return toast.error('Sign in to follow')
    setFollowBusy(true)
    try {
      if (isFollowing) {
        const { error } = await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', userId)
        if (error) throw error
        setIsFollowing(false)
        setStats(s => ({ ...s, followers: Math.max(0, s.followers - 1) }))
      } else {
        const { error } = await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: userId })
        if (error) throw error
        setIsFollowing(true)
        setStats(s => ({ ...s, followers: s.followers + 1 }))
        toast.success(`Following @${profile?.username}`)
      }
    } catch (e) { toast.error(e.message) }
    finally { setFollowBusy(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden flex flex-col">
        {/* Cover / Header */}
        <div className="relative h-32 bg-gradient-to-br from-orange-400 via-pink-400 to-emerald-400" />
        <button onClick={() => onOpenChange(false)} className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur flex items-center justify-center text-white z-10">
          <X className="h-4 w-4" />
        </button>

        <div className="px-6 -mt-14 pb-2">
          {loading ? (
            <Skeleton className="h-24 w-24 rounded-full" />
          ) : (
            <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-orange-500 to-emerald-500 text-white text-2xl font-bold">
                {(profile?.full_name || profile?.username || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}

          <div className="mt-3 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold truncate">{profile?.full_name || profile?.username || 'User'}</h2>
                {profile?.role && profile.role !== 'user' && (
                  <Badge variant="secondary" className="text-[10px] capitalize">{profile.role}</Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">@{profile?.username}</div>
              {profile?.bio && <p className="text-sm mt-2 text-foreground/90 whitespace-pre-wrap">{profile.bio}</p>}
              {profile?.created_at && (
                <div className="text-xs text-muted-foreground mt-2 flex items-center gap-3">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />Ranchi</span>
                </div>
              )}
            </div>
            {!isOwn && currentUser && (
              <Button onClick={toggleFollow} disabled={followBusy} variant={isFollowing ? 'outline' : 'default'}
                className={isFollowing ? '' : 'bg-gradient-to-r from-orange-500 to-emerald-500 text-white'}>
                {followBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : isFollowing ? <><UserCheck className="h-4 w-4 mr-1.5" />Following</> : <><UserPlus className="h-4 w-4 mr-1.5" />Follow</>}
              </Button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 mt-4 border-y py-3">
            <Stat label="Posts" value={stats.posts} />
            <Stat label="Followers" value={stats.followers} />
            <Stat label="Following" value={stats.following} />
            <Stat label="Likes" value={stats.likes} />
          </div>
        </div>

        {/* Posts */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 mt-2">Posts</h3>
          {loading && <Skeleton className="h-24 w-full" />}
          {!loading && posts.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No posts yet.</p>
          )}
          <div className="space-y-2">
            {posts.map(p => (
              <Card key={p.id} className="hover:shadow-md transition">
                <CardContent className="p-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      {p.title && <div className="font-medium text-sm">{p.title}</div>}
                      <div className="text-sm text-foreground/80 line-clamp-2">{p.content}</div>
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize">{p.category}</Badge>
                  </div>
                  {p.image_url && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={p.image_url} alt="" loading="lazy" className="w-full h-32 object-cover rounded mt-2" />
                  )}
                  <div className="text-[10px] text-muted-foreground mt-1">{timeAgo(p.created_at)}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Stat({ label, value }) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[10px] uppercase text-muted-foreground tracking-wide">{label}</div>
    </div>
  )
}
