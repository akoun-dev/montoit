/**
 * Badge Component - Composant de badge réutilisable
 */

import { HTMLAttributes, ReactNode } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline';
  size?: 'small' | 'medium' | 'large';
  children: ReactNode;
}

export function Badge({
  variant = 'default',
  size = 'medium',
  children,
  className = '',
  ...props
}: BadgeProps) {
  const baseClasses = [
    'inline-flex items-center justify-center',
    'font-medium',
    'rounded-full',
    'transition-all duration-200',
  ].join(' ');

  const variantClasses = {
    default: 'bg-neutral-100 text-neutral-700',
    success: 'bg-green-50 text-green-700 border border-green-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    error: 'bg-red-50 text-red-700 border border-red-200',
    info: 'bg-blue-50 text-blue-700 border border-blue-200',
    outline: 'border border-neutral-300 text-neutral-700 bg-transparent',
  };

  const sizeClasses = {
    small: 'px-2 py-0.5 text-xs',
    medium: 'px-2.5 py-1 text-sm',
    large: 'px-3 py-1.5 text-base',
  };

  const classes = [baseClasses, variantClasses[variant], sizeClasses[size], className]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
}
