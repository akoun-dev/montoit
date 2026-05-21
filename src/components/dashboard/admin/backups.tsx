'use client'

import { useCallback, useEffect, useState } from 'react'
import { Database, Play, Download, Trash2, RotateCcw, Clock, CheckCircle, AlertTriangle, HardDrive } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { useRealtimeBackups } from '@/hooks/use-realtime-backups'

interface Backup {
  id: string
  name: string
  date: string
  size: string
  status: 'completed' | 'in_progress' | 'failed'
}

interface BackupsResponse {
  backups: Backup[]
  stats: {
    totalBackups: number
    lastBackupSize: string
    failedCount: number
  }
}

export function AdminBackups() {
  const { isAuthenticated, user } = useAuthStore()
  const [backups, setBackups] = useState<Backup[]>([])
  const [stats, setStats] = useState<BackupsResponse['stats'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [restoreDialog, setRestoreDialog] = useState<{ open: boolean; backup: Backup | null }>({ open: false, backup: null })
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; backup: Backup | null }>({ open: false, backup: null })
  const [triggering, setTriggering] = useState(false)

  const fetchBackups = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const data = await authFetch<BackupsResponse>('/api/admin/backups')
      setBackups(data.backups ?? [])
      setStats(data.stats ?? null)
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) { setBackups([]); return }
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setBackups([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => { fetchBackups() }, [fetchBackups])

  useRealtimeBackups({
    userId: user?.id,
    onBackupChange: useCallback(() => {
      fetchBackups()
    }, [fetchBackups]),
  })

  const handleTriggerBackup = () => {
    setTriggering(true)
    setTimeout(() => {
      fetchBackups()
      toast.success('Sauvegarde manuelle lancée')
      setTriggering(false)
    }, 1500)
  }

  const statusConfig: Record<string, { label: string; className: string; icon: typeof CheckCircle }> = {
    completed: { label: 'Terminé', className: 'bg-green-100 text-green-700', icon: CheckCircle },
    in_progress: { label: 'En cours', className: 'bg-amber-100 text-amber-700', icon: Clock },
    failed: { label: 'Échoué', className: 'bg-red-100 text-red-700', icon: AlertTriangle },
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Sauvegardes</h1>
          <p className="text-muted-foreground mt-1">Gestion des sauvegardes système</p>
        </div>
        <Button className="bg-[#FF6C2F] hover:bg-[#e55f28] text-white gap-2" onClick={handleTriggerBackup} disabled={triggering}>
          <Play className="size-4" /> {triggering ? 'Lancement...' : 'Sauvegarde manuelle'}
        </Button>
      </div>

      {/* Backup Status */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <CheckCircle className="size-8 text-green-600 mx-auto mb-2" />
            <p className="text-xl sm:text-2xl font-bold text-foreground">{backups.filter(b => b.status === 'completed').length}</p>
            <p className="text-xs text-muted-foreground">Sauvegardes réussies</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <HardDrive className="size-8 text-amber-600 mx-auto mb-2" />
            <p className="text-xl sm:text-2xl font-bold text-foreground">{backups[0]?.size || '—'}</p>
            <p className="text-xs text-muted-foreground">Dernière sauvegarde</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="size-8 text-red-600 mx-auto mb-2" />
            <p className="text-xl sm:text-2xl font-bold text-foreground">{backups.filter(b => b.status === 'failed').length}</p>
            <p className="text-xs text-muted-foreground">Échouées</p>
          </CardContent>
        </Card>
      </div>

      {/* Backup List */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Database className="size-5 text-[#FF6C2F]" />
            Historique des sauvegardes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Nom</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Date</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Taille</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Statut</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((backup) => {
                  const cfg = statusConfig[backup.status]
                  return (
                    <tr key={backup.id} className="border-b border-border hover:bg-accent">
                      <td className="py-3 px-3 font-medium text-foreground">{backup.name}</td>
                      <td className="py-3 px-3 text-muted-foreground">{new Date(backup.date).toLocaleString('fr-FR')}</td>
                      <td className="py-3 px-3 text-muted-foreground">{backup.size}</td>
                      <td className="py-3 px-3">
                        <Badge className={cfg.className}>{cfg.label}</Badge>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="size-7" title="Télécharger" onClick={() => toast.info('Téléchargement en cours...')}>
                            <Download className="size-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="size-7 text-teal-600" title="Restaurer" onClick={() => setRestoreDialog({ open: true, backup })}>
                            <RotateCcw className="size-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="size-7 text-red-600" title="Supprimer" onClick={() => setDeleteDialog({ open: true, backup })}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Restore Dialog */}
      <Dialog open={restoreDialog.open} onOpenChange={(open) => setRestoreDialog({ ...restoreDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurer la sauvegarde</DialogTitle>
            <DialogDescription>
              Voulez-vous restaurer la sauvegarde <strong>{restoreDialog.backup?.name}</strong> ?
              Cette action remplacera toutes les données actuelles.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialog({ ...restoreDialog, open: false })}>Annuler</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => {
              toast.success('Restauration lancée')
              setRestoreDialog({ ...restoreDialog, open: false })
            }}>
              Confirmer la restauration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer la sauvegarde</DialogTitle>
            <DialogDescription>
              Voulez-vous supprimer <strong>{deleteDialog.backup?.name}</strong> ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ ...deleteDialog, open: false })}>Annuler</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => {
              toast.success('Sauvegarde supprimée')
              setDeleteDialog({ ...deleteDialog, open: false })
            }}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
