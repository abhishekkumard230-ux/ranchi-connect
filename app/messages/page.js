'use client'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { ArrowLeft, Send, Image as ImageIcon, Smile, Loader2, MapPin, Circle, CheckCheck, Trash2, MessageSquarePlus, X } from 'lucide-react'

function timeAgo(date) {
  const s = Math.floor((new Date() - new Date(date)) / 1000)
  if (s < 60) return `now`
  const m = Math.floor(s / 60); if (m < 60) return `${m}m`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`
  const d = Math.floor(h / 24); if (d < 7) return `${d}d`
  return new Date(date).toLocaleDateString()
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const EMOJIS = ['😀','😂','😍','😎','🤔','👍','👏','🙏','❤️','🔥','🎉','😢','😡','🥳','😮','🤝','💯','😴']

export default function MessagesPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeConvId = searchParams.get('c')

  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [conversations, setConversations] = useState([])
  const [convLoading, setConvLoading] = useState(true)
  const [participants, setParticipants] = useState({}) // convId -> [{id, username, full_name, avatar_url, last_read_at}]
  const [lastMessages, setLastMessages] = useState({}) // convId -> {content, created_at, sender_id}
  const [unreadCounts, setUnreadCounts] = useState({}) // convId -> number
  const [profile, setProfile] = useState(null)

  const [showNewConvDialog, setShowNewConvDialog] = useState(false)

  // Auth
  useEffect(() => {
    let mounted = true
    const timeout = setTimeout(() => { if (mounted) setAuthLoading(false) }, 6000)
    ;(async () => {
      try {
        const { data } = await supabase.auth.getUser()
        if (!mounted) return
        const u = data?.user || null
        setUser(u)
        if (u) {
          try {
            const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).maybeSingle()
            if (mounted) setProfile(p)
          } catch (e) { console.error('[messages] profile load:', e?.message) }
        }
      } catch (e) {
        console.error('[messages] auth error:', e?.message)
      } finally {
        if (mounted) setAuthLoading(false)
        clearTimeout(timeout)
      }
    })()
    return () => { mounted = false; clearTimeout(timeout) }
  }, [supabase])

  const loadConversations = useCallback(async () => {
    if (!user) return
    setConvLoading(true)
    // Get my conversations
    const { data: myParts } = await supabase.from('conversation_participants').select('conversation_id, last_read_at').eq('user_id', user.id)
    const convIds = (myParts || []).map(p => p.conversation_id)
    if (convIds.length === 0) { setConversations([]); setConvLoading(false); return }
    const myLastRead = {}
    myParts?.forEach(p => { myLastRead[p.conversation_id] = p.last_read_at })

    const { data: convs } = await supabase.from('conversations').select('*').in('id', convIds).order('last_message_at', { ascending: false })

    // Fetch all participants (including me) to know who I'm talking to
    const { data: allParts } = await supabase.from('conversation_participants').select('conversation_id, user_id, last_read_at').in('conversation_id', convIds)
    const otherUserIds = [...new Set((allParts || []).filter(p => p.user_id !== user.id).map(p => p.user_id))]
    const { data: profs } = otherUserIds.length > 0
      ? await supabase.from('profiles').select('id, username, full_name, avatar_url, last_seen_at').in('id', otherUserIds)
      : { data: [] }
    const profMap = {}
    profs?.forEach(p => { profMap[p.id] = p })

    const partsByConv = {}
    ;(allParts || []).forEach(p => {
      if (!partsByConv[p.conversation_id]) partsByConv[p.conversation_id] = []
      partsByConv[p.conversation_id].push({ ...profMap[p.user_id], user_id: p.user_id, last_read_at: p.last_read_at })
    })
    setParticipants(partsByConv)

    // Fetch last message per convo
    const { data: lastMsgs } = await supabase.from('messages').select('*').in('conversation_id', convIds).order('created_at', { ascending: false })
    const lmMap = {}, unread = {}
    lastMsgs?.forEach(m => {
      if (!lmMap[m.conversation_id]) lmMap[m.conversation_id] = m
      // count unread
      const lr = myLastRead[m.conversation_id]
      if (m.sender_id !== user.id && (!lr || new Date(m.created_at) > new Date(lr))) {
        unread[m.conversation_id] = (unread[m.conversation_id] || 0) + 1
      }
    })
    setLastMessages(lmMap)
    setUnreadCounts(unread)
    setConversations(convs || [])
    setConvLoading(false)
  }, [supabase, user])

  useEffect(() => { loadConversations() }, [loadConversations])

  // Realtime: refresh conv list when new messages arrive
  useEffect(() => {
    if (!user) return
    const ch = supabase.channel(`user-msgs-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        // We only care about messages in our conversations
        loadConversations()
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user, supabase, loadConversations])

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>
  if (!user) {
    router.push('/')
    return null
  }

  const activeConv = conversations.find(c => c.id === activeConvId)
  const otherPartsForActive = participants[activeConvId]?.filter(p => p.user_id !== user.id) || []

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/40 via-background to-emerald-50/40 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3 max-w-6xl">
          <Link href="/">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div className="flex items-center gap-2 flex-1">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-emerald-500 flex items-center justify-center">
              <MapPin className="h-4 w-4 text-white" />
            </div>
            <div className="font-bold text-lg bg-gradient-to-r from-orange-600 to-emerald-600 bg-clip-text text-transparent">Messages</div>
          </div>
          <Button size="sm" onClick={() => setShowNewConvDialog(true)} className="bg-gradient-to-r from-orange-500 to-emerald-500 text-white">
            <MessageSquarePlus className="h-4 w-4 mr-1.5" />New
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl h-[calc(100vh-4rem)] flex">
        {/* Conversation list */}
        <aside className={`${activeConvId ? 'hidden md:block' : 'block'} w-full md:w-80 border-r overflow-y-auto`}>
          {convLoading && <div className="p-4 space-y-2"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>}
          {!convLoading && conversations.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No conversations yet.<br />Click "New" to start chatting!
            </div>
          )}
          {conversations.map(c => {
            const others = participants[c.id]?.filter(p => p.user_id !== user.id) || []
            const other = others[0]
            const lm = lastMessages[c.id]
            const un = unreadCounts[c.id] || 0
            const isActive = c.id === activeConvId
            return (
              <Link key={c.id} href={`/messages?c=${c.id}`} className={`flex gap-3 p-3 border-b hover:bg-muted/60 transition ${isActive ? 'bg-muted' : ''}`}>
                <Avatar className="h-11 w-11">
                  <AvatarImage src={other?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-orange-500 to-emerald-500 text-white">
                    {(other?.full_name || other?.username || '?').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-2 items-baseline">
                    <div className="font-medium text-sm truncate">{other?.full_name || other?.username || 'Unknown'}</div>
                    {lm && <div className="text-[10px] text-muted-foreground shrink-0">{timeAgo(lm.created_at)}</div>}
                  </div>
                  <div className="flex justify-between gap-2 items-center">
                    <div className={`text-xs truncate ${un > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                      {lm?.sender_id === user.id && 'You: '}
                      {lm?.content || (lm?.image_url ? '📷 Photo' : 'Start a conversation…')}
                    </div>
                    {un > 0 && (
                      <span className="bg-orange-500 text-white text-[10px] font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center">
                        {un}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </aside>

        {/* Chat pane */}
        <section className={`${activeConvId ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
          {activeConvId && activeConv ? (
            <ChatPane
              key={activeConvId}
              supabase={supabase}
              user={user}
              conversation={activeConv}
              others={otherPartsForActive}
              onBack={() => router.push('/messages')}
              onMessagesRead={() => setUnreadCounts(u => ({ ...u, [activeConvId]: 0 }))}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-center p-6">
              <div>
                <MessageSquarePlus className="h-14 w-14 mx-auto mb-3 text-muted-foreground/40" />
                <p>Select a conversation or start a new one.</p>
              </div>
            </div>
          )}
        </section>
      </main>

      {showNewConvDialog && (
        <NewConversationDialog
          supabase={supabase}
          user={user}
          onClose={() => setShowNewConvDialog(false)}
          onCreated={(convId) => {
            setShowNewConvDialog(false)
            router.push(`/messages?c=${convId}`)
            loadConversations()
          }}
        />
      )}
    </div>
  )
}

// ---------------- CHAT PANE ----------------
function ChatPane({ supabase, user, conversation, others, onBack, onMessagesRead }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [showEmoji, setShowEmoji] = useState(false)
  const [otherTyping, setOtherTyping] = useState(false)
  const scrollRef = useRef(null)
  const channelRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const other = others[0] || {}

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('messages').select('*').eq('conversation_id', conversation.id).order('created_at', { ascending: true })
    if (error) { toast.error(error.message); setLoading(false); return }
    setMessages(data || [])
    setLoading(false)
    // Update last_read_at
    await supabase.from('conversation_participants').update({ last_read_at: new Date().toISOString() }).eq('conversation_id', conversation.id).eq('user_id', user.id)
    onMessagesRead?.()
  }, [supabase, conversation.id, user.id, onMessagesRead])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }, 100)
  }, [messages])

  // Realtime: new messages
  useEffect(() => {
    const ch = supabase.channel(`conv-${conversation.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversation.id}` }, async (payload) => {
        setMessages(ms => ms.some(m => m.id === payload.new.id) ? ms : [...ms, payload.new])
        if (payload.new.sender_id !== user.id) {
          await supabase.from('conversation_participants').update({ last_read_at: new Date().toISOString() }).eq('conversation_id', conversation.id).eq('user_id', user.id)
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversation.id}` }, (payload) => {
        setMessages(ms => ms.filter(m => m.id !== payload.old.id))
      })
      .on('broadcast', { event: 'typing' }, (msg) => {
        if (msg.payload.user_id !== user.id) {
          setOtherTyping(true)
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
          typingTimeoutRef.current = setTimeout(() => setOtherTyping(false), 2500)
        }
      })
      .subscribe()
    channelRef.current = ch
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      supabase.removeChannel(ch)
      channelRef.current = null
    }
  }, [conversation.id, supabase, user.id])

  const broadcastTyping = () => {
    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'typing', payload: { user_id: user.id } })
    }
  }

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const send = async (e) => {
    e?.preventDefault()
    if (!text.trim() && !file) return
    setSending(true)
    try {
      let image_url = null
      if (file) {
        const ext = file.name.split('.').pop()
        const path = `${user.id}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('dm-images').upload(path, file, { upsert: false })
        if (upErr) throw upErr
        const { data: pub } = supabase.storage.from('dm-images').getPublicUrl(path)
        image_url = pub.publicUrl
      }
      const { data, error } = await supabase.from('messages').insert({
        conversation_id: conversation.id, sender_id: user.id, content: text.trim() || null, image_url
      }).select('*').single()
      if (error) throw error
      setMessages(ms => ms.some(m => m.id === data.id) ? ms : [...ms, data])
      setText(''); setFile(null); setPreview(null); setShowEmoji(false)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSending(false)
    }
  }

  const deleteMsg = async (id) => {
    if (!confirm('Delete this message?')) return
    const { error } = await supabase.from('messages').delete().eq('id', id)
    if (error) toast.error(error.message)
  }

  const otherLastRead = other.last_read_at ? new Date(other.last_read_at) : null

  return (
    <>
      {/* Chat header */}
      <div className="flex items-center gap-3 border-b p-3 bg-background/60">
        <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden"><ArrowLeft className="h-4 w-4" /></Button>
        <Avatar className="h-9 w-9">
          <AvatarImage src={other.avatar_url} />
          <AvatarFallback className="bg-gradient-to-br from-orange-500 to-emerald-500 text-white text-sm">
            {(other.full_name || other.username || '?').charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="font-semibold text-sm">{other.full_name || other.username}</div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />
            Active
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-gradient-to-b from-orange-50/20 to-transparent dark:from-slate-900/40">
        {loading && <div className="text-center text-sm text-muted-foreground">Loading…</div>}
        {messages.map((m, i) => {
          const mine = m.sender_id === user.id
          const seen = mine && otherLastRead && new Date(m.created_at) <= otherLastRead
          const showAvatar = !mine && (i === 0 || messages[i-1].sender_id !== m.sender_id)
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'} gap-2 group`}>
              {!mine && (
                <div className="w-8 shrink-0">
                  {showAvatar && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={other.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-orange-500 to-emerald-500 text-white text-[10px]">
                        {(other.full_name || '?').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              )}
              <div className={`max-w-[70%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`rounded-2xl px-3 py-2 shadow-sm ${mine ? 'bg-gradient-to-br from-orange-500 to-emerald-500 text-white rounded-br-sm' : 'bg-muted rounded-bl-sm'}`}>
                  {m.image_url && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={m.image_url} alt="" className="rounded-lg max-w-full max-h-80 mb-1" loading="lazy" />
                  )}
                  {m.content && <div className="text-sm whitespace-pre-wrap break-words">{m.content}</div>}
                </div>
                <div className="flex items-center gap-1 mt-0.5 px-1 text-[10px] text-muted-foreground">
                  <span>{formatTime(m.created_at)}</span>
                  {mine && seen && <CheckCheck className="h-3 w-3 text-blue-500" />}
                  {mine && (
                    <button onClick={() => deleteMsg(m.id)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 ml-1">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {otherTyping && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground italic">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
            {other.username} is typing…
          </div>
        )}
      </div>

      {/* Composer */}
      {preview && (
        <div className="px-4 py-2 border-t flex items-center gap-2 bg-muted/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="h-16 rounded" />
          <Button size="icon" variant="ghost" onClick={() => { setFile(null); setPreview(null) }}><X className="h-4 w-4" /></Button>
        </div>
      )}
      {showEmoji && (
        <div className="px-4 py-2 border-t flex flex-wrap gap-1 bg-muted/40 max-h-32 overflow-y-auto">
          {EMOJIS.map(e => (
            <button key={e} onClick={() => { setText(t => t + e); setShowEmoji(false) }} className="text-xl hover:bg-background rounded p-1">{e}</button>
          ))}
        </div>
      )}
      <form onSubmit={send} className="border-t p-3 flex items-end gap-2 bg-background">
        <label className="cursor-pointer">
          <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          <Button type="button" size="icon" variant="ghost" asChild><span><ImageIcon className="h-4 w-4" /></span></Button>
        </label>
        <Button type="button" size="icon" variant="ghost" onClick={() => setShowEmoji(v => !v)}><Smile className="h-4 w-4" /></Button>
        <Input
          value={text}
          onChange={e => { setText(e.target.value); broadcastTyping() }}
          placeholder="Message…"
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={sending || (!text.trim() && !file)} className="bg-gradient-to-r from-orange-500 to-emerald-500 text-white">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </>
  )
}

// ---------------- NEW CONVERSATION ----------------
function NewConversationDialog({ supabase, user, onClose, onCreated }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!query.trim()) { setResults([]); return }
      const { data } = await supabase.from('profiles').select('id, username, full_name, avatar_url').or(`username.ilike.%${query}%,full_name.ilike.%${query}%`).neq('id', user.id).limit(10)
      setResults(data || [])
    }, 300)
    return () => clearTimeout(t)
  }, [query, supabase, user.id])

  const start = async (otherId) => {
    setBusy(true)
    try {
      const { data: convId, error } = await supabase.rpc('create_direct_conversation', { other_user_id: otherId })
      if (error) throw error
      onCreated(convId)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background rounded-lg shadow-xl w-full max-w-md p-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">Start a new conversation</h3>
          <Button size="icon" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <Input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name or @username…" />
        <div className="mt-3 max-h-80 overflow-y-auto space-y-1">
          {results.map(r => (
            <button key={r.id} onClick={() => start(r.id)} disabled={busy} className="w-full text-left flex items-center gap-3 p-2 rounded hover:bg-muted transition">
              <Avatar className="h-9 w-9">
                <AvatarImage src={r.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-orange-500 to-emerald-500 text-white text-xs">
                  {(r.full_name || r.username || '?').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="text-sm font-medium">{r.full_name || r.username}</div>
                <div className="text-xs text-muted-foreground">@{r.username}</div>
              </div>
            </button>
          ))}
          {query && results.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">No users found.</div>}
        </div>
      </div>
    </div>
  )
}
