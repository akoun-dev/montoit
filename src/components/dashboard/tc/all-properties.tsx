'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Building2, Search, MapPin, X, Check,
  Loader2, FileText, ChevronDown, ChevronsUpDown,
  User, Calendar, Eye, BadgeCheck, Clock,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
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

// ─── Main Component ─────────────────────────────────────────────────────────

export function AllProperties() {
  const { isAuthenticated, setSelectedItemId, setDashboardSection, user } = useAuthStore()
  const [properties, setProperties] = useState<PropertyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false)
  const [filterCommune, setFilterCommune] = useState('')

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
      if (filterStatus && filterStatus !== 'ALL' && filterStatus !== 'VERIFIED') params.set('status', filterStatus)
      if (filterStatus === 'VERIFIED') params.set('verified', 'true')
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

  const pendingCount = properties.filter(p => p.status === 'PENDING_VERIFICATION').length
  const activeCount = properties.filter(p => p.status === 'ACTIVE').length
  const verifiedCount = properties.filter(p => p.isVerified).length

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <Card className="border-border bg-gradient-to-r from-brand-500/10 to-transparent">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-xl bg-brand-100">
                <Building2 className="size-6 text-brand-600" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">Tous les biens</h1>
                <p className="text-muted-foreground text-sm">Gérez l&apos;ensemble des biens immobiliers sur la plateforme</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge className="bg-brand-50 text-brand-700 border-brand-200 border text-[10px]">
                    <Building2 className="size-3 mr-0.5" /> {total} bien{total !== 1 ? 's' : ''}
                  </Badge>
                  <Badge className="bg-amber-50 text-amber-700 border-amber-200 border text-[10px]">
                    <Clock className="size-3 mr-0.5" /> {pendingCount} en attente
                  </Badge>
                  <Badge className="bg-green-50 text-green-700 border-green-200 border text-[10px]">
                    <Check className="size-3 mr-0.5" /> {verifiedCount} vérifié{verifiedCount !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Row — cliquable pour filtrer */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card
          className={cn('border-border cursor-pointer transition-all hover:border-brand-200 hover:shadow-sm', !filterStatus && 'ring-1 ring-brand-200')}
          onClick={() => setFilterStatus('')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-brand-50">
                <Building2 className="size-5 text-brand-600" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-foreground">{total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={cn('border-border cursor-pointer transition-all hover:border-amber-300 hover:shadow-sm', filterStatus === 'PENDING_VERIFICATION' && 'ring-1 ring-amber-400 bg-amber-50/20')}
          onClick={() => setFilterStatus(filterStatus === 'PENDING_VERIFICATION' ? '' : 'PENDING_VERIFICATION')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-amber-50">
                <Clock className="size-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-amber-600">{pendingCount}</p>
                <p className="text-xs text-muted-foreground">En attente</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={cn('border-border cursor-pointer transition-all hover:border-green-300 hover:shadow-sm', filterStatus === 'ACTIVE' && 'ring-1 ring-green-400 bg-green-50/20')}
          onClick={() => setFilterStatus(filterStatus === 'ACTIVE' ? '' : 'ACTIVE')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-green-50">
                <Check className="size-5 text-green-600" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-green-600">{activeCount}</p>
                <p className="text-xs text-muted-foreground">Actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={cn('border-border cursor-pointer transition-all hover:border-emerald-300 hover:shadow-sm', filterStatus === 'VERIFIED' && 'ring-1 ring-emerald-400 bg-emerald-50/20')}
          onClick={() => setFilterStatus(filterStatus === 'VERIFIED' ? '' : 'VERIFIED')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-50">
                <BadgeCheck className="size-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-emerald-600">{verifiedCount}</p>
                <p className="text-xs text-muted-foreground">Vérifiés</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar: Search + Filters (responsive) */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative w-full sm:max-w-[180px] xl:max-w-xs shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un bien..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {statusOptions.map((opt) => (
            <Button
              key={opt.value}
              size="sm"
              variant={filterStatus === opt.value ? 'default' : 'outline'}
              className={cn(
                'text-xs',
                filterStatus === opt.value
                  ? 'bg-brand-500 hover:bg-brand-600 text-white'
                  : 'hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200'
              )}
              onClick={() => setFilterStatus(opt.value === 'ALL' ? '' : opt.value)}
            >
              {opt.label}
            </Button>
          ))}
          <div className="w-px bg-border mx-1 shrink-0 hidden sm:block" />
          <Popover open={typeDropdownOpen} onOpenChange={setTypeDropdownOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={typeDropdownOpen}
                className="gap-1.5 text-xs justify-between min-w-[140px]"
              >
                {filterType && typeLabels[filterType]
                  ? typeLabels[filterType]
                  : 'Tous types'
                }
                <ChevronsUpDown className="size-3.5 opacity-50 shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Rechercher un type..." />
                <CommandList>
                  <CommandEmpty>Aucun type trouvé</CommandEmpty>
                  <CommandGroup>
                    {typeOptions.map((opt) => (
                      <CommandItem
                        key={opt.value}
                        value={opt.label}
                        onSelect={() => {
                          setFilterType(opt.value === 'ALL' ? '' : opt.value)
                          setTypeDropdownOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 size-4',
                            filterType === opt.value || (filterType === '' && opt.value === 'ALL') ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        {opt.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Empty state */}
      {!loading && properties.length === 0 && (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <Building2 className="size-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Aucun bien trouvé</p>
            <p className="text-sm text-muted-foreground mt-1">
              {hasActiveFilters
                ? 'Essayez de modifier vos filtres ou d\'élargir votre recherche.'
                : 'Aucun bien n\'est encore enregistré sur la plateforme.'}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4 gap-2">
                <X className="size-4" /> Effacer les filtres
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Properties table — non-vérifiés en surbrillance */}
      {properties.length > 0 && (
        <Card className="border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left font-medium text-muted-foreground p-3">Bien</th>
                  <th className="text-left font-medium text-muted-foreground p-3 hidden sm:table-cell">Type</th>
                  <th className="text-left font-medium text-muted-foreground p-3">Prix</th>
                  <th className="text-center font-medium text-muted-foreground p-3">Statut</th>
                  <th className="text-left font-medium text-muted-foreground p-3 hidden md:table-cell">Propriétaire</th>
                  <th className="text-left font-medium text-muted-foreground p-3 hidden lg:table-cell">Date</th>
                  <th className="text-right font-medium text-muted-foreground p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {properties.map((property) => {
                    const isPending = property.status === 'PENDING_VERIFICATION'
                    const statusInfo = statusLabels[property.status] || { label: property.status, className: 'bg-gray-100 text-gray-700' }

                    return (
                      <motion.tr
                        key={property.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className={cn(
                          'border-b border-border hover:bg-muted/30 transition-colors',
                          isPending && 'bg-amber-50/40 border-l-2 border-l-amber-400'
                        )}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="size-8 rounded-md overflow-hidden shrink-0 bg-muted">
                              {property.images && property.images.length > 0 ? (
                                <img src={property.images[0].url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Building2 className="size-4 text-muted-foreground/40" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate max-w-[160px] sm:max-w-[200px]">{property.title || 'Sans titre'}</p>
                              <p className="text-xs text-muted-foreground truncate">{property.commune || property.address || ''}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 hidden sm:table-cell">
                          <Badge className="bg-brand-500/10 text-brand-600 text-[10px]">
                            {typeLabels[property.type] || property.type}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-brand-500 whitespace-nowrap">{priceFCFA(property.price)}</span>
                          <span className="text-muted-foreground text-xs"> FCFA</span>
                        </td>
                        <td className="p-3 text-center">
                          {isPending ? (
                            <Badge className="bg-amber-100 text-amber-700 border border-amber-200 text-[10px] gap-1">
                              <Clock className="size-3" /> En attente
                            </Badge>
                          ) : property.isVerified ? (
                            <Badge className="bg-green-100 text-green-700 border border-green-200 text-[10px] gap-1">
                              <Check className="size-3" /> Vérifié
                            </Badge>
                          ) : (
                            <Badge className={cn('text-[10px]', statusInfo.className)}>
                              {statusInfo.label}
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          {property.owner && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <User className="size-3 shrink-0" />
                              <span className="truncate max-w-[120px]">{property.owner.firstName} {property.owner.lastName}</span>
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground hidden lg:table-cell whitespace-nowrap">
                          {shortDate(property.createdAt)}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
                              onClick={() => handleViewDetail(property.id)}
                              title="Détails"
                            >
                              <Eye className="size-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
                              onClick={() => handleInventoryReport(property.id)}
                              title="État des lieux"
                            >
                              <FileText className="size-4" />
                            </Button>
                            {isPending && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 w-8 p-0"
                                onClick={() => handleQuickApprove(property.id)}
                                disabled={actionLoading === property.id}
                                title="Approuver"
                              >
                                {actionLoading === property.id ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                              </Button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadMore}
            disabled={loading}
            className="gap-2 px-8 h-11"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ChevronDown className="size-4" />
            )}
            Charger plus de biens
          </Button>
        </div>
      )}
    </motion.div>
  )
}
