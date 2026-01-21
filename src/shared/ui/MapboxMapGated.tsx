import { useFeatureFlag } from '@/hooks/shared/useFeatureFlag';
import LeafletMap from './LeafletMap';
import { MapPin, Loader2 } from 'lucide-react';
import { useMemo } from 'react';

interface Property {
  id: string;
  title: string;
  monthly_rent: number;
  longitude: number;
  latitude: number;
  status?: string;
  images?: string[];
  city?: string;
  neighborhood?: string;
  main_image?: string;
  bedrooms?: number;
  surface_area?: number;
}

interface MapboxMapGatedProps {
  center?: [number, number];
  zoom?: number;
  properties?: Property[];
  highlightedPropertyId?: string;
  onMarkerClick?: (property: Property) => void;
  height?: string;
  fallbackMessage?: string;
}

/**
 * Fallback simple quand les cartes sont désactivées
 */
function MapFallback({ height = '400px' }: { height?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center bg-muted/30 rounded-xl border-2 border-dashed border-muted-foreground/20"
      style={{ height }}
    >
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <MapPin className="w-8 h-8 text-primary" />
      </div>
      <p className="text-muted-foreground font-medium">Carte non disponible</p>
      <p className="text-sm text-muted-foreground/70 mt-1">
        La fonctionnalité cartographique sera bientôt activée
      </p>
    </div>
  );
}

/**
 * Loading state pour la carte
 */
function MapLoading({ height = '400px' }: { height?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center bg-muted/20 rounded-xl animate-pulse"
      style={{ height }}
    >
      <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
      <p className="text-sm text-muted-foreground">Chargement de la carte...</p>
    </div>
  );
}

/**
 * Composant carte principal utilisant OpenStreetMap (Leaflet)
 * Wrapper avec feature flag pour activer/désactiver les cartes
 */
export default function MapboxMapGated({
  height,
  properties,
  onMarkerClick,
  center,
  zoom,
}: MapboxMapGatedProps) {
  const { isEnabled, isLoading, error } = useFeatureFlag('mapbox_maps');

  // Convertir les propriétés pour Leaflet (format différent)
  const leafletProperties = useMemo(() => {
    if (!properties) return [];
    return properties.map((p) => ({
      id: p.id,
      title: p.title,
      city: p.city || '',
      price: p.monthly_rent,
      latitude: p.latitude,
      longitude: p.longitude,
      images: p.images,
      property_type: undefined,
      bedrooms: p.bedrooms,
      surface_area: p.surface_area,
    }));
  }, [properties]);

  // Log pour diagnostic (DEV only)
  if (import.meta.env.DEV) {
    console.log('[MapboxMapGated] Feature flag state:', {
      feature: 'mapbox_maps',
      isEnabled,
      isLoading,
      error: error?.message,
      propertiesCount: properties?.length || 0,
    });
  }

  // État de chargement du feature flag
  if (isLoading) {
    return <MapLoading height={height} />;
  }

  // Feature flag désactivé
  if (!isEnabled && !error) {
    if (import.meta.env.DEV) {
      console.log('[MapboxMapGated] Feature disabled, showing fallback');
    }
    return <MapFallback height={height} />;
  }

  // Afficher la carte Leaflet (OpenStreetMap)
  return (
    <LeafletMap
      properties={leafletProperties}
      height={height}
      onPropertyClick={(id) => {
        const prop = properties?.find((p) => p.id === id);
        if (prop && onMarkerClick) onMarkerClick(prop);
      }}
      showControls={true}
      initialCenter={center ? [center[1], center[0]] : undefined}
      initialZoom={zoom}
    />
  );
}
