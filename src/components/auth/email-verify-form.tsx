'use client'

import { useState, useEffect, useCallback } from 'react'
import { MailCheck, ArrowLeft, RotateCcw, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useAuthStore, type OtpPurpose } from '@/lib/auth-store'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

const RESEND_COOLDOWN = 60

export function EmailVerifyForm() {
  const [code, setCode] = useState('')
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN)
  const [isResending, setIsResending] = useState(false)
  const {
    verifyEmailOtp,
    sendEmailOtp,
    pendingEmail,
    otpPurpose,
    isLoading,
    setView,
  } = useAuthStore()

  const purposeLabels: Record<OtpPurpose, string> = {
    login: 'connexion',
    email_verify: 'vérification',
    password_reset: 'réinitialisation',
  }

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim() || code.length < 6) {
      toast.error('Veuillez entrer le code complet à 6 chiffres')
      return
    }
    try {
      const result = await verifyEmailOtp(pendingEmail, code.trim(), otpPurpose)

      if (otpPurpose === 'password_reset' && result?.valid) {
        toast.success('Code vérifié ! Vous pouvez réinitialiser votre mot de passe.')
        setView('forgot-password')
        return
      }

      if (result?.needsRegistration) {
        toast.success('Email vérifié ! Complétez votre inscription.')
        return
      }

      toast.success('Email vérifié avec succès !')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Code invalide')
    }
  }

  const handleResend = useCallback(async () => {
    if (cooldown > 0 || isResending) return
    setIsResending(true)
    try {
      await sendEmailOtp(pendingEmail, otpPurpose)
      toast.success('Nouveau code envoyé par email !')
      setCooldown(RESEND_COOLDOWN)
    } catch (error) {
      toast.error('Erreur lors du renvoi')
    } finally {
      setIsResending(false)
    }
  }, [cooldown, isResending, pendingEmail, otpPurpose, sendEmailOtp])

  const formatCooldown = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
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
              <MailCheck className="size-6 text-brand-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-neutral-900">
              {otpPurpose === 'password_reset' ? 'Réinitialisation' : 'Vérification Email'}
            </CardTitle>
            <CardDescription className="text-neutral-500">
              Entrez le code de {purposeLabels[otpPurpose]} envoyé à{' '}
              <span className="font-semibold text-neutral-700">{pendingEmail}</span>
            </CardDescription>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <Mail className="size-3.5 text-brand-500" />
              <span className="text-xs text-brand-500 font-medium">Envoyé par email</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-otp-code">Code de vérification</Label>
                <Input
                  id="email-otp-code"
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
              </div>
              <Button
                type="submit"
                className="w-full h-11 bg-brand-500 hover:bg-brand-600 text-white text-base font-semibold"
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
                disabled={cooldown > 0 || isResending}
                className={`flex items-center gap-1.5 text-sm transition-colors ${
                  cooldown > 0 || isResending
                    ? 'text-neutral-400 cursor-not-allowed'
                    : 'text-brand-600 hover:text-brand-700'
                }`}
              >
                <RotateCcw className={`size-3.5 ${isResending ? 'animate-spin' : ''}`} />
                {cooldown > 0
                  ? `Renvoyer dans ${formatCooldown(cooldown)}`
                  : isResending
                    ? 'Envoi en cours...'
                    : 'Renvoyer le code'
                }
              </button>
            </div>

            <button
              onClick={() => {
                if (otpPurpose === 'password_reset') {
                  setView('forgot-password')
                } else {
                  setView('login')
                }
              }}
              className="w-full flex items-center justify-center gap-1 text-sm text-neutral-500 hover:text-neutral-700"
            >
              <ArrowLeft className="size-3.5" />
              Changer l&apos;email
            </button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
