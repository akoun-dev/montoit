'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, BedDouble, Maximize, BadgeCheck, ArrowRight, X, Star, Navigation, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useGeolocation } from '@/hooks/capacitor/use-geolocation'

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
  userLocation?: { lat: number; lng: number } | null
  searchRadius?: number | null
}

// ── Property type icons ────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, string> = {
  APPARTEMENT: '\u{1F3E0}',
  STUDIO: '\u{1F3E0}',
  VILLA: '\u{1F3E1}',
  DUPLEX: '\u{1F3E2}',
  PENTHOUSE: '\u{1F3E2}',
  CHAMBRE: '\u{1F6CF}',
  TERRAIN: '\u{1F3D4}',
  LOCAL_COMMERCIAL: '\u{1F3EA}',
}

// ── Helper ──────────────────────────────────────────────────────────────────

function getMapPropertyLocation(property: MapProperty): string {
  if (property.commune) {
    return `${property.address}, ${property.commune}`
  }
  return property.address
}

function getTypeIcon(property: MapProperty): string {
  return TYPE_ICONS[property.type] || '\u{1F3E0}'
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
          <div className="w-full h-full bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center">
            <span className="text-3xl">{getTypeIcon(property)}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
          <Badge className={`border-0 text-[9px] font-semibold px-1.5 py-0 ${statusConfig[property.rentalStatus].className}`}>
            {statusConfig[property.rentalStatus].label}
          </Badge>
          {property.isFurnished && (
            <Badge className="border-0 text-[9px] font-medium px-1.5 py-0 bg-sky-500/90 text-white">
              Meublé
            </Badge>
          )}
        </div>
        {/* Type icon overlay */}
        <div className="absolute top-1.5 right-1.5 bg-black/30 backdrop-blur-sm rounded-full px-1.5 py-0.5 text-xs leading-none">
          <span>{getTypeIcon(property)}</span>
        </div>
      </div>
      <div className="p-2.5">
        <h3 className="font-semibold text-foreground text-[11px] mb-0.5 line-clamp-1">{property.title}</h3>
        <div className="flex items-center gap-1 text-muted-foreground text-[10px] mb-1.5">
          <MapPin className="size-2.5 shrink-0 text-brand-500" />
          <span className="line-clamp-1">{location}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-2">
          {property.bedrooms !== null && (
            <div className="flex items-center gap-0.5 bg-muted rounded-full px-1.5 py-0.5">
              <BedDouble className="size-2.5 text-muted-foreground" />
              <span>{property.bedrooms} pièce{property.bedrooms > 1 ? 's' : ''}</span>
            </div>
          )}
          <div className="flex items-center gap-0.5 bg-muted rounded-full px-1.5 py-0.5">
            <Maximize className="size-2.5 text-muted-foreground" />
            <span>{property.area} m²</span>
          </div>
          {property.isVerified && (
            <BadgeCheck className="size-3 text-brand-500" />
          )}
        </div>
        <div className="flex items-center justify-between pt-1.5 border-t border-border">
          <p className="text-xs font-bold text-brand-500">
            {property.price.toLocaleString('fr-FR')} <span className="text-[9px] font-normal text-muted-foreground">F CFA/mois</span>
          </p>
          <Button
            variant="outline"
            size="sm"
            className="text-brand-500 border-brand-200 hover:bg-brand-50 hover:text-brand-600 text-[9px] h-6 px-2 rounded-lg transition-all"
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

export default function PropertyMapLeaflet({ properties, onPropertyClick, userLocation, searchRadius }: PropertyMapLeafletProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const [selectedProperty, setSelectedProperty] = useState<MapProperty | null>(null)
  const [mapZoomLevel, setMapZoomLevel] = useState(12)
  const [internalUserLocation, setInternalUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const hasAutoCenteredRef = useRef(false)
  const isTransitioningRef = useRef(false)
  const userFlyInProgressRef = useRef(false)
  const userMarkerLayerRef = useRef<L.LayerGroup | null>(null)
  const userMarkerRenderFnRef = useRef<((loc: { lat: number; lng: number } | null, radius: number | null) => void) | null>(null)

  // Geolocation hook for auto-detection (only when userLocation prop is not provided)
  const geo = useGeolocation({ enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 })

  // Effective location: prop overrides auto-detected location
  const effectiveUserLocation = userLocation ?? internalUserLocation

  // Auto-detect position on mount when parent doesn't provide userLocation
  useEffect(() => {
    if (!userLocation && !internalUserLocation) {
      geo.getCurrentPosition()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When geolocation hook obtains a position (and no prop overrides), update internal state
  useEffect(() => {
    if (userLocation) return // parent controls location
    if (!geo.position) return

    const newLoc = {
      lat: geo.position.coords.latitude,
      lng: geo.position.coords.longitude,
    }
    setInternalUserLocation(newLoc)
  }, [geo.position, userLocation])

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

  // Compute price range for a group
  function getPriceRange(props: MapProperty[]): string {
    const prices = props.map(p => p.price).filter(p => p > 0)
    if (prices.length === 0) return ''
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    if (min === max) return `${(min / 1000).toFixed(0)}k`
    return `${(min / 1000).toFixed(0)}k - ${(max / 1000).toFixed(0)}k`
  }

  function getGroupTypes(props: MapProperty[]): string[] {
    const types = new Set(props.map(p => p.type))
    return Array.from(types)
  }

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
        fadeAnimation: true,
        zoomAnimation: true,
        markerZoomAnimation: true,
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
      const createClusterIcon = (count: number, commune: string, priceRange: string, types: string[]) => {
        const size = count > 10 ? 56 : count > 5 ? 50 : count > 3 ? 44 : 38
        const bgColor = count > 5 ? '#FF6C2F' : '#FF8C5A'

        const typeIcons = types.slice(0, 3).map(t => TYPE_ICONS[t] || '').join(' ')
        const iconHtml = typeIcons || '\u{1F3E0}'

        return L.divIcon({
          className: 'custom-cluster-marker animated-marker',
          html: `
            <div class="cluster-marker-container" style="
              position: relative;
              width: ${size}px;
              height: ${size + 18}px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              animation: markerEntrance 0.4s ease-out both;
            ">
              <div class="cluster-marker-circle" style="
                width: ${size}px;
                height: ${size}px;
                border-radius: 50%;
                background: linear-gradient(135deg, ${bgColor}, #FF6C2F);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                border: 3px solid white;
                box-shadow: 0 3px 15px rgba(255,108,47,0.4), 0 0 0 1px rgba(255,108,47,0.15);
                transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease;
                position: relative;
                overflow: hidden;
              ">
                <div class="cluster-inner-glow" style="
                  position: absolute;
                  top: -30%;
                  left: -30%;
                  width: 80%;
                  height: 80%;
                  background: radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%);
                  border-radius: 50%;
                "></div>
                <span style="color: white; font-size: ${count > 9 ? 14 : 16}px; font-weight: 800; line-height: 1; position: relative;">${count}</span>
                <span style="color: rgba(255,255,255,0.85); font-size: 6px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-top: -1px; position: relative;">biens</span>
              </div>
              <div class="cluster-label" style="
                margin-top: 4px;
                padding: 0 8px;
                height: 18px;
                display: flex;
                align-items: center;
                gap: 4px;
                background: rgba(0,0,0,0.7);
                backdrop-filter: blur(4px);
                color: white;
                font-size: 8px;
                font-weight: 600;
                border-radius: 9px;
                white-space: nowrap;
                border: 1.5px solid rgba(255,255,255,0.3);
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
              ">
                <span>${iconHtml}</span>
                <span>${commune}</span>
                ${priceRange ? `<span style="opacity:0.7;font-weight:400;">· ${priceRange}</span>` : ''}
              </div>
            </div>
          `,
          iconSize: [size + 12, size + 28],
          iconAnchor: [(size + 12) / 2, size + 20],
        })
      }

      // Individual property marker: shows price with type icon
      const createPropertyIcon = (price: number, status: PropertyStatus, propertyType: string) => {
        const color: Record<PropertyStatus, string> = {
          disponible: '#FF6C2F',
          loue: '#EF4444',
          reserve: '#F59E0B',
        }
        const bgColor = color[status]
        const label = `${(price / 1000).toFixed(0)}k`
        const typeIcon = TYPE_ICONS[propertyType] || ''

        return L.divIcon({
          className: 'custom-price-marker animated-marker',
          html: `
            <div class="price-marker-container" style="
              position: relative;
              display: flex;
              flex-direction: column;
              align-items: center;
              animation: markerEntrance 0.35s ease-out both;
            ">
              <div class="price-marker-bubble" style="
                background: linear-gradient(135deg, ${bgColor}, ${bgColor}dd);
                color: white;
                font-size: 11px;
                font-weight: 700;
                padding: 5px 12px;
                border-radius: 20px;
                white-space: nowrap;
                border: 2.5px solid white;
                box-shadow: 0 3px 12px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.15);
                cursor: pointer;
                transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease, background 0.2s ease;
                font-family: Inter, system-ui, sans-serif;
                display: flex;
                align-items: center;
                gap: 4px;
                position: relative;
              ">
                ${typeIcon ? `<span style="font-size: 12px;">${typeIcon}</span>` : ''}
                <span>${label} F</span>
                <div class="price-arrow" style="
                  position: absolute;
                  bottom: -6px;
                  left: 50%;
                  transform: translateX(-50%) rotate(45deg);
                  width: 10px;
                  height: 10px;
                  background: ${bgColor}dd;
                  border-right: 2.5px solid white;
                  border-bottom: 2.5px solid white;
                  border-radius: 0 0 2px 0;
                "></div>
              </div>
            </div>
          `,
          iconSize: [0, 0],
          iconAnchor: [32, 40],
        })
      }

      // ── User location marker ────────────────────────────────────────────

      const userMarkerLayer = L.layerGroup().addTo(map)
      userMarkerLayerRef.current = userMarkerLayer

      function renderUserLocation(loc: { lat: number; lng: number } | null, radius: number | null) {
        const layer = userMarkerLayerRef.current
        if (!layer || !loc) return
        layer.clearLayers()

        // Pulsing blue dot
        const userIcon = L.divIcon({
          className: 'user-location-marker',
          html: `
            <div style="position: relative; width: 28px; height: 28px;">
              <div class="user-pulse-ring" style="
                position: absolute;
                top: 50%; left: 50%;
                transform: translate(-50%, -50%);
                width: 28px; height: 28px;
                border-radius: 50%;
                background: rgba(59, 130, 246, 0.2);
              "></div>
              <div class="user-dot" style="
                position: absolute;
                top: 50%; left: 50%;
                transform: translate(-50%, -50%);
                width: 16px; height: 16px;
                border-radius: 50%;
                background: linear-gradient(135deg, #60A5FA, #3B82F6);
                border: 3px solid white;
                box-shadow: 0 2px 8px rgba(59, 130, 246, 0.5);
                animation: userPulse 2s ease-in-out infinite;
              "></div>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        })

        const userMarker = L.marker([loc.lat, loc.lng], { icon: userIcon, zIndexOffset: 1000 })
        userMarker.addTo(layer)

        // Radius circle
        if (radius) {
          const circle = L.circle([loc.lat, loc.lng], {
            radius: radius * 1000,
            color: '#3B82F6',
            fillColor: '#3B82F6',
            fillOpacity: 0.06,
            weight: 2,
            dashArray: '6 4',
            opacity: 0.4,
          })
          circle.addTo(layer)
        }
      }

      userMarkerRenderFnRef.current = (loc: { lat: number; lng: number } | null, radius: number | null) => renderUserLocation(loc, radius)

      // ── Render markers based on zoom level ──────────────────────────────

      const markersLayer = L.layerGroup().addTo(map)

      function renderMarkers() {
        markersLayer.clearLayers()
        const zoom = map.getZoom()
        setMapZoomLevel(zoom)

        if (zoom < 14) {
          // Show cluster markers by commune
          const groups = communeGroups()
          let delay = 0
          Object.entries(groups).forEach(([commune, props]) => {
            const validProps = props.filter((p) => p.latitude !== null && p.longitude !== null)
            if (validProps.length === 0) return

            const avgLat = validProps.reduce((s, p) => s + (p.latitude ?? 0), 0) / validProps.length
            const avgLng = validProps.reduce((s, p) => s + (p.longitude ?? 0), 0) / validProps.length
            const priceRange = getPriceRange(props)
            const types = getGroupTypes(props)

            const clusterIcon = createClusterIcon(props.length, commune, priceRange, types)
            const marker = L.marker([avgLat, avgLng], { icon: clusterIcon })

            marker.on('click', () => {
              if (isTransitioningRef.current) return
              isTransitioningRef.current = true
              const bounds = L.latLngBounds(validProps.map((p) => L.latLng(p.latitude ?? 0, p.longitude ?? 0)))
              map.flyToBounds(bounds.pad(0.3), {
                animate: true,
                duration: 0.6,
                easeLinearity: 0.3,
              })
              setTimeout(() => { isTransitioningRef.current = false }, 700)
            })

            // Add entrance delay for staggered animation (set after marker is rendered)
            const currentDelay = delay
            marker.on('add', () => {
              const el = marker.getElement()
              if (el) {
                (el as HTMLElement).style.animationDelay = `${currentDelay * 0.08}s`
              }
            })
            delay++

            marker.addTo(markersLayer)
          })
        } else {
          // Show individual property markers
          properties.forEach((property, idx) => {
            if (property.latitude === null || property.longitude === null) return
            const icon = createPropertyIcon(property.price, property.rentalStatus, property.type)
            const marker = L.marker([property.latitude, property.longitude], { icon })

            marker.on('click', () => {
              setSelectedProperty(property)
            })

            // Staggered animation delay (set after marker is rendered)
            const currentIdx = idx
            marker.on('add', () => {
              const el = marker.getElement()
              if (el) {
                (el as HTMLElement).style.animationDelay = `${currentIdx * 0.05}s`
              }
            })

            marker.addTo(markersLayer)
          })
        }
      }

      // Initial render
      renderMarkers()
      renderUserLocation(effectiveUserLocation, searchRadius ?? null)

      // Re-render on zoom change with smooth transition
      map.on('zoomstart', () => {
        isTransitioningRef.current = true
      })

      map.on('zoomend', () => {
        setTimeout(() => {
          renderMarkers()
          isTransitioningRef.current = false
        }, 100)
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
  }, [properties, communeGroups, searchRadius])

  // Update markers when properties change
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return
    setTimeout(() => {
      map.fire('zoomend')
    }, 50)
  }, [properties])

  // Update user marker and fly to location when user location changes
  useEffect(() => {
    const loc = userLocation ?? internalUserLocation
    if (!loc) return

    // Re-render the user marker with the latest location and radius
    userMarkerRenderFnRef.current?.(loc, searchRadius ?? null)

    // Fly to location on first auto-detection only (not when parent provides it)
    if (!hasAutoCenteredRef.current && !userLocation) {
      const map = mapInstanceRef.current
      if (map) {
        hasAutoCenteredRef.current = true
        map.flyTo([loc.lat, loc.lng], 14, {
          animate: true,
          duration: 0.8,
        })
      }
    }
  }, [userLocation, internalUserLocation, searchRadius])

  return (
    <div className="relative w-full h-full">
      {/* Leaflet map container */}
      <div
        ref={mapRef}
        className="w-full h-full rounded-xl overflow-hidden"
        style={{ minHeight: '500px' }}
      />

      {/* Centrer sur ma position button (only when we have a location) */}
      {effectiveUserLocation && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            const map = mapInstanceRef.current
            if (!map) return
            userFlyInProgressRef.current = true
            map.flyTo([effectiveUserLocation.lat, effectiveUserLocation.lng], 14, {
              animate: true,
              duration: 0.8,
            })
            setTimeout(() => { userFlyInProgressRef.current = false }, 1200)
          }}
          className="absolute top-4 right-4 z-[1000] flex items-center gap-1.5 bg-card/95 backdrop-blur-md rounded-full px-3.5 py-2 shadow-lg border border-border hover:bg-accent transition-colors"
          aria-label="Centrer sur ma position"
        >
          <Navigation className="size-4 text-brand-500" />
          <span className="text-xs font-semibold text-foreground hidden sm:inline">Centrer</span>
        </motion.button>
      )}

      {/* Loading indicator when getting position */}
      {geo.isLoading && !effectiveUserLocation && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]"
        >
          <div className="flex items-center gap-2 bg-card/95 backdrop-blur-md rounded-full px-4 py-2 shadow-lg border border-border">
            <Loader2 className="size-3.5 text-brand-500 animate-spin" />
            <span className="text-xs text-muted-foreground font-medium">Recherche de votre position...</span>
          </div>
        </motion.div>
      )}

      {/* Leaflet CSS overrides */}
      <style jsx global>{`
        .leaflet-popup-content-wrapper {
          border-radius: 12px !important;
          padding: 0 !important;
          overflow: hidden !important;
          box-shadow: 0 8px 30px rgba(0,0,0,0.15) !important;
          animation: popupEntrance 0.3s ease-out;
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
        .custom-cluster-marker,
        .user-location-marker {
          background: none !important;
          border: none !important;
        }
        .cluster-marker-container:hover .cluster-marker-circle {
          transform: scale(1.12) !important;
          box-shadow: 0 5px 20px rgba(255,108,47,0.5), 0 0 0 2px rgba(255,108,47,0.3) !important;
        }
        .price-marker-container:hover .price-marker-bubble {
          transform: scale(1.1) !important;
          box-shadow: 0 5px 18px rgba(0,0,0,0.3) !important;
        }

        @keyframes markerEntrance {
          0% {
            opacity: 0;
            transform: scale(0) translateY(10px);
          }
          60% {
            opacity: 1;
            transform: scale(1.15) translateY(-2px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0px);
          }
        }

        @keyframes popupEntrance {
          0% {
            opacity: 0;
            transform: translateY(10px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes userPulse {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.5);
          }
          50% {
            transform: translate(-50%, -50%) scale(1.25);
            box-shadow: 0 2px 16px rgba(59, 130, 246, 0.4);
          }
        }

        .user-pulse-ring {
          animation: userPulseRing 2s ease-in-out infinite;
        }

        @keyframes userPulseRing {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.6;
          }
          50% {
            transform: translate(-50%, -50%) scale(2);
            opacity: 0;
          }
        }

        /* Smooth zoom transition */
        .leaflet-zoom-anim .leaflet-zoom-animated {
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }

        /* Improved zoom controls */
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 2px 12px rgba(0,0,0,0.15) !important;
          border-radius: 10px !important;
          overflow: hidden !important;
        }
        .leaflet-control-zoom a {
          width: 36px !important;
          height: 36px !important;
          line-height: 36px !important;
          font-size: 16px !important;
          border: none !important;
          background: white !important;
          color: #374151 !important;
          font-weight: 700 !important;
          transition: background 0.15s !important;
        }
        .leaflet-control-zoom a:hover {
          background: #F9FAFB !important;
          color: #FF6C2F !important;
        }
        .leaflet-control-zoom a.leaflet-control-zoom-in {
          border-bottom: 1px solid #F3F4F6 !important;
        }
      `}</style>

      {/* Selected property card overlay */}
      <AnimatePresence>
        {selectedProperty && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] sm:left-4 sm:translate-x-0 sm:bottom-6"
          >
            <div className="bg-card rounded-xl shadow-2xl border border-border overflow-hidden w-72 sm:w-64">
              {/* Close button */}
              <button
                onClick={() => setSelectedProperty(null)}
                className="absolute top-2 right-2 z-10 size-6 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center hover:bg-card shadow-sm hover:shadow-md transition-all"
                aria-label="Fermer"
              >
                <X className="size-3 text-muted-foreground" />
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
      </AnimatePresence>

      {/* Zoom hint */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]"
      >
        <div className="bg-card/90 backdrop-blur-md rounded-full px-4 py-2 shadow-lg border border-border">
          <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
            <MapPin className="size-3 text-brand-500" />
            {mapZoomLevel < 14
              ? properties.length > 0
                ? 'Cliquez sur un groupe pour voir les biens du quartier'
                : 'Aucun bien à afficher sur la carte'
              : 'Cliquez sur un marqueur pour voir les détails'}
          </p>
        </div>
      </motion.div>

      {/* Legend */}
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="absolute bottom-4 right-4 z-[1000] sm:right-14 bg-card/90 backdrop-blur-md rounded-xl shadow-lg border border-border px-3 py-2.5"
      >
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Légende</p>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#FF6C2F]" />
            <span className="text-[10px] text-muted-foreground">Disponible</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-red-500" />
            <span className="text-[10px] text-muted-foreground">Loué</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-amber-500" />
            <span className="text-[10px] text-muted-foreground">Réservé</span>
          </div>
        </div>
      </motion.div>

      {/* Property count */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="absolute top-4 left-4 z-[1000]"
      >
        <div className="bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-full px-4 py-1.5 shadow-lg text-xs font-semibold flex items-center gap-1.5">
          <Star className="size-3" />
          {properties.length} bien{properties.length !== 1 ? 's' : ''}
        </div>
      </motion.div>
    </div>
  )
}
