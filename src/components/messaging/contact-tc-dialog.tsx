'use client'

import { useCallback, useState } from 'react'
import { Send, MessageSquare, ShieldCheck, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch } from '@/lib/auth-fetch'
import { toast } from 'sonner'

interface ContactTcDialogProps {
  trigger?: React.ReactNode
  onMessageSent?: (conversationId: string) => void
}

export function ContactTcDialog({ trigger, onMessageSent }: ContactTcDialogProps) {
  const { isAuthenticated } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = useCallback(async () => {
    if (!message.trim() || sending) return

    setSending(true)
    try {
      const data = await authFetch<{
        message: { id: string }
        conversation: { id: string }
      }>('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactTc: true,
          content: message.trim(),
        }),
      })

      toast.success('Message envoyé au Tiers de Confiance')
      setMessage('')
      setOpen(false)
      onMessageSent?.(data.conversation.id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'envoi")
    } finally {
      setSending(false)
    }
  }, [message, sending, onMessageSent])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50">
            <ShieldCheck className="size-4" />
            Contacter le Tiers de Confiance
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-50">
              <ShieldCheck className="size-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle>Contacter le Tiers de Confiance</DialogTitle>
              <DialogDescription>
                Le Tiers de Confiance est votre intermédiaire pour toute question relative à vos locations.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-sm text-blue-700">
            <p className="font-medium mb-1">💡 À qui s'adresse ce message ?</p>
            <ul className="space-y-1 text-xs text-blue-600">
              <li>• Questions sur votre dossier ou votre bail</li>
              <li>• Problèmes avec un paiement</li>
              <li>• Demandes d&apos;information générale</li>
              <li>• Signalement d&apos;un problème</li>
            </ul>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Votre message</label>
            <Textarea
              placeholder="Décrivez votre demande en quelques mots..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={sending}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Envoyer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
