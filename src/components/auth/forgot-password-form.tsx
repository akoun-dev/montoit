'use client'

import { useState } from 'react'
import { KeyRound, Mail, Phone, ArrowLeft, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/lib/auth-store'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

type ResetMethod = 'email' | 'sms'

export function ForgotPasswordForm() {
  const [method, setMethod] = useState<ResetMethod>('email')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [step, setStep] = useState<'request' | 'verify' | 'reset'>('request')
  const { forgotPassword, resetPassword, isLoading, setView, setAuthMethod } = useAuthStore()

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    const identifier = method === 'email' ? email.trim() : phone.trim()
    if (!identifier) {
      toast.error(method === 'email' ? 'Veuillez entrer votre email' : 'Veuillez entrer votre numéro')
      return
    }
    try {
      await forgotPassword(identifier, method)
      toast.success('Code de réinitialisation envoyé !')
      setStep('verify')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur')
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim() || code.length < 6) {
      toast.error('Veuillez entrer le code complet')
      return
    }
    // Code is verified client-side by the OTP form — move to reset step
    setStep('reset')
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    try {
      await resetPassword({
        email: method === 'email' ? email.trim() : undefined,
        phone: method === 'sms' ? phone.trim() : undefined,
        code: code.trim(),
        newPassword,
      })
      toast.success('Mot de passe réinitialisé ! Connectez-vous avec votre nouveau mot de passe.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur')
    }
  }

  const passwordRules = [
    { label: 'Au moins 8 caractères', test: (p: string) => p.length >= 8 },
    { label: 'Une majuscule', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'Une minuscule', test: (p: string) => /[a-z]/.test(p) },
    { label: 'Un chiffre', test: (p: string) => /[0-9]/.test(p) },
  ]
  const passwordStrength = passwordRules.filter((r) => r.test(newPassword)).length

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-8 sm:py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Card className="border-neutral-200 shadow-base">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-brand-50">
              <KeyRound className="size-6 text-brand-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-neutral-900">Mot de passe oublié</CardTitle>
            <CardDescription className="text-neutral-500">
              {step === 'request' && 'Entrez votre email ou numéro pour recevoir un code de réinitialisation'}
              {step === 'verify' && 'Entrez le code de vérification reçu'}
              {step === 'reset' && 'Créez votre nouveau mot de passe'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Step 1: Request reset */}
            {step === 'request' && (
              <form onSubmit={handleRequest} className="space-y-4">
                {/* Method toggle */}
                <div className="flex rounded-lg border border-neutral-200 p-1 bg-neutral-50">
                  <button
                    type="button"
                    onClick={() => setMethod('email')}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium transition-all ${
                      method === 'email' ? 'bg-white text-brand-500 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
                    }`}
                  >
                    <Mail className="size-4" />
                    Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod('sms')}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium transition-all ${
                      method === 'sms' ? 'bg-white text-brand-500 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
                    }`}
                  >
                    <Phone className="size-4" />
                    SMS
                  </button>
                </div>

                {method === 'email' ? (
                  <div className="space-y-2">
                    <Label htmlFor="fp-email">Adresse email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
                      <Input
                        id="fp-email"
                        type="email"
                        placeholder="votre@email.ci"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-11 pl-9"
                        disabled={isLoading}
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="fp-phone">Numéro de téléphone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
                      <Input
                        id="fp-phone"
                        type="tel"
                        placeholder="+225 XX XX XX XX XX"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="h-11 pl-9"
                        disabled={isLoading}
                        required
                      />
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 bg-brand-500 hover:bg-brand-600 text-white text-base font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Envoi en cours...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="size-4" />
                      Envoyer le code
                    </span>
                  )}
                </Button>
              </form>
            )}

            {/* Step 2: Verify OTP */}
            {step === 'verify' && (
              <form onSubmit={handleVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fp-code">Code de vérification</Label>
                  <Input
                    id="fp-code"
                    type="text"
                    placeholder="000000"
                    value={code}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                      setCode(val)
                    }}
                    className="h-14 text-center text-2xl tracking-[0.5em] font-mono"
                    maxLength={6}
                    disabled={isLoading}
                    autoFocus
                  />
                  <p className="text-xs text-neutral-400 text-center">
                    Code envoyé {method === 'email' ? `à ${email}` : `au ${phone}`}
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-brand-500 hover:bg-brand-600 text-white text-base font-semibold"
                  disabled={isLoading || code.length < 6}
                >
                  {isLoading ? 'Vérification...' : 'Vérifier le code'}
                </Button>

                <button
                  type="button"
                  onClick={() => setStep('request')}
                  className="w-full text-center text-sm text-neutral-500 hover:text-neutral-700"
                >
                  ← Retour
                </button>
              </form>
            )}

            {/* Step 3: Reset password */}
            {step === 'reset' && (
              <form onSubmit={handleReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fp-new-password">Nouveau mot de passe</Label>
                  <Input
                    id="fp-new-password"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-11"
                    disabled={isLoading}
                    required
                  />
                  {newPassword && (
                    <div className="space-y-1.5">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              passwordStrength >= level
                                ? passwordStrength <= 1 ? 'bg-red-400'
                                  : passwordStrength <= 2 ? 'bg-amber-400'
                                  : passwordStrength <= 3 ? 'bg-yellow-400'
                                  : 'bg-emerald-500'
                                : 'bg-neutral-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fp-confirm-password">Confirmer le mot de passe</Label>
                  <Input
                    id="fp-confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`h-11 ${
                      confirmPassword && newPassword !== confirmPassword
                        ? 'border-red-300 focus-visible:border-red-500'
                        : confirmPassword && newPassword === confirmPassword
                          ? 'border-emerald-300 focus-visible:border-emerald-500'
                          : ''
                    }`}
                    disabled={isLoading}
                    required
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-500">Les mots de passe ne correspondent pas</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-brand-500 hover:bg-brand-600 text-white text-base font-semibold"
                  disabled={isLoading || newPassword !== confirmPassword}
                >
                  {isLoading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
                </Button>
              </form>
            )}

            {/* Back to login */}
            <button
              onClick={() => setView('login')}
              className="w-full flex items-center justify-center gap-1 text-sm text-neutral-500 hover:text-neutral-700"
            >
              <ArrowLeft className="size-3.5" />
              Retour à la connexion
            </button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
