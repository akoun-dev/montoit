'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  FileSignature, Plus, AlertTriangle, Search, Building2, Calendar,
  User, Percent, Clock, ArrowRight, X,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Mandat {
  id: string; type: string; status: string; commissionRate: number; commissionType: string
  fixedCommission: number | null; startDate: string; endDate: string; conditions: string | null
  ownerSignedAt: string | null; agencySignedAt: string | null
  property: { id: string; title: string; city: string }
  owner: { id: string; firstName: string; lastName: string; email: string }
}

interface AgenceData {
  allMandats: Mandat[]
  expiringMandats: Array<{
    id: string; endDate: string
    property: { title: string }
    owner: { firstName: string; lastName: string }
  }>
}

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
  const [search, setSearch] = useState('')
  const [detailMandat, setDetailMandat] = useState<Mandat | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [signing, setSigning] = useState(false)

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

  const stats = {
    all: mandats.length,
    DRAFT: mandats.filter((m) => m.status === 'DRAFT').length,
    PENDING_SIGNATURE: mandats.filter((m) => m.status === 'PENDING_SIGNATURE').length,
    ACTIVE: mandats.filter((m) => m.status === 'ACTIVE').length,
    TERMINATED: mandats.filter((m) => m.status === 'TERMINATED' || m.status === 'EXPIRED').length,
  }

  const tabs = [
    { key: 'all', label: 'Tous', count: stats.all },
    { key: 'DRAFT', label: 'Brouillons', count: stats.DRAFT },
    { key: 'PENDING_SIGNATURE', label: 'En attente', count: stats.PENDING_SIGNATURE },
    { key: 'ACTIVE', label: 'Actifs', count: stats.ACTIVE },
    { key: 'TERMINATED', label: 'Terminés', count: stats.TERMINATED },
  ]

  const filtered = mandats.filter((m) => {
    if (statusFilter !== 'all' && m.status !== statusFilter) {
      if (statusFilter === 'TERMINATED' && m.status !== 'TERMINATED' && m.status !== 'EXPIRED') return false
      return false
    }
    if (search) {
      const q = search.toLowerCase()
      const propTitle = m.property.title.toLowerCase()
      const ownerName = `${m.owner.firstName} ${m.owner.lastName}`.toLowerCase()
      if (!propTitle.includes(q) && !ownerName.includes(q)) return false
    }
    return true
  })

  if (loading) return (
    <div className="space-y-6">
      <div><div className="h-8 w-56 bg-muted animate-pulse rounded" /><div className="h-4 w-72 bg-muted animate-pulse rounded mt-2" /></div>
      <div className="flex gap-2">{[1,2,3,4,5].map((i) => <div key={i} className="h-9 w-24 bg-muted animate-pulse rounded-lg" />)}</div>
      {[1,2,3].map((i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}
    </div>
  )

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <FileSignature className="size-5 sm:size-6 text-[#FF6C2F]" /> Mandats
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
                <div key={m.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 bg-white rounded-lg border border-amber-200 gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{m.property.title}</p>
                    <p className="text-xs text-muted-foreground">Propriétaire : {m.owner.firstName} {m.owner.lastName}</p>
                  </div>
                  <Badge className="bg-amber-100 text-amber-700 shrink-0">
                    <Calendar className="size-3 mr-1" /> Expire le {new Date(m.endDate).toLocaleDateString('fr-FR')}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stats cards */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={cn(
                'p-3 rounded-xl border text-left transition-all',
                statusFilter === tab.key
                  ? 'border-[#FF6C2F] bg-orange-50 shadow-sm'
                  : 'border-border bg-card hover:bg-muted/50'
              )}
            >
              <p className={cn(
                'text-2xl font-bold',
                statusFilter === tab.key ? 'text-[#FF6C2F]' : 'text-foreground'
              )}>{tab.count}</p>
              <p className={cn(
                'text-xs mt-0.5',
                statusFilter === tab.key ? 'text-[#FF6C2F] font-medium' : 'text-muted-foreground'
              )}>{tab.label}</p>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Search & filter */}
      <motion.div variants={itemVariants}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par bien ou propriétaire..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
      </motion.div>

      {/* Status pill tabs */}
      <motion.div variants={itemVariants} className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors',
              statusFilter === tab.key
                ? 'bg-[#FF6C2F] text-white'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            )}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </motion.div>

      {/* Cards list */}
      {filtered.length === 0 ? (
        <motion.div variants={itemVariants}>
          <Card className="border-dashed border-border bg-muted/50">
            <CardContent className="py-12 flex flex-col items-center text-center">
              <FileSignature className="size-12 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-1">
                {search ? 'Aucun mandat trouvé' : statusFilter === 'all' ? 'Aucun mandat' : `Aucun mandat ${tabs.find(t => t.key === statusFilter)?.label.toLowerCase() || ''}`}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {search ? 'Essayez de modifier votre recherche.' : 'Les mandats apparaîtront ici une fois créés.'}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={statusFilter + search}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {filtered.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                layout
              >
                <Card
                  className="border-border hover:shadow-md transition-all cursor-pointer"
                  onClick={() => { setDetailMandat(m); setDetailOpen(true) }}
                >
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start gap-4">
                      {/* Thumbnail */}
                      <div className="hidden sm:flex size-14 rounded-lg bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 items-center justify-center shrink-0">
                        <FileSignature className="size-6 text-[#FF6C2F]/60" />
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Top row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-foreground truncate">
                              {m.property.title || 'Sans titre'}
                            </h3>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <User className="size-3" />
                              {m.owner.firstName} {m.owner.lastName}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge className="bg-orange-50 text-orange-700 text-xs">{typeLabels[m.type] || m.type}</Badge>
                            <Badge className={cn('text-xs shrink-0', statusConfig[m.status]?.cls || 'bg-neutral-100')}>
                              {statusConfig[m.status]?.label || m.status}
                            </Badge>
                          </div>
                        </div>

                        {/* Info rows */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Percent className="size-3.5 shrink-0" />
                            <span>
                              {m.commissionType === 'PERCENTAGE' ? `${m.commissionRate}%` : `${(m.fixedCommission ?? 0).toLocaleString('fr-FR')} FCFA`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="size-3.5 shrink-0" />
                            <span>{new Date(m.startDate).toLocaleDateString('fr-FR')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <ArrowRight className="size-3.5 shrink-0 text-muted-foreground/50" />
                            <span>{new Date(m.endDate).toLocaleDateString('fr-FR')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          {detailMandat && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-3">
                  <DialogTitle className="text-lg flex items-center gap-2">
                    <FileSignature className="size-5 text-[#FF6C2F] shrink-0" />
                    <span className="truncate">{detailMandat.property.title || 'Sans titre'}</span>
                  </DialogTitle>
                  <Badge className={cn('shrink-0 text-xs', statusConfig[detailMandat.status]?.cls || 'bg-neutral-100')}>
                    {statusConfig[detailMandat.status]?.label || detailMandat.status}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-[11px] text-muted-foreground">Propriétaire</p>
                    <p className="text-sm font-semibold text-foreground">{detailMandat.owner.firstName} {detailMandat.owner.lastName}</p>
                    <p className="text-xs text-muted-foreground">{detailMandat.owner.email}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-[11px] text-muted-foreground">Type de mandat</p>
                    <p className="text-sm font-semibold text-foreground">{typeLabels[detailMandat.type] || detailMandat.type}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-[11px] text-muted-foreground">Commission</p>
                    <p className="text-sm font-semibold text-[#FF6C2F]">
                      {detailMandat.commissionType === 'PERCENTAGE' ? `${detailMandat.commissionRate}%` : `${(detailMandat.fixedCommission ?? 0).toLocaleString('fr-FR')} FCFA`}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-[11px] text-muted-foreground">Période</p>
                    <p className="text-sm font-semibold text-foreground">
                      {new Date(detailMandat.startDate).toLocaleDateString('fr-FR')} → {new Date(detailMandat.endDate).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>

                {detailMandat.conditions && (
                  <div className="p-3 rounded-lg bg-orange-50 border border-orange-100">
                    <p className="text-[11px] font-medium text-orange-700 mb-1">Conditions particulières</p>
                    <p className="text-sm text-orange-800">{detailMandat.conditions}</p>
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  Propriétaire signé le : {detailMandat.ownerSignedAt ? new Date(detailMandat.ownerSignedAt).toLocaleDateString('fr-FR') : '—'}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  Agence signé le : {detailMandat.agencySignedAt ? new Date(detailMandat.agencySignedAt).toLocaleDateString('fr-FR') : '—'}
                </div>

                {/* Action buttons */}
                {detailMandat.status === 'PENDING_SIGNATURE' && !detailMandat.agencySignedAt && (
                  <div className="pt-3 border-t border-border flex gap-2">
                    <Button
                      size="sm"
                      className="bg-[#FF6C2F] hover:bg-[#e55e27] text-white flex-1 gap-1"
                      disabled={signing}
                      onClick={async (e) => {
                        e.stopPropagation()
                        setSigning(true)
                        try {
                          await authFetch(`/api/mandats/${detailMandat.id}/sign`, {
                            method: 'POST',
                            body: JSON.stringify({ role: 'agency' }),
                          })
                          toast.success('Mandat signé avec succès')
                          setDetailOpen(false)
                          fetchData()
                        } catch (err) {
                          if (err instanceof AuthError) {
                            toast.error(err.message || 'Erreur lors de la signature')
                          } else {
                            toast.error('Erreur lors de la signature')
                          }
                        } finally {
                          setSigning(false)
                        }
                      }}
                    >
                      <FileSignature className="size-3.5" />
                      {signing ? 'Signature en cours...' : 'Signer le mandat'}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
