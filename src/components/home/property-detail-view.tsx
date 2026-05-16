'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/lib/auth-store'
import { useFavorites } from '@/lib/use-favorites'
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
  Loader2,
  EyeOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
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
  hasParking: boolean
  hasGarden: boolean
  hasPool: boolean
  hasGuardian: boolean
  hasClimate: boolean
  amenities: string // JSON string
  rentalTerms: string // JSON string
  hideOwnerName: boolean // Owner can hide their name
  virtualTourUrl: string | null // 3D virtual tour video URL
  viewsCount: number
  createdAt: string
  updatedAt: string
  ownerId: string
  images: Array<{ id: string; url: string; order: number }>
  owner: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string | null
    avatarUrl: string | null
    createdAt: string
  }
}

type TabKey = 'details' | 'commodites' | 'modalites' | 'contact' | 'visit' | 'reviews'

// ── Parsed extras derived from API data ────────────────────────────────────

interface ParsedExtras {
  description: string
  bathrooms: number | null
  parking: boolean
  climate: boolean
  guardian: boolean
  images: string[]
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
  owner: {
    name: string
    phone: string
    email: string
    avatar: string
    joinedDate: string
  }
  virtualTourUrl: string | null
  hideOwnerName: boolean
}

// ── Review type ────────────────────────────────────────────────────────────

interface Review {
  id: string
  name: string
  avatar: string
  rating: number
  date: string
  comment: string
  verified: boolean
}

// ── Amenity config ─────────────────────────────────────────────────────────

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

// ── Helpers ────────────────────────────────────────────────────────────────

function formatJoinedDate(dateStr: string): string {
  const months = ['Jan', 'Fév', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
  const d = new Date(dateStr)
  return `${months[d.getMonth()]} ${d.getFullYear()}`
}

function parseExtras(property: PropertyDetail): ParsedExtras {
  let amenities: string[] = []
  try {
    amenities = JSON.parse(property.amenities || '[]')
  } catch {
    amenities = []
  }

  let modalites: ParsedExtras['modalites'] = {
    caution: 0,
    dureeBail: '',
    chargesIncluses: [],
    chargesNonIncluses: [],
    modePaiement: [],
    conditions: [],
    etatLieux: '',
    preavis: '',
  }
  try {
    const parsed = JSON.parse(property.rentalTerms || '{}')
    modalites = {
      caution: parsed.caution ?? 0,
      dureeBail: parsed.dureeBail ?? '',
      chargesIncluses: parsed.chargesIncluses ?? [],
      chargesNonIncluses: parsed.chargesNonIncluses ?? [],
      modePaiement: parsed.modePaiement ?? [],
      conditions: parsed.conditions ?? [],
      etatLieux: parsed.etatLieux ?? '',
      preavis: parsed.preavis ?? '',
    }
  } catch {
    // keep defaults
  }

  const ownerName = property.hideOwnerName
    ? 'Propriétaire anonyme'
    : `${property.owner.firstName} ${property.owner.lastName}`
  const ownerAvatar = property.hideOwnerName
    ? 'P'
    : `${property.owner.firstName.charAt(0)}${property.owner.lastName.charAt(0)}`

  return {
    description: property.description,
    bathrooms: property.bathrooms,
    parking: property.hasParking,
    climate: property.hasClimate,
    guardian: property.hasGuardian,
    images: property.images.map((img) => img.url),
    amenities,
    modalites,
    owner: {
      name: ownerName,
      phone: property.hideOwnerName ? '' : (property.owner.phone || ''),
      email: property.hideOwnerName ? '' : property.owner.email,
      avatar: ownerAvatar,
      joinedDate: formatJoinedDate(property.owner.createdAt),
    },
    virtualTourUrl: property.virtualTourUrl,
    hideOwnerName: property.hideOwnerName,
  }
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
          <DialogDescription className="text-center text-sm text-muted-foreground">
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
    <div className="relative w-full h-48 sm:h-64 rounded-xl overflow-hidden border border-border">
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
        className="absolute bottom-3 right-3 z-[1000] bg-card/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md border border-border flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:bg-card hover:text-brand-500 transition-colors"
      >
        <Navigation className="size-3.5" />
        Itinéraire
      </a>
    </div>
  )
}

// ── Loading Skeleton ────────────────────────────────────────────────────────

function PropertyDetailSkeleton() {
  return (
    <section className="bg-muted min-h-screen">
      {/* Top bar */}
      <div className="bg-card border-b border-border sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Skeleton className="h-4 w-16" />
          <div className="flex gap-2">
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="size-9 rounded-full" />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          <div className="lg:col-span-2">
            <Skeleton className="h-64 sm:h-96 lg:h-[480px] rounded-2xl mb-6" />
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2 mb-4" />
            <div className="border-b border-border mb-6">
              <div className="flex gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-20" />
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
          </div>
          <div className="hidden lg:block">
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

export function PropertyDetailView({ propertyId }: { propertyId: string }) {
  const { setView, isAuthenticated, user, previousView } = useAuthStore()
  const { isFavorite: checkIsFavorite, toggleFavorite: apiToggleFavorite, checkSingle } = useFavorites([propertyId])
  const [currentImage, setCurrentImage] = useState(0)
  const [activeTab, setActiveTab] = useState<TabKey>('details')
  const [authGateOpen, setAuthGateOpen] = useState(false)
  const [authGateAction, setAuthGateAction] = useState('')
  const [applyDialogOpen, setApplyDialogOpen] = useState(false)
  const [applySubmitted, setApplySubmitted] = useState(false)

  // API data state
  const [property, setProperty] = useState<PropertyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Reviews data state
  const [reviews, setReviews] = useState<Review[]>([])
  const [avgRating, setAvgRating] = useState<number>(0)
  const [totalReviews, setTotalReviews] = useState<number>(0)

  // Fetch property from API
  useEffect(() => {
    if (!propertyId) return
    let cancelled = false
    fetch(`/api/properties/${propertyId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Bien introuvable')
        return res.json()
      })
      .then((data) => {
        if (!cancelled) {
          setProperty(data.property)
          setCurrentImage(0)
          setError(null)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Erreur lors du chargement')
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [propertyId])

  // Check favorite status on mount
  useEffect(() => {
    if (propertyId && isAuthenticated) {
      checkSingle(propertyId)
    }
  }, [propertyId, isAuthenticated, checkSingle])

  // Fetch reviews from API
  useEffect(() => {
    if (!propertyId) return
    fetch(`/api/properties/reviews?propertyId=${propertyId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Erreur')
        return res.json()
      })
      .then((data) => {
        setReviews(data.reviews ?? [])
        setAvgRating(data.avgRating ?? 0)
        setTotalReviews(data.totalReviews ?? 0)
      })
      .catch(() => {
        // Silently fail — reviews are not critical
        setReviews([])
        setAvgRating(0)
        setTotalReviews(0)
      })
  }, [propertyId])

  // Loading state
  if (loading) return <PropertyDetailSkeleton />

  // Error state
  if (error || !property) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <AlertCircle className="size-10 text-muted-foreground" />
        <p className="text-muted-foreground">{error || 'Bien introuvable'}</p>
        <Button variant="outline" onClick={() => setView(previousView === 'property-detail' ? 'home' : previousView)}>
          Retour
        </Button>
      </div>
    )
  }

  // Derive extras from API data
  const extras = parseExtras(property)

  const statusConfig: Record<PropertyStatus, { label: string; className: string }> = {
    disponible: { label: 'Disponible', className: 'bg-emerald-500 text-white' },
    loue: { label: 'Loué', className: 'bg-red-500 text-white' },
    reserve: { label: 'Réservé', className: 'bg-amber-500 text-white' },
  }

  const features = [
    { icon: BedDouble, label: 'Chambres', value: property.bedrooms ?? '—' },
    { icon: ShowerHead, label: 'SdB', value: property.bathrooms ?? '—' },
    { icon: Maximize, label: 'Surface', value: `${property.area} m²` },
    { icon: Car, label: 'Parking', value: property.hasParking ? 'Oui' : 'Non' },
    { icon: Wind, label: 'Climatisation', value: property.hasClimate ? 'Oui' : 'Non' },
    { icon: Shield, label: 'Gardien', value: property.hasGuardian ? 'Oui' : 'Non' },
  ]

  // avgRating is now fetched from API (state variable)

  const images = extras.images
  const commune = property.commune || property.city

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
    requireAuth('ajouter aux favoris', async () => {
      await apiToggleFavorite(propertyId)
    })
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
    { key: 'reviews', label: `Avis (${totalReviews})`, icon: Star },
  ]

  return (
    <section className="bg-muted min-h-screen">
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
      <div className="bg-card border-b border-border sticky top-0 z-30 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <button
            onClick={() => setView(previousView === 'property-detail' ? 'home' : previousView)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-brand-500 transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Retour</span>
            <span className="sm:hidden">Retour</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFavorite}
              className="size-9 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-red-50 hover:border-red-200 transition-all"
              aria-label={checkIsFavorite(propertyId) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            >
              <Heart className={`size-4 ${checkIsFavorite(propertyId) ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
            </button>
            <button
              className="size-9 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-brand-50 hover:border-brand-200 transition-all"
              aria-label="Partager"
            >
              <Share2 className="size-4 text-muted-foreground" />
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
              {images.length > 0 ? (
                <Image
                  src={images[currentImage] ?? images[0]!}
                  alt={property.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 66vw"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <Building2 className="size-16 text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

              {/* Image nav */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImage((p) => (p - 1 + images.length) % images.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 size-9 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card shadow-md transition-colors"
                    aria-label="Image précédente"
                  >
                    <ChevronLeft className="size-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => setCurrentImage((p) => (p + 1) % images.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 size-9 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card shadow-md transition-colors"
                    aria-label="Image suivante"
                  >
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </button>
                </>
              )}

              {/* Image indicators */}
              {images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, i) => (
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
                <Badge className={`border-0 text-xs font-semibold px-2.5 py-0.5 ${statusConfig[property.rentalStatus].className}`}>
                  {statusConfig[property.rentalStatus].label}
                </Badge>
                {property.isFurnished && (
                  <Badge className="border-0 text-xs font-medium px-2.5 py-0.5 bg-sky-500 text-white">
                    Meublé
                  </Badge>
                )}
                {property.isVerified && (
                  <Badge className="border-0 text-xs font-medium px-2.5 py-0.5 bg-card/90 backdrop-blur-sm text-foreground">
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
                <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0 border-border text-muted-foreground">
                  <Building2 className="size-3 mr-0.5" />
                  {property.type}
                </Badge>
                <div className="flex items-center gap-1 text-muted-foreground text-xs">
                  <Eye className="size-3" />
                  <span>{property.viewsCount} vues</span>
                </div>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-1">{property.title}</h1>
              <div className="flex items-center gap-1 text-muted-foreground text-sm">
                <MapPin className="size-3.5 shrink-0 text-brand-500" />
                <span>{property.address}</span>
              </div>
              <div className="flex items-center justify-between mt-3 lg:hidden">
                <p className="text-2xl font-bold text-brand-500">
                  {property.price.toLocaleString('fr-FR')} <span className="text-sm font-normal text-muted-foreground">F CFA/mois</span>
                </p>
              </div>
            </motion.div>

            {/* Tabs */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="border-b border-border mb-6 -mx-4 sm:mx-0"
            >
              <div className="flex gap-0 -mb-px overflow-x-auto scrollbar-hide px-4 sm:px-0">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-1.5 px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.key
                        ? 'border-brand-500 text-brand-500'
                        : 'border-transparent text-muted-foreground hover:text-muted-foreground hover:border-border'
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
                {activeTab === 'reviews' && <ReviewsTab avgRating={avgRating} reviews={reviews} totalReviews={totalReviews} />}
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
              <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
                <p className="text-2xl font-bold text-brand-500 mb-1">
                  {property.price.toLocaleString('fr-FR')} <span className="text-sm font-normal text-muted-foreground">F CFA/mois</span>
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                  <MapPin className="size-3" />
                  <span>{commune}, {property.city}</span>
                </div>
                <Separator className="mb-4" />
                {/* Owner mini card */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="size-11 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
                    {extras.owner.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{extras.owner.name}</p>
                    <p className="text-[11px] text-muted-foreground">Propriétaire · Depuis {extras.owner.joinedDate}</p>
                    {extras.hideOwnerName && (
                      <p className="text-[10px] text-amber-600 flex items-center gap-1 mt-0.5">
                        <EyeOff className="size-2.5" />
                        Anonyme
                      </p>
                    )}
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
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] z-30 lg:hidden">
          <div className="flex items-center gap-2 sm:gap-3 max-w-7xl mx-auto">
            <div className="flex-1 min-w-0">
              <p className="text-base sm:text-lg font-bold text-brand-500">
                {property.price.toLocaleString('fr-FR')} <span className="text-[10px] sm:text-xs font-normal text-muted-foreground">F CFA/mois</span>
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
  extras: ParsedExtras
}) {
  const commune = property.commune || property.city
  const lat = property.latitude ?? 5.3364
  const lng = property.longitude ?? -4.0267

  return (
    <div className="space-y-6 pb-24 lg:pb-6">
      {/* Features grid */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Caractéristiques</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {features.map((feat) => (
            <div key={feat.label} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border border-border shadow-sm">
              <feat.icon className="size-5 text-brand-500" />
              <span className="text-[10px] text-muted-foreground font-medium">{feat.label}</span>
              <span className="text-sm font-semibold text-foreground">{feat.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2">Description</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{extras.description}</p>
      </div>

      {/* Localisation with map */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <MapPin className="size-4 text-brand-500" />
          Localisation
        </h3>
        <div className="bg-card rounded-xl border border-border p-4 space-y-4">
          <div className="flex items-start gap-3">
            <MapPin className="size-5 text-brand-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">{property.address}</p>
              <p className="text-xs text-muted-foreground">{commune}, {property.city}, Côte d&apos;Ivoire</p>
            </div>
          </div>
          {/* Mini Map */}
          <MiniMap lat={lat} lng={lng} location={commune} />
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
      <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
          <Lamp className="size-4 text-brand-500" />
          Commodités & Équipements
        </h3>
        <p className="text-xs text-muted-foreground">
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
          <div key={category.title} className="bg-card rounded-xl border border-border p-5 shadow-sm">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{category.title}</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categoryAmenities.map((amenity) => (
                <div key={amenity.key} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100">
                  <div className="size-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <amenity.icon className="size-4 text-emerald-600" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{amenity.label}</span>
                  <CheckCircle2 className="size-3.5 text-emerald-500 ml-auto shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Not available amenities hint */}
      <div className="text-center py-2">
        <p className="text-[11px] text-muted-foreground">
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
  extras: ParsedExtras
  price: number
}) {
  const m = extras.modalites

  // If no rental terms data, show a message
  if (!m.dureeBail && m.caution === 0 && m.chargesIncluses.length === 0 && m.chargesNonIncluses.length === 0) {
    return (
      <div className="pb-24 lg:pb-6">
        <div className="bg-card rounded-xl border border-border p-8 text-center shadow-sm">
          <FileText className="size-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Les modalités de location n&apos;ont pas encore été renseignées par le propriétaire.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-6">
      {/* Financial summary */}
      <div className="bg-card rounded-xl border border-border p-4 sm:p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Wallet className="size-4 text-brand-500" />
          Conditions financières
        </h3>
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 border-b border-border gap-1">
            <span className="text-sm text-muted-foreground">Loyer mensuel</span>
            <span className="text-sm font-bold text-brand-500">{price.toLocaleString('fr-FR')} F CFA</span>
          </div>
          {m.caution > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 border-b border-border gap-1">
              <span className="text-sm text-muted-foreground">Caution / Dépôt de garantie</span>
              <span className="text-sm font-bold text-foreground">{m.caution.toLocaleString('fr-FR')} F CFA</span>
            </div>
          )}
          {m.modePaiement.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 border-b border-border gap-2">
              <div className="flex items-center gap-2">
                <CreditCard className="size-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Mode de paiement</span>
              </div>
              <div className="flex flex-wrap gap-1 sm:justify-end">
                {m.modePaiement.map((mode) => (
                  <Badge key={mode} variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground">
                    {mode}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lease duration */}
      {m.dureeBail && (
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Clock3 className="size-4 text-brand-500" />
            Durée du bail
          </h3>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-brand-50/50 border border-brand-100">
            <Calendar className="size-5 text-brand-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">{m.dureeBail}</p>
              {m.preavis && <p className="text-xs text-muted-foreground">Préavis de départ : {m.preavis}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Charges */}
      {(m.chargesIncluses.length > 0 || m.chargesNonIncluses.length > 0) && (
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Scale className="size-4 text-brand-500" />
            Charges
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {m.chargesIncluses.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-emerald-600 mb-2 flex items-center gap-1">
                  <CheckCircle2 className="size-3" />
                  Charges incluses
                </p>
                <ul className="space-y-1.5">
                  {m.chargesIncluses.map((charge) => (
                    <li key={charge} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="size-1.5 rounded-full bg-emerald-400 shrink-0" />
                      {charge}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {m.chargesNonIncluses.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-500 mb-2 flex items-center gap-1">
                  <X className="size-3" />
                  Charges non incluses
                </p>
                <ul className="space-y-1.5">
                  {m.chargesNonIncluses.map((charge) => (
                    <li key={charge} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="size-1.5 rounded-full bg-red-400 shrink-0" />
                      {charge}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conditions */}
      {m.conditions.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <FileText className="size-4 text-brand-500" />
            Conditions d&apos;entrée
          </h3>
          <ul className="space-y-2">
            {m.conditions.map((condition, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <span className="size-5 rounded-full bg-brand-50 text-brand-500 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {condition}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* État des lieux */}
      {m.etatLieux && (
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <Shield className="size-4 text-brand-500" />
            État des lieux
          </h3>
          <p className="text-sm text-muted-foreground">{m.etatLieux}</p>
        </div>
      )}
    </div>
  )
}

// ── Contact Tab ─────────────────────────────────────────────────────────────

function ContactTab({
  property,
  extras,
}: {
  property: PropertyDetail
  extras: ParsedExtras
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
      <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <div className="size-14 rounded-full bg-brand-500 text-white flex items-center justify-center text-lg font-bold shrink-0">
            {extras.owner.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-foreground">{extras.owner.name}</p>
            <p className="text-xs text-muted-foreground">Propriétaire · Membre depuis {extras.owner.joinedDate}</p>
            {extras.hideOwnerName && (
              <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                <EyeOff className="size-3" />
                Ce propriétaire préfère rester anonyme
              </p>
            )}
          </div>
        </div>
        {extras.hideOwnerName ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-amber-700">
              Ce propriétaire a choisi de masquer ses coordonnées. Envoyez-lui un message via le formulaire ci-dessous.
            </p>
          </div>
        ) : (
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
        )}
        {!extras.hideOwnerName && !isAuthenticated && (
          <p className="text-[11px] text-muted-foreground text-center mb-2">
            Connectez-vous pour accéder aux coordonnées du propriétaire
          </p>
        )}
        {!extras.hideOwnerName && isAuthenticated && extras.owner.phone && (
          <div className="text-xs text-muted-foreground text-center">
            {extras.owner.phone} · {extras.owner.email}
          </div>
        )}
      </div>

      {/* Message form */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <MessageSquare className="size-4 text-brand-500" />
          Envoyer un message
        </h3>
        {sent ? (
          <div className="text-center py-6">
            <CheckCircle2 className="size-10 text-emerald-500 mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground mb-1">Message envoyé !</p>
            <p className="text-xs text-muted-foreground">Le propriétaire vous répondra dans les plus brefs délais.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1">Objet</Label>
              <Input
                readOnly
                value={`Intérêt pour : ${property.title}`}
                className="h-9 bg-muted border-border text-xs"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1">Votre message</Label>
              <Textarea
                placeholder="Bonjour, je suis intéressé(e) par votre bien. Pourrions-nous convenir d'une visite ?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[120px] bg-card border-border text-sm resize-none"
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
  const { isAuthenticated, user } = useAuthStore()
  const [visitType, setVisitType] = useState<'PHYSICAL' | 'VIRTUAL'>('PHYSICAL')
  const [visitDate, setVisitDate] = useState('')
  const [visitTime, setVisitTime] = useState('')
  const [visitNotes, setVisitNotes] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00',
    '14:00', '15:00', '16:00', '17:00',
  ]

  const hasVirtualTour = !!property.virtualTourUrl

  const handleSubmit = async () => {
    if (!isAuthenticated || !user) {
      requireAuth('planifier une visite', () => {})
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: property.id,
          visitType,
          requestedDate: visitDate,
          timeSlot: visitTime,
          tenantMessage: visitNotes || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erreur lors de la demande')
        return
      }

      setSubmitted(true)
    } catch {
      setError('Erreur réseau. Veuillez réessayer.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="pb-24 lg:pb-6">
        <div className="bg-card rounded-xl border border-border p-8 text-center shadow-sm">
          <div className="size-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="size-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">Demande de visite envoyée !</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Votre demande de visite {visitType === 'PHYSICAL' ? 'physique' : 'virtuelle'} pour le {visitDate} à {visitTime} a été transmise au propriétaire.
            Vous recevrez une confirmation sous 24h.
          </p>
          <div className="bg-muted rounded-lg p-4 max-w-sm mx-auto text-left space-y-2 mb-5">
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">{property.title}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">{visitDate} à {visitTime}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {visitType === 'PHYSICAL' ? <MapPin className="size-4 text-muted-foreground" /> : <Video className="size-4 text-muted-foreground" />}
              <span className="text-muted-foreground">Visite {visitType === 'PHYSICAL' ? 'physique' : 'virtuelle'}</span>
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

      {/* Virtual Tour Preview - if owner has uploaded a 3D video */}
      {hasVirtualTour && (
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Video className="size-4 text-brand-500" />
            Visite virtuelle 3D disponible
          </h3>
          <div className="relative rounded-lg overflow-hidden bg-neutral-900 aspect-video">
            {property.virtualTourUrl!.startsWith('data:video') || property.virtualTourUrl!.startsWith('data:') ? (
              <video
                src={property.virtualTourUrl!}
                controls
                className="w-full h-full object-contain"
                title="Visite virtuelle 3D"
              >
                Votre navigateur ne supporte pas la lecture vidéo.
              </video>
            ) : (
              <iframe
                src={property.virtualTourUrl!}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Visite virtuelle 3D"
              />
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Visionnez la visite virtuelle 3D du bien, ou planifiez une visite physique ci-dessous.
          </p>
        </div>
      )}

      {/* Visit type selection */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Calendar className="size-4 text-brand-500" />
          Type de visite
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => setVisitType('PHYSICAL')}
            className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              visitType === 'PHYSICAL'
                ? 'border-brand-500 bg-brand-50/50'
                : 'border-border hover:border-brand-300'
            }`}
          >
            {visitType === 'PHYSICAL' && (
              <div className="absolute top-2 right-2">
                <CheckCircle2 className="size-4 text-brand-500" />
              </div>
            )}
            <MapPin className={`size-6 ${visitType === 'PHYSICAL' ? 'text-brand-500' : 'text-muted-foreground'}`} />
            <span className={`text-sm font-medium ${visitType === 'PHYSICAL' ? 'text-brand-600' : 'text-muted-foreground'}`}>
              Visite physique
            </span>
            <span className="text-[11px] text-muted-foreground text-center">Déplacement sur place avec le propriétaire ou son représentant</span>
          </button>
          <button
            onClick={() => setVisitType('VIRTUAL')}
            className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              visitType === 'VIRTUAL'
                ? 'border-brand-500 bg-brand-50/50'
                : 'border-border hover:border-brand-300'
            }`}
          >
            {visitType === 'VIRTUAL' && (
              <div className="absolute top-2 right-2">
                <CheckCircle2 className="size-4 text-brand-500" />
              </div>
            )}
            <Video className={`size-6 ${visitType === 'VIRTUAL' ? 'text-brand-500' : 'text-muted-foreground'}`} />
            <span className={`text-sm font-medium ${visitType === 'VIRTUAL' ? 'text-brand-600' : 'text-muted-foreground'}`}>
              Visite virtuelle
            </span>
            <span className="text-[11px] text-muted-foreground text-center">Visioconférence en direct avec le propriétaire</span>
          </button>
        </div>
      </div>

      {/* Visit type info */}
      {visitType === 'PHYSICAL' ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
          <MapPin className="size-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-emerald-800 mb-0.5">Visite physique</p>
            <p className="text-[11px] text-emerald-700">Vous vous rendrez sur place à l&apos;adresse du bien. Le propriétaire ou son représentant vous accueillera pour la visite.</p>
          </div>
        </div>
      ) : (
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 flex items-start gap-3">
          <Video className="size-5 text-sky-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-sky-800 mb-0.5">Visite virtuelle</p>
            <p className="text-[11px] text-sky-700">
              Le propriétaire vous enverra un lien de visioconférence (Zoom, Google Meet, etc.) à l&apos;heure convenue.
              {hasVirtualTour && ' Vous pouvez aussi visionner la visite 3D pré-enregistrée en haut de cette page.'}
            </p>
          </div>
        </div>
      )}

      {/* Date & Time */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock3 className="size-4 text-brand-500" />
          Date et créneau horaire
        </h3>
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1">Date souhaitée</Label>
            <Input
              type="date"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              className="h-10 bg-card border-border text-sm"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-2">Créneau horaire</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {timeSlots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => setVisitTime(slot)}
                  className={`py-2.5 px-3 rounded-lg text-sm font-medium border transition-all ${
                    visitTime === slot
                      ? 'border-brand-500 bg-brand-50 text-brand-600'
                      : 'border-border text-muted-foreground hover:border-brand-300 hover:bg-accent'
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
      <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
        <Label className="text-xs text-muted-foreground mb-1">Message au propriétaire (optionnel)</Label>
        <Textarea
          placeholder={visitType === 'PHYSICAL' 
            ? "Précisez vos disponibilités ou posez vos questions..." 
            : "Indiquez vos questions sur le bien pour la visioconférence..."}
          value={visitNotes}
          onChange={(e) => setVisitNotes(e.target.value)}
          className="min-h-[80px] bg-card border-border text-sm resize-none"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Submit */}
      <Button
        className="w-full bg-brand-500 hover:bg-brand-600 text-white h-11 text-sm font-semibold"
        disabled={!visitDate || !visitTime || submitting}
        onClick={handleSubmit}
      >
        {submitting ? (
          <Loader2 className="size-4 mr-1.5 animate-spin" />
        ) : (
          <Calendar className="size-4 mr-1.5" />
        )}
        {submitting ? 'Envoi en cours...' : `Confirmer la visite ${visitType === 'PHYSICAL' ? 'physique' : 'virtuelle'}`}
      </Button>
    </div>
  )
}

// ── Reviews Tab ─────────────────────────────────────────────────────────────

function ReviewsTab({ avgRating, reviews, totalReviews }: { avgRating: number; reviews: Review[]; totalReviews: number }) {
  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    percentage: reviews.length > 0
      ? (reviews.filter((r) => r.rating === star).length / reviews.length) * 100
      : 0,
  }))

  // Empty state when no reviews
  if (reviews.length === 0) {
    return (
      <div className="pb-24 lg:pb-6">
        <div className="bg-card rounded-xl border border-border p-8 text-center shadow-sm">
          <MessageSquare className="size-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Aucun avis pour le moment. Soyez le premier à laisser un avis !</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-6">
      {/* Rating summary */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          <div className="text-center">
            <p className="text-4xl font-bold text-foreground">{avgRating.toFixed(1)}</p>
            <div className="flex items-center gap-0.5 mt-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`size-4 ${i < Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'text-neutral-200'}`}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{totalReviews} avis</p>
          </div>
          <div className="w-full sm:w-auto flex-1 max-w-xs space-y-1.5">
            {ratingDistribution.map((d) => (
              <div key={d.star} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-3">{d.star}</span>
                <Star className="size-3 text-amber-400 fill-amber-400" />
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all"
                    style={{ width: `${d.percentage}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-6">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Individual reviews */}
      {reviews.map((review) => (
        <div key={review.id} className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
              {review.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{review.name}</p>
                  {review.verified && (
                    <BadgeCheck className="size-4 text-brand-500" />
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground shrink-0">{review.date}</span>
              </div>
              <div className="flex items-center gap-0.5 mt-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`size-3 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-200'}`}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{review.comment}</p>
            </div>
          </div>
        </div>
      ))}
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
  extras: ParsedExtras
  submitted: boolean
  setSubmitted: (v: boolean) => void
}) {
  const [employmentType, setEmploymentType] = useState('cdi')
  const [monthlyIncome, setMonthlyIncome] = useState('')
  const [motivation, setMotivation] = useState('')

  const handleSubmit = () => {
    setSubmitted(true)
  }

  const handleClose = () => {
    onOpenChange(false)
    if (submitted) {
      setSubmitted(false)
      setEmploymentType('cdi')
      setMonthlyIncome('')
      setMotivation('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-5 text-brand-500" />
            Candidature — {property.title}
          </DialogTitle>
          <DialogDescription>
            Remplissez le formulaire ci-dessous pour soumettre votre candidature de location.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="text-center py-8">
            <div className="size-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="size-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">Candidature soumise !</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Votre dossier de candidature pour &quot;{property.title}&quot; a été transmis au propriétaire.
              Vous serez notifié de la suite donnée à votre demande.
            </p>
            <Button
              className="mt-6 bg-brand-500 hover:bg-brand-600 text-white"
              onClick={handleClose}
            >
              Fermer
            </Button>
          </div>
        ) : (
          <div className="space-y-4 mt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            {/* Property summary */}
            <div className="bg-muted rounded-lg p-3 flex items-center gap-3">
              <div className="size-12 rounded-lg bg-neutral-200 overflow-hidden shrink-0">
                {property.images.length > 0 ? (
                  <Image
                    src={property.images[0]!.url}
                    alt={property.title}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building2 className="size-5 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground line-clamp-1">{property.title}</p>
                <p className="text-xs text-muted-foreground">{property.address}</p>
                <p className="text-sm font-bold text-brand-500 mt-0.5">
                  {property.price.toLocaleString('fr-FR')} F CFA/mois
                </p>
              </div>
            </div>

            {/* Rental terms summary */}
            {extras.modalites.caution > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-amber-800 mb-1">Conditions de location</p>
                <div className="flex flex-wrap gap-3 text-xs text-amber-700">
                  <span>Caution : {extras.modalites.caution.toLocaleString('fr-FR')} F CFA</span>
                  {extras.modalites.dureeBail && <span>Bail : {extras.modalites.dureeBail}</span>}
                </div>
              </div>
            )}

            {/* Employment type */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1">Type d&apos;emploi</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'cdi', label: 'CDI' },
                  { value: 'cdd', label: 'CDD' },
                  { value: 'freelance', label: 'Freelance' },
                  { value: 'retraite', label: 'Retraité' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setEmploymentType(opt.value)}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                      employmentType === opt.value
                        ? 'border-brand-500 bg-brand-50 text-brand-600'
                        : 'border-border text-muted-foreground hover:border-border'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Monthly income */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1">Revenus mensuels (F CFA)</Label>
              <Input
                type="number"
                placeholder="Ex : 500000"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                className="h-9 bg-card border-border text-sm"
              />
            </div>

            {/* Motivation */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1">Lettre de motivation</Label>
              <Textarea
                placeholder="Présentez-vous et expliquez pourquoi vous souhaitez louer ce bien..."
                value={motivation}
                onChange={(e) => setMotivation(e.target.value)}
                className="min-h-[100px] bg-card border-border text-sm resize-none"
              />
            </div>

            {/* Submit */}
            <Button
              className="w-full bg-brand-500 hover:bg-brand-600 text-white h-11 text-sm font-semibold"
              disabled={!motivation.trim() || !monthlyIncome}
              onClick={handleSubmit}
            >
              <Send className="size-4 mr-1.5" />
              Soumettre ma candidature
            </Button>

            <p className="text-[11px] text-muted-foreground text-center">
              En soumettant votre candidature, vous acceptez que vos informations soient transmises au propriétaire.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
