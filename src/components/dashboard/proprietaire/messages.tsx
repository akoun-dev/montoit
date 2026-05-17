'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MessageSquare, Send, ArrowLeft, Plus, Search, X } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion, AnimatePresence } from 'framer-motion'

interface Participant {
  id: string
  firstName: string
  lastName: string
  avatarUrl: string | null
}

interface PropertyImage {
  id: string
  url: string
  order: number
}

interface PropertyInfo {
  id: string
  title: string
  images: PropertyImage[]
}

interface Message {
  id: string
  content: string
  createdAt: string
  isRead: boolean
  senderId: string
  sender: Participant
}

interface Conversation {
  id: string
  lastMessageAt: string | null
  createdAt: string
  propertyId: string | null
  participant1Id: string
  participant2Id: string
  participant1: Participant
  participant2: Participant
  property: PropertyInfo | null
  messages: Message[]
  unreadCount: number
}

export function ProprietaireMessages() {
  const { user, isAuthenticated } = useAuthStore()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [newConvOpen, setNewConvOpen] = useState(false)
  const [newRecipientId, setNewRecipientId] = useState('')
  const [newRecipientSearch, setNewRecipientSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ id: string; firstName: string; lastName: string; avatarUrl: string | null }>>([])
  const [searchingUsers, setSearchingUsers] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchConversations = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      const data = await authFetch<{ conversations: Conversation[]; totalUnread: number }>('/api/messages')
      setConversations(data.conversations || [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) {
        setConversations([])
        return
      }
      setConversations([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Auto-scroll to bottom when selecting a conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedId])

  const selected = conversations.find((c) => c.id === selectedId)

  // Fetch full message history when selecting a conversation
  const [fullMessages, setFullMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)

  useEffect(() => {
    if (!selectedId) {
      setFullMessages([])
      return
    }
    setLoadingMessages(true)
    authFetch<{ conversation: Conversation }>(`/api/messages?conversationId=${selectedId}`)
      .then((data) => {
        setFullMessages(data.conversation?.messages || [])
        // Update unread count in conversations list
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedId ? { ...c, unreadCount: 0 } : c
          )
        )
      })
      .catch(() => setFullMessages([]))
      .finally(() => setLoadingMessages(false))
  }, [selectedId])

  const otherPerson = selected
    ? selected.participant1Id === user?.id ? selected.participant2 : selected.participant1
    : null

  // Filter conversations by search query
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery.trim()) return true
    const other = conv.participant1Id === user?.id ? conv.participant2 : conv.participant1
    const name = `${other.firstName} ${other.lastName}`.toLowerCase()
    const propertyTitle = conv.property?.title?.toLowerCase() || ''
    const query = searchQuery.toLowerCase()
    return name.includes(query) || propertyTitle.includes(query)
  })

  const handleSendMessage = async () => {
    if (!messageText.trim() || sending) return

    setSending(true)
    try {
      const body: Record<string, string> = { content: messageText.trim() }
      if (selectedId) {
        body.conversationId = selectedId
      }

      const data = await authFetch<{ message: Message; conversation: Conversation }>('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      // Update conversations list
      setConversations((prev) => {
        const convIndex = prev.findIndex((c) => c.id === data.conversation.id)
        if (convIndex >= 0) {
          const updated = [...prev]
          updated[convIndex] = {
            ...updated[convIndex],
            messages: [...updated[convIndex].messages, data.message],
            lastMessageAt: new Date().toISOString(),
          }
          return updated
        }
        // New conversation — add it
        return [
          {
            ...data.conversation,
            messages: [data.message],
            unreadCount: 0,
          },
          ...prev,
        ]
      })

      // Add new message to fullMessages
      setFullMessages((prev) => [...prev, data.message])

      setMessageText('')

      // If it was a new conversation, select it
      if (!selectedId && data.conversation.id) {
        setSelectedId(data.conversation.id)
      }

      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } catch (err) {
      console.error('Send message error:', err)
    } finally {
      setSending(false)
    }
  }

  const handleStartConversation = async () => {
    if (!newRecipientId || !messageText.trim() || sending) return

    setSending(true)
    try {
      const data = await authFetch<{ message: Message; conversation: Conversation }>('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: newRecipientId,
          content: messageText.trim(),
        }),
      })

      setConversations((prev) => {
        const exists = prev.find((c) => c.id === data.conversation.id)
        if (exists) return prev
        return [
          {
            ...data.conversation,
            messages: [data.message],
            unreadCount: 0,
          },
          ...prev,
        ]
      })

      setSelectedId(data.conversation.id)
      setMessageText('')
      setNewConvOpen(false)
      setNewRecipientId('')
      setNewRecipientSearch('')
      setSearchResults([])
    } catch (err) {
      console.error('Start conversation error:', err)
    } finally {
      setSending(false)
    }
  }

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([])
      return
    }

    setSearchingUsers(true)
    try {
      const data = await authFetch<{ users: Array<{ id: string; firstName: string; lastName: string; avatarUrl: string | null }> }>(
        `/api/users/search?q=${encodeURIComponent(query)}`
      )
      setSearchResults(data.users || [])
    } catch {
      setSearchResults([])
    } finally {
      setSearchingUsers(false)
    }
  }, [])

  // Debounce user search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(newRecipientSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [newRecipientSearch, searchUsers])

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    } else if (diffDays === 1) {
      return 'Hier'
    } else if (diffDays < 7) {
      return date.toLocaleDateString('fr-FR', { weekday: 'short' })
    }
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
        <div className="h-[500px] rounded-xl bg-muted animate-pulse" />
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Messages</h1>
          <p className="text-muted-foreground mt-1">Vos conversations avec les locataires</p>
        </div>
        <Dialog open={newConvOpen} onOpenChange={setNewConvOpen}>
          <DialogTrigger asChild>
            <Button className="bg-brand-500 hover:bg-brand-600 text-white gap-2">
              <Plus className="size-4" />
              Nouvelle conversation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle conversation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Destinataire</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un locataire..."
                    value={newRecipientSearch}
                    onChange={(e) => setNewRecipientSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {newRecipientId && (
                  <div className="flex items-center gap-2 mt-2 p-2 bg-brand-50 rounded-lg">
                    <Avatar className="size-6">
                      <AvatarFallback className="bg-brand-100 text-brand-700 text-xs">
                        {searchResults.find((r) => r.id === newRecipientId)?.firstName?.[0]}
                        {searchResults.find((r) => r.id === newRecipientId)?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                      {searchResults.find((r) => r.id === newRecipientId)?.firstName}{' '}
                      {searchResults.find((r) => r.id === newRecipientId)?.lastName}
                    </span>
                    <button onClick={() => setNewRecipientId('')} className="ml-auto">
                      <X className="size-4 text-muted-foreground hover:text-foreground" />
                    </button>
                  </div>
                )}
                {searchingUsers && (
                  <p className="text-xs text-muted-foreground mt-1">Recherche...</p>
                )}
                {!newRecipientId && searchResults.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto border rounded-lg divide-y">
                    {searchResults.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => {
                          setNewRecipientId(result.id)
                          setNewRecipientSearch('')
                          setSearchResults([])
                        }}
                        className="w-full flex items-center gap-2 p-2 hover:bg-accent transition-colors text-left"
                      >
                        <Avatar className="size-7">
                          <AvatarFallback className="bg-brand-100 text-brand-700 text-xs">
                            {result.firstName[0]}{result.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{result.firstName} {result.lastName}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Message</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Écrivez votre message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleStartConversation()
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleStartConversation}
                    disabled={!newRecipientId || !messageText.trim() || sending}
                    className="bg-brand-500 hover:bg-brand-600 text-white shrink-0"
                  >
                    <Send className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border overflow-hidden">
        <div className="flex h-[560px]">
          {/* Conversation list */}
          <div className={`w-full sm:w-80 border-r border-border flex flex-col ${selectedId ? 'hidden sm:flex' : ''}`}>
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 pl-9"
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {filteredConversations.length === 0 ? (
                <div className="py-12 text-center">
                  <MessageSquare className="size-8 text-neutral-300 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Aucune conversation</p>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const other = conv.participant1Id === user?.id ? conv.participant2 : conv.participant1
                  const lastMsg = conv.messages?.[conv.messages.length - 1]
                  return (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedId(conv.id)}
                      className={`w-full flex items-start gap-3 p-3 text-left hover:bg-accent transition-colors border-b border-border ${
                        selectedId === conv.id ? 'bg-brand-50' : ''
                      }`}
                    >
                      <div className="relative shrink-0">
                        <Avatar className="size-10">
                          {other.avatarUrl ? (
                            <AvatarImage src={other.avatarUrl} alt={`${other.firstName} ${other.lastName}`} />
                          ) : null}
                          <AvatarFallback className="bg-brand-100 text-brand-700 text-xs">
                            {other.firstName[0]}{other.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        {conv.unreadCount > 0 && (
                          <Badge className="absolute -top-1 -right-1 size-5 p-0 flex items-center justify-center bg-brand-500 text-white text-[10px] border-2 border-background">
                            {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-semibold text-foreground' : 'font-medium text-foreground'}`}>
                            {other.firstName} {other.lastName}
                          </p>
                          {lastMsg && (
                            <span className="text-xs text-muted-foreground shrink-0 ml-2">
                              {formatTime(lastMsg.createdAt)}
                            </span>
                          )}
                        </div>
                        {conv.property && (
                          <p className="text-xs text-muted-foreground truncate">{conv.property.title}</p>
                        )}
                        {lastMsg && (
                          <p className={`text-xs truncate mt-0.5 ${conv.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                            {lastMsg.senderId === user?.id ? 'Vous : ' : ''}{lastMsg.content}
                          </p>
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Chat area */}
          <div className={`flex-1 flex flex-col ${!selectedId ? 'hidden sm:flex' : ''}`}>
            <AnimatePresence mode="wait">
              {selected && otherPerson ? (
                <motion.div
                  key={selected.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col h-full"
                >
                  {/* Chat header */}
                  <div className="flex items-center gap-3 p-3 border-b border-border shrink-0">
                    <button onClick={() => setSelectedId(null)} className="sm:hidden">
                      <ArrowLeft className="size-5 text-muted-foreground" />
                    </button>
                    <Avatar className="size-9">
                      {otherPerson.avatarUrl ? (
                        <AvatarImage src={otherPerson.avatarUrl} alt={`${otherPerson.firstName} ${otherPerson.lastName}`} />
                      ) : null}
                      <AvatarFallback className="bg-brand-100 text-brand-700 text-xs">
                        {otherPerson.firstName[0]}{otherPerson.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{otherPerson.firstName} {otherPerson.lastName}</p>
                      {selected.property && (
                        <p className="text-xs text-muted-foreground truncate">{selected.property.title}</p>
                      )}
                    </div>
                  </div>

                  {/* Messages area */}
                  <ScrollArea className="flex-1">
                    <div className="p-4 space-y-3">
                      {loadingMessages ? (
                        <div className="flex items-center justify-center py-8">
                          <span className="size-5 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
                        </div>
                      ) : fullMessages.map((msg) => {
                        const isMe = msg.senderId === user?.id
                        return (
                          <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className="flex items-end gap-2 max-w-[75%]">
                              {!isMe && (
                                <Avatar className="size-6 shrink-0">
                                  <AvatarFallback className="bg-brand-100 text-brand-700 text-[10px]">
                                    {msg.sender.firstName[0]}{msg.sender.lastName[0]}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <div>
                                <div className={`rounded-2xl px-4 py-2.5 text-sm ${
                                  isMe ? 'bg-brand-500 text-white rounded-br-md' : 'bg-muted text-foreground rounded-bl-md'
                                }`}>
                                  {msg.content}
                                </div>
                                <p className={`text-[10px] mt-0.5 px-1 ${isMe ? 'text-right text-muted-foreground' : 'text-muted-foreground'}`}>
                                  {formatTime(msg.createdAt)}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Message input */}
                  <div className="p-3 border-t border-border flex gap-2 shrink-0">
                    <Input
                      placeholder="Votre message..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage()
                        }
                      }}
                      className="flex-1 h-10"
                      disabled={sending}
                    />
                    <Button
                      size="icon"
                      onClick={handleSendMessage}
                      disabled={!messageText.trim() || sending}
                      className="bg-brand-500 hover:bg-brand-600 text-white shrink-0"
                    >
                      <Send className="size-4" />
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex items-center justify-center"
                >
                  <div className="text-center">
                    <MessageSquare className="size-12 text-neutral-300 mx-auto mb-3" />
                    <p className="text-muted-foreground">Sélectionnez une conversation</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">ou démarrez une nouvelle discussion</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
