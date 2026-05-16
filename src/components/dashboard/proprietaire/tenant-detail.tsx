'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft, User, Building2, CreditCard, FileSignature, Phone, Mail,
  MapPin, Calendar, ShieldCheck, Clock, AlertTriangle, CheckCircle,
  XCircle, ChevronDown, ChevronUp, Wrench, Star, Receipt, Briefcase
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'

// ─── Types ──────────────────────────────────────────────────────────────────
interface TenantInfo {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  avatarUrl: string | null
  isActive: boolean
  gender: string | null
  city: string | null
  address: string | null
  neofaceVerified: boolean
  oneciVerified: boolean
  createdAt: string
}

interface PropertyInfo {
  id: string
  title: string
  type: string
  address: string
  city: string
  commune: string | null
  area: number
  bedrooms: number | null
  images: Array<{ url: string }>
}

interface PaymentItem {
  id: string
  amount: number
  status: string
  dueDate: string
  paidAt: string | null
  reference: string | null
  createdAt: string
}

interface RentalFileInfo {
  id: string
  status: string
  monthlyIncome: number | null
  employer: string | null
  employmentType: string | null
  guarantorName: string | null
  guarantorPhone: string | null
  guarantorRelation: string | null
  reviewedAt: string | null
  documents: Array<{
    id: string
    type: string
    name: string
    status: string
    tcComment: string | null
  }>
}

interface MaintenanceItem {
  id: string
  title: string
  status: string
  priority: string
  createdAt: string
}

interface RatingItem {
  id: string
  score: number
  comment: string | null
  createdAt: string
  fromUser: { id: string; firstName: string; lastName: string }
}

interface LeaseInfo {
  id: string
  status: string
  startDate: string
  endDate: string
  monthlyRent: number
  charges: number
  deposit: number
  specialConditions: string | null
  ownerSignedAt: string | null
  tenantSignedAt: string | null
  property: PropertyInfo
  payments: PaymentItem[]
  rentalFile: RentalFileInfo | null
  maintenanceRequests: MaintenanceItem[]
  ratings: RatingItem[]
}

interface TenantDetailData {
  tenant: TenantInfo
  leases: LeaseInfo[]
  paymentStats: {
    totalPaid: number
    totalPending: number
    totalLate: number
    paidCount: number
    lateCount: number
    pendingCount: number
    paymentScore: number
    totalPayments: number
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatCurrency(amount: number): string {
  return amount.toLocaleString('fr-FR') + ' FCFA'
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

const paymentStatusConfig: Record<string, { label: string; color: string; dotColor: string }> = {
  PAID: { label: 'Payé', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dotColor: 'bg-emerald-500' },
  PENDING: { label: 'En attente', color: 'bg-amber-50 text-amber-700 border-amber-200', dotColor: 'bg-amber-500' },
  LATE: { label: 'En retard', color: 'bg-red-50 text-red-700 border-red-200', dotColor: 'bg-red-500' },
  PARTIAL: { label: 'Partiel', color: 'bg-cyan-50 text-cyan-700 border-cyan-200', dotColor: 'bg-cyan-500' },
  CANCELLED: { label: 'Annulé', color: 'bg-neutral-50 text-neutral-500 border-neutral-200', dotColor: 'bg-neutral-400' },
}

const leaseStatusConfig: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Actif', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  PENDING_SIGNATURE: { label: 'En attente de signature', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  DRAFT: { label: 'Brouillon', color: 'bg-neutral-50 text-neutral-600 border-neutral-200' },
  TERMINATED: { label: 'Résilié', color: 'bg-red-50 text-red-700 border-red-200' },
  EXPIRED: { label: 'Expiré', color: 'bg-neutral-50 text-neutral-500 border-neutral-200' },
}

const maintenanceStatusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'En attente', color: 'bg-amber-50 text-amber-700' },
  IN_PROGRESS: { label: 'En cours', color: 'bg-cyan-50 text-cyan-700' },
  RESOLVED: { label: 'Résolu', color: 'bg-emerald-50 text-emerald-700' },
  CLOSED: { label: 'Fermé', color: 'bg-neutral-50 text-neutral-500' },
}

const priorityConfig: Record<string, { label: string; color: string }> = {
  LOW: { label: 'Basse', color: 'text-neutral-500' },
  MEDIUM: { label: 'Moyenne', color: 'text-amber-600' },
  HIGH: { label: 'Haute', color: 'text-orange-600' },
  URGENT: { label: 'Urgente', color: 'text-red-600' },
}

const docStatusConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  VALIDATED: { label: 'Validé', icon: CheckCircle, color: 'text-emerald-500' },
  PENDING: { label: 'En attente', icon: Clock, color: 'text-amber-500' },
  REJECTED: { label: 'Rejeté', icon: XCircle, color: 'text-red-500' },
}

const employmentTypeLabels: Record<string, string> = {
  CDI: 'CDI',
  CDD: 'CDD',
  FREELANCE: 'Free-lance',
  RETIRED: 'Retraité',
  OTHER: 'Autre',
}

// ─── Component ──────────────────────────────────────────────────────────────
interface TenantDetailProps {
  tenantId: string
  onBack: () => void
}

export function TenantDetail({ tenantId, onBack }: TenantDetailProps) {
  const { isAuthenticated } = useAuthStore()
  const [data, setData] = useState<TenantDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedLeases, setExpandedLeases] = useState<Set<string>>(new Set())

  const fetchDetail = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const result = await authFetch<{ data: TenantDetailData }>(`/api/tenants/${tenantId}`)
      if (result.data) {
        setData(result.data)
        // Auto-expand active leases
        const activeIds = new Set(
          result.data.leases.filter(l => l.status === 'ACTIVE').map(l => l.id)
        )
        if (activeIds.size === 0 && result.data.leases.length > 0) {
          activeIds.add(result.data.leases[0].id)
        }
        setExpandedLeases(activeIds)
      } else {
        setError('Locataire introuvable')
      }
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) return
      if (err instanceof AuthError && err.status === 404) {
        setError('Locataire introuvable')
      } else if (err instanceof AuthError && err.status === 403) {
        setError('Ce locataire ne fait pas partie de vos locataires')
      } else {
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
      }
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, tenantId])

  useEffect(() => { fetchDetail() }, [fetchDetail])

  const toggleLease = (leaseId: string) => {
    setExpandedLeases(prev => {
      const next = new Set(prev)
      if (next.has(leaseId)) next.delete(leaseId)
      else next.add(leaseId)
      return next
    })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground">
          <ArrowLeft className="size-4" /> Retour
        </Button>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm text-amber-700">{error || 'Locataire introuvable'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { tenant, leases, paymentStats } = data
  const activeLeases = leases.filter(l => l.status === 'ACTIVE')
  const totalMaintenance = leases.reduce((s, l) => s + l.maintenanceRequests.length, 0)
  const openMaintenance = leases.reduce(
    (s, l) => s + l.maintenanceRequests.filter(m => m.status === 'PENDING' || m.status === 'IN_PROGRESS').length, 0
  )

  // Payment score color
  const scoreColor = paymentStats.paymentScore >= 80 ? 'text-emerald-600' :
    paymentStats.paymentScore >= 50 ? 'text-amber-600' : 'text-red-600'
  const scoreBg = paymentStats.paymentScore >= 80 ? 'bg-emerald-50' :
    paymentStats.paymentScore >= 50 ? 'bg-amber-50' : 'bg-red-50'

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground -ml-2">
        <ArrowLeft className="size-4" /> Retour aux locataires
      </Button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-brand-50">
          {tenant.avatarUrl ? (
            <img
              src={tenant.avatarUrl}
              alt={`${tenant.firstName} ${tenant.lastName}`}
              className="size-16 rounded-full object-cover"
            />
          ) : (
            <span className="text-xl font-bold text-brand-600">
              {tenant.firstName[0]}{tenant.lastName[0]}
            </span>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              {tenant.firstName} {tenant.lastName}
            </h1>
            {activeLeases.length > 0 && (
              <Badge className="bg-emerald-100 text-emerald-700">Locataire actif</Badge>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Mail className="size-3.5" /> {tenant.email}
            </span>
            {tenant.phone && (
              <span className="flex items-center gap-1">
                <Phone className="size-3.5" /> {tenant.phone}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Identity & Verification */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <User className="size-4" /> Informations personnelles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tenant.gender && (
              <div>
                <p className="text-xs text-muted-foreground">Genre</p>
                <p className="text-sm font-medium text-foreground">{tenant.gender === 'M' ? 'Masculin' : 'Féminin'}</p>
              </div>
            )}
            {tenant.city && (
              <div className="flex items-start gap-2">
                <MapPin className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Ville</p>
                  <p className="text-sm font-medium text-foreground">{tenant.city}</p>
                </div>
              </div>
            )}
            {tenant.address && (
              <div>
                <p className="text-xs text-muted-foreground">Adresse</p>
                <p className="text-sm font-medium text-foreground">{tenant.address}</p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Inscrit le</p>
                <p className="text-sm font-medium text-foreground">{formatDate(tenant.createdAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className={`size-4 shrink-0 ${tenant.neofaceVerified ? 'text-emerald-500' : 'text-neutral-400'}`} />
              <div>
                <p className="text-xs text-muted-foreground">Vérification KYC</p>
                <p className={`text-sm font-medium ${tenant.neofaceVerified ? 'text-emerald-700' : 'text-neutral-500'}`}>
                  {tenant.neofaceVerified ? 'Vérifié' : 'Non vérifié'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className={`size-4 shrink-0 ${tenant.oneciVerified ? 'text-emerald-500' : 'text-neutral-400'}`} />
              <div>
                <p className="text-xs text-muted-foreground">Vérification ONECI</p>
                <p className={`text-sm font-medium ${tenant.oneciVerified ? 'text-emerald-700' : 'text-neutral-500'}`}>
                  {tenant.oneciVerified ? 'Vérifié' : 'Non vérifié'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <div className={`inline-flex size-12 items-center justify-center rounded-full ${scoreBg} mb-2`}>
              <span className={`text-lg font-bold ${scoreColor}`}>{paymentStats.paymentScore}%</span>
            </div>
            <p className="text-xs text-muted-foreground">Score de paiement</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total payé</p>
            <p className="text-lg font-bold text-emerald-600">{formatCurrency(paymentStats.totalPaid)}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">En attente</p>
            <p className="text-lg font-bold text-amber-600">{formatCurrency(paymentStats.totalPending)}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">En retard</p>
            <p className="text-lg font-bold text-red-600">{formatCurrency(paymentStats.totalLate)}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Nb. paiements</p>
            <p className="text-lg font-bold text-foreground">{paymentStats.totalPayments}</p>
            <div className="flex gap-2 mt-1 text-[10px]">
              <span className="text-emerald-600">{paymentStats.paidCount} payé{paymentStats.paidCount > 1 ? 's' : ''}</span>
              <span className="text-amber-600">{paymentStats.pendingCount} attente</span>
              <span className="text-red-600">{paymentStats.lateCount} retard</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Score Bar */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-foreground">Régularité des paiements</p>
            <span className={`text-sm font-bold ${scoreColor}`}>{paymentStats.paymentScore}%</span>
          </div>
          <Progress 
            value={paymentStats.paymentScore} 
            className="h-2"
          />
          <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
            <span>🔴 Mauvais payeur</span>
            <span>🟡 Irrégulier</span>
            <span>🟢 Bon payeur</span>
          </div>
        </CardContent>
      </Card>

      {/* Leases with payments */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <FileSignature className="size-5" /> Baux ({leases.length})
        </h2>

        {leases.map(lease => {
          const isExpanded = expandedLeases.has(lease.id)
          const leaseConf = leaseStatusConfig[lease.status] || leaseStatusConfig.DRAFT
          const property = lease.property

          return (
            <Card key={lease.id} className="border-border">
              {/* Lease Header - Clickable */}
              <button
                onClick={() => toggleLease(lease.id)}
                className="w-full text-left"
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Property image */}
                    {property.images?.[0]?.url ? (
                      <div className="size-14 rounded-lg bg-muted overflow-hidden shrink-0">
                        <img src={property.images[0].url} alt={property.title} className="size-full object-cover" />
                      </div>
                    ) : (
                      <div className="size-14 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                        <Building2 className="size-6 text-brand-400" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground truncate">{property.title}</h3>
                        <Badge variant="outline" className={`text-[10px] px-2 py-0 border ${leaseConf.color}`}>
                          {leaseConf.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span>{formatShortDate(lease.startDate)} → {formatShortDate(lease.endDate)}</span>
                        <span className="font-medium text-foreground">{formatCurrency(lease.monthlyRent)}/mois</span>
                      </div>
                    </div>

                    {isExpanded ? (
                      <ChevronUp className="size-5 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="size-5 text-muted-foreground shrink-0" />
                    )}
                  </div>
                </CardContent>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-4">
                  <Separator />

                  {/* Lease details */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Loyer mensuel</p>
                      <p className="font-medium text-foreground">{formatCurrency(lease.monthlyRent)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Charges</p>
                      <p className="font-medium text-foreground">{formatCurrency(lease.charges)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Dépôt de garantie</p>
                      <p className="font-medium text-foreground">{formatCurrency(lease.deposit)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Début</p>
                      <p className="font-medium text-foreground">{formatShortDate(lease.startDate)}</p>
                    </div>
                  </div>

                  {lease.specialConditions && (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                      <p className="text-xs font-medium text-amber-700">Conditions particulières</p>
                      <p className="text-sm text-amber-800 mt-1">{lease.specialConditions}</p>
                    </div>
                  )}

                  {/* Rental File */}
                  {lease.rentalFile && (
                    <div>
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                        <Briefcase className="size-4" /> Dossier locatif
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                        {lease.rentalFile.employer && (
                          <div>
                            <p className="text-xs text-muted-foreground">Employeur</p>
                            <p className="font-medium text-foreground">{lease.rentalFile.employer}</p>
                          </div>
                        )}
                        {lease.rentalFile.employmentType && (
                          <div>
                            <p className="text-xs text-muted-foreground">Type d'emploi</p>
                            <p className="font-medium text-foreground">{employmentTypeLabels[lease.rentalFile.employmentType] || lease.rentalFile.employmentType}</p>
                          </div>
                        )}
                        {lease.rentalFile.monthlyIncome && (
                          <div>
                            <p className="text-xs text-muted-foreground">Revenus mensuels</p>
                            <p className="font-medium text-foreground">{formatCurrency(lease.rentalFile.monthlyIncome)}</p>
                          </div>
                        )}
                        {lease.rentalFile.guarantorName && (
                          <div>
                            <p className="text-xs text-muted-foreground">Garant</p>
                            <p className="font-medium text-foreground">{lease.rentalFile.guarantorName}</p>
                          </div>
                        )}
                        {lease.rentalFile.guarantorRelation && (
                          <div>
                            <p className="text-xs text-muted-foreground">Lien avec garant</p>
                            <p className="font-medium text-foreground">{lease.rentalFile.guarantorRelation}</p>
                          </div>
                        )}
                        {lease.rentalFile.guarantorPhone && (
                          <div>
                            <p className="text-xs text-muted-foreground">Tél. garant</p>
                            <p className="font-medium text-foreground">{lease.rentalFile.guarantorPhone}</p>
                          </div>
                        )}
                      </div>

                      {/* Documents */}
                      {lease.rentalFile.documents.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-muted-foreground mb-2">Documents</p>
                          <div className="flex flex-wrap gap-2">
                            {lease.rentalFile.documents.map(doc => {
                              const dConf = docStatusConfig[doc.status] || docStatusConfig.PENDING
                              const DIcon = dConf.icon
                              return (
                                <div key={doc.id} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-border bg-background">
                                  <DIcon className={`size-3.5 ${dConf.color}`} />
                                  <span className="text-foreground">{doc.name}</span>
                                  <span className={dConf.color}>{dConf.label}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Payments */}
                  {lease.payments.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                        <CreditCard className="size-4" /> Historique des paiements ({lease.payments.length})
                      </h4>
                      <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                        {lease.payments.map(payment => {
                          const pConf = paymentStatusConfig[payment.status] || paymentStatusConfig.PENDING
                          return (
                            <div
                              key={payment.id}
                              className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:bg-accent transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`size-2 rounded-full ${pConf.dotColor}`} />
                                <div>
                                  <p className="text-sm font-medium text-foreground">
                                    {formatCurrency(payment.amount)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Échéance : {formatShortDate(payment.dueDate)}
                                    {payment.paidAt && ` · Payé le ${formatShortDate(payment.paidAt)}`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {payment.reference && (
                                  <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">
                                    {payment.reference}
                                  </span>
                                )}
                                <Badge variant="outline" className={`text-[10px] px-2 py-0 border ${pConf.color}`}>
                                  {pConf.label}
                                </Badge>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Maintenance Requests */}
                  {lease.maintenanceRequests.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                        <Wrench className="size-4" /> Demandes de maintenance ({lease.maintenanceRequests.length})
                      </h4>
                      <div className="space-y-1.5">
                        {lease.maintenanceRequests.map(mr => {
                          const mConf = maintenanceStatusConfig[mr.status] || maintenanceStatusConfig.PENDING
                          const pConf = priorityConfig[mr.priority] || priorityConfig.MEDIUM
                          return (
                            <div
                              key={mr.id}
                              className="flex items-center justify-between p-2.5 rounded-lg border border-border"
                            >
                              <div>
                                <p className="text-sm font-medium text-foreground">{mr.title}</p>
                                <p className="text-xs text-muted-foreground">{formatShortDate(mr.createdAt)}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] ${pConf.color}`}>{pConf.label}</span>
                                <Badge className={`text-[10px] px-2 py-0 ${mConf.color}`}>
                                  {mConf.label}
                                </Badge>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Ratings */}
                  {lease.ratings.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                        <Star className="size-4" /> Avis
                      </h4>
                      <div className="space-y-2">
                        {lease.ratings.map(rating => (
                          <div key={rating.id} className="p-3 rounded-lg border border-border">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map(s => (
                                  <Star
                                    key={s}
                                    className={`size-3.5 ${s <= rating.score ? 'text-amber-400 fill-amber-400' : 'text-neutral-300'}`}
                                  />
                                ))}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                par {rating.fromUser.firstName} {rating.fromUser.lastName}
                              </span>
                            </div>
                            {rating.comment && (
                              <p className="text-sm text-foreground">{rating.comment}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </motion.div>
  )
}
