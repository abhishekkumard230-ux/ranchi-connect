'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { useTheme } from 'next-themes'
import {
  Search, Plus, Heart, MessageCircle, Image as ImageIcon, LogOut, User, Shield,
  Moon, Sun, Newspaper, Calendar, HelpCircle, ShoppingBag, Briefcase, Sparkles, Home,
  Loader2, Trash2, Flag, X, MapPin, Send
} from 'lucide-react'

const CATEGORIES = [
  { key: 'all', label: 'All', icon: Home, color: 'bg-slate-500' },
  { key: 'news', label: 'News', icon: Newspaper, color: 'bg-red-500' },
  { key: 'events', label: 'Events', icon: Calendar, color: 'bg-purple-500' },
  { key: 'questions', label: 'Questions', icon: HelpCircle, color: 'bg-blue-500' },
  { key: 'buysell', label: 'Buy & Sell', icon: ShoppingBag, color: 'bg-emerald-500' },
  { key: 'jobs', label: 'Jobs', icon: Briefcase, color: 'bg-amber-500' },
  { key: 'recommendations', label: 'Recommendations', icon: Sparkles, color: 'bg-pink-500' },
]

const POST_CATEGORIES = CATEGORIES.filter(c => c.key !== 'all')

function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(date).toLocaleDateString()
}

function categoryMeta(key) {
  return CATEGORIES.find(c => c.key === key) || CATEGORIES[0]
}

// ---------------- AUTH VIEW ----------------
function AuthView({ supabase }) {
  const [mode, setMode] = useState('signin') // signin | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${origin}/auth/callback` },
      })
      if (error) throw error
      // On success browser is redirected to Google, no further action here
    } catch (err) {
      toast.error(err.message || 'Google sign-in failed')
      setGoogleLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username, full_name: fullName },
            emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
          },
        })
        if (error) throw error
        toast.success('Check your email to verify your account!')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        toast.success('Welcome back!')
      }
    } catch (err) {
      toast.error(err.message || 'Auth failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-orange-50 via-white to-emerald-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-orange-500 to-emerald-500 flex items-center justify-center shadow-lg">
              <MapPin className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-emerald-600 bg-clip-text text-transparent">Ranchi Connect</h1>
          </div>
          <p className="text-muted-foreground text-sm">The exclusive community for Ranchi residents</p>
        </div>

        <Card className="shadow-xl border-0 bg-card/80 backdrop-blur">
          <CardHeader>
            <Tabs value={mode} onValueChange={setMode}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="outline"
              className="w-full h-10"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t"></span></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'signup' && (
                <>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Full Name</label>
                    <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Aditi Sharma" required />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Username</label>
                    <Input value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="aditi_ranchi" required />
                  </div>
                </>
              )}
              <div>
                <label className="text-xs font-medium mb-1 block">Email</label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Password</label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
              </div>
              <Button type="submit" className="w-full bg-gradient-to-r from-orange-500 to-emerald-500 hover:from-orange-600 hover:to-emerald-600 text-white shadow-md" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (mode === 'signup' ? 'Create Account' : 'Sign In')}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">By continuing you agree to our community guidelines. Ranchi ❤️</p>
      </div>
    </div>
  )
}

// ---------------- POST CARD ----------------
function PostCard({ post, currentUser, supabase, onDelete, onOpenComments }) {
  const [likeCount, setLikeCount] = useState(post.likes_count || 0)
  const [liked, setLiked] = useState(post.liked_by_me || false)
  const [likeBusy, setLikeBusy] = useState(false)

  const cat = categoryMeta(post.category)
  const Icon = cat.icon
  const author = post.profiles || {}

  const toggleLike = async () => {
    if (!currentUser) { toast.error('Sign in to like'); return }
    setLikeBusy(true)
    const prevLiked = liked
    setLiked(!prevLiked)
    setLikeCount(c => c + (prevLiked ? -1 : 1))
    try {
      if (prevLiked) {
        const { error } = await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', currentUser.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('likes').insert({ post_id: post.id, user_id: currentUser.id })
        if (error) throw error
      }
    } catch (e) {
      // rollback
      setLiked(prevLiked)
      setLikeCount(c => c + (prevLiked ? 1 : -1))
      toast.error(e.message)
    } finally {
      setLikeBusy(false)
    }
  }

  const handleReport = async () => {
    if (!currentUser) { toast.error('Sign in to report'); return }
    const reason = prompt('Why are you reporting this post?')
    if (!reason) return
    const { error } = await supabase.from('reports').insert({ reporter_id: currentUser.id, post_id: post.id, reason })
    if (error) toast.error(error.message)
    else toast.success('Reported. Thank you.')
  }

  const handleDelete = async () => {
    if (!confirm('Delete this post?')) return
    const { error } = await supabase.from('posts').delete().eq('id', post.id)
    if (error) toast.error(error.message)
    else { toast.success('Post deleted'); onDelete?.(post.id) }
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-background shadow">
              <AvatarImage src={author.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-orange-500 to-emerald-500 text-white text-sm font-semibold">
                {(author.full_name || author.username || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold text-sm leading-tight">{author.full_name || author.username || 'Anonymous'}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span>@{author.username || 'user'}</span>
                <span>·</span>
                <span>{timeAgo(post.created_at)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Icon className="h-3 w-3" />
              {cat.label}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">⋯</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleReport}><Flag className="h-4 w-4 mr-2" />Report</DropdownMenuItem>
                {currentUser?.id === post.user_id && (
                  <DropdownMenuItem onClick={handleDelete} className="text-red-600"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        {post.title && <h3 className="font-semibold text-lg mb-2 leading-snug">{post.title}</h3>}
        <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{post.content}</p>
        {post.image_url && (
          <div className="mt-3 rounded-lg overflow-hidden border border-border/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.image_url} alt="post" loading="lazy" className="w-full max-h-[500px] object-cover" />
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-0 flex gap-4">
        <Button variant="ghost" size="sm" onClick={toggleLike} disabled={likeBusy} className={liked ? 'text-red-500 hover:text-red-600' : ''}>
          <Heart className={`h-4 w-4 mr-1.5 ${liked ? 'fill-current' : ''}`} />
          {likeCount}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onOpenComments(post)}>
          <MessageCircle className="h-4 w-4 mr-1.5" />
          {post.comments_count || 0}
        </Button>
      </CardFooter>
    </Card>
  )
}

// ---------------- COMMENTS DIALOG ----------------
function CommentsDialog({ post, open, onOpenChange, currentUser, supabase, onCountChange }) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    if (!post) return
    setLoading(true)
    const { data, error } = await supabase
      .from('comments')
      .select('id, content, created_at, user_id')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })
    if (error) { toast.error(error.message); setLoading(false); return }
    const userIds = [...new Set((data || []).map(c => c.user_id))]
    let profilesMap = {}
    if (userIds.length > 0) {
      const { data: profs } = await supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', userIds)
      profs?.forEach(p => { profilesMap[p.id] = p })
    }
    setComments((data || []).map(c => ({ ...c, profiles: profilesMap[c.user_id] || null })))
    setLoading(false)
  }, [post, supabase])

  useEffect(() => { if (open) load() }, [open, load])

  const send = async (e) => {
    e.preventDefault()
    if (!text.trim() || !currentUser) return
    setSending(true)
    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: post.id, user_id: currentUser.id, content: text.trim() })
      .select('id, content, created_at, user_id')
      .single()
    setSending(false)
    if (error) { toast.error(error.message); return }
    const { data: prof } = await supabase.from('profiles').select('id, username, full_name, avatar_url').eq('id', currentUser.id).maybeSingle()
    setComments(c => [...c, { ...data, profiles: prof }])
    setText('')
    onCountChange?.(post.id, 1)
  }

  const del = async (id) => {
    if (!confirm('Delete comment?')) return
    const { error } = await supabase.from('comments').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    setComments(c => c.filter(x => x.id !== id))
    onCountChange?.(post.id, -1)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Comments</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-3 py-2">
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && comments.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No comments yet. Be the first!</p>}
          {comments.map(c => (
            <div key={c.id} className="flex gap-3 group">
              <Avatar className="h-8 w-8">
                <AvatarImage src={c.profiles?.avatar_url} />
                <AvatarFallback className="text-xs bg-gradient-to-br from-orange-500 to-emerald-500 text-white">
                  {(c.profiles?.full_name || c.profiles?.username || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="bg-muted rounded-xl px-3 py-2">
                  <div className="text-xs font-semibold">{c.profiles?.full_name || c.profiles?.username || 'User'}</div>
                  <div className="text-sm">{c.content}</div>
                </div>
                <div className="flex items-center gap-3 mt-1 px-2">
                  <span className="text-[10px] text-muted-foreground">{timeAgo(c.created_at)}</span>
                  {currentUser?.id === c.user_id && (
                    <button onClick={() => del(c.id)} className="text-[10px] text-red-500 opacity-0 group-hover:opacity-100 transition">Delete</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        {currentUser && (
          <form onSubmit={send} className="flex gap-2 pt-2 border-t">
            <Input value={text} onChange={e => setText(e.target.value)} placeholder="Write a comment…" />
            <Button type="submit" disabled={sending || !text.trim()} size="icon">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ---------------- CREATE POST DIALOG ----------------
function CreatePostDialog({ open, onOpenChange, supabase, currentUser, onCreated }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('general')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleFile = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const reset = () => {
    setTitle(''); setContent(''); setCategory('general'); setFile(null); setPreview(null)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!content.trim()) { toast.error('Add some content'); return }
    if (!currentUser) return
    setSubmitting(true)
    try {
      let image_url = null
      if (file) {
        const ext = file.name.split('.').pop()
        const path = `${currentUser.id}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('post-images').upload(path, file, { upsert: false })
        if (upErr) throw upErr
        const { data: pub } = supabase.storage.from('post-images').getPublicUrl(path)
        image_url = pub.publicUrl
      }
      const { data, error } = await supabase.from('posts').insert({
        user_id: currentUser.id, title: title.trim() || null, content: content.trim(), category, image_url,
      }).select('*').single()
      if (error) throw error
      const { data: prof } = await supabase.from('profiles').select('id, username, full_name, avatar_url').eq('id', currentUser.id).maybeSingle()
      toast.success('Posted!')
      onCreated?.({ ...data, profiles: prof, likes_count: 0, comments_count: 0, liked_by_me: false })
      reset()
      onOpenChange(false)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a post</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {POST_CATEGORIES.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title (optional)" />
          <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="What's happening in Ranchi?" rows={5} required />
          {preview && (
            <div className="relative rounded-lg overflow-hidden border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="preview" className="w-full max-h-60 object-cover" />
              <Button type="button" variant="secondary" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => { setFile(null); setPreview(null) }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div className="flex justify-between items-center">
            <label className="cursor-pointer">
              <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
              <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
                <ImageIcon className="h-4 w-4" /> Add image
              </div>
            </label>
            <Button type="submit" disabled={submitting} className="bg-gradient-to-r from-orange-500 to-emerald-500 text-white">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Post'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------- PROFILE DIALOG ----------------
function ProfileDialog({ open, onOpenChange, supabase, profile, onSaved }) {
  const [username, setUsername] = useState(profile?.username || '')
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '')
      setFullName(profile.full_name || '')
      setBio(profile.bio || '')
      setAvatarUrl(profile.avatar_url || '')
    }
  }, [profile])

  const uploadAvatar = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setUploading(true)
    try {
      const ext = f.name.split('.').pop()
      const path = `${profile.id}/avatar_${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('post-images').upload(path, f, { upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('post-images').getPublicUrl(path)
      setAvatarUrl(data.publicUrl)
      toast.success('Avatar uploaded')
    } catch (err) { toast.error(err.message) }
    finally { setUploading(false) }
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      username: username.toLowerCase().replace(/[^a-z0-9_]/g, ''),
      full_name: fullName, bio, avatar_url: avatarUrl,
    }).eq('id', profile.id)
    setSaving(false)
    if (error) toast.error(error.message)
    else { toast.success('Profile updated'); onSaved?.(); onOpenChange(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Edit Profile</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-16 w-16">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="bg-gradient-to-br from-orange-500 to-emerald-500 text-white">
                {(fullName || username || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
              <Button type="button" variant="outline" size="sm" asChild disabled={uploading}>
                <span>{uploading ? 'Uploading…' : 'Change photo'}</span>
              </Button>
            </label>
          </div>
          <div>
            <label className="text-xs font-medium">Full Name</label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium">Username</label>
            <Input value={username} onChange={e => setUsername(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium">Bio</label>
            <Textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Tell your Ranchi story…" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving} className="bg-gradient-to-r from-orange-500 to-emerald-500 text-white">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------- ADMIN DIALOG ----------------
function AdminDialog({ open, onOpenChange, supabase }) {
  const [tab, setTab] = useState('reports')
  const [reports, setReports] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)

  const loadReports = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('reports')
      .select('*, posts(id,title,content), comments(id,content)')
      .order('created_at', { ascending: false })
    if (error) toast.error(error.message)
    else setReports(data || [])
    setLoading(false)
  }

  const loadUsers = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(200)
    if (error) toast.error(error.message)
    else setUsers(data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (!open) return
    if (tab === 'reports') loadReports()
    else loadUsers()
    // eslint-disable-next-line
  }, [open, tab])

  const resolveReport = async (id, status) => {
    const { error } = await supabase.from('reports').update({ status }).eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Updated'); loadReports() }
  }

  const deleteReportedPost = async (postId) => {
    if (!confirm('Delete this post?')) return
    const { error } = await supabase.from('posts').delete().eq('id', postId)
    if (error) toast.error(error.message)
    else toast.success('Post deleted')
  }

  const changeRole = async (id, role) => {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Role updated'); loadUsers() }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Admin Dashboard</DialogTitle></DialogHeader>
        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>
          <TabsContent value="reports" className="flex-1 overflow-y-auto space-y-2 mt-3">
            {loading && <Skeleton className="h-20 w-full" />}
            {!loading && reports.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No reports.</p>}
            {reports.map(r => (
              <Card key={r.id}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <div className="text-sm font-medium">Reason: {r.reason}</div>
                      <div className="text-xs text-muted-foreground mt-1">{timeAgo(r.created_at)} · status: <Badge variant={r.status === 'pending' ? 'destructive' : 'secondary'}>{r.status}</Badge></div>
                      {r.posts && <div className="mt-2 text-xs bg-muted p-2 rounded">Post: {r.posts.title || r.posts.content?.substring(0, 100)}</div>}
                      {r.comments && <div className="mt-2 text-xs bg-muted p-2 rounded">Comment: {r.comments.content?.substring(0, 100)}</div>}
                    </div>
                    <div className="flex flex-col gap-1">
                      {r.status === 'pending' && <Button size="sm" variant="outline" onClick={() => resolveReport(r.id, 'reviewed')}>Mark reviewed</Button>}
                      {r.status !== 'resolved' && <Button size="sm" variant="outline" onClick={() => resolveReport(r.id, 'resolved')}>Resolve</Button>}
                      {r.post_id && <Button size="sm" variant="destructive" onClick={() => deleteReportedPost(r.post_id)}>Delete post</Button>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
          <TabsContent value="users" className="flex-1 overflow-y-auto space-y-2 mt-3">
            {loading && <Skeleton className="h-20 w-full" />}
            {users.map(u => (
              <Card key={u.id}>
                <CardContent className="pt-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9"><AvatarImage src={u.avatar_url} /><AvatarFallback className="bg-gradient-to-br from-orange-500 to-emerald-500 text-white">{(u.full_name || u.username || 'U').charAt(0)}</AvatarFallback></Avatar>
                    <div>
                      <div className="text-sm font-medium">{u.full_name || u.username}</div>
                      <div className="text-xs text-muted-foreground">@{u.username} · <Badge variant="outline" className="text-[10px]">{u.role}</Badge></div>
                    </div>
                  </div>
                  <Select value={u.role} onValueChange={(v) => changeRole(u.id, v)}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="moderator">Moderator</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

// ---------------- MAIN APP ----------------
function App() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const { theme, setTheme } = useTheme()

  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [posts, setPosts] = useState([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const PAGE_SIZE = 10

  const [createOpen, setCreateOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [commentsPost, setCommentsPost] = useState(null)

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user || null
      setUser(u)
      if (u) await loadProfile(u.id)
      setAuthLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      const u = session?.user || null
      setUser(u)
      if (u) await loadProfile(u.id)
      else setProfile(null)
    })
    return () => sub.subscription.unsubscribe()
    // eslint-disable-next-line
  }, [])

  const loadProfile = async (uid) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()
    setProfile(data)
  }

  const loadPosts = useCallback(async (reset = false) => {
    setPostsLoading(true)
    const from = reset ? 0 : page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    let q = supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to)
    if (category !== 'all') q = q.eq('category', category)
    if (search.trim()) q = q.or(`title.ilike.%${search}%,content.ilike.%${search}%`)
    const { data, error } = await q
    if (error) { toast.error(error.message); setPostsLoading(false); return }

    // Fetch counts + liked state + profiles
    const ids = (data || []).map(p => p.id)
    const userIds = [...new Set((data || []).map(p => p.user_id))]
    let likeCounts = {}, commentCounts = {}, likedByMe = {}, profilesMap = {}
    if (ids.length > 0) {
      const [likesRes, commentsRes, profilesRes] = await Promise.all([
        supabase.from('likes').select('post_id, user_id').in('post_id', ids),
        supabase.from('comments').select('post_id').in('post_id', ids),
        supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', userIds),
      ])
      likesRes.data?.forEach(l => { likeCounts[l.post_id] = (likeCounts[l.post_id] || 0) + 1; if (user && l.user_id === user.id) likedByMe[l.post_id] = true })
      commentsRes.data?.forEach(c => { commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1 })
      profilesRes.data?.forEach(p => { profilesMap[p.id] = p })
    }
    const enriched = (data || []).map(p => ({
      ...p,
      profiles: profilesMap[p.user_id] || null,
      likes_count: likeCounts[p.id] || 0,
      comments_count: commentCounts[p.id] || 0,
      liked_by_me: !!likedByMe[p.id],
    }))
    setPosts(prev => reset ? enriched : [...prev, ...enriched])
    setHasMore((data || []).length === PAGE_SIZE)
    setPostsLoading(false)
  }, [supabase, category, search, page, user])

  // Reset & reload on filters change
  useEffect(() => {
    setPage(0)
    setPosts([])
    setHasMore(true)
    loadPosts(true)
    // eslint-disable-next-line
  }, [category, search, user])

  const loadMore = () => {
    setPage(p => p + 1)
  }
  useEffect(() => { if (page > 0) loadPosts(false) /* eslint-disable-next-line */ }, [page])

  const signOut = async () => {
    await supabase.auth.signOut()
    toast.success('Signed out')
  }

  const isAdmin = profile?.role === 'admin' || profile?.role === 'moderator'

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>
  }

  if (!user) return <AuthView supabase={supabase} />

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/40 via-background to-emerald-50/40 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-orange-500 to-emerald-500 flex items-center justify-center shadow-md">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <div className="font-bold text-lg leading-none bg-gradient-to-r from-orange-600 to-emerald-600 bg-clip-text text-transparent">Ranchi Connect</div>
              <div className="text-[10px] text-muted-foreground">Your city, your community</div>
            </div>
          </div>
          <div className="flex-1 max-w-xl mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search posts…" className="pl-9" />
          </div>
          <Button onClick={() => setCreateOpen(true)} className="bg-gradient-to-r from-orange-500 to-emerald-500 hover:from-orange-600 hover:to-emerald-600 text-white shadow-md hidden sm:flex">
            <Plus className="h-4 w-4 mr-1.5" /> Post
          </Button>
          <Button onClick={() => setCreateOpen(true)} size="icon" className="bg-gradient-to-r from-orange-500 to-emerald-500 text-white sm:hidden"><Plus className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-9 w-9 cursor-pointer border-2 border-background shadow">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-orange-500 to-emerald-500 text-white text-sm">
                  {(profile?.full_name || profile?.username || user.email || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="text-sm font-medium">{profile?.full_name || 'Ranchi Resident'}</div>
                <div className="text-xs text-muted-foreground">@{profile?.username || 'user'}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setProfileOpen(true)}><User className="h-4 w-4 mr-2" />Edit Profile</DropdownMenuItem>
              {isAdmin && <DropdownMenuItem onClick={() => setAdminOpen(true)}><Shield className="h-4 w-4 mr-2" />Admin Dashboard</DropdownMenuItem>}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-red-600"><LogOut className="h-4 w-4 mr-2" />Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {/* Category strip */}
        <div className="border-t">
          <div className="container mx-auto px-2 py-2 flex gap-2 overflow-x-auto no-scrollbar">
            {CATEGORIES.map(c => {
              const Icon = c.icon
              const active = category === c.key
              return (
                <button key={c.key} onClick={() => setCategory(c.key)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${active ? 'bg-gradient-to-r from-orange-500 to-emerald-500 text-white shadow-md' : 'bg-muted hover:bg-muted/70 text-foreground/80'}`}>
                  <Icon className="h-3.5 w-3.5" />{c.label}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {/* Feed */}
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="space-y-4">
          {posts.map(p => (
            <PostCard key={p.id} post={p} currentUser={user} supabase={supabase}
              onDelete={(id) => setPosts(ps => ps.filter(x => x.id !== id))}
              onOpenComments={setCommentsPost}
            />
          ))}
          {postsLoading && (
            <>
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </>
          )}
          {!postsLoading && posts.length === 0 && (
            <div className="text-center py-12">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No posts yet. Be the first to share!</p>
              <Button onClick={() => setCreateOpen(true)} className="mt-4 bg-gradient-to-r from-orange-500 to-emerald-500 text-white"><Plus className="h-4 w-4 mr-1.5" />Create Post</Button>
            </div>
          )}
          {!postsLoading && hasMore && posts.length > 0 && (
            <div className="text-center pt-4">
              <Button variant="outline" onClick={loadMore}>Load more</Button>
            </div>
          )}
        </div>
      </main>

      <CreatePostDialog open={createOpen} onOpenChange={setCreateOpen} supabase={supabase} currentUser={user}
        onCreated={(p) => setPosts(prev => [p, ...prev])} />
      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} supabase={supabase} profile={profile}
        onSaved={() => loadProfile(user.id)} />
      <AdminDialog open={adminOpen} onOpenChange={setAdminOpen} supabase={supabase} />
      <CommentsDialog
        post={commentsPost}
        open={!!commentsPost}
        onOpenChange={(v) => !v && setCommentsPost(null)}
        currentUser={user}
        supabase={supabase}
        onCountChange={(id, delta) => setPosts(ps => ps.map(p => p.id === id ? { ...p, comments_count: (p.comments_count || 0) + delta } : p))}
      />
    </div>
  )
}

export default App
