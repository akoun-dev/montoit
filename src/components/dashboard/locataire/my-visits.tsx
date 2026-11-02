'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, Calendar, Clock, MapPin, ChevronRight, Search, Building2, Star } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useRealtimeVisits } from '@/hooks/use-realtime-visits'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states'

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    PENDING: { label: 'En attente', className: 'bg-amber-100 text-amber-700' },
    ACCEPTED: { label: 'Accepté', className: 'bg-green-100 text-green-700' },
    REJECTED: { label: 'Rejeté', className: 'bg-red-100 text-red-700' },
    COUNTER_PROPOSED: { label: 'Contre-proposition', className: 'bg-brand-100 text-brand-700' },
    COMPLETED: { label: 'Complété', className: 'bg-muted text-foreground' },
    CANCELLED: { label: 'Annulé', className: 'bg-muted text-muted-foreground' },
  }
  const c = config[status] || { label: status, className: 'bg-muted text-foreground' }
  return <Badge className={`${c.className} text-[10px]`}>{c.label}</Badge>
}

interface MyVisitsProps {
  onDetail: (id: string) => void
}

export function MyVisits({ onDetail }: MyVisitsProps) {
  const { user, isAuthenticated, setDashboardSection } = useAuthStore()
  const queryClient = useQueryClient()

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const queryKey = ['dashboard-locataire']

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const d = await authFetch<{ visitRequests: Array<{
        id: string
        status: string
        requestedDate: string
        timeSlot: string
        counterDate: string | null
        counterTimeSlot: string | null
        ownerComment: string | null
        property: { title: string; city: string; images: Array<{ url: string }> }
      }> }>('/api/dashboard/locataire')
      return d
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  })

  // ─── Realtime subscription for visit changes ────────────────────
  useRealtimeVisits({
    userId: user?.id,
    onVisitChange: (event, payload) => {
      if (event === 'UPDATE') {
        queryClient.setQueryData(queryKey, (prev: any) => {
          if (!prev?.visitRequests) return prev
          return {
            ...prev,
            visitRequests: prev.visitRequests.map((v: any) =>
              v.id === payload.id
                ? {
                    ...v,
                    status: payload.status,
                    requestedDate: payload.requested_date,
                    timeSlot: payload.time_slot,
                    counterDate: payload.counter_date,
                    counterTimeSlot: payload.counter_time_slot,
                    ownerComment: payload.owner_comment,
                  }
                : v
            ),
          }
        })
      } else if (event === 'INSERT') {
        queryClient.invalidateQueries({ queryKey })
      }
    },
  })

  const visits = data?.visitRequests || []

  const stats = {
    total: visits.length,
    PENDING: visits.filter(v => v.status === 'PENDING').length,
    ACCEPTED: visits.filter(v => v.status === 'ACCEPTED').length,
    COMPLETED: visits.filter(v => v.status === 'COMPLETED').length,
    REJECTED: visits.filter(v => ['REJECTED', 'CANCELLED'].includes(v.status)).length,
  }

  const statTabs = [
    { key: 'ALL', label: 'Toutes', count: stats.total },
    { key: 'PENDING', label: 'En attente', count: stats.PENDING },
    { key: 'ACCEPTED', label: 'Acceptées', count: stats.ACCEPTED },
    { key: 'COMPLETED', label: 'Terminées', count: stats.COMPLETED },
    { key: 'REJECTED', label: 'Refusées', count: stats.REJECTED },
  ]

  const [page, setPage] = useState(1)
  const limit = 10

  const filtered = visits.filter((vr) => {
    if (statusFilter !== 'ALL' && vr.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const propTitle = vr.property.title.toLowerCase()
      if (!propTitle.includes(q)) return false
    }
    return true
  })

  const filterKey = `${statusFilter}-${search}`
  useEffect(() => {
    if (page !== 1) setPage(1)
  }, [filterKey, page])

  const paginatedVisits = useMemo(() => {
    const start = (page - 1) * limit
    return filtered.slice(start, start + limit)
  }, [filtered, page, limit])

  if (isLoading) {
    return <LoadingState variant="detail" />
  }

  if (error && !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Mes visites</h1>
          <p className="text-muted-foreground mt-1">Suivez vos demandes de visite</p>
        </div>
        <ErrorState
          description="Impossible de charger vos visites. Veuillez réessayer."
          retry={() => queryClient.invalidateQueries({ queryKey })}
        />
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-500/10 to-transparent -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 rounded-none">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-brand-100">
            <Eye className="size-6 text-brand-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Mes visites</h1>
            <p className="text-muted-foreground mt-1">Suivez vos demandes de visite</p>
          </div>
        </div>
        {/* Badges stats */}
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-medium border border-brand-100">
            <Eye className="size-3" /> {stats.total} total
          </span>
          {stats.PENDING > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">
              {stats.PENDING} en attente
            </span>
          )}
          {stats.ACCEPTED > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100">
              {stats.ACCEPTED} acceptée{stats.ACCEPTED > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {statTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={cn(
              'p-3 rounded-xl border text-left transition-all',
              statusFilter === tab.key
                ? 'border-brand-500 bg-brand-50 shadow-sm'
                : 'border-border bg-card hover:bg-muted/50'
            )}
          >
            <p className={cn(
              'text-2xl font-bold',
              statusFilter === tab.key ? 'text-brand-600' : 'text-foreground'
            )}>{tab.count}</p>
            <p className={cn(
              'text-xs mt-0.5',
              statusFilter === tab.key ? 'text-brand-600 font-medium' : 'text-muted-foreground'
            )}>{tab.label}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par bien..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10"
        />
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {statTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors',
              statusFilter === tab.key
                ? 'bg-brand-500 text-white'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            )}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Visit list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Eye}
          title={search ? 'Aucune visite trouvée' : 'Aucune visite planifiée'}
          description={search ? 'Essayez de modifier votre recherche.' : 'Explorez les biens disponibles pour demander une visite'}
        />
      ) : (
        <div className="space-y-3">
          {paginatedVisits.map((vr) => (
            <Card
              key={vr.id}
              className="border-border hover:shadow-md transition-all cursor-pointer"
              onClick={() => onDetail(vr.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Property image */}
                  {vr.property.images?.[0] ? (
                    <div className="size-14 sm:size-16 rounded-lg bg-muted overflow-hidden shrink-0">
                      <img
                        src={vr.property.images[0].url}
                        alt={vr.property.title}
                        className="size-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="size-14 sm:size-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Building2 className="size-6 text-muted-foreground/40" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-foreground text-sm truncate">{vr.property.title}</h3>
                      <StatusBadge status={vr.status} />
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" />
                      {vr.property.city}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {new Date(vr.requestedDate).toLocaleDateString('fr-FR')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {vr.timeSlot}
                      </span>
                    </div>
                    {vr.status === 'COUNTER_PROPOSED' && vr.counterDate && (
                      <div className="mt-2 p-2 rounded bg-brand-50 text-xs text-brand-700">
                        Contre-proposition : {new Date(vr.counterDate).toLocaleDateString('fr-FR')} — {vr.counterTimeSlot}
                      </div>
                    )}
                    {vr.status === 'COMPLETED' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setDashboardSection('reviews') }}
                        className="mt-2 gap-1.5 h-7 text-xs border-brand-200 text-brand-600 hover:bg-brand-50"
                      >
                        <Star className="size-3" />
                        Donner mon avis
                      </Button>
                    )}
                  </div>

                  <ChevronRight className="size-5 text-neutral-300 shrink-0 self-center" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PaginationControls
        page={page}
        totalPages={Math.ceil(filtered.length / limit)}
        total={filtered.length}
        limit={limit}
        onPageChange={setPage}
      />
    </motion.div>
  )
}
