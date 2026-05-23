'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Building2, Search, MapPin, X, Check,
  Loader2, FileText, ChevronDown, SlidersHorizontal,
  User, Calendar, Bed, Ruler, Eye, LayoutList, LayoutGrid,
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
import { useRealtimeProperties } from '@/hooks/use-realtime-properties'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ─── Types ──────────────────────────────────────────────────────────────────

interface PropertyItem {
  id: string
  title: string
  type: string
  status: string
  price: number
  area: number
  commune: string | null
  address: string | null
  bedrooms: number | null
  bathrooms: number | null
  isVerified: boolean
  isFurnished: boolean
  hasParking: boolean
  hasClimate: boolean
  ownerId: string
  createdAt: string
  owner: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string
  } | null
  images: Array<{ id: string; url: string; order: number }>
  inventoryReportCount: number
}

interface ApiResponse {
  properties: PropertyItem[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

// ─── Constants ──────────────────────────────────────────────────────────────

const typeLabels: Record<string, string> = {
  APPARTEMENT: 'Appartement',
  APARTMENT: 'Appartement',
  MAISON: 'Maison',
  HOUSE: 'Maison',
  STUDIO: 'Studio',
  CHAMBRE: 'Chambre',
  VILLA: 'Villa',
  DUPLEX: 'Duplex',
  PENTHOUSE: 'Penthouse',
  CONCESSION: 'Concession',
  IMMEUBLE: 'Immeuble',
  COMMERCIAL: 'Local commercial',
  LAND: 'Terrain',
}

const statusLabels: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Brouillon', className: 'bg-gray-100 text-gray-700' },
  PENDING_VERIFICATION: { label: 'En attente', className: 'bg-amber-100 text-amber-700' },
  ACTIVE: { label: 'Actif', className: 'bg-green-100 text-green-700' },
  SUSPENDED: { label: 'Suspendu', className: 'bg-red-100 text-red-700' },
  CLOSED: { label: 'Fermé', className: 'bg-gray-100 text-gray-500' },
  RENTED: { label: 'Loué', className: 'bg-emerald-100 text-emerald-700' },
}

const statusOptions = [
  { value: 'ALL', label: 'Tous les statuts' },
  { value: 'ACTIVE', label: 'Actif' },
  { value: 'PENDING_VERIFICATION', label: 'En attente' },
  { value: 'DRAFT', label: 'Brouillon' },
  { value: 'SUSPENDED', label: 'Suspendu' },
  { value: 'RENTED', label: 'Loué' },
  { value: 'CLOSED', label: 'Fermé' },
]

const typeOptions = [
  { value: 'ALL', label: 'Tous les types' },
  { value: 'APPARTEMENT', label: 'Appartement' },
  { value: 'MAISON', label: 'Maison' },
  { value: 'STUDIO', label: 'Studio' },
  { value: 'CHAMBRE', label: 'Chambre' },
  { value: 'VILLA', label: 'Villa' },
  { value: 'DUPLEX', label: 'Duplex' },
  { value: 'CONCESSION', label: 'Concession' },
  { value: 'IMMEUBLE', label: 'Immeuble' },
  { value: 'COMMERCIAL', label: 'Local commercial' },
]

// ─── Property Thumbnail ─────────────────────────────────────────────────────

function PropertyThumbnail({ images, title, className }: { images: PropertyItem['images']; title: string; className?: string }) {
  const [imgError, setImgError] = useState(false)
  const hasImage = images && images.length > 0 && !imgError

  return (
    <div className={cn('relative bg-muted overflow-hidden shrink-0', className || 'w-full h-36 sm:h-44')}>
      {hasImage ? (
        <img
          src={images[0].url}
          alt={title}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Building2 className="size-5 sm:size-7 text-muted-foreground/30" />
        </div>
      )}
    </div>
  )
}

// ─── Format helpers ─────────────────────────────────────────────────────────

function priceFCFA(val: number) {
  return (val ?? 0).toLocaleString('fr-FR')
}

function shortDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ─── List Row Component ─────────────────────────────────────────────────────

function ListRow({
  property,
  onDetail,
  onInventory,
  onApprove,
  actionLoading,
}: {
  property: PropertyItem
  onDetail: (id: string) => void
  onInventory: (id: string) => void
  onApprove: (id: string) => void
  actionLoading: string | null
}) {
  const statusInfo = statusLabels[property.status] || { label: property.status, className: 'bg-gray-100 text-gray-700' }
  const isPending = property.status === 'PENDING_VERIFICATION'

  return (
    <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border border-border hover:bg-accent/40 transition-colors group">
      {/* Thumbnail — hidden on very small screens */}
      <div className="hidden sm:block size-10 sm:size-12 md:size-14 shrink-0 rounded-md overflow-hidden">
        <PropertyThumbnail images={property.images} title={property.title} className="w-full h-full" />
      </div>

      {/* Main info — grows to fill */}
      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[1fr_auto] md:grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 gap-y-1 md:gap-y-0">
        {/* Title + commune */}
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-semibold text-foreground truncate group-hover:text-brand-500 transition-colors">
            {property.title || 'Sans titre'}
          </p>
          {(property.commune || property.address) && (
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate flex items-center gap-0.5">
              <MapPin className="size-2.5 sm:size-3 shrink-0" />
              {property.commune || property.address}
            </p>
          )}
        </div>

        {/* Type + Status badges — row on xs+ */}
        <div className="flex flex-wrap items-center gap-1 min-w-0 sm:justify-end md:justify-start">
          <Badge className="bg-brand-500/10 text-brand-600 text-[9px] sm:text-[10px] leading-none px-1.5 py-0.5 font-medium whitespace-nowrap">
            {typeLabels[property.type] || property.type}
          </Badge>
          <Badge className={cn('text-[9px] sm:text-[10px] leading-none px-1.5 py-0.5 whitespace-nowrap', statusInfo.className)}>
            {statusInfo.label}
          </Badge>
          {property.isVerified && (
            <Badge className="bg-emerald-500 text-white text-[9px] sm:text-[10px] leading-none px-1.5 py-0.5 flex items-center gap-0.5 whitespace-nowrap">
              <Check className="size-2" /> Vérifié
            </Badge>
          )}
        </div>

        {/* Price */}
        <p className="text-xs sm:text-sm font-bold text-brand-500 leading-tight whitespace-nowrap sm:text-right md:text-left">
          {priceFCFA(property.price)} <span className="text-[9px] sm:text-[10px] font-normal text-muted-foreground">FCFA</span>
        </p>

        {/* Owner + Date */}
        <div className="text-[10px] sm:text-xs text-muted-foreground min-w-0 sm:text-right md:text-left">
          {property.owner && (
            <div className="flex items-center gap-0.5 justify-end md:justify-start truncate">
              <User className="size-2.5 sm:size-3 shrink-0" />
              <span className="truncate max-w-[100px] sm:max-w-[140px]">
                {property.owner.firstName} {property.owner.lastName}
              </span>
            </div>
          )}
          <div className="flex items-center gap-0.5 justify-end md:justify-start">
            <Calendar className="size-2.5 sm:size-3 shrink-0" />
            <span className="whitespace-nowrap">{shortDate(property.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Inventory badge + Actions — compact on mobile */}
      <div className="flex items-center gap-1 shrink-0">
        {property.inventoryReportCount > 0 && (
          <Badge variant="outline" className="text-emerald-600 border-emerald-200 text-[9px] sm:text-[10px] leading-none px-1.5 py-0.5 hidden md:inline-flex items-center gap-0.5">
            <FileText className="size-2.5" />
            {property.inventoryReportCount}
          </Badge>
        )}

        <Button
          size="icon"
          variant="ghost"
          onClick={() => onDetail(property.id)}
          className="size-7 sm:size-8 text-muted-foreground hover:text-foreground"
          aria-label="Voir les détails"
        >
          <Eye className="size-3.5 sm:size-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onInventory(property.id)}
          className="size-7 sm:size-8 text-muted-foreground hover:text-foreground"
          aria-label="État des lieux"
        >
          <FileText className="size-3.5 sm:size-4" />
        </Button>
        {isPending && (
          <Button
            size="icon"
            className="size-7 sm:size-8 bg-green-600 hover:bg-green-700 text-white"
            onClick={() => onApprove(property.id)}
            disabled={actionLoading === property.id}
            aria-label="Approuver le bien"
          >
            {actionLoading === property.id ? (
              <Loader2 className="size-3.5 sm:size-4 animate-spin" />
            ) : (
              <Check className="size-3.5 sm:size-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function AllProperties() {
  const { isAuthenticated, setSelectedItemId, setDashboardSection, user } = useAuthStore()
  const [properties, setProperties] = useState<PropertyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // View mode
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterCommune, setFilterCommune] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Pagination
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const LIMIT = 50

  const fetchData = useCallback(async (resetOffset = true) => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('search', searchQuery)
      if (filterStatus && filterStatus !== 'ALL') params.set('status', filterStatus)
      if (filterType && filterType !== 'ALL') params.set('type', filterType)
      if (filterCommune) params.set('commune', filterCommune)
      params.set('limit', String(LIMIT))
      params.set('offset', String(resetOffset ? 0 : offset))
      const qs = params.toString()

      const d = await authFetch<ApiResponse>(`/api/tc/properties${qs ? `?${qs}` : ''}`)
      if (resetOffset) {
        setProperties(d.properties || [])
      } else {
        setProperties((prev) => [...prev, ...(d.properties || [])])
      }
      setTotal(d.pagination?.total || 0)
      setHasMore(d.pagination?.hasMore || false)
      if (!resetOffset) {
        setOffset((prev) => prev + LIMIT)
      } else {
        setOffset(LIMIT)
      }
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) {
        setProperties([])
        return
      }
      setProperties([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, searchQuery, filterStatus, filterType, filterCommune, offset])

  // ─── Realtime subscription (TC watches all properties) ────────────
  useRealtimeProperties({
    userId: user?.id,
    watchAll: true,
    onPropertyChange: () => { fetchData(true) },
  })

  useEffect(() => {
    setLoading(true)
    setOffset(0)
    setHasMore(false)
    fetchData(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filterStatus, filterType, filterCommune])

  const handleLoadMore = () => {
    fetchData(false)
  }

  const handleViewDetail = (id: string) => {
    setSelectedItemId(id)
    setDashboardSection('property-verify-detail')
  }

  const handleInventoryReport = (id: string) => {
    setSelectedItemId(id)
    setDashboardSection('inventory-report-form')
  }

  const handleQuickApprove = async (propertyId: string) => {
    setActionLoading(propertyId)
    try {
      await authFetch('/api/tc/verifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId, action: 'APPROVE' }),
      })
      toast.success('Bien approuvé !')
      setProperties((prev) =>
        prev.map((p) =>
          p.id === propertyId ? { ...p, status: 'ACTIVE', isVerified: true } : p
        )
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'approbation")
    } finally {
      setActionLoading(null)
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setFilterStatus('')
    setFilterType('')
    setFilterCommune('')
  }

  const hasActiveFilters = searchQuery || filterStatus || filterType || filterCommune
  const activeFilterCount = [filterStatus, filterType, filterCommune].filter(Boolean).length

  // ─── Loading Skeleton ─────────────────────────────────────────────────────

  if (loading && properties.length === 0) {
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
      <div className="bg-gradient-to-r from-brand-500/10 to-transparent p-4 sm:p-6 rounded-xl border border-border/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex size-12 items-center justify-center rounded-xl bg-brand-100 shrink-0">
              <Building2 className="size-6 text-brand-500" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl xl:text-2xl font-bold text-foreground truncate">
                Tous les biens
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {total} bien{total !== 1 ? 's' : ''} sur la plateforme
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
          {/* View toggle */}
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-1.5 sm:p-2 transition-colors',
                viewMode === 'list'
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-label="Vue liste"
              title="Vue liste"
            >
              <LayoutList className="size-3.5 sm:size-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 sm:p-2 transition-colors',
                viewMode === 'grid'
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-label="Vue grille"
              title="Vue grille"
            >
              <LayoutGrid className="size-3.5 sm:size-4" />
            </button>
          </div>

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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn('gap-2 h-9 shrink-0', showFilters && 'bg-accent')}
          >
            <SlidersHorizontal className="size-3.5 sm:size-4" />
            <span className="hidden sm:inline">Filtres</span>
            {activeFilterCount > 0 && (
              <Badge className="bg-brand-500 text-white size-4 sm:size-5 p-0 flex items-center justify-center text-[9px] sm:text-[10px] rounded-full">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>
    </div>

      {/* ─── Search Bar ──────────────────────────────────────────────────── */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 sm:size-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Rechercher un bien..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 sm:pl-9 pr-3 h-10 sm:h-11 text-sm"
        />
      </div>

      {/* ─── Filters Panel ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <Card className="border-border">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:grid sm:grid-cols-3 gap-2 sm:gap-3">
                  <div>
                    <label className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1 block">
                      Statut
                    </label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                        <SelectValue placeholder="Tous les statuts" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs sm:text-sm">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1 block">
                      Type de bien
                    </label>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                        <SelectValue placeholder="Tous les types" />
                      </SelectTrigger>
                      <SelectContent>
                        {typeOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs sm:text-sm">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1 block">
                      Commune
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 size-3.5 sm:size-4 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder="Commune..."
                        value={filterCommune}
                        onChange={(e) => setFilterCommune(e.target.value)}
                        className="pl-7 sm:pl-9 h-9 sm:h-10 text-xs sm:text-sm"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Active filters badges ───────────────────────────────────────── */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {searchQuery && (
            <Badge variant="secondary" className="gap-1 text-[10px] sm:text-xs h-6 sm:h-7 max-w-[200px] sm:max-w-none">
              <span className="truncate max-w-[120px] sm:max-w-none">&quot;{searchQuery}&quot;</span>
              <button onClick={() => setSearchQuery('')} className="shrink-0">
                <X className="size-2.5 sm:size-3 ml-0.5" />
              </button>
            </Badge>
          )}
          {filterStatus && (
            <Badge variant="secondary" className="gap-1 text-[10px] sm:text-xs h-6 sm:h-7">
              {statusOptions.find((o) => o.value === filterStatus)?.label}
              <button onClick={() => setFilterStatus('')} className="shrink-0">
                <X className="size-2.5 sm:size-3 ml-0.5" />
              </button>
            </Badge>
          )}
          {filterType && (
            <Badge variant="secondary" className="gap-1 text-[10px] sm:text-xs h-6 sm:h-7">
              {typeOptions.find((o) => o.value === filterType)?.label}
              <button onClick={() => setFilterType('')} className="shrink-0">
                <X className="size-2.5 sm:size-3 ml-0.5" />
              </button>
            </Badge>
          )}
          {filterCommune && (
            <Badge variant="secondary" className="gap-1 text-[10px] sm:text-xs h-6 sm:h-7">
              {filterCommune}
              <button onClick={() => setFilterCommune('')} className="shrink-0">
                <X className="size-2.5 sm:size-3 ml-0.5" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* ─── Empty State ─────────────────────────────────────────────────── */}
      {!loading && properties.length === 0 && (
        <Card className="border-border">
          <CardContent className="py-10 sm:py-16 text-center px-4">
            <Building2 className="size-10 sm:size-16 text-muted-foreground/30 mx-auto mb-3 sm:mb-4" />
            <p className="text-muted-foreground font-medium text-base sm:text-lg">
              Aucun bien trouvé
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xs sm:max-w-md mx-auto">
              {hasActiveFilters
                ? 'Essayez de modifier vos filtres ou d\'élargir votre recherche.'
                : 'Aucun bien n\'est encore enregistré sur la plateforme.'}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="mt-3 sm:mt-4 gap-2 h-9">
                <X className="size-3.5 sm:size-4" /> Effacer les filtres
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Properties ──────────────────────────────────────────────────── */}
      {viewMode === 'list' ? (
        /* ─── List View ─────────────────────────────────────────────── */
        <div className="space-y-1.5 sm:space-y-2">
          <AnimatePresence mode="popLayout">
            {properties.map((property) => (
              <motion.div
                key={property.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
              >
                <ListRow
                  property={property}
                  onDetail={handleViewDetail}
                  onInventory={handleInventoryReport}
                  onApprove={handleQuickApprove}
                  actionLoading={actionLoading}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        /* ─── Grid View ─────────────────────────────────────────────── */
        <div className="grid gap-3 sm:gap-4 xl:gap-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {properties.map((property) => {
              const statusInfo = statusLabels[property.status] || { label: property.status, className: 'bg-gray-100 text-gray-700' }
              const isPending = property.status === 'PENDING_VERIFICATION'

              return (
                <motion.div
                  key={property.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="border-border overflow-hidden hover:shadow-md sm:hover:shadow-lg transition-all duration-200 group h-full flex flex-col">
                    <div className="relative">
                      <PropertyThumbnail images={property.images} title={property.title} />
                      <div className="absolute top-1.5 sm:top-2 left-1.5 sm:left-2 flex gap-1">
                        <Badge className={cn('text-[9px] sm:text-[10px] leading-none px-1.5 py-0.5 sm:px-2 sm:py-0.5', statusInfo.className)}>
                          {statusInfo.label}
                        </Badge>
                        {property.isVerified && (
                          <Badge className="bg-emerald-500 text-white text-[9px] sm:text-[10px] leading-none px-1.5 py-0.5 sm:px-2 sm:py-0.5 flex items-center gap-0.5">
                            <Check className="size-2 sm:size-2.5" /> Vérifié
                          </Badge>
                        )}
                      </div>
                      <Badge className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 bg-brand-500 text-white text-[9px] sm:text-[10px] leading-none px-1.5 py-0.5 sm:px-2 sm:py-0.5">
                        {typeLabels[property.type] || property.type}
                      </Badge>
                    </div>

                    <CardContent className="p-3 sm:p-4 flex-1 flex flex-col">
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-semibold text-foreground line-clamp-1 group-hover:text-brand-500 transition-colors">
                          {property.title || 'Sans titre'}
                        </h3>
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin className="size-3 sm:size-3.5 text-muted-foreground shrink-0" />
                          <span className="text-xs sm:text-sm text-muted-foreground truncate">
                            {property.commune || property.address || 'Non spécifié'}
                          </span>
                        </div>
                      </div>

                      <p className="text-base sm:text-lg font-bold text-brand-500 mt-1.5 sm:mt-2 leading-tight">
                        {priceFCFA(property.price)}{' '}
                        <span className="text-[10px] sm:text-xs font-normal text-muted-foreground">FCFA/mois</span>
                      </p>

                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-muted-foreground">
                        {property.area > 0 && (
                          <span className="flex items-center gap-1">
                            <Ruler className="size-2.5 sm:size-3" />
                            {property.area} m²
                          </span>
                        )}
                        {property.bedrooms != null && (
                          <span className="flex items-center gap-1">
                            <Bed className="size-2.5 sm:size-3" />
                            {property.bedrooms} ch.
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-0.5 mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-muted-foreground">
                        {property.owner && (
                          <span className="flex items-center gap-1 min-w-0">
                            <User className="size-2.5 sm:size-3 shrink-0" />
                            <span className="truncate max-w-[120px] sm:max-w-[160px]">
                              {property.owner.firstName} {property.owner.lastName}
                            </span>
                          </span>
                        )}
                        <span className="flex items-center gap-1 shrink-0">
                          <Calendar className="size-2.5 sm:size-3" />
                          <span className="whitespace-nowrap">{shortDate(property.createdAt)}</span>
                        </span>
                      </div>

                      {property.inventoryReportCount > 0 && (
                        <div className="mt-1.5 sm:mt-2">
                          <Badge
                            variant="outline"
                            className="text-emerald-600 border-emerald-200 gap-1 text-[9px] sm:text-[10px] leading-none py-0.5"
                          >
                            <FileText className="size-2.5 sm:size-3" />
                            {property.inventoryReportCount} état{property.inventoryReportCount > 1 ? 's' : ''} des lieux
                          </Badge>
                        </div>
                      )}

                      <div className="flex-1 min-h-2" />

                      <div className="flex gap-1.5 sm:gap-2 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetail(property.id)}
                          className="flex-1 gap-1 h-8 sm:h-9 text-[10px] sm:text-xs px-1.5 sm:px-3"
                          aria-label="Voir les détails"
                        >
                          <Eye className="size-3 sm:size-3.5 shrink-0" />
                          <span className="hidden sm:inline">Détails</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleInventoryReport(property.id)}
                          className="flex-1 gap-1 h-8 sm:h-9 text-[10px] sm:text-xs px-1.5 sm:px-3"
                          aria-label="État des lieux"
                        >
                          <FileText className="size-3 sm:size-3.5 shrink-0" />
                          <span className="hidden sm:inline">État lieux</span>
                        </Button>
                        {isPending && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white gap-1 h-8 sm:h-9 text-[10px] sm:text-xs px-1.5 sm:px-3 shrink-0"
                            onClick={() => handleQuickApprove(property.id)}
                            disabled={actionLoading === property.id}
                            aria-label="Approuver le bien"
                          >
                            {actionLoading === property.id ? (
                              <Loader2 className="size-3 sm:size-3.5 animate-spin" />
                            ) : (
                              <Check className="size-3 sm:size-3.5" />
                            )}
                            <span className="hidden sm:inline">Approuver</span>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ─── Load More ───────────────────────────────────────────────────── */}
      {hasMore && (
        <div className="flex justify-center pt-1 sm:pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadMore}
            disabled={loading}
            className="gap-2 px-5 sm:px-8 h-10 sm:h-11 text-xs sm:text-sm w-full sm:w-auto"
          >
            {loading ? (
              <Loader2 className="size-3.5 sm:size-4 animate-spin" />
            ) : (
              <ChevronDown className="size-3.5 sm:size-4" />
            )}
            <span className="hidden sm:inline">Charger plus de biens</span>
          </Button>
        </div>
      )}
    </motion.div>
  )
}
