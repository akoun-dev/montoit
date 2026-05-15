'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { MapPin, Heart, Eye, ShieldCheck, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/lib/auth-store'

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
  status: 'disponible' | 'loue'
  views: number
  verified: boolean
}

const properties: Property[] = [
  {
    id: 1,
    title: 'Appartement F3 moderne – Cocody',
    price: 150000,
    priceLabel: '150 000 FCFA/mois',
    location: 'Cocody Riviera, Abidjan',
    city: 'Cocody',
    bedrooms: '3 pièces',
    bathrooms: '2 SDB',
    area: '85 m²',
    image: '/images/property-1.png',
    type: 'Appartement',
    meuble: true,
    isNew: false,
    status: 'disponible',
    views: 142,
    verified: true,
  },
  {
    id: 2,
    title: 'Studio Meublé – Plateau',
    price: 75000,
    priceLabel: '75 000 FCFA/mois',
    location: 'Plateau Dokui, Abidjan',
    city: 'Plateau',
    bedrooms: 'Studio',
    bathrooms: '1 SDB',
    area: '35 m²',
    image: '/images/property-2.png',
    type: 'Studio',
    meuble: true,
    isNew: false,
    status: 'disponible',
    views: 89,
    verified: true,
  },
  {
    id: 3,
    title: 'Villa 4 Chambres – Marcory',
    price: 350000,
    priceLabel: '350 000 FCFA/mois',
    location: 'Marcory Résidentiel, Abidjan',
    city: 'Marcory',
    bedrooms: '4 pièces',
    bathrooms: '3 SDB',
    area: '200 m²',
    image: '/images/property-3.png',
    type: 'Villa',
    meuble: false,
    isNew: false,
    status: 'disponible',
    views: 215,
    verified: true,
  },
  {
    id: 4,
    title: 'Appartement F4 – Yopougon',
    price: 90000,
    priceLabel: '90 000 FCFA/mois',
    location: 'Yopougon Sipimap, Abidjan',
    city: 'Yopougon',
    bedrooms: '2 pièces',
    bathrooms: '1 SDB',
    area: '55 m²',
    image: '/images/property-4.png',
    type: 'Appartement',
    meuble: false,
    isNew: false,
    status: 'loue',
    views: 67,
    verified: false,
  },
  {
    id: 5,
    title: 'Duplex Moderne – Abobo',
    price: 180000,
    priceLabel: '180 000 FCFA/mois',
    location: 'Abobo Avocatier, Abidjan',
    city: 'Abobo',
    bedrooms: '3 pièces',
    bathrooms: '2 SDB',
    area: '120 m²',
    image: '/images/property-5.png',
    type: 'Duplex',
    meuble: true,
    isNew: false,
    status: 'disponible',
    views: 178,
    verified: true,
  },
  {
    id: 6,
    title: 'Penthouse – Riviera Palmeraie',
    price: 500000,
    priceLabel: '500 000 FCFA/mois',
    location: 'Riviera Palmeraie, Abidjan',
    city: 'Riviera',
    bedrooms: '4 pièces',
    bathrooms: '3 SDB',
    area: '180 m²',
    image: '/images/property-6.png',
    type: 'Penthouse',
    meuble: true,
    isNew: false,
    status: 'disponible',
    views: 304,
    verified: true,
  },
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
        {/* Status + Meublé badges on image top-left */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <Badge
            className={`border-0 text-xs font-semibold px-2.5 py-1 ${
              property.status === 'disponible'
                ? 'bg-emerald-500 text-white'
                : 'bg-red-500 text-white'
            }`}
          >
            {property.status === 'disponible' ? 'Disponible' : 'Loué'}
          </Badge>
          {property.meuble && (
            <Badge className="bg-brand-500 text-white border-0 text-xs font-semibold px-2.5 py-1">
              Meublé
            </Badge>
          )}
        </div>
        {/* Favorite button */}
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (!isAuthenticated) { setView('login'); return }
            setIsFavorite(!isFavorite)
          }}
          className="absolute top-3 right-3 size-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center transition-opacity hover:bg-white shadow-sm"
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
        {/* Title */}
        <h3 className="font-semibold text-neutral-900 text-sm sm:text-base mb-1 line-clamp-1">
          {property.title}
        </h3>
        {/* Location */}
        <div className="flex items-center gap-1 text-neutral-500 text-xs sm:text-sm mb-2">
          <MapPin className="size-3.5 shrink-0" />
          <span className="line-clamp-1">{property.location}</span>
        </div>

        {/* Features */}
        <p className="text-neutral-600 text-xs sm:text-sm mb-3">
          {property.bedrooms} &bull; {property.area}
        </p>

        {/* Price */}
        <p className="font-bold text-neutral-900 text-base sm:text-lg mb-2">
          {property.priceLabel}
        </p>

        {/* Bottom row: views + verified */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-neutral-400 text-xs">
            <Eye className="size-3.5" />
            <span>{property.views} vues</span>
          </div>
          {property.verified && (
            <Badge className="bg-brand-50 text-brand-600 border-brand-200 text-xs font-medium px-2 py-0.5 border">
              <ShieldCheck className="size-3 mr-1" />
              Vérifié
            </Badge>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export function NosBiens() {
  const { setView } = useAuthStore()

  return (
    <section className="py-16 sm:py-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header - left-aligned title with "Voir tout" link on right */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex items-start sm:items-center justify-between mb-8 sm:mb-10 gap-4"
        >
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-1">
              Annonces récents
            </h2>
            <p className="text-neutral-500 text-sm sm:text-base">
              Découvrez les dernières annonces disponibles
            </p>
          </div>
          <button
            onClick={() => setView('nos-biens')}
            className="flex items-center gap-1 text-brand-500 hover:text-brand-600 font-medium text-sm whitespace-nowrap transition-colors shrink-0"
          >
            Voir tout
            <ArrowRight className="size-4" />
          </button>
        </motion.div>

        {/* Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// Keep backward-compatible export name
export { NosBiens as Properties }
