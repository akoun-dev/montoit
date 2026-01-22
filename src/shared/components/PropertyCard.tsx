import { Link } from 'react-router-dom';
import { Bed, Bath, Maximize } from 'lucide-react';
import { FormatService } from '@/services/format/formatService';
import { OwnerBadge } from '@/shared/ui';
import { usePrefetchProperty } from '@/shared/hooks/usePrefetchProperty';
import type { Database } from '@/shared/lib/database.types';

type Property = Database['public']['Tables']['properties']['Row'];

// Helper function to get a unique fallback image based on property characteristics
function getFallbackImage(property: Property): string {
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
  const fallbackUrl = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80';
  return imageMap[key as keyof typeof imageMap] ?? fallbackUrl;
}

function handleImageError(e: React.SyntheticEvent<HTMLImageElement>) {
  const target = e.target as HTMLImageElement;
  // On error, set a fallback image based on the property data
  const property = (e.target as HTMLImageElement).closest('a')?.querySelector('img')?.getAttribute('data-property');
  if (property) {
    try {
      const propertyData = JSON.parse(property);
      target.src = getFallbackImage(propertyData);
    } catch {
      // If parsing fails, use a default image
      target.src = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80';
    }
  } else {
    target.src = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80';
  }
}

interface PropertyCardProps {
  property: Property;
  showBadge?: boolean;
  badgeText?: string;
  ownerTrustScore?: number | null;
  ownerName?: string | null;
  ownerAvatarUrl?: string | null;
  ownerIsVerified?: boolean;
}

export default function PropertyCard({
  property,
  showBadge,
  badgeText,
  ownerTrustScore,
  ownerName,
  ownerAvatarUrl,
  ownerIsVerified,
}: PropertyCardProps) {
  // Get the appropriate image for this property
  const imageUrl = property.images?.[0] || getFallbackImage(property);

  // Prefetch property details on hover for faster navigation
  const { usePrefetchOnHover } = usePrefetchProperty();
  const hoverHandlers = usePrefetchOnHover(property.id);

  return (
    <Link
      to={`/propriete/${property.id}`}
      className="group block w-full sm:w-80 flex-shrink-0 premium-card card-hover-premium overflow-hidden"
      role="article"
      aria-label={`Voir les détails de ${property.title} à ${property.city}, ${property.neighborhood}`}
      {...hoverHandlers}
    >
      {/* Image Container - 60%+ de la carte */}
      <div className="relative h-72 sm:h-80 bg-[var(--color-creme)] overflow-hidden">
        <img
          src={imageUrl}
          data-property={JSON.stringify(property)}
          alt={`${property.title} - ${property.city}, ${property.neighborhood}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          width="320"
          height="320"
          onError={handleImageError}
        />

        {/* Prix en Overlay - Bottom Left - Consistently positioned */}
        <div className="absolute bottom-3 left-3 px-4 py-2 bg-[var(--color-chocolat)]/90 backdrop-blur-sm rounded-xl text-white shadow-lg">
          <span className="text-lg font-bold">
            {FormatService.formatCurrency(property.price ?? 0)}
          </span>
          <span className="text-xs opacity-80 ml-1">/mois</span>
        </div>

        {/* Badge Nouveau - Orange Premium - Consistently positioned */}
        {showBadge && badgeText && (
          <div className="absolute top-3 left-3 px-3 py-1.5 bg-[var(--color-orange)] text-white rounded-full text-xs font-semibold shadow-lg">
            {badgeText}
          </div>
        )}

        {/* Owner Badge with Trust Score - Bottom Right - Consistently positioned */}
        {ownerTrustScore != null && (
          <div className="absolute bottom-3 right-3">
            <OwnerBadge
              name={ownerName}
              avatarUrl={ownerAvatarUrl}
              trustScore={ownerTrustScore}
              isVerified={ownerIsVerified}
              variant="inline"
              size="sm"
              showName={true}
            />
          </div>
        )}
      </div>

      {/* Content - Premium Ivorian Colors */}
      <div className="p-4">
        {/* Location */}
        <h3 className="font-bold text-[var(--color-chocolat)] text-base sm:text-lg truncate mb-1">
          {property.city}
          {property.neighborhood && `, ${property.neighborhood}`}
        </h3>

        {/* Title */}
        <p className="text-[var(--color-gris-texte)] text-sm truncate mb-3">{property.title}</p>

        {/* Features Row */}
        <div className="flex items-center gap-4 text-sm text-[var(--color-gris-texte)]">
          {/* Chambres */}
          <span className="flex items-center gap-1.5">
            <Bed className="h-4 w-4 text-[var(--color-orange)]" />
            <span className="font-medium">{property.bedrooms ?? '-'} ch.</span>
          </span>

          {/* Salles de bain */}
          <span className="flex items-center gap-1.5">
            <Bath className="h-4 w-4 text-[var(--color-orange)]" />
            <span className="font-medium">{property.bathrooms ?? '-'} sdb.</span>
          </span>

          {/* Superficie */}
          <span className="flex items-center gap-1.5">
            <Maximize className="h-4 w-4 text-[var(--color-orange)]" />
            <span className="font-medium">{property.surface_area ?? '-'} m²</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
