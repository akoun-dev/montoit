'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  RefreshCw, Check, X, Loader2, User, Building2, CalendarDays,
  Banknote, MessageSquare, Clock, FileSignature, AlertTriangle,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

// ─── Types ──────────────────────────────────────────────────────────────────

interface RenewalItem {
  id: string
  renewalStatus: string
  renewalRequestedAt: string | null
  renewalNotes: string | null
  renewedLeaseId: string | null
  monthlyRent: number
  startDate: string | null
  endDate: string | null
  property?: {
    id: string
    title: string
    address: string
    city: string
  } | null
  tenant?: {
    id: string
    firstName: string
    lastName: string
    email?: string
    phone?: string
    avatarUrl: string | null
  } | null
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatFCFA(amount: number) {
  return amount.toLocaleString('fr-FR') + ' FCFA'
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    REQUESTED: { label: 'En attente', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    ACCEPTED: { label: 'Acceptée', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    REJECTED: { label: 'Refusée', className: 'bg-red-50 text-red-600 border-red-200' },
    RENEWED: { label: 'Renouvelé', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  }
  const info = map[status] || { label: status, className: 'bg-neutral-100 text-neutral-600 border-neutral-200' }
  return <Badge variant="outline" className={info.className}>{info.label}</Badge>
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function ProprietaireRenewals() {
  const { isAuthenticated } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [renewals, setRenewals] = useState<RenewalItem[]>([])

  // Action dialog
  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    type: 'accept' | 'decline'
    item: RenewalItem | null
  }>({ open: false, type: 'accept', item: null })
  const [actionLoading, setActionLoading] = useState(false)

  // Detail dialog
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [detailItem, setDetailItem] = useState<RenewalItem | null>(null)

  // ─── Fetch renewals ─────────────────────────────────────────────────────
  const fetchRenewals = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      setLoading(true)
      setError(false)
      const d = await authFetch<{ data: RenewalItem[] }>('/api/renewals')
      setRenewals(d.data ?? [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) { setRenewals([]); return }
      setRenewals([])
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => { fetchRenewals() }, [fetchRenewals])

  // ─── Handle accept/decline ──────────────────────────────────────────────
  const handleAction = async () => {
    if (!actionDialog.item) return
    setActionLoading(true)
    try {
      await authFetch(`/api/renewals/${actionDialog.item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionDialog.type }),
      })
      toast.success(
        actionDialog.type === 'accept'
          ? 'Demande de renouvellement acceptée'
          : 'Demande de renouvellement refusée'
      )
      setActionDialog({ open: false, type: 'accept', item: null })
      fetchRenewals()
    } catch (err) {
      if (err instanceof AuthError) {
        toast.error(err.message || 'Erreur lors du traitement')
      } else {
        toast.error('Erreur lors du traitement de la demande')
      }
    } finally {
      setActionLoading(false)
    }
  }

  // ─── Derived lists ─────────────────────────────────────────────────────
  const pendingRenewals = renewals.filter((r) => r.renewalStatus === 'REQUESTED')
  const processedRenewals = renewals.filter((r) => r.renewalStatus !== 'REQUESTED')

  // ─── Loading ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div><div className="h-8 w-56 bg-muted animate-pulse rounded" /><div className="h-4 w-72 bg-muted animate-pulse rounded mt-2" /></div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  // ─── Error ──────────────────────────────────────────────────────────────
  if (error) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Demandes de renouvellement</h1>
          <p className="text-muted-foreground mt-1">Gérez les demandes de renouvellement de bail</p>
        </div>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm text-amber-700">Impossible de charger les demandes. Veuillez réessayer.</p>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  // ─── Stats ──────────────────────────────────────────────────────────────
  const stats = [
    { label: 'En attente', count: pendingRenewals.length, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Acceptées', count: processedRenewals.filter((r) => r.renewalStatus === 'ACCEPTED').length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Refusées', count: processedRenewals.filter((r) => r.renewalStatus === 'REJECTED').length, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Renouvelées', count: processedRenewals.filter((r) => r.renewalStatus === 'RENEWED').length, color: 'text-blue-600', bg: 'bg-blue-50' },
  ]

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Demandes de renouvellement</h1>
          <p className="text-muted-foreground mt-1">Gérez les demandes de renouvellement de bail de vos locataires</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchRenewals}
          className="gap-1.5 shrink-0"
        >
          <RefreshCw className="size-3.5" /> Actualiser
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className={`p-3 rounded-xl border border-border ${s.bg}`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Pending renewals */}
      {pendingRenewals.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Clock className="size-4 text-amber-500" />
            Demandes en attente
            <Badge className="bg-amber-100 text-amber-700 ml-1">{pendingRenewals.length}</Badge>
          </h2>
          <div className="space-y-3">
            {pendingRenewals.map((item, idx) => (
              <RenewalCard
                key={item.id}
                item={item}
                idx={idx}
                onAccept={() => setActionDialog({ open: true, type: 'accept', item })}
                onDecline={() => setActionDialog({ open: true, type: 'decline', item })}
                onDetail={() => { setDetailItem(item); setDetailDialogOpen(true) }}
              />
            ))}
          </div>
        </div>
      )}

      {/* No pending */}
      {pendingRenewals.length === 0 && (
        <Card className="border-dashed border-border bg-muted/50">
          <CardContent className="py-12 text-center">
            <Clock className="size-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Aucune demande en attente</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Les demandes de renouvellement de vos locataires apparaîtront ici.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Processed renewals */}
      {processedRenewals.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <FileSignature className="size-4 text-muted-foreground" />
            Historique des demandes
          </h2>
          <div className="space-y-2">
            {processedRenewals.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
              >
                <Card
                  className="border-border hover:shadow-sm transition-shadow cursor-pointer opacity-80 hover:opacity-100"
                  onClick={() => { setDetailItem(item); setDetailDialogOpen(true) }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                          {item.tenant?.avatarUrl ? (
                            <img src={item.tenant.avatarUrl} alt="" className="size-full rounded-full object-cover" />
                          ) : (
                            <User className="size-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {item.tenant?.firstName} {item.tenant?.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {item.property?.title || 'Bien'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {statusBadge(item.renewalStatus)}
                        {item.renewalRequestedAt && (
                          <span className="text-xs text-muted-foreground hidden sm:block">
                            {formatDate(item.renewalRequestedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* No renewals at all */}
      {renewals.length === 0 && pendingRenewals.length === 0 && (
        <Card className="border-dashed border-border bg-muted/50">
          <CardContent className="py-12 text-center">
            <FileSignature className="size-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Aucune demande de renouvellement</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Lorsque vos locataires demanderont un renouvellement de bail, vous pourrez l&apos;accepter ou le refuser ici.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ─── Accept/Decline Dialog ──────────────────────────────────────────── */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) => { if (!open) setActionDialog({ open: false, type: 'accept', item: null }) }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionDialog.type === 'accept' ? (
                <><Check className="size-5 text-emerald-500" /> Accepter le renouvellement</>
              ) : (
                <><X className="size-5 text-red-500" /> Refuser le renouvellement</>
              )}
            </DialogTitle>
            <DialogDescription className="pt-2">
              {actionDialog.type === 'accept' ? (
                <>
                  Vous acceptez la demande de renouvellement de bail de{' '}
                  <span className="font-semibold text-foreground">
                    {actionDialog.item?.tenant?.firstName} {actionDialog.item?.tenant?.lastName}
                  </span>{' '}
                  pour <span className="font-semibold text-foreground">{actionDialog.item?.property?.title}</span>.
                  Un nouveau bail devra être créé ultérieurement.
                </>
              ) : (
                <>
                  Vous refusez la demande de renouvellement de{' '}
                  <span className="font-semibold text-foreground">
                    {actionDialog.item?.tenant?.firstName} {actionDialog.item?.tenant?.lastName}
                  </span>{' '}
                  pour <span className="font-semibold text-foreground">{actionDialog.item?.property?.title}</span>.
                  Le locataire sera notifié de votre décision.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {actionDialog.type === 'decline' && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
              <p className="text-xs text-amber-700 flex items-start gap-2">
                <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
                En refusant cette demande, le bail actuel arrivera à échéance à sa date de fin prévue.
              </p>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setActionDialog({ open: false, type: 'accept', item: null })}
              disabled={actionLoading}
            >
              Annuler
            </Button>
            <Button
              variant={actionDialog.type === 'accept' ? 'default' : 'destructive'}
              onClick={handleAction}
              disabled={actionLoading}
              className="gap-2"
            >
              {actionLoading ? (
                <><Loader2 className="size-4 animate-spin" /> Traitement...</>
              ) : (
                <>{actionDialog.type === 'accept' ? 'Accepter' : 'Refuser'}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Detail Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSignature className="size-5 text-brand-500" />
              Détails de la demande
            </DialogTitle>
          </DialogHeader>
          {detailItem && (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center gap-2">
                {statusBadge(detailItem.renewalStatus)}
              </div>

              {/* Property & Tenant */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground mb-1">Bien</p>
                  <p className="font-medium">{detailItem.property?.title || '—'}</p>
                  <p className="text-sm text-muted-foreground">{detailItem.property?.address}, {detailItem.property?.city}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground mb-1">Locataire</p>
                  <div className="flex items-center gap-2">
                    {detailItem.tenant?.avatarUrl ? (
                      <img src={detailItem.tenant.avatarUrl} alt="" className="size-8 rounded-full object-cover" />
                    ) : (
                      <div className="size-8 rounded-full bg-brand-50 flex items-center justify-center">
                        <User className="size-4 text-brand-500" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{detailItem.tenant?.firstName} {detailItem.tenant?.lastName}</p>
                      {detailItem.tenant?.email && (
                        <p className="text-xs text-muted-foreground">{detailItem.tenant.email}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Lease info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-muted">
                <div>
                  <p className="text-xs text-muted-foreground">Loyer actuel</p>
                  <p className="text-sm font-semibold">{formatFCFA(detailItem.monthlyRent)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Début du bail</p>
                  <p className="text-sm font-semibold">{formatDate(detailItem.startDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fin du bail</p>
                  <p className="text-sm font-semibold">{formatDate(detailItem.endDate)}</p>
                </div>
              </div>

              {/* Request date */}
              <div className="p-3 rounded-lg bg-muted flex items-center gap-2">
                <CalendarDays className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Demandé le</p>
                  <p className="text-sm font-medium">{formatDateTime(detailItem.renewalRequestedAt)}</p>
                </div>
              </div>

              {/* Notes */}
              {detailItem.renewalNotes && (
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <MessageSquare className="size-3" /> Message du locataire
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{detailItem.renewalNotes}</p>
                </div>
              )}

              {/* Actions for pending */}
              {detailItem.renewalStatus === 'REQUESTED' && (
                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
                    onClick={() => {
                      setDetailDialogOpen(false)
                      setActionDialog({ open: true, type: 'accept', item: detailItem })
                    }}
                  >
                    <Check className="size-4" /> Accepter
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50 gap-2"
                    onClick={() => {
                      setDetailDialogOpen(false)
                      setActionDialog({ open: true, type: 'decline', item: detailItem })
                    }}
                  >
                    <X className="size-4" /> Refuser
                  </Button>
                </div>
              )}

              {/* Status info for processed */}
              {detailItem.renewalStatus !== 'REQUESTED' && (
                <div className={`p-3 rounded-lg ${
                  detailItem.renewalStatus === 'ACCEPTED' ? 'bg-emerald-50 border border-emerald-200' :
                  detailItem.renewalStatus === 'REJECTED' ? 'bg-red-50 border border-red-200' :
                  detailItem.renewalStatus === 'RENEWED' ? 'bg-blue-50 border border-blue-200' :
                  'bg-muted'
                }`}>
                  <p className="text-sm font-medium">
                    {detailItem.renewalStatus === 'ACCEPTED' && '✅ Demande acceptée'}
                    {detailItem.renewalStatus === 'REJECTED' && '❌ Demande refusée'}
                    {detailItem.renewalStatus === 'RENEWED' && '🔄 Bail renouvelé'}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

// ─── Renewal Card Component ──────────────────────────────────────────────────

function RenewalCard({
  item,
  idx,
  onAccept,
  onDecline,
  onDetail,
}: {
  item: RenewalItem
  idx: number
  onAccept: () => void
  onDecline: () => void
  onDetail: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
    >
      <Card
        className="border-amber-200 bg-amber-50/30 hover:shadow-md transition-shadow cursor-pointer"
        onClick={onDetail}
      >
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start gap-4">
            {/* Tenant avatar */}
            <div className="hidden sm:flex size-12 rounded-full bg-amber-100 overflow-hidden shrink-0 items-center justify-center">
              {item.tenant?.avatarUrl ? (
                <img src={item.tenant.avatarUrl} alt="" className="size-full object-cover" />
              ) : (
                <User className="size-6 text-amber-600" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              {/* Top row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground truncate">
                    {item.tenant?.firstName} {item.tenant?.lastName}
                  </h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Building2 className="size-3" />
                    {item.property?.title ?? 'Propriété'} — {item.property?.city ?? ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className="bg-amber-100 text-amber-700 flex items-center gap-1">
                    <Clock className="size-3" />
                    En attente
                  </Badge>
                </div>
              </div>

              {/* Info rows */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-muted-foreground mb-3">
                <div className="flex items-center gap-2">
                  <Banknote className="size-3.5 shrink-0" />
                  <span>Loyer {formatFCFA(item.monthlyRent)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="size-3.5 shrink-0" />
                  <span>Fin du bail le {formatDate(item.endDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="size-3.5 shrink-0" />
                  <span>Demandé le {formatDate(item.renewalRequestedAt)}</span>
                </div>
              </div>

              {/* Notes preview */}
              {item.renewalNotes && (
                <p className="text-xs text-muted-foreground mb-3 line-clamp-1">
                  <MessageSquare className="size-3 inline mr-1" />
                  {item.renewalNotes}
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="sm"
                  className="h-8 bg-emerald-500 hover:bg-emerald-600 text-white gap-1"
                  onClick={onAccept}
                >
                  <Check className="size-3.5" />
                  <span className="hidden lg:inline">Accepter</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 border-red-200 text-red-600 hover:bg-red-50 gap-1"
                  onClick={onDecline}
                >
                  <X className="size-3.5" />
                  <span className="hidden lg:inline">Refuser</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1"
                  onClick={onDetail}
                >
                  Voir détails
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
