import { HTMLAttributes, ReactNode, MouseEventHandler } from 'react';

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onClick'> {
  variant?: 'default' | 'bordered' | 'elevated' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hoverable?: boolean;
  clickable?: boolean;
  role?: string;
  onClick?: MouseEventHandler<HTMLElement>;
}

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  hoverable = false,
  clickable = false,
  className = '',
  role = 'article',
  onClick,
  ...props
}: CardProps) {
  const isInteractive = hoverable || clickable;

  // Variants selon spécifications Modern Minimalism Premium
  const variantClasses = {
    default: [
      'bg-background-surface', // #FAFAFA selon tokens
      'border border-neutral-200',
    ],
    bordered: [
      'bg-background-page', // #FFFFFF selon tokens
      'border border-neutral-200',
    ],
    elevated: [
      'bg-background-page', // #FFFFFF selon tokens
      'shadow-lg',
    ],
    interactive: [
      'bg-background-surface', // #FAFAFA selon tokens
      'border border-neutral-200',
      'shadow-base',
      'hover:shadow-md',
      'cursor-default',
    ],
  };

  // Padding minimum de 32px (spacing-8) selon les spécifications premium
  const paddingClasses = {
    none: '',
    sm: 'p-4', // 16px - Éléments proches
    md: 'p-8', // 32px - MINIMUM selon spécifications
    lg: 'p-12', // 48px - Card padding premium
    xl: 'p-16', // 64px - Sections importantes
  };

  // Animations selon spécifications (GPU-only : transform + opacity)
  const interactionClasses = isInteractive
    ? [
        'transition-base ease-out', // 250ms ease-out selon tokens
        'will-change-transform',
      ].join(' ')
    : '';

  // Hover states selon spécifications Modern Minimalism Premium
  const hoverClasses = hoverable
    ? ['hover:-translate-y-1', 'hover:scale-[1.02]', 'active:scale-[0.99]'].join(' ')
    : '';

  // Click states pour accessibilité
  const clickClasses = clickable
    ? [
        'cursor-pointer',
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-primary-500',
        'focus:ring-offset-2',
        'hover:border-primary-200',
      ].join(' ')
    : '';

  const classes = [
    // Base selon spécifications premium
    'rounded-lg', // 16px radius selon tokens
    'relative',
    ...variantClasses[variant],
    paddingClasses[padding],
    interactionClasses,
    hoverClasses,
    clickClasses,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (clickable) {
    return (
      <button
        className={classes}
        role={role}
        onClick={onClick as MouseEventHandler<HTMLButtonElement>}
        type="button"
      >
        {children}
        <div
          className="absolute inset-0 rounded-lg opacity-0 hover:opacity-100 focus:opacity-100 transition-base"
          aria-hidden="true"
          style={{
            background:
              'linear-gradient(to bottom right, rgba(255, 108, 47, 0.05), rgba(255, 108, 47, 0.1))',
          }}
        />
      </button>
    );
  }

  return (
    <div
      className={classes}
      role={role}
      onClick={onClick as MouseEventHandler<HTMLDivElement>}
      {...props}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}

export function CardHeader({
  title,
  subtitle,
  action,
  children,
  className = '',
  ...props
}: CardHeaderProps) {
  return (
    <div
      className={['flex', 'items-start', 'justify-between', 'mb-6', className].join(' ')}
      {...props}
    >
      <div className="flex-1 min-w-0">
        {title && (
          <h3
            className={[
              'text-h3', // 24px selon tokens premium
              'font-semibold', // 600 selon tokens premium
              'text-neutral-900', // #171717 - contraste AAA 16.5:1
              'leading-heading', // 1.3 selon tokens premium
              'mb-2', // 8px spacing
            ].join(' ')}
          >
            {title}
          </h3>
        )}
        {subtitle && (
          <p
            className={[
              'text-sm', // 14px selon tokens premium
              'font-regular', // 400 selon tokens premium
              'text-neutral-700', // #404040 - contraste AAA 8.6:1
              'leading-body', // 1.5 selon tokens premium
            ].join(' ')}
          >
            {subtitle}
          </p>
        )}
        {children}
      </div>
      {action && <div className="flex-shrink-0 ml-4">{action}</div>}
    </div>
  );
}

export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {}

export function CardBody({ children, className = '', ...props }: CardBodyProps) {
  return (
    <div className={['flex-1', 'min-w-0', className].join(' ')} {...props}>
      {children}
    </div>
  );
}

// Alias pour compatibilité avec shadcn/ui
export const CardContent = CardBody;
export interface CardContentProps extends CardBodyProps {}

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

export function CardTitle({ children, className = '', ...props }: CardTitleProps) {
  return (
    <h3
      className={[
        'text-h3', // 24px selon tokens premium
        'font-semibold', // 600 selon tokens premium
        'text-neutral-900', // #171717 - contraste AAA 16.5:1
        'leading-heading', // 1.3 selon tokens premium
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </h3>
  );
}

export interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

export function CardDescription({ children, className = '', ...props }: CardDescriptionProps) {
  return (
    <p
      className={[
        'text-sm', // 14px selon tokens premium
        'font-regular', // 400 selon tokens premium
        'text-neutral-700', // #404040 - contraste AAA 8.6:1
        'leading-body', // 1.5 selon tokens premium
        'mt-2', // 8px margin-top
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </p>
  );
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  align?: 'left' | 'center' | 'right' | 'between';
}

export function CardFooter({
  children,
  align = 'right',
  className = '',
  ...props
}: CardFooterProps) {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div
      className={[
        'flex',
        'items-center',
        'gap-3', // 12px gap selon tokens premium
        'pt-6', // 24px padding-top
        'mt-6', // 24px margin-top
        'border-t', // Top border
        'border-neutral-200', // Couleur border selon tokens
        'flex-shrink-0',
        alignClasses[align],
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}
