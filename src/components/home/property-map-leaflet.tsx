'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { MapPin, BedDouble, Maximize, BadgeCheck, ArrowRight, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

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

interface PropertyMapLeafletProps {
  properties: MapProperty[]
}

// ── Popup Card ──────────────────────────────────────────────────────────────

function LeafletPopupCard({ property }: { property: MapProperty }) {
  const statusConfig: Record<PropertyStatus, { label: string; className: string }> = {
    disponible: { label: 'Disponible', className: 'bg-emerald-500 text-white' },
    loue: { label: 'Loué', className: 'bg-red-500 text-white' },
    reserve: { label: 'Réservé', className: 'bg-amber-500 text-white' },
  }

  return (
    <div className="w-64 font-sans">
      <div className="relative h-32 overflow-hidden rounded-t-lg">
        <Image
          src={property.image}
          alt={property.title}
          fill
          className="object-cover"
          sizes="256px"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
          <Badge className={`border-0 text-[9px] font-semibold px-1.5 py-0 ${statusConfig[property.status].className}`}>
            {statusConfig[property.status].label}
          </Badge>
          {property.meuble && (
            <Badge className="border-0 text-[9px] font-medium px-1.5 py-0 bg-sky-500 text-white">
              Meublé
            </Badge>
          )}
        </div>
      </div>
      <div className="p-2.5">
        <h3 className="font-semibold text-neutral-900 text-[11px] mb-0.5 line-clamp-1">{property.title}</h3>
        <div className="flex items-center gap-1 text-neutral-500 text-[10px] mb-1.5">
          <MapPin className="size-2.5 shrink-0" />
          <span className="line-clamp-1">{property.location}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-neutral-600 mb-2">
          {property.bedrooms !== null && (
            <div className="flex items-center gap-0.5">
              <BedDouble className="size-2.5 text-neutral-400" />
              <span>{property.bedrooms} pièce{property.bedrooms > 1 ? 's' : ''}</span>
            </div>
          )}
          <div className="flex items-center gap-0.5">
            <Maximize className="size-2.5 text-neutral-400" />
            <span>{property.area} m²</span>
          </div>
          {property.isVerified && (
            <div className="flex items-center gap-0.5 text-brand-500">
              <BadgeCheck className="size-2.5" />
            </div>
          )}
        </div>
        <div className="flex items-center justify-between pt-1.5 border-t border-neutral-100">
          <p className="text-xs font-bold text-brand-500">
            {property.price.toLocaleString('fr-FR')} <span className="text-[9px] font-normal text-neutral-400">F CFA/mois</span>
          </p>
          <Button variant="outline" size="sm" className="text-brand-500 border-brand-200 hover:bg-brand-50 text-[9px] h-6 px-2">
            Voir <ArrowRight className="size-2.5 ml-0.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Main Leaflet Map Component ──────────────────────────────────────────────

export default function PropertyMapLeaflet({ properties }: PropertyMapLeafletProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const [selectedProperty, setSelectedProperty] = useState<MapProperty | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Dynamic import of Leaflet
    import('leaflet').then((L) => {
      if (!mapRef.current || mapInstanceRef.current) return

      // Fix default marker icons
      delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      // Create map centered on Abidjan
      const map = L.map(mapRef.current, {
        center: [5.3600, -4.0083],
        zoom: 13,
        zoomControl: false,
        scrollWheelZoom: true,
      })

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      // Add zoom control to bottom-right
      L.control.zoom({ position: 'bottomright' }).addTo(map)

      // Custom price marker icon
      const createPriceIcon = (price: number, status: PropertyStatus) => {
        const color: Record<PropertyStatus, string> = {
          disponible: '#FF6C2F',
          loue: '#EF4444',
          reserve: '#F59E0B',
        }
        const bgColor = color[status]
        const label = `${(price / 1000).toFixed(0)}k`

        return L.divIcon({
          className: 'custom-price-marker',
          html: `<div style="
            background: ${bgColor};
            color: white;
            font-size: 11px;
            font-weight: 700;
            padding: 3px 8px;
            border-radius: 20px;
            white-space: nowrap;
            border: 2px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            cursor: pointer;
            transition: transform 0.15s;
            font-family: Inter, sans-serif;
          " onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">${label} F</div>`,
          iconSize: [0, 0],
          iconAnchor: [30, 30],
        })
      }

      // Add markers for each property
      const markers: L.Marker[] = []
      properties.forEach((property) => {
        const icon = createPriceIcon(property.price, property.status)

        const marker = L.marker([property.lat, property.lng], { icon })
          .addTo(map)

        marker.on('click', () => {
          setSelectedProperty(property)
        })

        markers.push(marker)
      })

      // Fit bounds to markers if there are any
      if (properties.length > 0) {
        const group = L.featureGroup(markers)
        map.fitBounds(group.getBounds().pad(0.1))
      }

      mapInstanceRef.current = map

      // Invalidate size after a short delay to ensure proper rendering
      setTimeout(() => {
        map.invalidateSize()
      }, 200)
    })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  return (
    <div className="relative w-full h-full">
      {/* Leaflet map container */}
      <div
        ref={mapRef}
        className="w-full h-full rounded-xl overflow-hidden"
        style={{ minHeight: '500px' }}
      />

      {/* Leaflet CSS overrides */}
      <style jsx global>{`
        .leaflet-popup-content-wrapper {
          border-radius: 12px !important;
          padding: 0 !important;
          overflow: hidden !important;
          box-shadow: 0 8px 30px rgba(0,0,0,0.15) !important;
        }
        .leaflet-popup-content {
          margin: 0 !important;
          width: auto !important;
        }
        .leaflet-popup-tip {
          box-shadow: none !important;
        }
        .leaflet-popup-close-button {
          display: none !important;
        }
        .custom-price-marker {
          background: none !important;
          border: none !important;
        }
      `}</style>

      {/* Selected property card overlay */}
      {selectedProperty && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] sm:left-4 sm:translate-x-0">
          <div className="bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden w-72 animate-in slide-in-from-bottom-4 duration-300">
            {/* Close button */}
            <button
              onClick={() => { setSelectedProperty(null) }}
              className="absolute top-2 right-2 z-10 size-6 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white shadow-sm"
              aria-label="Fermer"
            >
              <X className="size-3 text-neutral-500" />
            </button>
            <LeafletPopupCard property={selectedProperty} />
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-[1000] sm:right-14 bg-white/95 backdrop-blur-sm rounded-lg shadow-md border border-neutral-200 px-3 py-2">
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

      {/* Property count */}
      <div className="absolute top-4 left-4 z-[1000] bg-brand-500 text-white rounded-full px-3 py-1.5 shadow-lg text-xs font-semibold">
        {properties.length} bien{properties.length !== 1 ? 's' : ''} sur la carte
      </div>
    </div>
  )
}
