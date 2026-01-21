/**
 * Progress Component - Barre de progression réutilisable
 */

import { HTMLAttributes, ReactNode } from 'react';

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number; // 0-100
  max?: number;
  variant?: 'default' | 'success' | 'warning' | 'error';
  size?: 'small' | 'medium' | 'large';
  showValue?: boolean;
  label?: ReactNode;
  animated?: boolean;
}

export function Progress({
  value,
  max = 100,
  variant = 'default',
  size = 'medium',
  showValue = false,
  label,
  animated = false,
  className = '',
  ...props
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const baseClasses = ['w-full', 'bg-neutral-200', 'rounded-full', 'overflow-hidden'].join(' ');

  const sizeClasses = {
    small: 'h-1.5',
    medium: 'h-2.5',
    large: 'h-4',
  };

  const variantClasses = {
    default: 'bg-primary-500',
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
  };

  const fillClasses = [
    'h-full',
    'rounded-full',
    'transition-all duration-300 ease-out',
    variantClasses[variant],
    animated ? 'animate-pulse' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const labelClasses = [
    'flex items-center justify-between',
    'text-sm font-medium text-text-primary',
    size === 'large' ? 'mb-2' : 'mb-1',
  ].join(' ');

  return (
    <div className={className} {...props}>
      {(label || showValue) && (
        <div className={labelClasses}>
          {label && <span>{label}</span>}
          {showValue && <span>{Math.round(percentage)}%</span>}
        </div>
      )}
      <div className={`${baseClasses} ${sizeClasses[size]}`}>
        <div
          className={fillClasses}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={typeof label === 'string' ? label : 'Progression'}
        />
      </div>
    </div>
  );
}
