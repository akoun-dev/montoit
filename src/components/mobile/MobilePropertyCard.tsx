import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Heart, ExternalLink, Share2, MapPin, Phone, Home, Camera, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Property } from '@/types';
import { SimpleImage } from '@/components/property/SimpleImage';
import { triggerHapticFeedback } from '@/utils/haptics';
import { useSwipeable } from 'react-swipeable';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface MobilePropertyCardProps {
  property: Property;
  onFavorite?: (id: string) => void;
  isFavorite?: boolean;
  onViewDetails?: (id: string) => void;
  onShare?: (property: Property) => void;
  onContact?: (property: Property) => void;
  currentIndex?: number;
  total?: number;
  onNext?: () => void;
  onPrevious?: () => void;
}

export const MobilePropertyCard = ({
  property,
  onFavorite,
  isFavorite = false,
  onViewDetails,
  onShare,
  onContact,
  currentIndex = 0,
  total = 1,
  onNext,
  onPrevious
}: MobilePropertyCardProps) => {
  const [imageIndex, setImageIndex] = useState(0);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  // Gesture values
  const x = useMotionValue(0);
  const scale = useSpring(1, { stiffness: 300, damping: 30 });

  // Transform for swipe feedback
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
  const opacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5]);

  // Handle image navigation
  const nextImage = () => {
    const images = getValidImages(property);
    if (images.length > 1) {
      setImageIndex((prev) => (prev + 1) % images.length);
      triggerHapticFeedback('light');
    }
  };

  const previousImage = () => {
    const images = getValidImages(property);
    if (images.length > 1) {
      setImageIndex((prev) => (prev - 1 + images.length) % images.length);
      triggerHapticFeedback('light');
    }
  };

  // Get valid images array
  const getValidImages = (prop: Property): string[] => {
    if (prop.images && Array.isArray(prop.images) && prop.images.length > 0) {
      return prop.images.filter(img => img && typeof img === 'string' && img.trim() !== '');
    }
    if (prop.main_image && typeof prop.main_image === 'string' && prop.main_image.trim() !== '') {
      return [prop.main_image];
    }
    // Demo image fallback
    return [`https://picsum.photos/seed/${prop.id.slice(-8)}/400/300.jpg`];
  };

  const images = getValidImages(property);

  // Swipe handlers for card actions
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (!isFavorite && onFavorite) {
        // Swipe left to favorite
        triggerHapticFeedback('heavy');
        onFavorite(property.id);
        toast({
          title: "💝 Ajouté aux favoris",
          description: "Ce bien a été ajouté à vos favoris",
          duration: 2000,
        });
      }
    },
    onSwipedRight: () => {
      // Swipe right to pass
      triggerHapticFeedback('medium');
      if (onNext) onNext();
    },
    onSwipedUp: () => {
      // Swipe up for quick actions
      setShowQuickActions(true);
      triggerHapticFeedback('selection');
    },
    onSwipedDown: () => {
      setShowQuickActions(false);
    },
    trackMouse: false,
    delta: 50,
    preventDefaultTouchmoveEvent: false,
  });

  // Image swipe handlers
  const imageSwipeHandlers = useSwipeable({
    onSwipedLeft: nextImage,
    onSwipedRight: previousImage,
    trackMouse: false,
    delta: 30,
  });

  // Favorite toggle
  const handleFavorite = () => {
    triggerHapticFeedback('heavy');
    if (onFavorite) onFavorite(property.id);
  };

  // Share property
  const handleShare = () => {
    triggerHapticFeedback('selection');
    if (onShare) onShare(property);
    else {
      if (navigator.share) {
        navigator.share({
          title: property.title,
          text: `${property.title} - ${property.monthly_rent} FCFA/mois`,
          url: window.location.origin + `/property/${property.id}`,
        });
      }
    }
  };

  // View details
  const handleViewDetails = () => {
    triggerHapticFeedback('selection');
    if (onViewDetails) onViewDetails(property.id);
  };

  // Contact agent
  const handleContact = () => {
    triggerHapticFeedback('selection');
    if (onContact) onContact(property);
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center p-4">
      <motion.div
        ref={cardRef}
        className="relative w-full max-w-sm h-[600px] bg-white rounded-3xl shadow-2xl overflow-hidden cursor-grab active:cursor-grabbing"
        style={{ x, rotate, scale, opacity }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={() => {
          x.set(0);
        }}
        whileTap={{ cursor: 'grabbing' }}
        {...swipeHandlers}
      >
        {/* Header with navigation hints */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex justify-between items-center text-white">
            <div className="text-xs font-medium bg-black/30 px-2 py-1 rounded-full">
              {currentIndex + 1}/{total}
            </div>
            <div className="flex gap-2">
              {total > 1 && onPrevious && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPrevious();
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              {total > 1 && onNext && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNext();
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Image Gallery */}
        <div className="relative h-3/5 bg-gray-100" {...imageSwipeHandlers}>
          <AnimatePresence mode="wait">
            <motion.div
              key={imageIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.3 }}
              className="relative w-full h-full"
            >
              <SimpleImage
                src={images[imageIndex]}
                alt={property.title}
                className="w-full h-full object-cover"
                onLoad={() => setIsImageLoading(false)}
              />

              {/* Loading overlay */}
              {isImageLoading && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse" />
              )}

              {/* Image indicators */}
              {images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-1.5">
                  {images.map((_, index) => (
                    <div
                      key={index}
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-200",
                        index === imageIndex
                          ? "w-6 bg-white"
                          : "w-1.5 bg-white/50"
                      )}
                    />
                  ))}
                </div>
              )}

              {/* Quick action buttons overlay */}
              <div className="absolute top-16 right-4 flex flex-col gap-2">
                <motion.div whileTap={{ scale: 0.9 }}>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-10 w-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFavorite();
                    }}
                  >
                    <Heart className={cn("h-4 w-4", isFavorite && "fill-current text-red-500")} />
                  </Button>
                </motion.div>

                <motion.div whileTap={{ scale: 0.9 }}>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-10 w-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare();
                    }}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </motion.div>
              </div>

              {/* Status badges */}
              <div className="absolute top-16 left-4 flex flex-col gap-2">
                <Badge
                  className={cn(
                    "text-xs font-semibold shadow-md",
                    property.status === 'disponible'
                      ? "bg-green-500 hover:bg-green-600"
                      : "bg-gray-500 hover:bg-gray-600"
                  )}
                >
                  {property.status === 'disponible' ? 'Disponible' : 'Indisponible'}
                </Badge>

                {property.is_furnished && (
                  <Badge variant="secondary" className="text-xs">
                    Meublé
                  </Badge>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Swipe hints */}
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60 text-xs">
            <ChevronLeft className="h-6 w-6 animate-pulse" />
          </div>
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/60 text-xs">
            <ChevronRight className="h-6 w-6 animate-pulse" />
          </div>
        </div>

        {/* Content */}
        <div className="h-2/5 p-4 bg-white">
          {/* Price and title */}
          <div className="mb-3">
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-2xl font-black text-gray-900">
                {property.monthly_rent?.toLocaleString('fr-FR')}
              </span>
              <span className="text-sm text-gray-500">FCFA/mois</span>
            </div>
            <h3 className="font-semibold text-gray-900 line-clamp-1">
              {property.title}
            </h3>
          </div>

          {/* Location */}
          <div className="flex items-center text-gray-600 text-sm mb-3">
            <MapPin className="h-4 w-4 mr-1" />
            {property.city}
          </div>

          {/* Quick specs */}
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
            <div className="flex items-center gap-1">
              <Home className="h-4 w-4" />
              <span>{property.bedrooms} ch.</span>
            </div>
            <div className="flex items-center gap-1">
              <Camera className="h-4 w-4" />
              <span>{images.length} photos</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleViewDetails}
              className="h-12 rounded-xl font-semibold bg-primary hover:bg-primary/90"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Voir détails
            </Button>
            <Button
              variant="outline"
              onClick={handleContact}
              className="h-12 rounded-xl font-semibold"
            >
              <Phone className="h-4 w-4 mr-2" />
              Contacter
            </Button>
          </div>
        </div>

        {/* Swipe hints overlay */}
        <div className="absolute bottom-20 left-0 right-0 flex justify-center pointer-events-none">
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="bg-black/10 px-3 py-1 rounded-full text-xs text-gray-600"
          >
            Glissez pour naviguer
          </motion.div>
        </div>
      </motion.div>

      {/* Quick Actions Sheet */}
      <AnimatePresence>
        {showQuickActions && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="absolute bottom-0 left-0 right-0 z-30 p-4"
          >
            <Card className="bg-white rounded-t-3xl shadow-2xl">
              <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-lg">Actions rapides</h3>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setShowQuickActions(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={handleFavorite}
                    className="h-14 flex-col"
                  >
                    <Heart className={cn("h-5 w-5 mb-1", isFavorite && "fill-current text-red-500")} />
                    Favoris
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleShare}
                    className="h-14 flex-col"
                  >
                    <Share2 className="h-5 w-5 mb-1" />
                    Partager
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleContact}
                    className="h-14 flex-col"
                  >
                    <Phone className="h-5 w-5 mb-1" />
                    Appeler
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      triggerHapticFeedback('selection');
                      window.open(`tel:${property.contact_phone || ''}`);
                    }}
                    className="h-14 flex-col"
                  >
                    <MapPin className="h-5 w-5 mb-1" />
                    Visiter
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobilePropertyCard;