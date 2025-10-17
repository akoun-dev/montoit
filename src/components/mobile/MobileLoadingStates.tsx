import { motion } from 'framer-motion';
import { Loader2, Home, Search, Heart, MapPin, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileLoadingStateProps {
  type: 'skeleton' | 'spinner' | 'property-card' | 'search' | 'map';
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Skeleton Component
export const Skeleton = ({
  className,
  variant = 'default'
}: {
  className?: string;
  variant?: 'default' | 'text' | 'circular' | 'rounded';
}) => {
  return (
    <motion.div
      className={cn(
        "bg-gray-200 animate-pulse",
        {
          'rounded-lg': variant === 'default',
          'rounded': variant === 'text',
          'rounded-full': variant === 'circular',
          'rounded-2xl': variant === 'rounded'
        },
        className
      )}
    />
  );
};

// Property Card Skeleton
export const PropertyCardSkeleton = () => {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden animate-pulse">
      {/* Image skeleton */}
      <div className="relative h-56 bg-gray-200">
        <Skeleton className="absolute inset-0" />

        {/* Status badges */}
        <div className="absolute top-3 left-3 right-3 flex justify-between">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        <div className="flex items-baseline gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-12" />
        </div>

        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/4" />

        <div className="flex items-center gap-4 text-sm">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
        </div>

        <div className="flex gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>

        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
};

// Search Results Skeleton
export const SearchResultsSkeleton = ({ count = 3 }: { count?: number }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-white rounded-xl p-4 shadow-sm animate-pulse"
        >
          <div className="flex gap-4">
            <Skeleton className="w-20 h-20 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Filter Skeleton
export const FilterSkeleton = () => {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-lg space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-2 w-full" />
      </div>
    </div>
  );
};

// Main Mobile Loading State Component
export const MobileLoadingState = ({
  type,
  message,
  size = 'md',
  className
}: MobileLoadingStateProps) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  const renderLoadingContent = () => {
    switch (type) {
      case 'spinner':
        return (
          <div className="flex flex-col items-center justify-center space-y-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Loader2 className={cn("text-primary", sizeClasses[size])} />
            </motion.div>
            {message && (
              <p className="text-sm text-gray-600 text-center">{message}</p>
            )}
          </div>
        );

      case 'property-card':
        return <PropertyCardSkeleton />;

      case 'search':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-center py-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Search className={cn("text-primary", sizeClasses.lg)} />
              </motion.div>
            </div>
            <SearchResultsSkeleton />
          </div>
        );

      case 'skeleton':
        return (
          <div className="space-y-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-20 w-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        );

      case 'map':
        return (
          <div className="relative h-full w-full bg-gray-100 animate-pulse">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-3">
                <MapPin className={cn("text-primary mx-auto", sizeClasses.lg)} />
                <p className="text-sm text-gray-600">
                  {message || 'Chargement de la carte...'}
                </p>
              </div>
            </div>
            {/* Map pin skeletons */}
            <div className="absolute top-1/4 left-1/3">
              <div className="h-8 w-8 bg-primary/30 rounded-full animate-pulse" />
            </div>
            <div className="absolute top-1/2 right-1/4">
              <div className="h-8 w-8 bg-primary/30 rounded-full animate-pulse" />
            </div>
            <div className="absolute bottom-1/3 left-1/2">
              <div className="h-8 w-8 bg-primary/30 rounded-full animate-pulse" />
            </div>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Loader2 className={cn("text-primary", sizeClasses[size])} />
            </motion.div>
          </div>
        );
    }
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center",
        type === 'property-card' || type === 'search' ? 'block' : 'min-h-[200px]',
        className
      )}
    >
      {renderLoadingContent()}
    </div>
  );
};

// Pull-to-refresh Loader
export const PullToRefreshLoader = ({ isRefreshing }: { isRefreshing: boolean }) => {
  return (
    <motion.div
      className="flex justify-center py-4"
      initial={{ opacity: 0, y: -20 }}
      animate={{
        opacity: isRefreshing ? 1 : 0,
        y: isRefreshing ? 0 : -20
      }}
      transition={{ duration: 0.3 }}
    >
      {isRefreshing && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="h-6 w-6 text-primary" />
        </motion.div>
      )}
    </motion.div>
  );
};

// Infinite Scroll Loader
export const InfiniteScrollLoader = ({ isVisible }: { isVisible: boolean }) => {
  return (
    <motion.div
      className="flex justify-center py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center space-x-3 text-gray-500">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="h-5 w-5" />
        </motion.div>
        <span className="text-sm">Chargement...</span>
      </div>
    </motion.div>
  );
};

// Empty State with Loading
export const EmptyStateLoading = ({
  icon,
  title,
  message,
  isSearching
}: {
  icon?: React.ReactNode;
  title: string;
  message: string;
  isSearching?: boolean;
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <motion.div
        animate={isSearching ? { rotate: 360 } : {}}
        transition={isSearching ? { duration: 2, repeat: Infinity, ease: 'linear' } : {}}
        className="mb-4"
      >
        {icon || <Home className="h-12 w-12 text-gray-300" />}
      </motion.div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>

      <p className="text-sm text-gray-500 mb-6 max-w-xs">
        {message}
      </p>

      {isSearching && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="h-6 w-6 text-primary" />
        </motion.div>
      )}
    </div>
  );
};

// Progress Loading for Forms
export const FormProgressLoader = ({
  progress,
  message
}: {
  progress: number;
  message?: string;
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">{message || 'Chargement...'}</span>
        <span className="text-primary font-medium">{Math.round(progress)}%</span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};

export default MobileLoadingState;