'use client'

import { useCallback, useEffect, useState } from 'react'
import { Users, Search, UserX, Shield, Power, ChevronDown, ArrowUpDown, Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { useRealtimeUsers } from '@/hooks/use-realtime-users'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { downloadCsv } from '@/lib/csv'

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
  const { user, isAuthenticated } = useAuthStore()
  const [data, setData] = useState<UserData['users']>([])
  const [stats, setStats] = useState<UserData['stats']>({ total: 0, active: 0, inactive: 0, byRole: {} })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
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

  useRealtimeUsers({
    userId: user?.id,
    watchAll: true,
    onUserChange: () => { fetchData() },
  })

  useEffect(() => { fetchData() }, [fetchData])

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
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && u.isActive) || (statusFilter === 'inactive' && !u.isActive)
      return matchesSearch && matchesRole && matchesStatus
    })
    .sort((a, b) => {
      const valA = sortField === 'createdAt' ? new Date(a.createdAt).getTime() : a.firstName.toLowerCase()
      const valB = sortField === 'createdAt' ? new Date(b.createdAt).getTime() : b.firstName.toLowerCase()
      return sortOrder === 'desc' ? (valA > valB ? -1 : 1) : (valA < valB ? -1 : 1)
    })

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error('Aucun utilisateur à exporter')
      return
    }
    const header = ['Prénom', 'Nom', 'Email', 'Téléphone', 'Rôle', 'Statut', 'Créé le']
    const rows = filtered.map((u) => [
      u.firstName,
      u.lastName,
      u.email || '',
      u.phone || '',
      roleLabels[u.role] || u.role,
      u.isActive ? 'Actif' : 'Inactif',
      new Date(u.createdAt).toLocaleDateString('fr-FR'),
    ])
    downloadCsv(`utilisateurs-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows])
    toast.success(`${filtered.length} utilisateur${filtered.length > 1 ? 's' : ''} exporté${filtered.length > 1 ? 's' : ''}`)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Gestion des utilisateurs</h1>
          <p className="text-muted-foreground mt-1">{stats.total} utilisateur(s) au total</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-40 h-10">
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
          <Button variant="outline" size="sm" className="gap-1 h-10" onClick={handleExport}>
            <Download className="size-3" /> Exporter
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button onClick={() => { setStatusFilter('all'); setRoleFilter('all') }}
          className={cn('p-3 rounded-xl border text-left transition-all', statusFilter === 'all' ? 'border-brand-500 bg-brand-50 shadow-sm' : 'border-border bg-card hover:bg-muted/50')}>
          <p className={cn('text-2xl font-bold', statusFilter === 'all' ? 'text-brand-600' : 'text-foreground')}>{stats.total}</p>
          <p className={cn('text-xs mt-0.5', statusFilter === 'all' ? 'text-brand-600 font-medium' : 'text-muted-foreground')}>Total</p>
        </button>
        <button onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
          className={cn('p-3 rounded-xl border text-left transition-all', statusFilter === 'active' ? 'border-brand-500 bg-brand-50 shadow-sm' : 'border-border bg-card hover:bg-muted/50')}>
          <p className={cn('text-2xl font-bold', statusFilter === 'active' ? 'text-brand-600' : 'text-foreground')}>{stats.active}</p>
          <p className={cn('text-xs mt-0.5', statusFilter === 'active' ? 'text-brand-600 font-medium' : 'text-muted-foreground')}>Actifs</p>
        </button>
        <button onClick={() => setStatusFilter(statusFilter === 'inactive' ? 'all' : 'inactive')}
          className={cn('p-3 rounded-xl border text-left transition-all', statusFilter === 'inactive' ? 'border-brand-500 bg-brand-50 shadow-sm' : 'border-border bg-card hover:bg-muted/50')}>
          <p className={cn('text-2xl font-bold', statusFilter === 'inactive' ? 'text-brand-600' : 'text-foreground')}>{stats.inactive}</p>
          <p className={cn('text-xs mt-0.5', statusFilter === 'inactive' ? 'text-brand-600 font-medium' : 'text-muted-foreground')}>Inactifs</p>
        </button>
        <div className="p-3 rounded-xl border border-border bg-card">
          <p className="text-2xl font-bold text-foreground">{Object.keys(stats.byRole).length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Rôles</p>
        </div>
      </div>

      {/* Users by Role */}
      {Object.keys(stats.byRole).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.byRole).map(([role, count]) => (
            <button key={role} onClick={() => setRoleFilter(role === roleFilter ? 'all' : role)}
              className={cn('px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border', role === roleFilter ? 'bg-brand-500 text-white border-brand-500' : 'bg-muted text-muted-foreground border-border hover:bg-accent')}>
              {roleLabels[role] || role}: <span className="font-bold ml-1">{count}</span>
            </button>
          ))}
          {roleFilter !== 'all' && (
            <button onClick={() => setRoleFilter('all')} className="rounded-full px-3 py-1 text-xs font-medium bg-muted text-muted-foreground border border-border hover:bg-muted/80">
              ✕ Tout voir
            </button>
          )}
        </div>
      )}

      {/* Status Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { value: 'all', label: 'Tous' },
          { value: 'active', label: 'Actifs' },
          { value: 'inactive', label: 'Inactifs' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap',
              statusFilter === tab.value
                ? 'bg-brand-500 text-white'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed border-border bg-muted/50">
          <CardContent className="py-12 text-center">
            <Users className="size-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">Aucun utilisateur trouvé</p>
          </CardContent>
        </Card>
      ) : (
        <motion.div initial="hidden" animate="show" variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } }} className="space-y-2">
          {filtered.map((u) => (
            <motion.div key={u.id} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/40 transition-colors group">
                <div className="size-10 rounded-full bg-[#FF6C2F] text-white flex items-center justify-center text-xs font-semibold shrink-0">
                  {u.firstName[0]}{u.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{u.firstName} {u.lastName}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email || u.phone || '—'}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <RoleBadge role={u.role} />
                  <Badge className={u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                    {u.isActive ? 'Actif' : 'Suspendu'}
                  </Badge>
                  <span className="text-xs text-muted-foreground hidden sm:inline">{new Date(u.createdAt).toLocaleDateString('fr-FR')}</span>
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
                    <SelectTrigger className="h-8 w-24 text-xs">
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
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

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
