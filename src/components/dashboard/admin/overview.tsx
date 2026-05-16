'use client'

import { useEffect, useState, useCallback } from 'react'
import { Users, Building2, FileSignature, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'

interface AdminData {
  stats: {
    totalUsers: number
    totalProperties: number
    totalLeases: number
    totalDisputes: number
    totalRevenue: number
    usersByRole: Record<string, number>
  }
  recentUsers: Array<{
    id: string; firstName: string; lastName: string; phone: string; role: string; isActive: boolean; createdAt: string
  }>
  disputes: Array<{
    id: string; type: string; description: string; status: string; createdAt: string
    reportedBy: { firstName: string; lastName: string }
    lease: { property: { title: string } }
  }>
}

interface ApiAdminResponse {
  stats?: {
    totalUsers?: number
    totalProperties?: number
    totalLeases?: number
    totalDisputes?: number
    totalRevenue?: number
    usersByRole?: Record<string, number>
  }
  recentUsers?: Array<{
    id: string; firstName: string; lastName: string; phone: string; role: string; isActive: boolean; createdAt: string
  }>
  disputes?: Array<{
    id: string; type: string; description: string; status: string; createdAt: string
    reportedBy: { firstName: string; lastName: string }
    lease: { property: { title: string } }
  }>
}

const defaultData: AdminData = {
  stats: { totalUsers: 0, totalProperties: 0, totalLeases: 0, totalDisputes: 0, totalRevenue: 0, usersByRole: {} },
  recentUsers: [],
  disputes: [],
}

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }
const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

function RoleBadge({ role }: { role: string }) {
  const config: Record<string, { label: string; className: string }> = {
    LOCATAIRE: { label: 'Locataire', className: 'bg-blue-100 text-blue-700' },
    PROPRIETAIRE: { label: 'Propriétaire', className: 'bg-green-100 text-green-700' },
    TIERS_CONFIANCE: { label: 'TC', className: 'bg-amber-100 text-amber-700' },
    ADMIN: { label: 'Admin', className: 'bg-purple-100 text-purple-700' },
    AGENCE: { label: 'Agence', className: 'bg-teal-100 text-teal-700' },
  }
  const c = config[role] || { label: role, className: 'bg-neutral-100 text-neutral-700' }
  return <Badge className={c.className}>{c.label}</Badge>
}

export function AdminOverview() {
  const { user, isAuthenticated } = useAuthStore()
  const [data, setData] = useState<AdminData>(defaultData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      const d = await authFetch<ApiAdminResponse>('/api/dashboard/admin')
      setData({
        stats: { ...defaultData.stats, ...d.stats },
        recentUsers: d.recentUsers ?? [],
        disputes: d.disputes ?? [],
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
        <h1 className="text-2xl font-bold text-foreground">Tableau de bord Admin</h1>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm text-amber-700">Impossible de charger les données. Veuillez réessayer.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const stats = [
    { label: 'Utilisateurs', value: data.stats.totalUsers, icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: 'Biens immobiliers', value: data.stats.totalProperties, icon: Building2, color: 'text-green-600 bg-green-50' },
    { label: 'Baux', value: data.stats.totalLeases, icon: FileSignature, color: 'text-brand-600 bg-brand-50' },
    { label: 'Litiges ouverts', value: data.stats.totalDisputes, icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
  ]

  const roleLabels: Record<string, string> = {
    LOCATAIRE: 'Locataires',
    PROPRIETAIRE: 'Propriétaires',
    TIERS_CONFIANCE: 'Tiers de Confiance',
    ADMIN: 'Administrateurs',
    AGENCE: 'Agences',
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-foreground">Tableau de bord Admin</h1>
        <p className="text-muted-foreground mt-1">Vue d&apos;ensemble de la plateforme Mon Toit</p>
      </motion.div>

      {/* KPIs */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="border-border">
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

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Users by Role */}
        <motion.div variants={itemVariants}>
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Répartition des utilisateurs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(data.stats.usersByRole).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Aucune donnée</p>
              ) : (
                Object.entries(data.stats.usersByRole).map(([role, count]) => (
                  <div key={role} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <RoleBadge role={role} />
                      <span className="text-sm text-foreground">{roleLabels[role] || role}</span>
                    </div>
                    <span className="text-lg font-bold text-foreground">{count}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Revenue */}
        <motion.div variants={itemVariants}>
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Revenus mensuels</CardTitle>
              <CardDescription>Somme des loyers actifs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex size-12 items-center justify-center rounded-lg bg-brand-50">
                  <DollarSign className="size-6 text-brand-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground">
                    {data.stats.totalRevenue.toLocaleString('fr-FR')}
                  </p>
                  <p className="text-sm text-muted-foreground">FCFA / mois</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Users */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Utilisateurs récents</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Aucun utilisateur récent</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Nom</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Téléphone</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Rôle</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Statut</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Inscrit le</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentUsers.map((u) => (
                      <tr key={u.id} className="border-b border-border hover:bg-accent">
                        <td className="py-2 px-3 font-medium text-foreground">{u.firstName} {u.lastName}</td>
                        <td className="py-2 px-3 text-muted-foreground">{u.phone}</td>
                        <td className="py-2 px-3"><RoleBadge role={u.role} /></td>
                        <td className="py-2 px-3">
                          <Badge className={u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                            {u.isActive ? 'Actif' : 'Inactif'}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">{new Date(u.createdAt).toLocaleDateString('fr-FR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
