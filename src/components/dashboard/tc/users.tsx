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
  const { isAuthenticated } = useAuthStore()
  const [users, setUsers] = useState<UserItem[]>([])
  const [stats, setStats] = useState<ApiResponse['stats']>({ total: 0, active: 0, inactive: 0, byRole: {} })
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState('')

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
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

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
      <div className="space-y-4 sm:space-y-6">
        <div className="h-10 w-full rounded-lg bg-muted animate-pulse" />
        <div className="space-y-2 sm:space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 sm:h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 sm:space-y-6 px-1 sm:px-0"
    >
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl xl:text-2xl font-bold text-foreground truncate">
            Tous les utilisateurs
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {stats.total} utilisateur{stats.total !== 1 ? 's' : ''} sur la plateforme
          </p>
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

      {/* ─── Stats Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <Card className="border-border">
          <CardContent className="p-3 sm:p-4 text-center">
            <p className="text-lg sm:text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-3 sm:p-4 text-center">
            <p className="text-lg sm:text-2xl font-bold text-green-600">{stats.active}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Actifs</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-3 sm:p-4 text-center">
            <p className="text-lg sm:text-2xl font-bold text-red-600">{stats.inactive}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Inactifs</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-3 sm:p-4 text-center">
            <p className="text-lg sm:text-2xl font-bold text-amber-600">{Object.keys(stats.byRole).length}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Rôles</p>
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
        <Card className="border-border">
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
