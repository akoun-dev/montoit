'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Loader2, CheckCircle2, Phone, RefreshCw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authFetch } from '@/lib/auth-fetch'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────────
type PaymentMethod = 'ORANGE_MONEY' | 'MTN_MOMO' | 'MOOV_MONEY' | 'WAVE'

interface PaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payment: {
    id: string
    amount: number
    dueDate: string
    lease: {
      property: { title: string }
      owner: { firstName: string; lastName: string }
    }
  } | null
  onSuccess: () => void
}

interface OperatorInfo {
  id: PaymentMethod
  name: string
  description: string
  logo: string
  color: string
  selectedColor: string
}

// ─── Operator config ────────────────────────────────────────────────────────
const operators: OperatorInfo[] = [
  {
    id: 'ORANGE_MONEY',
    name: 'Orange Money',
    description: 'Paiement via Orange Money',
    logo: '/payment-operators/orange-money-logo.webp',
    color: 'border-orange-200 hover:border-orange-400 hover:bg-orange-50/50',
    selectedColor: 'border-orange-500 bg-orange-50 ring-2 ring-orange-500/20',
  },
  {
    id: 'MTN_MOMO',
    name: 'MTN MoMo',
    description: 'Paiement via MTN Mobile Money',
    logo: '/payment-operators/mtn-momo-logo.webp',
    color: 'border-yellow-200 hover:border-yellow-400 hover:bg-yellow-50/50',
    selectedColor: 'border-yellow-500 bg-yellow-50 ring-2 ring-yellow-500/20',
  },
  {
    id: 'MOOV_MONEY',
    name: 'Moov Money',
    description: 'Paiement via Moov Money',
    logo: '/payment-operators/moov-money-logo.webp',
    color: 'border-sky-200 hover:border-sky-400 hover:bg-sky-50/50',
    selectedColor: 'border-sky-500 bg-sky-50 ring-2 ring-sky-500/20',
  },
  {
    id: 'WAVE',
    name: 'Wave',
    description: 'Paiement via Wave',
    logo: '/payment-operators/wave-logo.png',
    color: 'border-teal-200 hover:border-teal-400 hover:bg-teal-50/50',
    selectedColor: 'border-teal-500 bg-teal-50 ring-2 ring-teal-500/20',
  },
]

function formatCurrency(amount: number): string {
  return amount.toLocaleString('fr-FR') + ' FCFA'
}

// ─── Component ──────────────────────────────────────────────────────────────
export function PaymentDialog({ open, onOpenChange, payment, onSuccess }: PaymentDialogProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [selectedOperator, setSelectedOperator] = useState<OperatorInfo | null>(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentReference, setPaymentReference] = useState<string | null>(null)
  const [pollTimedOut, setPollTimedOut] = useState(false)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep(1)
      setSelectedOperator(null)
      setPhoneNumber('')
      setPhoneError('')
      setIsSubmitting(false)
      setPaymentReference(null)
      setPollTimedOut(false)
    }
    return () => {
      clearPolling()
    }
  }, [open])

  const clearPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current)
      pollTimeoutRef.current = null
    }
  }, [])

  // Validate phone number (10 digits)
  const isPhoneValid = phoneNumber.replace(/\s/g, '').length === 10

  const handleSelectOperator = (operator: OperatorInfo) => {
    setSelectedOperator(operator)
    setStep(2)
  }

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 10)
    setPhoneNumber(cleaned)
    setPhoneError('')
  }

  const handleConfirmPayment = async () => {
    if (!selectedOperator || !payment || !isPhoneValid) return

    const cleanedPhone = phoneNumber.replace(/\s/g, '')
    setIsSubmitting(true)

    try {
      const result = await authFetch<{ reference: string }>('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: payment.id,
          method: selectedOperator.id,
          phoneNumber: `+225${cleanedPhone}`,
        }),
      })

      setPaymentReference(result.reference || null)
      setStep(3)
      startPolling()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'initiation du paiement')
    } finally {
      setIsSubmitting(false)
    }
  }

  const startPolling = useCallback(() => {
    if (!payment) return

    setPollTimedOut(false)

    // Poll every 5 seconds
    pollIntervalRef.current = setInterval(async () => {
      try {
        const result = await authFetch<{ data: { status: string; reference: string | null } }>(`/api/payments/${payment.id}`)
        if (result.data?.status === 'PAID') {
          clearPolling()
          setPaymentReference(result.data.reference || paymentReference)
          setStep(4)
          toast.success('Paiement confirmé !')
        }
      } catch {
        // Silently continue polling
      }
    }, 5000)

    // Timeout after 2 minutes
    pollTimeoutRef.current = setTimeout(() => {
      clearPolling()
      setPollTimedOut(true)
    }, 120000)
  }, [payment, paymentReference, clearPolling])

  const handleManualCheck = async () => {
    if (!payment) return
    try {
      const result = await authFetch<{ data: { status: string; reference: string | null } }>(`/api/payments/${payment.id}`)
      if (result.data?.status === 'PAID') {
        setPaymentReference(result.data.reference || paymentReference)
        setStep(4)
        toast.success('Paiement confirmé !')
      } else {
        toast.info('Le paiement n\'est pas encore confirmé. Veuillez réessayer.')
      }
    } catch {
      toast.error('Erreur lors de la vérification du statut')
    }
  }

  const handleClose = () => {
    clearPolling()
    if (step === 4) {
      onSuccess()
    }
    onOpenChange(false)
  }

  if (!payment) return null

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="sm:max-w-md" showCloseButton={step !== 3}>
        <AnimatePresence mode="wait">
          {/* Step 1: Select Operator */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <DialogHeader>
                <DialogTitle>Choisir l&apos;opérateur</DialogTitle>
                <DialogDescription>
                  Sélectionnez votre opérateur de paiement mobile pour {formatCurrency(payment.amount)}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3 mt-4">
                {operators.map((operator) => {
                  const isSelected = selectedOperator?.id === operator.id
                  return (
                    <button
                      key={operator.id}
                      onClick={() => handleSelectOperator(operator)}
                      className={cn(
                        'relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all cursor-pointer',
                        isSelected ? operator.selectedColor : operator.color
                      )}
                    >
                      {/* Radio indicator */}
                      <div className={cn(
                        'absolute top-2 right-2 size-5 rounded-full border-2 flex items-center justify-center transition-colors',
                        isSelected
                          ? 'border-foreground bg-foreground'
                          : 'border-muted-foreground/40 bg-background'
                      )}>
                        {isSelected && (
                          <div className="size-2 rounded-full bg-white" />
                        )}
                      </div>
                      <img
                        src={operator.logo}
                        alt={`Logo ${operator.name}`}
                        className="size-14 sm:size-16 object-contain"
                      />
                      <span className="text-sm font-medium text-foreground">{operator.name}</span>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* Step 2: Enter Phone Number */}
          {step === 2 && selectedOperator && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <DialogHeader>
                <DialogTitle>Paiement {selectedOperator.name}</DialogTitle>
                <DialogDescription>
                  Entrez votre numéro de téléphone pour confirmer le paiement
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Selected operator badge */}
                <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
                  <img
                    src={selectedOperator.logo}
                    alt={`Logo ${selectedOperator.name}`}
                    className="size-10 object-contain"
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">{selectedOperator.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedOperator.description}</p>
                  </div>
                </div>

                {/* Phone number input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Numéro de téléphone</label>
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground shrink-0">
                      +225
                    </div>
                    <Input
                      type="tel"
                      placeholder="07 00 00 00 00"
                      value={phoneNumber}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      maxLength={12}
                      className="flex-1"
                    />
                  </div>
                  {phoneError && (
                    <p className="text-xs text-red-500">{phoneError}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Entrez les 10 chiffres de votre numéro
                  </p>
                </div>

                {/* Amount display */}
                <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
                  <span className="text-sm text-muted-foreground">Montant à payer</span>
                  <span className="text-lg font-bold text-foreground">{formatCurrency(payment.amount)}</span>
                </div>

                {/* Property info */}
                <div className="text-xs text-muted-foreground">
                  Pour : {payment.lease.property.title} — {payment.lease.owner.firstName} {payment.lease.owner.lastName}
                </div>
              </div>

              <DialogFooter className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={isSubmitting}
                >
                  Retour
                </Button>
                <Button
                  onClick={handleConfirmPayment}
                  disabled={!isPhoneValid || isSubmitting}
                  className="gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Traitement...
                    </>
                  ) : (
                    <>
                      <Phone className="size-4" />
                      Confirmer le paiement
                    </>
                  )}
                </Button>
              </DialogFooter>
            </motion.div>
          )}

          {/* Step 3: Processing */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="py-6"
            >
              <DialogHeader className="items-center text-center">
                <DialogTitle className="sr-only">Paiement en cours</DialogTitle>
                <DialogDescription className="sr-only">
                  Votre paiement est en cours de traitement
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col items-center text-center space-y-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <Loader2 className="size-12 text-brand-500" />
                </motion.div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Paiement en cours de traitement...
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Veuillez valider le paiement sur votre téléphone
                  </p>
                </div>

                <div className="rounded-lg border bg-muted/50 px-4 py-2">
                  <p className="text-sm text-muted-foreground">Montant</p>
                  <p className="text-lg font-bold text-foreground">{formatCurrency(payment.amount)}</p>
                </div>

                {pollTimedOut && (
                  <div className="space-y-2 w-full">
                    <p className="text-sm text-amber-600">
                      Le paiement prend plus de temps que prévu.
                    </p>
                    <Button
                      variant="outline"
                      onClick={handleManualCheck}
                      className="gap-2 w-full"
                    >
                      <RefreshCw className="size-4" />
                      Vérifier le statut
                    </Button>
                  </div>
                )}

                {!pollTimedOut && (
                  <p className="text-xs text-muted-foreground">
                    Vérification automatique en cours...
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="py-6"
            >
              <DialogHeader className="items-center text-center">
                <DialogTitle className="sr-only">Paiement confirmé</DialogTitle>
                <DialogDescription className="sr-only">
                  Votre paiement a été confirmé avec succès
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col items-center text-center space-y-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                >
                  <CheckCircle2 className="size-16 text-emerald-500" />
                </motion.div>

                <div>
                  <h3 className="text-xl font-semibold text-foreground">
                    Paiement confirmé !
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Votre paiement de loyer a été effectué avec succès
                  </p>
                </div>

                <div className="rounded-lg border bg-emerald-50 px-4 py-3 space-y-1 w-full">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Montant</span>
                    <span className="font-bold text-foreground">{formatCurrency(payment.amount)}</span>
                  </div>
                  {paymentReference && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Référence</span>
                      <span className="font-mono font-medium text-foreground">{paymentReference}</span>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="mt-4">
                <Button onClick={handleClose} className="w-full">
                  Fermer
                </Button>
              </DialogFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
