'use client'

import { useState } from 'react'
import Image from 'next/image'
import { MapPin, BedDouble, Maximize, BadgeCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

// ── Types ───────────────────────────────────────────────────────────────────

type PropertyStatus = 'disponible' | 'loue' | 'reserve'

interface MapProperty {
  id: number
  title: string
  price: number
  location: string
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

// ── Price Marker ────────────────────────────────────────────────────────────

function PriceMarker({ property, onClick }: { property: MapProperty; onClick: () => void }) {
  const statusColor: Record<PropertyStatus, string> = {
    disponible: 'bg-brand-500',
    loue: 'bg-red-500',
    reserve: 'bg-amber-500',
  }

  return (
    <button
      onClick={onClick}
      className={`relative ${statusColor[property.status]} text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-lg hover:scale-110 transition-transform cursor-pointer whitespace-nowrap border-2 border-white`}
    >
      {property.price.toLocaleString('fr-FR')} F
      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 ${statusColor[property.status]} rotate-45 border-r-2 border-b-2 border-white" />
    </button>
  )
}

// ── Popup Card ──────────────────────────────────────────────────────────────

function MapPopupCard({ property, onClose }: { property: MapProperty; onClose: () => void }) {
  const statusConfig: Record<PropertyStatus, { label: string; className: string }> = {
    disponible: { label: 'Disponible', className: 'bg-emerald-500 text-white' },
    loue: { label: 'Loué', className: 'bg-red-500 text-white' },
    reserve: { label: 'Réservé', className: 'bg-amber-500 text-white' },
  }

  return (
    <div className="bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden w-72 animate-in fade-in-0 zoom-in-95 duration-200">
      {/* Image */}
      <div className="relative h-36 overflow-hidden">
        <Image
          src={property.image}
          alt={property.title}
          fill
          className="object-cover"
          sizes="288px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        <button
          onClick={onClose}
          className="absolute top-2 right-2 size-6 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white shadow-sm text-neutral-500 text-xs font-bold"
          aria-label="Fermer"
        >
          ✕
        </button>
        <div className="absolute top-2 left-2 flex items-center gap-1">
          <Badge className={`border-0 text-[10px] font-semibold px-1.5 py-0 ${statusConfig[property.status].className}`}>
            {statusConfig[property.status].label}
          </Badge>
          {property.meuble && (
            <Badge className="border-0 text-[10px] font-medium px-1.5 py-0 bg-sky-500 text-white">
              Meublé
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-semibold text-neutral-900 text-xs mb-0.5 line-clamp-1">{property.title}</h3>
        <div className="flex items-center gap-1 text-neutral-500 text-[10px] mb-2">
          <MapPin className="size-2.5 shrink-0" />
          <span className="line-clamp-1">{property.location}</span>
        </div>
        <div className="flex items-center gap-2.5 text-[10px] text-neutral-600 mb-2.5">
          {property.bedrooms !== null && (
            <div className="flex items-center gap-0.5">
              <BedDouble className="size-3 text-neutral-400" />
              <span>{property.bedrooms} pièce{property.bedrooms > 1 ? 's' : ''}</span>
            </div>
          )}
          <div className="flex items-center gap-0.5">
            <Maximize className="size-3 text-neutral-400" />
            <span>{property.area} m²</span>
          </div>
          {property.isVerified && (
            <div className="flex items-center gap-0.5 text-brand-500">
              <BadgeCheck className="size-3" />
              <span className="font-medium">Vérifié</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
          <p className="text-sm font-bold text-brand-500">
            {property.price.toLocaleString('fr-FR')} <span className="text-[10px] font-normal text-neutral-400">F CFA/mois</span>
          </p>
          <Button variant="outline" size="sm" className="text-brand-500 border-brand-200 hover:bg-brand-50 hover:text-brand-600 text-[10px] h-7 px-2">
            Voir <ArrowRight className="size-2.5 ml-0.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Simple Map using div + absolute positioned markers ──────────────────────
// We use a custom map since Leaflet has SSR issues and adds significant bundle size.
// This creates an interactive map experience with OpenStreetMap tiles as background.

interface PropertyMapProps {
  properties: MapProperty[]
}

export function PropertyMap({ properties }: PropertyMapProps) {
  const [selectedProperty, setSelectedProperty] = useState<MapProperty | null>(null)

  // Abidjan center coordinates
  const center = { lat: 5.3600, lng: -4.0083 }

  // Map bounds for Abidjan area
  const bounds = {
    north: 5.45,
    south: 5.28,
    east: -3.88,
    west: -4.15,
  }

  // Convert lat/lng to pixel positions on the map container
  function toPixel(lat: number, lng: number): { x: number; y: number } {
    const x = ((lng - bounds.west) / (bounds.east - bounds.west)) * 100
    const y = ((bounds.north - lat) / (bounds.north - bounds.south)) * 100
    return { x, y }
  }

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-neutral-200">
      {/* Map tiles background using OpenStreetMap */}
      <div className="absolute inset-0 bg-[#e8e4d8]">
        {/* OpenStreetMap tile as background image */}
        <iframe
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${bounds.west}%2C${bounds.south}%2C${bounds.east}%2C${bounds.north}&layer=mapnik&marker=${center.lat}%2C${center.lng}`}
          className="absolute inset-0 w-full h-full border-0 opacity-90"
          loading="lazy"
          title="Carte Abidjan"
        />
      </div>

      {/* Semi-transparent overlay for better marker visibility */}
      <div className="absolute inset-0 bg-white/20 pointer-events-none" />

      {/* Markers layer */}
      <div className="absolute inset-0">
        {properties.map((property) => {
          const pos = toPixel(property.lat, property.lng)
          return (
            <div
              key={property.id}
              className="absolute z-10"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <PriceMarker
                property={property}
                onClick={() => setSelectedProperty(selectedProperty?.id === property.id ? null : property)}
              />
            </div>
          )
        })}
      </div>

      {/* Popup card */}
      {selectedProperty && (
        <div
          className="absolute z-20"
          style={{
            left: `${toPixel(selectedProperty.lat, selectedProperty.lng).x}%`,
            top: `${toPixel(selectedProperty.lat, selectedProperty.lng).y}%`,
            transform: 'translate(-50%, -110%)',
          }}
        >
          <MapPopupCard
            property={selectedProperty}
            onClose={() => setSelectedProperty(null)}
          />
        </div>
      )}

      {/* Map controls */}
      <div className="absolute bottom-4 right-4 z-30 flex flex-col gap-2">
        <div className="bg-white rounded-lg shadow-md border border-neutral-200 overflow-hidden">
          <button
            className="w-9 h-9 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 transition-colors text-lg font-bold"
            aria-label="Zoom avant"
          >
            +
          </button>
          <div className="h-px bg-neutral-200" />
          <button
            className="w-9 h-9 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 transition-colors text-lg font-bold"
            aria-label="Zoom arrière"
          >
            −
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-30 bg-white/95 backdrop-blur-sm rounded-lg shadow-md border border-neutral-200 px-3 py-2">
        <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Légende</p>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-brand-500" />
            <span className="text-[10px] text-neutral-600">Disponible</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-red-500" />
            <span className="text-[10px] text-neutral-600">Loué</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-amber-500" />
            <span className="text-[10px] text-neutral-600">Réservé</span>
          </div>
        </div>
      </div>

      {/* Property count badge */}
      <div className="absolute top-4 left-4 z-30 bg-brand-500 text-white rounded-full px-3 py-1 shadow-md text-xs font-semibold">
        {properties.length} bien{properties.length !== 1 ? 's' : ''} sur la carte
      </div>
    </div>
  )
}

// ── Leaflet-based Map (loaded dynamically) ──────────────────────────────────

export function PropertyMapLeaflet({ properties }: PropertyMapProps) {
  const [MapComponent, setMapComponent] = useState<React.ComponentType<PropertyMapProps> | null>(null)

  useEffect(() => {
    // Dynamic import of Leaflet map component
    import('./property-map-leaflet').then((mod) => {
      setMapComponent(() => mod.default)
    }).catch(() => {
      // Fallback to simple map
      setMapComponent(() => PropertyMap)
    })
  }, [])

  if (!MapComponent) {
    return (
      <div className="w-full h-full bg-neutral-100 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <div className="size-10 rounded-full bg-neutral-200 flex items-center justify-center mx-auto mb-3 animate-pulse">
            <MapPin className="size-5 text-neutral-400" />
          </div>
          <p className="text-xs text-neutral-400">Chargement de la carte...</p>
        </div>
      </div>
    )
  }

  return <MapComponent properties={properties} />
}
