import { useState, useEffect } from 'react';
import { X, ArrowRight, Check } from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface OnboardingTooltipProps {
  steps: OnboardingStep[];
  onComplete: () => void;
  storageKey: string;
}

export default function OnboardingTooltip({
  steps,
  onComplete,
  storageKey,
}: OnboardingTooltipProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true); // Always show in production

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    setIsVisible(false);
    onComplete();
  };

  if (!isVisible || steps.length === 0) return null;

  const step = steps[currentStep];

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm animate-fade-in" />

      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md px-4">
        <div className="bg-white rounded-3xl shadow-2xl border-4 border-terracotta-200 p-8 animate-scale-in">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-gradient-to-br from-terracotta-400 to-coral-500 rounded-full flex items-center justify-center text-white font-bold">
                  {currentStep + 1}
                </div>
                <span className="text-sm text-gray-500 font-medium">
                  Étape {currentStep + 1} sur {steps.length}
                </span>
              </div>
              <button
                onClick={handleSkip}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="h-2 bg-gray-100 rounded-full mb-6">
              <div
                className="h-full bg-gradient-to-r from-terracotta-400 to-coral-500 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>

            {step && (
              <>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-600 leading-relaxed">{step.description}</p>
              </>
            )}
          </div>

          <div className="flex items-center justify-between space-x-4">
            <button
              onClick={handleSkip}
              className="text-gray-500 hover:text-gray-700 font-medium text-sm transition-colors"
            >
              Passer le tutoriel
            </button>
            <button onClick={handleNext} className="btn-primary flex items-center space-x-2">
              {currentStep < steps.length - 1 ? (
                <>
                  <span>Suivant</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              ) : (
                <>
                  <Check className="h-5 w-5" />
                  <span>Terminer</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
