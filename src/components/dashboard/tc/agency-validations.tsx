'use client'

import { useCallback, useEffect, useState } from 'react'
import { Building2, Check, X, FileText, MessageSquare, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { useRealtimeOwnershipDocs } from '@/hooks/use-realtime-ownership-docs'
import { ViewModeToggle, type ViewMode } from './view-mode-toggle'
import { DocumentPreviewDialog } from './document-preview-dialog'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Agency validation uses ownership docs of type AGREMENT or RCCM
interface AgencyDoc {
  id: string
  type: string
  url: string
  name: string
  status: string
  tcComment: string | null
  createdAt: string
  owner: {
    id: string
    firstName: string
    lastName: string
    phone: string
    email: string
    avatarUrl: string | null
  }
}

export function AgencyValidations() {
  const { user, isAuthenticated } = useAuthStore()
  const [docs, setDocs] = useState<AgencyDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Dialogs
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectComment, setRejectComment] = useState('')
  const [requestInfoId, setRequestInfoId] = useState<string | null>(null)
  const [requestInfoComment, setRequestInfoComment] = useState('')

  // Document preview
  const [previewDoc, setPreviewDoc] = useState<{ url: string; name: string; type: string } | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      // Fetch only AGREMENT and RCCM type ownership docs
      const [agrementRes, rccmRes] = await Promise.all([
        authFetch<{ docs: AgencyDoc[] }>('/api/tc/ownership-docs?type=AGREMENT'),
        authFetch<{ docs: AgencyDoc[] }>('/api/tc/ownership-docs?type=RCCM'),
      ])
      const allDocs = [...(agrementRes.docs || []), ...(rccmRes.docs || [])]
      setDocs(allDocs)
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) {
        setDocs([])
        return
      }
      setDocs([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useRealtimeOwnershipDocs({
    userId: user?.id,
    watchAll: true,
    onOwnershipDocChange: () => { fetchData() },
  })

  const handleAction = async (docId: string, action: 'APPROVE' | 'REJECT' | 'REQUEST_INFO', comment?: string) => {
    setActionLoading(docId)
    try {
      await authFetch('/api/tc/ownership-docs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docIds: [docId], action, comment }),
      })
      toast.success(action === 'APPROVE' ? 'Document validé' : action === 'REJECT' ? 'Document rejeté' : 'Demande envoyée')
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setActionLoading(null)
    }
  }

  const openPreview = (doc: AgencyDoc) => {
    setPreviewDoc({ url: doc.url, name: doc.name, type: doc.type })
    setPreviewOpen(true)
  }

  const filteredDocs = docs.filter((d) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      d.owner.firstName.toLowerCase().includes(s) ||
      d.owner.lastName.toLowerCase().includes(s) ||
      d.name.toLowerCase().includes(s)
    )
  })

  if (loading) return <div className="space-y-4">{[1, 2].map((i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}</div>

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header with gradient */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-rose-500 via-rose-600 to-pink-700 p-6 sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(0,0,0,0.08),transparent_50%)]" />
        <div className="relative z-10">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">Validations agences</h1>
          <p className="text-rose-100 mt-1.5 text-sm sm:text-base">Vérifiez les agréments et RCCM des agences immobilières</p>
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 text-white text-xs font-medium backdrop-blur-sm">
              <Building2 className="size-3.5" />
              {filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 text-white text-xs font-medium backdrop-blur-sm">
              <FileText className="size-3.5" />
              {filteredDocs.filter(d => d.type === 'AGREMENT').length} agrément{filteredDocs.filter(d => d.type === 'AGREMENT').length !== 1 ? 's' : ''}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 text-white text-xs font-medium backdrop-blur-sm">
              <FileText className="size-3.5" />
              {filteredDocs.filter(d => d.type === 'RCCM').length} RCCM
            </span>
          </div>
        </div>
      </div>

      {/* Search + View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une agence..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
      </div>

      {filteredDocs.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <Building2 className="size-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">Aucune agence en attente de validation</p>
            <p className="text-sm text-muted-foreground mt-1">Les demandes d&apos;agrément apparaîtront ici</p>
          </CardContent>
        </Card>
      ) : viewMode === 'card' ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {filteredDocs.map((doc) => (
            <Card key={doc.id} className="border-border">
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="size-10 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                    <Building2 className="size-5 text-brand-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{doc.owner.firstName} {doc.owner.lastName}</h3>
                    <p className="text-sm text-muted-foreground truncate">{doc.owner.phone}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {doc.type === 'AGREMENT' ? 'Agrément' : 'RCCM'}
                  </Badge>
                </div>

                <div
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted mb-3 cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => openPreview(doc)}
                >
                  <FileText className="size-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-brand-600 hover:underline">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">Soumis le {new Date(doc.createdAt).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white gap-1"
                    onClick={() => handleAction(doc.id, 'APPROVE')}
                    disabled={actionLoading === doc.id}
                  >
                    <Check className="size-4" /> Valider
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50 gap-1"
                    onClick={() => setRejectId(doc.id)}
                    disabled={actionLoading === doc.id}
                  >
                    <X className="size-4" /> Rejeter
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-amber-600 gap-1"
                    onClick={() => setRequestInfoId(doc.id)}
                    disabled={actionLoading === doc.id}
                  >
                    <MessageSquare className="size-4" /> Compléter
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-bold text-foreground">Agence</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-foreground">Document</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-foreground hidden sm:table-cell">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-foreground hidden md:table-cell">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground truncate max-w-[140px]">{doc.owner.firstName} {doc.owner.lastName}</p>
                      <p className="text-xs text-muted-foreground truncate">{doc.owner.phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => openPreview(doc)} className="text-sm text-brand-600 hover:underline">
                        {doc.name}
                      </button>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Badge variant="outline" className="text-xs">
                        {doc.type === 'AGREMENT' ? 'Agrément' : 'RCCM'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                      {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" className="text-green-600 h-8 w-8 p-0" onClick={() => handleAction(doc.id, 'APPROVE')} disabled={actionLoading === doc.id}>
                          <Check className="size-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-600 h-8 w-8 p-0" onClick={() => setRejectId(doc.id)} disabled={actionLoading === doc.id}>
                          <X className="size-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-amber-600 h-8 w-8 p-0" onClick={() => setRequestInfoId(doc.id)} disabled={actionLoading === doc.id}>
                          <MessageSquare className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectId !== null} onOpenChange={(open) => { if (!open) { setRejectId(null); setRejectComment('') } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rejeter le document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Veuillez indiquer la raison du rejet.</p>
            <Textarea placeholder="Raison du rejet..." value={rejectComment} onChange={(e) => setRejectComment(e.target.value)} rows={3} />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setRejectId(null); setRejectComment('') }}>Annuler</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => { if (rejectId) handleAction(rejectId, 'REJECT', rejectComment); setRejectId(null); setRejectComment('') }} disabled={!rejectComment.trim()}>Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Info Dialog */}
      <Dialog open={requestInfoId !== null} onOpenChange={(open) => { if (!open) { setRequestInfoId(null); setRequestInfoComment('') } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Demander des compléments</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Précisez les documents ou informations manquantes.</p>
            <Textarea placeholder="Documents complémentaires requis..." value={requestInfoComment} onChange={(e) => setRequestInfoComment(e.target.value)} rows={3} />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setRequestInfoId(null); setRequestInfoComment('') }}>Annuler</Button>
            <Button className="bg-brand-500 hover:bg-brand-600 text-white" onClick={() => { if (requestInfoId) handleAction(requestInfoId, 'REQUEST_INFO', requestInfoComment); setRequestInfoId(null); setRequestInfoComment('') }} disabled={!requestInfoComment.trim()}>Envoyer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Preview */}
      <DocumentPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} document={previewDoc} />
    </motion.div>
  )
}
