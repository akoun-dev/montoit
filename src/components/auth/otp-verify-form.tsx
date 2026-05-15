'use client'

import { useState } from 'react'
import { ShieldCheck, ArrowLeft, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/lib/auth-store'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

export function OtpVerifyForm() {
  const [code, setCode] = useState('')
  const { verifyOtp, phone, isLoading, setView } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) {
      toast.error('Veuillez entrer le code OTP')
      return
    }
    try {
      const result = await verifyOtp(phone, code.trim())
      if (result.needsRegistration) {
        toast.info('Numéro non enregistré. Veuillez compléter votre inscription.')
      } else {
        toast.success('Connexion réussie !')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Code invalide')
    }
  }

  const handleResend = async () => {
    try {
      await useAuthStore.getState().login(phone)
      toast.success('Nouveau code OTP envoyé !')
    } catch (error) {
      toast.error('Erreur lors du renvoi')
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
              <ShieldCheck className="size-6 text-brand-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-neutral-900">Vérification OTP</CardTitle>
            <CardDescription className="text-neutral-500">
              Entrez le code envoyé au <span className="font-semibold text-neutral-700">{phone}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="otp" className="text-sm font-medium text-neutral-700">
                  Code de vérification
                </label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="h-14 text-center text-2xl tracking-[0.5em] font-mono"
                  maxLength={6}
                  disabled={isLoading}
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 bg-brand-500 hover:bg-brand-600 text-white text-base font-semibold"
                disabled={isLoading || code.length < 6}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Vérification...
                  </span>
                ) : (
                  'Vérifier'
                )}
              </Button>
            </form>

            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleResend}
                className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700"
              >
                <RotateCcw className="size-3.5" />
                Renvoyer le code
              </button>
            </div>

            <p className="text-center text-xs text-neutral-400">
              Code démo : 123456
            </p>

            <button
              onClick={() => setView('login')}
              className="w-full flex items-center justify-center gap-1 text-sm text-neutral-500 hover:text-neutral-700"
            >
              <ArrowLeft className="size-3.5" />
              Modifier le numéro
            </button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
