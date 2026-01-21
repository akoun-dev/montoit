import { validatePassword, type PasswordValidationResult } from '@/shared/utils/passwordPolicy';

interface PasswordStrengthIndicatorProps {
  password: string;
  showErrors?: boolean;
  showSuggestions?: boolean;
}

export function PasswordStrengthIndicator({
  password,
  showErrors = true,
  showSuggestions = true,
}: PasswordStrengthIndicatorProps) {
  const validation = validatePassword(password);

  const getStrengthColor = (score: number) => {
    if (score < 40) return 'bg-red-500';
    if (score < 60) return 'bg-orange-500';
    if (score < 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthLabel = (score: number) => {
    if (score < 40) return 'Très faible';
    if (score < 60) return 'Faible';
    if (score < 80) return 'Moyen';
    return 'Fort';
  };

  const getStrengthTextColor = (score: number) => {
    if (score < 40) return 'text-red-600';
    if (score < 60) return 'text-orange-600';
    if (score < 80) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (!password) {
    return null;
  }

  return (
    <div className="mt-2 space-y-2">
      {/* Barre de progression */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Force du mot de passe</span>
          <span className={`text-sm font-medium ${getStrengthTextColor(validation.score)}`}>
            {getStrengthLabel(validation.score)}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(validation.score)}`}
            style={{ width: `${validation.score}%` }}
          />
        </div>
      </div>

      {/* Erreurs */}
      {showErrors && validation.errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm font-medium text-red-800 mb-1">Le mot de passe doit :</p>
          <ul className="text-sm text-red-700 space-y-1">
            {validation.errors.map((error, index) => (
              <li key={index} className="flex items-start">
                <span className="text-red-500 mr-2">×</span>
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggestions */}
      {showSuggestions && validation.suggestions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <p className="text-sm font-medium text-blue-800 mb-1">Suggestions :</p>
          <ul className="text-sm text-blue-700 space-y-1">
            {validation.suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
