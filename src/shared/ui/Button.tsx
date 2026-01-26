import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'medium',
      loading = false,
      fullWidth = false,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseClasses = [
      'inline-flex items-center justify-center',
      'font-semibold font-weight-semibold',
      'rounded-md',
      'transition-base ease-out',
      'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:shadow-focus',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'touch-manipulation',
      // Accessibilité WCAG AA - target tactile minimum
      'min-h-[var(--button-primary-height, 48px)]',
    ].join(' ');

    const variantClasses = {
      primary: [
        'bg-primary-500',
        'text-white',
        'hover:bg-primary-600',
        'active:bg-primary-900',
        'focus:ring-primary-500',
        'shadow-base',
        'hover:shadow-md',
        'hover:-translate-y-0.5 hover:scale-[1.02]', // Transform selon spécifications
      ].join(' '),

      secondary: [
        'bg-transparent',
        'border-2',
        'border-primary-500',
        'text-primary-600',
        'hover:bg-primary-50',
        'hover:border-primary-700',
        'hover:text-primary-700',
        'active:bg-primary-100',
        'focus:ring-primary-500',
      ].join(' '),

      outline: [
        'border-2',
        'border-neutral-200',
        'text-neutral-700',
        'hover:bg-neutral-50',
        'hover:border-neutral-300',
        'hover:text-neutral-900',
        'focus:ring-neutral-500',
      ].join(' '),

      ghost: [
        'text-neutral-700',
        'hover:bg-neutral-100',
        'hover:text-neutral-900',
        'focus:ring-neutral-300',
        'active:bg-neutral-200',
      ].join(' '),

      danger: [
        'bg-semantic-error',
        'text-white',
        'hover:bg-red-700',
        'active:bg-red-800',
        'focus:ring-red-500',
        'shadow-base',
        'hover:shadow-md',
      ].join(' '),
    };

    const sizeClasses = {
      small: [
        'px-4 py-2',
        'text-sm',
        'min-h-[40px]', // WCAG AA minimum touch target
        'font-size-sm',
      ].join(' '),

      medium: [
        'px-6 py-3',
        'text-body',
        'min-h-[48px]', // Design system standard
        'font-size-body',
      ].join(' '),

      large: [
        'px-8 py-4',
        'text-h3',
        'min-h-[56px]', // Large buttons for primary CTAs (hero)
        'font-size-h3',
      ].join(' '),
    };

    const widthClass = fullWidth ? 'w-full' : '';
    const loadingClass = loading ? 'cursor-wait' : '';

    const classes = [
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      widthClass,
      loadingClass,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={classes}
        aria-busy={loading}
        {...props}
      >
        {loading && (
          <Loader className="mr-2 h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
        )}
        {typeof children === 'string' ? (
          <span className={loading ? 'opacity-70' : ''}>{children}</span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
export default Button;
