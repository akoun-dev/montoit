'use client'

import { useEffect, useState, useCallback } from 'react'
import { TrendingUp, CreditCard, Clock, DollarSign, Receipt } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { useRealtimePayments } from '@/hooks/use-realtime-payments'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface Commission {
  id: string; amount: number; rate: number; status: string; description: string | null; paidAt: string | null; createdAt: string
  agent: { id: string; firstName: string; lastName: string; email: string; role: string }
  mandat: { id: string; commissionRate: number; property: { title: string } } | null
}

interface AgenceData {
  stats: { totalRevenue: number; totalCommissions: number; paidCommissions: number; pendingCommissions: number; latePaymentsCount: number }
  commissions: Commission[]
  activeLeases: Array<{ id: string; status: string; monthlyRent: number; startDate: string; endDate: string; tenant: { firstName: string; lastName: string }; property: { title: string } }>
}

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

const monthlyData = [
  { month: 'Jan', revenue: 1200000 }, { month: 'Fév', revenue: 1350000 },
  { month: 'Mar', revenue: 1280000 }, { month: 'Avr', revenue: 1420000 },
  { month: 'Mai', revenue: 1380000 }, { month: 'Jun', revenue: 0 },
]

export function AgenceFinances() {
  const { isAuthenticated, user } = useAuthStore()
  const [data, setData] = useState<AgenceData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const d = await authFetch<AgenceData>('/api/dashboard/agence')
      setData(d)
      // Update monthly data with current revenue
      if (d.stats.totalRevenue > 0) {
        monthlyData[5].revenue = d.stats.totalRevenue
      }
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) return
    } finally { setLoading(false) }
  }, [isAuthenticated])

  // Track lease IDs for Realtime filtering
  const leaseIds = (data?.activeLeases ?? []).map(l => l.id)

  // Realtime subscription
  useRealtimePayments({
    userId: user?.id,
    leaseIds,
    onPaymentChange: () => { fetchData() },
  })

  const markAsPaid = async (commissionId: string) => {
    try {
      await authFetch('/api/agence/commissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commissionId }),
      })
      toast.success('Commission marquée comme payée')
      fetchData()
    } catch (err) {
      if (err instanceof AuthError) toast.error(err.message)
      else toast.error('Erreur lors du paiement')
    }
  }

  if (loading) return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}</div>

  const stats = data?.stats ?? { totalRevenue: 0, totalCommissions: 0, paidCommissions: 0, pendingCommissions: 0, latePaymentsCount: 0 }
  const commissions = data?.commissions ?? []

  const maxRevenue = Math.max(...monthlyData.map((d) => d.revenue), 1)

  // Commission by agent
  const agentCommissions: Record<string, { name: string; total: number; pending: number; paid: number }> = {}
  commissions.forEach((c) => {
    const key = c.agent.id
    if (!agentCommissions[key]) {
      agentCommissions[key] = { name: `${c.agent.firstName} ${c.agent.lastName}`, total: 0, pending: 0, paid: 0 }
    }
    agentCommissions[key].total += c.amount
    if (c.status === 'PAID') agentCommissions[key].paid += c.amount
    else agentCommissions[key].pending += c.amount
  })

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="size-5 sm:size-6 text-[#FF6C2F]" /> Finances
        </h1>
        <p className="text-muted-foreground mt-1">Suivi de vos revenus et commissions</p>
      </motion.div>

      {/* Revenue Cards */}
      <motion.div variants={itemVariants} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-green-50"><DollarSign className="size-5 text-green-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Total encaissements</p>
                <p className="text-lg font-bold text-foreground">{stats.totalRevenue.toLocaleString('fr-FR')} FCFA</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-orange-50"><CreditCard className="size-5 text-[#FF6C2F]" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Commissions totales</p>
                <p className="text-lg font-bold text-foreground">{stats.totalCommissions.toLocaleString('fr-FR')} FCFA</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-amber-50"><Clock className="size-5 text-amber-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Paiements en attente</p>
                <p className="text-lg font-bold text-foreground">{stats.pendingCommissions.toLocaleString('fr-FR')} FCFA</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-50"><Receipt className="size-5 text-emerald-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Commissions payées</p>
                <p className="text-lg font-bold text-foreground">{stats.paidCommissions.toLocaleString('fr-FR')} FCFA</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Monthly Revenue Chart */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Revenus mensuels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-40">
              {monthlyData.map((d) => (
                <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-md bg-[#FF6C2F] transition-all min-h-[4px]"
                    style={{ height: `${Math.max((d.revenue / maxRevenue) * 120, 4)}px` }}
                  />
                  <span className="text-[10px] text-muted-foreground">{d.month}</span>
                  {d.revenue > 0 && (
                    <span className="text-[9px] text-muted-foreground">{(d.revenue / 1000).toFixed(0)}k</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Commission by Agent */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Commissions par agent</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(agentCommissions).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune commission à afficher</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(agentCommissions).map(([id, ac]) => (
                  <div key={id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-lg border border-border gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{ac.name}</p>
                      <p className="text-xs text-muted-foreground">Total : {ac.total.toLocaleString('fr-FR')} FCFA</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-emerald-50 text-emerald-700 text-[10px]">Payé : {ac.paid.toLocaleString('fr-FR')}</Badge>
                      <Badge className="bg-amber-50 text-amber-700 text-[10px]">Attente : {ac.pending.toLocaleString('fr-FR')}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Commission Table */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Historique des commissions</CardTitle>
              <Button variant="outline" size="sm" className="gap-1 border-[#FF6C2F] text-[#FF6C2F]">
                <Receipt className="size-3" /> Générer facture
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead className="hidden sm:table-cell">Taux</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucune commission</TableCell></TableRow>
                ) : (
                  commissions.slice(0, 20).map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs font-medium">{c.agent.firstName} {c.agent.lastName}</TableCell>
                      <TableCell className="text-xs font-semibold text-[#FF6C2F]">{c.amount.toLocaleString('fr-FR')} FCFA</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs">{c.rate}%</TableCell>
                      <TableCell>
                        <Badge className={c.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                          {c.status === 'PAID' ? 'Payé' : 'En attente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell className="text-right">
                        {c.status === 'PENDING' && (
                          <Button variant="ghost" size="sm" onClick={() => markAsPaid(c.id)} className="text-green-600 hover:text-green-700 hover:bg-green-50 text-xs">
                            Marquer payé
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
