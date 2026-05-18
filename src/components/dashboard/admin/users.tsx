'use client'

import { useCallback, useEffect, useState } from 'react'
import { Users, Search, UserX, Shield, Power, ChevronDown, ArrowUpDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface UserData {
  users: Array<{
    id: string; firstName: string; lastName: string; phone: string; role: string; isActive: boolean; email: string | null; createdAt: string
  }>
  stats: {
    total: number
    active: number
    inactive: number
    byRole: Record<string, number>
  }
}

function RoleBadge({ role }: { role: string }) {
  const config: Record<string, { label: string; className: string }> = {
    LOCATAIRE: { label: 'Locataire', className: 'bg-teal-100 text-teal-700' },
    PROPRIETAIRE: { label: 'Propriétaire', className: 'bg-green-100 text-green-700' },
    TIERS_CONFIANCE: { label: 'TC', className: 'bg-amber-100 text-amber-700' },
    ADMIN: { label: 'Admin', className: 'bg-rose-100 text-rose-700' },
    AGENCE: { label: 'Agence', className: 'bg-orange-100 text-orange-700' },
  }
  const c = config[role] || { label: role, className: 'bg-neutral-100 text-neutral-700' }
  return <Badge className={c.className}>{c.label}</Badge>
}

const roleLabels: Record<string, string> = {
  LOCATAIRE: 'Locataire',
  PROPRIETAIRE: 'Propriétaire',
  TIERS_CONFIANCE: 'Tiers de Confiance',
  ADMIN: 'Administrateur',
  AGENCE: 'Agence',
}

export function AdminUsers() {
  const { isAuthenticated } = useAuthStore()
  const [data, setData] = useState<UserData['users']>([])
  const [stats, setStats] = useState<UserData['stats']>({ total: 0, active: 0, inactive: 0, byRole: {} })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<'createdAt' | 'firstName'>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [banDialog, setBanDialog] = useState<{ open: boolean; userId: string; userName: string; action: 'ban' | 'reactivate' }>({ open: false, userId: '', userName: '', action: 'ban' })
  const [roleDialog, setRoleDialog] = useState<{ open: boolean; userId: string; userName: string; currentRole: string; newRole: string }>({ open: false, userId: '', userName: '', currentRole: '', newRole: '' })
  const [updating, setUpdating] = useState(false)

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      const d = await authFetch<UserData>('/api/admin/users')
      setData(d.users || [])
      setStats(d.stats || { total: 0, active: 0, inactive: 0, byRole: {} })
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) {
        setData([])
        return
      }
      setData([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRoleChange = async () => {
    setUpdating(true)
    try {
      await authFetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: roleDialog.userId, role: roleDialog.newRole }),
      })
      toast.success(`Rôle changé en ${roleLabels[roleDialog.newRole] || roleDialog.newRole}`)
      setRoleDialog({ open: false, userId: '', userName: '', currentRole: '', newRole: '' })
      fetchData()
    } catch {
      toast.error('Erreur lors du changement de rôle')
    } finally {
      setUpdating(false)
    }
  }

  const handleBanToggle = async () => {
    setUpdating(true)
    try {
      await authFetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: banDialog.userId, isActive: banDialog.action === 'reactivate' }),
      })
      toast.success(banDialog.action === 'ban' ? 'Utilisateur suspendu' : 'Utilisateur réactivé')
      setBanDialog({ open: false, userId: '', userName: '', action: 'ban' })
      fetchData()
    } catch {
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}</div>

  const filtered = data
    .filter((u) => {
      const matchesSearch = `${u.firstName} ${u.lastName} ${u.phone} ${u.email}`.toLowerCase().includes(search.toLowerCase())
      const matchesRole = roleFilter === 'all' || u.role === roleFilter
      return matchesSearch && matchesRole
    })
    .sort((a, b) => {
      const valA = sortField === 'createdAt' ? new Date(a.createdAt).getTime() : a.firstName.toLowerCase()
      const valB = sortField === 'createdAt' ? new Date(b.createdAt).getTime() : b.firstName.toLowerCase()
      return sortOrder === 'desc' ? (valA > valB ? -1 : 1) : (valA < valB ? -1 : 1)
    })

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Gestion des utilisateurs</h1>
          <p className="text-muted-foreground mt-1">{stats.total} utilisateur(s) au total</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="w-full sm:w-56">
            <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9" />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-40 h-9">
              <SelectValue placeholder="Filtrer par rôle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les rôles</SelectItem>
              <SelectItem value="LOCATAIRE">Locataire</SelectItem>
              <SelectItem value="PROPRIETAIRE">Propriétaire</SelectItem>
              <SelectItem value="AGENCE">Agence</SelectItem>
              <SelectItem value="TIERS_CONFIANCE">TC</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.active}</p>
            <p className="text-xs text-muted-foreground">Actifs</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <p className="text-xl sm:text-2xl font-bold text-red-600">{stats.inactive}</p>
            <p className="text-xs text-muted-foreground">Inactifs</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <p className="text-xl sm:text-2xl font-bold text-amber-600">{Object.keys(stats.byRole).length}</p>
            <p className="text-xs text-muted-foreground">Rôles</p>
          </CardContent>
        </Card>
      </div>

      {/* Users by Role */}
      {Object.keys(stats.byRole).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.byRole).map(([role, count]) => (
            <Badge key={role} variant="outline" className="py-1 px-3 text-sm">
              {roleLabels[role] || role}: <span className="font-bold ml-1">{count}</span>
            </Badge>
          ))}
        </div>
      )}

      <Card className="border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Utilisateur</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Email</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Rôle</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Statut</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium cursor-pointer" onClick={() => {
                    if (sortField === 'createdAt') setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                    else { setSortField('createdAt'); setSortOrder('desc') }
                  }}>
                    <span className="flex items-center gap-1">Inscrit le <ArrowUpDown className="size-3" /></span>
                  </th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-border hover:bg-accent">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-[#FF6C2F] text-white flex items-center justify-center text-xs font-semibold">
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <div>
                          <span className="font-medium text-foreground">{u.firstName} {u.lastName}</span>
                          <p className="text-xs text-muted-foreground">{u.phone || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{u.email || '—'}</td>
                    <td className="py-3 px-4">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                        {u.isActive ? 'Actif' : 'Suspendu'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{new Date(u.createdAt).toLocaleDateString('fr-FR')}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        {/* Role change */}
                        <Select
                          value={u.role}
                          onValueChange={(newRole) => setRoleDialog({
                            open: true,
                            userId: u.id,
                            userName: `${u.firstName} ${u.lastName}`,
                            currentRole: u.role,
                            newRole,
                          })}
                        >
                          <SelectTrigger className="h-8 w-28 text-xs">
                            <ChevronDown className="size-3" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LOCATAIRE">Locataire</SelectItem>
                            <SelectItem value="PROPRIETAIRE">Propriétaire</SelectItem>
                            <SelectItem value="AGENCE">Agence</SelectItem>
                            <SelectItem value="TIERS_CONFIANCE">TC</SelectItem>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        {/* Ban/Suspend/Reactivate */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`size-8 ${u.isActive ? 'text-red-500 hover:text-red-700 hover:bg-red-50' : 'text-green-500 hover:text-green-700 hover:bg-green-50'}`}
                          title={u.isActive ? 'Suspendre' : 'Réactiver'}
                          onClick={() => setBanDialog({
                            open: true,
                            userId: u.id,
                            userName: `${u.firstName} ${u.lastName}`,
                            action: u.isActive ? 'ban' : 'reactivate',
                          })}
                        >
                          <Power className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">Aucun utilisateur trouvé</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Ban/Suspend Confirmation Dialog */}
      <Dialog open={banDialog.open} onOpenChange={(open) => setBanDialog({ ...banDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{banDialog.action === 'ban' ? 'Suspendre l\'utilisateur' : 'Réactiver l\'utilisateur'}</DialogTitle>
            <DialogDescription>
              {banDialog.action === 'ban'
                ? `Êtes-vous sûr de vouloir suspendre ${banDialog.userName} ? L'utilisateur ne pourra plus se connecter.`
                : `Êtes-vous sûr de vouloir réactiver ${banDialog.userName} ?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialog({ ...banDialog, open: false })}>Annuler</Button>
            <Button
              className={banDialog.action === 'ban' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}
              onClick={handleBanToggle}
              disabled={updating}
            >
              {updating ? 'En cours...' : banDialog.action === 'ban' ? 'Suspendre' : 'Réactiver'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Change Confirmation Dialog */}
      <Dialog open={roleDialog.open} onOpenChange={(open) => setRoleDialog({ ...roleDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer le rôle</DialogTitle>
            <DialogDescription>
              Changer le rôle de {roleDialog.userName} de <strong>{roleLabels[roleDialog.currentRole]}</strong> à <strong>{roleLabels[roleDialog.newRole]}</strong> ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialog({ ...roleDialog, open: false })}>Annuler</Button>
            <Button className="bg-[#FF6C2F] hover:bg-[#e55f28] text-white" onClick={handleRoleChange} disabled={updating}>
              {updating ? 'En cours...' : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
