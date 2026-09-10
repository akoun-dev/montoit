'use client'

import { useCallback, useEffect, useState } from 'react'
import { Star, Flag, EyeOff, Eye, Search, MessageSquareOff } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface AdminReview {
  id: string
  score: number
  comment: string | null
  reply: string | null
  status: 'PUBLISHED' | 'HIDDEN'
  moderatedAt: string | null
  moderationReason: string | null
  createdAt: string
  fromUser: { id: string; firstName: string; lastName: string } | null
  toUser: { id: string; firstName: string; lastName: string } | null
  moderatedBy: { id: string; firstName: string; lastName: string } | null
  property: { id: string; title: string } | null
  reportsCount: number
  reportReasons: string[]
}

interface Stats { total: number; published: number; hidden: number; reported: number }

const reasonLabels: Record<string, string> = {
  INAPPROPRIATE_CONTENT: 'Contenu inapproprié',
  FRAUD: 'Fraude',
  SPAM: 'Spam',
  HARASSMENT: 'Harcèlement',
  FALSE_INFORMATION: 'Fausse information',
  OTHER: 'Autre',
}

export function AdminReviewsModeration() {
  const { isAuthenticated } = useAuthStore()
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, published: 0, hidden: 0, reported: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [reportedOnly, setReportedOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [actionDialog, setActionDialog] = useState<{ open: boolean; review: AdminReview | null; action: 'HIDDEN' | 'PUBLISHED' | '' }>({ open: false, review: null, action: '' })
  const [reason, setReason] = useState('')
  const [processing, setProcessing] = useState(false)

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (reportedOnly) params.set('reportedOnly', 'true')
      const d = await authFetch<{ data: AdminReview[]; stats: Stats }>(`/api/admin/reviews${params.toString() ? `?${params}` : ''}`)
      setReviews(d.data || [])
      setStats(d.stats || { total: 0, published: 0, hidden: 0, reported: 0 })
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) return
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, statusFilter, reportedOnly])

  useEffect(() => { fetchData() }, [fetchData])

  const handleAction = async () => {
    if (!actionDialog.review || !actionDialog.action) return
    setProcessing(true)
    try {
      await authFetch('/api/admin/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: actionDialog.review.id, status: actionDialog.action, reason: reason || undefined }),
      })
      toast.success(actionDialog.action === 'HIDDEN' ? 'Avis masqué' : 'Avis restauré')
      setActionDialog({ open: false, review: null, action: '' })
      setReason('')
      fetchData()
    } catch {
      toast.error('Erreur lors du traitement')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) return <div className="space-y-6"><div><div className="h-8 w-48 bg-muted animate-pulse rounded" /><div className="h-4 w-64 bg-muted animate-pulse rounded mt-2" /></div>{[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}</div>

  if (error) return <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6"><div><h1 className="text-xl sm:text-2xl font-bold text-foreground">Modération des avis</h1><p className="text-muted-foreground mt-1">Impossible de charger les avis</p></div><Card className="border-amber-200 bg-amber-50"><CardContent className="p-4"><p className="text-sm text-amber-700">Impossible de charger. Veuillez réessayer.</p></CardContent></Card></motion.div>

  const filtered = reviews.filter((r) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (r.comment || '').toLowerCase().includes(q) ||
      `${r.fromUser?.firstName || ''} ${r.fromUser?.lastName || ''}`.toLowerCase().includes(q) ||
      `${r.toUser?.firstName || ''} ${r.toUser?.lastName || ''}`.toLowerCase().includes(q) ||
      (r.property?.title || '').toLowerCase().includes(q)
  })

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <Star className="size-5 sm:size-6 text-[#FF6C2F]" /> Modération des avis
        </h1>
        <p className="text-muted-foreground mt-1">{stats.total} avis · {stats.reported} signalé(s) · {stats.hidden} masqué(s)</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Rechercher par auteur, destinataire, bien ou contenu..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-10"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { value: 'all', label: 'Tous' },
          { value: 'PUBLISHED', label: 'Publiés' },
          { value: 'HIDDEN', label: 'Masqués' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors',
              statusFilter === tab.value ? 'bg-brand-500 text-white' : 'bg-muted text-muted-foreground hover:bg-accent'
            )}
          >
            {tab.label}
          </button>
        ))}
        <button
          onClick={() => setReportedOnly((v) => !v)}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors flex items-center gap-1',
            reportedOnly ? 'bg-red-600 text-white' : 'bg-muted text-muted-foreground hover:bg-accent'
          )}
        >
          <Flag className="size-3" /> Signalés uniquement
        </button>
      </div>

      {/* Reviews list */}
      {filtered.length === 0 ? (
        <Card className="border-dashed border-border bg-muted/50">
          <CardContent className="py-12 text-center">
            <MessageSquareOff className="size-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">Aucun avis trouvé</p>
          </CardContent>
        </Card>
      ) : (
        <motion.div initial="hidden" animate="show" variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.03 } } }} className="space-y-2">
          {filtered.map((r) => (
            <motion.div key={r.id} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
              <div className={cn('p-3 rounded-lg border transition-colors', r.status === 'HIDDEN' ? 'border-red-200 bg-red-50/50' : 'border-border hover:bg-accent/40')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">
                        {r.fromUser ? `${r.fromUser.firstName} ${r.fromUser.lastName}` : 'Utilisateur'} → {r.toUser ? `${r.toUser.firstName} ${r.toUser.lastName}` : 'Utilisateur'}
                      </span>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={cn('size-3', i < r.score ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')} />
                        ))}
                      </div>
                      {r.status === 'HIDDEN' && <Badge className="bg-red-100 text-red-700 text-[10px]">Masqué</Badge>}
                      {r.reportsCount > 0 && (
                        <Badge className="bg-orange-100 text-orange-700 text-[10px] flex items-center gap-1">
                          <Flag className="size-2.5" /> {r.reportsCount} signalement{r.reportsCount > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    {r.comment && <p className="text-sm text-foreground mt-1">{r.comment}</p>}
                    {r.property && <p className="text-xs text-muted-foreground mt-1">{r.property.title}</p>}
                    {r.reportReasons.length > 0 && (
                      <p className="text-[10px] text-orange-600 mt-1">
                        Raisons : {r.reportReasons.map((rr) => reasonLabels[rr] || rr).join(', ')}
                      </p>
                    )}
                    {r.status === 'HIDDEN' && r.moderationReason && (
                      <p className="text-[10px] text-red-600 mt-1">Motif de masquage : {r.moderationReason}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(r.createdAt).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div className="shrink-0">
                    {r.status === 'PUBLISHED' ? (
                      <Button size="sm" variant="outline" className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => { setActionDialog({ open: true, review: r, action: 'HIDDEN' }); setReason('') }}>
                        <EyeOff className="size-3.5" /> Masquer
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="gap-1 text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() => { setActionDialog({ open: true, review: r, action: 'PUBLISHED' }); setReason('') }}>
                        <Eye className="size-3.5" /> Restaurer
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionDialog.action === 'HIDDEN' ? 'Masquer cet avis' : 'Restaurer cet avis'}</DialogTitle>
            <DialogDescription>
              {actionDialog.action === 'HIDDEN'
                ? "L'avis ne sera plus visible publiquement ni par son destinataire. Les signalements ouverts contre cet avis seront validés."
                : "L'avis redeviendra visible. Les signalements ouverts contre cet avis seront rejetés."}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Motif (optionnel)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[80px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog({ ...actionDialog, open: false })}>Annuler</Button>
            <Button
              className={actionDialog.action === 'HIDDEN' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}
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
