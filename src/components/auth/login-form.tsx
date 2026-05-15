'use client'

import { useState } from 'react'
import { Mail, Lock, Eye, EyeOff, ArrowRight, Info, Phone, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuthStore, type AuthMethod } from '@/lib/auth-store'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

const demoAccounts = [
  { email: 'admin@montoit.ci', phone: '+22501010101', label: 'Admin', role: 'ADMIN' },
  { email: 'proprietaire@montoit.ci', phone: '+22503030303', label: 'Propriétaire (Kouadio)', role: 'PROPRIETAIRE' },
  { email: 'locataire@montoit.ci', phone: '+22505050505', label: 'Locataire (Moussa)', role: 'LOCATAIRE' },
]

export function LoginForm() {
  const [method, setMethod] = useState<AuthMethod>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const { loginWithEmail, loginWithSms, isLoading, setView, setAuthMethod, seedData } = useAuthStore()

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error('Veuillez entrer votre adresse email')
      return
    }
    if (!password.trim()) {
      toast.error('Veuillez entrer votre mot de passe')
      return
    }
    try {
      await loginWithEmail(email.trim(), password)
      toast.success('Connexion réussie !')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la connexion')
    }
  }

  const handleSmsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone.trim()) {
      toast.error('Veuillez entrer votre numéro de téléphone')
      return
    }
    try {
      setAuthMethod('sms')
      await loginWithSms(phone.trim())
      toast.success('Code OTP envoyé par SMS ! (Code démo : 123456)')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'envoi')
    }
  }

  const handleDemoEmailLogin = async (demoEmail: string) => {
    setMethod('email')
    setEmail(demoEmail)
    setPassword('demo1234')
    try {
      await loginWithEmail(demoEmail, 'demo1234')
      toast.success('Connexion réussie !')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur')
    }
  }

  const handleDemoSmsLogin = async (demoPhone: string) => {
    setMethod('sms')
    setPhone(demoPhone)
    try {
      setAuthMethod('sms')
      await loginWithSms(demoPhone)
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
              {method === 'email' ? (
                <Mail className="size-6 text-brand-500" />
              ) : (
                <Phone className="size-6 text-brand-500" />
              )}
            </div>
            <CardTitle className="text-2xl font-bold text-neutral-900">Connexion</CardTitle>
            <CardDescription className="text-neutral-500">
              {method === 'email'
                ? 'Entrez vos identifiants pour accéder à votre compte'
                : 'Recevez un code OTP par SMS sur votre téléphone'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Method toggle */}
            <div className="flex rounded-lg border border-neutral-200 p-1 bg-neutral-50">
              <button
                type="button"
                onClick={() => setMethod('email')}
                className={`flex-1 flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium transition-all ${
                  method === 'email'
                    ? 'bg-white text-brand-500 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                <Mail className="size-4" />
                Email
              </button>
              <button
                type="button"
                onClick={() => setMethod('sms')}
                className={`flex-1 flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium transition-all ${
                  method === 'sms'
                    ? 'bg-white text-brand-500 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                <MessageSquare className="size-4" />
                SMS
              </button>
            </div>

            {/* Email + Password form */}
            {method === 'email' && (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Adresse email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
                    <Input
                      id="login-email"
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

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Mot de passe</Label>
                    <button
                      type="button"
                      className="text-xs text-brand-500 hover:text-brand-600 font-medium"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 pl-9 pr-10"
                      disabled={isLoading}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                      aria-label={showPassword ? 'Masquer' : 'Afficher'}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    className="data-[state=checked]:bg-brand-500 data-[state=checked]:border-brand-500"
                  />
                  <Label htmlFor="remember-me" className="text-sm text-neutral-600 cursor-pointer">
                    Se souvenir de moi
                  </Label>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-brand-500 hover:bg-brand-600 text-white text-base font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Connexion...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Se connecter
                      <ArrowRight className="size-4" />
                    </span>
                  )}
                </Button>
              </form>
            )}

            {/* SMS form */}
            {method === 'sms' && (
              <form onSubmit={handleSmsSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-phone">Numéro de téléphone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
                    <Input
                      id="login-phone"
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

                <p className="text-xs text-neutral-400 text-center">
                  Un code de vérification à 6 chiffres sera envoyé par SMS
                </p>

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
                      Envoyer le code
                      <ArrowRight className="size-4" />
                    </span>
                  )}
                </Button>
              </form>
            )}

            {/* Register link */}
            <button
              onClick={() => setView('register')}
              className="w-full text-center text-sm text-brand-600 hover:text-brand-700 hover:underline"
            >
              Pas encore de compte ? S&apos;inscrire
            </button>

            {/* Demo accounts */}
            <div className="border-t border-neutral-200 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Info className="size-4 text-brand-500" />
                <span className="text-sm font-medium text-neutral-700">Comptes démo</span>
              </div>
              <p className="text-xs text-neutral-500 mb-3">
                Cliquez sur &quot;Initialiser les données&quot; puis sur un compte pour vous connecter rapidement.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSeed}
                className="w-full mb-3 border-brand-200 text-brand-600 hover:bg-brand-50"
              >
                🔄 Initialiser les données de démo
              </Button>

              {/* Email demo */}
              <p className="text-xs font-medium text-neutral-500 mb-1.5">Par Email (mot de passe : demo1234)</p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 mb-3">
                {demoAccounts.map((demo) => (
                  <button
                    key={demo.email}
                    onClick={() => handleDemoEmailLogin(demo.email)}
                    className="w-full flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:bg-brand-50 hover:border-brand-200 transition-colors"
                  >
                    <span className="text-neutral-700">{demo.label}</span>
                    <span className="text-neutral-400 text-xs truncate ml-2">{demo.email}</span>
                  </button>
                ))}
              </div>

              {/* SMS demo */}
              <p className="text-xs font-medium text-neutral-500 mb-1.5">Par SMS (code OTP : 123456)</p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {demoAccounts.map((demo) => (
                  <button
                    key={demo.phone}
                    onClick={() => handleDemoSmsLogin(demo.phone)}
                    className="w-full flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:bg-brand-50 hover:border-brand-200 transition-colors"
                  >
                    <span className="text-neutral-700">{demo.label}</span>
                    <span className="text-neutral-400 text-xs font-mono truncate ml-2">{demo.phone}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Back to home */}
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
