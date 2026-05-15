'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
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
  Clock,
  CheckCircle2,
  Send,
  AlertCircle,
  Wifi,
  Zap,
  Droplets,
  Flame,
  Refrigerator,
  WashingMachine,
  Tv,
  Lamp,
  TreePalm,
  Dog,
  Baby,
  FileText,
  Wallet,
  Clock3,
  CreditCard,
  Scale,
  LogIn,
  X,
  Navigation,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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

type TabKey = 'details' | 'commodites' | 'modalites' | 'contact' | 'visit' | 'reviews'

// ── Mock data ───────────────────────────────────────────────────────────────

const propertyExtras: Record<number, {
  description: string
  bathrooms: number
  parking: boolean
  climate: boolean
  guardian: boolean
  images: string[]
  owner: { name: string; phone: string; email: string; avatar: string; joinedDate: string; responseRate: number; responseTime: string }
  amenities: string[]
  modalites: {
    caution: number
    dureeBail: string
    chargesIncluses: string[]
    chargesNonIncluses: string[]
    modePaiement: string[]
    conditions: string[]
    etatLieux: string
    preavis: string
  }
}> = {
  1: {
    description: 'Superbe appartement F3 entièrement rénové dans la résidence sécurisée de Cocody Riviera 2. Salon spacieux avec baie vitrée donnant sur un balcon fleuri, cuisine équipée moderne (hotte, four, plaques induction), 2 chambres avec placards intégrés + suite parentale avec salle de bain privative. Climatisation réversible dans toutes les pièces. Gardien 24h/24, piscine communautaire.',
    bathrooms: 2, parking: true, climate: true, guardian: true,
    images: ['/images/apt-cocody.png', '/images/apt-cocody.png', '/images/apt-cocody.png'],
    owner: { name: 'Mme Koné Aminata', phone: '+225 07 08 09 10 11', email: 'a.kone@email.ci', avatar: 'AK', joinedDate: 'Mars 2023', responseRate: 95, responseTime: '2h' },
    amenities: ['wifi', 'climatisation', 'parking', 'gardien', 'cuisine_equipee', 'machine_laver', 'refrigerateur', 'television', 'balcon', 'piscine', 'ascenseur', 'placards'],
    modalites: {
      caution: 1500000,
      dureeBail: '12 mois renouvelable',
      chargesIncluses: ['Eau', 'Gardiennage', 'Entretien parties communes', 'Piscine'],
      chargesNonIncluses: ['Électricité', 'Internet'],
      modePaiement: ['Virement bancaire', 'Mobile Money'],
      conditions: ['Garant obligatoire', 'Justificatif de revenus (3x le loyer)', 'Attestation de l\'employeur', 'Pièce d\'identité valide'],
      etatLieux: 'État des lieux réalisé en présence des deux parties à l\'entrée et à la sortie',
      preavis: '3 mois',
    },
  },
  2: {
    description: 'Studio meublé et climatisé au cœur du Plateau, idéal pour jeune cadre. Cuisine américaine équipée, salle de bain moderne avec douche italienne. Building sécurisé avec ascenseur, parking souterrain. Proche des administrations et commerces.',
    bathrooms: 1, parking: false, climate: true, guardian: true,
    images: ['/images/studio-plateau.png', '/images/studio-plateau.png', '/images/studio-plateau.png'],
    owner: { name: 'M. Diallo Mamadou', phone: '+225 05 12 34 56 78', email: 'm.diallo@email.ci', avatar: 'DM', joinedDate: 'Jan 2024', responseRate: 88, responseTime: '4h' },
    amenities: ['wifi', 'climatisation', 'gardien', 'cuisine_equipee', 'refrigerateur', 'television', 'ascenseur', 'douche_italienne'],
    modalites: {
      caution: 150000,
      dureeBail: '6 mois renouvelable',
      chargesIncluses: ['Gardiennage', 'Entretien'],
      chargesNonIncluses: ['Eau', 'Électricité', 'Internet'],
      modePaiement: ['Virement bancaire', 'Wave', 'Orange Money'],
      conditions: ['Justificatif de revenus', 'Pièce d\'identité valide'],
      etatLieux: 'État des lieux à l\'entrée et à la sortie',
      preavis: '1 mois',
    },
  },
  3: {
    description: 'Magnifique villa 4 chambres dans le quartier résidentiel de Marcory. Grand séjour double, cuisine indépendante aménagée, terrasse couverte donnant sur un jardin tropical de 500m². Garage double, dépendance studio. Terrain clos avec portail motorisé.',
    bathrooms: 3, parking: true, climate: true, guardian: true,
    images: ['/images/villa-marcory.png', '/images/villa-marcory.png', '/images/villa-marcory.png'],
    owner: { name: 'Dr. Brou Yves', phone: '+225 01 23 45 67 89', email: 'y.brou@email.ci', avatar: 'BY', joinedDate: 'Sep 2022', responseRate: 98, responseTime: '1h' },
    amenities: ['wifi', 'climatisation', 'parking', 'gardien', 'cuisine_equipee', 'machine_laver', 'refrigerateur', 'television', 'jardin', 'terrasse', 'garage', 'portail_motorise'],
    modalites: {
      caution: 1050000,
      dureeBail: '24 mois renouvelable',
      chargesIncluses: ['Gardiennage', 'Entretien jardin'],
      chargesNonIncluses: ['Eau', 'Électricité', 'Internet', 'Entretien piscine'],
      modePaiement: ['Virement bancaire', 'Chèque'],
      conditions: ['Garant obligatoire', 'Justificatif de revenus (4x le loyer)', 'Attestation de l\'employeur', 'Pièce d\'identité valide', 'Photo d\'identité'],
      etatLieux: 'État des lieux contradictoire détaillé à l\'entrée et à la sortie',
      preavis: '3 mois',
    },
  },
  4: {
    description: 'Appartement F2 fonctionnel à Yopougon Sipimap, proche des transports et commodités. Séjour lumineux, 2 chambres avec placards, cuisine aménagée. Résidence calme et familiale avec aire de jeux pour enfants.',
    bathrooms: 1, parking: false, climate: false, guardian: false,
    images: ['/images/apt-yopougon.png', '/images/apt-yopougon.png', '/images/apt-yopougon.png'],
    owner: { name: 'Mme Touré Fatou', phone: '+225 07 98 76 54 32', email: 'f.toure@email.ci', avatar: 'TF', joinedDate: 'Juin 2024', responseRate: 75, responseTime: '8h' },
    amenities: ['cuisine_equipee', 'placards', 'aire_jeux'],
    modalites: {
      caution: 180000,
      dureeBail: '12 mois renouvelable',
      chargesIncluses: ['Entretien parties communes'],
      chargesNonIncluses: ['Eau', 'Électricité', 'Internet'],
      modePaiement: ['Virement bancaire', 'Mobile Money'],
      conditions: ['Justificatif de revenus', 'Pièce d\'identité valide'],
      etatLieux: 'État des lieux à l\'entrée et à la sortie',
      preavis: '2 mois',
    },
  },
  5: {
    description: 'Duplex meublé moderne à Abobo Avocatier. Réparti sur 2 niveaux : en bas, séjour ouvert sur cuisine américaine et WC visiteurs ; en haut, 3 chambres et 2 salles de bain. Terrasse rooftop avec vue panoramique.',
    bathrooms: 2, parking: true, climate: true, guardian: false,
    images: ['/images/duplex-abobo.png', '/images/duplex-abobo.png', '/images/duplex-abobo.png'],
    owner: { name: 'M. Konan Patrick', phone: '+225 05 11 22 33 44', email: 'p.konan@email.ci', avatar: 'KP', joinedDate: 'Nov 2023', responseRate: 82, responseTime: '5h' },
    amenities: ['wifi', 'climatisation', 'parking', 'cuisine_equipee', 'machine_laver', 'refrigerateur', 'television', 'terrasse', 'placards'],
    modalites: {
      caution: 540000,
      dureeBail: '12 mois renouvelable',
      chargesIncluses: ['Entretien'],
      chargesNonIncluses: ['Eau', 'Électricité', 'Internet'],
      modePaiement: ['Virement bancaire', 'Wave', 'Orange Money'],
      conditions: ['Garant obligatoire', 'Justificatif de revenus (3x le loyer)', 'Pièce d\'identité valide'],
      etatLieux: 'État des lieux à l\'entrée et à la sortie',
      preavis: '2 mois',
    },
  },
  6: {
    description: "Penthouse d'exception à Riviera Palmeraie avec vue lagunaire. Grand salon cathédrale, cuisine haut de gamme, suite master avec dressing et salle de bain attenante, 3 chambres supplémentaires. Piscine privée sur terrasse panoramique. Prestations luxe.",
    bathrooms: 3, parking: true, climate: true, guardian: true,
    images: ['/images/penthouse-riviera.png', '/images/penthouse-riviera.png', '/images/penthouse-riviera.png'],
    owner: { name: "Mme N'Guessan Aya", phone: '+225 01 55 66 77 88', email: 'a.nguessan@email.ci', avatar: 'AN', joinedDate: 'Fév 2022', responseRate: 100, responseTime: '30min' },
    amenities: ['wifi', 'climatisation', 'parking', 'gardien', 'cuisine_equipee', 'machine_laver', 'refrigerateur', 'television', 'balcon', 'piscine', 'terrasse', 'placards', 'dressing', 'ascenseur', 'jardin'],
    modalites: {
      caution: 3000000,
      dureeBail: '24 mois renouvelable',
      chargesIncluses: ['Eau', 'Gardiennage', 'Entretien parties communes', 'Piscine', 'Ascenseur'],
      chargesNonIncluses: ['Électricité', 'Internet', 'Entretien piscine privé'],
      modePaiement: ['Virement bancaire'],
      conditions: ['Garant obligatoire', 'Justificatif de revenus (5x le loyer)', 'Attestation de l\'employeur', 'Pièce d\'identité valide', 'Références bancaires', 'Photo d\'identité'],
      etatLieux: 'État des lieux contradictoire détaillé avec photos à l\'entrée et à la sortie',
      preavis: '3 mois',
    },
  },
  7: {
    description: 'Appartement F4 lumineux à Deux Plateaux, quartier calme et résidentiel. Grand séjour, cuisine séparée, 4 chambres dont une suite parentale. Balcon filant. Charges incluses dans le loyer (eau, gardiennage, entretien parties communes).',
    bathrooms: 2, parking: true, climate: true, guardian: true,
    images: ['/images/apt-cocody.png', '/images/apt-cocody.png', '/images/apt-cocody.png'],
    owner: { name: 'M. Yao Serge', phone: '+225 07 44 55 66 77', email: 's.yao@email.ci', avatar: 'YS', joinedDate: 'Juil 2023', responseRate: 90, responseTime: '3h' },
    amenities: ['wifi', 'climatisation', 'parking', 'gardien', 'cuisine_equipee', 'machine_laver', 'refrigerateur', 'television', 'balcon', 'placards'],
    modalites: {
      caution: 660000,
      dureeBail: '12 mois renouvelable',
      chargesIncluses: ['Eau', 'Gardiennage', 'Entretien parties communes'],
      chargesNonIncluses: ['Électricité', 'Internet'],
      modePaiement: ['Virement bancaire', 'Mobile Money'],
      conditions: ['Garant obligatoire', 'Justificatif de revenus (3x le loyer)', 'Attestation de l\'employeur', 'Pièce d\'identité valide'],
      etatLieux: 'État des lieux contradictoire à l\'entrée et à la sortie',
      preavis: '3 mois',
    },
  },
  8: {
    description: 'Studio climatisé à Treichville, idéalement situé près du marché et de la gare. Pièce principale avec coin nuit séparé par un claustra, kitchenette, salle de douche moderne. Immeuble rénové récemment.',
    bathrooms: 1, parking: false, climate: true, guardian: false,
    images: ['/images/studio-plateau.png', '/images/studio-plateau.png', '/images/studio-plateau.png'],
    owner: { name: 'M. Coulibaly Ibrahim', phone: '+225 05 88 99 00 11', email: 'i.coulibaly@email.ci', avatar: 'CI', joinedDate: 'Avr 2024', responseRate: 70, responseTime: '12h' },
    amenities: ['climatisation', 'cuisine_equipee', 'refrigerateur'],
    modalites: {
      caution: 130000,
      dureeBail: '6 mois renouvelable',
      chargesIncluses: ['Entretien'],
      chargesNonIncluses: ['Eau', 'Électricité', 'Internet'],
      modePaiement: ['Mobile Money', 'Espèces'],
      conditions: ['Justificatif de revenus', 'Pièce d\'identité valide'],
      etatLieux: 'État des lieux à l\'entrée et à la sortie',
      preavis: '1 mois',
    },
  },
}

// Mock reviews
const mockReviews = [
  { id: 1, name: 'Kouamé Jean', avatar: 'KJ', rating: 5, date: '15 Fév 2025', comment: 'Excellent appartement, très bien entretenu. Le propriétaire est réactif et professionnel. Je recommande vivement !', verified: true },
  { id: 2, name: 'Bamba Awa', avatar: 'BA', rating: 4, date: '28 Jan 2025', comment: 'Bel appartement dans un quartier calme. Petit bémol sur la pression d\'eau en période de pointe, mais dans l\'ensemble très satisfait.', verified: true },
  { id: 3, name: 'Ouattara Moussa', avatar: 'OM', rating: 5, date: '10 Déc 2024', comment: 'Parfait ! La description correspond parfaitement au logement. Visite virtuelle très pratique avant le déplacement.', verified: false },
  { id: 4, name: 'Diabaté Mariam', avatar: 'DM', rating: 3, date: '5 Nov 2024', comment: 'Logement correct mais quelques travaux à prévoir. Le rapport qualité-prix reste acceptable pour le quartier.', verified: true },
]

// ── Amenity config ──────────────────────────────────────────────────────────

const amenityConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  wifi: { label: 'Wi-Fi', icon: Wifi },
  climatisation: { label: 'Climatisation', icon: Wind },
  parking: { label: 'Parking', icon: Car },
  gardien: { label: 'Gardien / Sécurité', icon: Shield },
  cuisine_equipee: { label: 'Cuisine équipée', icon: Refrigerator },
  machine_laver: { label: 'Machine à laver', icon: WashingMachine },
  refrigerateur: { label: 'Réfrigérateur', icon: Refrigerator },
  television: { label: 'Télévision', icon: Tv },
  balcon: { label: 'Balcon', icon: Lamp },
  piscine: { label: 'Piscine', icon: Droplets },
  ascenseur: { label: 'Ascenseur', icon: Building2 },
  placards: { label: 'Placards intégrés', icon: FileText },
  jardin: { label: 'Jardin', icon: TreePalm },
  terrasse: { label: 'Terrasse', icon: Lamp },
  garage: { label: 'Garage', icon: Car },
  portail_motorise: { label: 'Portail motorisé', icon: Zap },
  dressing: { label: 'Dressing', icon: FileText },
  douche_italienne: { label: 'Douche italienne', icon: ShowerHead },
  aire_jeux: { label: 'Aire de jeux', icon: Baby },
  animaux: { label: 'Animaux acceptés', icon: Dog },
}

// ── Auth Gate Dialog ────────────────────────────────────────────────────────

function AuthGateDialog({
  open,
  onOpenChange,
  action,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  action: string
}) {
  const { setView } = useAuthStore()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="size-14 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-3">
            <LogIn className="size-7 text-brand-500" />
          </div>
          <DialogTitle className="text-center text-lg">Connexion requise</DialogTitle>
          <DialogDescription className="text-center text-sm text-neutral-500">
            Vous devez être connecté pour {action}. Créez un compte gratuitement ou connectez-vous.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          <Button
            className="w-full bg-brand-500 hover:bg-brand-600 text-white h-11 text-sm font-semibold"
            onClick={() => { onOpenChange(false); setView('login') }}
          >
            Se connecter
          </Button>
          <Button
            variant="outline"
            className="w-full text-brand-500 border-brand-200 hover:bg-brand-50 hover:text-brand-600 h-10 text-sm"
            onClick={() => { onOpenChange(false); setView('register') }}
          >
            Créer un compte
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Mini Map Component ──────────────────────────────────────────────────────

function MiniMap({ lat, lng, location }: { lat: number; lng: number; location: string }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    import('leaflet').then((L) => {
      if (!mapRef.current || mapInstanceRef.current) return

      const map = L.map(mapRef.current, {
        center: [lat, lng],
        zoom: 15,
        zoomControl: false,
        scrollWheelZoom: false,
        dragging: true,
        doubleClickZoom: false,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map)

      // Custom marker
      const icon = L.divIcon({
        className: 'custom-detail-marker',
        html: `
          <div style="
            background: #FF6C2F;
            color: white;
            font-size: 11px;
            font-weight: 700;
            padding: 4px 10px;
            border-radius: 20px;
            white-space: nowrap;
            border: 2px solid white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.25);
            font-family: Inter, sans-serif;
          ">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px;margin-right:3px;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            ${location}
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [40, 30],
      })

      L.marker([lat, lng], { icon }).addTo(map)

      mapInstanceRef.current = map

      setTimeout(() => map.invalidateSize(), 200)
    })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [lat, lng, location])

  return (
    <div className="relative w-full h-48 sm:h-64 rounded-xl overflow-hidden border border-neutral-200">
      <div ref={mapRef} className="w-full h-full" style={{ minHeight: '192px' }} />
      <style jsx global>{`
        .custom-detail-marker { background: none !important; border: none !important; }
        .leaflet-control-attribution { display: none !important; }
      `}</style>
      {/* Get directions button */}
      <a
        href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-3 right-3 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md border border-neutral-200 flex items-center gap-1.5 text-xs font-medium text-neutral-700 hover:bg-white hover:text-brand-500 transition-colors"
      >
        <Navigation className="size-3.5" />
        Itinéraire
      </a>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

export function PropertyDetailView({ propertyId }: { propertyId: number }) {
  const { setView, isAuthenticated, user, previousView } = useAuthStore()
  const [isFavorite, setIsFavorite] = useState(false)
  const [currentImage, setCurrentImage] = useState(0)
  const [activeTab, setActiveTab] = useState<TabKey>('details')
  const [authGateOpen, setAuthGateOpen] = useState(false)
  const [authGateAction, setAuthGateAction] = useState('')
  const [applyDialogOpen, setApplyDialogOpen] = useState(false)
  const [applySubmitted, setApplySubmitted] = useState(false)

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

  // Auth-gated action helper
  const requireAuth = (action: string, callback: () => void) => {
    if (!isAuthenticated) {
      setAuthGateAction(action)
      setAuthGateOpen(true)
      return
    }
    callback()
  }

  // Favorite toggle with auth gate
  const toggleFavorite = () => {
    requireAuth('ajouter aux favoris', () => setIsFavorite(!isFavorite))
  }

  // Apply for property
  const handleApply = () => {
    requireAuth('soumettre votre candidature', () => setApplyDialogOpen(true))
  }

  const tabs: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'details', label: 'Détails', icon: Building2 },
    { key: 'commodites', label: 'Commodités', icon: Lamp },
    { key: 'modalites', label: 'Modalités', icon: FileText },
    { key: 'contact', label: 'Contacter', icon: Phone },
    { key: 'visit', label: 'Visiter', icon: Calendar },
    { key: 'reviews', label: `Avis (${mockReviews.length})`, icon: Star },
  ]

  return (
    <section className="bg-neutral-50 min-h-screen">
      {/* Auth Gate Dialog */}
      <AuthGateDialog open={authGateOpen} onOpenChange={setAuthGateOpen} action={authGateAction} />

      {/* Apply Dialog */}
      <ApplyDialog
        open={applyDialogOpen}
        onOpenChange={setApplyDialogOpen}
        property={property}
        extras={extras}
        submitted={applySubmitted}
        setSubmitted={setApplySubmitted}
      />

      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-30 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <button
            onClick={() => setView(previousView === 'property-detail' ? 'home' : previousView)}
            className="flex items-center gap-2 text-sm text-neutral-600 hover:text-brand-500 transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Retour</span>
            <span className="sm:hidden">Retour</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFavorite}
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
              className="border-b border-neutral-200 mb-6 -mx-4 sm:mx-0"
            >
              <div className="flex gap-0 -mb-px overflow-x-auto scrollbar-hide px-4 sm:px-0">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-1.5 px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.key
                        ? 'border-brand-500 text-brand-500'
                        : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                    }`}
                  >
                    <tab.icon className="size-3.5 sm:size-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                {activeTab === 'details' && <DetailsTab property={property} features={features} extras={extras} />}
                {activeTab === 'commodites' && <CommoditesTab amenities={extras.amenities} />}
                {activeTab === 'modalites' && <ModalitesTab extras={extras} price={property.price} />}
                {activeTab === 'contact' && <ContactTab property={property} extras={extras} />}
                {activeTab === 'visit' && <VisitTab property={property} requireAuth={requireAuth} />}
                {activeTab === 'reviews' && <ReviewsTab avgRating={avgRating} />}
              </motion.div>
            </AnimatePresence>
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
                <Button
                  className="w-full bg-brand-500 hover:bg-brand-600 text-white h-11 text-sm font-semibold mb-2"
                  onClick={() => requireAuth('planifier une visite', () => setActiveTab('visit'))}
                >
                  <Calendar className="size-4 mr-1.5" />
                  Planifier une visite
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-brand-500 border-brand-200 hover:bg-brand-50 hover:text-brand-600 h-10 text-sm mb-2"
                  onClick={() => setActiveTab('contact')}
                >
                  <Phone className="size-4 mr-1.5" />
                  Contacter le propriétaire
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 h-10 text-sm font-semibold"
                  onClick={handleApply}
                >
                  <FileText className="size-4 mr-1.5" />
                  Soumettre ma candidature
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
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] z-30 lg:hidden">
          <div className="flex items-center gap-2 sm:gap-3 max-w-7xl mx-auto">
            <div className="flex-1 min-w-0">
              <p className="text-base sm:text-lg font-bold text-brand-500">
                {property.price.toLocaleString('fr-FR')} <span className="text-[10px] sm:text-xs font-normal text-neutral-400">F CFA/mois</span>
              </p>
            </div>
            <Button
              className="bg-brand-500 hover:bg-brand-600 text-white h-11 min-w-[5.5rem] text-sm font-semibold shadow-sm"
              onClick={() => requireAuth('planifier une visite', () => setActiveTab('visit'))}
            >
              <Calendar className="size-4 mr-1.5" />
              Visiter
            </Button>
            <Button
              variant="outline"
              className="text-brand-500 border-brand-200 hover:bg-brand-50 h-11 px-3 text-sm"
              onClick={() => setActiveTab('contact')}
            >
              <Phone className="size-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Appeler</span>
            </Button>
            <Button
              variant="outline"
              className="border-emerald-200 text-emerald-600 hover:bg-emerald-50 h-11 px-3 text-sm"
              onClick={handleApply}
            >
              <FileText className="size-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Candidature</span>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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

      {/* Localisation with map */}
      <div>
        <h3 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
          <MapPin className="size-4 text-brand-500" />
          Localisation
        </h3>
        <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-4">
          <div className="flex items-start gap-3">
            <MapPin className="size-5 text-brand-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-neutral-800">{property.location}</p>
              <p className="text-xs text-neutral-500">{property.commune}, {property.city}, Côte d&apos;Ivoire</p>
            </div>
          </div>
          {/* Mini Map */}
          <MiniMap lat={property.lat} lng={property.lng} location={property.commune} />
        </div>
      </div>
    </div>
  )
}

// ── Commodités Tab ──────────────────────────────────────────────────────────

function CommoditesTab({ amenities }: { amenities: string[] }) {
  const availableAmenities = amenities
    .map((key) => ({ key, ...amenityConfig[key] }))
    .filter((a) => a.label)

  const allCategories = [
    {
      title: 'Confort & Climatisation',
      keys: ['climatisation', 'chauffe_eau', 'ventilateur'],
    },
    {
      title: 'Cuisine & Électroménager',
      keys: ['cuisine_equipee', 'refrigerateur', 'machine_laver', 'lave_vaisselle', 'micro_ondes', 'four'],
    },
    {
      title: 'Technologie & Connectivité',
      keys: ['wifi', 'television'],
    },
    {
      title: 'Espaces extérieurs',
      keys: ['balcon', 'terrasse', 'jardin', 'piscine'],
    },
    {
      title: 'Stationnement & Sécurité',
      keys: ['parking', 'garage', 'gardien', 'portail_motorise', 'ascenseur'],
    },
    {
      title: 'Rangements & Aménagements',
      keys: ['placards', 'dressing', 'douche_italienne'],
    },
    {
      title: 'Divers',
      keys: ['aire_jeux', 'animaux'],
    },
  ]

  return (
    <div className="space-y-6 pb-24 lg:pb-6">
      {/* Summary */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-neutral-900 mb-1 flex items-center gap-2">
          <Lamp className="size-4 text-brand-500" />
          Commodités & Équipements
        </h3>
        <p className="text-xs text-neutral-500">
          {availableAmenities.length} commodité{availableAmenities.length !== 1 ? 's' : ''} disponible{availableAmenities.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Categories */}
      {allCategories.map((category) => {
        const categoryAmenities = category.keys
          .filter((key) => amenities.includes(key))
          .map((key) => ({ key, ...amenityConfig[key] }))
          .filter((a) => a.label)

        if (categoryAmenities.length === 0) return null

        return (
          <div key={category.title} className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm">
            <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">{category.title}</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categoryAmenities.map((amenity) => (
                <div key={amenity.key} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100">
                  <div className="size-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <amenity.icon className="size-4 text-emerald-600" />
                  </div>
                  <span className="text-xs font-medium text-neutral-700">{amenity.label}</span>
                  <CheckCircle2 className="size-3.5 text-emerald-500 ml-auto shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Not available amenities hint */}
      <div className="text-center py-2">
        <p className="text-[11px] text-neutral-400">
          Les commodités listées sont celles déclarées par le propriétaire. Vérifiez lors de la visite.
        </p>
      </div>
    </div>
  )
}

// ── Modalités Tab ───────────────────────────────────────────────────────────

function ModalitesTab({
  extras,
  price,
}: {
  extras: typeof propertyExtras[1]
  price: number
}) {
  const m = extras.modalites

  return (
    <div className="space-y-6 pb-24 lg:pb-6">
      {/* Financial summary */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4 sm:p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
          <Wallet className="size-4 text-brand-500" />
          Conditions financières
        </h3>
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 border-b border-neutral-100 gap-1">
            <span className="text-sm text-neutral-600">Loyer mensuel</span>
            <span className="text-sm font-bold text-brand-500">{price.toLocaleString('fr-FR')} F CFA</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 border-b border-neutral-100 gap-1">
            <span className="text-sm text-neutral-600">Caution / Dépôt de garantie</span>
            <span className="text-sm font-bold text-neutral-800">{m.caution.toLocaleString('fr-FR')} F CFA</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 border-b border-neutral-100 gap-2">
            <div className="flex items-center gap-2">
              <CreditCard className="size-4 text-neutral-400" />
              <span className="text-sm text-neutral-600">Mode de paiement</span>
            </div>
            <div className="flex flex-wrap gap-1 sm:justify-end">
              {m.modePaiement.map((mode) => (
                <Badge key={mode} variant="outline" className="text-[10px] px-1.5 py-0 border-neutral-200 text-neutral-600">
                  {mode}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Lease duration */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
          <Clock3 className="size-4 text-brand-500" />
          Durée du bail
        </h3>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-brand-50/50 border border-brand-100">
          <Calendar className="size-5 text-brand-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-neutral-800">{m.dureeBail}</p>
            <p className="text-xs text-neutral-500">Préavis de départ : {m.preavis}</p>
          </div>
        </div>
      </div>

      {/* Charges */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
          <Scale className="size-4 text-brand-500" />
          Charges
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-emerald-600 mb-2 flex items-center gap-1">
              <CheckCircle2 className="size-3" />
              Charges incluses
            </p>
            <ul className="space-y-1.5">
              {m.chargesIncluses.map((charge) => (
                <li key={charge} className="flex items-center gap-2 text-xs text-neutral-700">
                  <span className="size-1.5 rounded-full bg-emerald-400 shrink-0" />
                  {charge}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-red-500 mb-2 flex items-center gap-1">
              <X className="size-3" />
              Charges non incluses
            </p>
            <ul className="space-y-1.5">
              {m.chargesNonIncluses.map((charge) => (
                <li key={charge} className="flex items-center gap-2 text-xs text-neutral-700">
                  <span className="size-1.5 rounded-full bg-red-400 shrink-0" />
                  {charge}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Conditions */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
          <FileText className="size-4 text-brand-500" />
          Conditions d&apos;entrée
        </h3>
        <ul className="space-y-2">
          {m.conditions.map((condition, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-neutral-700">
              <span className="size-5 rounded-full bg-brand-50 text-brand-500 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                {i + 1}
              </span>
              {condition}
            </li>
          ))}
        </ul>
      </div>

      {/* État des lieux */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-neutral-900 mb-2 flex items-center gap-2">
          <Shield className="size-4 text-brand-500" />
          État des lieux
        </h3>
        <p className="text-sm text-neutral-600">{m.etatLieux}</p>
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
  const { isAuthenticated, setView } = useAuthStore()
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  const handleSendMessage = () => {
    if (!isAuthenticated) {
      setView('login')
      return
    }
    setSent(true)
  }

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
            className="bg-brand-500 hover:bg-brand-600 text-white h-11 text-xs sm:text-sm font-semibold"
            onClick={() => { if (!isAuthenticated) { setView('login'); return; } }}
          >
            <Phone className="size-4 mr-1.5" />
            Appeler
          </Button>
          <Button
            variant="outline"
            className="text-brand-500 border-brand-200 hover:bg-brand-50 hover:text-brand-600 h-11 text-xs sm:text-sm"
            onClick={() => { if (!isAuthenticated) { setView('login'); return; } }}
          >
            <Mail className="size-4 mr-1.5" />
            <span className="hidden sm:inline">Envoyer un email</span>
            <span className="sm:hidden">Email</span>
          </Button>
        </div>
        {!isAuthenticated && (
          <p className="text-[11px] text-neutral-400 text-center mb-2">
            Connectez-vous pour accéder aux coordonnées du propriétaire
          </p>
        )}
        {isAuthenticated && (
          <div className="text-xs text-neutral-400 text-center">
            {extras.owner.phone} · {extras.owner.email}
          </div>
        )}
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
              onClick={handleSendMessage}
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

function VisitTab({
  property,
  requireAuth,
}: {
  property: PropertyDetail
  requireAuth: (action: string, callback: () => void) => void
}) {
  const { isAuthenticated } = useAuthStore()
  const [visitType, setVisitType] = useState<'physique' | 'virtuelle'>('physique')
  const [visitDate, setVisitDate] = useState('')
  const [visitTime, setVisitTime] = useState('')
  const [visitNotes, setVisitNotes] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00',
    '14:00', '15:00', '16:00', '17:00',
  ]

  const handleSubmit = () => {
    requireAuth('planifier une visite', () => setSubmitted(true))
  }

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
      {/* Auth notice */}
      {!isAuthenticated && (
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 flex items-start gap-3">
          <LogIn className="size-5 text-brand-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-brand-700 mb-0.5">Connexion requise</p>
            <p className="text-[11px] text-brand-600">Vous devez être connecté pour planifier une visite. Remplissez le formulaire puis connectez-vous lors de la confirmation.</p>
          </div>
        </div>
      )}

      {/* Visit type selection */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
          <Calendar className="size-4 text-brand-500" />
          Type de visite
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
        onClick={handleSubmit}
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
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
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
          <div className="flex-1 w-full sm:w-auto space-y-1.5">
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
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Apply Dialog ────────────────────────────────────────────────────────────

function ApplyDialog({
  open,
  onOpenChange,
  property,
  extras,
  submitted,
  setSubmitted,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  property: PropertyDetail
  extras: typeof propertyExtras[1]
  submitted: boolean
  setSubmitted: (v: boolean) => void
}) {
  const [motivation, setMotivation] = useState('')
  const [income, setIncome] = useState('')
  const [employmentType, setEmploymentType] = useState('')

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center py-4">
            <div className="size-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="size-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 mb-2">Candidature soumise !</h3>
            <p className="text-sm text-neutral-500 mb-4">
              Votre candidature pour &laquo; {property.title} &raquo; a été transmise au propriétaire. Vous serez contacté sous 48h.
            </p>
            <Button
              className="bg-brand-500 hover:bg-brand-600 text-white"
              onClick={() => {
                setSubmitted(false)
                setMotivation('')
                setIncome('')
                setEmploymentType('')
                onOpenChange(false)
              }}
            >
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-5 text-brand-500" />
            Soumettre ma candidature
          </DialogTitle>
          <DialogDescription className="text-sm text-neutral-500">
            Postulez pour &laquo; {property.title} &raquo; — {property.price.toLocaleString('fr-FR')} F CFA/mois
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Property summary */}
          <div className="bg-neutral-50 rounded-lg p-3 flex items-center gap-3">
            <div className="size-12 rounded-lg overflow-hidden bg-neutral-200 shrink-0 relative">
              <Image src={property.image} alt={property.title} fill className="object-cover" sizes="48px" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-neutral-900 line-clamp-1">{property.title}</p>
              <p className="text-xs text-neutral-500 flex items-center gap-1">
                <MapPin className="size-3" />
                {property.location}
              </p>
            </div>
          </div>

          {/* Employment type */}
          <div>
            <Label className="text-xs text-neutral-600 mb-1.5">Situation professionnelle</Label>
            <div className="grid grid-cols-2 gap-2">
              {['CDI', 'CDD', 'Freelance', 'Retraité', 'Autre'].map((type) => (
                <button
                  key={type}
                  onClick={() => setEmploymentType(type)}
                  className={`py-2 rounded-lg text-xs font-medium transition-all ${
                    employmentType === type
                      ? 'bg-brand-500 text-white shadow-sm'
                      : 'bg-neutral-50 text-neutral-600 border border-neutral-200 hover:border-brand-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Monthly income */}
          <div>
            <Label className="text-xs text-neutral-600 mb-1.5">Revenus mensuels (F CFA)</Label>
            <Input
              type="number"
              placeholder="Ex: 500000"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              className="h-10 bg-white border-neutral-200 text-sm"
            />
            <p className="text-[10px] text-neutral-400 mt-1">
              Recommandé : 3× le loyer ({(property.price * 3).toLocaleString('fr-FR')} F CFA)
            </p>
          </div>

          {/* Motivation */}
          <div>
            <Label className="text-xs text-neutral-600 mb-1.5">Lettre de motivation</Label>
            <Textarea
              placeholder="Présentez-vous et expliquez pourquoi vous êtes intéressé(e) par ce bien..."
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              className="min-h-[120px] bg-white border-neutral-200 text-sm resize-none"
            />
          </div>

          {/* Conditions reminder */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-amber-800 mb-1">Documents à prévoir</p>
            <ul className="text-[10px] text-amber-700 space-y-0.5">
              {extras.modalites.conditions.slice(0, 3).map((c, i) => (
                <li key={i}>· {c}</li>
              ))}
            </ul>
          </div>

          <Button
            className="w-full bg-brand-500 hover:bg-brand-600 text-white h-11 text-sm font-semibold"
            disabled={!employmentType || !income || !motivation.trim()}
            onClick={() => setSubmitted(true)}
          >
            <Send className="size-4 mr-1.5" />
            Soumettre ma candidature
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Helper ──────────────────────────────────────────────────────────────────

function getPropertyById(id: number): PropertyDetail | null {
  const properties: PropertyDetail[] = [
    { id: 1, title: 'Appartement F3 moderne - Cocody', price: 750000, location: 'Cocody Riviera 2, Abidjan', city: 'Abidjan', commune: 'Cocody', bedrooms: 3, area: 85, image: '/images/apt-cocody.png', type: 'Appartement', meuble: true, status: 'disponible', isVerified: true, views: 287, lat: 5.3580, lng: -3.9750 },
    { id: 2, title: 'Studio Meublé - Plateau', price: 75000, location: 'Plateau Dokui, Abidjan', city: 'Abidjan', commune: 'Plateau', bedrooms: null, area: 35, image: '/images/studio-plateau.png', type: 'Studio', meuble: true, status: 'disponible', isVerified: true, views: 142, lat: 5.3190, lng: -4.0150 },
    { id: 3, title: 'Villa 4 Chambres - Marcory', price: 350000, location: 'Marcory Résidentiel, Abidjan', city: 'Abidjan', commune: 'Marcory', bedrooms: 4, area: 200, image: '/images/villa-marcory.png', type: 'Villa', meuble: false, status: 'disponible', isVerified: true, views: 431, lat: 5.2950, lng: -3.9850 },
    { id: 4, title: 'Appartement F2 - Yopougon', price: 90000, location: 'Yopougon Sipimap, Abidjan', city: 'Abidjan', commune: 'Yopougon', bedrooms: 2, area: 55, image: '/images/apt-yopougon.png', type: 'Appartement', meuble: false, status: 'loue', isVerified: true, views: 95, lat: 5.3400, lng: -4.0900 },
    { id: 5, title: 'Duplex Meublé - Abobo', price: 180000, location: 'Abobo Avocatier, Abidjan', city: 'Abidjan', commune: 'Abobo', bedrooms: 3, area: 120, image: '/images/duplex-abobo.png', type: 'Duplex', meuble: true, status: 'disponible', isVerified: false, views: 203, lat: 5.3800, lng: -4.0400 },
    { id: 6, title: 'Penthouse Riviera Palmeraie', price: 500000, location: 'Riviera Palmeraie, Abidjan', city: 'Abidjan', commune: 'Riviera', bedrooms: 4, area: 180, image: '/images/penthouse-riviera.png', type: 'Penthouse', meuble: true, status: 'disponible', isVerified: true, views: 567, lat: 5.3700, lng: -3.9500 },
    { id: 7, title: 'Appartement F4 - Deux Plateaux', price: 220000, location: 'Deux Plateaux, Cocody', city: 'Abidjan', commune: 'Cocody', bedrooms: 4, area: 110, image: '/images/apt-cocody.png', type: 'Appartement', meuble: false, status: 'disponible', isVerified: true, views: 178, lat: 5.3450, lng: -3.9600 },
    { id: 8, title: 'Studio Climatisé - Treichville', price: 65000, location: 'Treichville, Abidjan', city: 'Abidjan', commune: 'Treichville', bedrooms: null, area: 28, image: '/images/studio-plateau.png', type: 'Studio', meuble: true, status: 'disponible', isVerified: false, views: 89, lat: 5.2980, lng: -4.0300 },
  ]
  return properties.find((p) => p.id === id) ?? null
}
