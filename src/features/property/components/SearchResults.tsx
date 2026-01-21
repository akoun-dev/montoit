import { MapPin, Bed, Bath, Maximize, Home, Heart } from 'lucide-react';
import { PropertyCardSkeleton } from '@/shared/ui/Skeleton';
import type { Database } from '@/shared/lib/database.types';

type Property = Database['public']['Tables']['properties']['Row'];

interface SearchResultsProps {
  properties: Property[];
  loading: boolean;
  onPropertyClick?: (propertyId: string) => void;
}

export default function SearchResults({
  properties,
  loading,
  onPropertyClick,
}: SearchResultsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <PropertyCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="text-center py-12 premium-card">
        <Home className="h-16 w-16 text-[var(--color-gris-neutre)] mx-auto mb-4" />
        <h3 className="text-xl font-bold text-[var(--color-chocolat)] mb-2">Aucun bien trouvé</h3>
        <p className="text-[var(--color-gris-texte)] mb-6">
          Essayez de modifier vos critères de recherche pour voir plus de résultats.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 text-sm text-[var(--color-gris-texte)]">
        <span className="font-bold text-[var(--color-chocolat)]">{properties.length}</span> bien
        {properties.length > 1 ? 's' : ''} trouvé{properties.length > 1 ? 's' : ''}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((property) => (
          <PropertyCard
            key={property.id}
            property={property}
            onClick={() => onPropertyClick?.(property.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface PropertyCardProps {
  property: Property;
  onClick?: () => void;
}

function PropertyCard({ property, onClick }: PropertyCardProps) {
  const images = Array.isArray(property.images) ? property.images : [];
  const mainImage = images[0] || 'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg';

  return (
    <div
      onClick={onClick}
      className="group premium-card card-hover-premium overflow-hidden cursor-pointer"
    >
      {/* Image - 60%+ de la carte */}
      <div className="relative h-56 sm:h-64 overflow-hidden">
        <img
          src={mainImage}
          alt={property.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Prix en Overlay - Bottom Left */}
        <div className="absolute bottom-3 left-3 px-4 py-2 bg-[var(--color-chocolat)]/90 backdrop-blur-sm rounded-xl text-white shadow-lg">
          <span className="text-lg font-bold">
            {property.monthly_rent?.toLocaleString('fr-FR')} FCFA
          </span>
          <span className="text-xs opacity-80 ml-1">/mois</span>
        </div>

        {/* Badge Type - Top Left */}
        {property.property_category === 'commercial' && (
          <div className="absolute top-3 left-3 bg-[var(--color-orange)] text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg">
            Commercial
          </div>
        )}

        {/* Favorite Button - Top Right */}
        <button
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-lg hover:bg-red-50 transition-colors"
          aria-label="Ajouter aux favoris"
        >
          <Heart className="h-5 w-5 text-[var(--color-gris-texte)] hover:text-red-500" />
        </button>
      </div>

      {/* Content - Premium Ivorian Colors */}
      <div className="p-4 space-y-3">
        {/* Type Badge */}
        <div className="flex items-center justify-between">
          <span className="badge-premium badge-premium-orange">{property.property_type}</span>
          {property.furnished && (
            <span className="text-xs text-[var(--color-gris-texte)] font-medium">Meublé</span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-[var(--color-chocolat)] line-clamp-2 min-h-[3rem]">
          {property.title}
        </h3>

        {/* Location */}
        <div className="flex items-center text-[var(--color-gris-texte)] text-sm">
          <MapPin className="h-4 w-4 mr-1.5 text-[var(--color-orange)] flex-shrink-0" />
          <span className="truncate">
            {property.neighborhood && `${property.neighborhood}, `}
            {property.city}
          </span>
        </div>

        {/* Features */}
        <div className="flex items-center gap-4 text-sm text-[var(--color-gris-texte)] pt-3 border-t border-[var(--color-border)]">
          {property.bedrooms && (
            <div className="flex items-center gap-1.5">
              <Bed className="h-4 w-4 text-[var(--color-orange)]" />
              <span className="font-medium">{property.bedrooms} ch.</span>
            </div>
          )}
          {property.bathrooms && (
            <div className="flex items-center gap-1.5">
              <Bath className="h-4 w-4 text-[var(--color-orange)]" />
              <span className="font-medium">{property.bathrooms} sdb.</span>
            </div>
          )}
          {property.surface_area && (
            <div className="flex items-center gap-1.5">
              <Maximize className="h-4 w-4 text-[var(--color-orange)]" />
              <span className="font-medium">{property.surface_area} m²</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
