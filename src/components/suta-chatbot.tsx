'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Trash2, GripVertical, Cpu, Cloud, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { apiFetch } from '@/lib/capacitor'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  partial?: boolean
}

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
  "Qu'est-ce que le Tiers de Confiance ?",
  'Comment payer mon loyer ?',
  'Comment déposer un dossier de location ?',
]

export function SutaChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const sessionIdRef = useRef<string>(
    typeof window !== 'undefined' ? getSessionId() : '',
  )
  const scrollViewportRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartPos = useRef({ x: 0, y: 0 })
  const chatPanelRef = useRef<HTMLDivElement>(null)

  // Inference mode: 'loading' | 'litert' | 'cloud'
  const [inferenceMode, setInferenceMode] = useState<'loading' | 'litert' | 'cloud'>('loading')

  useEffect(() => {
    if (scrollViewportRef.current) {
      scrollViewportRef.current.scrollTop = scrollViewportRef.current.scrollHeight
    }
  }, [messages, isLoading])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('input') || target.closest('a')) return

    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    setIsDragging(true)
    dragStartPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    }
  }, [position])

  useEffect(() => {
    if (!isDragging) return

    const handlePointerMove = (e: PointerEvent) => {
      const newX = e.clientX - dragStartPos.current.x
      const newY = e.clientY - dragStartPos.current.y
      const panelWidth = window.innerWidth < 640 ? window.innerWidth - 16 : 380
      const panelHeight = window.innerWidth < 640 ? window.innerHeight - 16 : 500
      const maxX = Math.max(0, window.innerWidth - panelWidth)
      const maxY = Math.max(0, window.innerHeight - panelHeight)

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      })
    }

    const handlePointerUp = () => setIsDragging(false)

    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', handlePointerUp)
    return () => {
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isDragging])

  // Detect inference mode on mount
  useEffect(() => {
    let cancelled = false
    async function detectMode() {
      try {
        const res = await apiFetch('/api/suta', { credentials: 'include' })
        const data = await res.json()
        if (!cancelled) {
          setInferenceMode(data.inference?.mode === 'litert' ? 'litert' : 'cloud')
        }
      } catch {
        if (!cancelled) setInferenceMode('cloud')
      }
    }
    detectMode()
    return () => { cancelled = true }
  }, [])

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

    const assistantId = `msg-${Date.now()}-ai`
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      partial: true,
    }
    setMessages((prev) => [...prev, assistantMessage])

    try {
      const res = await apiFetch('/api/suta?stream=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), sessionId: sessionIdRef.current }),
        credentials: 'include',
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Erreur ${res.status}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('Pas de body dans la réponse')

      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data: ')) continue
          const data = trimmed.slice(6)
          if (data === '[DONE]') continue
          try {
            const parsed = JSON.parse(data)
            if (parsed.mode) continue
            const token = parsed.choices?.[0]?.delta?.content
            if (token) {
              fullContent += token
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantId
                    ? { ...msg, content: fullContent }
                    : msg,
                ),
              )
            }
          } catch {
            // skip
          }
        }
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? { ...msg, partial: false }
            : msg,
        ),
      )
    } catch {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? { ...msg, content: 'Désolé, une erreur est survenue. Veuillez réessayer dans un instant.', partial: false }
            : msg,
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }, [isLoading])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const clearConversation = async () => {
    try {
      await apiFetch(`/api/suta?sessionId=${sessionIdRef.current}`, {
        method: 'DELETE',
        credentials: 'include',
      })
    } catch {
      // Ignore
    }
    setMessages([])
    setShowSuggestions(true)
  }

  const welcomeShown = useRef(false)
  useEffect(() => {
    if (isOpen && !welcomeShown.current && messages.length === 0) {
      welcomeShown.current = true
      const modeHint = inferenceMode === 'litert'
        ? "\n\n✨ Je fonctionne **en local** via LiteRT — mes réponses sont instantanées et privées !"
        : inferenceMode === 'loading'
        ? ''
        : ''
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `Salut ! 👋 Je suis **SUTA**, ton assistant intelligent sur Mon Toit. Je peux t'aider à comprendre toutes les fonctionnalités de la plateforme, que tu sois Locataire, Propriétaire, Agence ou Tiers de Confiance.${modeHint}\n\nComment puis-je t'aider aujourd'hui ?`,
          timestamp: new Date(),
        },
      ])
    }
  }, [isOpen, messages.length, inferenceMode])

  const renderModelStatus = () => {
    if (inferenceMode === 'loading') {
      return <Loader2 className="h-2.5 w-2.5 animate-spin sm:h-3 sm:w-3" />
    }
    if (inferenceMode === 'litert') {
      return <Cpu className="h-2.5 w-2.5 text-green-300 sm:h-3 sm:w-3" />
    }
    return <Cloud className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
  }

  const renderModelLabel = () => {
    if (inferenceMode === 'loading') return 'Connexion au moteur...'
    if (inferenceMode === 'litert') return 'LiteRT • Local'
    return 'Azure OpenAI • Cloud'
  }

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-24 right-4 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-[#FF6C2F] p-1 shadow-lg shadow-[#FF6C2F]/30 hover:shadow-xl hover:shadow-[#FF6C2F]/40 transition-shadow sm:bottom-6 sm:right-6"
            style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
            aria-label="Ouvrir le chat SUTA"
          >
            <div className="relative h-full w-full">
              <img
                src="/suta-avatar.jpg"
                alt="SUTA"
                className="h-full w-full rounded-full object-cover"
              />
              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-400" />
              </span>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            ref={chatPanelRef}
            className="fixed inset-2 z-50 flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl sm:inset-auto sm:bottom-4 sm:right-4 sm:top-auto sm:left-auto sm:h-[500px] sm:w-[380px]"
            style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
          >
            {/* Header */}
            <div
              className="flex items-center gap-2.5 border-b border-white/10 bg-[#FF6C2F] px-3 py-2.5 text-white sm:gap-3 sm:px-4 sm:py-3 cursor-move select-none touch-none"
              onPointerDown={handlePointerDown}
            >
              <GripVertical className="h-4 w-4 text-white/60 flex-shrink-0 hidden sm:block" />
              <div className="relative flex-shrink-0">
                <img
                  src="/suta-avatar.jpg"
                  alt="SUTA"
                  className="h-9 w-9 rounded-full border-2 border-white/30 object-cover sm:h-10 sm:w-10"
                />
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#FF6C2F] bg-green-400 sm:h-3 sm:w-3" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm leading-tight sm:text-base">SUTA</h3>
                <p className="text-[11px] text-white/80 flex items-center gap-1 sm:text-xs">
                  {renderModelStatus()}
                  {renderModelLabel()}
                </p>
              </div>
              <div className="flex items-center gap-0.5 sm:gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearConversation}
                  className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10 sm:h-8 sm:w-8"
                  title="Effacer la conversation"
                >
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10 sm:h-8 sm:w-8"
                  title="Fermer"
                >
                  <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea
              ref={(el) => {
                if (el) {
                  const viewport = el.querySelector<HTMLDivElement>('[data-slot="scroll-area-viewport"]')
                  if (viewport) scrollViewportRef.current = viewport
                }
              }}
              className="flex-1 min-h-0 px-3 py-3 sm:px-4 sm:py-4"
            >
              <div className="space-y-3 sm:space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-2 sm:gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="flex-shrink-0">
                        <img
                          src="/suta-avatar.jpg"
                          alt="SUTA"
                          className="h-7 w-7 rounded-full object-cover sm:h-8 sm:w-8"
                        />
                      </div>
                    ) : (
                      <div className="flex-shrink-0 h-7 w-7 rounded-full bg-neutral-200 flex items-center justify-center sm:h-8 sm:w-8">
                        <span className="text-[10px] font-medium text-neutral-600 sm:text-xs">Vous</span>
                      </div>
                    )}

                    <div
                      className={`max-w-[82%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed sm:max-w-[80%] sm:px-4 sm:py-2.5 sm:text-sm ${
                        msg.role === 'user'
                          ? 'bg-[#FF6C2F] text-white rounded-tr-sm'
                          : 'bg-neutral-100 text-neutral-800 rounded-tl-sm'
                      } ${msg.partial ? 'opacity-80' : ''}`}
                    >
                      <div className="whitespace-pre-wrap break-words">
                        {msg.content.split(/(\*\*.*?\*\*)/).map((part, i) => {
                          if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={i}>{part.slice(2, -2)}</strong>
                          }
                          return <span key={i}>{part}</span>
                        })}
                        {msg.partial && (
                          <span className="inline-block w-1.5 h-4 bg-[#FF6C2F] ml-0.5 animate-pulse rounded-sm align-text-bottom" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {isLoading && messages.filter(m => m.role === 'assistant' && m.partial).length === 0 && (
                  <div className="flex gap-2 sm:gap-2.5">
                    <img
                      src="/suta-avatar.jpg"
                      alt="SUTA"
                      className="h-7 w-7 rounded-full object-cover flex-shrink-0 sm:h-8 sm:w-8"
                    />
                    <div className="bg-neutral-100 rounded-2xl rounded-tl-sm px-3 py-2.5 sm:px-4 sm:py-3">
                      <div className="flex gap-1 sm:gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce sm:h-2 sm:w-2" style={{ animationDelay: '0ms' }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce sm:h-2 sm:w-2" style={{ animationDelay: '150ms' }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce sm:h-2 sm:w-2" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {showSuggestions && messages.length <= 1 && (
                <div className="mt-3 space-y-1.5 sm:mt-4 sm:space-y-2">
                  <p className="text-[11px] text-neutral-500 font-medium px-0.5 sm:text-xs">Suggestions :</p>
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => sendMessage(suggestion)}
                      className="w-full text-left rounded-xl border border-neutral-200 bg-white px-2.5 py-1.5 text-[13px] text-neutral-700 hover:border-[#FF6C2F]/40 hover:bg-[#FF6C2F]/5 transition-colors sm:px-3 sm:py-2 sm:text-sm"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <form onSubmit={handleSubmit} className="border-t border-neutral-200 px-3 py-2 sm:px-4 sm:py-3">
              <div className="flex items-center gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Posez votre question..."
                  disabled={isLoading}
                  className="flex-1 rounded-full border-neutral-200 bg-neutral-50 text-[13px] focus:border-[#FF6C2F] focus:ring-[#FF6C2F]/20 sm:text-sm"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || isLoading}
                  className="h-9 w-9 rounded-full bg-[#FF6C2F] hover:bg-[#e85f26] text-white flex-shrink-0 sm:h-10 sm:w-10"
                >
                  <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
