'use client'

import { useEffect, useState } from 'react'
import { FileText, Eye, FileSignature, MessageSquare, TrendingUp, Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/lib/auth-store'
import { motion } from 'framer-motion'

interface DashboardData {
  stats: {
    totalRentalFiles: number
    activeLeases: number
    pendingVisits: number
    unreadMessages: number
  }
  rentalFiles: Array<{
    id: string
    status: string
    monthlyIncome: number | null
    createdAt: string
    documents: Array<{ status: string }>
  }>
  visitRequests: Array<{
    id: string
    status: string
    requestedDate: string
    timeSlot: string
    property: { title: string; city: string; images: Array<{ url: string }> }
  }>
  activeLeases: Array<{
    id: string
    monthlyRent: number
    startDate: string
    endDate: string
    property: { title: string; images: Array<{ url: string }> }
    owner: { firstName: string; lastName: string }
  }>
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    DRAFT: { label: 'Brouillon', className: 'bg-neutral-100 text-neutral-700' },
    SUBMITTED: { label: 'Soumis', className: 'bg-blue-100 text-blue-700' },
    TC_REVIEW: { label: 'En revue TC', className: 'bg-amber-100 text-amber-700' },
    VALIDATED: { label: 'Validé', className: 'bg-green-100 text-green-700' },
    REJECTED: { label: 'Rejeté', className: 'bg-red-100 text-red-700' },
    PENDING: { label: 'En attente', className: 'bg-amber-100 text-amber-700' },
    ACCEPTED: { label: 'Accepté', className: 'bg-green-100 text-green-700' },
    COMPLETED: { label: 'Complété', className: 'bg-blue-100 text-blue-700' },
    ACTIVE: { label: 'Actif', className: 'bg-green-100 text-green-700' },
  }
  const c = config[status] || { label: status, className: 'bg-neutral-100 text-neutral-700' }
  return <Badge className={c.className}>{c.label}</Badge>
}

export function LocataireOverview() {
  const { user } = useAuthStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/locataire')
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-neutral-100 animate-pulse" />
        ))}
      </div>
    )
  }

  if (!data) return <p className="text-neutral-500">Erreur de chargement</p>

  const stats = [
    { label: 'Dossiers locatifs', value: data.stats.totalRentalFiles, icon: FileText, color: 'text-blue-600 bg-blue-50' },
    { label: 'Baux actifs', value: data.stats.activeLeases, icon: FileSignature, color: 'text-green-600 bg-green-50' },
    { label: 'Visites en attente', value: data.stats.pendingVisits, icon: Eye, color: 'text-amber-600 bg-amber-50' },
    { label: 'Messages non lus', value: data.stats.unreadMessages, icon: MessageSquare, color: 'text-brand-600 bg-brand-50' },
  ]

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Welcome */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-neutral-900">
          Bonjour, {user?.firstName} 👋
        </h1>
        <p className="text-neutral-500 mt-1">Voici un aperçu de votre espace locataire</p>
      </motion.div>

      {/* Stats */}
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

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Rental Files */}
        <motion.div variants={itemVariants}>
          <Card className="border-neutral-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Mes dossiers locatifs</CardTitle>
              <CardDescription>Suivi de vos dossiers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-64 overflow-y-auto">
              {data.rentalFiles.length === 0 ? (
                <p className="text-sm text-neutral-400 py-4 text-center">Aucun dossier pour le moment</p>
              ) : (
                data.rentalFiles.map((rf) => (
                  <div key={rf.id} className="flex items-center justify-between p-3 rounded-lg border border-neutral-100 hover:bg-neutral-50">
                    <div className="flex items-center gap-3">
                      <FileText className="size-4 text-neutral-400" />
                      <div>
                        <p className="text-sm font-medium text-neutral-900">
                          Dossier du {new Date(rf.createdAt).toLocaleDateString('fr-FR')}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {rf.documents.length} document(s)
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={rf.status} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Visit Requests */}
        <motion.div variants={itemVariants}>
          <Card className="border-neutral-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Demandes de visite</CardTitle>
              <CardDescription>Vos visites planifiées</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-64 overflow-y-auto">
              {data.visitRequests.length === 0 ? (
                <p className="text-sm text-neutral-400 py-4 text-center">Aucune visite pour le moment</p>
              ) : (
                data.visitRequests.map((vr) => (
                  <div key={vr.id} className="flex items-center justify-between p-3 rounded-lg border border-neutral-100 hover:bg-neutral-50">
                    <div className="flex items-center gap-3">
                      <Eye className="size-4 text-neutral-400" />
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{vr.property.title}</p>
                        <p className="text-xs text-neutral-500">
                          {new Date(vr.requestedDate).toLocaleDateString('fr-FR')} — {vr.timeSlot}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={vr.status} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Active Leases */}
      {data.activeLeases.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-neutral-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Baux actifs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.activeLeases.map((lease) => (
                <div key={lease.id} className="flex items-center justify-between p-4 rounded-lg border border-neutral-100 hover:bg-neutral-50">
                  <div className="flex items-center gap-4">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-green-50">
                      <FileSignature className="size-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{lease.property.title}</p>
                      <p className="text-xs text-neutral-500">
                        Propriétaire : {lease.owner.firstName} {lease.owner.lastName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-neutral-900">
                      {lease.monthlyRent.toLocaleString('fr-FR')} FCFA/mois
                    </p>
                    <p className="text-xs text-neutral-500">
                      jusqu&apos;au {new Date(lease.endDate).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}
