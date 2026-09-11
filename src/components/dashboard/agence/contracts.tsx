'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  FileText, AlertTriangle, Calendar, Download, Search, Home,
  User, Building2, ArrowRight, Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { useRealtimeLeases } from '@/hooks/use-realtime-leases'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { downloadCsv } from '@/lib/csv'

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
  const { isAuthenticated, user } = useAuthStore()
  const [leases, setLeases] = useState<Lease[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const d = await authFetch<AgenceData>('/api/dashboard/agence')
      setLeases(d.activeLeases ?? [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) return
      console.error('Failed to fetch contracts:', err)
    } finally { setLoading(false) }
  }, [isAuthenticated])

  useEffect(() => { fetchData() }, [fetchData])

  // Realtime subscription
  useRealtimeLeases({
    userId: user?.id,
    onLeaseChange: () => { fetchData() },
  })

  const stats = {
    all: leases.length,
    ACTIVE: leases.filter((l) => l.status === 'ACTIVE').length,
    PENDING: leases.filter((l) => l.status === 'PENDING_SIGNATURE' || l.status === 'DRAFT').length,
    TERMINATED: leases.filter((l) => l.status === 'TERMINATED' || l.status === 'EXPIRED').length,
  }

  const tabs = [
    { key: 'all', label: 'Tous', count: stats.all },
    { key: 'ACTIVE', label: 'Actifs', count: stats.ACTIVE },
    { key: 'PENDING', label: 'En attente', count: stats.PENDING },
    { key: 'TERMINATED', label: 'Expirés/Résiliés', count: stats.TERMINATED },
  ]

  const filtered = leases.filter((l) => {
    if (statusFilter !== 'all') {
      if (statusFilter === 'PENDING' && l.status !== 'PENDING_SIGNATURE' && l.status !== 'DRAFT') return false
      if (statusFilter === 'TERMINATED' && l.status !== 'TERMINATED' && l.status !== 'EXPIRED') return false
      if (statusFilter !== 'PENDING' && statusFilter !== 'TERMINATED' && l.status !== statusFilter) return false
    }
    if (search) {
      const q = search.toLowerCase()
      const propTitle = l.property.title.toLowerCase()
      const tenantName = `${l.tenant.firstName} ${l.tenant.lastName}`.toLowerCase()
      if (!propTitle.includes(q) && !tenantName.includes(q)) return false
    }
    return true
  })

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error('Aucun contrat à exporter')
      return
    }
    const header = ['Bien', 'Ville', 'Locataire', 'Statut', 'Loyer mensuel', 'Charges', 'Dépôt', 'Début', 'Fin']
    const rows = filtered.map((l) => [
      l.property.title,
      l.property.city,
      `${l.tenant.firstName} ${l.tenant.lastName}`,
      statusConfig[l.status]?.label || l.status,
      l.monthlyRent,
      l.charges,
      l.deposit,
      new Date(l.startDate).toLocaleDateString('fr-FR'),
      new Date(l.endDate).toLocaleDateString('fr-FR'),
    ])
    downloadCsv(`contrats-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows])
    toast.success(`${filtered.length} contrat${filtered.length > 1 ? 's' : ''} exporté${filtered.length > 1 ? 's' : ''}`)
  }

  const activeLeases = leases.filter((l) => l.status === 'ACTIVE')
  const expiringLeases = leases.filter((l) => {
    if (l.status !== 'ACTIVE') return false
    const threeMonthsFromNow = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    return new Date(l.endDate) <= threeMonthsFromNow
  })

  if (loading) return (
    <div className="space-y-6">
      <div><div className="h-8 w-56 bg-muted animate-pulse rounded" /><div className="h-4 w-72 bg-muted animate-pulse rounded mt-2" /></div>
      <div className="flex gap-2">{[1,2,3,4].map((i) => <div key={i} className="h-9 w-24 bg-muted animate-pulse rounded-lg" />)}</div>
      {[1,2,3].map((i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}
    </div>
  )

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <FileText className="size-5 sm:size-6 text-[#FF6C2F]" /> Contrats
        </h1>
        <p className="text-muted-foreground mt-1">{activeLeases.length} bail{activeLeases.length > 1 ? 'x' : ''} actif{activeLeases.length > 1 ? 's' : ''}</p>
      </motion.div>

      <motion.div variants={itemVariants} className="flex justify-end">
        <Button variant="outline" size="sm" className="gap-1" onClick={handleExport}>
          <Download className="size-3" /> Exporter la liste (CSV)
        </Button>
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
                <div key={l.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 bg-white rounded-lg border border-amber-200 gap-2">
                  <div>
                    <p className="text-sm font-medium">{l.tenant.firstName} {l.tenant.lastName}</p>
                    <p className="text-xs text-muted-foreground">{l.property.title}</p>
                  </div>
                  <Badge className="bg-amber-100 text-amber-700 shrink-0">
                    <Calendar className="size-3 mr-1" /> {new Date(l.endDate).toLocaleDateString('fr-FR')}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stats cards */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

      {/* Search */}
      <motion.div variants={itemVariants}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par bien ou locataire..."
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
              <FileText className="size-12 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-1">
                {search ? 'Aucun bail trouvé' : 'Aucun bail'}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {search ? 'Essayez de modifier votre recherche.' : 'Les baux apparaîtront ici une fois créés.'}
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
            {filtered.map((l) => (
              <motion.div
                key={l.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                layout
              >
                <Card className="border-border hover:shadow-md transition-all">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start gap-4">
                      {/* Thumbnail */}
                      <div className="hidden sm:flex size-14 rounded-lg bg-muted overflow-hidden shrink-0">
                        {l.property.images[0]?.url ? (
                          <img src={l.property.images[0].url} alt="" className="size-full object-cover" />
                        ) : (
                          <div className="size-full flex items-center justify-center"><Building2 className="size-6 text-muted-foreground/40" /></div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Top row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-foreground truncate">{l.property.title}</h3>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <User className="size-3" />
                              {l.tenant.firstName} {l.tenant.lastName}
                            </p>
                          </div>
                          <Badge className={cn('shrink-0 text-xs', statusConfig[l.status]?.cls || 'bg-neutral-100')}>
                            {statusConfig[l.status]?.label || l.status}
                          </Badge>
                        </div>

                        {/* Info rows */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Home className="size-3.5 shrink-0 text-[#FF6C2F]" />
                            <span className="font-semibold text-[#FF6C2F]">{l.monthlyRent.toLocaleString('fr-FR')} FCFA</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="size-3.5 shrink-0" />
                            <span>{new Date(l.startDate).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <ArrowRight className="size-3.5 shrink-0 text-muted-foreground/50" />
                            <span>{new Date(l.endDate).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}</span>
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

      {/* Contract Templates */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Modèles de contrats</CardTitle>
          </CardHeader>
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
