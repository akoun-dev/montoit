'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  MapPin,
  BedDouble,
  Maximize,
  Heart,
  BadgeCheck,
  Eye,
  Phone,
  Mail,
  Share2,
  ChevronLeft,
  ChevronRight,
  ShowerHead,
  Car,
  Wind,
  Shield,
  Building2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'

// ── Types ───────────────────────────────────────────────────────────────────

type PropertyStatus = 'disponible' | 'loue' | 'reserve'

export interface PropertyDetail {
  id: number
  title: string
  price: number
  location: string
  city: string
  commune: string
  bedrooms: number | null
  area: number
  image: string
  type: string
  meuble: boolean
  status: PropertyStatus
  isVerified: boolean
  views: number
  lat: number
  lng: number
}

interface PropertyDetailDialogProps {
  property: PropertyDetail | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ── Mock extra data for detail view ────────────────────────────────────────

const propertyExtras: Record<number, {
  description: string
  bathrooms: number
  parking: boolean
  climate: boolean
  guardian: boolean
  images: string[]
  owner: { name: string; phone: string; email: string; avatar: string }
}> = {
  1: {
    description: 'Superbe appartement F3 entièrement rénové dans la résidence sécurisée de Cocody Riviera 2. Salon spacieux avec baie vitrée donnant sur un balcon fleuri, cuisine équipée moderne (hotte, four, plaques induction), 2 chambres avec placards intégrés + suite parentale avec salle de bain privative. Climatisation réversible dans toutes les pièces. Gardien 24h/24, piscine communautaire.',
    bathrooms: 2,
    parking: true,
    climate: true,
    guardian: true,
    images: ['/images/apt-cocody.png', '/images/apt-cocody.png', '/images/apt-cocody.png'],
    owner: { name: 'Mme Koné Aminata', phone: '+225 07 08 09 10 11', email: 'a.kone@email.ci', avatar: 'AK' },
  },
  2: {
    description: 'Studio meublé et climatisé au cœur du Plateau, idéal pour jeune cadre. Cuisine américaine équipée, salle de bain moderne avec douche italienne. Building sécurisé avec ascenseur, parking souterrain. Proche des administrations et commerces.',
    bathrooms: 1,
    parking: false,
    climate: true,
    guardian: true,
    images: ['/images/studio-plateau.png', '/images/studio-plateau.png', '/images/studio-plateau.png'],
    owner: { name: 'M. Diallo Mamadou', phone: '+225 05 12 34 56 78', email: 'm.diallo@email.ci', avatar: 'DM' },
  },
  3: {
    description: 'Magnifique villa 4 chambres dans le quartier résidentiel de Marcory. Grand séjour double, cuisine indépendante aménagée, terrasse couverte donnant sur un jardin tropical de 500m². Garage double, dépendance studio. Terrain clos avec portail motorisé.',
    bathrooms: 3,
    parking: true,
    climate: true,
    guardian: true,
    images: ['/images/villa-marcory.png', '/images/villa-marcory.png', '/images/villa-marcory.png'],
    owner: { name: 'Dr. Brou Yves', phone: '+225 01 23 45 67 89', email: 'y.brou@email.ci', avatar: 'BY' },
  },
  4: {
    description: 'Appartement F2 fonctionnel à Yopougon Sipimap, proche des transports et commodités. Séjour lumineux, 2 chambres avec placards, cuisine aménagée. Résidence calme et familiale avec aire de jeux pour enfants.',
    bathrooms: 1,
    parking: false,
    climate: false,
    guardian: false,
    images: ['/images/apt-yopougon.png', '/images/apt-yopougon.png', '/images/apt-yopougon.png'],
    owner: { name: 'Mme Touré Fatou', phone: '+225 07 98 76 54 32', email: 'f.toure@email.ci', avatar: 'TF' },
  },
  5: {
    description: 'Duplex meublé moderne à Abobo Avocatier. Réparti sur 2 niveaux : en bas, séjour ouvert sur cuisine américaine et WC visiteurs ; en haut, 3 chambres et 2 salles de bain. Terrasse rooftop avec vue panoramique.',
    bathrooms: 2,
    parking: true,
    climate: true,
    guardian: false,
    images: ['/images/duplex-abobo.png', '/images/duplex-abobo.png', '/images/duplex-abobo.png'],
    owner: { name: 'M. Konan Patrick', phone: '+225 05 11 22 33 44', email: 'p.konan@email.ci', avatar: 'KP' },
  },
  6: {
    description: 'Penthouse d\'exception à Riviera Palmeraie avec vue lagunaire. Grand salon cathédrale, cuisine haut de gamme, suite master avec dressing et salle de bain attenante, 3 chambres supplémentaires. Piscine privée sur terrasse panoramique. Prestations luxe.',
    bathrooms: 3,
    parking: true,
    climate: true,
    guardian: true,
    images: ['/images/penthouse-riviera.png', '/images/penthouse-riviera.png', '/images/penthouse-riviera.png'],
    owner: { name: 'Mme N\'Guessan Aya', phone: '+225 01 55 66 77 88', email: 'a.nguessan@email.ci', avatar: 'AN' },
  },
  7: {
    description: 'Appartement F4 lumineux à Deux Plateaux, quartier calme et résidentiel. Grand séjour, cuisine séparée, 4 chambres dont une suite parentale. Balcon filant. Charges incluses dans le loyer (eau, gardiennage, entretien parties communes).',
    bathrooms: 2,
    parking: true,
    climate: true,
    guardian: true,
    images: ['/images/apt-cocody.png', '/images/apt-cocody.png', '/images/apt-cocody.png'],
    owner: { name: 'M. Yao Serge', phone: '+225 07 44 55 66 77', email: 's.yao@email.ci', avatar: 'YS' },
  },
  8: {
    description: 'Studio climatisé à Treichville, idéalement situé près du marché et de la gare. Pièce principale avec coin nuit séparé par un claustra, kitchenette, salle de douche moderne. Immeuble rénové récemment.',
    bathrooms: 1,
    parking: false,
    climate: true,
    guardian: false,
    images: ['/images/studio-plateau.png', '/images/studio-plateau.png', '/images/studio-plateau.png'],
    owner: { name: 'M. Coulibaly Ibrahim', phone: '+225 05 88 99 00 11', email: 'i.coulibaly@email.ci', avatar: 'CI' },
  },
}

// ── Component ───────────────────────────────────────────────────────────────

export function PropertyDetailDialog({ property, open, onOpenChange }: PropertyDetailDialogProps) {
  const [isFavorite, setIsFavorite] = useState(false)
  const [currentImage, setCurrentImage] = useState(0)

  if (!property) return null

  const extras = propertyExtras[property.id] ?? propertyExtras[1]!

  const statusConfig: Record<PropertyStatus, { label: string; className: string }> = {
    disponible: { label: 'Disponible', className: 'bg-emerald-500 text-white' },
    loue: { label: 'Loué', className: 'bg-red-500 text-white' },
    reserve: { label: 'Réservé', className: 'bg-amber-500 text-white' },
  }

  const features = [
    { icon: BedDouble, label: 'Chambres', value: property.bedrooms ?? '—' },
    { icon: ShowerHead, label: 'SdB', value: extras.bathrooms },
    { icon: Maximize, label: 'Surface', value: `${property.area} m²` },
    { icon: Car, label: 'Parking', value: extras.parking ? 'Oui' : 'Non' },
    { icon: Wind, label: 'Climatisation', value: extras.climate ? 'Oui' : 'Non' },
    { icon: Shield, label: 'Gardien', value: extras.guardian ? 'Oui' : 'Non' },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">{property.title}</DialogTitle>

        {/* ── Image Gallery ─────────────────────────────────────────────── */}
        <div className="relative h-64 sm:h-80 bg-neutral-100">
          <Image
            src={extras.images[currentImage] ?? property.image}
            alt={property.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
            priority
          />
          {/* Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

          {/* Image nav arrows */}
          {extras.images.length > 1 && (
            <>
              <button
                onClick={() => setCurrentImage((p) => (p - 1 + extras.images.length) % extras.images.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 size-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white shadow-md transition-colors"
                aria-label="Image précédente"
              >
                <ChevronLeft className="size-4 text-neutral-700" />
              </button>
              <button
                onClick={() => setCurrentImage((p) => (p + 1) % extras.images.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 size-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white shadow-md transition-colors"
                aria-label="Image suivante"
              >
                <ChevronRight className="size-4 text-neutral-700" />
              </button>
            </>
          )}

          {/* Image indicators */}
          {extras.images.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {extras.images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentImage(i)}
                  className={`size-2 rounded-full transition-all ${i === currentImage ? 'bg-white w-5' : 'bg-white/50 hover:bg-white/75'}`}
                  aria-label={`Image ${i + 1}`}
                />
              ))}
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-4 left-4 flex items-center gap-1.5">
            <Badge className={`border-0 text-xs font-semibold px-2.5 py-0.5 ${statusConfig[property.status].className}`}>
              {statusConfig[property.status].label}
            </Badge>
            {property.meuble && (
              <Badge className="border-0 text-xs font-medium px-2.5 py-0.5 bg-sky-500 text-white">
                Meublé
              </Badge>
            )}
            {property.isVerified && (
              <Badge className="border-0 text-xs font-medium px-2.5 py-0.5 bg-white/90 backdrop-blur-sm text-neutral-700">
                <BadgeCheck className="size-3 text-brand-500 mr-0.5" />
                Vérifié
              </Badge>
            )}
          </div>

          {/* Favorite & Share */}
          <div className="absolute top-4 right-12 flex items-center gap-2">
            <button
              onClick={() => setIsFavorite(!isFavorite)}
              className="size-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white shadow-sm transition-all"
              aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            >
              <Heart className={`size-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-neutral-600'}`} />
            </button>
            <button
              className="size-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white shadow-sm transition-all"
              aria-label="Partager"
            >
              <Share2 className="size-4 text-neutral-600" />
            </button>
          </div>
        </div>

        {/* ── Content ────────────────────────────────────────────────────── */}
        <div className="p-5 sm:p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0 border-neutral-300 text-neutral-600">
                  <Building2 className="size-3 mr-0.5" />
                  {property.type}
                </Badge>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-neutral-900 mb-1">{property.title}</h2>
              <div className="flex items-center gap-1 text-neutral-500 text-sm">
                <MapPin className="size-3.5 shrink-0 text-brand-500" />
                <span>{property.location}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xl sm:text-2xl font-bold text-brand-500">
                {property.price.toLocaleString('fr-FR')}
              </p>
              <p className="text-xs text-neutral-400">F CFA/mois</p>
            </div>
          </div>

          {/* Views count */}
          <div className="flex items-center gap-1.5 text-neutral-400 text-xs mb-5">
            <Eye className="size-3.5" />
            <span>{property.views} vues</span>
          </div>

          <Separator className="mb-5" />

          {/* Features grid */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-5">
            {features.map((feat) => (
              <div key={feat.label} className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
                <feat.icon className="size-4 text-brand-500" />
                <span className="text-[10px] text-neutral-500 font-medium">{feat.label}</span>
                <span className="text-xs font-semibold text-neutral-800">{feat.value}</span>
              </div>
            ))}
          </div>

          {/* Description */}
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-neutral-900 mb-2">Description</h3>
            <p className="text-sm text-neutral-600 leading-relaxed">{extras.description}</p>
          </div>

          <Separator className="mb-5" />

          {/* Owner / Contact */}
          <div className="flex items-center gap-4 mb-5">
            <div className="size-12 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
              {extras.owner.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-neutral-900">{extras.owner.name}</p>
              <p className="text-xs text-neutral-500">Propriétaire</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-brand-500 border-brand-200 hover:bg-brand-50 hover:text-brand-600 text-xs h-9"
              >
                <Mail className="size-3.5 mr-1.5" />
                Email
              </Button>
              <Button
                size="sm"
                className="bg-brand-500 hover:bg-brand-600 text-white text-xs h-9"
              >
                <Phone className="size-3.5 mr-1.5" />
                Appeler
              </Button>
            </div>
          </div>

          {/* CTA */}
          <Button className="w-full bg-brand-500 hover:bg-brand-600 text-white h-11 text-sm font-semibold">
            Prendre rendez-vous pour une visite
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
