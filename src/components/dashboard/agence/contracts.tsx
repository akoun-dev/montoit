'use client'

import { useEffect, useState, useCallback } from 'react'
import { FileText, AlertTriangle, Calendar, Download } from 'lucide-react'
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

interface Lease {
  id: string; status: string; monthlyRent: number; charges: number; deposit: number
  startDate: string; endDate: string
  tenant: { id: string; firstName: string; lastName: string; avatarUrl: string | null; phone: string }
  property: { title: string; city: string; images: Array<{ url: string }> }
}

interface AgenceData { activeLeases: Lease[] }

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

const statusConfig: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: 'Brouillon', cls: 'bg-neutral-100 text-neutral-600' },
  PENDING_SIGNATURE: { label: 'En attente', cls: 'bg-amber-100 text-amber-700' },
  ACTIVE: { label: 'Actif', cls: 'bg-green-100 text-green-700' },
  TERMINATED: { label: 'Résilié', cls: 'bg-red-100 text-red-700' },
  EXPIRED: { label: 'Expiré', cls: 'bg-neutral-100 text-neutral-500' },
}

export function AgenceContracts() {
  const { isAuthenticated } = useAuthStore()
  const [leases, setLeases] = useState<Lease[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const d = await authFetch<AgenceData>('/api/dashboard/agence')
      setLeases(d.activeLeases ?? [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) return
    } finally { setLoading(false) }
  }, [isAuthenticated])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}</div>

  const activeLeases = leases.filter((l) => l.status === 'ACTIVE')
  const expiringLeases = leases.filter((l) => {
    if (l.status !== 'ACTIVE') return false
    const threeMonthsFromNow = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    return new Date(l.endDate) <= threeMonthsFromNow
  })

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FileText className="size-6 text-[#FF6C2F]" /> Contrats
        </h1>
        <p className="text-muted-foreground mt-1">{activeLeases.length} bail{activeLeases.length > 1 ? 'x' : ''} actif{activeLeases.length > 1 ? 's' : ''}</p>
      </motion.div>

      {/* Expiring Alerts */}
      {expiringLeases.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-500" /> Baux expirant bientôt
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {expiringLeases.map((l) => (
                <div key={l.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-amber-200">
                  <div>
                    <p className="text-sm font-medium">{l.tenant.firstName} {l.tenant.lastName}</p>
                    <p className="text-xs text-muted-foreground">{l.property.title}</p>
                  </div>
                  <Badge className="bg-amber-100 text-amber-700">
                    <Calendar className="size-3 mr-1" /> {new Date(l.endDate).toLocaleDateString('fr-FR')}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* All Leases Table */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Tous les baux</CardTitle>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => toast.info('Fonctionnalité à venir')}>
                <Download className="size-3" /> Exporter
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bien</TableHead>
                  <TableHead>Locataire</TableHead>
                  <TableHead>Loyer</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="hidden md:table-cell">Période</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leases.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun bail</TableCell></TableRow>
                ) : (
                  leases.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium text-xs">{l.property.title}</TableCell>
                      <TableCell className="text-xs">{l.tenant.firstName} {l.tenant.lastName}</TableCell>
                      <TableCell className="text-xs font-semibold text-[#FF6C2F]">{l.monthlyRent.toLocaleString('fr-FR')} FCFA</TableCell>
                      <TableCell><Badge className={statusConfig[l.status]?.cls || 'bg-neutral-100'}>{statusConfig[l.status]?.label || l.status}</Badge></TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {new Date(l.startDate).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })} → {new Date(l.endDate).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* Contract Templates */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Modèles de contrats</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer">
              <FileText className="size-6 text-[#FF6C2F] mb-2" />
              <p className="text-sm font-medium">Bail type</p>
              <p className="text-xs text-muted-foreground">Modèle standard de bail</p>
            </div>
            <div className="p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer">
              <FileText className="size-6 text-[#FF6C2F] mb-2" />
              <p className="text-sm font-medium">Mandat de gestion</p>
              <p className="text-xs text-muted-foreground">Contrat mandat standard</p>
            </div>
            <div className="p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer">
              <FileText className="size-6 text-[#FF6C2F] mb-2" />
              <p className="text-sm font-medium">État des lieux</p>
              <p className="text-xs text-muted-foreground">Template état des lieux</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
