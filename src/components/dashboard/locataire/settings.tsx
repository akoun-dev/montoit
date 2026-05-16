'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Settings, User, Shield, Bell, Sliders, Mail, Phone, ShieldCheck,
  ChevronRight, CheckCircle2, XCircle, ScanFace, CreditCard, FileCheck,
  Save, Loader2, MapPin, Users, ArrowRight, Lightbulb, AlertTriangle,
  Info, RefreshCw, Eye, EyeOff, Monitor, Smartphone, Trash2, LogOut,
  Camera, Pencil, ArrowLeftRight, Building2,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { useAuthStore } from '@/lib/auth-store'
import { cn } from '@/lib/utils'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion, AnimatePresence } from 'framer-motion'

// ── Types ───────────────────────────────────────────────────────────────────

interface ProfileData {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  gender: string | null
  city: string | null
  address: string | null
  avatarUrl: string | null
  birthDate: string | null
  nni: string | null
  neofaceVerified: boolean
  neofaceVerifiedAt: string | null
  kycDocumentId: string | null
  oneciVerified: boolean
  oneciVerifiedAt: string | null
  isEmailVerified: boolean
  isPhoneVerified: boolean
  passwordUpdatedAt: string | null
  role: string
  createdAt: string
}

interface ProfileField {
  key: string
  label: string
  filled: boolean
}

interface ScoringBreakdown {
  profile: { score: number; max: number; weight: number; fields: ProfileField[] }
  neoface: { score: number; max: number; weight: number; verified: boolean; label: string; description: string }
  oneci: { score: number; max: number; weight: number; verified: boolean; label: string; description: string }
  rentalFile: { score: number; max: number; weight: number; approved: boolean; hasFile: boolean; label: string; description: string }
}

interface Recommendation {
  id: string
  title: string
  description: string
  impact: number
  action: string
  actionLabel: string
  completed: boolean
}

interface ScoringData {
  score: number
  status: 'approuve' | 'sous_conditions' | 'non_recommande'
  statusLabel: string
  statusColor: string
  breakdown: ScoringBreakdown
  recommendations: Recommendation[]
}

interface SessionInfo {
  id: string
  isCurrent: boolean
  createdAt: string
  expiresAt: string
}

interface NotificationPreferences {
  id: string
  messages: boolean
  dossierUpdates: boolean
  visitReminders: boolean
  paymentAlerts: boolean
  promotions: boolean
}

// ── Animations ──────────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

// ── Score Circle ────────────────────────────────────────────────────────────

function ScoreCircle({ score, statusColor, size = 'md' }: { score: number; statusColor: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = { sm: 20, md: 36, lg: 48 }
  const radius = sizeMap[size]
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const colorMap: Record<string, string> = { emerald: '#10b981', amber: '#f59e0b', red: '#ef4444' }
  const strokeColor = colorMap[statusColor] || '#ef4444'
  const viewBox = (radius + 8) * 2
  const center = viewBox / 2

  return (
    <div className={`relative shrink-0 ${size === 'lg' ? 'size-36' : size === 'md' ? 'size-24' : 'size-16'}`}>
      <svg className="size-full -rotate-90" viewBox={`0 0 ${viewBox} ${viewBox}`}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#f5f5f5" strokeWidth="6" />
        <circle
          cx={center} cy={center} r={radius} fill="none"
          stroke={strokeColor} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-bold text-foreground ${size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-lg' : 'text-xs'}`}>
          {score}
        </span>
        {size !== 'sm' && (
          <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">/100</span>
        )}
      </div>
    </div>
  )
}

// ── Score Component Card ────────────────────────────────────────────────────

function ScoreComponentCard({
  icon: Icon,
  label,
  weight,
  score,
  max,
  statusColor,
  details,
  actionLabel,
  onAction,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  weight: number
  score: number
  max: number
  statusColor: string
  details: string
  actionLabel?: string
  onAction?: () => void
}) {
  const percentage = max > 0 ? Math.round((score / max) * 100) : 0
  const isComplete = score >= max

  const barColor = isComplete ? 'bg-emerald-500' : score > 0 ? 'bg-amber-400' : 'bg-neutral-200'

  return (
    <Card className="border-border hover:border-border transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
            isComplete ? 'bg-emerald-50 text-emerald-600' : 'bg-muted text-muted-foreground'
          }`}>
            <Icon className="size-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-foreground">{label}</span>
              <span className={`text-xs font-bold ${isComplete ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                {score}/{max} pts
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2">{details}</p>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`h-full rounded-full ${barColor}`}
              />
            </div>
            <div className="flex items-center justify-between">
              <Badge className={`text-[10px] font-semibold px-2 py-0 border ${
                isComplete
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : score > 0
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-red-50 text-red-600 border-red-200'
              }`}>
                {isComplete ? (
                  <><CheckCircle2 className="size-3 mr-0.5" /> Complété</>
                ) : score > 0 ? (
                  <><AlertTriangle className="size-3 mr-0.5" /> En cours</>
                ) : (
                  <><XCircle className="size-3 mr-0.5" /> Non complété</>
                )}
              </Badge>
              <span className="text-[10px] font-medium text-muted-foreground">Poids : {weight}%</span>
            </div>
            {actionLabel && onAction && !isComplete && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2.5 w-full text-xs h-8 border-brand-200 text-brand-600 hover:bg-brand-50"
                onClick={onAction}
              >
                {actionLabel}
                <ArrowRight className="size-3 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Profile Field Row ───────────────────────────────────────────────────────

function ProfileFieldRow({ label, value, isFilled, fieldName }: {
  label: string
  value: string | null | undefined
  isFilled: boolean
  fieldName: string
}) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent transition-colors">
      <div className="flex items-center gap-2">
        {isFilled ? (
          <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
        ) : (
          <XCircle className="size-4 text-red-300 shrink-0" />
        )}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <span className={`text-xs font-medium ${isFilled ? 'text-foreground' : 'text-red-400'}`}>
        {isFilled ? (value || '✓') : 'Non renseigné'}
      </span>
    </div>
  )
}

// ── KYC Verification Modal ──────────────────────────────────────────────────

function KycVerificationModal({
  open,
  onOpenChange,
  profile,
  onVerified,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: ProfileData | null
  onVerified: () => void
}) {
  // KYC face verification state (NeoFace v2 flow)
  const [kycStep, setKycStep] = useState<'idle' | 'uploading' | 'selfie' | 'verifying' | 'done'>('idle')
  const [kycDocImage, setKycDocImage] = useState<string | null>(null)
  const [kycDocumentId, setKycDocumentId] = useState<string | null>(null)
  const [kycSelfieUrl, setKycSelfieUrl] = useState<string | null>(null)
  const [kycResult, setKycResult] = useState<{ verified: boolean; message: string } | null>(null)
  const [kycPollCount, setKycPollCount] = useState(0)
  const kycDocInputRef = useRef<HTMLInputElement>(null)
  const kycPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (open && !profile?.neofaceVerified) {
      setKycStep('idle')
      setKycDocImage(null)
      setKycDocumentId(null)
      setKycSelfieUrl(null)
      setKycResult(null)
      setKycPollCount(0)
    }
  }, [open, profile?.neofaceVerified])

  // Cleanup polling interval on unmount or close
  useEffect(() => {
    return () => {
      if (kycPollIntervalRef.current) {
        clearInterval(kycPollIntervalRef.current)
      }
    }
  }, [])

  // Stop polling when modal closes
  useEffect(() => {
    if (!open && kycPollIntervalRef.current) {
      clearInterval(kycPollIntervalRef.current)
      kycPollIntervalRef.current = null
      if (kycStep === 'verifying') {
        setKycStep('selfie')
      }
    }
  }, [open, kycStep])

  // ── KYC: Upload ID card document ──────────────────────────────────────────
  const handleKycDocUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Show preview
    const reader = new FileReader()
    reader.onload = (ev) => {
      setKycDocImage(ev.target?.result as string)
    }
    reader.readAsDataURL(file)
    e.target.value = ''

    // Upload to NeoFace
    setKycStep('uploading')
    setKycResult(null)

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          // Strip data URL prefix to get raw base64
          resolve(result.replace(/^data:image\/[a-z]+;base64,/, ''))
        }
        reader.readAsDataURL(file)
      })

      const result = await authFetch<{ documentId: string; selfieUrl: string }>('/api/kyc/face-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'upload', docFile: base64 }),
      })

      setKycDocumentId(result.documentId)
      setKycSelfieUrl(result.selfieUrl)
      setKycStep('selfie')
    } catch (err) {
      setKycResult({
        verified: false,
        message: err instanceof Error ? err.message : 'Erreur lors de l\'envoi du document',
      })
      setKycStep('idle')
    }
  }, [])

  // ── KYC: Open selfie URL in new window ────────────────────────────────────
  const handleKycOpenSelfie = useCallback(() => {
    if (!kycSelfieUrl) return
    window.open(kycSelfieUrl, '_blank', 'width=500,height=700')

    // Start polling after a short delay
    setKycStep('verifying')
    setKycPollCount(0)

    // Clear any existing polling
    if (kycPollIntervalRef.current) {
      clearInterval(kycPollIntervalRef.current)
    }

    let pollAttempts = 0
    const maxAttempts = 40 // 40 * 3s = 120s max

    kycPollIntervalRef.current = setInterval(async () => {
      pollAttempts++
      setKycPollCount(pollAttempts)

      if (pollAttempts > maxAttempts) {
        if (kycPollIntervalRef.current) clearInterval(kycPollIntervalRef.current)
        setKycResult({ verified: false, message: 'Délai de vérification dépassé. Veuillez réessayer.' })
        setKycStep('idle')
        return
      }

      try {
        const result = await authFetch<{ status: string; verified: boolean; message?: string; matchingScore?: number }>(
          '/api/kyc/face-auth',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'verify', documentId: kycDocumentId }),
          }
        )

        if (result.status === 'verified') {
          if (kycPollIntervalRef.current) clearInterval(kycPollIntervalRef.current)
          setKycResult({ verified: true, message: result.message || 'Vérification KYC réussie !' })
          setKycStep('done')
          onVerified()
        } else if (result.status === 'failed') {
          if (kycPollIntervalRef.current) clearInterval(kycPollIntervalRef.current)
          setKycResult({ verified: false, message: result.message || 'La vérification a échoué.' })
          setKycStep('idle')
        }
        // If "waiting", continue polling
      } catch {
        // Network error, continue polling
      }
    }, 3000)
  }, [kycSelfieUrl, kycDocumentId, onVerified])

  // ── KYC: Reset flow ──────────────────────────────────────────────────────
  const handleKycReset = useCallback(() => {
    if (kycPollIntervalRef.current) {
      clearInterval(kycPollIntervalRef.current)
    }
    setKycStep('idle')
    setKycDocImage(null)
    setKycDocumentId(null)
    setKycSelfieUrl(null)
    setKycResult(null)
    setKycPollCount(0)
  }, [])

  // Already verified state
  if (profile?.neofaceVerified) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanFace className="size-5 text-brand-500" />
              Vérification KYC
            </DialogTitle>
            <DialogDescription>
              Vérification d&apos;identité par reconnaissance faciale (+20% Trust Score)
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shrink-0">
                <CheckCircle2 className="size-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-700">Vérification KYC réussie</p>
                {profile.neofaceVerifiedAt && (
                  <p className="text-xs text-emerald-600 mt-0.5">
                    Vérifié le {new Date(profile.neofaceVerifiedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanFace className="size-5 text-brand-500" />
            Vérification KYC
          </DialogTitle>
          <DialogDescription>
            Vérification d&apos;identité par reconnaissance faciale (+20% Trust Score)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Step 1: Upload ID card */}
          {(kycStep === 'idle' || kycStep === 'uploading') && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Téléchargez une photo de votre pièce d&apos;identité (recto avec votre photo). KYC comparera votre visage en direct avec la photo du document.
              </p>

              {/* Upload area */}
              <div
                onClick={() => kycDocInputRef.current?.click()}
                className={`relative cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                  kycDocImage
                    ? 'border-brand-300 bg-brand-50/30'
                    : 'border-border hover:border-brand-400 hover:bg-brand-50/20'
                }`}
              >
                {kycDocImage ? (
                  <div className="space-y-2">
                    <img
                      src={kycDocImage}
                      alt="Aperçu du document"
                      className="mx-auto max-h-40 rounded-lg object-contain"
                    />
                    <p className="text-xs text-muted-foreground">Cliquer pour changer</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
                      <CreditCard className="size-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Télécharger le recto de votre CNI</p>
                    <p className="text-[11px] text-muted-foreground">JPG, PNG — max 10 Mo</p>
                  </div>
                )}
              </div>

              <input
                ref={kycDocInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                className="hidden"
                onChange={handleKycDocUpload}
              />

              {kycStep === 'uploading' && (
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Envoi du document en cours...
                </div>
              )}
            </div>
          )}

          {/* Step 2: Selfie link */}
          {kycStep === 'selfie' && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-brand-50 border border-brand-200">
                <p className="text-xs font-medium text-brand-700 mb-2">
                  ✅ Document envoyé avec succès
                </p>
                <p className="text-[11px] text-brand-600">
                  Cliquez sur le bouton ci-dessous pour ouvrir l&apos;interface de prise de selfie. L&apos;interface détectera votre visage en direct et vérifiera votre identité.
                </p>
              </div>

              <Button
                onClick={handleKycOpenSelfie}
                className="w-full h-11 bg-brand-500 hover:bg-brand-600 text-white"
              >
                <ScanFace className="size-4 mr-2" />
                Ouvrir la vérification faciale
              </Button>

              <Button
                onClick={handleKycReset}
                variant="outline"
                className="w-full h-9 text-xs border-border"
              >
                <RefreshCw className="size-3.5 mr-1.5" />
                Recommencer
              </Button>
            </div>
          )}

          {/* Step 3: Polling / Verifying */}
          {kycStep === 'verifying' && (
            <div className="space-y-3">
              <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-muted border border-border">
                <Loader2 className="size-8 animate-spin text-brand-500" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">Vérification en cours...</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Prenez votre selfie dans la fenêtre ouverte. Nous vérifions le résultat automatiquement.
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Tentative {kycPollCount}/40
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleKycOpenSelfie}
                  variant="outline"
                  className="flex-1 h-9 text-xs border-brand-200 text-brand-600 hover:bg-brand-50"
                >
                  <ScanFace className="size-3.5 mr-1.5" />
                  R&#39;ouvrir le selfie
                </Button>
                <Button
                  onClick={handleKycReset}
                  variant="outline"
                  className="flex-1 h-9 text-xs border-border"
                >
                  <XCircle className="size-3.5 mr-1.5" />
                  Annuler
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Done (success or failure) */}
          {kycStep === 'done' && kycResult && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl border ${
                kycResult.verified
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex size-10 items-center justify-center rounded-full shrink-0 ${
                  kycResult.verified ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'
                }`}>
                  {kycResult.verified ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${kycResult.verified ? 'text-emerald-700' : 'text-red-700'}`}>
                    {kycResult.verified ? 'Vérification KYC réussie !' : 'Vérification échouée'}
                  </p>
                  <p className={`text-xs mt-0.5 ${kycResult.verified ? 'text-emerald-600' : 'text-red-600'}`}>
                    {kycResult.message}
                  </p>
                </div>
              </div>
              {!kycResult.verified && (
                <Button
                  variant="link"
                  className="text-[11px] text-brand-500 p-0 h-auto mt-2"
                  onClick={handleKycReset}
                >
                  <RefreshCw className="size-3 mr-1" />
                  Réessayer
                </Button>
              )}
            </motion.div>
          )}

          {/* Error state (on idle) */}
          {kycStep === 'idle' && kycResult && !kycResult.verified && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-lg border bg-red-50 border-red-200"
            >
              <div className="flex items-start gap-2">
                <XCircle className="size-4 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-red-700">{kycResult.message}</p>
                  <Button
                    variant="link"
                    className="text-[11px] text-brand-500 p-0 h-auto mt-1"
                    onClick={() => { setKycResult(null) }}
                  >
                    <RefreshCw className="size-3 mr-1" />
                    Réessayer
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Settings Component ─────────────────────────────────────────────────

export function SettingsSection() {
  const { user, setDashboardSection, updateUser } = useAuthStore()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [scoring, setScoring] = useState<ScoringData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'profil' | 'scoring' | 'securite' | 'notifications'>('profil')

  // KYC modal state
  const [kycModalOpen, setKycModalOpen] = useState(false)

  // Form state
  const [formState, setFormState] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    gender: '',
    city: '',
    birthDate: '',
    nni: '',
  })

  // ONECI verification state
  const [oneciVerifying, setOneciVerifying] = useState(false)
  const [oneciResult, setOneciResult] = useState<{ verified: boolean; message: string; details?: string } | null>(null)

  // Security tab state
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)

  // Sessions state
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [revokingSessions, setRevokingSessions] = useState(false)

  // Notification preferences state
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences | null>(null)
  const [notifLoading, setNotifLoading] = useState(false)
  const [notifSaving, setNotifSaving] = useState<Record<string, boolean>>({})

  // Avatar upload state
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // Fetch profile & scoring data
  const fetchProfileAndScoring = useCallback(async () => {
    if (!user) return

    try {
      const [profileResult, scoringResult] = await Promise.allSettled([
        authFetch<{ user: ProfileData }>('/api/profile'),
        authFetch<ScoringData>('/api/scoring'),
      ])

      if (profileResult.status === 'fulfilled') {
        const p = profileResult.value.user
        setProfile(p)
        setFormState({
          firstName: p.firstName || '',
          lastName: p.lastName || '',
          phone: p.phone || '',
          gender: p.gender || '',
          city: p.city || '',
          birthDate: p.birthDate ? new Date(p.birthDate).toISOString().split('T')[0] : '',
          nni: p.nni || '',
        })
      }

      if (scoringResult.status === 'fulfilled') {
        setScoring(scoringResult.value)
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchProfileAndScoring()
  }, [fetchProfileAndScoring])

  // Auto-clear success message
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [success])

  // Auto-clear password success
  useEffect(() => {
    if (passwordSuccess) {
      const timer = setTimeout(() => setPasswordSuccess(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [passwordSuccess])

  // Fetch sessions when security tab is active
  useEffect(() => {
    if (activeTab === 'securite' && user) {
      setSessionsLoading(true)
      authFetch<{ sessions: SessionInfo[] }>('/api/settings/sessions')
        .then((data) => setSessions(data.sessions))
        .catch(() => {})
        .finally(() => setSessionsLoading(false))
    }
  }, [activeTab, user])

  // Fetch notification preferences when notifications tab is active
  useEffect(() => {
    if (activeTab === 'notifications' && user) {
      setNotifLoading(true)
      authFetch<{ preferences: NotificationPreferences }>('/api/settings/notifications')
        .then((data) => setNotifPrefs(data.preferences))
        .catch(() => {})
        .finally(() => setNotifLoading(false))
    }
  }, [activeTab, user])

  // Password change handler
  const handlePasswordChange = useCallback(async () => {
    setPasswordError(null)
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Tous les champs sont requis')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas')
      return
    }
    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setPasswordError('Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre')
      return
    }

    setPasswordSaving(true)
    try {
      await authFetch('/api/settings/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      setPasswordSuccess('Mot de passe mis à jour avec succès !')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      // Refresh profile to get updated passwordUpdatedAt
      try {
        const profileResult = await authFetch<{ user: ProfileData }>('/api/profile')
        setProfile(profileResult.user)
      } catch {}
      setTimeout(() => setPasswordModalOpen(false), 1500)
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Erreur lors du changement de mot de passe')
    } finally {
      setPasswordSaving(false)
    }
  }, [currentPassword, newPassword, confirmPassword])

  // Revoke other sessions handler
  const handleRevokeOtherSessions = useCallback(async () => {
    setRevokingSessions(true)
    try {
      await authFetch('/api/settings/sessions', { method: 'DELETE' })
      setSessions((prev) => prev.filter((s) => s.isCurrent))
    } catch {} finally {
      setRevokingSessions(false)
    }
  }, [])

  // Toggle notification preference
  const handleToggleNotif = useCallback(async (key: keyof NotificationPreferences, value: boolean) => {
    if (key === 'id') return
    setNotifSaving((prev) => ({ ...prev, [key]: true }))
    try {
      await authFetch('/api/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })
      setNotifPrefs((prev) => prev ? { ...prev, [key]: value } : prev)
    } catch {} finally {
      setNotifSaving((prev) => ({ ...prev, [key]: false }))
    }
  }, [])

  // ── KYC verified callback ────────────────────────────────────────────────
  const handleKycVerified = useCallback(async () => {
    setKycModalOpen(false)
    // Refresh profile and scoring
    try {
      const [profileResult, scoringResult] = await Promise.allSettled([
        authFetch<{ user: ProfileData }>('/api/profile'),
        authFetch<ScoringData>('/api/scoring'),
      ])
      if (profileResult.status === 'fulfilled') setProfile(profileResult.value.user)
      if (scoringResult.status === 'fulfilled') setScoring(scoringResult.value)
    } catch {}
  }, [])

  // ── Avatar upload handler ────────────────────────────────────────────────
  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    // Validate file type
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Format d\'image invalide. Utilisez JPG, PNG ou WEBP.')
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('L\'image est trop volumineuse (max 2 Mo).')
      return
    }

    setAvatarUploading(true)
    setError(null)

    try {
      // Resize image to 200x200 and convert to data URL
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const SIZE = 200
          canvas.width = SIZE
          canvas.height = SIZE

          const ctx = canvas.getContext('2d')
          if (!ctx) { reject(new Error('Canvas non supporté')); return }

          // Crop to square (center crop)
          const sourceSize = Math.min(img.width, img.height)
          const sx = (img.width - sourceSize) / 2
          const sy = (img.height - sourceSize) / 2

          ctx.drawImage(img, sx, sy, sourceSize, sourceSize, 0, 0, SIZE, SIZE)
          resolve(canvas.toDataURL('image/jpeg', 0.85))
        }
        img.onerror = () => reject(new Error('Impossible de charger l\'image'))
        img.src = URL.createObjectURL(file)
      })

      // Upload to server
      const result = await authFetch<{ user: { avatarUrl: string | null; id: string; firstName: string; lastName: string; email: string | null; phone: string | null; role: string; isActive: boolean; isEmailVerified: boolean } }>('/api/profile/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: dataUrl }),
      })

      // Update local state
      setProfile((prev) => prev ? { ...prev, avatarUrl: result.user.avatarUrl } : prev)
      updateUser({ avatarUrl: result.user.avatarUrl })
      setSuccess('Photo de profil mise à jour !')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement de la photo')
    } finally {
      setAvatarUploading(false)
    }
  }, [updateUser])

  // ── Avatar delete handler ────────────────────────────────────────────────
  const handleAvatarDelete = useCallback(async () => {
    setAvatarUploading(true)
    try {
      await authFetch('/api/profile/avatar', { method: 'DELETE' })
      setProfile((prev) => prev ? { ...prev, avatarUrl: null } : prev)
      updateUser({ avatarUrl: null })
      setSuccess('Photo de profil supprimée')
    } catch {
      setError('Erreur lors de la suppression de la photo')
    } finally {
      setAvatarUploading(false)
    }
  }, [updateUser])

  // Save profile
  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await authFetch<{ user: ProfileData }>('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formState),
      })

      setProfile(result.user)
      setSuccess('Profil mis à jour avec succès !')

      // Re-fetch scoring to reflect profile changes
      try {
        const scoringResult = await authFetch<ScoringData>('/api/scoring')
        setScoring(scoringResult)
      } catch {
        // Scoring refresh failed silently
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  // ONECI verification handler
  const handleOneciVerify = async () => {
    setOneciVerifying(true)
    setOneciResult(null)

    // First, save the profile if NNI or birthDate changed
    try {
      await authFetch<{ user: ProfileData }>('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nni: formState.nni,
          birthDate: formState.birthDate || null,
        }),
      })
    } catch {
      // Profile save might fail, but try verification anyway
    }

    try {
      const result = await authFetch<{ verified: boolean; message: string; details?: string; error?: string }>('/api/oneci/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nni: formState.nni,
          birthDate: formState.birthDate || null,
        }),
      })

      setOneciResult({
        verified: result.verified,
        message: result.verified ? result.message : (result.error || result.message),
        details: result.details,
      })

      // If verified, refresh profile and scoring
      if (result.verified) {
        const [profileResult, scoringResult] = await Promise.allSettled([
          authFetch<{ user: ProfileData }>('/api/profile'),
          authFetch<ScoringData>('/api/scoring'),
        ])
        if (profileResult.status === 'fulfilled') {
          setProfile(profileResult.value.user)
        }
        if (scoringResult.status === 'fulfilled') {
          setScoring(scoringResult.value)
        }
      }
    } catch (err) {
      setOneciResult({
        verified: false,
        message: err instanceof Error ? err.message : 'Erreur lors de la vérification ONECI',
      })
    } finally {
      setOneciVerifying(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const statusBadgeClass = scoring
    ? scoring.statusColor === 'emerald'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : scoring.statusColor === 'amber'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-red-50 text-red-700 border-red-200'
    : 'bg-muted text-muted-foreground border-border'

  // Scoring tab navigation items
  const tabs = [
    { id: 'profil' as const, label: 'Mon Profil', icon: User },
    { id: 'scoring' as const, label: 'Mon Score', icon: ShieldCheck },
    { id: 'securite' as const, label: 'Sécurité', icon: Shield },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
  ]

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>
        <p className="text-muted-foreground mt-1">Gérez votre compte et vos préférences</p>
      </motion.div>

      {/* User Info Card with integrated scoring */}
      <motion.div variants={itemVariants}>
        <Card className="border-border overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              {/* Avatar — clickable to upload */}
              <div className="relative shrink-0 group">
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="relative size-14 rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2"
                  title="Changer la photo de profil"
                >
                  {profile?.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt="Photo de profil"
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center bg-brand-50 text-brand-500">
                      <span className="text-lg font-bold">
                        {profile?.firstName?.charAt(0)?.toUpperCase() || user?.firstName?.charAt(0)?.toUpperCase() || 'U'}
                        {profile?.lastName?.charAt(0)?.toUpperCase() || user?.lastName?.charAt(0)?.toUpperCase() || ''}
                      </span>
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {avatarUploading ? (
                      <Loader2 className="size-5 animate-spin text-white" />
                    ) : (
                      <Camera className="size-5 text-white" />
                    )}
                  </div>
                </button>
                {/* Delete button */}
                {profile?.avatarUrl && !avatarUploading && (
                  <button
                    onClick={handleAvatarDelete}
                    className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600 transition-colors"
                    title="Supprimer la photo"
                  >
                    <Trash2 className="size-3" />
                  </button>
                )}
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-foreground truncate">
                  {profile?.firstName || user?.firstName} {profile?.lastName || user?.lastName}
                </h3>
                <div className="space-y-1 mt-1.5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="size-3.5 shrink-0" />
                    <span className="truncate">{profile?.email || user?.email || 'Non renseigné'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="size-3.5 shrink-0" />
                    <span>{profile?.phone || user?.phone || 'Non renseigné'}</span>
                  </div>
                </div>
              </div>
              {/* Trust Score circle */}
              {scoring && (
                <button
                  onClick={() => setActiveTab('scoring')}
                  className="flex flex-col items-center gap-1 shrink-0 group"
                >
                  <ScoreCircle score={scoring.score} statusColor={scoring.statusColor} size="md" />
                  <span className="text-[9px] font-medium text-muted-foreground group-hover:text-brand-500 transition-colors">
                    Trust Score
                  </span>
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div variants={itemVariants}>
        <div className="flex gap-1 p-1 bg-muted rounded-xl">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
                  isActive
                    ? 'bg-card text-brand-600 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </motion.div>

      {/* ── Tab Content ──────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {/* ── PROFIL TAB ────────────────────────────────────────────────── */}
        {activeTab === 'profil' && (
          <motion.div
            key="profil"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Profile completion summary */}
            {scoring && (
              <Card className="border-brand-100 bg-gradient-to-r from-brand-50/50 to-white overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-foreground">Complétion du profil</span>
                        <Badge className={`border text-[10px] font-semibold px-2 py-0 ${statusBadgeClass}`}>
                          {scoring.statusLabel}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        {scoring.breakdown.profile.score}/{scoring.breakdown.profile.max} points — Remplissez tous les champs pour maximiser votre score
                      </p>
                      <Progress
                        value={(scoring.breakdown.profile.score / scoring.breakdown.profile.max) * 100}
                        className="h-2"
                      />
                      <div className="flex gap-4 mt-2">
                        {scoring.breakdown.profile.fields.map((field) => (
                          <span key={field.key} className={`text-[10px] font-medium ${field.filled ? 'text-emerald-600' : 'text-red-400'}`}>
                            {field.filled ? '✓' : '✗'} {field.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Role Switch Card */}
            {(() => {
              const effectiveRole = user?.activeRole || user?.role
              const canSwitch = ['LOCATAIRE', 'PROPRIETAIRE', 'AGENCE'].includes(user?.role || '') || ['LOCATAIRE', 'PROPRIETAIRE', 'AGENCE'].includes(user?.activeRole || user?.role || '')
              if (!canSwitch) return null
              return (
                <Card className="border-border overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <ArrowLeftRight className="size-4 text-brand-500" />
                      Changer de rôle
                    </CardTitle>
                    <CardDescription>
                      Basculez entre le mode Locataire et Propriétaire selon vos besoins
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          try {
                            await useAuthStore.getState().switchRole('LOCATAIRE')
                            setSuccess('Mode Locataire activé')
                          } catch (err) {
                            setError(err instanceof Error ? err.message : 'Erreur')
                          }
                        }}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all',
                          effectiveRole === 'LOCATAIRE'
                            ? 'border-amber-300 bg-amber-50 text-amber-700'
                            : 'border-border text-muted-foreground hover:border-amber-200 hover:bg-amber-50/50'
                        )}
                      >
                        <User className="size-4" />
                        Locataire
                        {effectiveRole === 'LOCATAIRE' && (
                          <CheckCircle2 className="size-4 ml-1" />
                        )}
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await useAuthStore.getState().switchRole('PROPRIETAIRE')
                            setSuccess('Mode Propriétaire activé')
                          } catch (err) {
                            setError(err instanceof Error ? err.message : 'Erreur')
                          }
                        }}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all',
                          effectiveRole === 'PROPRIETAIRE'
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                            : 'border-border text-muted-foreground hover:border-emerald-200 hover:bg-emerald-50/50'
                        )}
                      >
                        <Building2 className="size-4" />
                        Propriétaire
                        {effectiveRole === 'PROPRIETAIRE' && (
                          <CheckCircle2 className="size-4 ml-1" />
                        )}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              )
            })()}

            {/* Profile Form */}
            <Card className="border-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <User className="size-4 text-brand-500" />
                  Informations personnelles
                </CardTitle>
                <CardDescription>Ces informations contribuent à votre Trust Score (5%)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* First Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName" className="text-xs font-medium text-foreground">
                      Prénom <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="firstName"
                      value={formState.firstName}
                      onChange={(e) => setFormState((prev) => ({ ...prev, firstName: e.target.value }))}
                      placeholder="Votre prénom"
                      className="h-9 text-sm"
                    />
                  </div>
                  {/* Last Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName" className="text-xs font-medium text-foreground">
                      Nom <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="lastName"
                      value={formState.lastName}
                      onChange={(e) => setFormState((prev) => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Votre nom"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Phone */}
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <Phone className="size-3" /> Téléphone
                      {profile?.isPhoneVerified && (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] px-1 py-0 border">
                          <CheckCircle2 className="size-2.5 mr-0.5" /> Vérifié
                        </Badge>
                      )}
                    </Label>
                    <Input
                      id="phone"
                      value={formState.phone}
                      onChange={(e) => setFormState((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="+225 XX XX XX XX"
                      className="h-9 text-sm"
                    />
                  </div>
                  {/* Gender */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <Users className="size-3" /> Genre
                    </Label>
                    <Select
                      value={formState.gender || '_empty'}
                      onValueChange={(val) => setFormState((prev) => ({ ...prev, gender: val === '_empty' ? '' : val }))}
                    >
                      <SelectTrigger className="h-9 text-sm w-full">
                        <SelectValue placeholder="Sélectionnez" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_empty">— Non renseigné —</SelectItem>
                        <SelectItem value="M">Masculin</SelectItem>
                        <SelectItem value="F">Féminin</SelectItem>
                        <SelectItem value="AUTRE">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* City */}
                  <div className="space-y-1.5">
                    <Label htmlFor="city" className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <MapPin className="size-3" /> Ville
                    </Label>
                    <Input
                      id="city"
                      value={formState.city}
                      onChange={(e) => setFormState((prev) => ({ ...prev, city: e.target.value }))}
                      placeholder="Ex: Abidjan"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                {/* ── ONECI Identity Verification Section ──────────────────────── */}
                <div className="pt-2">
                  <Separator className="mb-4" />
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="size-4 text-brand-500" />
                    <span className="text-sm font-semibold text-foreground">Vérification d&apos;identité ONECI</span>
                    {profile?.oneciVerified ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] px-1.5 py-0 border font-semibold">
                        <CheckCircle2 className="size-3 mr-0.5" /> Vérifié
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] px-1.5 py-0 border font-semibold">
                        +25% Trust Score
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    Renseignez votre NNI et date de naissance pour vérifier votre carte d&apos;identité nationale auprès de l&apos;ONECI.
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* NNI */}
                    <div className="space-y-1.5">
                      <Label htmlFor="nni" className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        NNI
                        {(profile?.oneciVerified || profile?.neofaceVerified) && (
                          <CheckCircle2 className="size-3 text-emerald-500" />
                        )}
                      </Label>
                      <Input
                        id="nni"
                        value={formState.nni}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 11)
                          setFormState((prev) => ({ ...prev, nni: val }))
                        }}
                        placeholder="Numéro National d'Identification"
                        className="h-9 text-sm"
                        disabled={profile?.oneciVerified || profile?.neofaceVerified || oneciVerifying}
                        maxLength={11}
                      />
                      <p className="text-[10px] text-muted-foreground">10 à 11 chiffres — requis pour la vérification ONECI</p>
                    </div>
                    {/* Birth Date */}
                    <div className="space-y-1.5">
                      <Label htmlFor="birthDate" className="text-xs font-medium text-foreground">
                        Date de naissance
                        {profile?.oneciVerified && (
                          <CheckCircle2 className="size-3 text-emerald-500 ml-1 inline" />
                        )}
                      </Label>
                      <Input
                        id="birthDate"
                        type="date"
                        value={formState.birthDate}
                        onChange={(e) => setFormState((prev) => ({ ...prev, birthDate: e.target.value }))}
                        className="h-9 text-sm"
                        disabled={profile?.oneciVerified || oneciVerifying}
                      />
                    </div>
                  </div>

                  {/* ONECI verification result */}
                  {oneciResult && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`mt-3 p-3 rounded-lg border ${
                        oneciResult.verified
                          ? 'bg-emerald-50 border-emerald-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {oneciResult.verified ? (
                          <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="size-4 text-red-500 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className={`text-xs font-medium ${oneciResult.verified ? 'text-emerald-700' : 'text-red-700'}`}>
                            {oneciResult.message}
                          </p>
                          {oneciResult.details && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">{oneciResult.details}</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ONECI verify button */}
                  {!profile?.oneciVerified && (
                    <Button
                      onClick={handleOneciVerify}
                      disabled={oneciVerifying || !formState.nni || !formState.birthDate || !formState.gender}
                      className="mt-3 bg-brand-500 hover:bg-brand-600 text-white w-full sm:w-auto"
                    >
                      {oneciVerifying ? (
                        <><Loader2 className="size-4 mr-2 animate-spin" /> Vérification en cours...</>
                      ) : (
                        <><CreditCard className="size-4 mr-2" /> Vérifier ma CNI</>
                      )}
                    </Button>
                  )}

                  {profile?.oneciVerified && profile?.oneciVerifiedAt && (
                    <p className="text-[10px] text-emerald-600 mt-2 flex items-center gap-1">
                      <CheckCircle2 className="size-3" />
                      Vérifié le {new Date(profile.oneciVerifiedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </div>

                {/* Email (read-only) */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <Mail className="size-3" /> Email
                    {profile?.isEmailVerified && (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] px-1 py-0 border">
                        <CheckCircle2 className="size-2.5 mr-0.5" /> Vérifié
                      </Badge>
                    )}
                  </Label>
                  <Input
                    value={profile?.email || user?.email || ''}
                    disabled
                    className="h-9 text-sm bg-muted text-muted-foreground"
                  />
                  <p className="text-[10px] text-muted-foreground">L&apos;email ne peut pas être modifié. Contactez le support si nécessaire.</p>
                </div>

                {/* Error / Success messages */}
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-xs text-red-600">{error}</p>
                  </div>
                )}
                {success && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                    <p className="text-xs text-emerald-600">{success}</p>
                  </div>
                )}

                {/* Save button */}
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-brand-500 hover:bg-brand-600 text-white"
                  >
                    {saving ? (
                      <><Loader2 className="size-4 mr-2 animate-spin" /> Enregistrement...</>
                    ) : (
                      <><Save className="size-4 mr-2" /> Enregistrer le profil</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── SCORING TAB ───────────────────────────────────────────────── */}
        {activeTab === 'scoring' && scoring && (
          <motion.div
            key="scoring"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Score Overview */}
            <Card className="border-border overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center gap-6">
                  <ScoreCircle score={scoring.score} statusColor={scoring.statusColor} size="lg" />
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className={`border text-xs font-semibold px-2.5 py-1 ${statusBadgeClass}`}>
                        {scoring.statusColor === 'emerald' ? (
                          <ShieldCheck className="size-3.5 mr-1" />
                        ) : scoring.statusColor === 'amber' ? (
                          <AlertTriangle className="size-3.5 mr-1" />
                        ) : (
                          <XCircle className="size-3.5 mr-1" />
                        )}
                        {scoring.statusLabel}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Votre Trust Score reflète votre fiabilité en tant que locataire. Plus votre score est élevé, plus vos candidatures seront favorisées.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Score breakdown components */}
            <div className="grid gap-4 sm:grid-cols-2">
              <ScoreComponentCard
                icon={User}
                label="Profil complet"
                weight={scoring.breakdown.profile.weight}
                score={scoring.breakdown.profile.score}
                max={scoring.breakdown.profile.max}
                statusColor={scoring.statusColor}
                details="Remplissez toutes vos informations personnelles"
                actionLabel="Compléter le profil"
                onAction={() => setActiveTab('profil')}
              />
              <ScoreComponentCard
                icon={ScanFace}
                label="KYC"
                weight={scoring.breakdown.neoface.weight}
                score={scoring.breakdown.neoface.score}
                max={scoring.breakdown.neoface.max}
                statusColor={scoring.statusColor}
                details="Vérification biométrique obligatoire"
                actionLabel="Vérification KYC"
                onAction={() => setKycModalOpen(true)}
              />
              <ScoreComponentCard
                icon={CreditCard}
                label="ONECI"
                weight={scoring.breakdown.oneci.weight}
                score={scoring.breakdown.oneci.score}
                max={scoring.breakdown.oneci.max}
                statusColor={scoring.statusColor}
                details="Authentification de votre carte d'identité nationale"
                actionLabel="Vérifier ma CNI"
                onAction={() => setActiveTab('profil')}
              />
              <ScoreComponentCard
                icon={FileCheck}
                label="Dossier locataire"
                weight={scoring.breakdown.rentalFile.weight}
                score={scoring.breakdown.rentalFile.score}
                max={scoring.breakdown.rentalFile.max}
                statusColor={scoring.statusColor}
                details={scoring.breakdown.rentalFile.hasFile ? "Dossier en cours de validation" : "Dossier locataire validé par un TC"}
                actionLabel={scoring.breakdown.rentalFile.hasFile ? "Voir mon dossier" : "Commencer la vérification"}
                onAction={() => setDashboardSection('rental-file')}
              />
            </div>

            {/* Profile field detail breakdown */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <User className="size-4 text-brand-500" />
                  Détails du score de profil
                </CardTitle>
                <CardDescription>
                  Profil complet = <span className="font-semibold text-brand-500">+5%</span> sur votre Trust Score
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {scoring.breakdown.profile.fields.map((field) => (
                    <ProfileFieldRow
                      key={field.key}
                      label={field.label}
                      value={
                        field.key === 'fullName'
                          ? `${formState.firstName} ${formState.lastName}`
                          : field.key === 'phone'
                            ? formState.phone
                            : field.key === 'city'
                              ? formState.city
                              : field.key === 'gender'
                                ? formState.gender === 'M' ? 'Masculin' : formState.gender === 'F' ? 'Féminin' : formState.gender === 'AUTRE' ? 'Autre' : null
                                : null
                      }
                      isFilled={field.filled}
                      fieldName={field.key}
                    />
                  ))}
                </div>
                {!scoring.breakdown.profile.fields.every((f) => f.filled) && (
                  <Button
                    variant="outline"
                    className="mt-3 w-full text-xs h-8 border-brand-200 text-brand-600 hover:bg-brand-50"
                    onClick={() => setActiveTab('profil')}
                  >
                    Compléter mon profil
                    <ArrowRight className="size-3 ml-1" />
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Recommendations */}
            {scoring.recommendations.length > 0 && (
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Lightbulb className="size-4 text-amber-500" />
                    Améliorez votre score
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {scoring.recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted border border-border"
                    >
                      <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                        rec.id === 'profile'
                          ? 'bg-brand-50 text-brand-500'
                          : rec.id === 'neoface'
                            ? 'bg-purple-50 text-purple-500'
                            : rec.id === 'oneci'
                              ? 'bg-sky-50 text-sky-500'
                              : 'bg-emerald-50 text-emerald-500'
                      }`}>
                        {rec.id === 'profile' && <User className="size-4" />}
                        {rec.id === 'neoface' && <ScanFace className="size-4" />}
                        {rec.id === 'oneci' && <CreditCard className="size-4" />}
                        {rec.id === 'rental-file' && <FileCheck className="size-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{rec.title}</span>
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0 border font-semibold">
                            +{rec.impact}%
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{rec.description}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 text-xs h-8 border-brand-200 text-brand-600 hover:bg-brand-50"
                        onClick={() => {
                          if (rec.action === 'settings') setActiveTab('profil')
                          else if (rec.action === 'rental-file') setDashboardSection('rental-file')
                          else if (rec.action === 'oneci') setActiveTab('profil')
                          else if (rec.action === 'neoface') setKycModalOpen(true)
                        }}
                      >
                        {rec.actionLabel}
                        <ArrowRight className="size-3 ml-1" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* How it works */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Info className="size-4 text-brand-500" />
                  Comment fonctionne le Trust Score ?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Le Trust Score locataire est calculé à partir de <span className="font-semibold">4 composantes</span> :
                </p>
                <div className="space-y-2">
                  {[
                    { label: 'Profil complet', weight: '5%', desc: 'Toutes les informations requises du profil sont renseignées.' },
                    { label: 'KYC', weight: '20%', desc: 'Vérification d\'identité par reconnaissance faciale.' },
                    { label: 'Vérification ONECI', weight: '25%', desc: 'CNI authentifiée.' },
                    { label: 'Dossier locataire validé', weight: '50%', desc: 'Dossier locataire approuvé.' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-start gap-2">
                      <Badge className="bg-brand-50 text-brand-600 border-brand-200 text-[10px] px-1.5 py-0 border font-bold shrink-0">
                        {item.weight}
                      </Badge>
                      <div>
                        <span className="text-xs font-semibold text-foreground">{item.label}</span>
                        <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="flex items-start gap-2 p-2.5 bg-brand-50 rounded-lg border border-brand-100">
                  <Lightbulb className="size-4 text-brand-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-brand-700">
                    <span className="font-semibold">Astuce :</span> Profil complet + Facial + ONECI + Dossier locataire validé = <span className="font-bold">100%</span>
                  </p>
                </div>
                <div className="flex items-start gap-2 p-2.5 bg-muted rounded-lg border border-border">
                  <Shield className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-semibold">Recommandation :</span> Un score de <span className="font-bold text-emerald-600">70+</span> vous donne le statut « Approuvé », <span className="font-bold text-amber-600">50-69</span> « Sous conditions », et <span className="font-bold text-red-500">moins de 50</span> « Non recommandé ».
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── SÉCURITÉ TAB ──────────────────────────────────────────────── */}
        {activeTab === 'securite' && (
          <motion.div
            key="securite"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Password change card */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Shield className="size-4 text-brand-500" />
                  Mot de passe
                </CardTitle>
                <CardDescription>Modifiez votre mot de passe pour sécuriser votre compte</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-accent transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
                      <Shield className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Mot de passe</p>
                      <p className="text-xs text-muted-foreground">
                        {profile?.passwordUpdatedAt
                          ? `Dernière modification : ${new Date(profile.passwordUpdatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
                          : 'Jamais modifié depuis la création du compte'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 border-brand-200 text-brand-600 hover:bg-brand-50"
                    onClick={() => {
                      setCurrentPassword('')
                      setNewPassword('')
                      setConfirmPassword('')
                      setPasswordError(null)
                      setPasswordSuccess(null)
                      setPasswordModalOpen(true)
                    }}
                  >
                    Modifier
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Verification status card */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <ShieldCheck className="size-4 text-brand-500" />
                  Vérifications
                </CardTitle>
                <CardDescription>Statut de vérification de vos coordonnées</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Email verification */}
                <div className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-accent transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`flex size-9 items-center justify-center rounded-lg ${profile?.isEmailVerified ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                      <Mail className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Adresse email</p>
                      <p className="text-xs text-muted-foreground">{profile?.email || 'Non renseigné'}</p>
                    </div>
                  </div>
                  <Badge className={profile?.isEmailVerified ? 'bg-emerald-50 text-emerald-700 border-emerald-200 border' : 'bg-red-50 text-red-600 border-red-200 border'}>
                    {profile?.isEmailVerified ? (
                      <><CheckCircle2 className="size-3 mr-0.5" /> Vérifié</>
                    ) : (
                      <><XCircle className="size-3 mr-0.5" /> Non vérifié</>
                    )}
                  </Badge>
                </div>

                {/* Phone verification */}
                <div className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-accent transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`flex size-9 items-center justify-center rounded-lg ${profile?.isPhoneVerified ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-500'}`}>
                      <Phone className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Numéro de téléphone</p>
                      <p className="text-xs text-muted-foreground">{profile?.phone || 'Non renseigné'}</p>
                    </div>
                  </div>
                  <Badge className={profile?.isPhoneVerified ? 'bg-emerald-50 text-emerald-700 border-emerald-200 border' : 'bg-amber-50 text-amber-700 border-amber-200 border'}>
                    {profile?.isPhoneVerified ? (
                      <><CheckCircle2 className="size-3 mr-0.5" /> Vérifié</>
                    ) : (
                      <><AlertTriangle className="size-3 mr-0.5" /> Non vérifié</>
                    )}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Active sessions card */}
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Monitor className="size-4 text-brand-500" />
                      Sessions actives
                    </CardTitle>
                    <CardDescription>Appareils connectés à votre compte</CardDescription>
                  </div>
                  {sessions.filter((s) => !s.isCurrent).length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 text-red-600 border-red-200 hover:bg-red-50"
                      onClick={handleRevokeOtherSessions}
                      disabled={revokingSessions}
                    >
                      {revokingSessions ? (
                        <><Loader2 className="size-3 mr-1 animate-spin" /> Révocation...</>
                      ) : (
                        <><LogOut className="size-3 mr-1" /> Déconnecter tout</>
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {sessionsLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : sessions.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Aucune session active trouvée</p>
                ) : (
                  <div className="space-y-3">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                          session.isCurrent
                            ? 'border-emerald-200 bg-emerald-50/30'
                            : 'border-border hover:bg-accent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`flex size-9 items-center justify-center rounded-lg ${
                            session.isCurrent ? 'bg-emerald-50 text-emerald-600' : 'bg-muted text-muted-foreground'
                          }`}>
                            <Smartphone className="size-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-foreground">
                                {session.isCurrent ? 'Cet appareil' : 'Autre appareil'}
                              </p>
                              {session.isCurrent && (
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] px-1.5 py-0 border font-semibold">
                                  Actif
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              Connecté le {new Date(session.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        {!session.isCurrent && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={async () => {
                              try {
                                await authFetch('/api/settings/sessions', {
                                  method: 'DELETE',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ sessionIds: [session.id] }),
                                })
                                setSessions((prev) => prev.filter((s) => s.id !== session.id))
                              } catch {}
                            }}
                          >
                            <Trash2 className="size-3 mr-1" />
                            Révoquer
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Password Change Modal */}
            <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Shield className="size-5 text-brand-500" />
                    Changer le mot de passe
                  </DialogTitle>
                  <DialogDescription>
                    Entrez votre mot de passe actuel puis choisissez un nouveau mot de passe
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  {/* Current password */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground">Mot de passe actuel</Label>
                    <div className="relative">
                      <Input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-9 text-sm pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                      >
                        {showCurrentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                  <Separator />
                  {/* New password */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground">Nouveau mot de passe</Label>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min. 8 caractères"
                        className="h-9 text-sm pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                      >
                        {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {newPassword && (
                      <div className="space-y-1 mt-1.5">
                        <div className="flex gap-1">
                          {[/[A-Z]/, /[a-z]/, /[0-9]/, /.{8,}/].map((regex, i) => (
                            <div
                              key={i}
                              className={`h-1 flex-1 rounded-full ${
                                regex.test(newPassword) ? 'bg-emerald-400' : 'bg-neutral-200'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          8+ caractères, 1 majuscule, 1 minuscule, 1 chiffre
                        </p>
                      </div>
                    )}
                  </div>
                  {/* Confirm password */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground">Confirmer le nouveau mot de passe</Label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`h-9 text-sm ${confirmPassword && newPassword !== confirmPassword ? 'border-red-300 focus:border-red-400' : ''}`}
                    />
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-[10px] text-red-500">Les mots de passe ne correspondent pas</p>
                    )}
                  </div>
                  {/* Error */}
                  {passwordError && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                      <p className="text-xs text-red-600">{passwordError}</p>
                    </div>
                  )}
                  {/* Success */}
                  {passwordSuccess && (
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                      <p className="text-xs text-emerald-600">{passwordSuccess}</p>
                    </div>
                  )}
                </div>
                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setPasswordModalOpen(false)}
                    disabled={passwordSaving}
                    className="text-xs h-9"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handlePasswordChange}
                    disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
                    className="bg-brand-500 hover:bg-brand-600 text-white text-xs h-9"
                  >
                    {passwordSaving ? (
                      <><Loader2 className="size-3.5 mr-1.5 animate-spin" /> Enregistrement...</>
                    ) : (
                      <><Save className="size-3.5 mr-1.5" /> Changer le mot de passe</>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </motion.div>
        )}

        {/* ── NOTIFICATIONS TAB ─────────────────────────────────────────── */}
        {activeTab === 'notifications' && (
          <motion.div
            key="notifications"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Notification toggles */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Bell className="size-4 text-brand-500" />
                  Préférences de notifications
                </CardTitle>
                <CardDescription>Choisissez les notifications que vous souhaitez recevoir</CardDescription>
              </CardHeader>
              <CardContent>
                {notifLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-border">
                        <div className="space-y-2">
                          <div className="h-4 w-40 bg-muted rounded animate-pulse" />
                          <div className="h-3 w-56 bg-muted rounded animate-pulse" />
                        </div>
                        <div className="h-5 w-9 bg-muted rounded-full animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : notifPrefs ? (
                  <div className="space-y-1">
                    {([
                      { key: 'messages' as const, label: 'Nouveaux messages', desc: 'Recevez une notification pour chaque nouveau message', icon: Mail, color: 'bg-brand-50 text-brand-500' },
                      { key: 'dossierUpdates' as const, label: 'Mises à jour de dossier', desc: 'Soyez informé des changements de statut de votre dossier', icon: FileCheck, color: 'bg-emerald-50 text-emerald-600' },
                      { key: 'visitReminders' as const, label: 'Rappels de visite', desc: 'Recevez les rappels de vos visites planifiées', icon: Bell, color: 'bg-amber-50 text-amber-600' },
                      { key: 'paymentAlerts' as const, label: 'Alertes de paiement', desc: 'Rappels pour les paiements à venir et les reçus', icon: CreditCard, color: 'bg-purple-50 text-purple-600' },
                      { key: 'promotions' as const, label: 'Promotions', desc: 'Offres spéciales et nouveautés de Mon Toit', icon: Lightbulb, color: 'bg-muted text-muted-foreground' },
                    ]).map((item) => {
                      const Icon = item.icon
                      const isEnabled = notifPrefs[item.key]
                      const isSaving = notifSaving[item.key]
                      return (
                        <div
                          key={item.key}
                          className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-accent transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`flex size-9 items-center justify-center rounded-lg ${item.color}`}>
                              <Icon className="size-4" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{item.label}</p>
                              <p className="text-xs text-muted-foreground">{item.desc}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isSaving && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={(checked) => handleToggleNotif(item.key, checked)}
                              disabled={isSaving}
                              className="data-[state=checked]:bg-brand-500"
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">Impossible de charger les préférences</p>
                )}
              </CardContent>
            </Card>

            {/* Info card about notifications */}
            <Card className="border-border bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Info className="size-4 text-brand-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Comment fonctionnent les notifications ?</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Les notifications vous informent en temps réel des événements importants sur votre compte Mon Toit.
                      Vous pouvez activer ou désactiver chaque catégorie individuellement.
                      Les notifications critiques de sécurité sont toujours actives.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── KYC Verification Modal (accessible from scoring tab) ──────────── */}
      <KycVerificationModal
        open={kycModalOpen}
        onOpenChange={setKycModalOpen}
        profile={profile}
        onVerified={handleKycVerified}
      />
    </motion.div>
  )
}
