'use client'

import { useState, useCallback } from 'react'
import { Search, MapPin, Building2, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/lib/auth-store'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Types ──────────────────────────────────────────────────────────────────
interface PropertyItem {
  id: string
  title: string
  type: string
  price: number
  currency: string
  area: number
  bedrooms: number | null
  bathrooms: number | null
  address: string
  city: string
  commune: string | null
  rentalStatus: string
  isFurnished: boolean
  isVerified: boolean
  viewsCount: number
  image: string | null
  owner: {
    id: string
    firstName: string
    lastName: string
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatCurrency(amount: number): string {
  return amount.toLocaleString('fr-FR')
}

// ─── Animation Variants ────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export function SearchProperties() {
  const { user, setView, setSelectedPropertyId } = useAuthStore()
  const [search, setSearch] = useState('')
  const [city, setCity] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [results, setResults] = useState<PropertyItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSearched(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (city) params.set('commune', city)
      if (minPrice) params.set('minPrice', minPrice)
      if (maxPrice) params.set('maxPrice', maxPrice)
      params.set('all', 'true')

      // /api/properties is a public endpoint — use raw fetch
      const res = await fetch(`/api/properties?${params.toString()}`)
      if (!res.ok) throw new Error('Erreur serveur')
      const data = await res.json()
      setResults(data.properties ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [search, city, minPrice, maxPrice])

  const handleViewProperty = (propertyId: string) => {
    setSelectedPropertyId(propertyId)
    setView('property-detail')
  }

  const handleBrowseAll = () => {
    setView('nos-biens')
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-foreground">Chercher un bien</h1>
        <p className="text-muted-foreground mt-1">Trouvez votre futur logement</p>
      </motion.div>

      {/* Search Card */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-brand-50">
                <Search className="size-4 text-brand-500" />
              </div>
              Recherche rapide
            </CardTitle>
            <CardDescription>Entrez une commune ou un quartier pour commencer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Commune, quartier, ville..."
                className="pl-10 h-11"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Ville"
                className="h-10"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Budget min"
                  className="h-10"
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
                <Input
                  placeholder="Budget max"
                  className="h-10"
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>
            </div>
            <Button
              onClick={handleSearch}
              disabled={loading}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white h-11"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Recherche...
                </div>
              ) : (
                <>
                  <Search className="size-4 mr-2" />
                  Rechercher
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Error */}
      {error && (
        <motion.div variants={itemVariants}>
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <p className="text-sm text-amber-700">{error}</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Search Results */}
      <AnimatePresence mode="wait">
        {searched && !loading && results.length === 0 ? (
          <motion.div key="no-results" variants={itemVariants} initial="hidden" animate="show" exit="hidden">
            <Card className="border-dashed border-border bg-muted/50">
              <CardContent className="py-12 flex flex-col items-center text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-brand-50 mb-4">
                  <Search className="size-7 text-brand-500" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  Aucun résultat
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Essayez avec d&apos;autres critères de recherche ou parcourez tous nos biens.
                </p>
                <Button
                  onClick={handleBrowseAll}
                  variant="outline"
                  className="mt-4 gap-1.5 text-brand-600 border-brand-200 hover:bg-brand-50"
                >
                  Voir tous les biens
                  <ChevronRight className="size-4" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : results.length > 0 ? (
          <motion.div key="results" variants={containerVariants} initial="hidden" animate="show">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">
                {results.length} bien{results.length > 1 ? 's' : ''} trouvé{results.length > 1 ? 's' : ''}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((property) => {
                const bedroomsLabel = property.bedrooms
                  ? property.bedrooms === 1
                    ? '1 pièce'
                    : `${property.bedrooms} pièces`
                  : 'Studio'

                return (
                  <motion.div key={property.id} variants={itemVariants}>
                    <Card className="border-border overflow-hidden hover:shadow-md transition-shadow group cursor-pointer"
                      onClick={() => handleViewProperty(property.id)}
                    >
                      {/* Image */}
                      <div className="relative h-40 overflow-hidden">
                        {property.image ? (
                          <img
                            src={property.image}
                            alt={property.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <Building2 className="size-8 text-neutral-300" />
                          </div>
                        )}
                        <Badge
                          className={`absolute top-3 left-3 border-0 text-xs font-semibold px-2 py-0.5 ${
                            property.rentalStatus === 'disponible'
                              ? 'bg-emerald-500 text-white'
                              : property.rentalStatus === 'loue'
                                ? 'bg-red-500 text-white'
                                : 'bg-amber-500 text-white'
                          }`}
                        >
                          {property.rentalStatus === 'disponible'
                            ? 'Disponible'
                            : property.rentalStatus === 'loue'
                              ? 'Loué'
                              : 'Réservé'}
                        </Badge>
                        {property.isVerified && (
                          <Badge className="absolute top-3 right-3 bg-brand-50 text-brand-600 border-brand-200 text-[10px] px-1.5 py-0 border">
                            Vérifié
                          </Badge>
                        )}
                      </div>

                      {/* Content */}
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-foreground text-sm line-clamp-1 mb-1 group-hover:text-brand-600 transition-colors">
                          {property.title}
                        </h3>
                        <div className="flex items-center gap-1 text-muted-foreground text-xs mb-2">
                          <MapPin className="size-3 shrink-0" />
                          <span className="line-clamp-1">{property.city}{property.commune ? `, ${property.commune}` : ''}</span>
                        </div>
                        <p className="text-muted-foreground text-xs mb-2">
                          {bedroomsLabel} &bull; {property.area} m²
                          {property.isFurnished && ' &bull; Meublé'}
                        </p>
                        <p className="font-bold text-foreground text-sm">
                          {formatCurrency(property.price)} <span className="text-xs font-normal text-muted-foreground">{property.currency}/mois</span>
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        ) : !searched ? (
          /* Initial empty state */
          <motion.div key="initial" variants={itemVariants}>
            <Card className="border-dashed border-border bg-muted/50">
              <CardContent className="py-12 flex flex-col items-center text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-brand-50 mb-4">
                  <Search className="size-7 text-brand-500" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  Explorez nos biens disponibles
                </h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                  {user?.firstName}, parcourez notre catalogue de logements et trouvez celui qui vous correspond.
                </p>
                <Button
                  onClick={handleBrowseAll}
                  className="bg-brand-500 hover:bg-brand-600 text-white"
                >
                  <Search className="size-4 mr-2" />
                  Voir les biens
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  )
}
