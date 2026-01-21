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
  suffix?: string;
  className?: string;
}

export function StatCard({ title, value, icon: Icon, growth, suffix, className }: StatCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
      if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
      return val.toLocaleString('fr-FR');
    }
    return val;
  };

  const getGrowthColor = (g: number) => {
    if (g > 0) return 'text-emerald-600 bg-emerald-50';
    if (g < 0) return 'text-red-600 bg-red-50';
    return 'text-muted-foreground bg-muted';
  };

  const GrowthIcon =
    growth && growth > 0 ? TrendingUp : growth && growth < 0 ? TrendingDown : Minus;

  return (
    <div className={cn('bg-card rounded-2xl border border-border p-6 shadow-sm', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">
            {formatValue(value)}
            {suffix && (
              <span className="ml-1 text-lg font-normal text-muted-foreground">{suffix}</span>
            )}
          </p>
        </div>
        <div className="rounded-xl bg-primary/10 p-3">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>

      {growth !== undefined && (
        <div className="mt-4 flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
              getGrowthColor(growth)
            )}
          >
            <GrowthIcon className="h-3 w-3" />
            {growth > 0 ? '+' : ''}
            {growth}%
          </span>
          <span className="text-xs text-muted-foreground">vs période précédente</span>
        </div>
      )}
    </div>
  );
}
