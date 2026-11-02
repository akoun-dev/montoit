import React from 'react';
import { FileText, MapPin, Camera, DollarSign, CheckCircle, ChevronRight } from 'lucide-react';

interface Step {
  id: string;
  label: string;
  icon: React.ReactNode;
  completed: boolean;
  current: boolean;
  valid: boolean;
}

interface PropertyStepsProps {
  currentStep: number;
  completedSteps: boolean[];
  stepValidations: boolean[];
  onStepClick?: (step: number) => void;
  disabled?: boolean;
}

const PropertySteps: React.FC<PropertyStepsProps> = ({
  currentStep,
  completedSteps,
  stepValidations,
  onStepClick,
  disabled = false,
}) => {
  const steps: Omit<Step, 'completed' | 'current' | 'valid'>[] = [
    {
      id: 'informations',
      label: 'Informations générales',
      icon: <FileText className="w-5 h-5" />,
    },
    {
      id: 'localisation',
      label: 'Localisation',
      icon: <MapPin className="w-5 h-5" />,
    },
    {
      id: 'photos',
      label: 'Photos',
      icon: <Camera className="w-5 h-5" />,
    },
    {
      id: 'tarif',
      label: 'Tarif & Contact',
      icon: <DollarSign className="w-5 h-5" />,
    },
    {
      id: 'validation',
      label: 'Validation',
      icon: <CheckCircle className="w-5 h-5" />,
    },
  ];

  const getStepStatus = (stepIndex: number) => {
    const isCompleted = completedSteps[stepIndex];
    const isCurrent = stepIndex === currentStep;
    const isValid = stepValidations[stepIndex];

    return {
      isCompleted,
      isCurrent,
      isValid,
      canClick: !disabled && (isCompleted || stepIndex === 0 || stepIndex <= currentStep),
    };
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const { isCompleted, isCurrent, isValid, canClick } = getStepStatus(index);

          return (
            <React.Fragment key={step.id}>
              {/* Étape */}
              <div className="flex flex-col items-center">
                {/* Icône et numéro */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => canClick && onStepClick?.(index)}
                    disabled={!canClick}
                    className={`
                      w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-200
                      ${
                        isCompleted && isValid
                          ? 'bg-green-500 border-green-500 text-white'
                          : isCurrent
                            ? 'bg-blue-500 border-blue-500 text-white'
                            : isValid
                              ? 'bg-white border-green-500 text-green-500'
                              : 'bg-white border-gray-300 text-gray-400'
                      }
                      ${canClick ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed'}
                      ${disabled ? 'opacity-50' : ''}
                    `}
                  >
                    {isCompleted ? <CheckCircle className="w-6 h-6" /> : step.icon}
                  </button>

                  {/* Numéro de l'étape */}
                  {!isCompleted && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gray-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {index + 1}
                    </div>
                  )}
                </div>

                {/* Label */}
                <div className="mt-2 text-center max-w-24">
                  <div
                    className={`
                    text-sm font-medium
                    ${isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-500'}
                  `}
                  >
                    {step.label}
                  </div>
                </div>
              </div>

              {/* Flèche de connexion */}
              {index < steps.length - 1 && (
                <div className="flex-1 flex items-center justify-center mx-4">
                  <div
                    className={`
                    h-0.5 w-full transition-all duration-200
                    ${completedSteps[index] ? 'bg-green-500' : 'bg-gray-200'}
                  `}
                  />
                  <ChevronRight
                    className={`
                    w-4 h-4 ml-2 transition-colors duration-200
                    ${completedSteps[index] ? 'text-green-500' : 'text-gray-400'}
                  `}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Barre de progression globale */}
      <div className="mt-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progression</span>
          <span>{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Guide de l'étape actuelle */}
      {steps[currentStep] && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              {React.isValidElement(steps[currentStep].icon) &&
                React.cloneElement(steps[currentStep].icon as React.ReactElement, {
                  className: 'w-5 h-5 text-blue-600',
                })}
            </div>
            <div>
              <h4 className="text-sm font-medium text-blue-800">
                Étape {currentStep + 1}: {steps[currentStep].label}
              </h4>
              <p className="text-sm text-blue-700 mt-1">{getStepDescription(currentStep)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Description des étapes
function getStepDescription(stepIndex: number): string {
  const descriptions = [
    'Décrivez votre propriété avec ses caractéristiques principales et ses équipements.',
    'Précisez la localisation exacte pour faciliter la découverte par les utilisateurs.',
    'Ajoutez des photos de qualité pour valoriser votre bien immobilier.',
    'Définissez le prix et vos informations de contact.',
    'Vérifiez tous les détails avant de publier votre annonce.',
  ];

  return descriptions[stepIndex] || '';
}

export default PropertySteps;
