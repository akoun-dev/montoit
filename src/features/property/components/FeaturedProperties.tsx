import { MapPin, ArrowRight, Bed, Bath, Maximize, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ScoreBadge } from '@/shared/ui/ScoreBadge';
import { useScrollAnimation } from '@/hooks/shared/useScrollAnimation';
import type { PropertyWithOwnerScore } from '@/types/property';

interface FeaturedPropertiesProps {
  properties: PropertyWithOwnerScore[];
  loading: boolean;
}

// Helper function to get a unique fallback image based on property characteristics
function getFallbackImage(property: PropertyWithOwnerScore): string {
  const type = property.property_type?.toLowerCase() || 'apartment';
  const city = property.city?.toLowerCase() || '';
  const priceRange = property.price ? Math.floor(property.price / 100000) : 0;

  // Different images based on property type, city, and price range
  // This ensures visual diversity and makes each property look unique
  const imageMap: Record<string, string> = {
    // Apartments
    'apartment-abidjan-0': 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
    'apartment-abidjan-1': 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
    'apartment-abidjan-2': 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80',
    'apartment-abidjan-3': 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80',
    'apartment-cocody-0': 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&q=80',
    'apartment-cocody-1': 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800&q=80',
    'apartment-plateau-0': 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80',
    'apartment-plateau-1': 'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=800&q=80',

    // Studios
    'studio-abidjan-0': 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&q=80',
    'studio-abidjan-1': 'https://images.unsplash.com/photo-1600585153490-76fb20a32601?w=800&q=80',
    'studio-abidjan-2': 'https://images.unsplash.com/photo-1600047509358-9dc75507daeb?w=800&q=80',
    'studio-abidjan-3': 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80',

    // Houses/Villas
    'house-abidjan-0': 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
    'house-abidjan-1': 'https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=800&q=80',
    'house-abidjan-2': 'https://images.unsplash.com/photo-1600566752547-3394e9e14b40?w=800&q=80',
    'house-abidjan-3': 'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?w=800&q=80',
    'house-cocody-0': 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&q=80',
    'house-cocody-1': 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800&q=80',
    'house-cocody-2': 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80',
    'house-cocody-3': 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',

    // Villas
    'villa-abidjan-0': 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
    'villa-abidjan-1': 'https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=800&q=80',
    'villa-abidjan-2': 'https://images.unsplash.com/photo-1600566752547-3394e9e14b40?w=800&q=80',
    'villa-abidjan-3': 'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?w=800&q=80',
    'villa-cocody-0': 'https://images.unsplash.com/photo-1600047509358-9dc75507daeb?w=800&q=80',
    'villa-cocody-1': 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80',
    'villa-cocody-2': 'https://images.unsplash.com/photo-1600585153490-76fb20a32601?w=800&q=80',
    'villa-cocody-3': 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&q=80',
  };

  // Create a key based on property characteristics to get a consistent image
  const key = `${type}-${city || 'abidjan'}-${priceRange % 4}`;
  return imageMap[key] || imageMap['apartment-abidjan-0'];
}

function PropertyCard({
  property,
  index,
  isVisible,
}: {
  property: PropertyWithOwnerScore;
  index: number;
  isVisible: boolean;
}) {
  // Get the appropriate image for this property
  const propertyImage = property.images?.[0] || getFallbackImage(property);

  return (
    <Link
      to={`/propriete/${property.id}`}
      className={`group block bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-500 hover:-translate-y-2 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
      }`}
      style={{ transitionDelay: isVisible ? `${index * 150}ms` : '0ms' }}
    >
      {/* Image Container */}
      <div className="relative h-64 overflow-hidden">
        <img
          src={propertyImage}
          alt={property.title || 'Propriété'}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
          <span className="px-3 py-1.5 bg-[var(--terracotta-500)] text-white text-xs font-bold rounded-full uppercase tracking-wide">
            {property.property_type || 'Appartement'}
          </span>
          <button
            className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white hover:scale-110 transition-all"
            onClick={(e) => {
              e.preventDefault();
              // Handle favorite
            }}
          >
            <Heart className="h-5 w-5 text-[var(--earth-700)]" />
          </button>
        </div>

        {/* Price Badge - Consistently positioned */}
        <div className="absolute bottom-4 left-4">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl px-4 py-2 shadow-md">
            <span className="text-h3 font-bold text-[var(--terracotta-600)]">
              {property.price?.toLocaleString() || 'N/A'}
            </span>
            <span className="text-sm text-[var(--earth-700)] ml-1">FCFA/mois</span>
          </div>
        </div>

        {/* Trust Score Badge - Consistently positioned */}
        {property.owner_trust_score != null && (
          <div className="absolute bottom-4 right-4">
            <ScoreBadge score={property.owner_trust_score} variant="compact" size="sm" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Title */}
        <h3 className="text-h4 font-semibold text-[var(--earth-900)] mb-3 group-hover:text-[var(--terracotta-500)] transition-colors line-clamp-1">
          {property.title && property.title.trim() !== '' ? (
            property.title
          ) : (
            <>
              {property.property_type === 'apartment'
                ? 'Appartement'
                : property.property_type === 'house'
                  ? 'Maison'
                  : property.property_type === 'studio'
                    ? 'Studio'
                    : property.property_type === 'villa'
                      ? 'Villa'
                      : property.property_type === 'land'
                        ? 'Terrain'
                        : property.property_type === 'commercial'
                          ? 'Local commercial'
                          : 'Propriété'}{' '}
              à {property.city || 'Abidjan'}
              {property.neighborhood && ` - ${property.neighborhood}`}
            </>
          )}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-2 text-[var(--earth-700)] mb-4">
          <MapPin className="h-4 w-4 text-[var(--terracotta-500)]" />
          <span className="text-sm">
            {property.neighborhood ? `${property.neighborhood}, ` : ''}
            {property.city || 'Abidjan'}
          </span>
        </div>

        {/* Features */}
        <div className="flex items-center gap-4 text-sm text-[var(--earth-700)] pt-4 border-t border-[var(--sand-200)]">
          {property.bedrooms && (
            <div className="flex items-center gap-1.5">
              <Bed className="h-4 w-4 text-[var(--terracotta-400)]" />
              <span>{property.bedrooms} ch.</span>
            </div>
          )}
          {property.bathrooms && (
            <div className="flex items-center gap-1.5">
              <Bath className="h-4 w-4 text-[var(--terracotta-400)]" />
              <span>{property.bathrooms} sdb</span>
            </div>
          )}
          {property.surface_area && (
            <div className="flex items-center gap-1.5">
              <Maximize className="h-4 w-4 text-[var(--terracotta-400)]" />
              <span>{property.surface_area} m²</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function PropertySkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden animate-pulse">
      <div className="h-64 bg-[var(--sand-200)]" />
      <div className="p-6">
        <div className="h-6 bg-[var(--sand-200)] rounded-lg mb-3 w-3/4" />
        <div className="h-4 bg-[var(--sand-200)] rounded mb-4 w-1/2" />
        <div className="pt-4 border-t border-[var(--sand-200)]">
          <div className="h-4 bg-[var(--sand-200)] rounded w-full" />
        </div>
      </div>
    </div>
  );
}

export default function FeaturedProperties({ properties, loading }: FeaturedPropertiesProps) {
  // Ensure properties is an array before using slice
  const propertiesArray = Array.isArray(properties) ? properties : [];
  // Limit to 4 properties for cleaner homepage
  const displayProperties = propertiesArray.slice(0, 4);

  // Scroll animation
  const { ref: sectionRef, isVisible } = useScrollAnimation<HTMLElement>({ threshold: 0.1 });

  return (
    <section ref={sectionRef} className="py-10 md:py-14" style={{ backgroundColor: '#FAF7F4' }}>
      <div className="container">
        {/* Section Header - Animation fadeUp */}
        <div
          className={`flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8 md:mb-10 transition-all duration-700 ease-out ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div>
            <span className="inline-block px-4 py-2 rounded-full bg-[var(--terracotta-100)] text-[var(--terracotta-600)] text-sm font-semibold mb-3">
              Nouvelles Annonces
            </span>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-display text-[var(--earth-900)] mb-2">
              Propriétés à découvrir
            </h2>
            <p className="text-base text-[var(--earth-700)] max-w-xl">
              Les dernières annonces vérifiées et prêtes à vous accueillir
            </p>
          </div>

          <Link
            to="/recherche"
            className={`group inline-flex items-center gap-2 text-[var(--terracotta-600)] font-semibold hover:text-[var(--terracotta-700)] transition-all duration-700 delay-200 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
            }`}
          >
            <span>Voir toutes les propriétés</span>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Properties Grid - Limited to 4 with stagger animation */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <PropertySkeleton key={i} />
            ))}
          </div>
        ) : displayProperties.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
              <MapPin className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Aucune propriété disponible
            </h3>
            <p className="text-muted-foreground">De nouvelles annonces arrivent bientôt</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayProperties.map((property, index) => (
              <PropertyCard
                key={property.id}
                property={property}
                index={index}
                isVisible={isVisible}
              />
            ))}
          </div>
        )}

        {/* CTA Button Mobile - Animation fadeUp */}
        <div
          className={`mt-8 text-center md:hidden transition-all duration-700 ease-out delay-500 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <Link to="/recherche" className="btn-primary inline-flex items-center gap-2">
            <span>Toutes les propriétés</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
