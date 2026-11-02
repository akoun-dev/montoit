/**
 * InputWithIcon - Reusable input component with left icon
 * Supports multiple style variants and password visibility toggle
 */

import { forwardRef, useId, useState, InputHTMLAttributes } from 'react';
import { LucideIcon, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export interface InputWithIconProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Left icon component */
  icon: LucideIcon;
  /** Label text above input */
  label?: string;
  /** Style variant */
  variant?: 'default' | 'modern' | 'cyan' | 'glass';
  /** Enable password mode with visibility toggle */
  isPassword?: boolean;
  /** Show/hide password toggle button */
  showPasswordToggle?: boolean;
  /** Error message */
  error?: string;
  /** Success state */
  success?: boolean;
  /** Custom icon color (overrides variant) */
  iconColor?: string;
  /** Container className */
  containerClassName?: string;
  /** Helper text below input */
  helperText?: string;
}

const variantStyles = {
  default: {
    border: 'border border-[var(--color-neutral-200)]',
    focus:
      'focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]',
    icon: 'text-[var(--color-neutral-400)]',
    label: 'text-[var(--color-neutral-700)]',
    bg: 'bg-white',
  },
  modern: {
    border: 'border-2 border-gray-200',
    focus: 'focus:border-terracotta-500 focus:ring-4 focus:ring-terracotta-100',
    icon: 'text-gray-400',
    label: 'text-gray-700',
    bg: 'bg-white',
  },
  cyan: {
    border: 'border-2 border-gray-200',
    focus: 'focus:ring-4 focus:ring-cyan-200 focus:border-cyan-500',
    icon: 'text-cyan-500',
    label: 'text-gray-700',
    bg: 'bg-white/70',
  },
  glass: {
    border: 'border border-white/30',
    focus: 'focus:ring-2 focus:ring-white/50 focus:border-white/50',
    icon: 'text-white/80',
    label: 'text-white',
    bg: 'bg-white/20 backdrop-blur-xl',
  },
};

const InputWithIcon = forwardRef<HTMLInputElement, InputWithIconProps>(
  (
    {
      icon: Icon,
      label,
      variant = 'default',
      isPassword = false,
      showPasswordToggle = true,
      error,
      success,
      iconColor,
      containerClassName,
      helperText,
      className,
      type,
      disabled,
      style,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = useId();

    // Determine actual input type
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    const styles = variantStyles[variant];

    return (
      <div className={containerClassName}>
        {label && (
          <label htmlFor={inputId} className={cn('block text-sm font-semibold mb-2', styles.label)}>
            {label}
          </label>
        )}
        <div className="relative">
          {/* Left Icon */}
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10 w-12">
            <Icon className={cn('h-5 w-5', iconColor || styles.icon)} />
          </div>

          {/* Input */}
          <input
            ref={ref}
            type={inputType}
            disabled={disabled}
            id={label ? inputId : undefined}
            className={cn(
              'w-full py-3 pl-14 pr-4 rounded-xl transition-all outline-none',
              styles.bg,
              styles.border,
              styles.focus,
              isPassword && showPasswordToggle && 'pr-12',
              error && 'border-red-500 focus:ring-red-200 focus:border-red-500',
              success && 'border-green-500 focus:ring-green-200 focus:border-green-500',
              disabled && 'opacity-50 cursor-not-allowed bg-gray-100',
              variant === 'glass' && 'placeholder:text-white/60 text-white',
              className
            )}
            style={{
              paddingLeft: '3.5rem',
              ...(isPassword && showPasswordToggle ? { paddingRight: '3rem' } : {}),
              ...style,
            }}
            {...props}
          />

          {/* Password Toggle */}
          {isPassword && showPasswordToggle && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={cn(
                'absolute right-4 top-1/2 -translate-y-1/2 transition-colors',
                variant === 'glass'
                  ? 'text-white/70 hover:text-white'
                  : 'text-gray-400 hover:text-gray-600'
              )}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          )}
        </div>

        {/* Helper Text */}
        {helperText && !error && (
          <p
            className={cn('mt-1 text-xs', variant === 'glass' ? 'text-white/60' : 'text-gray-500')}
          >
            {helperText}
          </p>
        )}

        {/* Error Message */}
        {error && (
          <p
            className={cn(
              'mt-1.5 text-sm flex items-center gap-1',
              variant === 'glass' ? 'text-red-300' : 'text-red-600'
            )}
          >
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        )}
      </div>
    );
  }
);

InputWithIcon.displayName = 'InputWithIcon';

export default InputWithIcon;
