'use client'

import { useEffect, useState, useCallback } from 'react'
import { FolderOpen, User, FileText, MessageSquare, Download, X, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { useRealtimeRentalFiles } from '@/hooks/use-realtime-rental-files'
import { useRealtimeUsers } from '@/hooks/use-realtime-users'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface OwnerClient {
  id: string; firstName: string; lastName: string; email: string; phone: string | null
  status: string; propertiesCount: number; lastActivity: string
}

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

const statusConfig: Record<string, { label: string; cls: string }> = {
  actif: { label: 'Actif', cls: 'bg-green-100 text-green-700' },
  inactif: { label: 'Inactif', cls: 'bg-neutral-100 text-neutral-500' },
  prospect: { label: 'Prospect', cls: 'bg-amber-100 text-amber-700' },
}

export function ClientFiles() {
  const { isAuthenticated, user } = useAuthStore()
  const [clients, setClients] = useState<OwnerClient[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedClient, setSelectedClient] = useState<OwnerClient | null>(null)
  const [note, setNote] = useState('')
  const [documentsOpen, setDocumentsOpen] = useState(false)
  const [clientDocuments, setClientDocuments] = useState<{ id: string; name: string; type: string }[]>([])
  const [loadingDocs, setLoadingDocs] = useState(false)

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const data = await authFetch<{ clients: OwnerClient[] }>('/api/agence/users?role=PROPRIETAIRE')
      setClients(data.clients || [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) return
      console.error('Failed to fetch clients:', err)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => { fetchData() }, [fetchData])

  // Realtime: watch rental file changes for client activity updates
  useRealtimeRentalFiles({
    userId: user?.id,
    watchAll: true,
    onRentalFileChange: useCallback(() => {
      fetchData()
    }, [fetchData]),
  })

  // Realtime: watch user profile changes for client info updates
  useRealtimeUsers({
    userId: user?.id,
    watchAll: true,
    onUserChange: useCallback(() => {
      fetchData()
    }, [fetchData]),
  })

  const filtered = clients.filter((c) => statusFilter === 'all' || c.status === statusFilter)

  if (loading) return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}</div>

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <FolderOpen className="size-5 sm:size-6 text-[#FF6C2F]" /> Dossiers clients
        </h1>
        <p className="text-muted-foreground mt-1">{clients.length} client{clients.length > 1 ? 's' : ''} · {clients.filter((c) => c.status === 'actif').length} actifs</p>
      </motion.div>

      <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="actif">Actif</SelectItem>
            <SelectItem value="inactif">Inactif</SelectItem>
            <SelectItem value="prospect">Prospect</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      <motion.div variants={itemVariants} className="grid lg:grid-cols-3 gap-4">
        {/* Client List */}
        <Card className="border-border lg:col-span-1">
          <CardContent className="p-2 max-h-96 overflow-y-auto space-y-1">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun client trouvé</p>
            ) : (
              filtered.map((c) => (
                <button key={c.id} onClick={() => setSelectedClient(c)}
                  className={`w-full text-left p-2.5 rounded-lg hover:bg-accent/50 transition-colors ${selectedClient?.id === c.id ? 'bg-orange-50 border border-[#FF6C2F]/20' : ''}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{c.firstName} {c.lastName}</p>
                    <Badge className={statusConfig[c.status]?.cls || 'bg-neutral-100'}>{statusConfig[c.status]?.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.email}</p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Client Detail */}
        <Card className="border-border lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              {selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : 'Sélectionnez un client'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedClient ? (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="size-4 text-[#FF6C2F]" />
                      <span className="text-sm font-medium">Informations</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Email : {selectedClient.email}</p>
                    <p className="text-xs text-muted-foreground">Tél : {selectedClient.phone || 'Non renseigné'}</p>
                    <p className="text-xs text-muted-foreground">Biens : {selectedClient.propertiesCount}</p>
                  </div>                    <div className="p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="size-4 text-[#FF6C2F]" />
                      <span className="text-sm font-medium">Documents</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Documents disponibles</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[#FF6C2F] text-xs mt-1 gap-1"
                      onClick={async () => {
                        if (!selectedClient) return
                        setLoadingDocs(true)
                        setDocumentsOpen(true)
                        try {
                          const data = await authFetch<{ documents: { id: string; name: string; type: string }[] }>(
                            `/api/owner-file/documents?ownerId=${selectedClient.id}`
                          )
                          setClientDocuments(data.documents ?? [])
                        } catch {
                          setClientDocuments([])
                        } finally {
                          setLoadingDocs(false)
                        }
                      }}
                    >
                      <Eye className="size-3" /> Voir les documents
                    </Button>
                  </div>
                </div>

                {/* Activity History */}
                <div className="p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="size-4 text-[#FF6C2F]" />
                    <span className="text-sm font-medium">Historique d&apos;activité</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">• Dernière activité : {selectedClient.lastActivity ? new Date(selectedClient.lastActivity).toLocaleDateString('fr-FR') : 'N/A'}</p>
                  </div>
                </div>

                {/* Notes */}
                <div className="p-3 rounded-lg border border-border">
                  <span className="text-sm font-medium mb-2 block">Notes</span>
                  <textarea
                    className="w-full text-xs border rounded p-2 min-h-[60px] resize-y"
                    placeholder="Ajouter une note..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <Button size="sm" className="bg-[#FF6C2F] hover:bg-[#e55e27] text-white mt-2" onClick={async () => {
                    if (!note.trim()) {
                      toast.error('Veuillez écrire une note')
                      return
                    }
                    try {
                      // Sauvegarder dans le localStorage comme fallback
                      const key = `client-note-${selectedClient?.id}`
                      localStorage.setItem(key, note)
                      toast.success('Note sauvegardée')
                      setNote('')
                    } catch {
                      toast.error('Erreur lors de la sauvegarde')
                    }
                  }}>
                    Sauvegarder
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <FolderOpen className="size-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sélectionnez un client pour voir ses détails</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Documents Dialog */}
      <Dialog open={documentsOpen} onOpenChange={setDocumentsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4 text-[#FF6C2F]" />
              Documents de {selectedClient?.firstName} {selectedClient?.lastName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {loadingDocs ? (
              <div className="space-y-2 py-4">
                {[1,2,3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />)}
              </div>
            ) : clientDocuments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="size-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aucun document disponible</p>
              </div>
            ) : (
              clientDocuments.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="size-4 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate">{doc.name || doc.type}</span>
                  </div>
                  <Badge className="shrink-0 text-[10px] bg-orange-50 text-orange-700">
                    {doc.type}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
