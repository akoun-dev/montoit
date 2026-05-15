'use client'

import { useEffect, useState } from 'react'
import { ClipboardCheck, BadgeCheck, Clock, AlertTriangle, FileText } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/lib/auth-store'
import { motion } from 'framer-motion'

interface TcData {
  stats: {
    pendingRentalFiles: number
    pendingOwnershipDocs: number
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

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }
const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

export function TcOverview() {
  const { user } = useAuthStore()
  const [data, setData] = useState<TcData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/tc')
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-neutral-100 animate-pulse" />)}</div>
  if (!data) return <p className="text-neutral-500">Erreur de chargement</p>

  const stats = [
    { label: 'Dossiers en attente', value: data.stats.pendingRentalFiles, icon: ClipboardCheck, color: 'text-amber-600 bg-amber-50' },
    { label: 'Docs propriétaire', value: data.stats.pendingOwnershipDocs, icon: BadgeCheck, color: 'text-blue-600 bg-blue-50' },
    { label: 'SLA conformité', value: `${data.stats.slaCompliance}%`, icon: Clock, color: 'text-green-600 bg-green-50' },
    { label: 'SLA en retard', value: data.stats.overdueSlas, icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
  ]

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-neutral-900">Bonjour, {user?.firstName} 👋</h1>
        <p className="text-neutral-500 mt-1">Espace Tiers de Confiance — Validation et contrôle</p>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="border-neutral-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex size-10 items-center justify-center rounded-lg ${stat.color}`}>
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-neutral-900">{stat.value}</p>
                    <p className="text-xs text-neutral-500">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending Rental Files */}
        <motion.div variants={itemVariants}>
          <Card className="border-neutral-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Dossiers en attente de validation</CardTitle>
              <CardDescription>Dossiers nécessitant votre examen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-72 overflow-y-auto">
              {data.pendingRentalFiles.length === 0 ? (
                <p className="text-sm text-neutral-400 py-4 text-center">Aucun dossier en attente</p>
              ) : (
                data.pendingRentalFiles.map((rf) => (
                  <div key={rf.id} className="flex items-center justify-between p-3 rounded-lg border border-neutral-100 hover:bg-neutral-50">
                    <div className="flex items-center gap-3">
                      <FileText className="size-4 text-neutral-400" />
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{rf.tenant.firstName} {rf.tenant.lastName}</p>
                        <p className="text-xs text-neutral-500">{rf.documents.length} document(s)</p>
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
          <Card className="border-neutral-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Documents propriétaire en attente</CardTitle>
              <CardDescription>Titres et attestations à vérifier</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-72 overflow-y-auto">
              {data.pendingOwnershipDocs.length === 0 ? (
                <p className="text-sm text-neutral-400 py-4 text-center">Aucun document en attente</p>
              ) : (
                data.pendingOwnershipDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-neutral-100 hover:bg-neutral-50">
                    <div className="flex items-center gap-3">
                      <BadgeCheck className="size-4 text-neutral-400" />
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{doc.name}</p>
                        <p className="text-xs text-neutral-500">{doc.owner.firstName} {doc.owner.lastName}</p>
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
