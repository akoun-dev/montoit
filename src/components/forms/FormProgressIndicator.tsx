import { CheckCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export interface Step {
  id: string;
  label: string;
}

interface FormProgressIndicatorProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export const FormProgressIndicator = ({ steps, currentStep, className }: FormProgressIndicatorProps) => {
  return (
    <div className={cn("w-full py-6", className)}>
      {/* Desktop: Horizontal Layout */}
      <div className="hidden md:flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isUpcoming = index > currentStep;

          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                {/* Circle */}
                <motion.div
                  animate={{
                    scale: isCurrent ? [1, 1.1, 1] : 1,
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: isCurrent ? Infinity : 0,
                    repeatDelay: 2,
                  }}
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all',
                    isCompleted && 'bg-primary border-primary text-primary-foreground',
                    isCurrent && 'border-primary text-primary',
                    isUpcoming && 'border-muted-foreground/30 text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <Circle className={cn('h-5 w-5', isCurrent && 'fill-primary')} />
                  )}
                </motion.div>
                {/* Label */}
                <span
                  className={cn(
                    'mt-2 text-sm font-medium text-center transition-colors',
                    isCompleted && 'text-primary',
                    isCurrent && 'text-primary font-semibold',
                    isUpcoming && 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Separator line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 flex-1 mx-2 transition-colors',
                    index < currentStep ? 'bg-primary' : 'bg-muted-foreground/30'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: Vertical Compact Layout */}
      <div className="md:hidden space-y-3">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isUpcoming = index > currentStep;

          return (
            <div key={step.id} className="flex items-start gap-3">
              {/* Circle */}
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full border-2 flex-shrink-0 transition-all',
                  isCompleted && 'bg-primary border-primary text-primary-foreground',
                  isCurrent && 'border-primary text-primary',
                  isUpcoming && 'border-muted-foreground/30 text-muted-foreground'
                )}
              >
                {isCompleted ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Circle className={cn('h-4 w-4', isCurrent && 'fill-primary')} />
                )}
              </div>

              {/* Label and Line */}
              <div className="flex-1">
                <span
                  className={cn(
                    'text-sm font-medium transition-colors',
                    isCompleted && 'text-primary',
                    isCurrent && 'text-primary font-semibold',
                    isUpcoming && 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </span>

                {/* Vertical separator */}
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'w-0.5 h-6 ml-3 mt-2 transition-colors',
                      index < currentStep ? 'bg-primary' : 'bg-muted-foreground/30'
                    )}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
