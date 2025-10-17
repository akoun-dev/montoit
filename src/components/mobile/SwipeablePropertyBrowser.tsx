import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo, useAnimation } from 'framer-motion';
import { Property } from '@/types';
import { MobilePropertyCard } from './MobilePropertyCard';
import { triggerHapticFeedback } from '@/utils/haptics';
import { cn } from '@/lib/utils';

type SwipeDirection = 'left' | 'right' | 'up' | 'down';

interface SwipeAction {
  direction: SwipeDirection;
  threshold: number;
  onAction: (property: Property) => void;
  icon?: React.ReactNode;
  label?: string;
  color?: string;
}

interface SwipeablePropertyBrowserProps {
  properties: Property[];
  onPropertyLike?: (property: Property) => void;
  onPropertyPass?: (property: Property) => void;
  onPropertySuperLike?: (property: Property) => void;
  onPropertyView?: (property: Property) => void;
  onLoadMore?: () => void;
  isLoading?: boolean;
  hasMore?: boolean;
  className?: string;
  swipeActions?: SwipeAction[];
}

export const SwipeablePropertyBrowser = ({
  properties,
  onPropertyLike,
  onPropertyPass,
  onPropertySuperLike,
  onPropertyView,
  onLoadMore,
  isLoading = false,
  hasMore = true,
  className
}: SwipeablePropertyBrowserProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right' | 'up' | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [favoriteProperties, setFavoriteProperties] = useState<Set<string>>(new Set());
  const controls = useAnimation();
  const containerRef = useRef<HTMLDivElement>(null);

  const currentProperty = properties[currentIndex];
  const canSwipe = currentProperty && !isLoading;

  // Default swipe actions
  const defaultSwipeActions: SwipeAction[] = [
    {
      direction: 'left',
      threshold: 100,
      onAction: (property) => {
        if (onPropertyLike) onPropertyLike(property);
        setFavoriteProperties(prev => new Set([...prev, property.id]));
      },
      icon: '❤️',
      label: 'Favoris',
      color: 'bg-red-500'
    },
    {
      direction: 'right',
      threshold: 100,
      onAction: (property) => {
        if (onPropertyPass) onPropertyPass(property);
      },
      icon: '❌',
      label: 'Passer',
      color: 'bg-gray-500'
    },
    {
      direction: 'up',
      threshold: 150,
      onAction: (property) => {
        if (onPropertySuperLike) onPropertySuperLike(property);
        setFavoriteProperties(prev => new Set([...prev, property.id]));
      },
      icon: '⭐',
      label: 'Super Favoris',
      color: 'bg-blue-500'
    }
  ];

  const swipeActions = defaultSwipeActions;

  const handleDragEnd = useCallback((event: any, info: PanInfo) => {
    if (!canSwipe) return;

    const { offset, velocity } = info;
    const threshold = 50;
    const velocityThreshold = 500;

    setDirection(null);
    setIsDragging(false);

    // Check for swipe actions
    for (const action of swipeActions) {
      let shouldTrigger = false;

      switch (action.direction) {
        case 'left':
          shouldTrigger = offset.x < -action.threshold || velocity.x < -velocityThreshold;
          break;
        case 'right':
          shouldTrigger = offset.x > action.threshold || velocity.x > velocityThreshold;
          break;
        case 'up':
          shouldTrigger = offset.y < -action.threshold || velocity.y < -velocityThreshold;
          break;
        case 'down':
          shouldTrigger = offset.y > action.threshold || velocity.y > velocityThreshold;
          break;
      }

      if (shouldTrigger) {
        triggerHapticFeedback('heavy');
        setDirection(action.direction);
        action.onAction(currentProperty);

        // Animate card out
        let exitX = 0;
        let exitY = 0;
        let exitRotate = 0;

        switch (action.direction) {
          case 'left':
            exitX = -300;
            exitRotate = -30;
            break;
          case 'right':
            exitX = 300;
            exitRotate = 30;
            break;
          case 'up':
            exitY = -300;
            break;
          case 'down':
            exitY = 300;
            break;
        }

        controls.start({
          x: exitX,
          y: exitY,
          rotate: exitRotate,
          opacity: 0,
          transition: { duration: 0.3, ease: 'easeOut' }
        });

        setTimeout(() => {
          setCurrentIndex(prev => prev + 1);
          controls.set({ x: 0, y: 0, rotate: 0, opacity: 1 });
        }, 300);

        return;
      }
    }

    // Reset card position if no threshold met
    controls.start({
      x: 0,
      y: 0,
      rotate: 0,
      transition: { type: 'spring', stiffness: 300, damping: 30 }
    });
  }, [canSwipe, currentProperty, controls, swipeActions]);

  const handleDrag = useCallback((event: any, info: PanInfo) => {
    if (!canSwipe) return;

    setDirection(null);

    // Show visual feedback for close thresholds
    for (const action of swipeActions) {
      let isNearThreshold = false;

      switch (action.direction) {
        case 'left':
          isNearThreshold = info.offset.x < -action.threshold / 2;
          break;
        case 'right':
          isNearThreshold = info.offset.x > action.threshold / 2;
          break;
        case 'up':
          isNearThreshold = info.offset.y < -action.threshold / 2;
          break;
      }

      if (isNearThreshold) {
        setDirection(action.direction);
        break;
      }
    }
  }, [canSwipe, swipeActions]);

  const handleNext = useCallback(() => {
    if (canSwipe) {
      triggerHapticFeedback('medium');
      if (onPropertyPass) onPropertyPass(currentProperty);

      controls.start({
        x: 300,
        rotate: 30,
        opacity: 0,
        transition: { duration: 0.3 }
      });

      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        controls.set({ x: 0, y: 0, rotate: 0, opacity: 1 });
      }, 300);
    }
  }, [canSwipe, currentProperty, controls, onPropertyPass]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      triggerHapticFeedback('light');
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const handleFavorite = useCallback((propertyId: string) => {
    const property = properties.find(p => p.id === propertyId);
    if (property && onPropertyLike) {
      onPropertyLike(property);
      setFavoriteProperties(prev => {
        const newSet = new Set(prev);
        if (newSet.has(propertyId)) {
          newSet.delete(propertyId);
        } else {
          newSet.add(propertyId);
        }
        return newSet;
      });
    }
  }, [properties, onPropertyLike]);

  // Load more properties when approaching end
  useEffect(() => {
    if (properties.length > 0 && currentIndex >= properties.length - 3 && hasMore && !isLoading) {
      if (onLoadMore) onLoadMore();
    }
  }, [currentIndex, properties.length, hasMore, isLoading, onLoadMore]);

  // Reset if properties change significantly
  useEffect(() => {
    if (properties.length === 0) {
      setCurrentIndex(0);
    } else if (currentIndex >= properties.length) {
      setCurrentIndex(0);
    }
  }, [properties, currentIndex]);

  if (properties.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-6xl mb-4">🏠</div>
          <h3 className="text-xl font-semibold mb-2">Aucune propriété disponible</h3>
          <p className="text-gray-500">Essayez de modifier vos filtres de recherche</p>
        </div>
      </div>
    );
  }

  if (currentIndex >= properties.length && !isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-xl font-semibold mb-2">Vous avez tout vu !</h3>
          <p className="text-gray-500 mb-4">Revenez plus tard pour de nouvelles propriétés</p>
          <button
            onClick={() => setCurrentIndex(0)}
            className="px-6 py-2 bg-primary text-white rounded-xl font-medium"
          >
            Recommencer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-full flex items-center justify-center overflow-hidden",
        className
      )}
    >
      {/* Swipe Indicators */}
      {canSwipe && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {/* Left indicator - Like */}
          {direction === 'left' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute left-8 top-1/2 transform -translate-y-1/2"
            >
              <div className="flex flex-col items-center text-green-500">
                <div className="text-4xl mb-2">💚</div>
                <span className="text-sm font-medium bg-green-500 text-white px-3 py-1 rounded-full">
                  Favoris
                </span>
              </div>
            </motion.div>
          )}

          {/* Right indicator - Pass */}
          {direction === 'right' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute right-8 top-1/2 transform -translate-y-1/2"
            >
              <div className="flex flex-col items-center text-red-500">
                <div className="text-4xl mb-2">❌</div>
                <span className="text-sm font-medium bg-red-500 text-white px-3 py-1 rounded-full">
                  Passer
                </span>
              </div>
            </motion.div>
          )}

          {/* Up indicator - Super Like */}
          {direction === 'up' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute top-8 left-1/2 transform -translate-x-1/2"
            >
              <div className="flex flex-col items-center text-blue-500">
                <div className="text-4xl mb-2">⭐</div>
                <span className="text-sm font-medium bg-blue-500 text-white px-3 py-1 rounded-full">
                  Super Favoris
                </span>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Property Cards Stack */}
      <div className="relative w-full h-full max-w-md mx-auto">
        <AnimatePresence>
          {properties.slice(currentIndex, currentIndex + 2).map((property, index) => {
            const isTopCard = index === 0;
            const isCurrentProperty = currentIndex === properties.indexOf(property);

            return (
              <motion.div
                key={`${property.id}-${currentIndex}`}
                className="absolute inset-0"
                style={{
                  zIndex: properties.length - (currentIndex + index),
                  transform: `scale(${1 - index * 0.05}) translateY(${index * 10}px)`,
                }}
              >
                <MobilePropertyCard
                  property={property}
                  currentIndex={currentIndex + index}
                  total={properties.length}
                  isFavorite={favoriteProperties.has(property.id)}
                  onFavorite={isTopCard ? handleFavorite : undefined}
                  onNext={isTopCard ? handleNext : undefined}
                  onPrevious={isTopCard && currentIndex > 0 ? handlePrevious : undefined}
                  onViewDetails={onPropertyView ? () => onPropertyView(property) : undefined}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-50">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement de nouvelles propriétés...</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {canSwipe && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
          <div className="flex items-center gap-4 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg">
            {/* Rewind button */}
            {currentIndex > 0 && (
              <button
                onClick={handlePrevious}
                className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <span className="text-lg">↶</span>
              </button>
            )}

            {/* Pass button */}
            <button
              onClick={() => {
                setDirection('right');
                handleNext();
              }}
              className="p-4 rounded-full bg-red-100 hover:bg-red-200 transition-colors"
            >
              <span className="text-2xl">❌</span>
            </button>

            {/* View button */}
            <button
              onClick={() => onPropertyView?.(currentProperty)}
              className="p-3 rounded-full bg-blue-100 hover:bg-blue-200 transition-colors"
            >
              <span className="text-lg">👁️</span>
            </button>

            {/* Like button */}
            <button
              onClick={() => {
                setDirection('left');
                if (onPropertyLike) onPropertyLike(currentProperty);
                handleNext();
              }}
              className="p-4 rounded-full bg-green-100 hover:bg-green-200 transition-colors"
            >
              <span className="text-2xl">💚</span>
            </button>
          </div>
        </div>
      )}

      {/* Property counter */}
      {properties.length > 0 && (
        <div className="absolute top-4 right-4 z-20">
          <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-sm font-medium">
            {currentIndex + 1} / {properties.length}
          </div>
        </div>
      )}
    </div>
  );
};

export default SwipeablePropertyBrowser;