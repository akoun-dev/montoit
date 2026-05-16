'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, UserCheck, FileText, Building2, Clock, CheckCircle2, AlertCircle, ChevronRight, User, MapPin } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'

// ─── Types ──────────────────────────────────────────────────────────────────
interface TimelineStep {
  status: string
  label: string
  completed: boolean
  active: boolean
}

interface ApplicationItem {
  id: string
  status: string
  monthlyIncome: number | null
  employer: string | null
  employmentType: string | null
  guarantorName: string | null
  guarantorPhone: string | null
  guarantorRelation: string | null
  rejectionReason: string | null
  tcComment: string | null
  reviewedAt: string | null
  validUntil: string | null
  createdAt: string
  updatedAt: string
  statusTimeline: TimelineStep[]
  linkedProperty: {
    id: string
    title: string
    address: string
    city: string
    type: string
    price: number
    currency: string
    images: Array<{ url: string }>
    owner: { id: string; firstName: string; lastName: string }
  } | null
  documentProgress: {
    total: number
    validated: number
    rejected: number
    pending: number
  }
  reviewedBy: { id: string; firstName: string; lastName: string } | null
  documents: Array<{
    id: string
    type: string
    name: string
    status: string
    createdAt: string
  }>
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  DRAFT: { label: 'Brouillon', color: 'bg-neutral-100 text-neutral-600', icon: FileText },
  SUBMITTED: { label: 'Soumis', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
  TC_REVIEW: { label: 'En examen', color: 'bg-brand-50 text-brand-600 border-brand-200', icon: UserCheck },
  VALIDATED: { label: 'Validé', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  REJECTED: { label: 'Rejeté', color: 'bg-red-50 text-red-700 border-red-200', icon: AlertCircle },
  EXPIRED: { label: 'Expiré', color: 'bg-neutral-50 text-neutral-500 border-neutral-200', icon: Clock },
}

const docTypeLabels: Record<string, string> = {
  ID_CARD: 'Carte d\'identité',
  PASSPORT: 'Passeport',
  PAY_SLIP: 'Bulletin de salaire',
  EMPLOYMENT_CONTRACT: 'Contrat de travail',
  BANK_STATEMENT: 'Relevé bancaire',
  GUARANTOR_ID: 'Pièce garant',
  PROOF_OF_ADDRESS: 'Justificatif de domicile',
  OTHER: 'Autre',
}

const docStatusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'En attente', color: 'bg-amber-50 text-amber-700' },
  VALIDATED: { label: 'Validé', color: 'bg-emerald-50 text-emerald-700' },
  REJECTED: { label: 'Rejeté', color: 'bg-red-50 text-red-700' },
}

const employmentLabels: Record<string, string> = {
  CDI: 'CDI',
  CDD: 'CDD',
  FREELANCE: 'Freelance',
  RETIRED: 'Retraité',
  OTHER: 'Autre',
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Component ──────────────────────────────────────────────────────────────
interface ApplicationDetailProps {
  applicationId: string
  onBack: () => void
  onEditRentalFile: () => void
}

export function ApplicationDetail({ applicationId, onBack, onEditRentalFile }: ApplicationDetailProps) {
  const { isAuthenticated } = useAuthStore()
  const [application, setApplication] = useState<ApplicationItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchApplication = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const result = await authFetch<{ data: ApplicationItem }>(`/api/applications/${applicationId}`)
      if (result.data) {
        setApplication(result.data)
      } else {
        setError('Candidature introuvable')
      }
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) return
      if (err instanceof AuthError && err.status === 404) {
        setError('Candidature introuvable')
      } else {
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
      }
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, applicationId])

  useEffect(() => { fetchApplication() }, [fetchApplication])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-neutral-100 animate-pulse rounded" />
        <div className="h-64 bg-neutral-100 animate-pulse rounded-xl" />
      </div>
    )
  }

  if (error || !application) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={onBack} className="gap-2 text-neutral-600">
          <ArrowLeft className="size-4" /> Retour
        </Button>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm text-amber-700">{error || 'Candidature introuvable'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const config = statusConfig[application.status] || statusConfig.DRAFT
  const StatusIcon = config.icon
  const property = application.linkedProperty
  const dp = application.documentProgress

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={onBack} className="gap-2 text-neutral-600 -ml-2">
        <ArrowLeft className="size-4" /> Retour aux candidatures
      </Button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">Détail de la candidature</h1>
          <p className="text-neutral-500 mt-1 text-sm">
            Créée le {formatShortDate(application.createdAt)}
          </p>
        </div>
        <Badge variant="outline" className={`shrink-0 text-xs px-3 py-1 border ${config.color} w-fit`}>
          <StatusIcon className="size-3 mr-1" />
          {config.label}
        </Badge>
      </div>

      {/* Status Timeline */}
      <Card className="border-neutral-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-neutral-500">Avancement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-1.5">
            {application.statusTimeline.map((step, i) => (
              <div key={step.status} className="flex items-center gap-1.5">
                <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${
                  step.completed
                    ? 'bg-emerald-50 text-emerald-700'
                    : step.active
                      ? 'bg-brand-50 text-brand-600 ring-1 ring-brand-200'
                      : 'bg-neutral-50 text-neutral-400'
                }`}>
                  {step.completed ? (
                    <CheckCircle2 className="size-3.5" />
                  ) : step.active ? (
                    <ChevronRight className="size-3.5" />
                  ) : (
                    <div className="size-2 rounded-full bg-neutral-300" />
                  )}
                  {step.label}
                </div>
                {i < application.statusTimeline.length - 1 && (
                  <div className={`w-4 sm:w-8 h-px ${step.completed ? 'bg-emerald-300' : 'bg-neutral-200'}`} />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Property info */}
      {property && (
        <Card className="border-neutral-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-neutral-500 flex items-center gap-2">
              <Building2 className="size-4" /> Bien concerné
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              {property.images?.[0]?.url ? (
                <div className="size-16 sm:size-20 rounded-lg bg-neutral-100 overflow-hidden shrink-0">
                  <img src={property.images[0].url} alt={property.title} className="size-full object-cover" />
                </div>
              ) : (
                <div className="size-16 sm:size-20 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                  <Building2 className="size-8 text-brand-400" />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="font-semibold text-neutral-900">{property.title}</h3>
                <p className="text-sm text-neutral-500 flex items-center gap-1">
                  <MapPin className="size-3" /> {property.address}, {property.city}
                </p>
                <p className="text-sm font-semibold text-brand-600 mt-1">
                  {property.price.toLocaleString('fr-FR')} {property.currency}
                </p>
              </div>
            </div>
            {property.owner && (
              <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-neutral-100">
                  <User className="size-4 text-neutral-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-700">{property.owner.firstName} {property.owner.lastName}</p>
                  <p className="text-xs text-neutral-400">Propriétaire</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Financial info */}
      <Card className="border-neutral-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-neutral-500">Informations financières</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {application.monthlyIncome && (
              <div className="flex justify-between text-sm p-3 rounded-lg bg-neutral-50">
                <span className="text-neutral-500">Revenus mensuels</span>
                <span className="font-medium text-neutral-700">{application.monthlyIncome.toLocaleString('fr-FR')} FCFA</span>
              </div>
            )}
            {application.employer && (
              <div className="flex justify-between text-sm p-3 rounded-lg bg-neutral-50">
                <span className="text-neutral-500">Employeur</span>
                <span className="font-medium text-neutral-700">{application.employer}</span>
              </div>
            )}
            {application.employmentType && (
              <div className="flex justify-between text-sm p-3 rounded-lg bg-neutral-50">
                <span className="text-neutral-500">Type d&apos;emploi</span>
                <span className="font-medium text-neutral-700">{employmentLabels[application.employmentType] || application.employmentType}</span>
              </div>
            )}
          </div>

          {/* Guarantor */}
          {application.guarantorName && (
            <div className="mt-4 pt-3 border-t border-neutral-100">
              <p className="text-xs text-neutral-400 mb-2 font-medium">Garant</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex justify-between text-sm p-3 rounded-lg bg-neutral-50">
                  <span className="text-neutral-500">Nom</span>
                  <span className="font-medium text-neutral-700">{application.guarantorName}</span>
                </div>
                {application.guarantorPhone && (
                  <div className="flex justify-between text-sm p-3 rounded-lg bg-neutral-50">
                    <span className="text-neutral-500">Téléphone</span>
                    <span className="font-medium text-neutral-700">{application.guarantorPhone}</span>
                  </div>
                )}
                {application.guarantorRelation && (
                  <div className="flex justify-between text-sm p-3 rounded-lg bg-neutral-50">
                    <span className="text-neutral-500">Relation</span>
                    <span className="font-medium text-neutral-700">{application.guarantorRelation}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents */}
      <Card className="border-neutral-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-neutral-500 flex items-center gap-2">
              <FileText className="size-4" /> Documents
            </CardTitle>
            {dp.total > 0 && (
              <span className="text-xs text-neutral-400">
                {dp.validated}/{dp.total} validé{dp.validated > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {dp.total > 0 && (
            <div className="mb-4 h-2 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${(dp.validated / dp.total) * 100}%` }}
              />
            </div>
          )}
          {application.documents.length > 0 ? (
            <div className="space-y-2">
              {application.documents.map((doc) => {
                const docStatus = docStatusConfig[doc.status] || docStatusConfig.PENDING
                return (
                  <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="size-4 text-neutral-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-700 truncate">{doc.name || docTypeLabels[doc.type] || doc.type}</p>
                        <p className="text-xs text-neutral-400">{docTypeLabels[doc.type] || doc.type}</p>
                      </div>
                    </div>
                    <Badge className={`shrink-0 text-[10px] ${docStatus.color}`}>
                      {docStatus.label}
                    </Badge>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-neutral-400 text-center py-4">Aucun document</p>
          )}
        </CardContent>
      </Card>

      {/* Rejection reason */}
      {application.rejectionReason && (
        <Card className="border-red-100 bg-red-50/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="size-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700">Motif de rejet</p>
                <p className="text-sm text-red-600 mt-1">{application.rejectionReason}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TC Comment */}
      {application.tcComment && (
        <Card className="border-neutral-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-neutral-500">Commentaire du Tiers de Confiance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-700">{application.tcComment}</p>
            {application.reviewedBy && (
              <p className="text-xs text-neutral-400 mt-2">
                Par {application.reviewedBy.firstName} {application.reviewedBy.lastName}
                {application.reviewedAt && ` — ${formatShortDate(application.reviewedAt)}`}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Validity */}
      {application.validUntil && (
        <Card className="border-emerald-100 bg-emerald-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-500" />
              <p className="text-sm text-emerald-700">
                Dossier valide jusqu&apos;au {formatDate(application.validUntil)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit button for DRAFT */}
      {application.status === 'DRAFT' && (
        <div className="flex justify-end">
          <Button onClick={onEditRentalFile} className="bg-brand-500 hover:bg-brand-600 text-white gap-2">
            <FileText className="size-4" />
            Compléter le dossier
          </Button>
        </div>
      )}
    </motion.div>
  )
}
