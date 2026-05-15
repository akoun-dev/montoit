'use client'

import { useState } from 'react'
import { UserPlus, ArrowLeft, Mail, Lock, Eye, EyeOff, Phone, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthStore } from '@/lib/auth-store'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

const passwordRules = [
  { label: 'Au moins 8 caractères', test: (p: string) => p.length >= 8 },
  { label: 'Une majuscule', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Une minuscule', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Un chiffre', test: (p: string) => /[0-9]/.test(p) },
]

export function RegisterForm() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [role, setRole] = useState('LOCATAIRE')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const { register, isLoading, setView } = useAuthStore()

  const passwordStrength = passwordRules.filter((r) => r.test(password)).length
  const passwordsMatch = password && confirmPassword && password === confirmPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Veuillez remplir le prénom et le nom')
      return
    }
    if (!email.trim()) {
      toast.error('Veuillez entrer votre adresse email')
      return
    }
    if (passwordStrength < 4) {
      toast.error('Le mot de passe ne respecte pas les critères requis')
      return
    }
    if (!passwordsMatch) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    if (!acceptTerms) {
      toast.error('Veuillez accepter les conditions d\'utilisation')
      return
    }
    try {
      await register({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        role,
      })
      toast.success('Inscription réussie ! Bienvenue sur Mon Toit.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'inscription')
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
              <UserPlus className="size-6 text-brand-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-neutral-900">Inscription</CardTitle>
            <CardDescription className="text-neutral-500">
              Créez votre compte pour rejoindre Mon Toit
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="reg-firstName">Prénom *</Label>
                  <Input
                    id="reg-firstName"
                    placeholder="Prénom"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-lastName">Nom *</Label>
                  <Input
                    id="reg-lastName"
                    placeholder="Nom"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="reg-email">Adresse email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
                  <Input
                    id="reg-email"
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

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="reg-phone">Téléphone (optionnel)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
                  <Input
                    id="reg-phone"
                    type="tel"
                    placeholder="+225 XX XX XX XX XX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-11 pl-9"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="reg-password">Mot de passe *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
                  <Input
                    id="reg-password"
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
                {/* Password strength indicator */}
                {password && (
                  <div className="space-y-1.5">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            passwordStrength >= level
                              ? passwordStrength <= 1
                                ? 'bg-red-400'
                                : passwordStrength <= 2
                                  ? 'bg-amber-400'
                                  : passwordStrength <= 3
                                    ? 'bg-yellow-400'
                                    : 'bg-emerald-500'
                              : 'bg-neutral-200'
                          }`}
                        />
                      ))}
                    </div>
                    <ul className="space-y-0.5">
                      {passwordRules.map((rule) => (
                        <li
                          key={rule.label}
                          className={`flex items-center gap-1.5 text-xs transition-colors ${
                            rule.test(password) ? 'text-emerald-600' : 'text-neutral-400'
                          }`}
                        >
                          <Check className={`size-3 ${rule.test(password) ? 'opacity-100' : 'opacity-0'}`} />
                          {rule.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div className="space-y-2">
                <Label htmlFor="reg-confirm">Confirmer le mot de passe *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
                  <Input
                    id="reg-confirm"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`h-11 pl-9 pr-10 ${
                      confirmPassword && !passwordsMatch
                        ? 'border-red-300 focus-visible:border-red-500 focus-visible:ring-red-500/30'
                        : confirmPassword && passwordsMatch
                          ? 'border-emerald-300 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/30'
                          : ''
                    }`}
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    aria-label={showConfirm ? 'Masquer' : 'Afficher'}
                  >
                    {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {confirmPassword && !passwordsMatch && (
                  <p className="text-xs text-red-500">Les mots de passe ne correspondent pas</p>
                )}
                {confirmPassword && passwordsMatch && (
                  <p className="text-xs text-emerald-600">Les mots de passe correspondent</p>
                )}
              </div>

              {/* Role */}
              <div className="space-y-2">
                <Label htmlFor="reg-role">Rôle</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger id="reg-role" className="h-11">
                    <SelectValue placeholder="Choisir un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOCATAIRE">Locataire</SelectItem>
                    <SelectItem value="PROPRIETAIRE">Propriétaire</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Terms */}
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="accept-terms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1 size-4 rounded border-neutral-300 text-brand-500 focus:ring-brand-500"
                />
                <Label htmlFor="accept-terms" className="text-sm text-neutral-600 font-normal leading-snug cursor-pointer">
                  J&apos;accepte les{' '}
                  <span className="text-brand-500 hover:underline cursor-pointer">conditions d&apos;utilisation</span>{' '}
                  et la{' '}
                  <span className="text-brand-500 hover:underline cursor-pointer">politique de confidentialité</span>
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
                    Inscription...
                  </span>
                ) : (
                  'Créer mon compte'
                )}
              </Button>
            </form>

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
