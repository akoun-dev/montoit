'use client'

import { useEffect, useState, useCallback } from 'react'
import { ClipboardCheck, BadgeCheck, Clock, AlertTriangle, FileText, Home, ArrowRight, Shield } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'

interface TcStats {
  pendingRentalFiles: number
  pendingOwnershipDocs: number
  pendingProperties: number
  totalReviewed: number
  overdueSlas: number
  slaCompliance: number
}

interface RentalFileSummary {
  id: string
  status: string
  monthlyIncome: number | null
  employer: string | null
  createdAt: string
  tenant: { firstName: string; lastName: string; phone: string }
  documents: Array<{ type: string; status: string; name: string }>
}

interface OwnershipDocSummary {
  id: string
  type: string
  name: string
  status: string
  createdAt: string
  owner: { firstName: string; lastName: string; phone: string }
}

interface ApiTcResponse {
  stats?: TcStats
  pendingRentalFiles?: RentalFileSummary[]
  pendingOwnershipDocs?: OwnershipDocSummary[]
}

const defaultStats: TcStats = {
  pendingRentalFiles: 0,
  pendingOwnershipDocs: 0,
  pendingProperties: 0,
  totalReviewed: 0,
  overdueSlas: 0,
  slaCompliance: 100,
}

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }
const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

const docTypeLabels: Record<string, string> = {
  TITRE_FONCIER: 'Titre foncier',
  ACTE_NOTARIE: 'Acte notarié',
  ATTESTATION_PROPRIETE: 'Attestation de propriété',
  RCCM: 'RCCM',
  AGREMENT: 'Agrément',
}

export function TcOverview() {
  const { user, isAuthenticated, setDashboardSection } = useAuthStore()
  const [stats, setStats] = useState<TcStats>(defaultStats)
  const [pendingRentalFiles, setPendingRentalFiles] = useState<RentalFileSummary[]>([])
  const [pendingOwnershipDocs, setPendingOwnershipDocs] = useState<OwnershipDocSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      const [d, pendingProps] = await Promise.all([
        authFetch<ApiTcResponse>('/api/dashboard/tc'),
        authFetch<{ pagination: { total: number } }>('/api/tc/verifications?limit=1'),
      ])

      const mergedStats: TcStats = {
        ...defaultStats,
        ...d.stats,
        pendingProperties: pendingProps.pagination?.total || 0,
      }

      setStats(mergedStats)
      setPendingRentalFiles(d.pendingRentalFiles ?? [])
      setPendingOwnershipDocs(d.pendingOwnershipDocs ?? [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) {
        setStats(defaultStats)
        return
      }
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setStats(defaultStats)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}</div>

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-foreground">Bonjour, {user?.firstName} 👋</h1>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm text-amber-700">Impossible de charger vos données. Veuillez réessayer.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const statCards = [
    { label: 'Biens à vérifier', value: stats.pendingProperties, icon: Home, color: 'text-brand-600 bg-brand-50', action: () => setDashboardSection('property-verifications') },
    { label: 'Dossiers en attente', value: stats.pendingRentalFiles, icon: ClipboardCheck, color: 'text-amber-600 bg-amber-50', action: () => setDashboardSection('rental-files-queue') },
    { label: 'Docs propriétaire', value: stats.pendingOwnershipDocs, icon: BadgeCheck, color: 'text-emerald-600 bg-emerald-50', action: () => setDashboardSection('owner-validations') },
    { label: 'SLA en retard', value: stats.overdueSlas, icon: AlertTriangle, color: 'text-red-600 bg-red-50', action: () => setDashboardSection('sla-monitoring') },
  ]

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-foreground">Bonjour, {user?.firstName} 👋</h1>
        <p className="text-muted-foreground mt-1">Espace Tiers de Confiance — Validation et contrôle</p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="border-border cursor-pointer hover:shadow-md transition-shadow" onClick={stat.action}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex size-10 items-center justify-center rounded-lg ${stat.color}`}>
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </motion.div>

      {/* SLA Compliance Bar */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-brand-50">
                  <Shield className="size-5 text-brand-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Conformité SLA</p>
                  <p className="text-xs text-muted-foreground">Objectif : 100% sous 48h</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {stats.slaCompliance >= 90 ? (
                  <Badge className="bg-green-100 text-green-700">✓ Conforme</Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-700">⚠ En dessous</Badge>
                )}
                <span className="text-2xl font-bold text-foreground">{stats.slaCompliance}%</span>
              </div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${stats.slaCompliance >= 90 ? 'bg-green-500' : stats.slaCompliance >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${stats.slaCompliance}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Action: Property Verifications */}
      {stats.pendingProperties > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-brand-200 bg-brand-50/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-brand-500 text-white">
                  <Home className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{stats.pendingProperties} bien(s) en attente de vérification</p>
                  <p className="text-xs text-muted-foreground">Ces annonces nécessitent votre validation avant publication</p>
                </div>
              </div>
              <Button
                onClick={() => setDashboardSection('property-verifications')}
                className="bg-brand-500 hover:bg-brand-600 text-white"
              >
                Vérifier
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending Rental Files */}
        <motion.div variants={itemVariants}>
          <Card className="border-border h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Dossiers locataires</CardTitle>
                  <CardDescription>{pendingRentalFiles.length} en attente de validation</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="text-brand-500 gap-1" onClick={() => setDashboardSection('rental-files-queue')}>
                  Voir tout <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 max-h-72 overflow-y-auto">
              {pendingRentalFiles.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Aucun dossier en attente</p>
              ) : (
                pendingRentalFiles.slice(0, 5).map((rf) => (
                  <div key={rf.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent cursor-pointer"
                    onClick={() => setDashboardSection('rental-files-queue')}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="size-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{rf.tenant.firstName} {rf.tenant.lastName}</p>
                        <p className="text-xs text-muted-foreground">{rf.documents.length} document(s)</p>
                      </div>
                    </div>
                    <Badge className={rf.status === 'SUBMITTED' ? 'bg-amber-100 text-amber-700' : 'bg-orange-100 text-orange-700'}>
                      {rf.status === 'SUBMITTED' ? 'Soumis' : 'En revue TC'}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Pending Ownership Docs */}
        <motion.div variants={itemVariants}>
          <Card className="border-border h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Documents propriétaire</CardTitle>
                  <CardDescription>{pendingOwnershipDocs.length} en attente de validation</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="text-brand-500 gap-1" onClick={() => setDashboardSection('owner-validations')}>
                  Voir tout <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 max-h-72 overflow-y-auto">
              {pendingOwnershipDocs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Aucun document en attente</p>
              ) : (
                pendingOwnershipDocs.slice(0, 5).map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent cursor-pointer"
                    onClick={() => setDashboardSection('owner-validations')}
                  >
                    <div className="flex items-center gap-3">
                      <BadgeCheck className="size-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{doc.owner.firstName} {doc.owner.lastName} · {docTypeLabels[doc.type] || doc.type}</p>
                      </div>
                    </div>
                    <Badge className="bg-amber-100 text-amber-700">En attente</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Total reviewed */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-50">
                <Clock className="size-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{stats.totalReviewed} dossiers traités au total</p>
                <p className="text-xs text-muted-foreground">Historique de vos validations et rejets</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-1" onClick={() => setDashboardSection('history')}>
              Voir l&apos;historique <ArrowRight className="size-3.5" />
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
