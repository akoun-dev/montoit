'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { MapPin, BedDouble, Bath, Maximize, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Property {
  id: number
  title: string
  price: string
  location: string
  bedrooms: string
  bathrooms: string
  area: string
  image: string
}

const properties: Property[] = [
  {
    id: 1,
    title: 'Appartement F3 Cocody',
    price: '150 000 FCFA/mois',
    location: 'Cocody Riviera',
    bedrooms: '3 ch',
    bathrooms: '2 SDB',
    area: '85 m²',
    image: '/images/property-1.png',
  },
  {
    id: 2,
    title: 'Studio Meublé Plateau',
    price: '75 000 FCFA/mois',
    location: 'Plateau Dokui',
    bedrooms: 'Studio',
    bathrooms: '1 SDB',
    area: '35 m²',
    image: '/images/property-2.png',
  },
  {
    id: 3,
    title: 'Villa 4 Chambres Marcory',
    price: '350 000 FCFA/mois',
    location: 'Marcory Résidentiel',
    bedrooms: '4 ch',
    bathrooms: '3 SDB',
    area: '200 m²',
    image: '/images/property-3.png',
  },
  {
    id: 4,
    title: 'Appartement F2 Yopougon',
    price: '90 000 FCFA/mois',
    location: 'Yopougon Sipimap',
    bedrooms: '2 ch',
    bathrooms: '1 SDB',
    area: '55 m²',
    image: '/images/property-4.png',
  },
  {
    id: 5,
    title: 'Duplex Abobo',
    price: '180 000 FCFA/mois',
    location: 'Abobo Avocatier',
    bedrooms: '3 ch',
    bathrooms: '2 SDB',
    area: '120 m²',
    image: '/images/property-5.png',
  },
  {
    id: 6,
    title: 'Penthouse Riviera',
    price: '500 000 FCFA/mois',
    location: 'Riviera Palmeraie',
    bedrooms: '4 ch',
    bathrooms: '3 SDB',
    area: '180 m²',
    image: '/images/property-6.png',
  },
]

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
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
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
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
        <Badge className="absolute top-3 left-3 bg-brand-500 text-white border-0 text-xs font-semibold px-2.5 py-1">
          {property.price}
        </Badge>
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

export function Properties() {
  return (
    <section className="py-16 sm:py-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900">
            Biens récents
          </h2>
          <a
            href="#"
            className="text-brand-500 hover:text-brand-600 font-medium text-sm flex items-center gap-1 transition-colors"
          >
            Voir tout
            <ArrowRight className="size-4" />
          </a>
        </div>

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
