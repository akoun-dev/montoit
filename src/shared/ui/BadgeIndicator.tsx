/**
 * BadgeIndicator - Reusable badge component for navigation menus
 * Displays counts with configurable colors and animations
 */

import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs: (string | undefined | null | false)[]) => twMerge(clsx(inputs));

export type BadgeColor = 'red' | 'orange' | 'green' | 'blue' | 'primary';

interface BadgeIndicatorProps {
  count: number;
  color?: BadgeColor;
  pulse?: boolean;
  max?: number;
  size?: 'sm' | 'md';
  className?: string;
}

const colorClasses: Record<BadgeColor, string> = {
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  primary: 'bg-primary-500',
};

export function BadgeIndicator({
  count,
  color = 'primary',
  pulse = false,
  max = 99,
  size = 'md',
  className,
}: BadgeIndicatorProps) {
  if (count <= 0) return null;

  const displayCount = count > max ? `${max}+` : count.toString();

  return (
    <span
      className={cn(
        'text-white font-bold rounded-full min-w-[20px] text-center inline-flex items-center justify-center',
        colorClasses[color],
        pulse && 'animate-pulse',
        size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5',
        className
      )}
    >
      {displayCount}
    </span>
  );
}

export default BadgeIndicator;
