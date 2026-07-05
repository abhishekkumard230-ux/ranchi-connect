'use client'
import { useState, useEffect, useCallback } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Heart, MessageCircle, UserPlus, AtSign, Shield, CheckCheck, Bell, Reply } from 'lucide-react'

function timeAgo(date) {
  const s = Math.floor((new Date() - new Date(date)) / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24); if (d < 7) return `${d}d ago`
  return new Date(date).toLocaleDateString()
}

const TYPE_META = {
  like: { icon: Heart, color: 'text-red-500', text: 'liked your post' },
  comment: { icon: MessageCircle, color: 'text-blue-500', text: 'commented on your post' },
  reply: { icon: Reply, color: 'text-blue-500', text: 'replied to your comment' },
  follow: { icon: UserPlus, color: 'text-emerald-500', text: 'started following you' },
  mention: { icon: AtSign, color: 'text-purple-500', text: 'mentioned you' },
  admin_action: { icon: Shield, color: 'text-amber-500', text: 'from admin' },
}

export default function NotificationsSheet({ open, onOpenChange, supabase, currentUser, onOpenPost, onOpenProfile }) {
  const [tab, setTab] = useState('all')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState(null)

  const load = useCallback(async () => {
    if (!currentUser) return
    setLoading(true)
    let q = supabase.from('notifications').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(100)
    if (tab === 'unread') q = q.eq('read', false)
    const { data, error } = await q
    if (error) { toast.error(error.message); setLoading(false); return }
    // fetch actor profiles
    const actorIds = [...new Set((data || []).map(n => n.actor_id).filter(Boolean))]
    let map = {}
    if (actorIds.length > 0) {
      const { data: profs } = await supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', actorIds)
      profs?.forEach(p => { map[p.id] = p })
    }
    setItems((data || []).map(n => ({ ...n, actor: map[n.actor_id] || null })))
    setLoading(false)
  }, [supabase, currentUser, tab])

  const loadSettings = useCallback(async () => {
    if (!currentUser) return
    const { data } = await supabase.from('notification_settings').select('*').eq('user_id', currentUser.id).maybeSingle()
    setSettings(data || { user_id: currentUser.id, likes: true, comments: true, replies: true, follows: true, mentions: true, admin_actions: true })
  }, [supabase, currentUser])

  useEffect(() => {
    if (open) {
      if (tab === 'settings') loadSettings()
      else load()
    }
  }, [open, tab, load, loadSettings])

  const markRead = async (id) => {
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id)
    if (!error) setItems(is => is.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const markAllRead = async () => {
    const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', currentUser.id).eq('read', false)
    if (error) return toast.error(error.message)
    setItems(is => is.map(n => ({ ...n, read: true })))
    toast.success('All notifications marked as read')
  }

  const handleClick = async (n) => {
    if (!n.read) markRead(n.id)
    onOpenChange(false)
    setTimeout(() => {
      if (n.type === 'follow' && n.actor_id) onOpenProfile?.(n.actor_id)
      else if (n.post_id) onOpenPost?.(n.post_id, n.comment_id)
      else if (n.actor_id) onOpenProfile?.(n.actor_id)
    }, 150)
  }

  const saveSetting = async (key, value) => {
    const next = { ...settings, [key]: value }
    setSettings(next)
    const { error } = await supabase.from('notification_settings').upsert({
      user_id: currentUser.id,
      likes: next.likes, comments: next.comments, replies: next.replies,
      follows: next.follows, mentions: next.mentions, admin_actions: next.admin_actions,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    if (error) toast.error(error.message)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2"><Bell className="h-5 w-5" />Notifications</SheetTitle>
            {tab !== 'settings' && items.some(n => !n.read) && (
              <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs h-8">
                <CheckCheck className="h-3.5 w-3.5 mr-1" />Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-4 mt-3 grid grid-cols-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="flex-1 overflow-y-auto px-2 py-2 space-y-1 m-0">
            <NotifList items={items} loading={loading} handleClick={handleClick} />
          </TabsContent>
          <TabsContent value="unread" className="flex-1 overflow-y-auto px-2 py-2 space-y-1 m-0">
            <NotifList items={items} loading={loading} handleClick={handleClick} />
          </TabsContent>
          <TabsContent value="settings" className="flex-1 overflow-y-auto px-4 py-4 space-y-4 m-0">
            {!settings ? <Skeleton className="h-40 w-full" /> : (
              <div className="space-y-3">
                <SettingRow label="Likes on your posts" desc="When someone likes your posts" checked={settings.likes} onChange={(v) => saveSetting('likes', v)} />
                <SettingRow label="Comments on your posts" desc="When someone comments on your posts" checked={settings.comments} onChange={(v) => saveSetting('comments', v)} />
                <SettingRow label="Replies to your comments" desc="When someone replies to your comments" checked={settings.replies} onChange={(v) => saveSetting('replies', v)} />
                <SettingRow label="New followers" desc="When someone follows you" checked={settings.follows} onChange={(v) => saveSetting('follows', v)} />
                <SettingRow label="Mentions (@username)" desc="When someone mentions you" checked={settings.mentions} onChange={(v) => saveSetting('mentions', v)} />
                <SettingRow label="Admin actions" desc="When your content is moderated" checked={settings.admin_actions} onChange={(v) => saveSetting('admin_actions', v)} />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}

function NotifList({ items, loading, handleClick }) {
  if (loading) return <><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></>
  if (items.length === 0) return (
    <div className="text-center py-12">
      <Bell className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
      <p className="text-sm text-muted-foreground">No notifications yet.</p>
    </div>
  )
  return items.map(n => {
    const meta = TYPE_META[n.type] || TYPE_META.like
    const Icon = meta.icon
    const actor = n.actor
    return (
      <button key={n.id} onClick={() => handleClick(n)} className={`w-full text-left p-3 rounded-lg flex gap-3 items-start transition hover:bg-muted/60 ${!n.read ? 'bg-orange-50/60 dark:bg-orange-950/20' : ''}`}>
        <div className="relative shrink-0">
          <Avatar className="h-10 w-10">
            <AvatarImage src={actor?.avatar_url} />
            <AvatarFallback className="bg-gradient-to-br from-orange-500 to-emerald-500 text-white">
              {(actor?.full_name || actor?.username || '?').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-background flex items-center justify-center border`}>
            <Icon className={`h-3 w-3 ${meta.color}`} />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm leading-snug">
            <span className="font-semibold">{actor?.full_name || actor?.username || 'Someone'}</span>{' '}
            <span className="text-muted-foreground">{meta.text}</span>
            {n.message && <span className="text-muted-foreground"> — {n.message}</span>}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">{timeAgo(n.created_at)}</div>
        </div>
        {!n.read && <div className="h-2 w-2 rounded-full bg-orange-500 mt-2" />}
      </button>
    )
  })
}

function SettingRow({ label, desc, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b last:border-b-0">
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
