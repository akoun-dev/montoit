'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Users, Search, MapPin, X,
  Building2, User, UserCircle,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { useRealtimeUsers } from '@/hooks/use-realtime-users'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────────

interface UserItem {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  role: string
  activeRole: string
  isActive: boolean
  isEmailVerified: boolean
  isPhoneVerified: boolean
  avatarUrl: string | null
  city: string | null
  companyName: string | null
  createdAt: string
}

interface ApiResponse {
  users: UserItem[]
  stats: {
    total: number
    active: number
    inactive: number
    byRole: Record<string, { total: number; active: number }>
  }
}

// ─── Constants ──────────────────────────────────────────────────────────────

const roleLabels: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  LOCATAIRE: { label: 'Locataire', className: 'bg-teal-100 text-teal-700', icon: User },
  PROPRIETAIRE: { label: 'Propriétaire', className: 'bg-green-100 text-green-700', icon: Building2 },
  AGENCE: { label: 'Agence', className: 'bg-orange-100 text-orange-700', icon: UserCircle },
}

const roleOptions = [
  { value: 'ALL', label: 'Tous les rôles' },
  { value: 'LOCATAIRE', label: 'Locataire' },
  { value: 'PROPRIETAIRE', label: 'Propriétaire' },
  { value: 'AGENCE', label: 'Agence' },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

function UserAvatar({ firstName, lastName, avatarUrl }: { firstName: string; lastName: string; avatarUrl?: string | null }) {
  return (
    <div className="size-8 sm:size-10 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs sm:text-sm font-semibold shrink-0">
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
      ) : (
        `${firstName[0] ?? ''}${lastName[0] ?? ''}`
      )}
    </div>
  )
}

function shortDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function TcUsers() {
  const { isAuthenticated, user } = useAuthStore()
  const [users, setUsers] = useState<UserItem[]>([])
  const [stats, setStats] = useState<ApiResponse['stats']>({ total: 0, active: 0, inactive: 0, byRole: {} })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      const d = await authFetch<ApiResponse>('/api/tc/users')
      setUsers(d.users || [])
      setStats(d.stats || { total: 0, active: 0, inactive: 0, byRole: {} })
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) {
        setUsers([])
        return
      }
      setUsers([])
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  // ─── Realtime subscription (TC watches all users) ────────────────
  useRealtimeUsers({
    userId: user?.id,
    watchAll: true,
    onUserChange: () => { fetchData() },
  })

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const clearFilters = () => {
    setSearchQuery('')
    setFilterRole('')
  }

  const hasActiveFilters = searchQuery || filterRole
  const activeFilterCount = filterRole ? 1 : 0

  // Filter & sort client-side
  const filtered = users.filter((u) => {
    if (statusFilter !== 'all' && (statusFilter === 'active' ? !u.isActive : u.isActive)) return false
    if (filterRole && filterRole !== 'ALL' && u.role !== filterRole) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const fullName = `${u.firstName} ${u.lastName}`.toLowerCase()
      const email = (u.email ?? '').toLowerCase()
      const phone = (u.phone ?? '').toLowerCase()
      if (!fullName.includes(q) && !email.includes(q) && !phone.includes(q)) return false
    }
    return true
  })

  // ─── Loading Skeleton ─────────────────────────────────────────────────────

  if (loading && users.length === 0) {
    return (
      <div className="space-y-6">
        <div><div className="h-8 w-48 bg-muted animate-pulse rounded" /><div className="h-4 w-64 bg-muted animate-pulse rounded mt-2" /></div>
        <div className="flex gap-2">{[1,2,3].map((i) => <div key={i} className="h-9 w-24 bg-muted animate-pulse rounded-lg" />)}</div>
        {[1,2,3].map((i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}
      </div>
    )
  }

  // ─── Error State ──────────────────────────────────────────────────────────

  if (error) return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div><h1 className="text-xl sm:text-2xl font-bold text-foreground">Tous les utilisateurs</h1><p className="text-muted-foreground mt-1">Impossible de charger les utilisateurs</p></div>
      <Card className="border-amber-200 bg-amber-50"><CardContent className="p-4"><p className="text-sm text-amber-700">Impossible de charger. Veuillez réessayer.</p></CardContent></Card>
    </motion.div>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 sm:space-y-6"
    >
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <Card className="border-border bg-gradient-to-r from-brand-500/10 to-transparent">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-xl bg-brand-100">
                <Users className="size-6 text-brand-600" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">Tous les utilisateurs</h1>
                <p className="text-muted-foreground text-sm">
                  {stats.total} utilisateur{stats.total !== 1 ? 's' : ''} sur la plateforme
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge className="bg-brand-50 text-brand-700 border-brand-200 border text-[10px]">
                    <Users className="size-3 mr-0.5" /> {stats.total} total
                  </Badge>
                  <Badge className="bg-green-50 text-green-700 border-green-200 border text-[10px]">
                    <User className="size-3 mr-0.5" /> {stats.active} actifs
                  </Badge>
                  <Badge className="bg-red-50 text-red-700 border-red-200 border text-[10px]">
                    <User className="size-3 mr-0.5" /> {stats.inactive} inactifs
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="gap-1 text-muted-foreground h-9 px-2 sm:px-3"
                  aria-label="Effacer les filtres"
                >
                  <X className="size-3.5 sm:size-4" />
                  <span className="hidden sm:inline">Effacer les filtres</span>
                </Button>
              )}
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="h-9 w-full sm:w-40 text-xs sm:text-sm">
                  <SelectValue placeholder="Filtrer par rôle" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs sm:text-sm">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Stats Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button onClick={() => { setStatusFilter('all'); setFilterRole('') }}
          className={cn('p-3 rounded-xl border text-left transition-all', statusFilter === 'all' && !filterRole ? 'border-brand-500 bg-brand-50 shadow-sm' : 'border-border bg-card hover:bg-muted/50')}>
          <p className={cn('text-2xl font-bold', statusFilter === 'all' && !filterRole ? 'text-brand-600' : 'text-foreground')}>{stats.total}</p>
          <p className={cn('text-xs mt-0.5', statusFilter === 'all' && !filterRole ? 'text-brand-600 font-medium' : 'text-muted-foreground')}>Total</p>
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
        <Card className="border-dashed border-border bg-muted/50">
          <CardContent className="p-3 text-center">
            <p className={cn('text-2xl font-bold', 'text-foreground')}>{Object.keys(stats.byRole).length}</p>
            <p className={cn('text-xs mt-0.5', 'text-muted-foreground')}>Rôles</p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Stats by Role ──────────────────────────────────────────────── */}
      {Object.keys(stats.byRole).length > 0 && (
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {roleOptions.filter(o => o.value !== 'ALL').map((opt) => {
            const roleStat = stats.byRole[opt.value]
            if (!roleStat) return null
            const config = roleLabels[opt.value]
            return (
              <Badge
                key={opt.value}
                variant="outline"
                className={cn('py-1 sm:py-1.5 px-2 sm:px-3 text-[10px] sm:text-xs gap-1.5', config?.className)}
              >
                {config?.label || opt.label}
                <span className="font-bold">{roleStat.total}</span>
                <span className="text-muted-foreground font-normal">·</span>
                <span className="text-green-600">{roleStat.active} actif{roleStat.active !== 1 ? 's' : ''}</span>
              </Badge>
            )
          })}
        </div>
      )}

      {/* ─── Status Tabs ────────────────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {[
          { value: 'all', label: 'Tous' },
          { value: 'active', label: 'Actifs' },
          { value: 'inactive', label: 'Inactifs' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors',
              statusFilter === tab.value
                ? 'bg-brand-500 text-white'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Search Bar ──────────────────────────────────────────────────── */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 sm:size-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Rechercher un utilisateur..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 sm:pl-9 pr-3 h-10 sm:h-11 text-sm"
        />
      </div>

      {/* ─── Empty State ─────────────────────────────────────────────────── */}
      {!loading && filtered.length === 0 && (
        <Card className="border-dashed border-border bg-muted/50">
          <CardContent className="py-10 sm:py-16 text-center px-4">
            <Users className="size-10 sm:size-16 text-muted-foreground/30 mx-auto mb-3 sm:mb-4" />
            <p className="text-muted-foreground font-medium text-base sm:text-lg">
              Aucun utilisateur trouvé
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xs sm:max-w-md mx-auto">
              {hasActiveFilters
                ? 'Essayez de modifier vos filtres ou d\'élargir votre recherche.'
                : 'Aucun utilisateur n\'est encore inscrit sur la plateforme.'}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="mt-3 sm:mt-4 gap-2 h-9">
                <X className="size-3.5 sm:size-4" /> Effacer les filtres
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Users List ──────────────────────────────────────────────────── */}
      <div className="space-y-1.5 sm:space-y-2">
        <AnimatePresence mode="popLayout">
          {filtered.map((u) => {
            const roleConfig = roleLabels[u.role] || { label: u.role, className: 'bg-gray-100 text-gray-700' }

            return (
              <motion.div
                key={u.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
              >
                <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border border-border hover:bg-accent/40 transition-colors group">
                  {/* Avatar */}
                  <UserAvatar firstName={u.firstName} lastName={u.lastName} avatarUrl={u.avatarUrl} />

                  {/* Main info */}
                  <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] items-center gap-x-3 gap-y-1 sm:gap-y-0">
                    {/* Name + contact */}
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-foreground truncate flex items-center gap-1.5">
                        {u.firstName} {u.lastName}
                        {u.phone && (
                          <span className="text-[10px] sm:text-xs text-muted-foreground font-normal hidden sm:inline">
                            · {u.phone}
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
                        {u.email && <span className="truncate max-w-[140px] sm:max-w-[200px]">{u.email}</span>}
                        {u.city && (
                          <span className="flex items-center gap-0.5 shrink-0 hidden sm:inline-flex">
                            <MapPin className="size-2.5" /> {u.city}
                          </span>
                        )}
                        {u.companyName && (
                          <span className="shrink-0 hidden sm:inline">
                            · {u.companyName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Role badge */}
                    <div className="flex items-center gap-1.5 sm:justify-end md:justify-start">
                      <Badge className={cn('text-[9px] sm:text-[10px] leading-none px-1.5 py-0.5 whitespace-nowrap', roleConfig.className)}>
                        {roleConfig.label}
                      </Badge>
                      <Badge className={cn(
                        'text-[9px] sm:text-[10px] leading-none px-1.5 py-0.5 whitespace-nowrap',
                        u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      )}>
                        {u.isActive ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>

                    {/* Date */}
                    <p className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap sm:text-right md:text-left">
                      {shortDate(u.createdAt)}
                    </p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
