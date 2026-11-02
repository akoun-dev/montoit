/**
 * StatCard - KPI card with icon, value, and growth indicator
 */

import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  growth?: number;
  change?: number; // Alias for growth for compatibility
  suffix?: string;
  className?: string;
  color?: string;
  bgColor?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  growth,
  change,
  suffix,
  className,
  color,
  bgColor
}: StatCardProps) {
  const actualGrowth = growth !== undefined ? growth : change;
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
      if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
      return val.toLocaleString('fr-FR');
    }
    return val;
  };

  const getGrowthColor = (g: number | undefined) => {
    if (!g) return 'text-muted-foreground bg-muted';
    if (g > 0) return 'text-emerald-600 bg-emerald-50';
    if (g < 0) return 'text-red-600 bg-red-50';
    return 'text-muted-foreground bg-muted';
  };

  const GrowthIcon =
    actualGrowth && actualGrowth > 0 ? TrendingUp : actualGrowth && actualGrowth < 0 ? TrendingDown : Minus;

  return (
    <div className={cn('bg-white rounded-2xl border border-[#EFEBE9] p-6 shadow-sm', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-[#6B5A4E]">{title}</p>
          <p className="mt-2 text-3xl font-bold text-[#2C1810]">
            {formatValue(value)}
            {suffix && (
              <span className="ml-1 text-lg font-normal text-[#6B5A4E]">{suffix}</span>
            )}
          </p>
        </div>
        <div className={cn('rounded-xl p-3', bgColor || 'bg-primary/10')}>
          <Icon className={cn('h-6 w-6', color || 'text-primary')} />
        </div>
      </div>

      {actualGrowth !== undefined && (
        <div className="mt-4 flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
              getGrowthColor(actualGrowth)
            )}
          >
            <GrowthIcon className="h-3 w-3" />
            {actualGrowth > 0 ? '+' : ''}
            {actualGrowth.toFixed(1)}%
          </span>
          <span className="text-xs text-[#6B5A4E]">vs période précédente</span>
        </div>
      )}
    </div>
  );
}
