import { Skeleton } from './Skeleton';

interface GlobalLoadingSkeletonProps {
  variant?: 'default' | 'dashboard' | 'property' | 'list' | 'form';
}

export function GlobalLoadingSkeleton({ variant = 'default' }: GlobalLoadingSkeletonProps) {
  return (
    <div className="min-h-screen bg-background animate-fade-in">
      {/* Header Skeleton */}
      <div className="h-16 bg-card border-b border-border px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton width={120} height={32} className="rounded-lg" />
          <div className="hidden md:flex gap-6">
            <Skeleton width={80} height={20} />
            <Skeleton width={80} height={20} />
            <Skeleton width={80} height={20} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton variant="circular" width={40} height={40} />
        </div>
      </div>

      {/* Content Skeleton based on variant */}
      <div className="container mx-auto px-4 py-8">
        {variant === 'default' && <DefaultSkeleton />}
        {variant === 'dashboard' && <DashboardSkeleton />}
        {variant === 'property' && <PropertySkeleton />}
        {variant === 'list' && <ListSkeleton />}
        {variant === 'form' && <FormSkeleton />}
      </div>
    </div>
  );
}

function DefaultSkeleton() {
  return (
    <div className="space-y-6">
      {/* Hero/Title area */}
      <div className="space-y-3">
        <Skeleton width="40%" height={36} className="rounded-lg" />
        <Skeleton width="60%" height={20} />
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card rounded-2xl p-6 space-y-4 shadow-sm">
            <Skeleton height={160} className="rounded-xl" />
            <Skeleton width="70%" height={24} />
            <Skeleton width="50%" height={16} />
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" width={64} height={64} />
        <div className="space-y-2">
          <Skeleton width={200} height={28} />
          <Skeleton width={150} height={16} />
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card rounded-2xl p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <Skeleton variant="circular" width={40} height={40} />
              <Skeleton width={60} height={24} />
            </div>
            <Skeleton width="80%" height={14} />
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl p-6 space-y-4 shadow-sm">
          <Skeleton width={150} height={24} />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                <Skeleton variant="circular" width={40} height={40} />
                <div className="flex-1 space-y-2">
                  <Skeleton width="60%" height={16} />
                  <Skeleton width="40%" height={12} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card rounded-2xl p-6 space-y-4 shadow-sm">
          <Skeleton width={150} height={24} />
          <Skeleton height={200} className="rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function PropertySkeleton() {
  return (
    <div className="space-y-6">
      {/* Image gallery */}
      <div className="grid grid-cols-4 gap-2 h-[400px]">
        <div className="col-span-2 row-span-2">
          <Skeleton height="100%" className="rounded-l-2xl" />
        </div>
        <Skeleton height="100%" />
        <Skeleton height="100%" className="rounded-tr-2xl" />
        <Skeleton height="100%" />
        <Skeleton height="100%" className="rounded-br-2xl" />
      </div>

      {/* Property info */}
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="space-y-3">
            <Skeleton width="70%" height={32} />
            <Skeleton width="40%" height={20} />
          </div>
          <div className="flex gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton variant="circular" width={32} height={32} />
                <Skeleton width={60} height={16} />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <Skeleton width={120} height={24} />
            <Skeleton width="100%" height={16} />
            <Skeleton width="90%" height={16} />
            <Skeleton width="80%" height={16} />
          </div>
        </div>
        <div className="bg-card rounded-2xl p-6 space-y-4 shadow-sm h-fit">
          <Skeleton width="60%" height={28} />
          <div className="flex items-center gap-3">
            <Skeleton variant="circular" width={48} height={48} />
            <div className="space-y-2">
              <Skeleton width={100} height={18} />
              <Skeleton width={80} height={14} />
            </div>
          </div>
          <Skeleton height={48} className="rounded-xl" />
          <Skeleton height={48} className="rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} width={100} height={40} className="rounded-full" />
        ))}
      </div>

      {/* List items */}
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-card rounded-2xl p-4 flex gap-4 shadow-sm">
            <Skeleton width={120} height={90} className="rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton width="60%" height={20} />
              <Skeleton width="40%" height={16} />
              <Skeleton width="30%" height={14} />
            </div>
            <div className="flex flex-col justify-between items-end">
              <Skeleton width={80} height={24} />
              <Skeleton width={60} height={32} className="rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Form header */}
      <div className="space-y-2">
        <Skeleton width="50%" height={32} />
        <Skeleton width="70%" height={18} />
      </div>

      {/* Form fields */}
      <div className="bg-card rounded-2xl p-6 space-y-5 shadow-sm">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton width={100} height={16} />
            <Skeleton height={48} className="rounded-xl" />
          </div>
        ))}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton width={80} height={16} />
            <Skeleton height={48} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton width={80} height={16} />
            <Skeleton height={48} className="rounded-xl" />
          </div>
        </div>
        <Skeleton height={48} width={150} className="rounded-xl mt-4" />
      </div>
    </div>
  );
}

export default GlobalLoadingSkeleton;
