'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send, Trash2, Bot, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

// Generate a stable session ID per browser session
function getSessionId(): string {
  if (typeof window === 'undefined') return 'server'
  const key = 'suta-session-id'
  let id = sessionStorage.getItem(key)
  if (!id) {
    id = `suta-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    sessionStorage.setItem(key, id)
  }
  return id
}

const SUGGESTIONS = [
  'Comment chercher un logement ?',
  'Comment publier une annonce ?',
  'Qu\'est-ce que le Tiers de Confiance ?',
  'Comment payer mon loyer ?',
  'Comment déposer un dossier de location ?',
]

export function SutaChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string>('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [showSuggestions, setShowSuggestions] = useState(true)

  // Initialize session ID on client
  useEffect(() => {
    setSessionId(getSessionId())
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setShowSuggestions(false)

    try {
      const res = await fetch('/api/suta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), sessionId }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erreur de connexion')
      }

      const assistantMessage: Message = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: Message = {
        id: `msg-${Date.now()}-err`,
        role: 'assistant',
        content: 'Désolé, une erreur est survenue. Veuillez réessayer dans un instant. 🙏',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, sessionId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const clearConversation = async () => {
    try {
      await fetch(`/api/suta?sessionId=${sessionId}`, { method: 'DELETE' })
    } catch {
      // Ignore delete errors
    }
    setMessages([])
    setShowSuggestions(true)
  }

  // Welcome message
  const welcomeShown = useRef(false)
  useEffect(() => {
    if (isOpen && !welcomeShown.current && messages.length === 0) {
      welcomeShown.current = true
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: 'Salut ! 👋 Je suis **SUTA**, ton assistant intelligent sur Mon Toit. Je peux t\'aider à comprendre toutes les fonctionnalités de la plateforme, que tu sois Locataire, Propriétaire, Agence ou Tiers de Confiance.\n\nComment puis-je t\'aider aujourd\'hui ?',
          timestamp: new Date(),
        },
      ])
    }
  }, [isOpen, messages.length])

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#FF6C2F] text-white shadow-lg hover:shadow-xl transition-shadow"
            aria-label="Ouvrir le chat SUTA"
          >
            <div className="relative">
              <MessageCircle className="h-6 w-6" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
              </span>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-5 right-5 z-50 flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl"
            style={{
              width: 'calc(100vw - 2.5rem)',
              maxWidth: '400px',
              height: 'calc(100vh - 5rem)',
              maxHeight: '600px',
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 bg-[#FF6C2F] px-4 py-3 text-white">
              <div className="relative">
                <img
                  src="/suta-avatar.jpg"
                  alt="SUTA"
                  className="h-10 w-10 rounded-full border-2 border-white/30 object-cover"
                />
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#FF6C2F] bg-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base leading-tight">SUTA</h3>
                <p className="text-xs text-white/80 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Assistant IA Mon Toit
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearConversation}
                  className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10"
                  title="Effacer la conversation"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10"
                  title="Fermer"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar */}
                    {msg.role === 'assistant' ? (
                      <div className="flex-shrink-0">
                        <img
                          src="/suta-avatar.jpg"
                          alt="SUTA"
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-neutral-200 flex items-center justify-center">
                        <span className="text-xs font-medium text-neutral-600">Vous</span>
                      </div>
                    )}

                    {/* Bubble */}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-[#FF6C2F] text-white rounded-tr-sm'
                          : 'bg-neutral-100 text-neutral-800 rounded-tl-sm'
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words">
                        {msg.content.split(/(\*\*.*?\*\*)/).map((part, i) => {
                          if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={i}>{part.slice(2, -2)}</strong>
                          }
                          return <span key={i}>{part}</span>
                        })}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {isLoading && (
                  <div className="flex gap-2.5">
                    <img
                      src="/suta-avatar.jpg"
                      alt="SUTA"
                      className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="bg-neutral-100 rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="h-2 w-2 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="h-2 w-2 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Suggestions */}
              {showSuggestions && messages.length <= 1 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-neutral-500 font-medium px-1">Suggestions :</p>
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => sendMessage(suggestion)}
                      className="w-full text-left rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 hover:border-[#FF6C2F]/40 hover:bg-[#FF6C2F]/5 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <form onSubmit={handleSubmit} className="border-t border-neutral-200 p-3">
              <div className="flex items-center gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Posez votre question..."
                  disabled={isLoading}
                  className="flex-1 rounded-full border-neutral-200 bg-neutral-50 text-sm focus:border-[#FF6C2F] focus:ring-[#FF6C2F]/20"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || isLoading}
                  className="h-10 w-10 rounded-full bg-[#FF6C2F] hover:bg-[#e85f26] text-white flex-shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
