'use client'

import { useState } from 'react'
import { Mail, Lock, Eye, EyeOff, ArrowRight, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuthStore } from '@/lib/auth-store'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

const demoAccounts = [
  { email: 'admin@montoit.ci', label: 'Admin', role: 'ADMIN' },
  { email: 'proprietaire@montoit.ci', label: 'Propriétaire (Kouadio)', role: 'PROPRIETAIRE' },
  { email: 'locataire@montoit.ci', label: 'Locataire (Moussa)', role: 'LOCATAIRE' },
]

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const { login, isLoading, setView, seedData } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
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
      await login(email.trim(), password)
      toast.success('Connexion réussie !')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la connexion')
    }
  }

  const handleDemoLogin = async (demoEmail: string) => {
    setEmail(demoEmail)
    setPassword('demo1234')
    try {
      await login(demoEmail, 'demo1234')
      toast.success('Connexion réussie !')
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
              <Lock className="size-6 text-brand-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-neutral-900">Connexion</CardTitle>
            <CardDescription className="text-neutral-500">
              Entrez vos identifiants pour accéder à votre compte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
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

              {/* Password */}
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
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
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

              {/* Submit */}
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
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {demoAccounts.map((demo) => (
                  <button
                    key={demo.email}
                    onClick={() => handleDemoLogin(demo.email)}
                    className="w-full flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2.5 text-sm hover:bg-brand-50 hover:border-brand-200 transition-colors"
                  >
                    <span className="text-neutral-700">{demo.label}</span>
                    <span className="text-neutral-400 text-xs truncate ml-2">{demo.email}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-neutral-400 mt-2 text-center">
                Mot de passe démo : <span className="font-mono">demo1234</span>
              </p>
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
