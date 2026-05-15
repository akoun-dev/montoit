'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Settings, User, Shield, Bell, Sliders, Mail, Phone, ShieldCheck,
  ChevronRight, CheckCircle2, XCircle, ScanFace, CreditCard, FileCheck,
  Save, Loader2, MapPin, Users, ArrowRight, Lightbulb, AlertTriangle,
  Info,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { useAuthStore } from '@/lib/auth-store'
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
  neofaceVerified: boolean
  oneciVerified: boolean
  isEmailVerified: boolean
  isPhoneVerified: boolean
  role: string
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
        <span className={`font-bold text-neutral-900 ${size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-lg' : 'text-xs'}`}>
          {score}
        </span>
        {size !== 'sm' && (
          <span className="text-[9px] font-medium text-neutral-400 uppercase tracking-wider">/100</span>
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
    <Card className="border-neutral-200 hover:border-neutral-300 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
            isComplete ? 'bg-emerald-50 text-emerald-600' : 'bg-neutral-100 text-neutral-400'
          }`}>
            <Icon className="size-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-neutral-900">{label}</span>
              <span className={`text-xs font-bold ${isComplete ? 'text-emerald-600' : 'text-neutral-400'}`}>
                {score}/{max} pts
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 mb-2">{details}</p>
            <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden mb-2">
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
              <span className="text-[10px] font-medium text-neutral-400">Poids : {weight}%</span>
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
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-neutral-50 transition-colors">
      <div className="flex items-center gap-2">
        {isFilled ? (
          <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
        ) : (
          <XCircle className="size-4 text-red-300 shrink-0" />
        )}
        <span className="text-xs text-neutral-600">{label}</span>
      </div>
      <span className={`text-xs font-medium ${isFilled ? 'text-neutral-800' : 'text-red-400'}`}>
        {isFilled ? (value || '✓') : 'Non renseigné'}
      </span>
    </div>
  )
}

// ── Main Settings Component ─────────────────────────────────────────────────

export function SettingsSection() {
  const { user, setDashboardSection } = useAuthStore()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [scoring, setScoring] = useState<ScoringData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'profil' | 'scoring' | 'securite' | 'notifications'>('profil')

  // Form state
  const [formState, setFormState] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    gender: '',
    city: '',
    address: '',
  })

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
          address: p.address || '',
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

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-neutral-100 rounded-lg animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 bg-neutral-100 rounded-xl animate-pulse" />
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
    : 'bg-neutral-50 text-neutral-500 border-neutral-200'

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
        <h1 className="text-2xl font-bold text-neutral-900">Paramètres</h1>
        <p className="text-neutral-500 mt-1">Gérez votre compte et vos préférences</p>
      </motion.div>

      {/* User Info Card with integrated scoring */}
      <motion.div variants={itemVariants}>
        <Card className="border-neutral-200 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-500 shrink-0">
                <span className="text-lg font-bold">
                  {profile?.firstName?.charAt(0)?.toUpperCase() || user?.firstName?.charAt(0)?.toUpperCase() || 'U'}
                  {profile?.lastName?.charAt(0)?.toUpperCase() || user?.lastName?.charAt(0)?.toUpperCase() || ''}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-neutral-900 truncate">
                  {profile?.firstName || user?.firstName} {profile?.lastName || user?.lastName}
                </h3>
                <div className="space-y-1 mt-1.5">
                  <div className="flex items-center gap-2 text-sm text-neutral-500">
                    <Mail className="size-3.5 shrink-0" />
                    <span className="truncate">{profile?.email || user?.email || 'Non renseigné'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-neutral-500">
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
                  <span className="text-[9px] font-medium text-neutral-400 group-hover:text-brand-500 transition-colors">
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
        <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
                  isActive
                    ? 'bg-white text-brand-600 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-700'
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
                        <span className="text-sm font-semibold text-neutral-900">Complétion du profil</span>
                        <Badge className={`border text-[10px] font-semibold px-2 py-0 ${statusBadgeClass}`}>
                          {scoring.statusLabel}
                        </Badge>
                      </div>
                      <p className="text-xs text-neutral-500 mb-3">
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

            {/* Profile Form */}
            <Card className="border-neutral-200">
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
                    <Label htmlFor="firstName" className="text-xs font-medium text-neutral-700">
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
                    <Label htmlFor="lastName" className="text-xs font-medium text-neutral-700">
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
                    <Label htmlFor="phone" className="text-xs font-medium text-neutral-700 flex items-center gap-1.5">
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
                    <Label className="text-xs font-medium text-neutral-700 flex items-center gap-1.5">
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
                    <Label htmlFor="city" className="text-xs font-medium text-neutral-700 flex items-center gap-1.5">
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
                  {/* Address */}
                  <div className="space-y-1.5">
                    <Label htmlFor="address" className="text-xs font-medium text-neutral-700">
                      Adresse
                    </Label>
                    <Input
                      id="address"
                      value={formState.address}
                      onChange={(e) => setFormState((prev) => ({ ...prev, address: e.target.value }))}
                      placeholder="Ex: Cocody Riviera 3"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                {/* Email (read-only) */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-neutral-700 flex items-center gap-1.5">
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
                    className="h-9 text-sm bg-neutral-50 text-neutral-500"
                  />
                  <p className="text-[10px] text-neutral-400">L&apos;email ne peut pas être modifié. Contactez le support si nécessaire.</p>
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
            <Card className="border-neutral-200 overflow-hidden">
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
                    <p className="text-sm text-neutral-600">
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
                label="NEOFACE"
                weight={scoring.breakdown.neoface.weight}
                score={scoring.breakdown.neoface.score}
                max={scoring.breakdown.neoface.max}
                statusColor={scoring.statusColor}
                details="Vérification biométrique obligatoire"
              />
              <ScoreComponentCard
                icon={CreditCard}
                label="ONECI"
                weight={scoring.breakdown.oneci.weight}
                score={scoring.breakdown.oneci.score}
                max={scoring.breakdown.oneci.max}
                statusColor={scoring.statusColor}
                details="Authentification de votre carte d'identité nationale"
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
            <Card className="border-neutral-200">
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
                              : field.key === 'address'
                                ? formState.address
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
              <Card className="border-neutral-200">
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
                      className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-100"
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
                          <span className="text-sm font-semibold text-neutral-900">{rec.title}</span>
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0 border font-semibold">
                            +{rec.impact}%
                          </Badge>
                        </div>
                        <p className="text-xs text-neutral-500 mt-0.5">{rec.description}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 text-xs h-8 border-brand-200 text-brand-600 hover:bg-brand-50"
                        onClick={() => {
                          if (rec.action === 'settings') setActiveTab('profil')
                          else if (rec.action === 'rental-file') setDashboardSection('rental-file')
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
            <Card className="border-neutral-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Info className="size-4 text-brand-500" />
                  Comment fonctionne le Trust Score ?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-neutral-600">
                  Le Trust Score locataire est calculé à partir de <span className="font-semibold">4 composantes</span> :
                </p>
                <div className="space-y-2">
                  {[
                    { label: 'Profil complet', weight: '5%', desc: 'Toutes les informations requises du profil sont renseignées.' },
                    { label: 'NEOFACE', weight: '20%', desc: 'Vérification biométrique.' },
                    { label: 'Vérification ONECI', weight: '25%', desc: 'CNI authentifiée.' },
                    { label: 'Dossier locataire validé', weight: '50%', desc: 'Dossier locataire approuvé.' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-start gap-2">
                      <Badge className="bg-brand-50 text-brand-600 border-brand-200 text-[10px] px-1.5 py-0 border font-bold shrink-0">
                        {item.weight}
                      </Badge>
                      <div>
                        <span className="text-xs font-semibold text-neutral-800">{item.label}</span>
                        <p className="text-[10px] text-neutral-500">{item.desc}</p>
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
                <div className="flex items-start gap-2 p-2.5 bg-neutral-50 rounded-lg border border-neutral-100">
                  <Shield className="size-4 text-neutral-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-neutral-600">
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
            className="space-y-4"
          >
            <Card className="border-neutral-200">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Shield className="size-4 text-green-600" />
                  Sécurité du compte
                </CardTitle>
                <CardDescription>Gérez votre mot de passe et l&apos;authentification</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl border border-neutral-100 hover:bg-neutral-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-green-50 text-green-600">
                      <Shield className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">Mot de passe</p>
                      <p className="text-xs text-neutral-500">Dernière modification : Non disponible</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs h-8">
                    Modifier
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl border border-neutral-100 hover:bg-neutral-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
                      <Mail className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">Email vérifié</p>
                      <p className="text-xs text-neutral-500">{profile?.isEmailVerified ? 'Votre email est vérifié' : 'Email non vérifié'}</p>
                    </div>
                  </div>
                  <Badge className={profile?.isEmailVerified ? 'bg-emerald-50 text-emerald-700 border-emerald-200 border' : 'bg-red-50 text-red-600 border-red-200 border'}>
                    {profile?.isEmailVerified ? 'Vérifié' : 'Non vérifié'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl border border-neutral-100 hover:bg-neutral-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                      <Phone className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">Téléphone vérifié</p>
                      <p className="text-xs text-neutral-500">{profile?.isPhoneVerified ? 'Votre numéro est vérifié' : 'Numéro non vérifié'}</p>
                    </div>
                  </div>
                  <Badge className={profile?.isPhoneVerified ? 'bg-emerald-50 text-emerald-700 border-emerald-200 border' : 'bg-red-50 text-red-600 border-red-200 border'}>
                    {profile?.isPhoneVerified ? 'Vérifié' : 'Non vérifié'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
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
            className="space-y-4"
          >
            <Card className="border-neutral-200">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Bell className="size-4 text-amber-600" />
                  Préférences de notifications
                </CardTitle>
                <CardDescription>Choisissez comment vous souhaitez être notifié</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: 'Nouveaux messages', desc: 'Recevez une notification pour chaque nouveau message', defaultOn: true },
                    { label: 'Mises à jour de dossier', desc: 'Soyez informé des changements de statut de votre dossier', defaultOn: true },
                    { label: 'Demandes de visite', desc: 'Recevez les rappels de vos visites planifiées', defaultOn: true },
                    { label: 'Alertes de paiement', desc: 'Rappels pour les paiements à venir et les reçus', defaultOn: false },
                    { label: 'Promotions', desc: 'Offres spéciales et nouveautés de Mon Toit', defaultOn: false },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between p-4 rounded-xl border border-neutral-100 hover:bg-neutral-50 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{item.label}</p>
                        <p className="text-xs text-neutral-500">{item.desc}</p>
                      </div>
                      <Button variant="outline" size="sm" className="text-xs h-8">
                        {item.defaultOn ? 'Activé' : 'Désactivé'}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
