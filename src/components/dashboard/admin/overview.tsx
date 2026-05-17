'use client'

import { useEffect, useState, useCallback } from 'react'
import { Users, Building2, FileSignature, AlertTriangle, TrendingUp, DollarSign, Shield, Activity, Flag, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  signalements: {
    byStatus: Record<string, number>
    pendingCount: number
  }
  monthlyNewUsers: Array<{ month: string; count: number }>
  systemHealth: { database: string; api: string; storage: string }
  errorRate: number
  failedLogins: number
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
  signalements?: {
    byStatus?: Record<string, number>
    pendingCount?: number
  }
  monthlyNewUsers?: Array<{ month: string; count: number }>
  systemHealth?: { database: string; api: string; storage: string }
  errorRate?: number
  failedLogins?: number
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
  signalements: { byStatus: {}, pendingCount: 0 },
  monthlyNewUsers: [],
  systemHealth: { database: 'OK', api: 'OK', storage: 'OK' },
  errorRate: 0,
  failedLogins: 0,
  recentUsers: [],
  disputes: [],
}

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }
const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

function RoleBadge({ role }: { role: string }) {
  const config: Record<string, { label: string; className: string }> = {
    LOCATAIRE: { label: 'Locataire', className: 'bg-teal-100 text-teal-700' },
    PROPRIETAIRE: { label: 'Propriétaire', className: 'bg-green-100 text-green-700' },
    TIERS_CONFIANCE: { label: 'TC', className: 'bg-amber-100 text-amber-700' },
    ADMIN: { label: 'Admin', className: 'bg-rose-100 text-rose-700' },
    AGENCE: { label: 'Agence', className: 'bg-orange-100 text-orange-700' },
  }
  const c = config[role] || { label: role, className: 'bg-neutral-100 text-neutral-700' }
  return <Badge className={c.className}>{c.label}</Badge>
}

const monthLabels: Record<string, string> = {
  '01': 'Jan', '02': 'Fév', '03': 'Mar', '04': 'Avr', '05': 'Mai', '06': 'Juin',
  '07': 'Juil', '08': 'Août', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Déc',
}

export function AdminOverview() {
  const { user, isAuthenticated, setDashboardSection } = useAuthStore()
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
        signalements: { ...defaultData.signalements, ...d.signalements },
        monthlyNewUsers: d.monthlyNewUsers ?? [],
        systemHealth: d.systemHealth ?? defaultData.systemHealth,
        errorRate: d.errorRate ?? 0,
        failedLogins: d.failedLogins ?? 0,
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

  if (loading) return <div className="space-y-4">{[1, 2, 3, 4].map((i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}</div>

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
    { label: 'Utilisateurs', value: data.stats.totalUsers, icon: Users, color: 'text-teal-600 bg-teal-50' },
    { label: 'Biens immobiliers', value: data.stats.totalProperties, icon: Building2, color: 'text-green-600 bg-green-50' },
    { label: 'Baux actifs', value: data.stats.totalLeases, icon: FileSignature, color: 'text-orange-600 bg-orange-50' },
    { label: 'Litiges ouverts', value: data.stats.totalDisputes, icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
    { label: 'Signalements en attente', value: data.signalements.pendingCount, icon: Flag, color: 'text-amber-600 bg-amber-50' },
    { label: 'Revenus mensuels', value: `${(data.stats.totalRevenue / 1000).toFixed(0)}K FCFA`, icon: DollarSign, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Tentatives échouées', value: data.failedLogins, icon: Shield, color: 'text-rose-600 bg-rose-50' },
    { label: 'Taux d\'erreur', value: `${data.errorRate}%`, icon: Activity, color: 'text-purple-600 bg-purple-50' },
  ]

  const roleLabels: Record<string, string> = {
    LOCATAIRE: 'Locataires',
    PROPRIETAIRE: 'Propriétaires',
    TIERS_CONFIANCE: 'Tiers de Confiance',
    ADMIN: 'Administrateurs',
    AGENCE: 'Agences',
  }

  const maxBarValue = Math.max(...data.monthlyNewUsers.map((m) => m.count), 1)

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-foreground">Tableau de bord Admin</h1>
        <p className="text-muted-foreground mt-1">Vue d&apos;ensemble de la plateforme Mon Toit</p>
      </motion.div>

      {/* KPIs */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
                    <p className="text-xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </motion.div>

      {/* Alertes et actions urgentes */}
      {(data.signalements.pendingCount > 0 || data.stats.totalDisputes > 0 || data.failedLogins > 5) && (
        <motion.div variants={itemVariants}>
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-amber-800 flex items-center gap-2">
                <AlertTriangle className="size-5 text-amber-600" />
                Alertes et actions urgentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.signalements.pendingCount > 0 && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-amber-100">
                  <span className="text-sm text-amber-700">{data.signalements.pendingCount} signalement(s) en attente de traitement</span>
                  <Button variant="outline" size="sm" className="text-amber-700 border-amber-200 hover:bg-amber-50" onClick={() => setDashboardSection('signalements')}>Voir <ArrowRight className="size-3 ml-1" /></Button>
                </div>
              )}
              {data.stats.totalDisputes > 0 && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-amber-100">
                  <span className="text-sm text-amber-700">{data.stats.totalDisputes} litige(s) ouvert(s)</span>
                  <Button variant="outline" size="sm" className="text-amber-700 border-amber-200 hover:bg-amber-50" onClick={() => setDashboardSection('disputes')}>Voir <ArrowRight className="size-3 ml-1" /></Button>
                </div>
              )}
              {data.failedLogins > 5 && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-amber-100">
                  <span className="text-sm text-amber-700">{data.failedLogins} tentatives de connexion échouées</span>
                  <Button variant="outline" size="sm" className="text-amber-700 border-amber-200 hover:bg-amber-50" onClick={() => setDashboardSection('security')}>Voir <ArrowRight className="size-3 ml-1" /></Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Actions rapides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button className="bg-[#FF6C2F] hover:bg-[#e55f28] text-white gap-2" onClick={() => setDashboardSection('users')}>
                <Users className="size-4" /> Gérer utilisateurs
              </Button>
              <Button variant="outline" className="gap-2 border-orange-200 text-orange-700 hover:bg-orange-50" onClick={() => setDashboardSection('moderation')}>
                <Shield className="size-4" /> Modérer contenu
              </Button>
              <Button variant="outline" className="gap-2 border-amber-200 text-amber-700 hover:bg-amber-50" onClick={() => setDashboardSection('signalements')}>
                <Flag className="size-4" /> Voir signalements
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly User Growth Chart */}
        <motion.div variants={itemVariants}>
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Croissance mensuelle</CardTitle>
              <CardDescription>Nouveaux utilisateurs par mois</CardDescription>
            </CardHeader>
            <CardContent>
              {data.monthlyNewUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Aucune donnée</p>
              ) : (
                <div className="flex items-end gap-2 h-40">
                  {data.monthlyNewUsers.map((m) => {
                    const monthPart = m.month.split('-')[1]
                    const label = monthLabels[monthPart] || monthPart
                    const height = maxBarValue > 0 ? (m.count / maxBarValue) * 100 : 0
                    return (
                      <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs font-medium text-foreground">{m.count}</span>
                        <div
                          className="w-full rounded-t-md bg-[#FF6C2F] transition-all duration-500"
                          style={{ height: `${Math.max(height, 4)}%` }}
                        />
                        <span className="text-xs text-muted-foreground">{label}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

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
      </div>

      {/* System Health */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="size-5 text-green-600" />
              Santé du système
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(data.systemHealth).map(([key, value]) => (
                <div key={key} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                  <div className={`size-3 rounded-full ${value === 'OK' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <div>
                    <p className="text-sm font-medium text-foreground capitalize">{key === 'api' ? 'API' : key === 'db' ? 'Base de données' : key}</p>
                    <p className="text-xs text-muted-foreground">{value === 'OK' ? 'Opérationnel' : value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

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
                        <td className="py-2 px-3 text-muted-foreground">{u.phone || '—'}</td>
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
