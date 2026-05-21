'use client'

import { useCallback, useEffect, useState } from 'react'
import { Flag, Eye, CheckCircle, XCircle, AlertTriangle, ArrowUpCircle, Check, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { useRealtimeSignalements } from '@/hooks/use-realtime-signalements'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface Signalement {
  id: string
  reason: string
  description: string
  status: string
  adminNotes: string | null
  resolution: string | null
  entityType: string
  entityId: string
  createdAt: string
  updatedAt: string
  reporter: { id: string; firstName: string; lastName: string; email: string; role: string }
  handledBy: { id: string; firstName: string; lastName: string } | null
}

interface SignalementStats {
  byStatus: Record<string, number>
  byReason: Record<string, number>
}

const reasonLabels: Record<string, string> = {
  INAPPROPRIATE_CONTENT: 'Contenu inapproprié',
  FRAUD: 'Fraude',
  SPAM: 'Spam',
  HARASSMENT: 'Harcèlement',
  FALSE_INFORMATION: 'Fausse information',
  OTHER: 'Autre',
}

const entityTypeLabels: Record<string, string> = {
  PROPERTY: 'Bien immobilier',
  USER: 'Utilisateur',
  REVIEW: 'Avis',
  MESSAGE: 'Message',
}

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'En attente', className: 'bg-amber-100 text-amber-700' },
  IN_REVIEW: { label: 'En revue', className: 'bg-teal-100 text-teal-700' },
  VALIDATED: { label: 'Validé', className: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Rejeté', className: 'bg-red-100 text-red-700' },
  ESCALATED: { label: 'Escaladé', className: 'bg-orange-100 text-orange-700' },
  RESOLVED: { label: 'Résolu', className: 'bg-neutral-100 text-neutral-700' },
}

export function AdminSignalements() {
  const { user, isAuthenticated } = useAuthStore()
  const [signalements, setSignalements] = useState<Signalement[]>([])
  const [stats, setStats] = useState<SignalementStats>({ byStatus: {}, byReason: {} })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [reasonFilter, setReasonFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [detailDialog, setDetailDialog] = useState<{ open: boolean; signalement: Signalement | null }>({ open: false, signalement: null })
  const [actionDialog, setActionDialog] = useState<{ open: boolean; signalement: Signalement | null; action: string }>({ open: false, signalement: null, action: '' })
  const [adminNotes, setAdminNotes] = useState('')
  const [processing, setProcessing] = useState(false)

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }

    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (reasonFilter !== 'all') params.set('reason', reasonFilter)

      const d = await authFetch<{ signalements: Signalement[]; stats: SignalementStats }>(`/api/admin/signalements${params.toString() ? `?${params}` : ''}`)
      setSignalements(d.signalements || [])
      setStats(d.stats || { byStatus: {}, byReason: {} })
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) return
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, statusFilter, reasonFilter])

  useRealtimeSignalements({
    userId: user?.id,
    watchAll: true,
    onSignalementChange: () => { fetchData() },
  })

  useEffect(() => { fetchData() }, [fetchData])

  const handleAction = async () => {
    if (!actionDialog.signalement) return
    setProcessing(true)
    try {
      await authFetch('/api/admin/signalements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: actionDialog.signalement.id,
          status: actionDialog.action,
          adminNotes,
        }),
      })
      toast.success(`Signalement ${statusConfig[actionDialog.action]?.label?.toLowerCase() || actionDialog.action}`)
      setActionDialog({ open: false, signalement: null, action: '' })
      setAdminNotes('')
      fetchData()
    } catch {
      toast.error('Erreur lors du traitement')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) return <div className="space-y-6"><div><div className="h-8 w-48 bg-muted animate-pulse rounded" /><div className="h-4 w-64 bg-muted animate-pulse rounded mt-2" /></div><div className="flex gap-2">{[1,2,3].map((i) => <div key={i} className="h-9 w-24 bg-muted animate-pulse rounded-lg" />)}</div>{[1,2,3].map((i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}</div>

  if (error) return <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6"><div><h1 className="text-xl sm:text-2xl font-bold text-foreground">Signalements</h1><p className="text-muted-foreground mt-1">Impossible de charger les signalements</p></div><Card className="border-amber-200 bg-amber-50"><CardContent className="p-4"><p className="text-sm text-amber-700">Impossible de charger. Veuillez réessayer.</p></CardContent></Card></motion.div>

  const totalSignalements = Object.values(stats.byStatus).reduce((sum, n) => sum + n, 0)

  const filteredSignalements = signalements.filter((s) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (reasonLabels[s.reason] || s.reason).toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      `${s.reporter.firstName} ${s.reporter.lastName}`.toLowerCase().includes(q)
  })

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Signalements</h1>
          <p className="text-muted-foreground mt-1">{totalSignalements} signalement(s) au total</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={reasonFilter} onValueChange={setReasonFilter}>
            <SelectTrigger className="w-full sm:w-44 h-9">
              <SelectValue placeholder="Raison" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les raisons</SelectItem>
              <SelectItem value="INAPPROPRIATE_CONTENT">Contenu inapproprié</SelectItem>
              <SelectItem value="FRAUD">Fraude</SelectItem>
              <SelectItem value="SPAM">Spam</SelectItem>
              <SelectItem value="HARASSMENT">Harcèlement</SelectItem>
              <SelectItem value="FALSE_INFORMATION">Fausse information</SelectItem>
              <SelectItem value="OTHER">Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Rechercher par raison, description ou signalant..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-10"
        />
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {[
          { value: 'all', label: 'Tous' },
          { value: 'PENDING', label: 'En attente' },
          { value: 'IN_REVIEW', label: 'En revue' },
          { value: 'VALIDATED', label: 'Validé' },
          { value: 'REJECTED', label: 'Rejeté' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors',
              statusFilter === tab.value
                ? 'bg-brand-500 text-white'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button onClick={() => setStatusFilter('all')}
          className={cn('p-3 rounded-xl border text-left transition-all', statusFilter === 'all' ? 'border-brand-500 bg-brand-50 shadow-sm' : 'border-border bg-card hover:bg-muted/50')}>
          <p className={cn('text-2xl font-bold', statusFilter === 'all' ? 'text-brand-600' : 'text-foreground')}>{totalSignalements}</p>
          <p className={cn('text-xs mt-0.5', statusFilter === 'all' ? 'text-brand-600 font-medium' : 'text-muted-foreground')}>Total</p>
        </button>
        {[
          { status: 'PENDING', label: 'En attente', count: stats.byStatus.PENDING || 0 },
          { status: 'IN_REVIEW', label: 'En revue', count: stats.byStatus.IN_REVIEW || 0 },
          { status: 'VALIDATED', label: 'Validé', count: stats.byStatus.VALIDATED || 0 },
          { status: 'REJECTED', label: 'Rejeté', count: stats.byStatus.REJECTED || 0 },
        ].filter(s => s.count > 0).map((s) => (
          <button key={s.status} onClick={() => setStatusFilter(s.status === statusFilter ? 'all' : s.status)}
            className={cn('p-3 rounded-xl border text-left transition-all', s.status === statusFilter ? 'border-brand-500 bg-brand-50 shadow-sm' : 'border-border bg-card hover:bg-muted/50')}>
            <p className={cn('text-2xl font-bold', s.status === statusFilter ? 'text-brand-600' : 'text-foreground')}>{s.count}</p>
            <p className={cn('text-xs mt-0.5', s.status === statusFilter ? 'text-brand-600 font-medium' : 'text-muted-foreground')}>{s.label}</p>
          </button>
        ))}
      </div>

      {/* Signalements Cards */}
      {filteredSignalements.length === 0 ? (
        <Card className="border-dashed border-border bg-muted/50">
          <CardContent className="py-12 text-center">
            <Flag className="size-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">Aucun signalement trouvé</p>
          </CardContent>
        </Card>
      ) : (
        <motion.div initial="hidden" animate="show" variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } }} className="space-y-2">
          {filteredSignalements.map((s) => {
            const cfg = statusConfig[s.status] || { label: s.status, className: 'bg-neutral-100 text-neutral-700' }
            return (
              <motion.div key={s.id} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/40 transition-colors group">
                  <div className="size-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center text-xs font-semibold shrink-0">
                    <Flag className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{s.reporter.firstName} {s.reporter.lastName}</span>
                      <Badge variant="outline" className="text-[10px]">{reasonLabels[s.reason] || s.reason}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{s.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={cn('text-[10px] leading-none px-1.5 py-0.5', cfg.className)}>{cfg.label}</Badge>
                      <span className="text-[10px] text-muted-foreground">{entityTypeLabels[s.entityType] || s.entityType} · {new Date(s.createdAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="size-7" title="Voir" onClick={() => setDetailDialog({ open: true, signalement: s })}>
                      <Eye className="size-3.5" />
                    </Button>
                    {s.status === 'PENDING' && (
                      <>
                        <Button size="icon" variant="ghost" className="size-7 text-green-600" title="Valider" onClick={() => { setActionDialog({ open: true, signalement: s, action: 'VALIDATED' }); setAdminNotes('') }}>
                          <Check className="size-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-7 text-red-600" title="Rejeter" onClick={() => { setActionDialog({ open: true, signalement: s, action: 'REJECTED' }); setAdminNotes('') }}>
                          <XCircle className="size-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-7 text-orange-600" title="Escalader" onClick={() => { setActionDialog({ open: true, signalement: s, action: 'ESCALATED' }); setAdminNotes('') }}>
                          <ArrowUpCircle className="size-3.5" />
                        </Button>
                      </>
                    )}
                    {(s.status === 'IN_REVIEW' || s.status === 'ESCALATED') && (
                      <Button size="icon" variant="ghost" className="size-7 text-green-600" title="Résoudre" onClick={() => { setActionDialog({ open: true, signalement: s, action: 'RESOLVED' }); setAdminNotes('') }}>
                        <CheckCircle className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailDialog.open} onOpenChange={(open) => setDetailDialog({ ...detailDialog, open })}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Détails du signalement</DialogTitle>
          </DialogHeader>
          {detailDialog.signalement && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Raison:</span> <span className="font-medium">{reasonLabels[detailDialog.signalement.reason]}</span></div>
                <div><span className="text-muted-foreground">Statut:</span> <Badge className={statusConfig[detailDialog.signalement.status]?.className}>{statusConfig[detailDialog.signalement.status]?.label}</Badge></div>
                <div><span className="text-muted-foreground">Type d'entité:</span> <span className="font-medium">{entityTypeLabels[detailDialog.signalement.entityType]}</span></div>
                <div><span className="text-muted-foreground">Date:</span> <span className="font-medium">{new Date(detailDialog.signalement.createdAt).toLocaleDateString('fr-FR')}</span></div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Description:</span>
                <p className="text-sm text-foreground mt-1 p-3 rounded-lg border border-border">{detailDialog.signalement.description}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Signalé par:</span>
                <p className="text-sm font-medium">{detailDialog.signalement.reporter.firstName} {detailDialog.signalement.reporter.lastName} ({detailDialog.signalement.reporter.email})</p>
              </div>
              {detailDialog.signalement.adminNotes && (
                <div>
                  <span className="text-sm text-muted-foreground">Notes admin:</span>
                  <p className="text-sm text-foreground mt-1 p-3 rounded-lg border border-border">{detailDialog.signalement.adminNotes}</p>
                </div>
              )}
              {detailDialog.signalement.handledBy && (
                <div>
                  <span className="text-sm text-muted-foreground">Traité par:</span>
                  <p className="text-sm font-medium">{detailDialog.signalement.handledBy.firstName} {detailDialog.signalement.handledBy.lastName}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === 'VALIDATED' && 'Valider le signalement'}
              {actionDialog.action === 'REJECTED' && 'Rejeter le signalement'}
              {actionDialog.action === 'ESCALATED' && 'Escalader le signalement'}
              {actionDialog.action === 'RESOLVED' && 'Résoudre le signalement'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.signalement && `Signalement #${actionDialog.signalement.id.slice(0, 8)}...`}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Notes administrateur (optionnel)"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            className="min-h-[80px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog({ ...actionDialog, open: false })}>Annuler</Button>
            <Button
              className={
                actionDialog.action === 'VALIDATED' ? 'bg-green-600 hover:bg-green-700 text-white' :
                actionDialog.action === 'REJECTED' ? 'bg-red-600 hover:bg-red-700 text-white' :
                actionDialog.action === 'ESCALATED' ? 'bg-orange-600 hover:bg-orange-700 text-white' :
                'bg-teal-600 hover:bg-teal-700 text-white'
              }
              onClick={handleAction}
              disabled={processing}
            >
              {processing ? 'En cours...' : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
