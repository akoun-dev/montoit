import { useState, useEffect, lazy, Suspense, useMemo } from 'react';
import { Map, AlertCircle, MapPin } from 'lucide-react';

const LeafletMap = lazy(() => import('./LeafletMap'));

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
  bedrooms?: number;
  bathrooms?: number;
  surface_area?: number;
}

interface MapWrapperProps {
  center?: [number, number];
  zoom?: number;
  properties: unknown[]; // Accept any shape, will be normalized
  highlightedPropertyId?: string;
  onMarkerClick?: (property: Property) => void;
  onBoundsChange?: (bounds: unknown) => void;
  clustering?: boolean;
  draggableMarker?: boolean;
  showRadius?: boolean;
  radiusKm?: number;
  fitBounds?: boolean;
  height?: string;
  onMapClick?: (lngLat: { lng: number; lat: number }) => void;
  onMarkerDrag?: (lngLat: { lng: number; lat: number }) => void;
  searchEnabled?: boolean;
  singleMarker?: boolean;
  useClusterMode?: boolean;
}

// Normalize property object to match the expected Property interface
function normalizeProperty(property: unknown): Property {
  const p = property as Record<string, unknown>;
  return {
    id: String(p['id'] || ''),
    title: String(p['title'] || p['name'] || ''),
    monthly_rent: Number(p['monthly_rent'] ?? p['price'] ?? p['monthlyRent'] ?? 0),
    longitude: Number(p['longitude'] ?? p['lng'] ?? 0),
    latitude: Number(p['latitude'] ?? p['lat'] ?? 0),
    status: p['status'] as string | undefined,
    images: p['images'] as string[] | undefined,
    city: p['city'] as string | undefined,
    neighborhood: p['neighborhood'] as string | undefined,
    bedrooms: (p['bedrooms'] ?? p['bedrooms_count']) as number | undefined,
    bathrooms: p['bathrooms'] as number | undefined,
    surface_area: (p['surface_area'] ?? p['surface']) as number | undefined,
  };
}

export default function MapWrapper(props: MapWrapperProps) {
  const [, setMapError] = useState(false);
  const [useAzureFallback, setUseAzureFallback] = useState(false);

  // Normalize properties
  const normalizedProperties = useMemo(() => {
    const normalized = props.properties.map(normalizeProperty);
    return normalized;
  }, [props.properties]);

  // Convert normalized properties to LeafletMap format
  const leafletProperties = useMemo(() => {
    const leafletProps = normalizedProperties.map((p) => ({
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
    return leafletProps;
  }, [normalizedProperties]);

  // Handle property click
  const handlePropertyClick = (propertyId: string) => {
    if (props.onMarkerClick) {
      const property = normalizedProperties.find((p) => p.id === propertyId);
      if (property) {
        props.onMarkerClick(property);
      }
    }
  };

  useEffect(() => {
    const handleMapError = () => {
      setMapError(true);
      setUseAzureFallback(true);
    };

    window.addEventListener('leaflet-error', handleMapError);
    return () => window.removeEventListener('leaflet-error', handleMapError);
  }, []);

  if (useAzureFallback) {
    return <AzureMapsComponent {...props} />;
  }

  // Determine center for LeafletMap (swap coordinates because Leaflet expects [lat, lng])
  const leafletCenter: [number, number] | undefined = props.center
    ? [props.center[1], props.center[0]]
    : undefined;

  return (
    <Suspense fallback={<MapLoadingSkeleton height={props.height} />}>
      <div
        onError={() => {
          setMapError(true);
          setUseAzureFallback(true);
        }}
        style={{
          border: '2px solid red',
          backgroundColor: 'yellow',
          height: props.height || '500px',
          position: 'relative',
        }}
      >
        <LeafletMap
          properties={leafletProperties}
          height={props.height || '500px'}
          onPropertyClick={handlePropertyClick}
          showControls={true}
          initialCenter={leafletCenter}
          initialZoom={props.zoom}
        />
      </div>
    </Suspense>
  );
}

function MapLoadingSkeleton({ height = '500px' }: { height?: string }) {
  return (
    <div
      style={{ height }}
      className="relative bg-gradient-to-br from-muted to-muted/80 rounded-lg overflow-hidden animate-pulse flex items-center justify-center"
    >
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-accent/30 rounded-full blur-3xl"></div>
      </div>
      <div className="relative z-10 text-center space-y-4">
        <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto animate-bounce shadow-lg">
          <Map className="h-10 w-10 text-primary-foreground" />
        </div>
        <div className="space-y-2">
          <p className="text-foreground font-bold text-lg">Chargement de la carte...</p>
          <p className="text-muted-foreground text-sm">Préparation de vos propriétés</p>
        </div>
        <div className="flex items-center justify-center space-x-2">
          <MapPin className="h-4 w-4 text-primary animate-pulse" />
          <MapPin
            className="h-4 w-4 text-primary/70 animate-pulse"
            style={{ animationDelay: '0.2s' }}
          />
          <MapPin
            className="h-4 w-4 text-primary/50 animate-pulse"
            style={{ animationDelay: '0.4s' }}
          />
        </div>
      </div>
    </div>
  );
}

function AzureMapsComponent({ properties, height = '500px', onMarkerClick }: MapWrapperProps) {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  const normalizedProperties = useMemo(() => {
    return properties.map(normalizeProperty);
  }, [properties]);

  const handleMarkerClick = (property: Property) => {
    setSelectedProperty(property);
    if (onMarkerClick) {
      onMarkerClick(property);
    }
  };

  return (
    <div
      style={{ height }}
      className="relative bg-gradient-to-br from-muted to-accent/20 rounded-lg overflow-hidden border-2 border-border"
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center p-8 max-w-2xl">
          <div className="bg-card rounded-2xl shadow-xl p-8 mb-6">
            <div className="bg-primary rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <Map className="h-10 w-10 text-primary-foreground" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-3">Carte non disponible</h3>
            <p className="text-muted-foreground mb-4">
              Le service de cartographie n'est pas accessible pour le moment.
            </p>
            <div className="flex items-center justify-center space-x-2 text-sm text-primary bg-primary/10 px-4 py-2 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              <span>Vérifiez la configuration de la carte</span>
            </div>
          </div>

          {normalizedProperties.length > 0 && (
            <div className="bg-card rounded-2xl shadow-lg p-6">
              <h4 className="font-bold text-lg mb-4 text-foreground">
                {normalizedProperties.length} propriété{normalizedProperties.length > 1 ? 's' : ''}{' '}
                disponible
                {normalizedProperties.length > 1 ? 's' : ''}
              </h4>
              <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
                {normalizedProperties.slice(0, 5).map((property) => (
                  <button
                    key={property.id}
                    onClick={() => handleMarkerClick(property)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      selectedProperty?.id === property.id
                        ? 'border-primary bg-primary/10 shadow-lg'
                        : 'border-border hover:border-primary/50 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="bg-primary text-primary-foreground rounded-lg p-2 flex-shrink-0">
                        <Map className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-foreground truncate mb-1">
                          {property.title}
                        </h5>
                        <p className="text-sm text-muted-foreground mb-2">
                          {property.city}
                          {property.neighborhood && `, ${property.neighborhood}`}
                        </p>
                        <p className="text-lg font-bold text-primary">
                          {property.monthly_rent.toLocaleString()} FCFA/mois
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {normalizedProperties.length > 5 && (
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  + {normalizedProperties.length - 5} autre
                  {normalizedProperties.length - 5 > 1 ? 's' : ''} propriété
                  {normalizedProperties.length - 5 > 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
