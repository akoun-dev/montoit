'use client'

import { useState } from 'react'
import { UserPlus, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthStore } from '@/lib/auth-store'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

export function RegisterForm() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('LOCATAIRE')
  const { register, phone, isLoading, setView } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }
    try {
      await register({
        phone,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        role,
      })
      toast.success('Inscription réussie ! Bienvenue sur Mon Toit.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'inscription')
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
              <UserPlus className="size-6 text-brand-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-neutral-900">Inscription</CardTitle>
            <CardDescription className="text-neutral-500">
              Complétez votre profil pour rejoindre Mon Toit
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom *</Label>
                  <Input
                    id="firstName"
                    placeholder="Prénom"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom *</Label>
                  <Input
                    id="lastName"
                    placeholder="Nom"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email (optionnel)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.ci"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone-display">Téléphone</Label>
                <Input
                  id="phone-display"
                  value={phone}
                  disabled
                  className="bg-neutral-50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Rôle</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOCATAIRE">Locataire</SelectItem>
                    <SelectItem value="PROPRIETAIRE">Propriétaire</SelectItem>
                    <SelectItem value="TIERS_CONFIANCE">Tiers de Confiance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-brand-500 hover:bg-brand-600 text-white text-base font-semibold"
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
