'use client'

import { useCallback, useEffect, useState } from 'react'
import { Flag, Eye, CheckCircle, XCircle, AlertTriangle, ArrowUpCircle, Check, Filter } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
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
  const { isAuthenticated } = useAuthStore()
  const [signalements, setSignalements] = useState<Signalement[]>([])
  const [stats, setStats] = useState<SignalementStats>({ byStatus: {}, byReason: {} })
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [reasonFilter, setReasonFilter] = useState<string>('all')
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
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, statusFilter, reasonFilter])

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

  if (loading) return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}</div>

  const totalSignalements = Object.values(stats.byStatus).reduce((sum, n) => sum + n, 0)

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Signalements</h1>
          <p className="text-muted-foreground mt-1">{totalSignalements} signalement(s) au total</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 h-9">
              <Filter className="size-3.5 mr-1" />
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="PENDING">En attente</SelectItem>
              <SelectItem value="IN_REVIEW">En revue</SelectItem>
              <SelectItem value="VALIDATED">Validé</SelectItem>
              <SelectItem value="REJECTED">Rejeté</SelectItem>
              <SelectItem value="ESCALATED">Escaladé</SelectItem>
              <SelectItem value="RESOLVED">Résolu</SelectItem>
            </SelectContent>
          </Select>
          <Select value={reasonFilter} onValueChange={setReasonFilter}>
            <SelectTrigger className="w-44 h-9">
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

      {/* Statistics */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Par statut</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {Object.entries(stats.byStatus).map(([status, count]) => {
              const cfg = statusConfig[status] || { label: status, className: 'bg-neutral-100 text-neutral-700' }
              return (
                <Badge key={status} className={cfg.className}>
                  {cfg.label}: {count}
                </Badge>
              )
            })}
            {Object.keys(stats.byStatus).length === 0 && <p className="text-sm text-muted-foreground">Aucune donnée</p>}
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Par raison</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {Object.entries(stats.byReason).map(([reason, count]) => (
              <Badge key={reason} variant="outline" className="py-1">
                {reasonLabels[reason] || reason}: {count}
              </Badge>
            ))}
            {Object.keys(stats.byReason).length === 0 && <p className="text-sm text-muted-foreground">Aucune donnée</p>}
          </CardContent>
        </Card>
      </div>

      {/* Signalements Table */}
      <Card className="border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Raison</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Description</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Signalé par</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Type</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Statut</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Date</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {signalements.map((s) => {
                  const cfg = statusConfig[s.status] || { label: s.status, className: 'bg-neutral-100 text-neutral-700' }
                  return (
                    <tr key={s.id} className="border-b border-border hover:bg-accent">
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-xs">{reasonLabels[s.reason] || s.reason}</Badge>
                      </td>
                      <td className="py-3 px-4 max-w-48 truncate text-foreground">{s.description}</td>
                      <td className="py-3 px-4 text-muted-foreground">{s.reporter.firstName} {s.reporter.lastName}</td>
                      <td className="py-3 px-4 text-muted-foreground">{entityTypeLabels[s.entityType] || s.entityType}</td>
                      <td className="py-3 px-4"><Badge className={cfg.className}>{cfg.label}</Badge></td>
                      <td className="py-3 px-4 text-muted-foreground">{new Date(s.createdAt).toLocaleDateString('fr-FR')}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1">
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
                      </td>
                    </tr>
                  )
                })}
                {signalements.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      <Flag className="size-8 text-muted-foreground/50 mx-auto mb-2" />
                      Aucun signalement trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailDialog.open} onOpenChange={(open) => setDetailDialog({ ...detailDialog, open })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Détails du signalement</DialogTitle>
          </DialogHeader>
          {detailDialog.signalement && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
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
