import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSwipeable } from 'react-swipeable';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Heart, MapPin, Bed, Bath, Maximize, Clock, Lock, Wrench, ExternalLink, ShieldCheck, Building2 } from 'lucide-react';
import { Property } from '@/types';
import { getPropertyStatusLabel, formatPrice } from '@/constants';
import { supabase } from '@/lib/supabase';
import ANSUTCertifiedBadge from '@/components/ui/ansut-certified-badge';
import { useTimeAgo } from '@/hooks/useTimeAgo';
import { toast } from '@/hooks/use-toast';
import { SimpleImage } from '@/components/property/SimpleImage';
import { useLongPress } from '@/hooks/useLongPress';
import { triggerHapticFeedback } from '@/utils/haptics';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { SwipeableGallery } from '@/components/mobile/SwipeableGallery';
import { CulturalBadge } from '@/components/ui/cultural-badge';

interface PropertyCardProps {
  property: Property;
  onFavoriteClick?: (id: string) => void;
  isFavorite?: boolean;
  variant?: 'default' | 'compact';
  showStatus?: boolean;
  showRemoveButton?: boolean;
}

export const PropertyCard = ({ 
  property, 
  onFavoriteClick,
  isFavorite = false,
  variant = 'default',
  showStatus = true,
  showRemoveButton = false
}: PropertyCardProps) => {
  const [hasCertifiedLease, setHasCertifiedLease] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [agencyName, setAgencyName] = useState<string | null>(null);
  const timeAgo = useTimeAgo(property.created_at);
  const { effectiveType, saveData } = useNetworkStatus();

  // Adapt image quality based on network
  const imageQuality = effectiveType === '4g' && !saveData;

  // Generate demo images for properties without images
  const getDemoImage = (propertyId: string, propertyType: string) => {
    const seed = propertyId.slice(-8); // Use last 8 chars of ID for consistency
    const typeMap: Record<string, string> = {
      'appartement': 'apartment',
      'villa': 'house',
      'studio': 'room',
      'duplex': 'building',
      'bureau': 'office',
      'local_commercial': 'store'
    };
    const imageType = typeMap[propertyType.toLowerCase()] || 'apartment';
    return `https://picsum.photos/seed/${imageType}-${seed}/400/300.jpg`;
  };

  useEffect(() => {
    // Temporarily disabled certification and agency checks
    // TODO: Re-enable when database schema is fully deployed
    // const checkCertification = async () => {
    //   const { data } = await supabase
    //     .from('leases')
    //     .select('id')
    //     .eq('property_id', property.id)
    //     .eq('certification_status', 'certified')
    //     .limit(1)
    //     .maybeSingle();
    //
    //   setHasCertifiedLease(!!data);
    // };

    // const checkAgencyMandate = async () => {
    //   const { data } = await supabase
    //     .from('agency_mandates')
    //     .select('agency_id, profiles!agency_mandates_agency_id_fkey(full_name)')
    //     .eq('property_id', property.id)
    //     .eq('status', 'active')
    //     .limit(1)
    //     .maybeSingle();
    //
    //   if (data && data.profiles) {
    //     setAgencyName((data.profiles as any).full_name);
    //   }
    // };

    // checkCertification();
    // checkAgencyMandate();
  }, [property.id]);

  // Long press for preview
  const longPressProps = useLongPress({
    onLongPress: () => {
      setShowPreview(true);
      triggerHapticFeedback('heavy');
    },
    onClick: () => {}, // Empty, we use Link for navigation
    delay: 500,
  });

  // Swipe to favorite/unfavorite
  const swipeHandlers = useSwipeable({
    onSwipedRight: () => {
      if (!isFavorite && onFavoriteClick) {
        triggerHapticFeedback('heavy');
        onFavoriteClick(property.id);
        toast({
          title: "💙 Ajouté aux favoris !",
          description: "Glissez vers la gauche pour retirer",
          duration: 2000,
        });
      }
    },
    onSwipedLeft: () => {
      if (isFavorite && onFavoriteClick) {
        triggerHapticFeedback('medium');
        onFavoriteClick(property.id);
        toast({
          description: "❤️ Retiré des favoris",
          duration: 2000,
        });
      }
    },
    trackMouse: false,
    delta: 100,
  });

  return (
    <>
      <Card 
        {...swipeHandlers}
        {...longPressProps}
        className="group relative overflow-hidden bg-white shadow-card hover:shadow-card-hover transition-all duration-300 border border-border rounded-2xl animate-scale-in active:scale-95"
        role="article"
        aria-labelledby={`property-title-${property.id}`}
        aria-describedby={`property-description-${property.id}`}
      >
      <div className="relative h-56 sm:h-64 bg-muted overflow-hidden">
        {(() => {
          // Debug: Log property data to understand what we're working with
          console.log(`Property ${property.id} image data:`, {
            main_image: property.main_image,
            images: property.images,
            imagesCount: property.images?.length || 0
          });

          // Try images array first
          if (property.images && Array.isArray(property.images) && property.images.length > 0) {
            const validImages = property.images.filter(img => img && typeof img === 'string' && img.trim() !== '');
            if (validImages.length > 0) {
              return (
                <SimpleImage
                  src={validImages[0]}
                  alt={`${property.title} - ${property.city}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              );
            }
          }

          // Fall back to main_image
          if (property.main_image && typeof property.main_image === 'string' && property.main_image.trim() !== '') {
            return (
              <>
                <SimpleImage
                  src={property.main_image}
                  alt={`Photo du bien: ${property.title} - ${property.property_type} à ${property.city}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
              </>
            );
          }

          // Use demo image as fallback
          const demoImage = getDemoImage(property.id, property.property_type);
          return (
            <>
              <SimpleImage
                src={demoImage}
                alt={`Photo démonstration: ${property.title} - ${property.property_type} à ${property.city}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
              {/* Demo badge */}
              <div className="absolute top-3 left-3">
                <Badge className="text-xs rounded-lg font-semibold shadow-md bg-yellow-500 hover:bg-yellow-600 text-white flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  Démo
                </Badge>
              </div>
            </>
          );
        })()}
        
        {onFavoriteClick && (
          <motion.button
            className="absolute top-3 right-3 rounded-lg shadow-md"
            whileTap={{ scale: 1.2 }}
            animate={isFavorite ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.3 }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              triggerHapticFeedback('heavy');
              onFavoriteClick(property.id);
              toast({
                description: isFavorite ? "❤️ Bien retiré des favoris" : "💙 Bien ajouté aux favoris !",
                duration: 2000,
              });
            }}
          >
            <Button
              size="icon"
              variant={showRemoveButton ? "destructive" : isFavorite ? "default" : "secondary"}
              className="pointer-events-none"
              asChild
            >
              <motion.div
                animate={{
                  rotate: isFavorite ? [0, -15, 15, -15, 0] : 0,
                }}
                transition={{ duration: 0.5 }}
              >
                <Heart className={`h-4 w-4 transition-all duration-300 ${isFavorite ? 'fill-current' : ''}`} />
              </motion.div>
            </Button>
          </motion.button>
        )}
        
        {/* Time badge - top left */}
        <Badge className="absolute top-3 left-3 text-xs rounded-lg font-semibold shadow-md bg-background/90 backdrop-blur-sm text-foreground border border-border/50 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {timeAgo}
        </Badge>
        
        <div className="absolute top-14 left-3 flex flex-col gap-2">
          {showStatus && (
            <Badge 
              className={`text-xs rounded-lg font-semibold shadow-md flex items-center gap-1 ${
                property.status === 'disponible' 
                  ? 'bg-green-500 hover:bg-green-600 text-white animate-pulse' 
                  : property.status === 'en_negociation'
                  ? 'bg-orange-500 hover:bg-orange-600 text-white'
                  : 'bg-gray-400 hover:bg-gray-500 text-white'
              }`}
              role="status"
              aria-live="polite"
            >
              {property.status === 'loué' && <Lock className="h-3 w-3" aria-hidden="true" />}
              {getPropertyStatusLabel(property.status)}
            </Badge>
          )}
          
          {agencyName && (
            <Badge className="text-xs rounded-lg font-semibold shadow-md bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              Géré par {agencyName}
            </Badge>
          )}
          
          {hasCertifiedLease && (
            <CulturalBadge
              variant="ansut"
              size="sm"
              className="shadow-md"
            />
          )}
          
          {property.work_status && property.work_status !== 'aucun_travail' && (
            <Badge className="text-xs rounded-lg font-semibold shadow-md bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-1">
              <Wrench className="h-3 w-3" />
              Travaux
            </Badge>
          )}
        </div>
      </div>

      {/* Screen reader description */}
      <div id={`property-description-${property.id}`} className="sr-only">
        Bien de {property.bedrooms} chambres, {property.bathrooms} salles de bain, 
        situé à {property.city}, pour {formatPrice(property.monthly_rent)} par mois.
        Statut : {getPropertyStatusLabel(property.status)}.
      </div>

      <CardHeader className="p-3 sm:p-4 pb-2">
        <div className="flex items-baseline gap-2 mb-2">
          <p className="text-2xl sm:text-3xl font-black text-primary">
            {formatPrice(property.monthly_rent)}
          </p>
          <span className="text-sm font-medium text-muted-foreground">/mois</span>
        </div>
        <CardTitle id={`property-title-${property.id}`} className="line-clamp-1 text-base sm:text-lg font-bold">
          {property.property_type} {property.bedrooms}ch. - {property.city}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3 p-3 sm:p-4 pt-0">
        <div className="flex items-center text-muted-foreground">
          <MapPin className="h-4 w-4 mr-2 flex-shrink-0 text-primary" />
          <span className="line-clamp-1 font-medium">{property.city}</span>
        </div>

        <div className="flex items-center gap-4 text-sm bg-muted/50 p-2 rounded-xl">
          <div className="flex items-center gap-1">
            <Bed className="h-4 w-4" />
            <span className="font-medium">{property.bedrooms}</span>
          </div>
          <div className="flex items-center gap-1">
            <Bath className="h-4 w-4" />
            <span className="font-medium">{property.bathrooms}</span>
          </div>
          {property.surface_area && (
            <div className="flex items-center gap-1">
              <Maximize className="h-4 w-4" />
              <span className="font-medium">{property.surface_area}m²</span>
            </div>
          )}
        </div>

        {variant === 'default' && (
          <div className="flex flex-wrap gap-1.5">
            {property.is_furnished && <Badge variant="secondary" className="text-xs rounded-full">Meublé</Badge>}
            {property.has_ac && <Badge variant="secondary" className="text-xs rounded-full">Climatisation</Badge>}
            {property.has_parking && <Badge variant="secondary" className="text-xs rounded-full">Parking</Badge>}
            {property.has_garden && <Badge variant="secondary" className="text-xs rounded-full">Jardin</Badge>}
          </div>
        )}

        <Button asChild variant="default" className="w-full rounded-xl min-h-[40px] font-semibold shadow-md active:scale-95">
          <Link to={`/property/${property.id}`}>Découvrir ce bien</Link>
        </Button>
      </CardContent>
    </Card>

    {/* Preview Modal */}
    <Dialog open={showPreview} onOpenChange={setShowPreview}>
      <DialogContent className="max-w-md">
        {(() => {
          // Use same image logic as main card
          if (property.images && Array.isArray(property.images) && property.images.length > 0) {
            const validImages = property.images.filter(img => img && typeof img === 'string' && img.trim() !== '');
            if (validImages.length > 0) {
              return (
                <SimpleImage
                  src={validImages[0]} // Use first image for preview
                  alt={property.title}
                  className="w-full rounded-lg"
                />
              );
            }
          }

          if (property.main_image && typeof property.main_image === 'string' && property.main_image.trim() !== '') {
            return (
              <SimpleImage
                src={property.main_image}
                alt={property.title}
                className="w-full rounded-lg"
              />
            );
          }

          // Use demo image as fallback
          const demoImage = getDemoImage(property.id, property.property_type);
          return (
            <div className="relative">
              <SimpleImage
                src={demoImage}
                alt={`Photo démonstration: ${property.title}`}
                className="w-full rounded-lg"
              />
              {/* Demo badge */}
              <div className="absolute top-2 left-2">
                <Badge className="text-xs rounded-lg font-semibold shadow-md bg-yellow-500 hover:bg-yellow-600 text-white flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  Démo
                </Badge>
              </div>
            </div>
          );
        })()}
        <h3 className="text-xl font-bold">{property.title}</h3>
        <p className="text-2xl text-primary font-bold">
          {formatPrice(property.monthly_rent)} <span className="text-base font-normal">/mois</span>
        </p>
        <div className="flex items-center text-muted-foreground mb-2">
          <MapPin className="h-4 w-4 mr-2" />
          {property.city}
        </div>
        <div className="flex gap-2">
          {onFavoriteClick && (
            <Button
              variant={isFavorite ? "default" : "outline"}
              onClick={() => {
                triggerHapticFeedback('light');
                onFavoriteClick(property.id);
                toast({
                  description: isFavorite ? "❤️ Retiré des favoris" : "💙 Ajouté aux favoris",
                  duration: 2000,
                });
              }}
              className="flex-1"
            >
              <Heart className={`h-4 w-4 mr-2 ${isFavorite ? 'fill-current' : ''}`} />
              Favoris
            </Button>
          )}
          <Button asChild className="flex-1">
            <Link to={`/property/${property.id}`}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Voir
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </>
  );
};
