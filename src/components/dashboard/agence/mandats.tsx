'use client'

import { useEffect, useState, useCallback } from 'react'
import { FileSignature, Plus, AlertTriangle, Filter } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface Mandat {
  id: string; type: string; status: string; commissionRate: number; commissionType: string
  fixedCommission: number | null; startDate: string; endDate: string; conditions: string | null
  ownerSignedAt: string | null; agencySignedAt: string | null
  property: { id: string; title: string; city: string }
  owner: { id: string; firstName: string; lastName: string; email: string }
}

interface AgenceData { allMandats: Mandat[]; expiringMandats: Array<{ id: string; endDate: string; property: { title: string }; owner: { firstName: string; lastName: string } }> }

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

const statusConfig: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: 'Brouillon', cls: 'bg-neutral-100 text-neutral-600' },
  PENDING_SIGNATURE: { label: 'En attente de signature', cls: 'bg-amber-100 text-amber-700' },
  ACTIVE: { label: 'Actif', cls: 'bg-green-100 text-green-700' },
  TERMINATED: { label: 'Résilié', cls: 'bg-red-100 text-red-700' },
  EXPIRED: { label: 'Expiré', cls: 'bg-neutral-100 text-neutral-500' },
}

const typeLabels: Record<string, string> = {
  GESTION_COMPLETE: 'Gestion complète',
  GESTION_LOCATION: 'Gestion location',
  MANDAT_SIMPLE: 'Mandat simple',
}

export function AgenceMandats() {
  const { isAuthenticated } = useAuthStore()
  const [mandats, setMandats] = useState<Mandat[]>([])
  const [expiring, setExpiring] = useState<AgenceData['expiringMandats']>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const d = await authFetch<AgenceData>('/api/dashboard/agence')
      setMandats(d.allMandats ?? [])
      setExpiring(d.expiringMandats ?? [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) return
    } finally { setLoading(false) }
  }, [isAuthenticated])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = mandats.filter((m) => statusFilter === 'all' || m.status === statusFilter)

  if (loading) return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}</div>

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileSignature className="size-6 text-[#FF6C2F]" /> Mandats
          </h1>
          <p className="text-muted-foreground mt-1">{mandats.length} mandat{mandats.length > 1 ? 's' : ''} au total</p>
        </div>
      </motion.div>

      {/* Expiring Soon Alerts */}
      {expiring.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-500" /> Mandats expirant bientôt
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {expiring.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-amber-200">
                  <div>
                    <p className="text-sm font-medium text-foreground">{m.property.title}</p>
                    <p className="text-xs text-muted-foreground">Propriétaire : {m.owner.firstName} {m.owner.lastName}</p>
                  </div>
                  <Badge className="bg-amber-100 text-amber-700">Expire le {new Date(m.endDate).toLocaleDateString('fr-FR')}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Filter */}
      <motion.div variants={itemVariants} className="flex items-center gap-3">
        <Filter className="size-4 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filtrer par statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="DRAFT">Brouillon</SelectItem>
            <SelectItem value="PENDING_SIGNATURE">En attente de signature</SelectItem>
            <SelectItem value="ACTIVE">Actif</SelectItem>
            <SelectItem value="TERMINATED">Résilié</SelectItem>
            <SelectItem value="EXPIRED">Expiré</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Mandats Table */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bien</TableHead>
                  <TableHead className="hidden sm:table-cell">Propriétaire</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="hidden md:table-cell">Commission</TableHead>
                  <TableHead className="hidden lg:table-cell">Période</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun mandat trouvé</TableCell></TableRow>
                ) : (
                  filtered.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.property.title || 'Sans titre'}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs">{m.owner.firstName} {m.owner.lastName}</TableCell>
                      <TableCell><Badge className="bg-orange-50 text-orange-700">{typeLabels[m.type] || m.type}</Badge></TableCell>
                      <TableCell><Badge className={statusConfig[m.status]?.cls || 'bg-neutral-100'}>{statusConfig[m.status]?.label || m.status}</Badge></TableCell>
                      <TableCell className="hidden md:table-cell text-xs">
                        {m.commissionType === 'PERCENTAGE' ? `${m.commissionRate}%` : `${(m.fixedCommission ?? 0).toLocaleString('fr-FR')} FCFA`}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {new Date(m.startDate).toLocaleDateString('fr-FR')} → {new Date(m.endDate).toLocaleDateString('fr-FR')}
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
