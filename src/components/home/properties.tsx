'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { MapPin, BedDouble, Bath, Maximize, ArrowRight, Heart, SlidersHorizontal, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/lib/auth-store'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type PropertyType = 'Appartement' | 'Maison' | 'Studio' | 'Duplex' | 'Penthouse' | 'Villa'

interface Property {
  id: number
  title: string
  price: number
  priceLabel: string
  location: string
  city: string
  bedrooms: string
  bathrooms: string
  area: string
  image: string
  type: PropertyType
  meuble: boolean
  isNew: boolean
}

const properties: Property[] = [
  {
    id: 1,
    title: 'Appartement F3 Cocody',
    price: 150000,
    priceLabel: '150 000 FCFA/mois',
    location: 'Cocody Riviera',
    city: 'Cocody',
    bedrooms: '3 ch',
    bathrooms: '2 SDB',
    area: '85 m²',
    image: '/images/property-1.png',
    type: 'Appartement',
    meuble: true,
    isNew: false,
  },
  {
    id: 2,
    title: 'Studio Meublé Plateau',
    price: 75000,
    priceLabel: '75 000 FCFA/mois',
    location: 'Plateau Dokui',
    city: 'Plateau',
    bedrooms: 'Studio',
    bathrooms: '1 SDB',
    area: '35 m²',
    image: '/images/property-2.png',
    type: 'Studio',
    meuble: true,
    isNew: false,
  },
  {
    id: 3,
    title: 'Villa 4 Chambres Marcory',
    price: 350000,
    priceLabel: '350 000 FCFA/mois',
    location: 'Marcory Résidentiel',
    city: 'Marcory',
    bedrooms: '4 ch',
    bathrooms: '3 SDB',
    area: '200 m²',
    image: '/images/property-3.png',
    type: 'Villa',
    meuble: false,
    isNew: false,
  },
  {
    id: 4,
    title: 'Appartement F2 Yopougon',
    price: 90000,
    priceLabel: '90 000 FCFA/mois',
    location: 'Yopougon Sipimap',
    city: 'Yopougon',
    bedrooms: '2 ch',
    bathrooms: '1 SDB',
    area: '55 m²',
    image: '/images/property-4.png',
    type: 'Appartement',
    meuble: false,
    isNew: false,
  },
  {
    id: 5,
    title: 'Duplex Abobo',
    price: 180000,
    priceLabel: '180 000 FCFA/mois',
    location: 'Abobo Avocatier',
    city: 'Abobo',
    bedrooms: '3 ch',
    bathrooms: '2 SDB',
    area: '120 m²',
    image: '/images/property-5.png',
    type: 'Duplex',
    meuble: true,
    isNew: false,
  },
  {
    id: 6,
    title: 'Penthouse Riviera',
    price: 500000,
    priceLabel: '500 000 FCFA/mois',
    location: 'Riviera Palmeraie',
    city: 'Riviera',
    bedrooms: '4 ch',
    bathrooms: '3 SDB',
    area: '180 m²',
    image: '/images/property-6.png',
    type: 'Penthouse',
    meuble: true,
    isNew: false,
  },
  {
    id: 7,
    title: 'Appartement F4 Deux Plateaux',
    price: 220000,
    priceLabel: '220 000 FCFA/mois',
    location: 'Deux Plateaux',
    city: 'Cocody',
    bedrooms: '4 ch',
    bathrooms: '2 SDB',
    area: '110 m²',
    image: '/images/property-1.png',
    type: 'Appartement',
    meuble: false,
    isNew: true,
  },
  {
    id: 8,
    title: 'Studio Climatisé Treichville',
    price: 65000,
    priceLabel: '65 000 FCFA/mois',
    location: 'Treichville',
    city: 'Abidjan',
    bedrooms: 'Studio',
    bathrooms: '1 SDB',
    area: '28 m²',
    image: '/images/property-2.png',
    type: 'Studio',
    meuble: true,
    isNew: true,
  },
]

const propertyTypes: Array<PropertyType | 'Tous'> = ['Tous', 'Appartement', 'Maison', 'Studio', 'Duplex', 'Penthouse', 'Villa']
const cities = ['Toutes', 'Abidjan', 'Cocody', 'Plateau', 'Marcory', 'Yopougon', 'Abobo', 'Riviera']
const budgets = [
  { label: 'Tous', min: 0, max: Infinity },
  { label: '< 100 000 FCFA', min: 0, max: 100000 },
  { label: '100 000 - 200 000 FCFA', min: 100000, max: 200000 },
  { label: '200 000 - 350 000 FCFA', min: 200000, max: 350000 },
  { label: '> 350 000 FCFA', min: 350000, max: Infinity },
]

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
}

function PropertyCard({ property }: { property: Property }) {
  const [isFavorite, setIsFavorite] = useState(false)
  const { setView, setSelectedPropertyId, isAuthenticated } = useAuthStore()

  const handleClick = () => {
    setSelectedPropertyId(property.id)
    setView('property-detail')
  }

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleClick}
    >
      {/* Image */}
      <div className="relative h-48 sm:h-52 overflow-hidden">
        <Image
          src={property.image}
          alt={property.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        {/* Price badge */}
        <Badge className="absolute top-3 left-3 bg-brand-500 text-white border-0 text-xs font-semibold px-2.5 py-1">
          {property.priceLabel}
        </Badge>
        {/* Type badge */}
        <Badge className="absolute top-3 right-12 bg-white/90 text-neutral-700 border-0 text-xs font-medium px-2 py-1 backdrop-blur-sm">
          {property.type}
        </Badge>
        {/* New badge */}
        {property.isNew && (
          <Badge className="absolute bottom-3 left-3 bg-emerald-500 text-white border-0 text-xs font-semibold px-2 py-1">
            Nouveau
          </Badge>
        )}
        {/* Favorite button */}
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (!isAuthenticated) { setView('login'); return }
            setIsFavorite(!isFavorite)
          }}
          className="absolute top-3 right-3 size-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-white shadow-sm"
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
      <div className="p-4 sm:p-5">
        <h3 className="font-semibold text-neutral-900 text-base mb-1.5">
          {property.title}
        </h3>
        <div className="flex items-center gap-1 text-neutral-500 text-sm mb-3">
          <MapPin className="size-3.5 shrink-0" />
          <span>{property.location}</span>
        </div>

        {/* Features */}
        <div className="flex items-center gap-4 text-sm text-neutral-600 mb-4">
          <div className="flex items-center gap-1">
            <BedDouble className="size-4 text-neutral-400" />
            <span>{property.bedrooms}</span>
          </div>
          <div className="flex items-center gap-1">
            <Bath className="size-4 text-neutral-400" />
            <span>{property.bathrooms}</span>
          </div>
          <div className="flex items-center gap-1">
            <Maximize className="size-4 text-neutral-400" />
            <span>{property.area}</span>
          </div>
          {property.meuble && (
            <Badge variant="outline" className="text-xs text-brand-600 border-brand-200 bg-brand-50 px-1.5 py-0">
              Meublé
            </Badge>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full text-brand-500 border-brand-200 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-300"
        >
          Voir le bien
          <ArrowRight className="size-3.5 ml-1" />
        </Button>
      </div>
    </motion.div>
  )
}

export function NosBiens() {
  const [typeFilter, setTypeFilter] = useState<string>('Tous')
  const [cityFilter, setCityFilter] = useState<string>('Toutes')
  const [budgetFilter, setBudgetFilter] = useState<string>('Tous')
  const [meubleFilter, setMeubleFilter] = useState(false)

  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      // Type filter
      if (typeFilter !== 'Tous' && p.type !== typeFilter) return false
      // City filter
      if (cityFilter !== 'Toutes' && p.city !== cityFilter) return false
      // Budget filter
      const budget = budgets.find((b) => b.label === budgetFilter)
      if (budget && (p.price < budget.min || p.price > budget.max)) return false
      // Meuble filter
      if (meubleFilter && !p.meuble) return false
      return true
    })
  }, [typeFilter, cityFilter, budgetFilter, meubleFilter])

  const hasActiveFilters = typeFilter !== 'Tous' || cityFilter !== 'Toutes' || budgetFilter !== 'Tous' || meubleFilter

  const resetFilters = () => {
    setTypeFilter('Tous')
    setCityFilter('Toutes')
    setBudgetFilter('Tous')
    setMeubleFilter(false)
  }

  return (
    <section className="py-16 sm:py-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8 sm:mb-10"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-2">
            Nos Biens
          </h2>
          <p className="text-neutral-500 text-base max-w-xl mx-auto">
            Découvrez notre sélection de biens immobiliers vérifiés et validés par nos Tiers de Confiance.
          </p>
        </motion.div>

        {/* Filters Bar */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-neutral-50 rounded-xl border border-neutral-200 p-4 sm:p-5 mb-8"
        >
          <div className="flex items-center gap-2 mb-3 text-sm font-medium text-neutral-700">
            <SlidersHorizontal className="size-4" />
            <span>Filtrer les biens</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            {/* Type */}
            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-500">Type de bien</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-10 bg-white border-neutral-200 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {propertyTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* City */}
            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-500">Ville</Label>
              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger className="h-10 bg-white border-neutral-200 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Budget */}
            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-500">Budget</Label>
              <Select value={budgetFilter} onValueChange={setBudgetFilter}>
                <SelectTrigger className="h-10 bg-white border-neutral-200 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {budgets.map((b) => (
                    <SelectItem key={b.label} value={b.label}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Meuble toggle */}
            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-500">Meublé</Label>
              <div className="flex items-center gap-2 h-10 px-3 bg-white rounded-md border border-neutral-200">
                <Checkbox
                  id="meuble-filter"
                  checked={meubleFilter}
                  onCheckedChange={(checked) => setMeubleFilter(checked === true)}
                  className="data-[state=checked]:bg-brand-500 data-[state=checked]:border-brand-500"
                />
                <Label htmlFor="meuble-filter" className="text-sm text-neutral-700 cursor-pointer">
                  Meublé uniquement
                </Label>
              </div>
            </div>

            {/* Reset */}
            <div className="space-y-1.5">
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-10 text-neutral-500 hover:text-brand-500 w-full"
                >
                  <RotateCcw className="size-3.5 mr-1.5" />
                  Réinitialiser
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-neutral-500">
            <span className="font-semibold text-neutral-900">{filteredProperties.length}</span>{' '}
            bien{filteredProperties.length !== 1 ? 's' : ''} trouvé{filteredProperties.length !== 1 ? 's' : ''}
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-sm text-brand-500 hover:text-brand-600 transition-colors flex items-center gap-1"
            >
              <RotateCcw className="size-3.5" />
              Voir tous les biens
            </button>
          )}
        </div>

        {/* Grid */}
        {filteredProperties.length > 0 ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </motion.div>
        ) : (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 sm:py-20"
          >
            <div className="size-16 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4">
              <SlidersHorizontal className="size-7 text-neutral-400" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">
              Aucun bien ne correspond à vos critères
            </h3>
            <p className="text-neutral-500 text-sm mb-6 max-w-md mx-auto">
              Essayez de modifier vos filtres pour découvrir plus de biens disponibles.
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
    </section>
  )
}

// Keep backward-compatible export name
export { NosBiens as Properties }
