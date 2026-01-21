import { X, MapPin, Bed, Bath, Maximize, Check, Heart, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/ui';
import { ScoreBadge } from '@/shared/ui/ScoreBadge';
import type { PropertyWithOwnerScore } from '../types';

interface PropertyModalProps {
  property: PropertyWithOwnerScore;
  onClose: () => void;
}

const FALLBACK_IMAGES = [
  '/images/hero/hero_example_1_riviera_luxury.png',
  '/images/hero/hero_example_3_plateau_lagoon.png',
  '/images/hero/hero_example_2_cocody_family.webp',
];

// Équipements par défaut si non définis
const DEFAULT_AMENITIES = ['Sécurité 24/7', 'Eau courante', 'Électricité'];

export default function PropertyModal({ property, onClose }: PropertyModalProps) {
  const displayImage = property.images?.[0] || property.main_image || FALLBACK_IMAGES[0];
  const amenities = property.amenities?.length ? property.amenities : DEFAULT_AMENITIES;

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C1810]/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[32px] w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white/80 hover:bg-white rounded-full transition-all shadow-lg"
          aria-label="Fermer"
        >
          <X className="w-6 h-6 text-[#2C1810]" />
        </button>

        <div className="grid md:grid-cols-2">
          {/* Image Side */}
          <div className="h-64 md:h-full min-h-[300px] relative bg-neutral-100">
            <img
              src={displayImage}
              alt={property.title || 'Propriété'}
              className="w-full h-full object-cover"
            />
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent md:hidden" />

            {/* Type badge */}
            <div className="absolute top-4 left-4">
              <span className="px-3 py-1.5 bg-white/95 backdrop-blur-md text-[#2C1810] text-xs font-bold uppercase tracking-wider rounded-full shadow-sm">
                {property.property_type || 'Bien'}
              </span>
            </div>

            {/* Owner Score on image (mobile) */}
            {property.owner_trust_score != null && (
              <div className="absolute bottom-4 right-4 md:hidden">
                <ScoreBadge score={property.owner_trust_score} variant="compact" size="sm" />
              </div>
            )}
          </div>

          {/* Info Side */}
          <div className="p-6 md:p-8 space-y-6">
            {/* Header */}
            <div>
              <div className="flex justify-between items-start mb-2 flex-wrap gap-2">
                <span className="text-primary font-bold text-xs uppercase tracking-widest">
                  {property.property_type || 'Propriété'}
                </span>
                <span className="text-xl font-bold text-foreground">
                  {formatPrice(property.monthly_rent || 0)}
                  <span className="text-sm font-normal text-muted-foreground ml-1">FCFA/mois</span>
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mb-2 leading-tight">
                {property.title || 'Appartement de standing'}
              </h2>
              <p className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="line-clamp-1">
                  {property.neighborhood ? `${property.neighborhood}, ` : ''}
                  {property.city || 'Abidjan'}
                </span>
              </p>
            </div>

            {/* Stats */}
            <div className="flex gap-4 py-4 border-y border-border">
              <div className="text-center px-4 flex-1">
                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">
                  Surface
                </p>
                <p className="font-bold text-foreground flex items-center justify-center gap-1">
                  <Maximize className="w-4 h-4 text-primary" />
                  {property.surface_area || '-'} m²
                </p>
              </div>
              <div className="w-px bg-border" />
              <div className="text-center px-4 flex-1">
                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">
                  Chambres
                </p>
                <p className="font-bold text-foreground flex items-center justify-center gap-1">
                  <Bed className="w-4 h-4 text-primary" />
                  {property.bedrooms || '-'}
                </p>
              </div>
              <div className="w-px bg-border" />
              <div className="text-center px-4 flex-1">
                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">
                  Salles de bain
                </p>
                <p className="font-bold text-foreground flex items-center justify-center gap-1">
                  <Bath className="w-4 h-4 text-primary" />
                  {property.bathrooms || '-'}
                </p>
              </div>
            </div>

            {/* Description */}
            {property.description && (
              <div>
                <h3 className="font-bold text-foreground mb-2">Description</h3>
                <p className="text-muted-foreground leading-relaxed line-clamp-4">
                  {property.description}
                </p>
              </div>
            )}

            {/* Amenities */}
            <div>
              <h3 className="font-bold text-foreground mb-3">Équipements</h3>
              <div className="flex flex-wrap gap-2">
                {amenities.slice(0, 6).map((amenity) => (
                  <span
                    key={amenity}
                    className="px-3 py-1.5 bg-secondary border border-border rounded-full text-xs font-medium text-muted-foreground flex items-center gap-1.5"
                  >
                    <Check className="w-3 h-3 text-primary" />
                    {amenity}
                  </span>
                ))}
              </div>
            </div>

            {/* Owner Score (desktop) */}
            {property.owner_trust_score != null && (
              <div className="hidden md:flex items-center gap-3 p-3 bg-secondary/50 rounded-xl border border-border">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground font-medium">
                    Score de confiance du propriétaire
                  </p>
                  <p className="font-bold text-foreground">
                    {property.owner_full_name || 'Propriétaire vérifié'}
                  </p>
                </div>
                <ScoreBadge score={property.owner_trust_score} variant="compact" size="md" />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Link to={`/proprietes/${property.id}`} className="flex-1">
                <Button className="w-full bg-foreground hover:bg-foreground/90 text-background py-6 rounded-xl font-bold shadow-lg">
                  <Calendar className="w-5 h-5 mr-2" />
                  Demander une visite
                </Button>
              </Link>
              <button
                className="px-4 py-4 border-2 border-border rounded-xl hover:border-primary hover:text-primary transition-colors"
                aria-label="Ajouter aux favoris"
              >
                <Heart className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
