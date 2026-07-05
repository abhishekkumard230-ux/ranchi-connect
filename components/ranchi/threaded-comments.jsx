'use client'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { Heart, MessageSquare, Trash2, Send, Loader2, ChevronDown, ChevronRight } from 'lucide-react'

function timeAgo(date) {
  const s = Math.floor((new Date() - new Date(date)) / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60); if (m < 60) return `${m}m`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`
  const d = Math.floor(h / 24); if (d < 7) return `${d}d`
  return new Date(date).toLocaleDateString()
}

const MAX_NESTING = 5

export default function ThreadedComments({ postId, currentUser, supabase, onOpenProfile }) {
  const [comments, setComments] = useState([])
  const [profiles, setProfiles] = useState({})
  const [likeCounts, setLikeCounts] = useState({})
  const [likedByMe, setLikedByMe] = useState({})
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    // Fetch all comments for this post
    const { data: allComments, error } = await supabase
      .from('comments')
      .select('id, content, created_at, updated_at, user_id, parent_id')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    if (error) { toast.error(error.message); setLoading(false); return }

    const commentIds = (allComments || []).map(c => c.id)
    const userIds = [...new Set((allComments || []).map(c => c.user_id))]
    let profMap = {}, lc = {}, lm = {}
    if (commentIds.length > 0) {
      const [profRes, likesRes] = await Promise.all([
        supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', userIds),
        supabase.from('likes').select('comment_id, user_id').in('comment_id', commentIds),
      ])
      profRes.data?.forEach(p => { profMap[p.id] = p })
      likesRes.data?.forEach(l => {
        lc[l.comment_id] = (lc[l.comment_id] || 0) + 1
        if (currentUser && l.user_id === currentUser.id) lm[l.comment_id] = true
      })
    }
    setComments(allComments || [])
    setProfiles(profMap)
    setLikeCounts(lc)
    setLikedByMe(lm)
    setLoading(false)
  }, [supabase, postId, currentUser])

  useEffect(() => { load() }, [load])

  // Realtime subscription for new comments on this post
  useEffect(() => {
    const channel = supabase
      .channel(`post-comments-${postId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` }, async (payload) => {
        // Skip if it's our own optimistic update
        if (comments.some(c => c.id === payload.new.id)) return
        // Fetch author profile
        const { data: prof } = await supabase.from('profiles').select('id, username, full_name, avatar_url').eq('id', payload.new.user_id).maybeSingle()
        setProfiles(p => ({ ...p, [prof?.id || payload.new.user_id]: prof }))
        setComments(cs => [...cs, payload.new])
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` }, (payload) => {
        setComments(cs => cs.filter(c => c.id !== payload.old.id))
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` }, (payload) => {
        setComments(cs => cs.map(c => c.id === payload.new.id ? { ...c, content: payload.new.content, updated_at: payload.new.updated_at } : c))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line
  }, [postId, supabase])

  const submit = async (content, parentId = null) => {
    if (!currentUser) { toast.error('Sign in to comment'); return false }
    if (!content.trim()) return false
    const { data, error } = await supabase.from('comments').insert({
      post_id: postId, user_id: currentUser.id, content: content.trim(), parent_id: parentId
    }).select('id, content, created_at, user_id, parent_id').single()
    if (error) { toast.error(error.message); return false }
    setComments(cs => [...cs, data])
    // Ensure my profile is cached
    if (!profiles[currentUser.id]) {
      const { data: prof } = await supabase.from('profiles').select('id, username, full_name, avatar_url').eq('id', currentUser.id).maybeSingle()
      if (prof) setProfiles(p => ({ ...p, [prof.id]: prof }))
    }
    return true
  }

  const handleTopSubmit = async (e) => {
    e.preventDefault()
    setSending(true)
    const ok = await submit(newComment)
    setSending(false)
    if (ok) setNewComment('')
  }

  const deleteComment = async (id) => {
    if (!confirm('Delete this comment?')) return
    const { error } = await supabase.from('comments').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    setComments(cs => cs.filter(c => c.id !== id))
  }

  const editComment = async (id, newContent) => {
    if (!newContent.trim()) return false
    const { error } = await supabase.from('comments').update({ content: newContent.trim() }).eq('id', id)
    if (error) { toast.error(error.message); return false }
    setComments(cs => cs.map(c => c.id === id ? { ...c, content: newContent.trim() } : c))
    return true
  }

  const toggleLikeComment = async (commentId) => {
    if (!currentUser) return toast.error('Sign in to like')
    const isLiked = likedByMe[commentId]
    setLikedByMe(lm => ({ ...lm, [commentId]: !isLiked }))
    setLikeCounts(lc => ({ ...lc, [commentId]: (lc[commentId] || 0) + (isLiked ? -1 : 1) }))
    if (isLiked) {
      await supabase.from('likes').delete().eq('comment_id', commentId).eq('user_id', currentUser.id)
    } else {
      const { error } = await supabase.from('likes').insert({ comment_id: commentId, user_id: currentUser.id })
      if (error) {
        // rollback
        setLikedByMe(lm => ({ ...lm, [commentId]: isLiked }))
        setLikeCounts(lc => ({ ...lc, [commentId]: (lc[commentId] || 0) + (isLiked ? 1 : -1) }))
        toast.error(error.message)
      }
    }
  }

  // Build tree
  const buildTree = () => {
    const map = {}
    comments.forEach(c => { map[c.id] = { ...c, children: [] } })
    const roots = []
    comments.forEach(c => {
      if (c.parent_id && map[c.parent_id]) map[c.parent_id].children.push(map[c.id])
      else roots.push(map[c.id])
    })
    return roots
  }

  const tree = buildTree()

  return (
    <div className="space-y-3">
      {/* Top-level composer */}
      {currentUser && (
        <form onSubmit={handleTopSubmit} className="flex gap-2 items-start">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={profiles[currentUser.id]?.avatar_url} />
            <AvatarFallback className="bg-gradient-to-br from-orange-500 to-emerald-500 text-white text-xs">
              {(profiles[currentUser.id]?.full_name || currentUser.email || 'U').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 flex gap-2">
            <Input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Write a comment…" />
            <Button type="submit" size="icon" disabled={sending || !newComment.trim()}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </form>
      )}

      {loading && <div className="text-sm text-muted-foreground text-center py-4">Loading comments…</div>}
      {!loading && tree.length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-6">No comments yet. Be the first!</div>
      )}

      <div className="space-y-2">
        {tree.map(node => (
          <CommentNode
            key={node.id}
            node={node}
            depth={0}
            profiles={profiles}
            likeCounts={likeCounts}
            likedByMe={likedByMe}
            currentUser={currentUser}
            onReply={submit}
            onDelete={deleteComment}
            onEdit={editComment}
            onLike={toggleLikeComment}
            onOpenProfile={onOpenProfile}
          />
        ))}
      </div>
    </div>
  )
}

// Count all descendants for reply count display
function countDescendants(node) {
  let count = node.children.length
  node.children.forEach(c => { count += countDescendants(c) })
  return count
}

function CommentNode({ node, depth, profiles, likeCounts, likedByMe, currentUser, onReply, onDelete, onEdit, onLike, onOpenProfile }) {
  const [showReply, setShowReply] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [collapsed, setCollapsed] = useState(depth >= 3 && node.children.length > 3)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(node.content)
  const [savingEdit, setSavingEdit] = useState(false)
  const author = profiles[node.user_id]
  const isOwn = currentUser?.id === node.user_id
  const isDeepest = depth >= MAX_NESTING - 1
  const totalReplies = countDescendants(node)

  const handleReply = async (e) => {
    e.preventDefault()
    if (!replyText.trim()) return
    setSending(true)
    const parentId = isDeepest ? node.parent_id || node.id : node.id
    const ok = await onReply(replyText, parentId)
    setSending(false)
    if (ok) {
      setReplyText('')
      setShowReply(false)
    }
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    setSavingEdit(true)
    const ok = await onEdit(node.id, editText)
    setSavingEdit(false)
    if (ok) setEditing(false)
  }

  return (
    <div style={{ marginLeft: depth === 0 ? 0 : 16 }} className={depth > 0 ? 'border-l-2 border-border/40 pl-3' : ''}>
      <div className="flex gap-2 group">
        <button onClick={() => onOpenProfile?.(node.user_id)} className="shrink-0">
          <Avatar className="h-8 w-8 hover:ring-2 hover:ring-orange-400 transition">
            <AvatarImage src={author?.avatar_url} />
            <AvatarFallback className="bg-gradient-to-br from-orange-500 to-emerald-500 text-white text-xs">
              {(author?.full_name || author?.username || 'U').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </button>
        <div className="flex-1 min-w-0">
          <div className="bg-muted rounded-2xl px-3 py-2">
            <button onClick={() => onOpenProfile?.(node.user_id)} className="text-xs font-semibold hover:underline">
              {author?.full_name || author?.username || 'User'}
            </button>
            {editing ? (
              <form onSubmit={handleSaveEdit} className="mt-1 space-y-2">
                <Input autoFocus value={editText} onChange={e => setEditText(e.target.value)} className="text-sm h-8" />
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={savingEdit || !editText.trim()} className="h-7 text-xs">
                    {savingEdit ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => { setEditing(false); setEditText(node.content) }} className="h-7 text-xs">Cancel</Button>
                </div>
              </form>
            ) : (
              <div className="text-sm whitespace-pre-wrap break-words">{renderContent(node.content, onOpenProfile)}{node.updated_at && <span className="text-[10px] text-muted-foreground italic ml-1">(edited)</span>}</div>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 px-2 text-[11px] text-muted-foreground">
            <span>{timeAgo(node.created_at)}</span>
            <button onClick={() => onLike(node.id)} className={`flex items-center gap-1 hover:text-red-500 transition ${likedByMe[node.id] ? 'text-red-500 font-medium' : ''}`}>
              <Heart className={`h-3 w-3 ${likedByMe[node.id] ? 'fill-current' : ''}`} />
              {likeCounts[node.id] || 0}
            </button>
            {currentUser && (
              <button onClick={() => setShowReply(v => !v)} className="hover:text-foreground transition font-medium">Reply</button>
            )}
            {totalReplies > 0 && (
              <span className="text-orange-600 font-medium">{totalReplies} {totalReplies === 1 ? 'reply' : 'replies'}</span>
            )}
            {isOwn && !editing && (
              <>
                <button onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 hover:text-foreground transition font-medium">Edit</button>
                <button onClick={() => onDelete(node.id)} className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition"><Trash2 className="h-3 w-3" /></button>
              </>
            )}
          </div>

          {showReply && (
            <form onSubmit={handleReply} className="flex gap-2 mt-2">
              <Input autoFocus value={replyText} onChange={e => setReplyText(e.target.value)} placeholder={`Reply to ${author?.username || 'comment'}…`} className="text-sm h-8" />
              <Button type="submit" size="sm" disabled={sending || !replyText.trim()} className="h-8">
                {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Reply'}
              </Button>
            </form>
          )}

          {node.children.length > 0 && (
            <div className="mt-2">
              {collapsed ? (
                <button onClick={() => setCollapsed(false)} className="text-xs text-orange-600 hover:underline flex items-center gap-1">
                  <ChevronRight className="h-3 w-3" /> Show {node.children.length} {node.children.length === 1 ? 'reply' : 'replies'}
                </button>
              ) : (
                <div className="space-y-2">
                  {node.children.length > 3 && (
                    <button onClick={() => setCollapsed(true)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                      <ChevronDown className="h-3 w-3" /> Hide replies
                    </button>
                  )}
                  {node.children.map(child => (
                    <CommentNode
                      key={child.id}
                      node={child}
                      depth={depth + 1}
                      profiles={profiles}
                      likeCounts={likeCounts}
                      likedByMe={likedByMe}
                      currentUser={currentUser}
                      onReply={onReply}
                      onDelete={onDelete}
                      onEdit={onEdit}
                      onLike={onLike}
                      onOpenProfile={onOpenProfile}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Render content with @mentions highlighted
function renderContent(content, onOpenProfile) {
  if (!content) return null
  const parts = content.split(/(@[a-zA-Z0-9_]+)/g)
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return (
        <span key={i} className="text-orange-600 font-medium hover:underline cursor-pointer">
          {part}
        </span>
      )
    }
    return <span key={i}>{part}</span>
  })
}
