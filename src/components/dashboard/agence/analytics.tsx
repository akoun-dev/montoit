'use client'

import { useEffect, useState, useCallback } from 'react'
import { BarChart3, TrendingUp, Users, Building2, Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface AgenceData {
  stats: {
    totalProperties: number; activeProperties: number; activeMandats: number
    activeLeases: number; totalAgents: number; totalCommissions: number
    totalRevenue: number; pendingVisits: number
  }
  agents: Array<{
    id: string; firstName: string; lastName: string; email: string; role: string
    assignedPropertiesCount: number; totalCommissions: number
  }>
  properties: Array<{ id: string; title: string; viewsCount: number; status: string }>
}

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

const trendData = [
  { month: 'Jan', properties: 5, visits: 12, leases: 2 },
  { month: 'Fév', properties: 6, visits: 15, leases: 3 },
  { month: 'Mar', properties: 7, visits: 18, leases: 2 },
  { month: 'Avr', properties: 8, visits: 22, leases: 4 },
  { month: 'Mai', properties: 9, visits: 20, leases: 3 },
  { month: 'Jun', properties: 10, visits: 25, leases: 5 },
]

export function AgenceAnalytics() {
  const { isAuthenticated } = useAuthStore()
  const [data, setData] = useState<AgenceData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const d = await authFetch<AgenceData>('/api/dashboard/agence')
      setData(d)
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) return
    } finally { setLoading(false) }
  }, [isAuthenticated])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}</div>

  const stats = data?.stats
  const occupancyRate = stats && stats.totalProperties > 0 ? Math.round((stats.activeLeases / stats.totalProperties) * 100) : 0
  const maxVisits = Math.max(...trendData.map((d) => d.visits), 1)
  const maxProperties = Math.max(...trendData.map((d) => d.properties), 1)

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="size-6 text-[#FF6C2F]" /> Analytics
          </h1>
          <p className="text-muted-foreground mt-1">Performance et tendances de votre agence</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1" onClick={() => toast.info('Export en cours...')}>
          <Download className="size-3" /> Exporter
        </Button>
      </motion.div>

      {/* Performance Metrics */}
      <motion.div variants={itemVariants} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-orange-50"><Building2 className="size-5 text-[#FF6C2F]" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Taux d&apos;occupation</p>
                <p className="text-xl font-bold text-foreground">{occupancyRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-green-50"><TrendingUp className="size-5 text-green-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Biens actifs</p>
                <p className="text-xl font-bold text-foreground">{stats?.activeProperties ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-amber-50"><Users className="size-5 text-amber-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Visites ce mois</p>
                <p className="text-xl font-bold text-foreground">{stats?.pendingVisits ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-teal-50"><BarChart3 className="size-5 text-teal-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Commissions</p>
                <p className="text-xl font-bold text-foreground">{(stats?.totalCommissions ?? 0).toLocaleString('fr-FR')} FCFA</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Monthly Trends */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Tendances mensuelles</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 h-40">
              {trendData.map((d) => (
                <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col items-center gap-0.5">
                    <div className="w-full rounded-t bg-[#FF6C2F]/80" style={{ height: `${(d.properties / maxProperties) * 60}px` }} title={`${d.properties} biens`} />
                    <div className="w-full rounded-t bg-[#FF6C2F]/40" style={{ height: `${(d.visits / maxVisits) * 60}px` }} title={`${d.visits} visites`} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{d.month}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-3 justify-center">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-[#FF6C2F]/80" /><span className="text-[10px] text-muted-foreground">Biens</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-[#FF6C2F]/40" /><span className="text-[10px] text-muted-foreground">Visites</span></div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Agent Comparison */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Comparaison des agents</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Biens assignés</TableHead>
                  <TableHead>Commissions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.agents ?? []).length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Aucun agent</TableCell></TableRow>
                ) : (
                  data!.agents.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.firstName} {a.lastName}</TableCell>
                      <TableCell><Badge className="bg-orange-50 text-orange-700 text-[10px]">{a.role}</Badge></TableCell>
                      <TableCell>{a.assignedPropertiesCount}</TableCell>
                      <TableCell className="font-semibold text-[#FF6C2F]">{a.totalCommissions.toLocaleString('fr-FR')} FCFA</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* Market Insights */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Insights marché</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-orange-50 border border-orange-100">
              <p className="text-xs text-muted-foreground">Prix moyen / bien</p>
              <p className="text-lg font-bold text-foreground">150 000 FCFA</p>
              <p className="text-[10px] text-green-600">↑ 5% vs mois dernier</p>
            </div>
            <div className="p-3 rounded-lg bg-green-50 border border-green-100">
              <p className="text-xs text-muted-foreground">Demande locative</p>
              <p className="text-lg font-bold text-foreground">Élevée</p>
              <p className="text-[10px] text-green-600">+12 visites cette semaine</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
              <p className="text-xs text-muted-foreground">Taux de conversion</p>
              <p className="text-lg font-bold text-foreground">24%</p>
              <p className="text-[10px] text-amber-600">Visite → bail signé</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
