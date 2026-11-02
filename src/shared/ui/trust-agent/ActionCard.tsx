import { ReactNode } from 'react';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export interface ActionCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  status?: 'pending' | 'in_progress' | 'completed';
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

const VARIANT_STYLES = {
  primary: {
    bg: 'bg-gradient-to-br from-primary-50 to-primary-100/50',
    border: 'border-primary-200',
    iconBg: 'bg-primary-500',
    iconColor: 'text-white',
    buttonBg: 'bg-primary-500 hover:bg-primary-600',
    buttonText: 'text-white',
  },
  success: {
    bg: 'bg-gradient-to-br from-green-50 to-green-100/50',
    border: 'border-green-200',
    iconBg: 'bg-green-500',
    iconColor: 'text-white',
    buttonBg: 'bg-green-500 hover:bg-green-600',
    buttonText: 'text-white',
  },
  warning: {
    bg: 'bg-gradient-to-br from-amber-50 to-amber-100/50',
    border: 'border-amber-200',
    iconBg: 'bg-amber-500',
    iconColor: 'text-white',
    buttonBg: 'bg-amber-500 hover:bg-amber-600',
    buttonText: 'text-white',
  },
  danger: {
    bg: 'bg-gradient-to-br from-red-50 to-red-100/50',
    border: 'border-red-200',
    iconBg: 'bg-red-500',
    iconColor: 'text-white',
    buttonBg: 'bg-red-500 hover:bg-red-600',
    buttonText: 'text-white',
  },
  info: {
    bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50',
    border: 'border-blue-200',
    iconBg: 'bg-blue-500',
    iconColor: 'text-white',
    buttonBg: 'bg-blue-500 hover:bg-blue-600',
    buttonText: 'text-white',
  },
};

const STATUS_STYLES = {
  pending: {
    container: 'opacity-100',
  },
  in_progress: {
    container: 'ring-2 ring-primary-200',
  },
  completed: {
    container: 'opacity-60 grayscale-[0.5]',
  },
};

export function ActionCard({
  title,
  description,
  icon,
  variant = 'primary',
  status = 'pending',
  actionLabel,
  onAction,
  loading = false,
  disabled = false,
  className = '',
}: ActionCardProps) {
  const variantStyle = VARIANT_STYLES[variant];
  const statusStyle = STATUS_STYLES[status];

  const isActionable = status !== 'completed' && !disabled && !loading;

  return (
    <div
      className={cn(
        'relative rounded-xl border p-6 transition-all duration-200',
        variantStyle.bg,
        variantStyle.border,
        statusStyle.container,
        isActionable && 'hover:shadow-md',
        !isActionable && 'cursor-not-allowed',
        className
      )}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={cn('p-3 rounded-xl flex-shrink-0', variantStyle.iconBg)}>
          <div className={cn('w-6 h-6', variantStyle.iconColor)}>
            {icon}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-lg">{title}</h3>
              <p className="text-sm text-gray-600 mt-1">{description}</p>
            </div>

            {/* Status indicator */}
            {status === 'completed' && (
              <div className="flex-shrink-0">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
            )}
          </div>

          {/* Action Button */}
          {isActionable && actionLabel && onAction && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction();
              }}
              disabled={loading}
              className={cn(
                'mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
                variantStyle.buttonBg,
                variantStyle.buttonText,
                'hover:shadow-sm active:scale-[0.98]',
                loading && 'cursor-wait'
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  En cours...
                </>
              ) : (
                <>
                  {actionLabel}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
