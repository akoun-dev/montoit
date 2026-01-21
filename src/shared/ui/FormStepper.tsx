import React, { useState, useCallback } from 'react';
import { cn } from '@/shared/lib/utils';
import { Check } from 'lucide-react';

export interface FormStepperProps {
  currentStep: number;
  totalSteps: number;
  onStepChange: (step: number) => void;
  labels?: string[];
  allowClickNavigation?: boolean;
  validateBeforeNext?: (currentStep: number) => boolean;
  className?: string;
}

export interface FormStepContentProps {
  step: number;
  currentStep: number;
  slideDirection: 'forward' | 'backward';
  children: React.ReactNode;
  className?: string;
}

/**
 * FormStepper - Composant de navigation multi-étapes réutilisable
 *
 * @example
 * const [step, setStep] = useState(1);
 * <FormStepper
 *   currentStep={step}
 *   totalSteps={3}
 *   onStepChange={setStep}
 *   labels={['Infos', 'Localisation', 'Tarif']}
 * />
 */
export const FormStepper: React.FC<FormStepperProps> = ({
  currentStep,
  totalSteps,
  onStepChange,
  labels,
  allowClickNavigation = true,
  validateBeforeNext,
  className,
}) => {
  const handleStepClick = (targetStep: number) => {
    if (!allowClickNavigation) return;

    // Validation avant navigation forward
    if (targetStep > currentStep && validateBeforeNext) {
      if (!validateBeforeNext(currentStep)) return;
    }

    onStepChange(targetStep);
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 mb-2">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((stepNum) => (
          <React.Fragment key={stepNum}>
            <button
              type="button"
              onClick={() => handleStepClick(stepNum)}
              disabled={!allowClickNavigation}
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300',
                stepNum === currentStep && 'form-step-active',
                stepNum < currentStep && 'form-step-completed',
                stepNum > currentStep && 'form-step-inactive',
                allowClickNavigation && 'cursor-pointer hover:scale-110'
              )}
              aria-label={labels?.[stepNum - 1] || `Étape ${stepNum}`}
            >
              {stepNum < currentStep ? <Check className="w-5 h-5" /> : stepNum}
            </button>

            {/* Connector line */}
            {stepNum < totalSteps && (
              <div
                className={cn(
                  'h-1 w-8 md:w-12 rounded-full transition-all duration-300',
                  stepNum < currentStep ? 'form-connector-completed' : 'form-connector-inactive'
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Labels */}
      {labels && labels.length > 0 && (
        <div className="flex items-center justify-center">
          <p className="text-sm font-medium form-step-label">{labels[currentStep - 1]}</p>
        </div>
      )}

      {/* Progress text */}
      <p className="text-center text-xs mt-1 form-step-counter">
        Étape {currentStep} sur {totalSteps}
      </p>
    </div>
  );
};

/**
 * FormStepContent - Wrapper pour le contenu d'une étape avec animation
 *
 * @example
 * <FormStepContent step={1} currentStep={step} slideDirection={direction}>
 *   <div>Contenu étape 1</div>
 * </FormStepContent>
 */
export const FormStepContent: React.FC<FormStepContentProps> = ({
  step,
  currentStep,
  slideDirection,
  children,
  className,
}) => {
  if (step !== currentStep) return null;

  return (
    <div
      key={`step-${step}-${slideDirection}`}
      className={cn(
        slideDirection === 'forward' ? 'step-enter-forward' : 'step-enter-backward',
        className
      )}
    >
      {children}
    </div>
  );
};

/**
 * Hook useFormStepper - Gestion de l'état du stepper avec direction
 */
export const useFormStepper = (initialStep = 1, totalSteps = 3) => {
  const [step, setStep] = useState(initialStep);
  const [slideDirection, setSlideDirection] = useState<'forward' | 'backward'>('forward');

  const goToStep = useCallback(
    (targetStep: number) => {
      if (targetStep >= 1 && targetStep <= totalSteps) {
        setSlideDirection(targetStep > step ? 'forward' : 'backward');
        setStep(targetStep);
      }
    },
    [step, totalSteps]
  );

  const nextStep = useCallback(() => {
    if (step < totalSteps) {
      setSlideDirection('forward');
      setStep((prev) => prev + 1);
    }
  }, [step, totalSteps]);

  const prevStep = useCallback(() => {
    if (step > 1) {
      setSlideDirection('backward');
      setStep((prev) => prev - 1);
    }
  }, [step]);

  const resetStepper = useCallback(() => {
    setStep(1);
    setSlideDirection('forward');
  }, []);

  return {
    step,
    slideDirection,
    goToStep,
    nextStep,
    prevStep,
    resetStepper,
    isFirstStep: step === 1,
    isLastStep: step === totalSteps,
  };
};

export default FormStepper;
