import { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'default' | 'search' | 'filter' | 'error' | 'success';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  illustration?: ReactNode;
}

const VARIANT_STYLES = {
  default: {
    container: 'bg-white',
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-400',
  },
  search: {
    container: 'bg-white',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-400',
  },
  filter: {
    container: 'bg-white',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-400',
  },
  error: {
    container: 'bg-red-50',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-400',
  },
  success: {
    container: 'bg-green-50',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-400',
  },
};

const SIZE_STYLES = {
  sm: {
    container: 'p-6',
    iconSize: 'h-10 w-10',
    titleSize: 'text-base',
    descriptionSize: 'text-sm',
  },
  md: {
    container: 'p-8',
    iconSize: 'h-14 w-14',
    titleSize: 'text-lg',
    descriptionSize: 'text-sm',
  },
  lg: {
    container: 'p-12',
    iconSize: 'h-20 w-20',
    titleSize: 'text-xl',
    descriptionSize: 'text-base',
  },
};

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  variant = 'default',
  size = 'md',
  className = '',
  illustration,
}: EmptyStateProps) {
  const variantStyle = VARIANT_STYLES[variant];
  const sizeStyle = SIZE_STYLES[size];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-gray-300',
        variantStyle.container,
        sizeStyle.container,
        className
      )}
    >
      {/* Illustration or Icon */}
      {illustration ? (
        <div className="mb-4">{illustration}</div>
      ) : icon ? (
        <div className={cn(
          'flex items-center justify-center rounded-full mb-4',
          variantStyle.iconBg,
          sizeStyle.iconSize
        )}>
          <div className={cn(variantStyle.iconColor, 'w-1/2 h-1/2')}>
            {icon}
          </div>
        </div>
      ) : null}

      {/* Title */}
      <h3 className={cn('font-semibold text-gray-900', sizeStyle.titleSize)}>
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className={cn('text-gray-500 mt-2 max-w-md', sizeStyle.descriptionSize)}>
          {description}
        </p>
      )}

      {/* Action Button */}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
