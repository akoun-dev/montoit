'use client'

import { useState, useEffect } from 'react'
import { MapPin } from 'lucide-react'

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

interface PropertyMapProps {
  properties: MapProperty[]
  onPropertyClick?: (property: MapProperty) => void
  userLocation?: { lat: number; lng: number } | null
  searchRadius?: number | null
}

// ── Leaflet-based Map (loaded dynamically) ──────────────────────────────────

export function PropertyMapLeaflet({ properties, onPropertyClick, userLocation, searchRadius }: PropertyMapProps) {
  const [MapComponent, setMapComponent] = useState<React.ComponentType<PropertyMapProps> | null>(null)

  useEffect(() => {
    // Dynamic import of Leaflet map component
    import('./property-map-leaflet').then((mod) => {
      setMapComponent(() => mod.default)
    }).catch(() => {
      // Fallback: create a simple placeholder
      setMapComponent(() => {
        function FallbackMap({ properties: props }: PropertyMapProps) {
          return (
            <div className="w-full h-full bg-neutral-100 rounded-xl flex items-center justify-center">
              <div className="text-center">
                <MapPin className="size-10 text-neutral-300 mx-auto mb-3" />
                <p className="text-sm text-neutral-500">{props.length} biens trouvés</p>
                <p className="text-xs text-neutral-400 mt-1">Carte non disponible</p>
              </div>
            </div>
          )
        }
        return FallbackMap
      })
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

  return <MapComponent properties={properties} onPropertyClick={onPropertyClick} userLocation={userLocation} searchRadius={searchRadius} />
}
