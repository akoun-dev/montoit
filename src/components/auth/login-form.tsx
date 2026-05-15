'use client'

import { useState } from 'react'
import { Phone, ArrowRight, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/lib/auth-store'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

const demoPhones = [
  { phone: '+22501010101', label: 'Admin', role: 'ADMIN' },
  { phone: '+22502020202', label: 'Tiers de Confiance', role: 'TC' },
  { phone: '+22503030303', label: 'Propriétaire (Kouadio)', role: 'PROPRIETAIRE' },
  { phone: '+22504040404', label: 'Propriétaire (Awa)', role: 'PROPRIETAIRE' },
  { phone: '+22505050505', label: 'Locataire (Moussa)', role: 'LOCATAIRE' },
  { phone: '+22506060606', label: 'Locataire (Fatou)', role: 'LOCATAIRE' },
  { phone: '+22507070707', label: 'Locataire (Jean)', role: 'LOCATAIRE' },
]

export function LoginForm() {
  const [phone, setPhone] = useState('')
  const { login, isLoading, setView, seedData } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone.trim()) {
      toast.error('Veuillez entrer votre numéro de téléphone')
      return
    }
    try {
      await login(phone.trim())
      toast.success('Code OTP envoyé ! (Code démo : 123456)')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'envoi')
    }
  }

  const handleDemoLogin = async (demoPhone: string) => {
    setPhone(demoPhone)
    try {
      await login(demoPhone)
      toast.success('Code OTP envoyé ! (Code démo : 123456)')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur')
    }
  }

  const handleSeed = async () => {
    try {
      await seedData()
      toast.success('Données de démonstration créées ! Vous pouvez maintenant vous connecter.')
    } catch {
      toast.error('Erreur lors de la création des données')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Card className="border-neutral-200 shadow-base">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-brand-50">
              <Phone className="size-6 text-brand-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-neutral-900">Connexion</CardTitle>
            <CardDescription className="text-neutral-500">
              Entrez votre numéro de téléphone pour recevoir un code OTP
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium text-neutral-700">
                  Numéro de téléphone
                </label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+225 XX XX XX XX XX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-12 text-lg"
                  disabled={isLoading}
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 bg-brand-500 hover:bg-brand-600 text-white text-base font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Envoi en cours...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Envoyer le code
                    <ArrowRight className="size-4" />
                  </span>
                )}
              </Button>
            </form>

            <button
              onClick={() => setView('register')}
              className="w-full text-center text-sm text-brand-600 hover:text-brand-700 hover:underline"
            >
              Pas encore de compte ? S&apos;inscrire
            </button>

            <div className="border-t border-neutral-200 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Info className="size-4 text-brand-500" />
                <span className="text-sm font-medium text-neutral-700">Comptes démo</span>
              </div>
              <p className="text-xs text-neutral-500 mb-3">
                Cliquez sur &quot;Initialiser les données&quot; puis sur un numéro pour vous connecter rapidement.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSeed}
                className="w-full mb-3 border-brand-200 text-brand-600 hover:bg-brand-50"
              >
                🔄 Initialiser les données de démo
              </Button>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {demoPhones.map((demo) => (
                  <button
                    key={demo.phone}
                    onClick={() => handleDemoLogin(demo.phone)}
                    className="w-full flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:bg-brand-50 hover:border-brand-200 transition-colors"
                  >
                    <span className="text-neutral-700">{demo.label}</span>
                    <span className="text-neutral-400 font-mono text-xs">{demo.phone}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setView('home')}
              className="w-full text-center text-sm text-neutral-500 hover:text-neutral-700"
            >
              ← Retour à l&apos;accueil
            </button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
