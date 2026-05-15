'use client'

import { useEffect, useState } from 'react'
import { Building2, Eye, FileSignature, TrendingUp, FileText, ClipboardCheck } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/lib/auth-store'
import { motion } from 'framer-motion'

interface ProprietaireData {
  stats: {
    totalProperties: number
    activeProperties: number
    pendingVisits: number
    activeLeases: number
    totalRevenue: number
  }
  properties: Array<{
    id: string; title: string; type: string; price: number; city: string; status: string; bedrooms: number | null; area: number
    images: Array<{ url: string }>
  }>
  visitRequests: Array<{
    id: string; status: string; createdAt: string; requestedDate: string; timeSlot: string
    tenant: { firstName: string; lastName: string; phone: string }
    property: { title: string; city: string }
  }>
  activeLeases: Array<{
    id: string; status: string; monthlyRent: number; startDate: string; endDate: string
    tenant: { firstName: string; lastName: string }
    property: { title: string }
  }>
}

const defaultData: ProprietaireData = {
  stats: { totalProperties: 0, activeProperties: 0, pendingVisits: 0, activeLeases: 0, totalRevenue: 0 },
  properties: [],
  visitRequests: [],
  activeLeases: [],
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export function ProprietaireOverview() {
  const { user, logout } = useAuthStore()
  const [data, setData] = useState<ProprietaireData>(defaultData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/dashboard/proprietaire')
      .then((r) => {
        if (r.status === 401) {
          logout()
          return null
        }
        if (!r.ok) throw new Error(`Erreur ${r.status}`)
        return r.json()
      })
      .then((d) => {
        if (!d) return
        setData({
          stats: d.stats ?? defaultData.stats,
          properties: d.properties ?? [],
          visitRequests: d.visitRequests ?? [],
          activeLeases: d.activeLeases ?? [],
        })
      })
      .catch((err) => {
        console.error('Proprietaire dashboard error:', err)
        setError(err.message)
        setData(defaultData)
      })
      .finally(() => setLoading(false))
  }, [logout])

  if (loading) return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-neutral-100 animate-pulse" />)}</div>

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-neutral-900">Bonjour, {user?.firstName} 👋</h1>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm text-amber-700">Impossible de charger vos données. Veuillez réessayer.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const stats = [
    { label: 'Biens totaux', value: data.stats.totalProperties, icon: Building2, color: 'text-blue-600 bg-blue-50' },
    { label: 'Biens actifs', value: data.stats.activeProperties, icon: TrendingUp, color: 'text-green-600 bg-green-50' },
    { label: 'Visites en attente', value: data.stats.pendingVisits, icon: Eye, color: 'text-amber-600 bg-amber-50' },
    { label: 'Revenus mensuels', value: `${(data.stats.totalRevenue / 1000).toFixed(0)}k`, icon: FileSignature, color: 'text-brand-600 bg-brand-50' },
  ]

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-neutral-900">Bonjour, {user?.firstName} 👋</h1>
        <p className="text-neutral-500 mt-1">Voici un aperçu de votre espace propriétaire</p>
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
        {/* Recent Properties */}
        <motion.div variants={itemVariants}>
          <Card className="border-neutral-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Mes biens récents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-64 overflow-y-auto">
              {data.properties.length === 0 ? (
                <p className="text-sm text-neutral-400 py-4 text-center">Aucun bien pour le moment</p>
              ) : (
                data.properties.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-neutral-100 hover:bg-neutral-50">
                    <div className="flex items-center gap-3">
                      {p.images?.[0] ? (
                        <img src={p.images[0].url} alt="" className="size-10 rounded-lg object-cover" />
                      ) : (
                        <div className="size-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                          <Building2 className="size-4 text-neutral-400" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{p.title}</p>
                        <p className="text-xs text-neutral-500">{p.city} · {p.price.toLocaleString('fr-FR')} FCFA</p>
                      </div>
                    </div>
                    <Badge className={p.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-600'}>
                      {p.status === 'ACTIVE' ? 'Actif' : p.status}
                    </Badge>
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
            </CardHeader>
            <CardContent className="space-y-3 max-h-64 overflow-y-auto">
              {data.visitRequests.length === 0 ? (
                <p className="text-sm text-neutral-400 py-4 text-center">Aucune demande</p>
              ) : (
                data.visitRequests.slice(0, 5).map((vr) => (
                  <div key={vr.id} className="flex items-center justify-between p-3 rounded-lg border border-neutral-100 hover:bg-neutral-50">
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{vr.tenant.firstName} {vr.tenant.lastName}</p>
                      <p className="text-xs text-neutral-500">{vr.property.title} · {new Date(vr.requestedDate).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <Badge className={vr.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}>
                      {vr.status === 'PENDING' ? 'En attente' : vr.status === 'ACCEPTED' ? 'Accepté' : vr.status}
                    </Badge>
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
