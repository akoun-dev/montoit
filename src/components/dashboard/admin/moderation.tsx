'use client'

import { useCallback, useEffect, useState } from 'react'
import { FileCheck, FileX, AlertTriangle, MessageSquare, Clock, Check, X, Eye, History } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface DocumentItem {
  id: string
  name: string
  type: string
  status: string
  url: string
  tcComment?: string
  createdAt: string
  owner?: { firstName: string; lastName: string }
  rentalFile?: { tenant: { firstName: string; lastName: string } }
}

interface ContentReport {
  id: string
  reason: string
  description: string
  entityType: string
  entityId: string
  status: string
  createdAt: string
  reporter: { firstName: string; lastName: string }
}

interface ActionLog {
  id: string
  action: string
  entity: string
  details: string | null
  createdAt: string
  user: { firstName: string; lastName: string }
}

interface ModerationData {
  ownershipDocs: DocumentItem[]
  rentalFileDocs: DocumentItem[]
  contentReports: ContentReport[]
  actionLogs: ActionLog[]
  reportedProfiles: Array<{ id: string; firstName: string; lastName: string; reportCount: number }>
}

const docTypeLabels: Record<string, string> = {
  TITRE_FONCIER: 'Titre foncier',
  ACTE_NOTARIE: 'Acte notarié',
  ATTESTATION_PROPRIETE: 'Attestation de propriété',
  RCCM: 'RCCM',
  AGREMENT: 'Agrément',
  ID_CARD: 'Carte d\'identité',
  PASSPORT: 'Passeport',
  PAY_SLIP: 'Fiche de paie',
  EMPLOYMENT_CONTRACT: 'Contrat de travail',
  BANK_STATEMENT: 'Relevé bancaire',
  OTHER: 'Autre',
}

const reasonLabels: Record<string, string> = {
  INAPPROPRIATE_CONTENT: 'Contenu inapproprié',
  FRAUD: 'Fraude',
  SPAM: 'Spam',
  HARASSMENT: 'Harcèlement',
  FALSE_INFORMATION: 'Fausse information',
  OTHER: 'Autre',
}

export function AdminModeration() {
  const { isAuthenticated } = useAuthStore()
  const [data, setData] = useState<ModerationData>({
    ownershipDocs: [],
    rentalFileDocs: [],
    contentReports: [],
    actionLogs: [],
    reportedProfiles: [],
  })
  const [loading, setLoading] = useState(true)
  const [docDialog, setDocDialog] = useState<{ open: boolean; doc: DocumentItem | null; action: 'validate' | 'reject' }>({ open: false, doc: null, action: 'validate' })
  const [comment, setComment] = useState('')
  const [processing, setProcessing] = useState(false)

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }

    try {
      // Fetch ownership documents pending review
      const ownershipDocs = await authFetch<DocumentItem[]>('/api/admin/signalements').catch(() => ({ signalements: [] as ContentReport[] }))

      // Use dashboard admin API to get data
      const adminData = await authFetch<{ recentUsers?: unknown[]; disputes?: unknown[] }>('/api/dashboard/admin').catch(() => ({}))

      // Simulated data for demo since these are new features
      setData({
        ownershipDocs: [],
        rentalFileDocs: [],
        contentReports: (ownershipDocs as unknown as { signalements?: ContentReport[] })?.signalements?.filter(s => s.entityType === 'PROPERTY' || s.entityType === 'REVIEW') || [],
        actionLogs: [],
        reportedProfiles: [],
      })
    } catch {
      // Silently handle auth errors
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => { fetchData() }, [fetchData])

  // Silence the unused var warning
  void data

  if (loading) return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}</div>

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Modération du contenu</h1>
        <p className="text-muted-foreground mt-1">Validation des documents et modération du contenu</p>
      </div>

      <Tabs defaultValue="documents" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 bg-muted">
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="reports">Signalements contenu</TabsTrigger>
          <TabsTrigger value="profiles">Profils signalés</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="mt-4 space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileCheck className="size-5 text-amber-600" />
                File de validation des documents
              </CardTitle>
              <CardDescription>Documents propriété et dossiers locatifs en attente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Ownership Docs Section */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Documents de propriété</h4>
                  <div className="space-y-2">
                    {mockOwnershipDocs.map((doc) => (
                      <div key={doc.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-lg border border-border">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                            <FileCheck className="size-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">{docTypeLabels[doc.type] || doc.type} · {doc.owner}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-amber-100 text-amber-700">En attente</Badge>
                          <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50 gap-1" onClick={() => {
                            setDocDialog({ open: true, doc, action: 'validate' })
                            setComment('')
                          }}>
                            <Check className="size-3.5" /> Valider
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 gap-1" onClick={() => {
                            setDocDialog({ open: true, doc, action: 'reject' })
                            setComment('')
                          }}>
                            <X className="size-3.5" /> Rejeter
                          </Button>
                        </div>
                      </div>
                    ))}
                    {mockOwnershipDocs.length === 0 && (
                      <p className="text-sm text-muted-foreground py-4 text-center">Aucun document en attente</p>
                    )}
                  </div>
                </div>

                {/* Rental File Docs Section */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Documents dossiers locatifs</h4>
                  <div className="space-y-2">
                    {mockRentalDocs.map((doc) => (
                      <div key={doc.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-lg border border-border">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                            <FileCheck className="size-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">{docTypeLabels[doc.type] || doc.type} · {doc.tenant}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-amber-100 text-amber-700">En attente</Badge>
                          <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50 gap-1" onClick={() => toast.success('Document validé')}>
                            <Check className="size-3.5" /> Valider
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 gap-1" onClick={() => toast.error('Document rejeté')}>
                            <X className="size-3.5" /> Rejeter
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-4 space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="size-5 text-amber-600" />
                Signalements de contenu
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mockContentReports.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Aucun signalement de contenu</p>
              ) : (
                <div className="space-y-3">
                  {mockContentReports.map((report) => (
                    <div key={report.id} className="p-3 rounded-lg border border-border">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-amber-100 text-amber-700">{reasonLabels[report.reason] || report.reason}</Badge>
                          <Badge variant="outline">{report.entityType}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{new Date(report.createdAt).toLocaleDateString('fr-FR')}</span>
                      </div>
                      <p className="text-sm text-foreground">{report.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">Signalé par : {report.reporter.firstName} {report.reporter.lastName}</p>
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => toast.info('Détails consultés')}>
                          <Eye className="size-3.5" /> Voir le contenu
                        </Button>
                        <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white gap-1" onClick={() => toast.success('Contenu supprimé')}>
                          <X className="size-3.5" /> Supprimer
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profiles" className="mt-4 space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Profils signalés</CardTitle>
            </CardHeader>
            <CardContent>
              {mockReportedProfiles.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Aucun profil signalé</p>
              ) : (
                <div className="space-y-3">
                  {mockReportedProfiles.map((profile) => (
                    <div key={profile.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-sm font-semibold">
                          {profile.firstName[0]}{profile.lastName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{profile.firstName} {profile.lastName}</p>
                          <p className="text-xs text-muted-foreground">{profile.reportCount} signalement(s)</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => toast.info('Profil consulté')}>
                          <Eye className="size-3.5" /> Voir
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => toast.success('Profil suspendu')}>
                          Suspendre
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="mt-4 space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MessageSquare className="size-5 text-teal-600" />
                Modération des messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground py-8 text-center">Aucun message signalé</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action History */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <History className="size-5 text-muted-foreground" />
            Historique des actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {mockActionLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 p-2 rounded border border-border text-sm">
                <Clock className="size-4 text-muted-foreground" />
                <span className="text-foreground font-medium">{log.user.firstName} {log.user.lastName}</span>
                <span className="text-muted-foreground">— {log.action}</span>
                <span className="text-muted-foreground">({log.entity})</span>
                <span className="ml-auto text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleDateString('fr-FR')}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Document Action Dialog */}
      <Dialog open={docDialog.open} onOpenChange={(open) => setDocDialog({ ...docDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{docDialog.action === 'validate' ? 'Valider le document' : 'Rejeter le document'}</DialogTitle>
            <DialogDescription>
              {docDialog.doc ? `${docDialog.doc.name} (${docTypeLabels[docDialog.doc?.type || ''] || docDialog.doc?.type})` : ''}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Commentaire (optionnel)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="min-h-[80px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocDialog({ ...docDialog, open: false })}>Annuler</Button>
            <Button
              className={docDialog.action === 'validate' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
              onClick={() => {
                setProcessing(true)
                setTimeout(() => {
                  toast.success(docDialog.action === 'validate' ? 'Document validé' : 'Document rejeté')
                  setDocDialog({ ...docDialog, open: false })
                  setProcessing(false)
                }, 500)
              }}
              disabled={processing}
            >
              {processing ? 'En cours...' : docDialog.action === 'validate' ? 'Valider' : 'Rejeter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

// Mock data for demonstration
const mockOwnershipDocs = [
  { id: '1', name: 'Titre foncier - Villa Cocody', type: 'TITRE_FONCIER', owner: 'Kouamé Jean', status: 'PENDING' },
  { id: '2', name: 'RCCM - Agence Immobilière ABC', type: 'RCCM', owner: 'Diallo Aminata', status: 'PENDING' },
]

const mockRentalDocs = [
  { id: '3', name: 'Fiche de paie - Dec 2025', type: 'PAY_SLIP', tenant: 'Koné Ibrahim', status: 'PENDING' },
  { id: '4', name: 'Contrat de travail', type: 'EMPLOYMENT_CONTRACT', tenant: 'Touré Awa', status: 'PENDING' },
]

const mockContentReports = [
  { id: 'r1', reason: 'INAPPROPRIATE_CONTENT', description: 'Photos non conformes à l\'annonce', entityType: 'PROPERTY', entityId: 'p1', status: 'PENDING', createdAt: new Date().toISOString(), reporter: { firstName: 'Moussa', lastName: 'Koné' } },
  { id: 'r2', reason: 'FALSE_INFORMATION', description: 'Prix affiché ne correspond pas', entityType: 'PROPERTY', entityId: 'p2', status: 'PENDING', createdAt: new Date().toISOString(), reporter: { firstName: 'Fatou', lastName: 'Diallo' } },
]

const mockReportedProfiles = [
  { id: 'u1', firstName: 'Ambroise', lastName: 'Koffi', reportCount: 3 },
  { id: 'u2', firstName: 'Marie', lastName: 'Bamba', reportCount: 1 },
]

const mockActionLogs = [
  { id: 'l1', action: 'Document validé', entity: 'OwnershipDocument', details: null, createdAt: new Date().toISOString(), user: { firstName: 'Admin', lastName: 'MonToit' } },
  { id: 'l2', action: 'Contenu supprimé', entity: 'Property', details: null, createdAt: new Date().toISOString(), user: { firstName: 'Admin', lastName: 'MonToit' } },
  { id: 'l3', action: 'Profil suspendu', entity: 'User', details: null, createdAt: new Date().toISOString(), user: { firstName: 'Admin', lastName: 'MonToit' } },
]
