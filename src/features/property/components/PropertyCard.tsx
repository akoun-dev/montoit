/**
 * Composant Carte de Propriété pour la recherche
 *
 * Affiche une propriété avec ses informations principales,
 * boutons de favori et de partage.
 */

import { useCallback, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Bed,
  Bath,
  Maximize,
  Heart,
  Share2,
  MoreVertical,
} from 'lucide-react';
import { favoritesService } from '@/services/favorites.service';
import { useAuth } from '@/app/providers/AuthProvider';
import { ScoreBadge } from '@/shared/ui/ScoreBadge';
import { ReportMenuItem } from '@/shared/ui/reports';
import type { Json } from '@/integrations/supabase/types';

// Helper function to safely convert Json to string array
function jsonToStringArray(json: Json | null): string[] | null {
  if (json === null) return null;
  if (Array.isArray(json)) {
    // Check if all elements are strings
    if (json.every(item => typeof item === 'string')) {
      return json as string[];
    }
  }
  return null;
}

interface PropertyCardProps {
  property: {
    id: string;
    title: string;
    property_type: string;
    city: string | null;
    neighborhood: string | null;
    price: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    surface_area: number | null;
    status: string | null;
    images: Json | null;
    owner_trust_score?: number | null;
    ansut_verified?: boolean | null;
  };
  onHover?: () => void;
  formatPrice: (price: number | null) => string;
  colors: {
    chocolat: string;
    sable: string;
    orange: string;
    creme: string;
    grisNeutre: string;
    grisTexte: string;
    border: string;
  };
  onShare?: (property: {
    id: string;
    title: string;
    images: Json | null;
  }) => void;
}

export function PropertyCard({
  property,
  onHover,
  formatPrice,
  colors,
  onShare,
}: PropertyCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Convert Json images to string array safely
  const images = useMemo(() => jsonToStringArray(property.images), [property.images]);

  // Vérifier si c'est un favori au chargement
  useEffect(() => {
    if (user) {
      favoritesService.isFavorite(user.id, property.id).then(setIsFavorite);
    } else {
      setIsFavorite(false);
    }
  }, [user, property.id]);

  const handleFavoriteClick = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();

      if (!user) {
        // Rediriger vers la page de connexion
        navigate('/connexion?redirect=/recherche');
        return;
      }

      setFavoriteLoading(true);
      try {
        const result = await favoritesService.toggleFavorite(user.id, property.id);
        if (result.success) {
          setIsFavorite(result.isFavorite);
        }
      } catch (error) {
        console.error('Erreur lors de la gestion du favori:', error);
      } finally {
        setFavoriteLoading(false);
      }
    },
    [user, property.id, navigate]
  );

  const handleShareClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onShare?.({
        id: property.id,
        title: property.title || 'Propriete',
        images: property.images,
      });
    },
    [onShare, property.id, property.title, property.images]
  );

  const statusConfig = (() => {
    const status = property.status?.toLowerCase();
    if (!status) return null;
    const configs: Record<string, { label: string; className: string }> = {
      available: { label: 'Disponible', className: 'bg-green-500/90 text-white' },
      rented: { label: 'Louée', className: 'bg-blue-500/90 text-white' },
      pending: { label: 'En attente', className: 'bg-amber-500/90 text-white' },
      unavailable: { label: 'Indisponible', className: 'bg-gray-500/90 text-white' },
      maintenance: { label: 'Maintenance', className: 'bg-red-500/90 text-white' },
      inactive: { label: 'Inactif', className: 'bg-gray-500/90 text-white' },
    };
    return configs[status] || null;
  })();

  return (
    <article
      onClick={() => navigate(`/proprietes/${property.id}`)}
      onMouseEnter={onHover}
      className="group bg-white rounded-[20px] overflow-hidden border hover:shadow-[0_20px_40px_rgba(44,24,16,0.08)] transition-all duration-300 cursor-pointer"
      style={{
        borderColor: colors.border,
      }}
    >
      {/* Image Container */}
      <div className="relative h-64 overflow-hidden">
        <img
          src={
            images?.[0] ||
            'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800'
          }
          alt={property.title || 'Propriété'}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src =
              'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800';
          }}
        />

        {/* Badges Flottants */}
        <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
          {statusConfig && (
            <span className={`${statusConfig.className} text-[10px] font-bold px-2 py-1 rounded-md uppercase shadow-sm backdrop-blur-sm`}>
              {statusConfig.label}
            </span>
          )}
          {property.ansut_verified && (
            <span className="bg-emerald-600/90 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase shadow-sm backdrop-blur-sm flex items-center gap-1">
              <span>✓</span>
              <span>Certifié ANSUT</span>
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="absolute top-3 right-3 flex gap-2 z-10">
          {/* Share Button */}
          <button
            type="button"
            onClick={handleShareClick}
            className="flex items-center justify-center w-10 h-10 bg-white/95 backdrop-blur-md rounded-full shadow-lg text-neutral-700 hover:text-blue-500 hover:bg-white hover:scale-110 transition-all duration-200"
            aria-label="Partager"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Favorite Button */}
          <button
            type="button"
            onClick={handleFavoriteClick}
            disabled={favoriteLoading}
            className={`flex items-center justify-center w-10 h-10 backdrop-blur-md rounded-full shadow-lg transition-all duration-200 hover:scale-110 ${
              isFavorite
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-white/95 text-neutral-700 hover:bg-white hover:text-red-500'
            }`}
            aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>

          {/* More Options Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="flex items-center justify-center w-10 h-10 bg-white/95 backdrop-blur-md rounded-full shadow-lg text-neutral-700 hover:bg-white hover:scale-110 transition-all duration-200"
              aria-label="Plus d'options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div className="absolute right-0 top-12 w-48 bg-white rounded-xl shadow-xl border border-neutral-200 py-2 z-50">
                <ReportMenuItem
                  entityType="property"
                  entityId={property.id}
                  entityTitle={property.title || undefined}
                  className="mx-2"
                />
              </div>
            )}
          </div>
        </div>

        {/* Prix Overlay */}
        <div className="absolute bottom-3 left-3">
          <div
            className="backdrop-blur-sm text-white px-3 py-1.5 rounded-lg shadow-lg"
            style={{ backgroundColor: `${colors.chocolat}E6` }}
          >
            <span className="font-bold text-lg">{formatPrice(property.price)}</span>
            <span className="text-[10px] opacity-80 ml-1">FCFA/mois</span>
          </div>
        </div>
      </div>

      {/* Infos */}
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p
              className="text-[10px] font-bold uppercase mb-1"
              style={{ color: colors.grisNeutre }}
            >
              {property.property_type || 'Bien immobilier'}
            </p>
            <h3
              className="font-bold text-lg leading-tight transition-colors line-clamp-1"
              style={{ color: colors.chocolat }}
            >
              {property.title || 'Propriété sans titre'}
            </h3>
          </div>
          {property.owner_trust_score != null && (
            <ScoreBadge
              score={property.owner_trust_score}
              size="sm"
              variant="compact"
            />
          )}
        </div>

        <div
          className="flex items-center gap-1.5 text-sm mb-4"
          style={{ color: colors.grisTexte }}
        >
          <MapPin className="w-3.5 h-3.5" style={{ color: colors.orange }} />
          {property.neighborhood ? `${property.neighborhood}, ` : ''}
          {property.city || 'Non spécifié'}
        </div>

        {/* Features */}
        <div
          className="flex items-center gap-4 pt-4 border-t text-xs font-medium"
          style={{ borderColor: colors.border, color: colors.grisNeutre }}
        >
          {property.bedrooms && (
            <div className="flex items-center gap-1.5">
              <Bed className="w-4 h-4" style={{ color: colors.orange }} />{' '}
              {property.bedrooms} ch.
            </div>
          )}
          {property.bathrooms && (
            <div className="flex items-center gap-1.5">
              <Bath className="w-4 h-4" style={{ color: colors.orange }} />{' '}
              {property.bathrooms} sdb
            </div>
          )}
          {property.surface_area && (
            <div className="flex items-center gap-1.5">
              <Maximize className="w-4 h-4" style={{ color: colors.orange }} />{' '}
              {property.surface_area} m²
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default PropertyCard;
