'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/lib/auth-store'
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
  ArrowLeft,
  Star,
  MessageSquare,
  Calendar,
  Video,
  User,
  Clock,
  CheckCircle2,
  Send,
  ThumbsUp,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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

// ── Mock data ───────────────────────────────────────────────────────────────

const propertyExtras: Record<number, {
  description: string
  bathrooms: number
  parking: boolean
  climate: boolean
  guardian: boolean
  images: string[]
  owner: { name: string; phone: string; email: string; avatar: string; joinedDate: string; responseRate: number; responseTime: string }
}> = {
  1: {
    description: 'Superbe appartement F3 entièrement rénové dans la résidence sécurisée de Cocody Riviera 2. Salon spacieux avec baie vitrée donnant sur un balcon fleuri, cuisine équipée moderne (hotte, four, plaques induction), 2 chambres avec placards intégrés + suite parentale avec salle de bain privative. Climatisation réversible dans toutes les pièces. Gardien 24h/24, piscine communautaire.',
    bathrooms: 2, parking: true, climate: true, guardian: true,
    images: ['/images/apt-cocody.png', '/images/apt-cocody.png', '/images/apt-cocody.png'],
    owner: { name: 'Mme Koné Aminata', phone: '+225 07 08 09 10 11', email: 'a.kone@email.ci', avatar: 'AK', joinedDate: 'Mars 2023', responseRate: 95, responseTime: '2h' },
  },
  2: {
    description: 'Studio meublé et climatisé au cœur du Plateau, idéal pour jeune cadre. Cuisine américaine équipée, salle de bain moderne avec douche italienne. Building sécurisé avec ascenseur, parking souterrain. Proche des administrations et commerces.',
    bathrooms: 1, parking: false, climate: true, guardian: true,
    images: ['/images/studio-plateau.png', '/images/studio-plateau.png', '/images/studio-plateau.png'],
    owner: { name: 'M. Diallo Mamadou', phone: '+225 05 12 34 56 78', email: 'm.diallo@email.ci', avatar: 'DM', joinedDate: 'Jan 2024', responseRate: 88, responseTime: '4h' },
  },
  3: {
    description: 'Magnifique villa 4 chambres dans le quartier résidentiel de Marcory. Grand séjour double, cuisine indépendante aménagée, terrasse couverte donnant sur un jardin tropical de 500m². Garage double, dépendance studio. Terrain clos avec portail motorisé.',
    bathrooms: 3, parking: true, climate: true, guardian: true,
    images: ['/images/villa-marcory.png', '/images/villa-marcory.png', '/images/villa-marcory.png'],
    owner: { name: 'Dr. Brou Yves', phone: '+225 01 23 45 67 89', email: 'y.brou@email.ci', avatar: 'BY', joinedDate: 'Sep 2022', responseRate: 98, responseTime: '1h' },
  },
  4: {
    description: 'Appartement F2 fonctionnel à Yopougon Sipimap, proche des transports et commodités. Séjour lumineux, 2 chambres avec placards, cuisine aménagée. Résidence calme et familiale avec aire de jeux pour enfants.',
    bathrooms: 1, parking: false, climate: false, guardian: false,
    images: ['/images/apt-yopougon.png', '/images/apt-yopougon.png', '/images/apt-yopougon.png'],
    owner: { name: 'Mme Touré Fatou', phone: '+225 07 98 76 54 32', email: 'f.toure@email.ci', avatar: 'TF', joinedDate: 'Juin 2024', responseRate: 75, responseTime: '8h' },
  },
  5: {
    description: 'Duplex meublé moderne à Abobo Avocatier. Réparti sur 2 niveaux : en bas, séjour ouvert sur cuisine américaine et WC visiteurs ; en haut, 3 chambres et 2 salles de bain. Terrasse rooftop avec vue panoramique.',
    bathrooms: 2, parking: true, climate: true, guardian: false,
    images: ['/images/duplex-abobo.png', '/images/duplex-abobo.png', '/images/duplex-abobo.png'],
    owner: { name: 'M. Konan Patrick', phone: '+225 05 11 22 33 44', email: 'p.konan@email.ci', avatar: 'KP', joinedDate: 'Nov 2023', responseRate: 82, responseTime: '5h' },
  },
  6: {
    description: "Penthouse d'exception à Riviera Palmeraie avec vue lagunaire. Grand salon cathédrale, cuisine haut de gamme, suite master avec dressing et salle de bain attenante, 3 chambres supplémentaires. Piscine privée sur terrasse panoramique. Prestations luxe.",
    bathrooms: 3, parking: true, climate: true, guardian: true,
    images: ['/images/penthouse-riviera.png', '/images/penthouse-riviera.png', '/images/penthouse-riviera.png'],
    owner: { name: "Mme N'Guessan Aya", phone: '+225 01 55 66 77 88', email: 'a.nguessan@email.ci', avatar: 'AN', joinedDate: 'Fév 2022', responseRate: 100, responseTime: '30min' },
  },
  7: {
    description: 'Appartement F4 lumineux à Deux Plateaux, quartier calme et résidentiel. Grand séjour, cuisine séparée, 4 chambres dont une suite parentale. Balcon filant. Charges incluses dans le loyer (eau, gardiennage, entretien parties communes).',
    bathrooms: 2, parking: true, climate: true, guardian: true,
    images: ['/images/apt-cocody.png', '/images/apt-cocody.png', '/images/apt-cocody.png'],
    owner: { name: 'M. Yao Serge', phone: '+225 07 44 55 66 77', email: 's.yao@email.ci', avatar: 'YS', joinedDate: 'Juil 2023', responseRate: 90, responseTime: '3h' },
  },
  8: {
    description: 'Studio climatisé à Treichville, idéalement situé près du marché et de la gare. Pièce principale avec coin nuit séparé par un claustra, kitchenette, salle de douche moderne. Immeuble rénové récemment.',
    bathrooms: 1, parking: false, climate: true, guardian: false,
    images: ['/images/studio-plateau.png', '/images/studio-plateau.png', '/images/studio-plateau.png'],
    owner: { name: 'M. Coulibaly Ibrahim', phone: '+225 05 88 99 00 11', email: 'i.coulibaly@email.ci', avatar: 'CI', joinedDate: 'Avr 2024', responseRate: 70, responseTime: '12h' },
  },
}

// Mock reviews
const mockReviews = [
  { id: 1, name: 'Kouamé Jean', avatar: 'KJ', rating: 5, date: '15 Fév 2025', comment: 'Excellent appartement, très bien entretenu. Le propriétaire est réactif et professionnel. Je recommande vivement !', verified: true },
  { id: 2, name: 'Bamba Awa', avatar: 'BA', rating: 4, date: '28 Jan 2025', comment: 'Bel appartement dans un quartier calme. Petit bémol sur la pression d\'eau en période de pointe, mais dans l\'ensemble très satisfait.', verified: true },
  { id: 3, name: 'Ouattara Moussa', avatar: 'OM', rating: 5, date: '10 Déc 2024', comment: 'Parfait ! La description correspond parfaitement au logement. Visite virtuelle très pratique avant le déplacement.', verified: false },
  { id: 4, name: 'Diabaté Mariam', avatar: 'DM', rating: 3, date: '5 Nov 2024', comment: 'Logement correct mais quelques travaux à prévoir. Le rapport qualité-prix reste acceptable pour le quartier.', verified: true },
]

// ── Main Component ──────────────────────────────────────────────────────────

export function PropertyDetailView({ propertyId }: { propertyId: number }) {
  const { setView } = useAuthStore()
  const [isFavorite, setIsFavorite] = useState(false)
  const [currentImage, setCurrentImage] = useState(0)
  const [activeTab, setActiveTab] = useState<'details' | 'contact' | 'visit' | 'reviews'>('details')

  // Get property data from mock by ID
  const property = getPropertyById(propertyId)
  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-500">Bien introuvable</p>
      </div>
    )
  }

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

  const avgRating = (mockReviews.reduce((s, r) => s + r.rating, 0) / mockReviews.length).toFixed(1)

  return (
    <section className="bg-neutral-50 min-h-screen">
      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <button
            onClick={() => setView('nos-biens')}
            className="flex items-center gap-2 text-sm text-neutral-600 hover:text-brand-500 transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Retour aux résultats</span>
            <span className="sm:hidden">Retour</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFavorite(!isFavorite)}
              className="size-9 rounded-full bg-neutral-50 border border-neutral-200 flex items-center justify-center hover:bg-red-50 hover:border-red-200 transition-all"
              aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            >
              <Heart className={`size-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-neutral-500'}`} />
            </button>
            <button
              className="size-9 rounded-full bg-neutral-50 border border-neutral-200 flex items-center justify-center hover:bg-brand-50 hover:border-brand-200 transition-all"
              aria-label="Partager"
            >
              <Share2 className="size-4 text-neutral-500" />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* ── Left Column (2/3) ──────────────────────────────────────── */}
          <div className="lg:col-span-2">
            {/* Image Gallery */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="relative h-64 sm:h-96 lg:h-[480px] rounded-2xl overflow-hidden bg-neutral-200 mb-6"
            >
              <Image
                src={extras.images[currentImage] ?? property.image}
                alt={property.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 66vw"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

              {/* Image nav */}
              {extras.images.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImage((p) => (p - 1 + extras.images.length) % extras.images.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 size-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white shadow-md transition-colors"
                    aria-label="Image précédente"
                  >
                    <ChevronLeft className="size-4 text-neutral-700" />
                  </button>
                  <button
                    onClick={() => setCurrentImage((p) => (p + 1) % extras.images.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 size-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white shadow-md transition-colors"
                    aria-label="Image suivante"
                  >
                    <ChevronRight className="size-4 text-neutral-700" />
                  </button>
                </>
              )}

              {/* Image indicators */}
              {extras.images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {extras.images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImage(i)}
                      className={`size-2 rounded-full transition-all ${i === currentImage ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/75'}`}
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
            </motion.div>

            {/* Title & Price (mobile) */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="mb-6"
            >
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0 border-neutral-300 text-neutral-600">
                  <Building2 className="size-3 mr-0.5" />
                  {property.type}
                </Badge>
                <div className="flex items-center gap-1 text-neutral-400 text-xs">
                  <Eye className="size-3" />
                  <span>{property.views} vues</span>
                </div>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-1">{property.title}</h1>
              <div className="flex items-center gap-1 text-neutral-500 text-sm">
                <MapPin className="size-3.5 shrink-0 text-brand-500" />
                <span>{property.location}</span>
              </div>
              <div className="flex items-center justify-between mt-3 lg:hidden">
                <p className="text-2xl font-bold text-brand-500">
                  {property.price.toLocaleString('fr-FR')} <span className="text-sm font-normal text-neutral-400">F CFA/mois</span>
                </p>
              </div>
            </motion.div>

            {/* Tabs */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="border-b border-neutral-200 mb-6"
            >
              <div className="flex gap-0 -mb-px overflow-x-auto">
                {([
                  { key: 'details' as const, label: 'Détails', icon: Building2 },
                  { key: 'contact' as const, label: 'Contacter', icon: Phone },
                  { key: 'visit' as const, label: 'Visiter', icon: Calendar },
                  { key: 'reviews' as const, label: `Avis (${mockReviews.length})`, icon: Star },
                ]).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.key
                        ? 'border-brand-500 text-brand-500'
                        : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                    }`}
                  >
                    <tab.icon className="size-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Tab Content */}
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'details' && <DetailsTab property={property} features={features} extras={extras} />}
              {activeTab === 'contact' && <ContactTab property={property} extras={extras} />}
              {activeTab === 'visit' && <VisitTab property={property} />}
              {activeTab === 'reviews' && <ReviewsTab avgRating={avgRating} />}
            </motion.div>
          </div>

          {/* ── Right Sidebar (1/3) ─────────────────────────────────────── */}
          <motion.aside
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="hidden lg:block"
          >
            <div className="sticky top-20 space-y-5">
              {/* Price card */}
              <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm">
                <p className="text-2xl font-bold text-brand-500 mb-1">
                  {property.price.toLocaleString('fr-FR')} <span className="text-sm font-normal text-neutral-400">F CFA/mois</span>
                </p>
                <div className="flex items-center gap-2 text-xs text-neutral-500 mb-4">
                  <MapPin className="size-3" />
                  <span>{property.commune}, {property.city}</span>
                </div>
                <Separator className="mb-4" />
                {/* Owner mini card */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="size-11 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
                    {extras.owner.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-900">{extras.owner.name}</p>
                    <p className="text-[11px] text-neutral-500">Propriétaire · Depuis {extras.owner.joinedDate}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-4 text-center">
                  <div className="bg-neutral-50 rounded-lg p-2">
                    <p className="text-xs font-semibold text-neutral-800">{extras.owner.responseRate}%</p>
                    <p className="text-[10px] text-neutral-500">Taux de réponse</p>
                  </div>
                  <div className="bg-neutral-50 rounded-lg p-2">
                    <p className="text-xs font-semibold text-neutral-800">{extras.owner.responseTime}</p>
                    <p className="text-[10px] text-neutral-500">Temps de réponse</p>
                  </div>
                </div>
                <Button className="w-full bg-brand-500 hover:bg-brand-600 text-white h-11 text-sm font-semibold mb-2">
                  <Calendar className="size-4 mr-1.5" />
                  Planifier une visite
                </Button>
                <Button variant="outline" className="w-full text-brand-500 border-brand-200 hover:bg-brand-50 hover:text-brand-600 h-10 text-sm">
                  <Phone className="size-4 mr-1.5" />
                  Contacter le propriétaire
                </Button>
              </div>

              {/* Safety tips */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="size-4 text-amber-600" />
                  <p className="text-xs font-semibold text-amber-800">Conseils de sécurité</p>
                </div>
                <ul className="text-[11px] text-amber-700 space-y-1">
                  <li>· Ne payez jamais avant la visite</li>
                  <li>· Vérifiez les documents du propriétaire</li>
                  <li>· Signalez toute démarche suspecte</li>
                </ul>
              </div>
            </div>
          </motion.aside>
        </div>

        {/* Mobile CTA bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 p-3 z-30 lg:hidden">
          <div className="flex items-center gap-3 max-w-7xl mx-auto">
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-brand-500">
                {property.price.toLocaleString('fr-FR')} <span className="text-xs font-normal text-neutral-400">F CFA/mois</span>
              </p>
            </div>
            <Button
              className="bg-brand-500 hover:bg-brand-600 text-white h-10 text-sm font-semibold"
              onClick={() => setActiveTab('visit')}
            >
              <Calendar className="size-4 mr-1.5" />
              Visiter
            </Button>
            <Button
              variant="outline"
              className="text-brand-500 border-brand-200 hover:bg-brand-50 h-10 text-sm"
              onClick={() => setActiveTab('contact')}
            >
              <Phone className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Details Tab ─────────────────────────────────────────────────────────────

function DetailsTab({
  property,
  features,
  extras,
}: {
  property: PropertyDetail
  features: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number }[]
  extras: typeof propertyExtras[1]
}) {
  return (
    <div className="space-y-6 pb-24 lg:pb-6">
      {/* Features grid */}
      <div>
        <h3 className="text-sm font-semibold text-neutral-900 mb-3">Caractéristiques</h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {features.map((feat) => (
            <div key={feat.label} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white border border-neutral-100 shadow-sm">
              <feat.icon className="size-5 text-brand-500" />
              <span className="text-[10px] text-neutral-500 font-medium">{feat.label}</span>
              <span className="text-sm font-semibold text-neutral-800">{feat.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <h3 className="text-sm font-semibold text-neutral-900 mb-2">Description</h3>
        <p className="text-sm text-neutral-600 leading-relaxed">{extras.description}</p>
      </div>

      {/* Location info */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4">
        <h3 className="text-sm font-semibold text-neutral-900 mb-3">Localisation</h3>
        <div className="flex items-start gap-3">
          <MapPin className="size-5 text-brand-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-neutral-800">{property.location}</p>
            <p className="text-xs text-neutral-500">{property.commune}, {property.city}, Côte d&apos;Ivoire</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Contact Tab ─────────────────────────────────────────────────────────────

function ContactTab({
  property,
  extras,
}: {
  property: PropertyDetail
  extras: typeof propertyExtras[1]
}) {
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  return (
    <div className="space-y-6 pb-24 lg:pb-6">
      {/* Owner card */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <div className="size-14 rounded-full bg-brand-500 text-white flex items-center justify-center text-lg font-bold shrink-0">
            {extras.owner.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-neutral-900">{extras.owner.name}</p>
            <p className="text-xs text-neutral-500">Propriétaire · Membre depuis {extras.owner.joinedDate}</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-[11px] text-neutral-500">
                <CheckCircle2 className="size-3 text-emerald-500" />
                {extras.owner.responseRate}% taux de réponse
              </span>
              <span className="flex items-center gap-1 text-[11px] text-neutral-500">
                <Clock className="size-3" />
                Réponse en {extras.owner.responseTime}
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Button
            className="bg-brand-500 hover:bg-brand-600 text-white h-11 text-sm font-semibold"
          >
            <Phone className="size-4 mr-1.5" />
            Appeler
          </Button>
          <Button
            variant="outline"
            className="text-brand-500 border-brand-200 hover:bg-brand-50 hover:text-brand-600 h-11 text-sm"
          >
            <Mail className="size-4 mr-1.5" />
            Envoyer un email
          </Button>
        </div>
        <div className="text-xs text-neutral-400 text-center">
          {extras.owner.phone} · {extras.owner.email}
        </div>
      </div>

      {/* Message form */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
          <MessageSquare className="size-4 text-brand-500" />
          Envoyer un message
        </h3>
        {sent ? (
          <div className="text-center py-6">
            <CheckCircle2 className="size-10 text-emerald-500 mx-auto mb-3" />
            <p className="text-sm font-semibold text-neutral-900 mb-1">Message envoyé !</p>
            <p className="text-xs text-neutral-500">Le propriétaire vous répondra dans les plus brefs délais.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-neutral-600 mb-1">Objet</Label>
              <Input
                readOnly
                value={`Intérêt pour : ${property.title}`}
                className="h-9 bg-neutral-50 border-neutral-200 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs text-neutral-600 mb-1">Votre message</Label>
              <Textarea
                placeholder="Bonjour, je suis intéressé(e) par votre bien. Pourrions-nous convenir d'une visite ?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[120px] bg-white border-neutral-200 text-sm resize-none"
              />
            </div>
            <Button
              onClick={() => setSent(true)}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white h-10 text-sm font-semibold"
              disabled={!message.trim()}
            >
              <Send className="size-4 mr-1.5" />
              Envoyer le message
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Visit Tab ───────────────────────────────────────────────────────────────

function VisitTab({ property }: { property: PropertyDetail }) {
  const [visitType, setVisitType] = useState<'physique' | 'virtuelle'>('physique')
  const [visitDate, setVisitDate] = useState('')
  const [visitTime, setVisitTime] = useState('')
  const [visitNotes, setVisitNotes] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00',
    '14:00', '15:00', '16:00', '17:00',
  ]

  if (submitted) {
    return (
      <div className="pb-24 lg:pb-6">
        <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center shadow-sm">
          <div className="size-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="size-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-bold text-neutral-900 mb-2">Demande de visite envoyée !</h3>
          <p className="text-sm text-neutral-500 mb-4 max-w-md mx-auto">
            Votre demande de visite {visitType === 'physique' ? 'physique' : 'virtuelle'} pour le {visitDate} à {visitTime} a été transmise au propriétaire.
            Vous recevrez une confirmation sous 24h.
          </p>
          <div className="bg-neutral-50 rounded-lg p-4 max-w-sm mx-auto text-left space-y-2 mb-5">
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="size-4 text-neutral-400" />
              <span className="text-neutral-700">{property.title}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="size-4 text-neutral-400" />
              <span className="text-neutral-700">{visitDate} à {visitTime}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {visitType === 'physique' ? <MapPin className="size-4 text-neutral-400" /> : <Video className="size-4 text-neutral-400" />}
              <span className="text-neutral-700">Visite {visitType === 'physique' ? 'physique' : 'virtuelle'}</span>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => { setSubmitted(false); setVisitDate(''); setVisitTime(''); setVisitNotes('') }}
            className="text-brand-500 border-brand-200 hover:bg-brand-50"
          >
            Planifier une autre visite
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-6">
      {/* Visit type selection */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
          <Calendar className="size-4 text-brand-500" />
          Type de visite
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setVisitType('physique')}
            className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              visitType === 'physique'
                ? 'border-brand-500 bg-brand-50'
                : 'border-neutral-200 bg-white hover:border-neutral-300'
            }`}
          >
            <div className={`size-10 rounded-full flex items-center justify-center ${
              visitType === 'physique' ? 'bg-brand-500' : 'bg-neutral-100'
            }`}>
              <MapPin className={`size-5 ${visitType === 'physique' ? 'text-white' : 'text-neutral-500'}`} />
            </div>
            <span className={`text-sm font-semibold ${visitType === 'physique' ? 'text-brand-600' : 'text-neutral-700'}`}>
              Visite physique
            </span>
            <span className="text-[11px] text-neutral-500 text-center">
              Déplacement sur place avec le propriétaire
            </span>
            {visitType === 'physique' && (
              <div className="absolute top-2 right-2">
                <CheckCircle2 className="size-5 text-brand-500" />
              </div>
            )}
          </button>
          <button
            onClick={() => setVisitType('virtuelle')}
            className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              visitType === 'virtuelle'
                ? 'border-brand-500 bg-brand-50'
                : 'border-neutral-200 bg-white hover:border-neutral-300'
            }`}
          >
            <div className={`size-10 rounded-full flex items-center justify-center ${
              visitType === 'virtuelle' ? 'bg-brand-500' : 'bg-neutral-100'
            }`}>
              <Video className={`size-5 ${visitType === 'virtuelle' ? 'text-white' : 'text-neutral-500'}`} />
            </div>
            <span className={`text-sm font-semibold ${visitType === 'virtuelle' ? 'text-brand-600' : 'text-neutral-700'}`}>
              Visite virtuelle
            </span>
            <span className="text-[11px] text-neutral-500 text-center">
              Visioconférence avec visite guidée en direct
            </span>
            {visitType === 'virtuelle' && (
              <div className="absolute top-2 right-2">
                <CheckCircle2 className="size-5 text-brand-500" />
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Date & Time */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-neutral-900 mb-4">Date et heure</h3>
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-neutral-600 mb-1.5">Date souhaitée</Label>
            <Input
              type="date"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              className="h-10 bg-white border-neutral-200 text-sm"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div>
            <Label className="text-xs text-neutral-600 mb-1.5">Créneau horaire</Label>
            <div className="grid grid-cols-4 gap-2">
              {timeSlots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => setVisitTime(slot)}
                  className={`py-2 rounded-lg text-xs font-medium transition-all ${
                    visitTime === slot
                      ? 'bg-brand-500 text-white shadow-sm'
                      : 'bg-neutral-50 text-neutral-600 border border-neutral-200 hover:border-brand-200 hover:text-brand-500'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-neutral-900 mb-3">Notes (optionnel)</h3>
        <Textarea
          placeholder="Précisez vos disponibilités, questions spécifiques au propriétaire..."
          value={visitNotes}
          onChange={(e) => setVisitNotes(e.target.value)}
          className="min-h-[80px] bg-white border-neutral-200 text-sm resize-none"
        />
      </div>

      {/* Submit */}
      <Button
        onClick={() => setSubmitted(true)}
        className="w-full bg-brand-500 hover:bg-brand-600 text-white h-12 text-sm font-semibold"
        disabled={!visitDate || !visitTime}
      >
        <Calendar className="size-4 mr-1.5" />
        Confirmer la demande de visite {visitType === 'physique' ? 'physique' : 'virtuelle'}
      </Button>

      {visitType === 'virtuelle' && (
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Video className="size-5 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-sky-800 mb-1">Comment fonctionne la visite virtuelle ?</p>
              <p className="text-[11px] text-sky-700 leading-relaxed">
                Le propriétaire vous enverra un lien de visioconférence (Google Meet ou Zoom). Lors du rendez-vous, il vous guidera à travers le bien en direct et répondra à vos questions en temps réel.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Reviews Tab ─────────────────────────────────────────────────────────────

function ReviewsTab({ avgRating }: { avgRating: string }) {
  return (
    <div className="space-y-6 pb-24 lg:pb-6">
      {/* Rating summary */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-4xl font-bold text-neutral-900">{avgRating}</p>
            <div className="flex items-center gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`size-4 ${s <= Math.round(Number(avgRating)) ? 'fill-amber-400 text-amber-400' : 'text-neutral-200'}`}
                />
              ))}
            </div>
            <p className="text-xs text-neutral-500 mt-1">{mockReviews.length} avis</p>
          </div>
          <div className="flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = mockReviews.filter((r) => r.rating === stars).length
              const pct = mockReviews.length > 0 ? (count / mockReviews.length) * 100 : 0
              return (
                <div key={stars} className="flex items-center gap-2">
                  <span className="text-xs text-neutral-600 w-3 text-right">{stars}</span>
                  <Star className="size-3 fill-amber-400 text-amber-400" />
                  <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[11px] text-neutral-500 w-6 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Review list */}
      <div className="space-y-3">
        {mockReviews.map((review) => (
          <div key={review.id} className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="size-9 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-bold text-neutral-600 shrink-0">
                {review.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-neutral-900">{review.name}</p>
                    {review.verified && (
                      <Badge className="border-0 text-[9px] font-medium px-1.5 py-0 bg-emerald-50 text-emerald-700">
                        <BadgeCheck className="size-2.5 mr-0.5" />
                        Vérifié
                      </Badge>
                    )}
                  </div>
                  <span className="text-[11px] text-neutral-400">{review.date}</span>
                </div>
                <div className="flex items-center gap-0.5 mb-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`size-3 ${s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-200'}`}
                    />
                  ))}
                </div>
                <p className="text-sm text-neutral-600 leading-relaxed">{review.comment}</p>
                <div className="flex items-center gap-3 mt-2">
                  <button className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-brand-500 transition-colors">
                    <ThumbsUp className="size-3" />
                    Utile
                  </button>
                  <button className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-brand-500 transition-colors">
                    <MessageSquare className="size-3" />
                    Répondre
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Write review CTA */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm text-center">
        <User className="size-8 text-neutral-300 mx-auto mb-2" />
        <p className="text-sm font-semibold text-neutral-900 mb-1">Vous avez visité ce bien ?</p>
        <p className="text-xs text-neutral-500 mb-3">Partagez votre expérience pour aider les autres locataires</p>
        <Button variant="outline" className="text-brand-500 border-brand-200 hover:bg-brand-50 hover:text-brand-600 text-sm">
          <Star className="size-4 mr-1.5" />
          Laisser un avis
        </Button>
      </div>
    </div>
  )
}

// ── Helper to get property by ID ────────────────────────────────────────────

function getPropertyById(id: number): PropertyDetail | null {
  const allProperties: PropertyDetail[] = [
    { id: 1, title: 'Appartement F3 moderne - Cocody', price: 750000, location: 'Cocody Riviera 2, Abidjan', city: 'Abidjan', commune: 'Cocody', bedrooms: 3, area: 85, image: '/images/apt-cocody.png', type: 'Appartement', meuble: true, status: 'disponible', isVerified: true, views: 287, lat: 5.3580, lng: -3.9750 },
    { id: 2, title: 'Studio Meublé - Plateau', price: 75000, location: 'Plateau Dokui, Abidjan', city: 'Abidjan', commune: 'Plateau', bedrooms: null, area: 35, image: '/images/studio-plateau.png', type: 'Studio', meuble: true, status: 'disponible', isVerified: true, views: 142, lat: 5.3190, lng: -4.0150 },
    { id: 3, title: 'Villa 4 Chambres - Marcory', price: 350000, location: 'Marcory Résidentiel, Abidjan', city: 'Abidjan', commune: 'Marcory', bedrooms: 4, area: 200, image: '/images/villa-marcory.png', type: 'Villa', meuble: false, status: 'disponible', isVerified: true, views: 431, lat: 5.2950, lng: -3.9850 },
    { id: 4, title: 'Appartement F2 - Yopougon', price: 90000, location: 'Yopougon Sipimap, Abidjan', city: 'Abidjan', commune: 'Yopougon', bedrooms: 2, area: 55, image: '/images/apt-yopougon.png', type: 'Appartement', meuble: false, status: 'loue', isVerified: true, views: 95, lat: 5.3400, lng: -4.0900 },
    { id: 5, title: 'Duplex Meublé - Abobo', price: 180000, location: 'Abobo Avocatier, Abidjan', city: 'Abidjan', commune: 'Abobo', bedrooms: 3, area: 120, image: '/images/duplex-abobo.png', type: 'Duplex', meuble: true, status: 'disponible', isVerified: false, views: 203, lat: 5.3800, lng: -4.0400 },
    { id: 6, title: 'Penthouse Riviera Palmeraie', price: 500000, location: 'Riviera Palmeraie, Abidjan', city: 'Abidjan', commune: 'Riviera', bedrooms: 4, area: 180, image: '/images/penthouse-riviera.png', type: 'Penthouse', meuble: true, status: 'disponible', isVerified: true, views: 567, lat: 5.3700, lng: -3.9500 },
    { id: 7, title: 'Appartement F4 - Deux Plateaux', price: 220000, location: 'Deux Plateaux, Cocody', city: 'Abidjan', commune: 'Cocody', bedrooms: 4, area: 110, image: '/images/apt-cocody.png', type: 'Appartement', meuble: false, status: 'disponible', isVerified: true, views: 178, lat: 5.3450, lng: -3.9600 },
    { id: 8, title: 'Studio Climatisé - Treichville', price: 65000, location: 'Treichville, Abidjan', city: 'Abidjan', commune: 'Treichville', bedrooms: null, area: 28, image: '/images/studio-plateau.png', type: 'Studio', meuble: true, status: 'disponible', isVerified: false, views: 89, lat: 5.2980, lng: -4.0300 },
  ]
  return allProperties.find((p) => p.id === id) ?? null
}
