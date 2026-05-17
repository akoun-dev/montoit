'use client'

import { useCallback, useEffect, useState } from 'react'
import { Activity, Database, Server, HardDrive, Users, Building2, FileSignature, DollarSign, Wifi } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'

interface SystemData {
  stats: {
    totalUsers: number
    totalProperties: number
    totalLeases: number
    totalDisputes: number
    totalSignalements: number
    connectionLogsCount: number
    failedLogins: number
  }
  revenueByMonth: Record<string, number>
  monthlyNewUsers: Record<string, number>
  recentConnections: Array<{
    id: string
    ipAddress: string | null
    device: string | null
    createdAt: string
    user: { firstName: string; lastName: string; email: string }
  }>
  recentFailedLogins: Array<{
    id: string
    action: string
    details: string | null
    createdAt: string
    user: { firstName: string; lastName: string; email: string }
  }>
  systemHealth: { database: string; api: string; storage: string }
}

const monthLabels: Record<string, string> = {
  '01': 'Jan', '02': 'Fév', '03': 'Mar', '04': 'Avr', '05': 'Mai', '06': 'Juin',
  '07': 'Juil', '08': 'Août', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Déc',
}

export function AdminSystem() {
  const { isAuthenticated } = useAuthStore()
  const [data, setData] = useState<SystemData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }

    try {
      const d = await authFetch<SystemData>('/api/admin/system')
      setData(d)
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) return
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}</div>

  const s = data?.stats || { totalUsers: 0, totalProperties: 0, totalLeases: 0, totalDisputes: 0, totalSignalements: 0, connectionLogsCount: 0, failedLogins: 0 }
  const revenueByMonth = data?.revenueByMonth || {}
  const recentConnections = data?.recentConnections || []
  const recentFailedLogins = data?.recentFailedLogins || []
  const systemHealth = data?.systemHealth || { database: 'OK', api: 'OK', storage: 'OK' }

  const maxRevenue = Math.max(...Object.values(revenueByMonth), 1)

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Système</h1>
        <p className="text-muted-foreground mt-1">Métriques et état du système</p>
      </div>

      {/* Core Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Utilisateurs', value: s.totalUsers, icon: Users, color: 'text-teal-600 bg-teal-50' },
          { label: 'Biens', value: s.totalProperties, icon: Building2, color: 'text-green-600 bg-green-50' },
          { label: 'Baux', value: s.totalLeases, icon: FileSignature, color: 'text-orange-600 bg-orange-50' },
          { label: 'Revenus', value: `${(Object.values(revenueByMonth).reduce((a, b) => a + b, 0) / 1000000).toFixed(1)}M`, icon: DollarSign, color: 'text-emerald-600 bg-emerald-50', unit: 'FCFA' },
        ].map((stat) => {
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
                    <p className="text-xs text-muted-foreground">{stat.label}{stat.unit ? ` (${stat.unit})` : ''}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Service Status */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Server className="size-5 text-green-600" />
            État des services
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {[
              { key: 'Base de données', value: systemHealth.database, icon: Database },
              { key: 'API', value: systemHealth.api, icon: Wifi },
              { key: 'Stockage', value: systemHealth.storage, icon: HardDrive },
            ].map((service) => {
              const Icon = service.icon
              return (
                <div key={service.key} className="flex items-center gap-3 p-4 rounded-lg border border-border">
                  <Icon className={`size-5 ${service.value === 'OK' ? 'text-green-600' : 'text-red-600'}`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{service.key}</p>
                    <div className="flex items-center gap-2">
                      <div className={`size-2 rounded-full ${service.value === 'OK' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-xs text-muted-foreground">{service.value === 'OK' ? 'Opérationnel' : service.value}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Activity Chart */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Activité mensuelle</CardTitle>
          <CardDescription>Revenus par mois (FCFA)</CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(revenueByMonth).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Aucune donnée</p>
          ) : (
            <div className="flex items-end gap-2 h-40">
              {Object.entries(revenueByMonth).map(([month, amount]) => {
                const monthPart = month.split('-')[1]
                const label = monthLabels[monthPart] || monthPart
                const height = maxRevenue > 0 ? (amount / maxRevenue) * 100 : 0
                return (
                  <div key={month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-medium text-foreground">{(amount / 1000).toFixed(0)}K</span>
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

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Connection Logs */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="size-5 text-teal-600" />
              Connexions récentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recentConnections.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Aucune connexion récente</p>
              ) : (
                recentConnections.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-2 rounded border border-border text-sm">
                    <div>
                      <p className="font-medium text-foreground">{log.user.firstName} {log.user.lastName}</p>
                      <p className="text-xs text-muted-foreground">{log.ipAddress || '—'} · {log.device || '—'}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString('fr-FR')}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Failed Login Attempts */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="size-5 text-red-600" />
              Tentatives de connexion échouées
            </CardTitle>
            <Badge className="bg-red-100 text-red-700 w-fit">{s.failedLogins} au total</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recentFailedLogins.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Aucune tentative échouée</p>
              ) : (
                recentFailedLogins.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-2 rounded border border-red-100 bg-red-50/50 text-sm">
                    <div>
                      <p className="font-medium text-foreground">{log.user.firstName} {log.user.lastName}</p>
                      <p className="text-xs text-muted-foreground">{log.user.email}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString('fr-FR')}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resource Usage (Simulated) */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <HardDrive className="size-5 text-amber-600" />
            Utilisation des ressources
          </CardTitle>
          <CardDescription>Données simulées</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: 'CPU', value: 23, color: 'bg-green-500' },
              { label: 'Mémoire', value: 45, color: 'bg-amber-500' },
              { label: 'Disque', value: 32, color: 'bg-teal-500' },
            ].map((resource) => (
              <div key={resource.label} className="p-4 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">{resource.label}</span>
                  <span className="text-sm font-bold text-foreground">{resource.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className={`h-2 rounded-full ${resource.color} transition-all duration-500`} style={{ width: `${resource.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
