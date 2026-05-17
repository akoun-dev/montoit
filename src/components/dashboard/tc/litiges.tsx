'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle, Search, Eye, User, FileText, Clock, ShieldCheck,
  CheckCircle2, XCircle, Loader2, HandMetal, Scale, AlertOctagon, CircleDot, Calendar,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { useAuthStore } from '@/lib/auth-store'
import { ViewModeToggle, type ViewMode } from './view-mode-toggle'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────────

type DisputeType = 'UNPAID_RENT' | 'PROPERTY_DAMAGE' | 'HARASSMENT' | 'FRAUD' | 'OTHER'
type DisputeStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED'

interface Dispute {
  id: string
  type: DisputeType
  description: string
  status: DisputeStatus
  tcComment: string | null
  resolution: string | null
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  lease: {
    id: string
    startDate: string
    endDate: string
    rentAmount: number
    property: {
      id: string
      title: string
      address: string
      commune: string
    }
    tenant: {
      id: string
      firstName: string
      lastName: string
      email: string
    }
    owner: {
      id: string
      firstName: string
      lastName: string
      email: string
    }
  } | null
  reporter: {
    id: string
    firstName: string
    lastName: string
    email: string
    role: string
  } | null
  handler: {
    id: string
    firstName: string
    lastName: string
  } | null
}

// API returns array directly

// ─── Labels & Colors ────────────────────────────────────────────────────────

const typeLabels: Record<DisputeType, string> = {
  UNPAID_RENT: 'Loyer impayé',
  PROPERTY_DAMAGE: 'Dégât matériel',
  HARASSMENT: 'Harcèlement',
  FRAUD: 'Fraude',
  OTHER: 'Autre',
}

const typeColors: Record<DisputeType, string> = {
  UNPAID_RENT: 'bg-red-50 text-red-700 border-red-200',
  PROPERTY_DAMAGE: 'bg-orange-50 text-orange-700 border-orange-200',
  HARASSMENT: 'bg-rose-50 text-rose-700 border-rose-200',
  FRAUD: 'bg-red-50 text-red-700 border-red-200',
  OTHER: 'bg-gray-50 text-gray-700 border-gray-200',
}

const typeIcons: Record<DisputeType, React.ElementType> = {
  UNPAID_RENT: AlertOctagon,
  PROPERTY_DAMAGE: AlertTriangle,
  HARASSMENT: HandMetal,
  FRAUD: Scale,
  OTHER: CircleDot,
}

const typeBadgeColors: Record<DisputeType, string> = {
  UNPAID_RENT: 'bg-red-100 text-red-700',
  PROPERTY_DAMAGE: 'bg-orange-100 text-orange-700',
  HARASSMENT: 'bg-rose-100 text-rose-700',
  FRAUD: 'bg-red-100 text-red-700',
  OTHER: 'bg-gray-100 text-gray-600',
}

const statusLabels: Record<DisputeStatus, string> = {
  OPEN: 'Ouvert',
  IN_REVIEW: 'En cours',
  RESOLVED: 'Résolu',
  CLOSED: 'Fermé',
}

const statusColors: Record<DisputeStatus, string> = {
  OPEN: 'bg-red-100 text-red-700',
  IN_REVIEW: 'bg-amber-100 text-amber-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-500',
}

// ─── Component ──────────────────────────────────────────────────────────────

export function LitigesManagement() {
  const { isAuthenticated } = useAuthStore()

  // Data
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // View
  const [viewMode, setViewMode] = useState<ViewMode>('card')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<DisputeStatus | 'ALL'>('ALL')
  const [typeFilter, setTypeFilter] = useState<DisputeType | 'ALL'>('ALL')

  // Dialogs
  const [detailDialog, setDetailDialog] = useState<{ open: boolean; dispute: Dispute | null }>({
    open: false, dispute: null,
  })
  const [resolveDialog, setResolveDialog] = useState<{ open: boolean; dispute: Dispute | null }>({
    open: false, dispute: null,
  })
  const [resolutionComment, setResolutionComment] = useState('')

  // ─── Fetch ──────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      const data = await authFetch<Dispute[]>('/api/tc/litiges')
      setDisputes(Array.isArray(data) ? data : [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) {
        setDisputes([])
        return
      }
      setDisputes([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ─── Stats ─────────────────────────────────────────────────────────────

  const openCount = disputes.filter((d) => d.status === 'OPEN').length
  const inReviewCount = disputes.filter((d) => d.status === 'IN_REVIEW').length
  const resolvedCount = disputes.filter((d) => d.status === 'RESOLVED').length
  const totalCount = disputes.length

  // ─── Filtered disputes ────────────────────────────────────────────────

  const filteredDisputes = disputes.filter((d) => {
    if (statusFilter !== 'ALL' && d.status !== statusFilter) return false
    if (typeFilter !== 'ALL' && d.type !== typeFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        d.description.toLowerCase().includes(q) ||
        typeLabels[d.type].toLowerCase().includes(q) ||
        (d.lease?.property.title.toLowerCase().includes(q)) ||
        (d.reporter && `${d.reporter.firstName} ${d.reporter.lastName}`.toLowerCase().includes(q))
      )
    }
    return true
  })

  // ─── Actions ───────────────────────────────────────────────────────────

  const handleTakeCharge = async (disputeId: string) => {
    setActionLoading(disputeId)
    try {
      await authFetch('/api/tc/litiges', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: disputeId, status: 'IN_REVIEW' }),
      })
      toast.success('Litige pris en charge !')
      await fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setActionLoading(null)
    }
  }

  const handleResolve = async () => {
    if (!resolveDialog.dispute) return
    setActionLoading(resolveDialog.dispute.id)
    try {
      await authFetch('/api/tc/litiges', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: resolveDialog.dispute.id,
          status: 'RESOLVED',
          resolution: resolutionComment,
        }),
      })
      toast.success('Litige résolu !')
      setResolveDialog({ open: false, dispute: null })
      setResolutionComment('')
      await fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setActionLoading(null)
    }
  }

  const handleClose = async (disputeId: string) => {
    setActionLoading(disputeId)
    try {
      await authFetch('/api/tc/litiges', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: disputeId, status: 'CLOSED' }),
      })
      toast.success('Litige fermé')
      await fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setActionLoading(null)
    }
  }

  // ─── Action button by status ──────────────────────────────────────────

  const getActionButton = (dispute: Dispute) => {
    switch (dispute.status) {
      case 'OPEN':
        return (
          <Button
            size="sm"
            className="bg-brand-500 hover:bg-brand-600 text-white gap-1"
            onClick={(e) => { e.stopPropagation(); handleTakeCharge(dispute.id) }}
            disabled={actionLoading === dispute.id}
          >
            {actionLoading === dispute.id ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <ShieldCheck className="size-3.5" />
            )}
            Prendre en charge
          </Button>
        )
      case 'IN_REVIEW':
        return (
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white gap-1"
            onClick={(e) => {
              e.stopPropagation()
              setResolutionComment('')
              setResolveDialog({ open: true, dispute })
            }}
            disabled={actionLoading === dispute.id}
          >
            <CheckCircle2 className="size-3.5" />
            Résoudre
          </Button>
        )
      case 'RESOLVED':
        return (
          <Button
            size="sm"
            variant="outline"
            className="text-gray-600 border-gray-200 hover:bg-gray-50 gap-1"
            onClick={(e) => { e.stopPropagation(); handleClose(dispute.id) }}
            disabled={actionLoading === dispute.id}
          >
            {actionLoading === dispute.id ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <XCircle className="size-3.5" />
            )}
            Fermer
          </Button>
        )
      case 'CLOSED':
        return null
      default:
        return null
    }
  }

  // ─── Loading skeleton ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gestion des litiges</h1>
        <p className="text-muted-foreground mt-1">Traitez et résolvez les litiges signalés</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-red-50">
                <AlertTriangle className="size-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{openCount}</p>
                <p className="text-xs text-muted-foreground">Ouverts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-amber-50">
                <Clock className="size-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{inReviewCount}</p>
                <p className="text-xs text-muted-foreground">En cours</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-green-50">
                <CheckCircle2 className="size-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{resolvedCount}</p>
                <p className="text-xs text-muted-foreground">Résolus</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-brand-50">
                <FileText className="size-5 text-brand-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalCount}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar: Search + Filters + View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 min-w-0 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un litige..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Status filter */}
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant={statusFilter === 'ALL' ? 'default' : 'outline'}
              className={statusFilter === 'ALL' ? 'bg-brand-500 hover:bg-brand-600 text-white' : ''}
              onClick={() => setStatusFilter('ALL')}
            >
              Tous
            </Button>
            {(Object.keys(statusLabels) as DisputeStatus[]).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={statusFilter === s ? 'default' : 'outline'}
                className={statusFilter === s ? 'bg-brand-500 hover:bg-brand-600 text-white' : ''}
                onClick={() => setStatusFilter(s)}
              >
                {statusLabels[s]}
              </Button>
            ))}
          </div>
        </div>

        <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
      </div>

      {/* Type filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          variant={typeFilter === 'ALL' ? 'secondary' : 'ghost'}
          className={typeFilter === 'ALL' ? 'bg-muted' : ''}
          onClick={() => setTypeFilter('ALL')}
        >
          Tous les types
        </Button>
        {(Object.keys(typeLabels) as DisputeType[]).map((t) => {
          const Icon = typeIcons[t]
          return (
            <Button
              key={t}
              size="sm"
              variant={typeFilter === t ? 'secondary' : 'ghost'}
              className={cn('gap-1.5', typeFilter === t && typeBadgeColors[t])}
              onClick={() => setTypeFilter(t)}
            >
              <Icon className="size-3.5" />
              {typeLabels[t]}
            </Button>
          )
        })}
      </div>

      {/* Empty state */}
      {filteredDisputes.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <ShieldCheck className="size-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">
              {disputes.length === 0 ? 'Aucun litige signalé' : 'Aucun litige trouvé'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {disputes.length === 0
                ? 'Les litiges signalés apparaîtront ici'
                : 'Essayez un autre filtre ou recherche'}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'card' ? (
        /* ─── Card View ──────────────────────────────────────────────── */
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {filteredDisputes.map((dispute) => {
              const TypeIcon = typeIcons[dispute.type]
              return (
                <motion.div
                  key={dispute.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="border-border hover:shadow-md transition-shadow">
                    <CardContent className="p-4 sm:p-6">
                      {/* Header: Type icon + label + Status */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className={cn(
                            'flex size-10 items-center justify-center rounded-lg shrink-0',
                            dispute.type === 'UNPAID_RENT' ? 'bg-red-50' :
                            dispute.type === 'PROPERTY_DAMAGE' ? 'bg-orange-50' :
                            dispute.type === 'HARASSMENT' ? 'bg-rose-50' :
                            dispute.type === 'FRAUD' ? 'bg-red-50' :
                            'bg-gray-50'
                          )}>
                            <TypeIcon className={cn(
                              'size-5',
                              dispute.type === 'UNPAID_RENT' ? 'text-red-600' :
                              dispute.type === 'PROPERTY_DAMAGE' ? 'text-orange-600' :
                              dispute.type === 'HARASSMENT' ? 'text-rose-600' :
                              dispute.type === 'FRAUD' ? 'text-red-600' :
                              'text-gray-600'
                            )} />
                          </div>
                          <div className="min-w-0">
                            <Badge className={typeBadgeColors[dispute.type]}>
                              {typeLabels[dispute.type]}
                            </Badge>
                          </div>
                        </div>
                        <Badge className={statusColors[dispute.status]}>
                          {statusLabels[dispute.status]}
                        </Badge>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-foreground line-clamp-2 mb-3">
                        {dispute.description}
                      </p>

                      {/* Lease info */}
                      {dispute.lease && (
                        <div className="text-xs text-muted-foreground mb-2">
                          <span className="font-medium">Bail :</span>{' '}
                          {dispute.lease.property.title} — {dispute.lease.property.commune}
                        </div>
                      )}

                      {/* Reporter + handler */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                        {dispute.reporter && (
                          <div className="flex items-center gap-1">
                            <User className="size-3 shrink-0" />
                            <span>{dispute.reporter.firstName} {dispute.reporter.lastName}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="size-3 shrink-0" />
                          <span>{new Date(dispute.createdAt).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t border-border">
                        {getActionButton(dispute)}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground hover:text-foreground gap-1 ml-auto"
                          onClick={() => setDetailDialog({ open: true, dispute })}
                        >
                          <Eye className="size-3.5" /> Détails
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      ) : (
        /* ─── List View ──────────────────────────────────────────────── */
        <Card className="border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left font-medium text-muted-foreground p-3">Type</th>
                  <th className="text-left font-medium text-muted-foreground p-3">Description</th>
                  <th className="text-left font-medium text-muted-foreground p-3 hidden lg:table-cell">Bail</th>
                  <th className="text-left font-medium text-muted-foreground p-3 hidden md:table-cell">Déclarant</th>
                  <th className="text-center font-medium text-muted-foreground p-3">Statut</th>
                  <th className="text-left font-medium text-muted-foreground p-3 hidden xl:table-cell">Traité par</th>
                  <th className="text-left font-medium text-muted-foreground p-3 hidden sm:table-cell">Date</th>
                  <th className="text-right font-medium text-muted-foreground p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {filteredDisputes.map((dispute) => {
                    const TypeIcon = typeIcons[dispute.type]
                    return (
                      <motion.tr
                        key={dispute.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="border-b border-border hover:bg-muted/30 transition-colors"
                      >
                        {/* Type */}
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              'size-7 rounded flex items-center justify-center shrink-0',
                              dispute.type === 'UNPAID_RENT' ? 'bg-red-50' :
                              dispute.type === 'PROPERTY_DAMAGE' ? 'bg-orange-50' :
                              dispute.type === 'HARASSMENT' ? 'bg-rose-50' :
                              dispute.type === 'FRAUD' ? 'bg-red-50' :
                              'bg-gray-50'
                            )}>
                              <TypeIcon className={cn(
                                'size-3.5',
                                dispute.type === 'UNPAID_RENT' ? 'text-red-600' :
                                dispute.type === 'PROPERTY_DAMAGE' ? 'text-orange-600' :
                                dispute.type === 'HARASSMENT' ? 'text-rose-600' :
                                dispute.type === 'FRAUD' ? 'text-red-600' :
                                'text-gray-600'
                              )} />
                            </div>
                            <span className="text-xs font-medium text-foreground whitespace-nowrap">
                              {typeLabels[dispute.type]}
                            </span>
                          </div>
                        </td>

                        {/* Description */}
                        <td className="p-3">
                          <p className="text-foreground truncate max-w-[200px]">{dispute.description}</p>
                        </td>

                        {/* Lease */}
                        <td className="p-3 hidden lg:table-cell">
                          {dispute.lease ? (
                            <span className="text-muted-foreground truncate block max-w-[150px]">
                              {dispute.lease.property.title}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* Reporter */}
                        <td className="p-3 hidden md:table-cell">
                          {dispute.reporter ? (
                            <span className="text-muted-foreground">
                              {dispute.reporter.firstName} {dispute.reporter.lastName}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="p-3 text-center">
                          <Badge className={statusColors[dispute.status]}>
                            {statusLabels[dispute.status]}
                          </Badge>
                        </td>

                        {/* Handler */}
                        <td className="p-3 hidden xl:table-cell">
                          {dispute.handler ? (
                            <span className="text-muted-foreground">
                              {dispute.handler.firstName} {dispute.handler.lastName}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="p-3 text-muted-foreground hidden sm:table-cell">
                          {new Date(dispute.createdAt).toLocaleDateString('fr-FR')}
                        </td>

                        {/* Actions */}
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-1">
                            {getActionButton(dispute)}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
                              onClick={() => setDetailDialog({ open: true, dispute })}
                              title="Voir les détails"
                            >
                              <Eye className="size-4" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ─── Detail Dialog ──────────────────────────────────────────────── */}
      <Dialog
        open={detailDialog.open}
        onOpenChange={(open) => {
          if (!open) setDetailDialog({ open: false, dispute: null })
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détail du litige</DialogTitle>
            <DialogDescription>
              {detailDialog.dispute && typeLabels[detailDialog.dispute.type]}
            </DialogDescription>
          </DialogHeader>
          {detailDialog.dispute && (
            <div className="space-y-4 py-2">
              {/* Type + Status */}
              <div className="flex items-center justify-between">
                <Badge className={typeBadgeColors[detailDialog.dispute.type]}>
                  {typeLabels[detailDialog.dispute.type]}
                </Badge>
                <Badge className={statusColors[detailDialog.dispute.status]}>
                  {statusLabels[detailDialog.dispute.status]}
                </Badge>
              </div>

              {/* Description */}
              <div className="p-3 rounded-lg border border-border bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{detailDialog.dispute.description}</p>
              </div>

              {/* Lease info */}
              {detailDialog.dispute.lease && (
                <div className="p-3 rounded-lg border border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Informations du bail</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="font-medium text-foreground">{detailDialog.dispute.lease.property.title}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="pl-5">
                        {detailDialog.dispute.lease.property.address}, {detailDialog.dispute.lease.property.commune}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground pl-5">
                      <span>Loyer : {detailDialog.dispute.lease.rentAmount.toLocaleString('fr-FR')} FCFA</span>
                      <span>
                        Du {new Date(detailDialog.dispute.lease.startDate).toLocaleDateString('fr-FR')} au{' '}
                        {new Date(detailDialog.dispute.lease.endDate).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground pl-5 mt-1">
                      <div className="flex items-center gap-1">
                        <User className="size-3" />
                        <span>Locataire : {detailDialog.dispute.lease.tenant.firstName} {detailDialog.dispute.lease.tenant.lastName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="size-3" />
                        <span>Propriétaire : {detailDialog.dispute.lease.owner.firstName} {detailDialog.dispute.lease.owner.lastName}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Reporter */}
              {detailDialog.dispute.reporter && (
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                    <User className="size-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {detailDialog.dispute.reporter.firstName} {detailDialog.dispute.reporter.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Déclarant · {detailDialog.dispute.reporter.email}
                    </p>
                  </div>
                </div>
              )}

              {/* Handler */}
              {detailDialog.dispute.handler && (
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
                    <ShieldCheck className="size-4 text-brand-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {detailDialog.dispute.handler.firstName} {detailDialog.dispute.handler.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">En charge du dossier</p>
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="p-3 rounded-lg border border-border bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground mb-2">Historique</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="size-2 rounded-full bg-foreground shrink-0" />
                    <span className="text-muted-foreground">
                      Créé le {new Date(detailDialog.dispute.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {detailDialog.dispute.resolvedAt && (
                    <div className="flex items-center gap-2 text-xs">
                      <div className="size-2 rounded-full bg-green-500 shrink-0" />
                      <span className="text-muted-foreground">
                        Résolu le {new Date(detailDialog.dispute.resolvedAt).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Resolution */}
              {detailDialog.dispute.resolution && (
                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-xs font-medium text-green-700 mb-1">Résolution</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{detailDialog.dispute.resolution}</p>
                </div>
              )}

              {/* TC Comment */}
              {detailDialog.dispute.tcComment && (
                <div className="p-3 rounded-lg bg-brand-50 border border-brand-200">
                  <p className="text-xs font-medium text-brand-700 mb-1">Commentaire TC</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{detailDialog.dispute.tcComment}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-2 border-t border-border">
                {getActionButton(detailDialog.dispute)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Resolve Dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={resolveDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setResolveDialog({ open: false, dispute: null })
            setResolutionComment('')
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Résoudre le litige</DialogTitle>
            <DialogDescription>
              Décrivez la résolution appliquée. Cette information sera visible par les parties concernées.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {resolveDialog.dispute && (
              <div className="p-3 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={typeBadgeColors[resolveDialog.dispute.type]}>
                    {typeLabels[resolveDialog.dispute.type]}
                  </Badge>
                </div>
                <p className="text-sm text-foreground line-clamp-2">{resolveDialog.dispute.description}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="resolution">Résolution *</Label>
              <Textarea
                id="resolution"
                placeholder="Décrivez la résolution du litige..."
                value={resolutionComment}
                onChange={(e) => setResolutionComment(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setResolveDialog({ open: false, dispute: null })
                setResolutionComment('')
              }}
              disabled={actionLoading !== null}
            >
              Annuler
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleResolve}
              disabled={!resolutionComment.trim() || actionLoading !== null}
            >
              {actionLoading !== null && <Loader2 className="size-4 animate-spin mr-2" />}
              Confirmer la résolution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
