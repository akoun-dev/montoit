'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import {
  Search,
  MapPin,
  BedDouble,
  Maximize,
  Heart,
  SlidersHorizontal,
  RotateCcw,
  LayoutGrid,
  List,
  Map,
  Eye,
  BadgeCheck,
  X,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useAuthStore } from '@/lib/auth-store'
import { PropertyMapLeaflet } from '@/components/home/property-map'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
  SheetFooter,
} from '@/components/ui/sheet'

// ── Types ───────────────────────────────────────────────────────────────────

type PropertyStatus = 'disponible' | 'loue' | 'reserve'

interface Property {
  id: string
  title: string
  description: string
  type: string
  rentalStatus: PropertyStatus
  price: number
  currency: string
  area: number
  bedrooms: number | null
  bathrooms: number | null
  address: string
  city: string
  commune: string | null
  latitude: number | null
  longitude: number | null
  isFurnished: boolean
  isVerified: boolean
  viewsCount: number
  image: string | null
  ownerId: string
  owner: {
    id: string
    firstName: string
    lastName: string
  }
}

// ── Constants ───────────────────────────────────────────────────────────────

const roomOptions = [1, 2, 3, 4, 5]
const sortOptions = [
  { label: 'Plus récent', value: 'recent' },
  { label: 'Prix croissant', value: 'price-asc' },
  { label: 'Prix décroissant', value: 'price-desc' },
  { label: 'Plus populaire', value: 'popular' },
]

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  return price.toLocaleString('fr-FR')
}

function formatPropertyType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()
}

function getPropertyLocation(property: Property): string {
  if (property.commune) {
    return `${property.address}, ${property.commune}`
  }
  return property.address
}

// ── Skeleton ────────────────────────────────────────────────────────────────

function PropertyCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm animate-pulse">
      <div className="h-52 bg-neutral-200" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-neutral-200 rounded w-3/4" />
        <div className="h-3 bg-neutral-200 rounded w-1/2" />
        <div className="flex gap-3">
          <div className="h-3 bg-neutral-200 rounded w-16" />
          <div className="h-3 bg-neutral-200 rounded w-16" />
        </div>
        <div className="h-px bg-neutral-100" />
        <div className="flex justify-between">
          <div className="h-4 bg-neutral-200 rounded w-24" />
          <div className="h-3 bg-neutral-200 rounded w-16" />
        </div>
      </div>
    </div>
  )
}

function PropertyListItemSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm flex animate-pulse">
      <div className="w-36 sm:w-48 h-36 bg-neutral-200 shrink-0" />
      <div className="flex-1 p-4 space-y-3">
        <div className="h-4 bg-neutral-200 rounded w-3/4" />
        <div className="h-3 bg-neutral-200 rounded w-1/2" />
        <div className="h-3 bg-neutral-200 rounded w-1/3" />
        <div className="h-4 bg-neutral-200 rounded w-24" />
      </div>
    </div>
  )
}

// ── Filter Sidebar ──────────────────────────────────────────────────────────

interface FilterSidebarProps {
  typeFilter: string
  setTypeFilter: (v: string) => void
  communeFilter: string
  setCommuneFilter: (v: string) => void
  priceMin: string
  setPriceMin: (v: string) => void
  priceMax: string
  setPriceMax: (v: string) => void
  roomsMin: string
  setRoomsMin: (v: string) => void
  meubleOnly: boolean
  setMeubleOnly: (v: boolean) => void
  resultCount: number
  hasActiveFilters: boolean
  resetFilters: () => void
  propertyTypes: string[]
  communes: string[]
}

function FilterSidebar({
  typeFilter,
  setTypeFilter,
  communeFilter,
  setCommuneFilter,
  priceMin,
  setPriceMin,
  priceMax,
  setPriceMax,
  roomsMin,
  setRoomsMin,
  meubleOnly,
  setMeubleOnly,
  resultCount,
  hasActiveFilters,
  resetFilters,
  propertyTypes,
  communes,
}: FilterSidebarProps) {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-brand-500" />
          <span className="text-sm font-semibold text-neutral-900">Filtres</span>
          <Badge className="bg-brand-500 text-white border-0 text-[11px] px-2 py-0.5 hover:bg-brand-500 leading-tight">
            {resultCount}
          </Badge>
        </div>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="text-[11px] text-brand-500 hover:text-brand-600 transition-colors flex items-center gap-1"
          >
            <RotateCcw className="size-3" />
            Réinitialiser
          </button>
        )}
      </div>

      <div className="h-px bg-neutral-100" />

      {/* Type de bien */}
      <div className="space-y-2">
        <Label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Type de bien</Label>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setTypeFilter('Tous')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              typeFilter === 'Tous'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
            }`}
          >
            Tous
          </button>
          {propertyTypes.map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                typeFilter === type
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
              }`}
            >
              {formatPropertyType(type)}
            </button>
          ))}
        </div>
      </div>

      {/* Ville ou commune */}
      <div className="space-y-1.5">
        <Label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Ville ou commune</Label>
        <Select value={communeFilter} onValueChange={setCommuneFilter}>
          <SelectTrigger className="h-9 bg-white border-neutral-200 text-xs rounded-md">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Toutes">Toutes</SelectItem>
            {communes.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loyer */}
      <div className="space-y-1.5">
        <Label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Loyer (FCFA/Mois)</Label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              type="number"
              placeholder="Min"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              className="h-9 bg-white border-neutral-200 text-xs rounded-md pr-8"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400">Min</span>
          </div>
          <span className="text-neutral-300 text-xs">—</span>
          <div className="relative flex-1">
            <Input
              type="number"
              placeholder="Max"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              className="h-9 bg-white border-neutral-200 text-xs rounded-md pr-8"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400">Max</span>
          </div>
        </div>
      </div>

      {/* Nombre de pièces min. */}
      <div className="space-y-2">
        <Label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Nombre de pièces min.</Label>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setRoomsMin('0')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              roomsMin === '0'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
            }`}
          >
            Tous
          </button>
          {roomOptions.map((n) => (
            <button
              key={n}
              onClick={() => setRoomsMin(String(n))}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                roomsMin === String(n)
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
              }`}
            >
              {n}{n === 5 ? '+' : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Meublé uniquement */}
      <div className="flex items-center justify-between py-1">
        <Label className="text-xs font-medium text-neutral-700 cursor-pointer">Meublé uniquement</Label>
        <Switch
          checked={meubleOnly}
          onCheckedChange={setMeubleOnly}
          className="data-[state=checked]:bg-brand-500"
        />
      </div>

      <div className="h-px bg-neutral-100" />

      {/* Reset button */}
      {hasActiveFilters ? (
        <Button
          variant="outline"
          onClick={resetFilters}
          className="w-full text-brand-500 border-brand-200 hover:bg-brand-50 hover:text-brand-600 text-xs h-9"
        >
          <RotateCcw className="size-3 mr-1.5" />
          Réinitialiser les filtres
        </Button>
      ) : (
        <p className="text-[11px] text-neutral-400 text-center">
          Ajustez les filtres pour affiner votre recherche
        </p>
      )}
    </div>
  )
}

// ── Property Card ───────────────────────────────────────────────────────────

function PropertyCard({ property, onClick }: { property: Property; onClick: () => void }) {
  const [isFavorite, setIsFavorite] = useState(false)
  const { isAuthenticated, setView } = useAuthStore()

  const statusConfig: Record<PropertyStatus, { label: string; className: string }> = {
    disponible: { label: 'Disponible', className: 'bg-emerald-500 text-white' },
    loue: { label: 'Loué', className: 'bg-red-500 text-white' },
    reserve: { label: 'Réservé', className: 'bg-amber-500 text-white' },
  }

  const location = getPropertyLocation(property)

  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer"
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative h-52 overflow-hidden">
        {property.image ? (
          <Image
            src={property.image}
            alt={property.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full bg-neutral-200 flex items-center justify-center">
            <MapPin className="size-8 text-neutral-400" />
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

        {/* Badges row */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
          <Badge className={`border-0 text-[11px] font-semibold px-2 py-0.5 ${statusConfig[property.rentalStatus].className}`}>
            {statusConfig[property.rentalStatus].label}
          </Badge>
          {property.isFurnished && (
            <Badge className="border-0 text-[11px] font-medium px-2 py-0.5 bg-sky-500 text-white">
              Meublé
            </Badge>
          )}
        </div>

        {/* Verified badge */}
        {property.isVerified && (
          <div className="absolute top-3 right-12 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-full px-2 py-0.5">
            <BadgeCheck className="size-3 text-brand-500" />
            <span className="text-[11px] font-medium text-neutral-700">Vérifié</span>
          </div>
        )}

        {/* Favorite button */}
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (!isAuthenticated) { setView('login'); return }
            setIsFavorite(!isFavorite)
          }}
          className="absolute top-3 right-3 size-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white shadow-sm transition-all"
          aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Heart
            className={`size-4 transition-colors ${
              isFavorite ? 'fill-red-500 text-red-500' : 'text-neutral-500'
            }`}
          />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-neutral-900 text-sm mb-1 line-clamp-1">
          {property.title}
        </h3>
        <div className="flex items-center gap-1 text-neutral-500 text-xs mb-3">
          <MapPin className="size-3 shrink-0" />
          <span className="line-clamp-1">{location}</span>
        </div>

        {/* Features */}
        <div className="flex items-center gap-3 text-xs text-neutral-600 mb-3">
          {property.bedrooms !== null && (
            <div className="flex items-center gap-1">
              <BedDouble className="size-3.5 text-neutral-400" />
              <span>{property.bedrooms} pièce{property.bedrooms > 1 ? 's' : ''}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Maximize className="size-3.5 text-neutral-400" />
            <span>{property.area} m²</span>
          </div>
        </div>

        {/* Price & Views */}
        <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
          <p className="text-base font-bold text-brand-500">
            {formatPrice(property.price)} <span className="text-xs font-normal text-neutral-400">F CFA/mois</span>
          </p>
          <div className="flex items-center gap-1 text-neutral-400">
            <Eye className="size-3.5" />
            <span className="text-xs">{property.viewsCount} vues</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ── Property List Item ──────────────────────────────────────────────────────

function PropertyListItem({ property, onClick }: { property: Property; onClick: () => void }) {
  const [isFavorite, setIsFavorite] = useState(false)
  const { isAuthenticated, setView } = useAuthStore()

  const statusConfig: Record<PropertyStatus, { label: string; className: string }> = {
    disponible: { label: 'Disponible', className: 'bg-emerald-500 text-white' },
    loue: { label: 'Loué', className: 'bg-red-500 text-white' },
    reserve: { label: 'Réservé', className: 'bg-amber-500 text-white' },
  }

  const location = getPropertyLocation(property)

  return (
    <motion.div
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className="group bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex cursor-pointer"
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative w-36 sm:w-48 shrink-0 overflow-hidden">
        {property.image ? (
          <Image
            src={property.image}
            alt={property.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="224px"
          />
        ) : (
          <div className="w-full h-full bg-neutral-200 flex items-center justify-center">
            <MapPin className="size-6 text-neutral-400" />
          </div>
        )}
        <Badge className={`absolute top-2 left-2 border-0 text-xs font-semibold px-2 py-0.5 ${statusConfig[property.rentalStatus].className}`}>
          {statusConfig[property.rentalStatus].label}
        </Badge>
      </div>

      {/* Content */}
      <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-neutral-900 text-sm line-clamp-1">{property.title}</h3>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!isAuthenticated) { setView('login'); return } setIsFavorite(!isFavorite) }}
              className="shrink-0 size-7 sm:size-8 rounded-full bg-neutral-50 flex items-center justify-center hover:bg-neutral-100 transition-colors"
              aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            >
              <Heart className={`size-3.5 sm:size-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-neutral-400'}`} />
            </button>
          </div>
          <div className="flex items-center gap-1 text-neutral-500 text-xs mb-2">
            <MapPin className="size-3 shrink-0" />
            <span className="line-clamp-1">{location}</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 text-xs text-neutral-600 mb-2 flex-wrap">
            {property.bedrooms !== null && (
              <div className="flex items-center gap-1">
                <BedDouble className="size-3.5 text-neutral-400" />
                <span>{property.bedrooms}p</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Maximize className="size-3.5 text-neutral-400" />
              <span>{property.area}m²</span>
            </div>
            {property.isFurnished && (
              <Badge variant="outline" className="text-xs text-sky-600 border-sky-200 bg-sky-50 px-1.5 py-0">
                Meublé
              </Badge>
            )}
            {property.isVerified && (
              <div className="hidden sm:flex items-center gap-0.5 text-brand-500">
                <BadgeCheck className="size-3.5" />
                <span className="text-xs font-medium">Vérifié</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm sm:text-base font-bold text-brand-500 whitespace-nowrap">
            {formatPrice(property.price)} <span className="text-xs font-normal text-neutral-400">F CFA/mois</span>
          </p>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-1 text-neutral-400">
              <Eye className="size-3.5" />
              <span className="text-xs">{property.viewsCount} vues</span>
            </div>
            <Button variant="outline" size="sm" className="text-brand-500 border-brand-200 hover:bg-brand-50 hover:text-brand-600 text-xs h-7 sm:h-8">
              Voir <ArrowRight className="size-3 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ── Map List Item (compact card for map sidebar) ────────────────────────────

function MapListItem({ property, onClick }: { property: Property; onClick: () => void }) {
  const [isFavorite, setIsFavorite] = useState(false)
  const { isAuthenticated, setView } = useAuthStore()

  const statusConfig: Record<PropertyStatus, { label: string; className: string }> = {
    disponible: { label: 'Disponible', className: 'bg-emerald-500 text-white' },
    loue: { label: 'Loué', className: 'bg-red-500 text-white' },
    reserve: { label: 'Réservé', className: 'bg-amber-500 text-white' },
  }

  const location = getPropertyLocation(property)

  return (
    <div
      className="group bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-sm hover:shadow-md hover:border-brand-200 transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="flex gap-3 p-2.5">
        {/* Image */}
        <div className="relative w-20 h-20 shrink-0 rounded-md overflow-hidden">
          {property.image ? (
            <Image
              src={property.image}
              alt={property.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="80px"
            />
          ) : (
            <div className="w-full h-full bg-neutral-200 flex items-center justify-center rounded-md">
              <MapPin className="size-4 text-neutral-400" />
            </div>
          )}
          <Badge className={`absolute top-1 left-1 border-0 text-[8px] font-semibold px-1 py-0 ${statusConfig[property.rentalStatus].className}`}>
            {statusConfig[property.rentalStatus].label}
          </Badge>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-neutral-900 text-xs line-clamp-1 mb-0.5">{property.title}</h3>
            <div className="flex items-center gap-1 text-neutral-500 text-[10px] mb-1">
              <MapPin className="size-2.5 shrink-0" />
              <span className="line-clamp-1">{location}</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-neutral-600">
              {property.bedrooms !== null && (
                <div className="flex items-center gap-0.5">
                  <BedDouble className="size-2.5 text-neutral-400" />
                  <span>{property.bedrooms}p</span>
                </div>
              )}
              <div className="flex items-center gap-0.5">
                <Maximize className="size-2.5 text-neutral-400" />
                <span>{property.area}m²</span>
              </div>
              {property.isFurnished && (
                <span className="text-sky-500 font-medium">Meublé</span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-brand-500">
              {formatPrice(property.price)} <span className="text-[9px] font-normal text-neutral-400">F CFA</span>
            </p>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!isAuthenticated) { setView('login'); return } setIsFavorite(!isFavorite) }}
              className="size-5 rounded-full flex items-center justify-center hover:bg-neutral-100 transition-colors"
              aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            >
              <Heart className={`size-3 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-neutral-300'}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

export function NosBiensView() {
  const { setView, setSelectedPropertyId } = useAuthStore()

  // Data state
  const [properties, setProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dynamic filter options from DB
  const [propertyTypes, setPropertyTypes] = useState<string[]>([])
  const [communes, setCommunes] = useState<string[]>([])

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('Tous')
  const [communeFilter, setCommuneFilter] = useState<string>('Toutes')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [roomsMin, setRoomsMin] = useState('0')
  const [meubleOnly, setMeubleOnly] = useState(false)

  // View state
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid')
  const [sortBy, setSortBy] = useState('recent')
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  // Fetch properties and filter options from API
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        const [propertiesRes, statsRes] = await Promise.all([
          fetch('/api/properties?all=true'),
          fetch('/api/stats'),
        ])
        if (!propertiesRes.ok) throw new Error('Erreur lors du chargement')
        const propertiesData = await propertiesRes.json()
        setProperties(propertiesData.properties || [])
        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setPropertyTypes(statsData.propertyTypes || [])
          setCommunes(statsData.communes || [])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const openDetail = (propertyId: string) => {
    setSelectedPropertyId(propertyId)
    setView('property-detail')
  }

  // Filter logic
  const filteredProperties = useMemo(() => {
    let result = properties.filter((p) => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const location = getPropertyLocation(p)
        const match =
          p.title.toLowerCase().includes(q) ||
          location.toLowerCase().includes(q) ||
          (p.commune ?? '').toLowerCase().includes(q) ||
          p.type.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q)
        if (!match) return false
      }
      // Type
      if (typeFilter !== 'Tous' && p.type !== typeFilter) return false
      // Commune
      if (communeFilter !== 'Toutes' && p.commune !== communeFilter) return false
      // Price range
      if (priceMin && p.price < Number(priceMin)) return false
      if (priceMax && p.price > Number(priceMax)) return false
      // Rooms
      if (roomsMin !== '0' && p.bedrooms !== null && p.bedrooms < Number(roomsMin)) return false
      // Meuble
      if (meubleOnly && !p.isFurnished) return false
      return true
    })

    // Sort
    switch (sortBy) {
      case 'price-asc':
        result = [...result].sort((a, b) => a.price - b.price)
        break
      case 'price-desc':
        result = [...result].sort((a, b) => b.price - a.price)
        break
      case 'popular':
        result = [...result].sort((a, b) => b.viewsCount - a.viewsCount)
        break
      default:
        // recent — default order
        break
    }

    return result
  }, [properties, searchQuery, typeFilter, communeFilter, priceMin, priceMax, roomsMin, meubleOnly, sortBy])

  // Map-compatible properties (only those with coordinates)
  const mappableProperties = useMemo(() => (
    filteredProperties.filter((p) => p.latitude !== null && p.longitude !== null)
  ), [filteredProperties])

  const hasActiveFilters =
    typeFilter !== 'Tous' ||
    communeFilter !== 'Toutes' ||
    priceMin !== '' ||
    priceMax !== '' ||
    roomsMin !== '0' ||
    meubleOnly

  const resetFilters = () => {
    setTypeFilter('Tous')
    setCommuneFilter('Toutes')
    setPriceMin('')
    setPriceMax('')
    setRoomsMin('0')
    setMeubleOnly(false)
    setSearchQuery('')
  }

  const filterSidebarProps = {
    typeFilter,
    setTypeFilter,
    communeFilter,
    setCommuneFilter,
    priceMin,
    setPriceMin,
    priceMax,
    setPriceMax,
    roomsMin,
    setRoomsMin,
    meubleOnly,
    setMeubleOnly,
    resultCount: filteredProperties.length,
    hasActiveFilters,
    resetFilters,
    propertyTypes,
    communes,
  }

  // Loading state
  if (isLoading) {
    return (
      <section className="bg-neutral-50 min-h-screen">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Search bar skeleton */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-11 bg-neutral-200 rounded-xl animate-pulse" />
              <div className="hidden sm:block h-11 w-[150px] bg-neutral-200 rounded-xl animate-pulse" />
              <div className="hidden sm:flex items-center bg-neutral-200 rounded-xl h-11 w-[120px] animate-pulse" />
            </div>
          </div>
          {/* Results count skeleton */}
          <div className="h-4 bg-neutral-200 rounded w-32 mb-5 animate-pulse" />
          {/* Content skeleton */}
          <div className="flex gap-6">
            <div className="hidden lg:block w-72 shrink-0">
              <div className="bg-white rounded-xl border border-neutral-200 p-5 h-96 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <PropertyCardSkeleton key={i} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  // Error state
  if (error) {
    return (
      <section className="bg-neutral-50 min-h-screen">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="text-center py-20">
            <div className="size-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
              <Search className="size-8 text-red-300" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">
              Erreur de chargement
            </h3>
            <p className="text-neutral-500 text-sm mb-6 max-w-md mx-auto">
              {error}
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="bg-brand-500 hover:bg-brand-600 text-white"
            >
              <RotateCcw className="size-4 mr-2" />
              Réessayer
            </Button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="bg-neutral-50 min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* ── Search Bar + Controls ─────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-3 mb-6"
        >
          {/* Search row */}
          <div className="flex items-center gap-3">
            {/* Search input */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4.5 text-neutral-400" />
              <input
                type="text"
                placeholder="Rechercher un bien, quartier, ville..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-11 pr-10 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 size-5 rounded-full bg-neutral-200 flex items-center justify-center hover:bg-neutral-300 transition-colors"
                >
                  <X className="size-3 text-neutral-600" />
                </button>
              )}
            </div>

            {/* Sort - desktop/tablet */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="hidden sm:flex h-11 w-[150px] bg-white border-neutral-200 text-xs rounded-xl shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* View toggle - desktop/tablet */}
            <div className="hidden sm:flex items-center bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm h-11">
              <button
                onClick={() => setViewMode('grid')}
                className={`h-full px-3 transition-colors ${viewMode === 'grid' ? 'bg-brand-500 text-white' : 'text-neutral-500 hover:bg-neutral-50'}`}
                aria-label="Vue grille"
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`h-full px-3 transition-colors ${viewMode === 'list' ? 'bg-brand-500 text-white' : 'text-neutral-500 hover:bg-neutral-50'}`}
                aria-label="Vue liste"
              >
                <List className="size-4" />
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`h-full px-3 transition-colors flex items-center gap-1.5 ${viewMode === 'map' ? 'bg-brand-500 text-white' : 'text-neutral-500 hover:bg-neutral-50'}`}
                aria-label="Vue carte"
              >
                <Map className="size-4" />
              </button>
            </div>

            {/* Mobile filter button */}
            <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="lg:hidden text-neutral-600 border-neutral-200 hover:bg-neutral-50 h-11 rounded-xl text-xs shadow-sm"
                >
                  <SlidersHorizontal className="size-3.5 mr-1.5" />
                  Filtres
                  {hasActiveFilters && (
                    <span className="ml-1.5 size-4 rounded-full bg-brand-500 text-white text-[10px] flex items-center justify-center">!</span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[85vw] max-w-80">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <SlidersHorizontal className="size-4 text-brand-500" />
                    Filtres
                  </SheetTitle>
                </SheetHeader>
                <div className="px-4 py-6 overflow-y-auto max-h-[calc(100vh-120px)]">
                  <FilterSidebar {...filterSidebarProps} />
                </div>
                <SheetFooter className="px-4 pb-4">
                  <SheetClose asChild>
                    <Button className="w-full bg-brand-500 hover:bg-brand-600 text-white">
                      Voir {filteredProperties.length} résultat{filteredProperties.length !== 1 ? 's' : ''}
                    </Button>
                  </SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>

          {/* Mobile-only: Sort + View toggle row */}
          <div className="flex sm:hidden items-center gap-3">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-9 flex-1 bg-white border-neutral-200 text-xs rounded-xl shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm h-9">
              <button
                onClick={() => setViewMode('grid')}
                className={`h-full px-2.5 transition-colors ${viewMode === 'grid' ? 'bg-brand-500 text-white' : 'text-neutral-500 hover:bg-neutral-50'}`}
                aria-label="Vue grille"
              >
                <LayoutGrid className="size-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`h-full px-2.5 transition-colors ${viewMode === 'list' ? 'bg-brand-500 text-white' : 'text-neutral-500 hover:bg-neutral-50'}`}
                aria-label="Vue liste"
              >
                <List className="size-3.5" />
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`h-full px-2.5 transition-colors ${viewMode === 'map' ? 'bg-brand-500 text-white' : 'text-neutral-500 hover:bg-neutral-50'}`}
                aria-label="Vue carte"
              >
                <Map className="size-3.5" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Results count ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex items-center gap-3 mb-5"
        >
          <h1 className="text-sm font-semibold text-neutral-900">
            {filteredProperties.length} bien{filteredProperties.length !== 1 ? 's' : ''} trouvé{filteredProperties.length !== 1 ? 's' : ''}
          </h1>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-brand-500 hover:text-brand-600 transition-colors flex items-center gap-1"
            >
              <RotateCcw className="size-3" />
              Voir tout
            </button>
          )}
        </motion.div>

        {/* ── Main Layout ────────────────────────────────────────────── */}
        {viewMode === 'map' ? (
          /* ── Map View (full width split: list + map) ──────────────── */
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-5">
            {/* Desktop: Left property list (scrollable) */}
            <div className="hidden lg:block w-80 shrink-0">
              <div className="space-y-3 max-h-[calc(100vh-10rem)] overflow-y-auto pr-1 sticky top-24">
                {filteredProperties.length > 0 ? (
                  filteredProperties.map((property) => (
                    <MapListItem
                      key={property.id}
                      property={property}
                      onClick={() => openDetail(property.id)}
                    />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <p className="text-sm text-neutral-500">Aucun bien trouvé</p>
                  </div>
                )}
              </div>
            </div>

            {/* Map area */}
            <div className="flex-1 min-w-0">
              <div className="h-[50vh] sm:h-[60vh] lg:h-[calc(100vh-10rem)] lg:sticky lg:top-24">
                {mappableProperties.length > 0 ? (
                  <PropertyMapLeaflet
                    properties={mappableProperties}
                    onPropertyClick={(p) => openDetail(p.id)}
                  />
                ) : (
                  <div className="w-full h-full bg-neutral-100 rounded-xl flex items-center justify-center">
                    <p className="text-sm text-neutral-400">Aucun bien à afficher sur la carte</p>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile-only: horizontal scroll of property cards below map */}
            <div className="lg:hidden">
              {filteredProperties.length > 0 ? (
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
                  {filteredProperties.map((property) => (
                    <div key={property.id} className="shrink-0 w-60 snap-start">
                      <MapListItem
                        property={property}
                        onClick={() => openDetail(property.id)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-neutral-500">Aucun bien trouvé</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ── Grid / List View ──────────────────────────────────────── */
          <div className="flex gap-6">
            {/* Desktop Sidebar */}
            <motion.aside
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="hidden lg:block w-72 shrink-0"
            >
              <div className="bg-white rounded-xl border border-neutral-200 p-5 sticky top-24">
                <FilterSidebar {...filterSidebarProps} />
              </div>
            </motion.aside>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {filteredProperties.length > 0 ? (
                viewMode === 'grid' ? (
                  /* Grid view */
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"
                  >
                    {filteredProperties.map((property, i) => (
                      <motion.div
                        key={property.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: i * 0.05 }}
                      >
                        <PropertyCard
                          property={property}
                          onClick={() => openDetail(property.id)}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  /* List view */
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    {filteredProperties.map((property, i) => (
                      <motion.div
                        key={property.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.04 }}
                      >
                        <PropertyListItem
                          property={property}
                          onClick={() => openDetail(property.id)}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                )
              ) : (
                /* Empty state */
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20"
                >
                  <div className="size-20 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-5">
                    <Search className="size-8 text-neutral-300" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                    Aucun bien ne correspond à vos critères
                  </h3>
                  <p className="text-neutral-500 text-sm mb-6 max-w-md mx-auto">
                    Essayez de modifier vos filtres ou votre recherche pour découvrir plus de biens disponibles.
                  </p>
                  <Button
                    variant="outline"
                    onClick={resetFilters}
                    className="text-brand-500 border-brand-200 hover:bg-brand-50 hover:text-brand-600"
                  >
                    <RotateCcw className="size-4 mr-2" />
                    Réinitialiser les filtres
                  </Button>
                </motion.div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
