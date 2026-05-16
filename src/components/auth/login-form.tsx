'use client'

import { useState } from 'react'
import { Mail, Lock, Eye, EyeOff, ArrowRight, Phone, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuthStore, type AuthMethod } from '@/lib/auth-store'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import Image from 'next/image'

export function LoginForm() {
  const [method, setMethod] = useState<AuthMethod>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const { loginWithEmail, loginWithSms, isLoading, setView, setAuthMethod } = useAuthStore()

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
      const msg = error instanceof Error ? error.message : ''
      toast.error(msg || 'Erreur lors de la connexion')
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
      toast.success('Code OTP envoyé par SMS !')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'envoi')
    }
  }

  const handleForgotPassword = () => {
    setView('forgot-password')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8 sm:py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Card className="border-border shadow-base">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4">
              <Image
                src="/favicon-96x96.png"
                alt="Mon Toit"
                width={56}
                height={56}
                className="shrink-0 mx-auto"
                priority
              />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">Connexion</CardTitle>
            <CardDescription className="text-muted-foreground">
              {method === 'email'
                ? 'Entrez vos identifiants pour accéder à votre compte'
                : 'Recevez un code OTP par SMS sur votre téléphone'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Method toggle */}
            <div className="flex rounded-lg border border-border p-1 bg-muted">
              <button
                type="button"
                onClick={() => setMethod('email')}
                className={`flex-1 flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium transition-all ${
                  method === 'email'
                    ? 'bg-background text-brand-500 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
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
                    ? 'bg-background text-brand-500 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
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
                      onClick={handleForgotPassword}
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-muted-foreground"
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
                  <Label htmlFor="remember-me" className="text-sm text-muted-foreground cursor-pointer">
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

            {/* Back to home */}
            <button
              onClick={() => setView('home')}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
            >
              ← Retour à l&apos;accueil
            </button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
