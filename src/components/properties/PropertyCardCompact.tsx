import { Link } from 'react-router-dom';
import { Eye, MessageSquare, MapPin, Euro, Home, Bed, Bath } from 'lucide-react';
import { Property } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/properties/StatusBadge';

interface PropertyCardCompactProps {
  property: Property;
  className?: string;
}

export const PropertyCardCompact = ({ property, className }: PropertyCardCompactProps) => {
  const imageUrl = property.images?.[0] || '/placeholder.svg';

  return (
    <Link to={`/bien/${property.id}`}>
      <div
        className={cn(
          "flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-all duration-200 group",
          className
        )}
      >
        {/* Image miniature */}
        <div className="relative h-16 w-24 shrink-0 rounded-md overflow-hidden">
          <img
            src={imageUrl}
            alt={property.title}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
          <div className="absolute top-1 left-1">
            <StatusBadge status={property.status} variant="compact" />
          </div>
        </div>

        {/* Info principale */}
        <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
          {/* Titre + Type */}
          <div className="md:col-span-2 min-w-0">
            <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
              {property.title}
            </h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <Home className="h-3 w-3" />
              <span className="capitalize">{property.property_type}</span>
              {property.city && (
                <>
                  <span>•</span>
                  <MapPin className="h-3 w-3" />
                  <span>{property.city}</span>
                </>
              )}
            </div>
          </div>

          {/* Prix */}
          <div className="flex items-center gap-1.5">
            <Euro className="h-4 w-4 text-primary" />
            <span className="font-bold text-sm">
              {property.monthly_rent?.toLocaleString('fr-FR')} FCFA
            </span>
          </div>

          {/* Caractéristiques */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {property.bedrooms && (
              <div className="flex items-center gap-1">
                <Bed className="h-3.5 w-3.5" />
                <span>{property.bedrooms}</span>
              </div>
            )}
            {property.bathrooms && (
              <div className="flex items-center gap-1">
                <Bath className="h-3.5 w-3.5" />
                <span>{property.bathrooms}</span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Eye className="h-3.5 w-3.5" />
              <span>{property.view_count || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};
