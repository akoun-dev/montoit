import { Badge } from '@/components/ui/badge';
import { Shield, Star, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TenantScoreBadgeProps {
  score: number;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const TenantScoreBadge = ({ score, showIcon = true, size = 'md', className }: TenantScoreBadgeProps) => {
  const getScoreConfig = (score: number) => {
    if (score >= 75) {
      return {
        label: 'Excellent',
        variant: 'default' as const,
        icon: Star,
        bgClass: 'bg-green-600 hover:bg-green-700',
        textClass: 'text-white',
      };
    } else if (score >= 60) {
      return {
        label: 'Bon',
        variant: 'secondary' as const,
        icon: Shield,
        bgClass: 'bg-yellow-600 hover:bg-yellow-700',
        textClass: 'text-white',
      };
    } else {
      return {
        label: 'À risque',
        variant: 'destructive' as const,
        icon: AlertTriangle,
        bgClass: 'bg-red-600 hover:bg-red-700',
        textClass: 'text-white',
      };
    }
  };

  const config = getScoreConfig(score);
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <Badge 
      variant={config.variant}
      className={cn(
        config.bgClass,
        config.textClass,
        sizeClasses[size],
        'font-semibold flex items-center gap-1.5',
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      <span>{score}/100</span>
      <span className="hidden sm:inline">• {config.label}</span>
    </Badge>
  );
};
