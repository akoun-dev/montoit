import React, { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation2, Focus, Loader2 } from 'lucide-react';

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface Property {
  id: string;
  title: string;
  city: string;
  price: number;
  latitude?: number | null;
  longitude?: number | null;
  images?: string[];
  property_type?: string;
  bedrooms?: number;
  surface_area?: number;
}

interface LeafletMapProps {
  properties?: Property[];
  height?: string;
  onPropertyClick?: (propertyId: string) => void;
  showControls?: boolean;
  initialCenter?: [number, number];
  initialZoom?: number;
}

const LeafletMap: React.FC<LeafletMapProps> = ({
  properties = [],
  height = '500px',
  onPropertyClick,
  showControls = true,
  initialCenter = [5.36, -4.0083], // Abidjan par défaut
  initialZoom = 12,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Leaflet internal panes can be undefined during teardown; guard access
  const getActiveMap = useCallback(() => {
    const map = mapRef.current;
    if (!map) return null;
    // @ts-expect-error Internal Leaflet field used to ensure map is not torn down
    if (!map._mapPane) return null;
    return map;
  }, []);

  // Filtrer les propriétés avec coordonnées valides
  const validProperties = properties.filter(
    (p) =>
      p.latitude &&
      p.longitude &&
      !isNaN(p.latitude) &&
      !isNaN(p.longitude) &&
      p.latitude >= -90 &&
      p.latitude <= 90 &&
      p.longitude >= -180 &&
      p.longitude <= 180
  );

  // Initialiser la carte
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Créer la carte
    mapRef.current = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: showControls,
    });

    // Ajouter le layer OpenStreetMap avec gestion d'erreur
    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(mapRef.current);

    setMapLoaded(true);

    return () => {
      if (mapRef.current) {
        // Stop ongoing animations before removing to avoid Leaflet zoom race errors
        mapRef.current.stop();
        mapRef.current.off();
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [initialCenter, initialZoom, showControls]);

  // Gérer les marqueurs
  useEffect(() => {
    const activeMap = getActiveMap();
    if (!activeMap || !mapLoaded) return;

    // Supprimer les anciens marqueurs
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    if (validProperties.length === 0) return;

    // Créer une icône personnalisée orange
    const customIcon = L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background: linear-gradient(135deg, #F16522 0%, #ea580c 100%);
          width: 32px;
          height: 32px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            transform: rotate(45deg);
            color: white;
            font-size: 14px;
            font-weight: bold;
          ">🏠</div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });

    // Ajouter les marqueurs
    validProperties.forEach((property) => {
      if (!property.latitude || !property.longitude) return;

      const marker = L.marker([property.latitude, property.longitude], {
        icon: customIcon,
      });

      // Créer le popup
      const popupContent = `
        <div style="min-width: 200px; font-family: Inter, sans-serif;">
          ${
            property.images?.[0]
              ? `
            <img 
              src="${property.images[0]}" 
              alt="${property.title}"
              style="width: 100%; height: 100px; object-fit: cover; border-radius: 8px 8px 0 0;"
            />
          `
              : ''
          }
          <div style="padding: 12px;">
            <h3 style="font-size: 14px; font-weight: 600; margin: 0 0 4px 0; color: #2C1810;">
              ${property.title}
            </h3>
            <p style="font-size: 12px; color: #666; margin: 0 0 8px 0;">
              📍 ${property.city}
            </p>
            <p style="font-size: 16px; font-weight: 700; color: #F16522; margin: 0;">
              ${new Intl.NumberFormat('fr-FR').format(property.price)} FCFA/mois
            </p>
            ${
              property.bedrooms || property.surface_area
                ? `
              <p style="font-size: 11px; color: #888; margin: 8px 0 0 0;">
                ${property.bedrooms ? `🛏️ ${property.bedrooms} ch.` : ''}
                ${property.surface_area ? ` • 📐 ${property.surface_area} m²` : ''}
              </p>
            `
                : ''
            }
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        maxWidth: 280,
        className: 'custom-popup',
      });

      // Click handler
      marker.on('click', () => {
        if (onPropertyClick) {
          onPropertyClick(property.id);
        }
      });

      marker.addTo(activeMap);
      markersRef.current.push(marker);
    });

    // Ajuster la vue pour montrer tous les marqueurs
    if (validProperties.length > 0) {
      const bounds = L.latLngBounds(
        validProperties
          .filter((p) => p.latitude && p.longitude)
          .map((p) => [p.latitude!, p.longitude!] as [number, number])
      );
      activeMap.fitBounds(bounds, { padding: [50, 50], maxZoom: 14, animate: false });
    }
  }, [validProperties, mapLoaded, onPropertyClick, getActiveMap]);

  // Géolocalisation
  const handleLocateUser = () => {
    const activeMap = getActiveMap();
    if (!activeMap) return;

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        activeMap.setView([latitude, longitude], 14, { animate: false });

        // Ajouter un marqueur pour la position de l'utilisateur
        L.circleMarker([latitude, longitude], {
          radius: 10,
          fillColor: '#4285F4',
          color: '#fff',
          weight: 3,
          opacity: 1,
          fillOpacity: 0.8,
        }).addTo(activeMap);

        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="relative w-full" style={{ height }}>
      {/* Carte */}
      <div ref={mapContainerRef} className="absolute inset-0 rounded-xl overflow-hidden" />

      {/* Badge carte */}
      <div className="absolute top-3 left-3 z-[1000]">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-background/95 backdrop-blur-sm rounded-full shadow-md border border-border/50">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium text-foreground">
            {validProperties.length} bien{validProperties.length > 1 ? 's' : ''} sur la carte
          </span>
        </div>
      </div>

      {/* Contrôles personnalisés */}
      {showControls && (
        <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2">
          <button
            onClick={handleLocateUser}
            disabled={isLocating}
            className="p-3 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Ma position"
          >
            {isLocating ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            ) : (
              <Navigation2 className="w-5 h-5 text-primary" />
            )}
          </button>
          <button
            onClick={() => {
              if (mapRef.current && validProperties.length > 0) {
                const bounds = L.latLngBounds(
                  validProperties
                    .filter((p) => p.latitude && p.longitude)
                    .map((p) => [p.latitude!, p.longitude!] as [number, number])
                );
                mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14, animate: false });
              }
            }}
            className="p-3 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
            title="Voir tous les biens"
          >
            <Focus className="w-5 h-5 text-primary" />
          </button>
        </div>
      )}

      {/* Loading indicator */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-xl">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      )}

      {/* Style personnalisé pour les popups */}
      <style>{`
        .custom-popup .leaflet-popup-content-wrapper {
          padding: 0;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        .custom-popup .leaflet-popup-content {
          margin: 0;
        }
        .custom-popup .leaflet-popup-tip {
          background: white;
        }
        .custom-marker {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
};

export default LeafletMap;
