import { ReactNode } from 'react';
import { Check, Circle, Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export interface Step {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
}

export interface ProgressStepperProps {
  steps: Step[];
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  className?: string;
  onStepClick?: (stepId: string) => void;
}

export function ProgressStepper({
  steps,
  orientation = 'horizontal',
  size = 'md',
  showLabels = true,
  className = '',
  onStepClick,
}: ProgressStepperProps) {
  const isClickable = onStepClick !== undefined;

  const sizeStyles = {
    sm: {
      container: 'gap-4',
      stepSize: 'h-8 w-8',
      iconSize: 'h-4 w-4',
      textSize: 'text-sm',
      descriptionSize: 'text-xs',
      connectorWidth: 'h-0.5',
    },
    md: {
      container: 'gap-6',
      stepSize: 'h-10 w-10',
      iconSize: 'h-5 w-5',
      textSize: 'text-base',
      descriptionSize: 'text-sm',
      connectorWidth: 'h-1',
    },
    lg: {
      container: 'gap-8',
      stepSize: 'h-12 w-12',
      iconSize: 'h-6 w-6',
      textSize: 'text-lg',
      descriptionSize: 'text-base',
      connectorWidth: 'h-1.5',
    },
  };

  const styles = sizeStyles[size];

  const getStepStyles = (status: Step['status']) => {
    const isCompleted = status === 'completed';
    const isCurrent = status === 'in_progress';
    const isError = status === 'error';

    return {
      container: cn('flex items-center', orientation === 'vertical' ? 'flex-col gap-2' : 'gap-4'),
      circle: cn(
        'flex items-center justify-center rounded-full border-2 flex-shrink-0 transition-all duration-200',
        styles.stepSize,
        isCompleted && 'bg-primary-500 border-primary-500 text-white',
        isCurrent && 'bg-white border-primary-500 text-primary-500',
        isError && 'bg-red-50 border-red-500 text-red-500',
        status === 'pending' && 'bg-gray-100 border-gray-300 text-gray-400',
        isClickable && status !== 'pending' && 'cursor-pointer hover:scale-105'
      ),
      label: cn(
        'font-medium text-center transition-colors',
        styles.textSize,
        (isCompleted || isCurrent) && 'text-gray-900',
        status === 'pending' && 'text-gray-500',
        isError && 'text-red-600'
      ),
      description: cn('text-gray-500 text-center max-w-[150px]', styles.descriptionSize),
      connector: cn(
        'flex-1 transition-all duration-300',
        styles.connectorWidth,
        isCompleted ? 'bg-primary-500' : 'bg-gray-200'
      ),
    };
  };

  return (
    <div
      className={cn(
        'flex',
        orientation === 'horizontal' ? 'flex-row items-center' : 'flex-col items-start',
        styles.container,
        className
      )}
    >
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const stepStyles = getStepStyles(step.status);

        const renderStepIcon = () => {
          if (step.status === 'completed') {
            return <Check className={styles.iconSize} />;
          }
          if (step.status === 'in_progress') {
            return step.icon || <Loader2 className={cn(styles.iconSize, 'animate-spin')} />;
          }
          if (step.status === 'error') {
            return <Circle className={cn(styles.iconSize, 'fill-current')} />;
          }
          return <Circle className={cn(styles.iconSize, 'fill-white')} />;
        };

        return (
          <div key={step.id} className="flex-1">
            <div
              className={stepStyles.container}
              onClick={() => isClickable && onStepClick?.(step.id)}
              onKeyDown={(e) => {
                if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onStepClick?.(step.id);
                }
              }}
              role={isClickable ? 'button' : undefined}
              tabIndex={isClickable && step.status !== 'pending' ? 0 : undefined}
            >
              {/* Step Circle */}
              <div className={stepStyles.circle}>
                {step.icon && step.status !== 'in_progress' ? (
                  <div className={styles.iconSize}>{step.icon}</div>
                ) : (
                  renderStepIcon()
                )}
              </div>

              {/* Labels */}
              {showLabels && (
                <div className={orientation === 'vertical' ? 'text-center' : 'hidden md:block'}>
                  <p className={stepStyles.label}>{step.label}</p>
                  {step.description && <p className={stepStyles.description}>{step.description}</p>}
                </div>
              )}
            </div>

            {/* Connector */}
            {!isLast && orientation === 'horizontal' && (
              <div className={stepStyles.connector} style={{ marginLeft: '1rem' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
