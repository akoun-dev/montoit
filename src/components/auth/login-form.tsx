'use client'

import { useState } from 'react'
import { Phone, Mail, ArrowRight, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore, type AuthMethod } from '@/lib/auth-store'
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
  const [authMethod, setAuthMethod] = useState<AuthMethod>('sms')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const { login, isLoading, setView, seedData } = useAuthStore()

  const identifier = authMethod === 'sms' ? phone : email

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!identifier.trim()) {
      toast.error(authMethod === 'sms' ? 'Veuillez entrer votre numéro de téléphone' : 'Veuillez entrer votre adresse email')
      return
    }
    try {
      await login(identifier.trim(), authMethod)
      toast.success(authMethod === 'sms' ? 'Code OTP envoyé par SMS ! (Code démo : 123456)' : 'Code OTP envoyé par email ! (Code démo : 123456)')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'envoi')
    }
  }

  const handleDemoLogin = async (demoPhone: string) => {
    setAuthMethod('sms')
    setPhone(demoPhone)
    try {
      await login(demoPhone, 'sms')
      toast.success('Code OTP envoyé par SMS ! (Code démo : 123456)')
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
              {authMethod === 'sms' ? (
                <Phone className="size-6 text-brand-500" />
              ) : (
                <Mail className="size-6 text-brand-500" />
              )}
            </div>
            <CardTitle className="text-2xl font-bold text-neutral-900">Connexion</CardTitle>
            <CardDescription className="text-neutral-500">
              {authMethod === 'sms'
                ? 'Entrez votre numéro de téléphone pour recevoir un code OTP'
                : 'Entrez votre adresse email pour recevoir un code OTP'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Auth Method Toggle */}
            <div className="flex rounded-lg border border-neutral-200 p-1 bg-neutral-50">
              <button
                type="button"
                onClick={() => setAuthMethod('sms')}
                className={`flex-1 flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium transition-all ${
                  authMethod === 'sms'
                    ? 'bg-white text-brand-500 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                <Phone className="size-4" />
                SMS
              </button>
              <button
                type="button"
                onClick={() => setAuthMethod('email')}
                className={`flex-1 flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium transition-all ${
                  authMethod === 'email'
                    ? 'bg-white text-brand-500 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                <Mail className="size-4" />
                Email
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {authMethod === 'sms' ? (
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
              ) : (
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-neutral-700">
                    Adresse email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre@email.ci"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 text-lg"
                    disabled={isLoading}
                  />
                </div>
              )}
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
