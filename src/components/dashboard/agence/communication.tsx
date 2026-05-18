'use client'

import { useEffect, useState, useCallback } from 'react'
import { MessageSquare, Send, FileText, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface Conversation {
  id: string; lastMessageAt: string | null; createdAt: string
  participant1: { id: string; firstName: string; lastName: string; role: string }
  participant2: { id: string; firstName: string; lastName: string; role: string }
  messages: Array<{ id: string; content: string; isRead: boolean; createdAt: string; senderId: string }>
  property: { id: string; title: string } | null
}

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

const messageTemplates = [
  { label: 'Confirmation de visite', content: 'Bonjour, votre demande de visite a été confirmée pour le bien {property}.' },
  { label: 'Rappel de paiement', content: 'Bonjour, nous vous rappelons que votre loyer est dû pour le mois en cours.' },
  { label: 'Bienvenue', content: 'Bienvenue dans votre nouveau logement ! N\'hésitez pas à nous contacter pour toute question.' },
  { label: 'Fin de bail', content: 'Votre bail arrive à échéance le {date}. Souhaitez-vous le renouveler ?' },
]

export function AgenceCommunication() {
  const { isAuthenticated, user } = useAuthStore()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedConv, setSelectedConv] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [filter, setFilter] = useState<string>('all')

  const fetchData = useCallback(async () => {
    if (!isAuthenticated || !user) { setLoading(false); return }
    try {
      const d = await authFetch<{ conversations: Conversation[] }>('/api/messages')
      setConversations(d.conversations ?? [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) return
    } finally { setLoading(false) }
  }, [isAuthenticated, user])

  useEffect(() => { fetchData() }, [fetchData])

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConv) return
    try {
      await authFetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selectedConv, content: newMessage }),
      })
      setNewMessage('')
      fetchData()
      toast.success('Message envoyé')
    } catch { toast.error('Erreur lors de l\'envoi') }
  }

  const filteredConvs = conversations.filter((c) => {
    if (filter === 'owner') return c.participant1.role === 'PROPRIETAIRE' || c.participant2.role === 'PROPRIETAIRE'
    if (filter === 'tenant') return c.participant1.role === 'LOCATAIRE' || c.participant2.role === 'LOCATAIRE'
    return true
  })

  const selected = conversations.find((c) => c.id === selectedConv)

  if (loading) return <div className="space-y-4">{[1, 2].map((i) => <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />)}</div>

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <MessageSquare className="size-5 sm:size-6 text-[#FF6C2F]" /> Communication
        </h1>
        <p className="text-muted-foreground mt-1">{conversations.length} conversation{conversations.length > 1 ? 's' : ''}</p>
      </motion.div>

      <motion.div variants={itemVariants} className="grid lg:grid-cols-3 gap-4">
        {/* Conversations List */}
        <Card className="border-border lg:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="owner">Propriétaires</SelectItem>
                  <SelectItem value="tenant">Locataires</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-2 max-h-96 overflow-y-auto space-y-1">
            {filteredConvs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune conversation</p>
            ) : (
              filteredConvs.map((c) => {
                const other = c.participant1.id === user?.id ? c.participant2 : c.participant1
                const lastMsg = c.messages?.[c.messages.length - 1]
                const unread = c.messages?.filter((m) => !m.isRead && m.senderId !== user?.id).length ?? 0
                return (
                  <button key={c.id} onClick={() => setSelectedConv(c.id)}
                    className={`w-full text-left p-2.5 rounded-lg hover:bg-accent/50 transition-colors ${selectedConv === c.id ? 'bg-orange-50 border border-[#FF6C2F]/20' : ''}`}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">{other.firstName} {other.lastName}</p>
                      {unread > 0 && <Badge className="bg-[#FF6C2F] text-white text-[10px]">{unread}</Badge>}
                    </div>
                    {lastMsg && <p className="text-xs text-muted-foreground truncate mt-0.5">{lastMsg.content}</p>}
                    {c.property && <p className="text-[10px] text-muted-foreground mt-0.5">🏠 {c.property.title}</p>}
                  </button>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="border-border lg:col-span-2">
          <CardHeader className="pb-2">
            {selected ? (
              <CardTitle className="text-sm">
                {(() => {
                  const other = selected.participant1.id === user?.id ? selected.participant2 : selected.participant1
                  return `${other.firstName} ${other.lastName}`
                })()}
              </CardTitle>
            ) : (
              <CardTitle className="text-sm text-muted-foreground">Sélectionnez une conversation</CardTitle>
            )}
          </CardHeader>
          <CardContent>
            {selected ? (
              <div className="space-y-3">
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {(selected.messages ?? []).map((m) => (
                    <div key={m.id} className={`flex ${m.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-2.5 rounded-lg text-sm ${m.senderId === user?.id ? 'bg-[#FF6C2F] text-white' : 'bg-muted'}`}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Votre message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()} />
                  <Button onClick={sendMessage} className="bg-[#FF6C2F] hover:bg-[#e55e27] text-white shrink-0" size="icon">
                    <Send className="size-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <MessageSquare className="size-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sélectionnez une conversation pour commencer</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Message Templates */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="size-4 text-[#FF6C2F]" /> Modèles de messages
            </CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-3">
            {messageTemplates.map((t, i) => (
              <div key={i} className="p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => { setNewMessage(t.content); toast.info('Modèle copié') }}>
                <p className="text-sm font-medium text-foreground">{t.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{t.content}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
