import { Shield, CheckCircle } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export interface ScoreBadgeProps {
  score: number;
  variant?: 'minimal' | 'compact' | 'detailed';
  size?: 'sm' | 'md' | 'lg';
  showVerified?: boolean;
  className?: string;
}

const getScoreConfig = (score: number) => {
  // Score 0 = en cours de calcul
  if (score === 0) {
    return {
      label: 'En calcul',
      bgClass: 'bg-gray-50 border-gray-200',
      textClass: 'text-gray-600',
      iconClass: 'text-gray-500',
      isCalculating: true,
    };
  }
  if (score >= 70) {
    return {
      label: 'Fiable',
      bgClass: 'bg-green-50 border-green-200',
      textClass: 'text-green-700',
      iconClass: 'text-green-600',
    };
  }
  if (score >= 50) {
    return {
      label: 'Modéré',
      bgClass: 'bg-amber-50 border-amber-200',
      textClass: 'text-amber-700',
      iconClass: 'text-amber-600',
    };
  }
  return {
    label: 'À vérifier',
    bgClass: 'bg-red-50 border-red-200',
    textClass: 'text-red-700',
    iconClass: 'text-red-600',
  };
};

const sizeConfig = {
  sm: {
    padding: 'px-2 py-0.5',
    text: 'text-xs',
    icon: 'h-3 w-3',
    gap: 'gap-1',
  },
  md: {
    padding: 'px-2.5 py-1',
    text: 'text-sm',
    icon: 'h-4 w-4',
    gap: 'gap-1.5',
  },
  lg: {
    padding: 'px-3 py-1.5',
    text: 'text-base',
    icon: 'h-5 w-5',
    gap: 'gap-2',
  },
};

export function ScoreBadge({
  score,
  variant = 'compact',
  size = 'md',
  showVerified = false,
  className,
}: ScoreBadgeProps) {
  const config = getScoreConfig(score);
  const sizes = sizeConfig[size];
  const shouldPulse = score >= 80;

  if (variant === 'minimal') {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center font-semibold rounded-full border',
          config.bgClass,
          config.textClass,
          sizes.padding,
          sizes.text,
          className
        )}
      >
        {score}
      </span>
    );
  }

  if (variant === 'compact') {
    return (
      <span
        className={cn(
          'inline-flex items-center font-semibold rounded-full border',
          config.bgClass,
          config.textClass,
          sizes.padding,
          sizes.text,
          sizes.gap,
          shouldPulse && 'animate-pulse',
          className
        )}
      >
        <Shield className={cn(sizes.icon, config.iconClass)} />
        <span>{score}</span>
        {showVerified && score >= 70 && (
          <CheckCircle className={cn(sizes.icon, 'text-green-500')} />
        )}
      </span>
    );
  }

  // detailed variant
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border shadow-sm',
        config.bgClass,
        config.textClass,
        sizes.padding,
        sizes.text,
        sizes.gap,
        className
      )}
    >
      <Shield className={cn(sizes.icon, config.iconClass)} />
      <span className="font-semibold">{score}</span>
      <span className="opacity-60">/100</span>
      <span className="mx-1 opacity-40">•</span>
      <span>{config.label}</span>
      {showVerified && score >= 70 && (
        <CheckCircle className={cn(sizes.icon, 'text-green-500 ml-1')} />
      )}
    </span>
  );
}

export default ScoreBadge;
