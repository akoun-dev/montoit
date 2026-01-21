import { Link } from 'react-router-dom';
import { Bed, Bath, Maximize, MapPin, Heart } from 'lucide-react';
import { FormatService } from '@/services/format/formatService';
import { useState } from 'react';
import type { Database } from '@/shared/lib/database.types';

type Property = Database['public']['Tables']['properties']['Row'];

const FALLBACK_IMAGE = '/images/hero-villa-cocody.jpg';

function handleImageError(e: React.SyntheticEvent<HTMLImageElement>) {
  const target = e.target as HTMLImageElement;
  if (target.src !== FALLBACK_IMAGE) {
    target.src = FALLBACK_IMAGE;
  }
}

interface PropertyCardMobileProps {
  property: Property;
  onFavoriteToggle?: (id: string) => void;
  isFavorite?: boolean;
}

/**
 * Carte propriété optimisée pour mobile avec design immersif
 */
export default function PropertyCardMobile({
  property,
  onFavoriteToggle,
  isFavorite = false,
}: PropertyCardMobileProps) {
  const [liked, setLiked] = useState(isFavorite);
  const imageUrl = property.images?.[0] || FALLBACK_IMAGE;

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLiked(!liked);
    onFavoriteToggle?.(property.id);
  };

  return (
    <Link
      to={`/propriete/${property.id}`}
      className="group block w-full bg-white rounded-2xl overflow-hidden shadow-lg shadow-[#2C1810]/5 active:scale-[0.98] transition-transform duration-150"
      role="article"
      aria-label={`Voir ${property.title}`}
    >
      {/* Image Container - Full width, aspect ratio 4:3 */}
      <div className="relative aspect-[4/3] bg-[#FAF7F4] overflow-hidden">
        <img
          src={imageUrl}
          alt={property.title}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={handleImageError}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Favorite button */}
        <button
          onClick={handleFavorite}
          className={`absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-200 ${
            liked ? 'bg-[#F16522] text-white' : 'bg-white/80 text-[#6B5A4E] hover:bg-white'
          }`}
          aria-label={liked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Heart
            className={`h-5 w-5 transition-transform duration-200 ${liked ? 'fill-current scale-110' : ''}`}
          />
        </button>

        {/* Property type badge */}
        <div className="absolute top-3 left-3 px-3 py-1.5 bg-[#F16522] text-white rounded-full text-xs font-semibold uppercase tracking-wide">
          {property.property_type}
        </div>

        {/* Price overlay */}
        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex items-end justify-between">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg">
              <span className="text-xl font-bold text-[#2C1810]">
                {FormatService.formatCurrency(property.monthly_rent)}
              </span>
              <span className="text-sm text-[#A69B95] ml-1">/mois</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Location */}
        <div className="flex items-center gap-1.5 text-[#F16522] mb-2">
          <MapPin className="h-4 w-4" />
          <span className="text-sm font-medium truncate">
            {property.city}
            {property.neighborhood && ` • ${property.neighborhood}`}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-bold text-[#2C1810] text-lg leading-tight mb-3 line-clamp-2">
          {property.title}
        </h3>

        {/* Features */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-[#6B5A4E]">
            <div className="w-8 h-8 rounded-lg bg-[#FAF7F4] flex items-center justify-center">
              <Bed className="h-4 w-4 text-[#F16522]" />
            </div>
            <span className="font-medium">{property.bedrooms ?? '-'}</span>
          </div>

          <div className="flex items-center gap-1.5 text-[#6B5A4E]">
            <div className="w-8 h-8 rounded-lg bg-[#FAF7F4] flex items-center justify-center">
              <Bath className="h-4 w-4 text-[#F16522]" />
            </div>
            <span className="font-medium">{property.bathrooms ?? '-'}</span>
          </div>

          <div className="flex items-center gap-1.5 text-[#6B5A4E]">
            <div className="w-8 h-8 rounded-lg bg-[#FAF7F4] flex items-center justify-center">
              <Maximize className="h-4 w-4 text-[#F16522]" />
            </div>
            <span className="font-medium">{property.surface_area ?? '-'} m²</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
