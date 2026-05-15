'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { MapPin, BedDouble, Maximize, BadgeCheck, ArrowRight, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

// ── Types ───────────────────────────────────────────────────────────────────

type PropertyStatus = 'disponible' | 'loue' | 'reserve'

interface MapProperty {
  id: string
  title: string
  price: number
  address: string
  commune: string | null
  bedrooms: number | null
  area: number
  image: string | null
  type: string
  isFurnished: boolean
  rentalStatus: PropertyStatus
  isVerified: boolean
  viewsCount: number
  latitude: number | null
  longitude: number | null
}

interface PropertyMapLeafletProps {
  properties: MapProperty[]
  onPropertyClick?: (property: MapProperty) => void
}

// ── Helper ──────────────────────────────────────────────────────────────────

function getMapPropertyLocation(property: MapProperty): string {
  if (property.commune) {
    return `${property.address}, ${property.commune}`
  }
  return property.address
}

// ── Popup Card ──────────────────────────────────────────────────────────────

function LeafletPopupCard({ property, onVoirClick }: { property: MapProperty; onVoirClick: () => void }) {
  const statusConfig: Record<PropertyStatus, { label: string; className: string }> = {
    disponible: { label: 'Disponible', className: 'bg-emerald-500 text-white' },
    loue: { label: 'Loué', className: 'bg-red-500 text-white' },
    reserve: { label: 'Réservé', className: 'bg-amber-500 text-white' },
  }

  const location = getMapPropertyLocation(property)

  return (
    <div className="w-64 font-sans">
      <div className="relative h-32 overflow-hidden rounded-t-lg">
        {property.image ? (
          <Image
            src={property.image}
            alt={property.title}
            fill
            className="object-cover"
            sizes="256px"
            unoptimized
          />
        ) : (
          <div className="w-full h-full bg-neutral-200 flex items-center justify-center">
            <MapPin className="size-6 text-neutral-400" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
          <Badge className={`border-0 text-[9px] font-semibold px-1.5 py-0 ${statusConfig[property.rentalStatus].className}`}>
            {statusConfig[property.rentalStatus].label}
          </Badge>
          {property.isFurnished && (
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
          <span className="line-clamp-1">{location}</span>
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
          <Button
            variant="outline"
            size="sm"
            className="text-brand-500 border-brand-200 hover:bg-brand-50 text-[9px] h-6 px-2"
            onClick={(e) => {
              e.stopPropagation()
              onVoirClick()
            }}
          >
            Voir <ArrowRight className="size-2.5 ml-0.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Main Leaflet Map Component ──────────────────────────────────────────────

export default function PropertyMapLeaflet({ properties, onPropertyClick }: PropertyMapLeafletProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const [selectedProperty, setSelectedProperty] = useState<MapProperty | null>(null)
  const [mapZoomLevel, setMapZoomLevel] = useState(12)

  // Group properties by commune
  const communeGroups = useCallback(() => {
    const groups: Record<string, MapProperty[]> = {}
    properties.forEach((p) => {
      const communeKey = p.commune ?? 'Autre'
      if (!groups[communeKey]) groups[communeKey] = []
      groups[communeKey].push(p)
    })
    return groups
  }, [properties])

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Dynamic import of Leaflet
    import('leaflet').then((L) => {
      if (!mapRef.current || mapInstanceRef.current) return

      // Create map centered on Abidjan
      const map = L.map(mapRef.current, {
        center: [5.3600, -4.0083],
        zoom: 12,
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

      // ── Marker creation functions ───────────────────────────────────────

      // Cluster marker: shows count of properties in a commune
      const createClusterIcon = (count: number, commune: string) => {
        const size = count > 5 ? 48 : count > 3 ? 42 : 36
        const bgColor = count > 5 ? '#FF6C2F' : count > 3 ? '#FF8C5A' : '#FFAA80'

        return L.divIcon({
          className: 'custom-cluster-marker',
          html: `
            <div style="
              position: relative;
              width: ${size}px;
              height: ${size}px;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
            ">
              <div style="
                width: ${size}px;
                height: ${size}px;
                border-radius: 50%;
                background: ${bgColor};
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                border: 3px solid white;
                box-shadow: 0 3px 12px rgba(255,108,47,0.4), 0 0 0 1px rgba(255,108,47,0.2);
                transition: transform 0.2s, box-shadow 0.2s;
                font-family: Inter, sans-serif;
              "
              onmouseover="this.style.transform='scale(1.12)'; this.style.boxShadow='0 5px 20px rgba(255,108,47,0.5), 0 0 0 2px rgba(255,108,47,0.3)'"
              onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 3px 12px rgba(255,108,47,0.4), 0 0 0 1px rgba(255,108,47,0.2)'"
              >
                <span style="color: white; font-size: ${count > 9 ? 13 : 15}px; font-weight: 800; line-height: 1;">${count}</span>
                <span style="color: rgba(255,255,255,0.85); font-size: 7px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; margin-top: -1px;">biens</span>
              </div>
              <div style="
                position: absolute;
                bottom: -6px;
                left: 50%;
                transform: translateX(-50%);
                background: ${bgColor};
                color: white;
                font-size: 8px;
                font-weight: 700;
                padding: 1px 6px;
                border-radius: 8px;
                white-space: nowrap;
                border: 1.5px solid white;
                font-family: Inter, sans-serif;
                box-shadow: 0 1px 4px rgba(0,0,0,0.15);
              ">${commune}</div>
            </div>
          `,
          iconSize: [size, size + 16],
          iconAnchor: [size / 2, size + 8],
        })
      }

      // Individual property marker: shows price
      const createPropertyIcon = (price: number, status: PropertyStatus) => {
        const color: Record<PropertyStatus, string> = {
          disponible: '#FF6C2F',
          loue: '#EF4444',
          reserve: '#F59E0B',
        }
        const bgColor = color[status]
        const label = `${(price / 1000).toFixed(0)}k`

        return L.divIcon({
          className: 'custom-price-marker',
          html: `
            <div style="
              background: ${bgColor};
              color: white;
              font-size: 11px;
              font-weight: 700;
              padding: 4px 10px;
              border-radius: 20px;
              white-space: nowrap;
              border: 2px solid white;
              box-shadow: 0 2px 10px rgba(0,0,0,0.25);
              cursor: pointer;
              transition: transform 0.15s, box-shadow 0.15s;
              font-family: Inter, sans-serif;
              position: relative;
            "
            onmouseover="this.style.transform='scale(1.12)'; this.style.boxShadow='0 4px 16px rgba(0,0,0,0.35)'"
            onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 2px 10px rgba(0,0,0,0.25)'"
            >
              ${label} F
              <div style="
                position: absolute;
                bottom: -5px;
                left: 50%;
                transform: translateX(-50%) rotate(45deg);
                width: 8px;
                height: 8px;
                background: ${bgColor};
                border-right: 2px solid white;
                border-bottom: 2px solid white;
              "></div>
            </div>
          `,
          iconSize: [0, 0],
          iconAnchor: [28, 34],
        })
      }

      // ── Render markers based on zoom level ──────────────────────────────

      const markersLayer = L.layerGroup().addTo(map)

      function renderMarkers() {
        markersLayer.clearLayers()
        const zoom = map.getZoom()
        setMapZoomLevel(zoom)

        if (zoom < 14) {
          // Show cluster markers by commune
          const groups = communeGroups()
          Object.entries(groups).forEach(([commune, props]) => {
            // Calculate centroid of commune's properties (filter out null coords)
            const validProps = props.filter((p) => p.latitude !== null && p.longitude !== null)
            if (validProps.length === 0) return

            const avgLat = validProps.reduce((s, p) => s + (p.latitude ?? 0), 0) / validProps.length
            const avgLng = validProps.reduce((s, p) => s + (p.longitude ?? 0), 0) / validProps.length

            const clusterIcon = createClusterIcon(props.length, commune)
            const marker = L.marker([avgLat, avgLng], { icon: clusterIcon })

            marker.on('click', () => {
              // Zoom into this commune
              const bounds = L.latLngBounds(validProps.map((p) => L.latLng(p.latitude ?? 0, p.longitude ?? 0)))
              map.fitBounds(bounds.pad(0.3), { animate: true, duration: 0.5 })
            })

            marker.addTo(markersLayer)
          })
        } else {
          // Show individual property markers
          properties.forEach((property) => {
            if (property.latitude === null || property.longitude === null) return
            const icon = createPropertyIcon(property.price, property.rentalStatus)
            const marker = L.marker([property.latitude, property.longitude], { icon })

            marker.on('click', () => {
              setSelectedProperty(property)
            })

            marker.addTo(markersLayer)
          })
        }
      }

      // Initial render
      renderMarkers()

      // Re-render on zoom change
      map.on('zoomend', () => {
        renderMarkers()
      })

      // Fit bounds to all properties
      if (properties.length > 0) {
        const allCoords = properties
          .filter((p) => p.latitude !== null && p.longitude !== null)
          .map((p) => L.latLng(p.latitude!, p.longitude!))
        if (allCoords.length > 0) {
          const bounds = L.latLngBounds(allCoords)
          map.fitBounds(bounds.pad(0.15))
        }
      }

      mapInstanceRef.current = map

      // Invalidate size after a short delay
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
  }, [properties, communeGroups])

  // Update markers when properties change
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    // Re-render by triggering zoomend event
    map.fire('zoomend')
  }, [properties])

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
        .custom-price-marker,
        .custom-cluster-marker {
          background: none !important;
          border: none !important;
        }
      `}</style>

      {/* Selected property card overlay */}
      {selectedProperty && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] sm:left-4 sm:translate-x-0"
        >
          <div className="bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden w-72">
            {/* Close button */}
            <button
              onClick={() => setSelectedProperty(null)}
              className="absolute top-2 right-2 z-10 size-6 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white shadow-sm"
              aria-label="Fermer"
            >
              <X className="size-3 text-neutral-500" />
            </button>
            <LeafletPopupCard
              property={selectedProperty}
              onVoirClick={() => {
                if (onPropertyClick) onPropertyClick(selectedProperty)
              }}
            />
          </div>
        </motion.div>
      )}

      {/* Zoom hint */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur-sm rounded-full px-4 py-2 shadow-md border border-neutral-200">
        <p className="text-[11px] text-neutral-600 font-medium flex items-center gap-1.5">
          <MapPin className="size-3 text-brand-500" />
          {mapZoomLevel < 14
            ? 'Cliquez sur un marqueur pour zoomer et voir les détails'
            : 'Cliquez sur un bien pour plus d\'informations'}
        </p>
      </div>

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
