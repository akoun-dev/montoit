import { Heart, MapPin, Share2, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Property } from '@/types';
import { StatusBadge } from '@/components/properties/StatusBadge';
import { formatPrice } from '@/constants';
import { logger } from '@/services/logger';

interface PropertyHeaderProps {
  property: Property;
  isFavorite: boolean;
  onFavoriteToggle: () => void;
}

export const PropertyHeader = ({ property, isFavorite, onFavoriteToggle }: PropertyHeaderProps) => {
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: property.title,
          text: property.description || '',
          url: window.location.href,
        });
      } catch (error) {
        logger.logError(error, { context: 'PropertyHeader', action: 'share' });
      }
    }
  };

  return (
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
      <div className="flex-1">
        <div className="flex items-start gap-3 mb-3 flex-wrap">
          <h1 className="text-3xl font-bold flex-1">{property.title}</h1>
          <div className="flex gap-2">
            <StatusBadge status={property.status} />
            {property.work_status && property.work_status !== 'aucun_travail' && (
              <Badge className="bg-orange-600 hover:bg-orange-700 text-white">
                <Wrench className="h-4 w-4 mr-1" />
                Travaux {property.work_status === 'travaux_en_cours' ? 'en cours' : 'à effectuer'}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center text-muted-foreground mb-4">
          <MapPin className="h-5 w-5 mr-2" />
          <span className="text-lg">
            {property.address}, {property.city}
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-primary">
            {formatPrice(property.monthly_rent)}
          </span>
          <span className="text-xl text-muted-foreground">/mois</span>
        </div>

        {property.deposit_amount && (
          <p className="text-muted-foreground mt-2">
            Caution: {formatPrice(property.deposit_amount)}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          variant={isFavorite ? "default" : "outline"}
          size="icon"
          onClick={onFavoriteToggle}
          className="rounded-full"
        >
          <Heart className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleShare}
          className="rounded-full"
        >
          <Share2 className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};
