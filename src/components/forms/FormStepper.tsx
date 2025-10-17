import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export interface Step {
  id: string;
  label: string;
}

interface FormStepperProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export const FormStepper = ({ steps, currentStep, className }: FormStepperProps) => {
  const progress = ((currentStep + 1) / steps.length) * 100;
  const currentStepLabel = steps[currentStep]?.label || '';

  return (
    <div 
      className={cn(
        "sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-md py-4 px-6 transition-all duration-300 border-b",
        className
      )}
    >
      <div className="max-w-4xl mx-auto space-y-3">
        {/* Header: Step number + Percentage */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            Étape {currentStep + 1} sur {steps.length}
          </p>
          <p className="text-xs font-semibold text-primary">
            {Math.round(progress)}%
          </p>
        </div>

        {/* Progress Bar */}
        <div className="relative w-full h-2 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="absolute top-0 left-0 h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          />
        </div>

        {/* Current Step Title */}
        <motion.h3
          key={currentStep}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-lg font-semibold text-foreground"
        >
          {currentStepLabel}
        </motion.h3>
      </div>
    </div>
  );
};
