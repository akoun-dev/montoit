import { HTMLAttributes } from 'react';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse',
  className = '',
  style,
  ...props
}: SkeletonProps) {
  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]',
    none: '',
  };

  const baseClasses = 'bg-gray-200';

  const widthStyle = typeof width === 'number' ? `${width}px` : width;
  const heightStyle = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={{
        width: widthStyle,
        height: heightStyle,
        ...style,
      }}
      {...props}
    />
  );
}

export function SkeletonText({
  lines = 3,
  className = '',
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} variant="text" width={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </div>
  );
}

export function PropertyCardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-xl shadow-md overflow-hidden ${className}`}>
      <Skeleton height={200} className="w-full" />
      <div className="p-4 space-y-3">
        <Skeleton variant="text" width="40%" height={24} />
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" width="60%" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton variant="text" width={100} height={28} />
          <Skeleton variant="circular" width={40} height={40} />
        </div>
      </div>
    </div>
  );
}

export function PropertyDetailSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-6 ${className}`}>
      <Skeleton height={400} className="w-full rounded-2xl" />

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <Skeleton variant="text" width="60%" height={32} />
          <SkeletonText lines={5} />

          <div className="grid grid-cols-2 gap-4 mt-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center space-x-2">
                <Skeleton variant="circular" width={40} height={40} />
                <Skeleton variant="text" width={100} />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl p-4 space-y-3">
            <div className="flex items-center space-x-3">
              <Skeleton variant="circular" width={48} height={48} />
              <div className="flex-1">
                <Skeleton variant="text" width="70%" />
                <Skeleton variant="text" width="50%" className="mt-1" />
              </div>
            </div>
            <Skeleton height={48} className="w-full" />
            <Skeleton height={48} className="w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function FormSkeleton({
  fields = 4,
  className = '',
}: {
  fields?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton variant="text" width={120} height={16} />
          <Skeleton height={48} className="w-full" />
        </div>
      ))}
      <Skeleton height={48} width={200} className="mt-6" />
    </div>
  );
}
