'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck,
  User,
  ScanFace,
  CreditCard,
  FileCheck,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Info,
  Lightbulb,
  Shield,
  AlertTriangle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'

// ── Types ───────────────────────────────────────────────────────────────────

interface ProfileField {
  key: string
  label: string
  filled: boolean
}

interface ProfileBreakdown {
  score: number
  max: number
  weight: number
  fields: ProfileField[]
}

interface VerificationBreakdown {
  score: number
  max: number
  weight: number
  verified: boolean
  approved?: boolean
  hasFile?: boolean
  label: string
  description: string
}

interface RoleSpecificBreakdown extends VerificationBreakdown {
  approved: boolean
  hasFile: boolean
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
  roleLabel: string
  breakdown: {
    profile: ProfileBreakdown
    neoface: VerificationBreakdown
    oneci: VerificationBreakdown
    roleSpecific: RoleSpecificBreakdown
  }
  recommendations: Recommendation[]
}

// ── Animated circular score ─────────────────────────────────────────────────

function ScoreCircle({ score, statusColor }: { score: number; statusColor: string }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const colorMap: Record<string, string> = {
    emerald: '#10b981',
    amber: '#f59e0b',
    red: '#ef4444',
  }
  const strokeColor = colorMap[statusColor] || '#ef4444'

  return (
    <div className="relative size-36 shrink-0">
      <svg className="size-full -rotate-90" viewBox="0 0 120 120">
        {/* Background circle */}
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#f5f5f5" strokeWidth="8" />
        {/* Progress circle */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-foreground">{score}</span>
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">/100</span>
      </div>
    </div>
  )
}

// ── Score bar ───────────────────────────────────────────────────────────────

function ScoreBar({ label, weight, score, max, icon: Icon, color }: {
  label: string
  weight: number
  score: number
  max: number
  icon: React.ComponentType<{ className?: string }>
  color: string
}) {
  const percentage = max > 0 ? Math.round((score / max) * 100) : 0
  const isComplete = score >= max

  return (
    <div className="flex items-center gap-3">
      <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
        isComplete ? 'bg-emerald-50 text-emerald-600' : 'bg-muted text-muted-foreground'
      }`}>
        <Icon className="size-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-foreground">{label}</span>
          <span className="text-[10px] font-semibold text-muted-foreground">{weight}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full ${color}`}
          />
        </div>
      </div>
      <span className={`text-xs font-bold shrink-0 ${isComplete ? 'text-emerald-600' : 'text-muted-foreground'}`}>
        {score}/{max}
      </span>
    </div>
  )
}

// ── Expandable section ──────────────────────────────────────────────────────

function ExpandableSection({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <Card className="border-border">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-2.5">
          <Icon className="size-4 text-brand-500" />
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        {open ? (
          <ChevronUp className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <Separator className="mb-3" />
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export function TrustScore() {
  const { isAuthenticated, setDashboardSection } = useAuthStore()
  const [data, setData] = useState<ScoringData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchScore = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      const result = await authFetch<ScoringData>('/api/scoring')
      setData(result)
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) {
        setData(null)
        return
      }
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchScore()
  }, [fetchScore])

  const handleAction = (action: string) => {
    if (action === 'settings' || action === 'oneci' || action === 'neoface') {
      setDashboardSection('settings')
    } else if (action === 'rental-file') {
      setDashboardSection('rental-file')
    } else if (action === 'owner-file') {
      setDashboardSection('settings')
    } else if (action === 'my-properties') {
      setDashboardSection('my-properties')
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
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  // Error state
  if (error || !data) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Trust Score</h1>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm text-amber-700">Impossible de charger votre score. Veuillez réessayer.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { score, statusLabel, statusColor, breakdown, recommendations } = data

  // Status badge colors
  const statusBadgeClass =
    statusColor === 'emerald'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : statusColor === 'amber'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-red-50 text-red-700 border-red-200'

  const statusIconClass =
    statusColor === 'emerald'
      ? 'text-emerald-500'
      : statusColor === 'amber'
        ? 'text-amber-500'
        : 'text-red-500'

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants} className="bg-gradient-to-r from-brand-500/10 to-transparent rounded-xl p-4 sm:p-6 -mx-4 sm:-mx-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-brand-100 shrink-0">
            <ShieldCheck className="size-6 text-brand-500" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Trust Score</h1>
            <p className="text-muted-foreground mt-0.5">Votre score de confiance {data.roleLabel || 'locataire'}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <Badge className={`border text-[10px] px-2 py-0.5 ${statusBadgeClass}`}>
            {statusColor === 'emerald' ? (
              <ShieldCheck className="size-3 mr-1" />
            ) : statusColor === 'amber' ? (
              <AlertTriangle className="size-3 mr-1" />
            ) : (
              <XCircle className="size-3 mr-1" />
            )}
            {statusLabel}
          </Badge>
          <Badge variant="secondary" className="bg-brand-50 text-brand-700">
            Score: {score}/100
          </Badge>
        </div>
      </motion.div>

      {/* ── Score Overview Card ──────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="border-border overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              {/* Score circle */}
              <ScoreCircle score={score} statusColor={statusColor} />

              {/* Score details */}
              <div className="flex-1 min-w-0 space-y-4">
                {/* Status badge */}
                <div className="flex items-center gap-2">
                  <Badge className={`border text-xs font-semibold px-2.5 py-1 ${statusBadgeClass}`}>
                    {statusColor === 'emerald' ? (
                      <ShieldCheck className="size-3.5 mr-1" />
                    ) : statusColor === 'amber' ? (
                      <AlertTriangle className="size-3.5 mr-1" />
                    ) : (
                      <XCircle className="size-3.5 mr-1" />
                    )}
                    {statusLabel}
                  </Badge>
                </div>

                {/* Score bars */}
                <div className="space-y-3">
                  <ScoreBar
                    label="Informations du profil"
                    weight={breakdown.profile.weight}
                    score={breakdown.profile.score}
                    max={breakdown.profile.max}
                    icon={User}
                    color={
                      breakdown.profile.score >= breakdown.profile.max
                        ? 'bg-emerald-500'
                        : breakdown.profile.score > 0
                          ? 'bg-amber-400'
                          : 'bg-neutral-200'
                    }
                  />
                  <ScoreBar
                    label="KYC"
                    weight={breakdown.neoface.weight}
                    score={breakdown.neoface.score}
                    max={breakdown.neoface.max}
                    icon={ScanFace}
                    color={
                      breakdown.neoface.verified
                        ? 'bg-emerald-500'
                        : 'bg-neutral-200'
                    }
                  />
                  <ScoreBar
                    label="ONECI"
                    weight={breakdown.oneci.weight}
                    score={breakdown.oneci.score}
                    max={breakdown.oneci.max}
                    icon={CreditCard}
                    color={
                      breakdown.oneci.verified
                        ? 'bg-emerald-500'
                        : 'bg-neutral-200'
                    }
                  />
                  <ScoreBar
                    label={breakdown.roleSpecific.label}
                    weight={breakdown.roleSpecific.weight}
                    score={breakdown.roleSpecific.score}
                    max={breakdown.roleSpecific.max}
                    icon={FileCheck}
                    color={
                      breakdown.roleSpecific.approved
                        ? 'bg-emerald-500'
                        : breakdown.roleSpecific.hasFile
                          ? 'bg-amber-400'
                          : 'bg-neutral-200'
                    }
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Recommendations Card ────────────────────────────────────────── */}
      {recommendations.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Lightbulb className="size-4 text-amber-500" />
                Améliorez votre score
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendations.map((rec) => (
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
                    {(rec.id === 'rental-file' || rec.id === 'owner-profile' || rec.id === 'owner-file') && <FileCheck className="size-4" />}
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
                    onClick={() => handleAction(rec.action)}
                  >
                    {rec.actionLabel}
                    <ArrowRight className="size-3 ml-1" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Expandable Details ──────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="space-y-3">
        {/* Profile details */}
        <ExpandableSection title="Détails du score de profil" icon={User}>
          <div className="space-y-2.5">
            <p className="text-xs text-muted-foreground mb-3">
              Profil complet = <span className="font-semibold text-brand-500">+5%</span>
            </p>
            {breakdown.profile.fields.map((field) => (
              <div key={field.key} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{field.label}</span>
                {field.filled ? (
                  <div className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="size-3.5" />
                    <span className="text-[10px] font-medium">Complété</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-red-400">
                    <XCircle className="size-3.5" />
                    <span className="text-[10px] font-medium">Non complété</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ExpandableSection>

        {/* Verification details */}
        <ExpandableSection title="Détails du score de vérification" icon={Shield}>
          <div className="space-y-4">
            {/* ONECI */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">Vérification ONECI</p>
                <p className="text-[10px] text-muted-foreground">Carte d&apos;identité nationale</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">{breakdown.oneci.weight}%</span>
                {breakdown.oneci.verified ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-2 py-0 border font-medium">
                    <CheckCircle2 className="size-3 mr-0.5" /> Vérifié
                  </Badge>
                ) : (
                  <Badge className="bg-red-50 text-red-600 border-red-200 text-[10px] px-2 py-0 border font-medium">
                    <XCircle className="size-3 mr-0.5" /> Non vérifié
                  </Badge>
                )}
              </div>
            </div>

            <Separator />

            {/* KYC */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">KYC</p>
                <p className="text-[10px] text-muted-foreground">Vérification biométrique</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">{breakdown.neoface.weight}%</span>
                {breakdown.neoface.verified ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-2 py-0 border font-medium">
                    <CheckCircle2 className="size-3 mr-0.5" /> Vérifié
                  </Badge>
                ) : (
                  <Badge className="bg-red-50 text-red-600 border-red-200 text-[10px] px-2 py-0 border font-medium">
                    <XCircle className="size-3 mr-0.5" /> Non vérifié
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </ExpandableSection>

        {/* How it works */}
        <ExpandableSection title="Comment fonctionne le Trust Score ?" icon={Info} defaultOpen={false}>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Le Trust Score {data.roleLabel || 'locataire'} est calculé à partir de <span className="font-semibold">4 composantes</span> :
            </p>
            <div className="space-y-2">
              {[
                { label: 'Profil complet', weight: '5%', desc: 'Toutes les informations requises du profil sont renseignées.' },
                { label: 'KYC', weight: '20%', desc: 'Vérification d\'identité par reconnaissance faciale.' },
                { label: 'Vérification ONECI', weight: '25%', desc: 'CNI authentifiée.' },
                { label: breakdown.roleSpecific.label, weight: '50%', desc: breakdown.roleSpecific.description },
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
                <span className="font-semibold">Astuce :</span> Profil complet + Facial + ONECI + {breakdown.roleSpecific.label} validé = <span className="font-bold">100%</span>
              </p>
            </div>

            <div className="flex items-start gap-2 p-2.5 bg-muted rounded-lg border border-border">
              <Shield className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground">
                <span className="font-semibold">Recommandation :</span> Un score de <span className="font-bold text-emerald-600">70+</span> vous donne le statut « Approuvé », <span className="font-bold text-amber-600">50-69</span> « Sous conditions », et <span className="font-bold text-red-500">moins de 50</span> « Non recommandé ».
              </p>
            </div>
          </div>
        </ExpandableSection>
      </motion.div>
    </motion.div>
  )
}
