'use client'

import { useCallback, useEffect, useState } from 'react'
import { MessageSquare, Send, ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'

interface Conversation {
  id: string
  lastMessageAt: string | null
  participant1: { id: string; firstName: string; lastName: string }
  participant2: { id: string; firstName: string; lastName: string }
  property: { title: string } | null
  messages: Array<{
    id: string
    content: string
    createdAt: string
    isRead: boolean
    senderId: string
  }>
}

export function Messages() {
  const { user, isAuthenticated } = useAuthStore()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      const d = await authFetch<{ conversations?: Conversation[] }>('/api/dashboard/locataire')
      setConversations(d.conversations || [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) {
        // authFetch already handled logout — just show default data
        setConversations([])
        return
      }
      setConversations([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const selected = conversations.find((c) => c.id === selectedId)
  const otherPerson = selected
    ? selected.participant1.id === user?.id ? selected.participant2 : selected.participant1
    : null

  if (loading) {
    return <div className="h-96 rounded-xl bg-muted animate-pulse" />
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Messages</h1>
        <p className="text-muted-foreground mt-1">Vos conversations</p>
      </div>

      <Card className="border-border overflow-hidden">
        <div className="flex h-[500px]">
          {/* Conversation list */}
          <div className={`w-full sm:w-80 border-r border-border ${selectedId ? 'hidden sm:block' : ''}`}>
            <div className="p-3 border-b border-border">
              <Input placeholder="Rechercher..." className="h-9" />
            </div>
            <div className="overflow-y-auto h-[calc(500px-49px)]">
              {conversations.length === 0 ? (
                <div className="py-12 text-center">
                  <MessageSquare className="size-8 text-neutral-300 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Aucune conversation</p>
                </div>
              ) : (
                conversations.map((conv) => {
                  const other = conv.participant1.id === user?.id ? conv.participant2 : conv.participant1
                  const lastMsg = conv.messages?.[0]
                  return (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedId(conv.id)}
                      className={`w-full flex items-start gap-3 p-3 text-left hover:bg-accent transition-colors border-b border-border ${
                        selectedId === conv.id ? 'bg-brand-50' : ''
                      }`}
                    >
                      <Avatar className="size-10 shrink-0">
                        <AvatarFallback className="bg-brand-100 text-brand-700 text-xs">
                          {other.firstName[0]}{other.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-foreground truncate">
                            {other.firstName} {other.lastName}
                          </p>
                          {lastMsg && (
                            <span className="text-xs text-muted-foreground shrink-0">
                              {new Date(lastMsg.createdAt).toLocaleDateString('fr-FR')}
                            </span>
                          )}
                        </div>
                        {conv.property && (
                          <p className="text-xs text-muted-foreground truncate">{conv.property.title}</p>
                        )}
                        {lastMsg && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{lastMsg.content}</p>
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
            {selected && otherPerson ? (
              <>
                <div className="flex items-center gap-3 p-3 border-b border-border">
                  <button onClick={() => setSelectedId(null)} className="sm:hidden">
                    <ArrowLeft className="size-5 text-muted-foreground" />
                  </button>
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-brand-100 text-brand-700 text-xs">
                      {otherPerson.firstName[0]}{otherPerson.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{otherPerson.firstName} {otherPerson.lastName}</p>
                    {selected.property && (
                      <p className="text-xs text-muted-foreground">{selected.property.title}</p>
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {selected.messages?.map((msg) => {
                    const isMe = msg.senderId === user?.id
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                          isMe ? 'bg-brand-500 text-white' : 'bg-muted text-foreground'
                        }`}>
                          {msg.content}
                          <p className={`text-xs mt-1 ${isMe ? 'text-white/70' : 'text-muted-foreground'}`}>
                            {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="p-3 border-t border-border flex gap-2">
                  <Input placeholder="Votre message..." className="flex-1 h-10" />
                  <Button size="icon" className="bg-brand-500 hover:bg-brand-600 text-white shrink-0">
                    <Send className="size-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="size-12 text-neutral-300 mx-auto mb-3" />
                  <p className="text-muted-foreground">Sélectionnez une conversation</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
