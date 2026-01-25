import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export interface KPICardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    label?: string;
  };
  size?: 'default' | 'large';
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
  onClick?: () => void;
}

export function KPICard({
  title,
  value,
  icon,
  trend,
  size = 'default',
  variant = 'default',
  className = '',
  onClick,
}: KPICardProps) {
  const variantStyles = {
    default: {
      container: 'bg-white border-gray-200 hover:border-primary-200',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary-600',
      trendUp: 'text-green-600',
      trendDown: 'text-red-600',
      trendNeutral: 'text-gray-500',
    },
    success: {
      container: 'bg-white border-green-200 hover:border-green-300',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      trendUp: 'text-green-600',
      trendDown: 'text-red-600',
      trendNeutral: 'text-gray-500',
    },
    warning: {
      container: 'bg-white border-amber-200 hover:border-amber-300',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      trendUp: 'text-green-600',
      trendDown: 'text-red-600',
      trendNeutral: 'text-gray-500',
    },
    danger: {
      container: 'bg-white border-red-200 hover:border-red-300',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      trendUp: 'text-green-600',
      trendDown: 'text-red-600',
      trendNeutral: 'text-gray-500',
    },
    info: {
      container: 'bg-white border-blue-200 hover:border-blue-300',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      trendUp: 'text-green-600',
      trendDown: 'text-red-600',
      trendNeutral: 'text-gray-500',
    },
  };

  const styles = variantStyles[variant];
  const isClickable = onClick !== undefined;

  const getTrendIcon = () => {
    if (!trend) return Minus;
    if (trend.value > 0) return TrendingUp;
    if (trend.value < 0) return TrendingDown;
    return Minus;
  };
  const TrendIcon = getTrendIcon();

  const getTrendColor = () => {
    if (!trend) return styles.trendNeutral;
    if (trend.value > 0) return styles.trendUp;
    if (trend.value < 0) return styles.trendDown;
    return styles.trendNeutral;
  };
  const trendColor = getTrendColor();

  return (
    <div
      className={cn(
        'relative rounded-xl border p-6 transition-all duration-200',
        styles.container,
        isClickable && 'cursor-pointer hover:shadow-md active:scale-[0.98]',
        size === 'large' && 'p-8',
        className
      )}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className={cn(
            'font-bold tracking-tight',
            size === 'large' ? 'text-4xl' : 'text-3xl'
          )}>
            {value}
          </p>

          {trend && (
            <div className={cn('flex items-center gap-1 mt-2', trendColor)}>
              <TrendIcon className="h-4 w-4" />
              <span className="text-sm font-medium">
                {trend.value > 0 ? '+' : ''}{trend.value}%
              </span>
              {trend.label && (
                <span className="text-sm text-gray-500 ml-1">{trend.label}</span>
              )}
            </div>
          )}
        </div>

        <div className={cn('p-3 rounded-xl', styles.iconBg)}>
          <div className={cn('w-6 h-6', styles.iconColor)}>
            {icon}
          </div>
        </div>
      </div>
    </div>
   );
}
