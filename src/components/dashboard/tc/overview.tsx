'use client'

import { useEffect, useState, useCallback } from 'react'
import { ClipboardCheck, BadgeCheck, Clock, AlertTriangle, FileText, Home } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'

interface TcData {
  stats: {
    pendingRentalFiles: number
    pendingOwnershipDocs: number
    pendingProperties: number
    totalReviewed: number
    overdueSlas: number
    slaCompliance: number
  }
  pendingRentalFiles: Array<{
    id: string; status: string; monthlyIncome: number | null; createdAt: string
    tenant: { firstName: string; lastName: string; phone: string }
    documents: Array<{ type: string; status: string; name: string }>
  }>
  pendingOwnershipDocs: Array<{
    id: string; type: string; name: string; status: string; createdAt: string
    owner: { firstName: string; lastName: string; phone: string }
  }>
}

interface ApiTcResponse {
  stats?: {
    pendingRentalFiles?: number
    pendingOwnershipDocs?: number
    pendingProperties?: number
    totalReviewed?: number
    overdueSlas?: number
    slaCompliance?: number
  }
  pendingRentalFiles?: Array<{
    id: string; status: string; monthlyIncome: number | null; createdAt: string
    tenant: { firstName: string; lastName: string; phone: string }
    documents: Array<{ type: string; status: string; name: string }>
  }>
  pendingOwnershipDocs?: Array<{
    id: string; type: string; name: string; status: string; createdAt: string
    owner: { firstName: string; lastName: string; phone: string }
  }>
}

const defaultData: TcData = {
  stats: { pendingRentalFiles: 0, pendingOwnershipDocs: 0, pendingProperties: 0, totalReviewed: 0, overdueSlas: 0, slaCompliance: 100 },
  pendingRentalFiles: [],
  pendingOwnershipDocs: [],
}

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }
const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

export function TcOverview() {
  const { user, isAuthenticated, setDashboardSection } = useAuthStore()
  const [data, setData] = useState<TcData>(defaultData)
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
      setData({
        stats: { ...defaultData.stats, ...d.stats, pendingProperties: pendingProps.pagination?.total || 0 },
        pendingRentalFiles: d.pendingRentalFiles ?? [],
        pendingOwnershipDocs: d.pendingOwnershipDocs ?? [],
      })
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) {
        setData(defaultData)
        return
      }
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setData(defaultData)
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

  const stats = [
    { label: 'Biens à vérifier', value: data.stats.pendingProperties, icon: Home, color: 'text-brand-600 bg-brand-50', action: () => setDashboardSection('property-verifications') },
    { label: 'Dossiers en attente', value: data.stats.pendingRentalFiles, icon: ClipboardCheck, color: 'text-amber-600 bg-amber-50' },
    { label: 'Docs propriétaire', value: data.stats.pendingOwnershipDocs, icon: BadgeCheck, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'SLA en retard', value: data.stats.overdueSlas, icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
  ]

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-foreground">Bonjour, {user?.firstName} 👋</h1>
        <p className="text-muted-foreground mt-1">Espace Tiers de Confiance — Validation et contrôle</p>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className={`border-border ${stat.action ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`} onClick={stat.action}>
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

      {/* Quick Action: Property Verifications */}
      {data.stats.pendingProperties > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-brand-200 bg-brand-50/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-brand-500 text-white">
                  <Home className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{data.stats.pendingProperties} bien(s) en attente de vérification</p>
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
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Dossiers en attente de validation</CardTitle>
              <CardDescription>Dossiers nécessitant votre examen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-72 overflow-y-auto">
              {data.pendingRentalFiles.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Aucun dossier en attente</p>
              ) : (
                data.pendingRentalFiles.map((rf) => (
                  <div key={rf.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent">
                    <div className="flex items-center gap-3">
                      <FileText className="size-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{rf.tenant.firstName} {rf.tenant.lastName}</p>
                        <p className="text-xs text-muted-foreground">{rf.documents.length} document(s)</p>
                      </div>
                    </div>
                    <Badge className={rf.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}>
                      {rf.status === 'SUBMITTED' ? 'Soumis' : 'En revue'}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Pending Ownership Docs */}
        <motion.div variants={itemVariants}>
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Documents propriétaire en attente</CardTitle>
              <CardDescription>Titres et attestations à vérifier</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-72 overflow-y-auto">
              {data.pendingOwnershipDocs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Aucun document en attente</p>
              ) : (
                data.pendingOwnershipDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent">
                    <div className="flex items-center gap-3">
                      <BadgeCheck className="size-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{doc.owner.firstName} {doc.owner.lastName}</p>
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
    </motion.div>
  )
}
