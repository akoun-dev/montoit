import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Star, Share2, Bookmark, Check, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { triggerHapticFeedback } from '@/utils/haptics';
import { cn } from '@/lib/utils';

// Animated Button Component
export const AnimatedButton = ({
  children,
  onClick,
  variant = 'default',
  size = 'default',
  className,
  icon,
  success = false,
  loading = false,
  ...props
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'outline' | 'ghost' | 'success';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  icon?: React.ReactNode;
  success?: boolean;
  loading?: boolean;
  [key: string]: any;
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const handleClick = () => {
    triggerHapticFeedback('light');
    if (onClick) onClick();
  };

  return (
    <motion.div
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      <Button
        onClick={handleClick}
        variant={variant}
        size={size}
        disabled={loading}
        className={cn(
          "relative overflow-hidden transition-all duration-200",
          success && "bg-green-500 hover:bg-green-600",
          className
        )}
        {...props}
      >
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, rotate: 0 }}
              animate={{ opacity: 1, rotate: 360 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="mr-2"
            >
              <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            </motion.div>
          )}

          {success && !loading && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.3 }}
              className="mr-2"
            >
              <Check className="h-4 w-4" />
            </motion.div>
          )}

          {!loading && !success && icon && (
            <motion.div
              key="icon"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="mr-2"
            >
              {icon}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {children}
        </motion.span>

        {/* Ripple effect */}
        {isPressed && (
          <motion.div
            className="absolute inset-0 bg-white/20"
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.6 }}
            style={{ borderRadius: '50%' }}
          />
        )}
      </Button>
    </motion.div>
  );
};

// Interactive Favorite Button
export const InteractiveFavoriteButton = ({
  isFavorite,
  onToggle,
  size = 'md',
  showLabel = false
}: {
  isFavorite: boolean;
  onToggle: () => void;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleToggle = () => {
    setIsAnimating(true);
    triggerHapticFeedback('heavy');
    onToggle();
    setTimeout(() => setIsAnimating(false), 600);
  };

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <motion.button
      onClick={handleToggle}
      className={cn(
        "relative flex items-center justify-center rounded-full transition-colors",
        isFavorite
          ? "bg-red-500 hover:bg-red-600 text-white"
          : "bg-gray-100 hover:bg-gray-200 text-gray-600",
        sizeClasses[size]
      )}
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.1 }}
    >
      <AnimatePresence mode="wait">
        {isFavorite ? (
          <motion.div
            key="filled"
            initial={{ scale: 0, rotate: -180 }}
            animate={{
              scale: [0, 1.2, 1],
              rotate: [0, 10, -10, 0]
            }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ duration: 0.6 }}
          >
            <Heart className={cn("fill-current", iconSizes[size])} />
            {isAnimating && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                initial={{ scale: 1, opacity: 1 }}
                animate={{ scale: 3, opacity: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Heart className="fill-current text-red-500" />
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="outline"
            initial={{ scale: 0, rotate: 180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: -180 }}
            transition={{ duration: 0.3 }}
          >
            <Heart className={iconSizes[size]} />
          </motion.div>
        )}
      </AnimatePresence>

      {showLabel && (
        <motion.span
          className="ml-2 text-sm font-medium"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          {isFavorite ? 'Favoris' : 'Ajouter'}
        </motion.span>
      )}
    </motion.button>
  );
};

// Interactive Rating Component
export const InteractiveRating = ({
  value,
  onChange,
  max = 5,
  readonly = false,
  size = 'md'
}: {
  value: number;
  onChange?: (rating: number) => void;
  max?: number;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) => {
  const [hoveredRating, setHoveredRating] = useState(0);
  const [animatingRating, setAnimatingRating] = useState<number | null>(null);

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const handleRatingClick = (rating: number) => {
    if (readonly || !onChange) return;

    setAnimatingRating(rating);
    triggerHapticFeedback('light');
    onChange(rating);
    setTimeout(() => setAnimatingRating(null), 500);
  };

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }, (_, index) => {
        const starValue = index + 1;
        const isFilled = starValue <= (hoveredRating || value);
        const isAnimating = animatingRating === starValue;

        return (
          <motion.button
            key={index}
            onClick={() => handleRatingClick(starValue)}
            onMouseEnter={() => !readonly && setHoveredRating(starValue)}
            onMouseLeave={() => !readonly && setHoveredRating(0)}
            disabled={readonly}
            className={cn(
              "transition-colors",
              !readonly && "hover:scale-110 cursor-pointer"
            )}
            whileTap={!readonly ? { scale: 0.9 } : {}}
          >
            <motion.div
              animate={
                isAnimating
                  ? {
                      scale: [1, 1.5, 1],
                      rotate: [0, 10, -10, 0]
                    }
                  : {}
              }
              transition={{ duration: 0.5 }}
            >
              <Star
                className={cn(
                  sizeClasses[size],
                  isFilled
                    ? "fill-yellow-400 text-yellow-400"
                    : "fill-transparent text-gray-300"
                )}
              />
            </motion.div>
          </motion.button>
        );
      })}

      <AnimatePresence>
        {animatingRating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="ml-2"
          >
            <Sparkles className="h-4 w-4 text-yellow-400" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Success Toast Animation
export const SuccessToast = ({
  message,
  isVisible,
  onHide
}: {
  message: string;
  isVisible: boolean;
  onHide: () => void;
}) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onHide();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onHide]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -100, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
        >
          <Card className="bg-green-500 text-white border-0 shadow-lg">
            <div className="flex items-center gap-3 p-4">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: 'spring' }}
              >
                <Check className="h-5 w-5" />
              </motion.div>

              <motion.span
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="font-medium"
              >
                {message}
              </motion.span>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Interactive Share Button
export const InteractiveShareButton = ({
  onShare,
  shared = false
}: {
  onShare: () => void;
  shared?: boolean;
}) => {
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    setIsSharing(true);
    triggerHapticFeedback('medium');

    try {
      await onShare();
      setTimeout(() => setIsSharing(false), 1000);
    } catch (error) {
      setIsSharing(false);
    }
  };

  return (
    <motion.button
      onClick={handleShare}
      disabled={isSharing}
      className="relative p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.1 }}
    >
      <AnimatePresence mode="wait">
        {isSharing || shared ? (
          <motion.div
            key="shared"
            initial={{ scale: 0, rotate: -180 }}
            animate={{
              scale: [0, 1.2, 1],
              rotate: [0, 360]
            }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ duration: 0.6 }}
          >
            <Check className="h-4 w-4 text-green-500" />
          </motion.div>
        ) : (
          <motion.div
            key="share"
            initial={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <Share2 className="h-4 w-4" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share particles animation */}
      <AnimatePresence>
        {isSharing && (
          <>
            {[0, 1, 2].map((index) => (
              <motion.div
                key={index}
                className="absolute top-1/2 left-1/2 w-2 h-2 bg-blue-500 rounded-full"
                initial={{ scale: 0, opacity: 1 }}
                animate={{
                  scale: [0, 2],
                  opacity: [1, 0],
                  x: [0, Math.cos((index * 120) * Math.PI / 180) * 20],
                  y: [0, Math.sin((index * 120) * Math.PI / 180) * 20]
                }}
                transition={{ duration: 0.6 }}
              />
            ))}
          </>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

// Floating Action Button with Menu
export const FloatingActionMenu = ({
  actions,
  isOpen,
  onToggle
}: {
  actions: Array<{
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    color?: string;
  }>;
  isOpen: boolean;
  onToggle: () => void;
}) => {
  return (
    <div className="fixed bottom-24 right-6 z-40">
      {/* Action Items */}
      <AnimatePresence>
        {isOpen && actions.map((action, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{
              opacity: 1,
              y: -((index + 1) * 60),
              scale: 1
            }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            transition={{
              duration: 0.3,
              delay: index * 0.05,
              type: 'spring'
            }}
            className="absolute right-0"
          >
            <motion.button
              onClick={() => {
                triggerHapticFeedback('light');
                action.onClick();
                onToggle();
              }}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-full shadow-lg",
                action.color || 'bg-white text-gray-700'
              )}
            >
              <span className="text-sm font-medium whitespace-nowrap">
                {action.label}
              </span>
              <div className="flex-shrink-0">
                {action.icon}
              </div>
            </motion.button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        onClick={() => {
          triggerHapticFeedback('medium');
          onToggle();
        }}
        className="relative h-14 w-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center"
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05 }}
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="relative">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-0.5 bg-white" />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-0.5 h-6 bg-white" />
          </div>
        </motion.div>

        {/* Ripple effect */}
        {isOpen && (
          <motion.div
            className="absolute inset-0 bg-primary rounded-full"
            initial={{ scale: 1, opacity: 0.3 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
        )}
      </motion.button>
    </div>
  );
};

// Interactive Badge
export const InteractiveBadge = ({
  children,
  onClick,
  isActive = false,
  variant = 'default'
}: {
  children: React.ReactNode;
  onClick?: () => void;
  isActive?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'error';
}) => {
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = () => {
    setIsClicked(true);
    triggerHapticFeedback('light');
    if (onClick) onClick();
    setTimeout(() => setIsClicked(false), 600);
  };

  const variantClasses = {
    default: 'bg-gray-100 hover:bg-gray-200 text-gray-700',
    success: 'bg-green-100 hover:bg-green-200 text-green-700',
    warning: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700',
    error: 'bg-red-100 hover:bg-red-200 text-red-700'
  };

  return (
    <motion.div
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition-colors",
        variantClasses[variant],
        isActive && 'ring-2 ring-primary ring-offset-2',
        onClick && 'hover:scale-105'
      )}
      whileTap={{ scale: 0.95 }}
      animate={isClicked ? { scale: [1, 1.1, 1] } : {}}
      transition={{ duration: 0.3 }}
    >
      {children}

      {isClicked && (
        <motion.div
          className="absolute inset-0 rounded-full bg-primary/20"
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.6 }}
        />
      )}
    </motion.div>
  );
};

export default MobileMicroInteractions;