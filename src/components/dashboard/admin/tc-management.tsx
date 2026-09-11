'use client'

import { useCallback, useEffect, useState } from 'react'
import { Shield, Plus, Trash2, RotateCcw, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface TcUser {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  isActive: boolean
}

export function TcManagement() {
  const [users, setUsers] = useState<TcUser[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; user: TcUser | null; action: 'revoke' | 'reactivate' }>({ open: false, user: null, action: 'revoke' })
  const [processing, setProcessing] = useState(false)

  const [promoteOpen, setPromoteOpen] = useState(false)
  const [promoteSearch, setPromoteSearch] = useState('')
  const [promoteResults, setPromoteResults] = useState<TcUser[]>([])
  const [promoteSearching, setPromoteSearching] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const d = await authFetch<{ users: TcUser[] }>('/api/admin/users?role=TIERS_CONFIANCE')
      setUsers(d.users || [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) return
      toast.error('Erreur lors du chargement des Tiers de Confiance')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleConfirm = async () => {
    if (!confirmDialog.user) return
    setProcessing(true)
    try {
      await authFetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: confirmDialog.user.id, isActive: confirmDialog.action === 'reactivate' }),
      })
      toast.success(confirmDialog.action === 'revoke' ? 'Compte révoqué' : 'Compte réactivé')
      setConfirmDialog({ open: false, user: null, action: 'revoke' })
      fetchData()
    } catch {
      toast.error('Erreur lors du traitement')
    } finally {
      setProcessing(false)
    }
  }

  const handlePromoteSearch = async (q: string) => {
    setPromoteSearch(q)
    if (q.trim().length < 2) { setPromoteResults([]); return }
    setPromoteSearching(true)
    try {
      const d = await authFetch<{ users: TcUser[] }>(`/api/admin/users?search=${encodeURIComponent(q)}`)
      setPromoteResults((d.users || []).filter((u: any) => u.role !== 'TIERS_CONFIANCE'))
    } catch {
      setPromoteResults([])
    } finally {
      setPromoteSearching(false)
    }
  }

  const handlePromote = async (user: TcUser) => {
    setProcessing(true)
    try {
      await authFetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, role: 'TIERS_CONFIANCE' }),
      })
      toast.success(`${user.firstName} ${user.lastName} est maintenant Tiers de Confiance`)
      setPromoteOpen(false)
      setPromoteSearch('')
      setPromoteResults([])
      fetchData()
    } catch {
      toast.error('Erreur lors de la promotion')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) return <div className="space-y-4">{[1, 2].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}</div>

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Gestion des Tiers de Confiance</h1>
          <p className="text-muted-foreground mt-1">{users.length} compte{users.length > 1 ? 's' : ''} TC</p>
        </div>
        <Button className="bg-brand-500 hover:bg-brand-600 text-white gap-2" onClick={() => setPromoteOpen(true)}>
          <Plus className="size-4" /> Promouvoir un compte TC
        </Button>
      </div>

      {users.length === 0 ? (
        <Card className="border-dashed border-border bg-muted/50">
          <CardContent className="py-12 text-center">
            <Shield className="size-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">Aucun compte Tiers de Confiance</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <Card key={u.id} className="border-border">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-semibold shrink-0">
                      TC
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{u.firstName} {u.lastName}</p>
                      <p className="text-sm text-muted-foreground truncate">{u.phone || '—'} · {u.email || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={u.isActive ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-600'}>
                      {u.isActive ? 'Actif' : 'Révoqué'}
                    </Badge>
                    {u.isActive ? (
                      <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 gap-1"
                        onClick={() => setConfirmDialog({ open: true, user: u, action: 'revoke' })}>
                        <Trash2 className="size-3.5" /> Révoquer
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50 gap-1"
                        onClick={() => setConfirmDialog({ open: true, user: u, action: 'reactivate' })}>
                        <RotateCcw className="size-3.5" /> Réactiver
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Confirm revoke/reactivate */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmDialog.action === 'revoke' ? 'Révoquer ce compte TC' : 'Réactiver ce compte TC'}</DialogTitle>
            <DialogDescription>
              {confirmDialog.action === 'revoke'
                ? `${confirmDialog.user?.firstName} ${confirmDialog.user?.lastName} ne pourra plus accéder à son espace Tiers de Confiance.`
                : `${confirmDialog.user?.firstName} ${confirmDialog.user?.lastName} retrouvera l'accès à son espace Tiers de Confiance.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>Annuler</Button>
            <Button
              className={confirmDialog.action === 'revoke' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}
              onClick={handleConfirm}
              disabled={processing}
            >
              {processing ? 'En cours...' : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Promote existing user to TC */}
      <Dialog open={promoteOpen} onOpenChange={(open) => { setPromoteOpen(open); if (!open) { setPromoteSearch(''); setPromoteResults([]) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promouvoir un compte TC</DialogTitle>
            <DialogDescription>Recherchez un utilisateur existant à promouvoir Tiers de Confiance.</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Nom, email ou téléphone..."
              value={promoteSearch}
              onChange={(e) => handlePromoteSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {promoteSearching && <p className="text-sm text-muted-foreground py-2">Recherche...</p>}
            {!promoteSearching && promoteSearch.trim().length >= 2 && promoteResults.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">Aucun utilisateur trouvé</p>
            )}
            {promoteResults.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-2 rounded-lg border border-border">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{u.firstName} {u.lastName}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email || u.phone}</p>
                </div>
                <Button size="sm" disabled={processing} onClick={() => handlePromote(u)} className="shrink-0 bg-brand-500 hover:bg-brand-600 text-white">
                  Promouvoir
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
