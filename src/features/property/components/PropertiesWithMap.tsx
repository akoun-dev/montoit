import { useState, useMemo, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, Bed, Bath, Maximize, Heart, X } from 'lucide-react';
import { ScoreBadge } from '@/shared/ui/ScoreBadge';
import PropertyModal from './PropertyModal';
import type { PropertyWithOwnerScore } from '../types';

// Lazy load MapWrapper for performance
const MapWrapper = lazy(() => import('@/shared/ui/MapWrapper'));

export interface PropertyFilters {
  type: string;
  location: string;
  maxPrice: number;
}

interface PropertiesWithMapProps {
  properties: PropertyWithOwnerScore[];
  isLoading?: boolean;
  isVisible?: boolean;
  filters?: PropertyFilters;
  onResetFilters?: () => void;
}

const FALLBACK_PROPERTY_IMAGES = [
  '/images/hero/hero_example_1_riviera_luxury.png',
  '/images/hero/hero_example_3_plateau_lagoon.png',
  '/images/hero/hero_example_2_cocody_family.webp',
];

const FALLBACK_IMAGE = '/images/hero-villa-cocody.jpg';

function handleImageError(e: React.SyntheticEvent<HTMLImageElement>) {
  const target = e.target as HTMLImageElement;
  if (target.src !== FALLBACK_IMAGE) {
    target.src = FALLBACK_IMAGE;
  }
}

// Property Card with modal trigger
function PropertyCard({
  property,
  index,
  onSelect,
}: {
  property: PropertyWithOwnerScore;
  index: number;
  onSelect: () => void;
}) {
  const displayImage =
    property.images?.[0] ||
    property.main_image ||
    FALLBACK_PROPERTY_IMAGES[index % FALLBACK_PROPERTY_IMAGES.length];

  return (
    <div
      onClick={onSelect}
      className="group block bg-white rounded-[24px] overflow-hidden border border-transparent hover:border-border shadow-sm hover:shadow-lg transition-all duration-500 ease-out hover:-translate-y-2 cursor-pointer animate-in fade-in slide-in-from-bottom-4"
      style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={displayImage}
          alt={property.title || 'Propriété Mon Toit'}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
          onError={handleImageError}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 transition-opacity group-hover:opacity-40" />

        {/* Badge */}
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1.5 bg-white/95 backdrop-blur-md text-foreground text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm">
            {property.property_type || 'Bien'}
          </span>
        </div>

        <button
          onClick={(e) => e.stopPropagation()}
          className="absolute top-4 right-4 p-2.5 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white hover:text-primary transition-all transform hover:scale-110 active:scale-95"
        >
          <Heart className="h-5 w-5 fill-transparent hover:fill-current transition-colors" />
        </button>

        {/* Price */}
        <div className="absolute bottom-4 left-4">
          <div className="flex items-baseline gap-1 bg-foreground/90 backdrop-blur-md px-4 py-2 rounded-xl text-background shadow-lg border border-white/10">
            <span className="text-lg font-bold tracking-tight">
              {property.monthly_rent?.toLocaleString('fr-FR') || 'N/A'}
            </span>
            <span className="text-[10px] font-medium opacity-80">FCFA/mois</span>
          </div>
        </div>

        {property.owner_trust_score != null && (
          <div className="absolute bottom-4 right-4">
            <ScoreBadge score={property.owner_trust_score} variant="compact" size="sm" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-bold text-foreground leading-tight group-hover:text-primary transition-colors line-clamp-1 mb-2">
          {property.title || 'Appartement de standing'}
        </h3>

        <div className="flex items-center gap-2 text-muted-foreground mb-4 text-sm">
          <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="line-clamp-1">
            {property.neighborhood ? `${property.neighborhood}, ` : ''}
            {property.city || 'Abidjan'}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground pt-4 border-t border-border">
          <div className="flex items-center gap-1.5">
            <Bed className="h-4 w-4" />
            <span>{property.bedrooms || '-'} ch.</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Bath className="h-4 w-4" />
            <span>{property.bathrooms || '-'} sdb</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Maximize className="h-4 w-4" />
            <span>{property.surface_area || '-'} m²</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Map Loading Skeleton
function MapSkeleton() {
  return (
    <div className="w-full h-full bg-secondary animate-pulse rounded-[32px] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 bg-primary/20 rounded-2xl mx-auto flex items-center justify-center">
          <MapPin className="w-8 h-8 text-primary" />
        </div>
        <p className="text-muted-foreground font-medium">Chargement de la carte...</p>
      </div>
    </div>
  );
}

export default function PropertiesWithMap({
  properties,
  isLoading = false,
  isVisible = true,
  filters,
  onResetFilters,
}: PropertiesWithMapProps) {
  const [selectedProperty, setSelectedProperty] = useState<PropertyWithOwnerScore | null>(null);
  const [highlightedPropertyId, setHighlightedPropertyId] = useState<string | undefined>();

  // Apply filters with useMemo for performance
  const filteredProperties = useMemo(() => {
    if (!filters) return properties;

    return properties.filter((property) => {
      // Filter by type
      const matchType =
        !filters.type ||
        filters.type === 'all' ||
        property.property_type?.toLowerCase().includes(filters.type.toLowerCase());

      // Filter by location (city or neighborhood)
      const matchLocation =
        !filters.location ||
        property.city?.toLowerCase().includes(filters.location.toLowerCase()) ||
        property.neighborhood?.toLowerCase().includes(filters.location.toLowerCase());

      // Filter by max price
      const matchPrice =
        !filters.maxPrice ||
        filters.maxPrice === 0 ||
        (property.monthly_rent || 0) <= filters.maxPrice;

      return matchType && matchLocation && matchPrice;
    });
  }, [properties, filters]);

  // Check if filters are active
  const hasActiveFilters = filters && (filters.type || filters.location || filters.maxPrice > 0);

  // Filter properties with valid coordinates for map
  const propertiesWithCoords = filteredProperties.filter(
    (p) => p.latitude != null && p.longitude != null
  );

  // Handle marker click from map
  const handleMarkerClick = (property: { id: string }) => {
    const found = properties.find((p) => p.id === property.id);
    if (found) {
      setSelectedProperty(found);
    }
  };

  return (
    <section className="py-20 bg-secondary">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div
          className={`flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              Pépites du moment 🔥
            </h2>
            <p className="text-lg text-muted-foreground">
              {hasActiveFilters ? (
                <>
                  <span className="font-bold text-primary">{filteredProperties.length}</span> bien
                  {filteredProperties.length > 1 ? 's' : ''} sur {properties.length} correspondent à
                  vos critères
                </>
              ) : (
                <>Les dernières annonces vérifiées, prêtes à habiter.</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {hasActiveFilters && onResetFilters && (
              <button
                onClick={onResetFilters}
                className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
                Réinitialiser
              </button>
            )}
            <Link
              to="/recherche"
              className="group inline-flex items-center gap-2 text-primary font-bold hover:text-primary/80 transition-colors"
            >
              <span>Voir tout le catalogue</span>
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-background transition-all">
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          </div>
        </div>

        {/* Content Grid */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Properties Grid */}
          <div className="w-full lg:w-1/2 xl:w-7/12">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="bg-background rounded-[24px] h-[380px] animate-pulse border border-border"
                  />
                ))}
              </div>
            ) : filteredProperties.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredProperties.map((property, index) => (
                  <div
                    key={property.id}
                    onMouseEnter={() => setHighlightedPropertyId(property.id)}
                    onMouseLeave={() => setHighlightedPropertyId(undefined)}
                  >
                    <PropertyCard
                      property={property}
                      index={index}
                      onSelect={() => setSelectedProperty(property)}
                    />
                  </div>
                ))}
              </div>
            ) : hasActiveFilters ? (
              <div className="col-span-full py-12 text-center bg-background rounded-3xl border border-border">
                <div className="space-y-4">
                  <p className="text-muted-foreground">Aucun bien ne correspond à vos critères.</p>
                  {onResetFilters && (
                    <button
                      onClick={onResetFilters}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Réinitialiser les filtres
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="col-span-full py-12 text-center bg-background rounded-3xl border border-border">
                <p className="text-muted-foreground">Aucune propriété disponible pour le moment.</p>
              </div>
            )}
          </div>

          {/* Sticky Map */}
          <div className="hidden lg:block w-1/2 xl:w-5/12 h-[calc(100vh-120px)] sticky top-24 rounded-[32px] overflow-hidden shadow-2xl border border-border">
            {propertiesWithCoords.length > 0 ? (
              <Suspense fallback={<MapSkeleton />}>
                <MapWrapper
                  properties={propertiesWithCoords.map((p) => ({
                    id: p.id,
                    title: p.title,
                    monthly_rent: p.monthly_rent,
                    longitude: p.longitude!,
                    latitude: p.latitude!,
                    city: p.city,
                    neighborhood: p.neighborhood || undefined,
                    bedrooms: p.bedrooms || undefined,
                    bathrooms: p.bathrooms || undefined,
                    surface_area: p.surface_area || undefined,
                    images: p.images || undefined,
                  }))}
                  onMarkerClick={handleMarkerClick}
                  highlightedPropertyId={highlightedPropertyId}
                  fitBounds={true}
                  height="100%"
                  useClusterMode={propertiesWithCoords.length > 10}
                />
              </Suspense>
            ) : (
              <div className="w-full h-full bg-secondary flex items-center justify-center">
                <div className="text-center space-y-3 p-8">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl mx-auto flex items-center justify-center">
                    <MapPin className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-muted-foreground font-medium">Aucune propriété géolocalisée</p>
                  <p className="text-sm text-muted-foreground/70">
                    Les propriétés avec coordonnées GPS apparaîtront ici.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Property Modal */}
      {selectedProperty && (
        <PropertyModal property={selectedProperty} onClose={() => setSelectedProperty(null)} />
      )}
    </section>
  );
}
