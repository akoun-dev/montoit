/**
 * PhoneInput Component - Ergonomique et Intuitif
 * Mon Toit - UX Améliorée
 *
 * Objectif: Rendre la saisie du numéro de téléphone claire et sans confusion
 * - Indicatif pays séparé et visible
 * - Format automatique pendant la saisie
 * - Validation en temps réel
 * - Feedback visuel clair
 */

import React, { useState, useEffect } from 'react';
import { Phone, Check, X, AlertCircle } from 'lucide-react';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  label?: string;
  placeholder?: string;
  error?: string;
  className?: string;
  autoValidate?: boolean;
}

/**
 * Formater le numéro pendant la saisie
 * Exemple: 0123456789 → 01 23 45 67 89
 */
const formatPhoneNumber = (value: string): string => {
  // Retirer tous les caractères non-numériques
  const numbers = value.replace(/\D/g, '');

  // Limiter à 10 chiffres
  const limited = numbers.slice(0, 10);

  // Formater par paires
  const formatted = limited.match(/.{1,2}/g)?.join(' ') || limited;

  return formatted;
};

/**
 * Valider le numéro de téléphone ivoirien
 */
const validateIvorianPhone = (phone: string): { valid: boolean; message: string } => {
  const numbers = phone.replace(/\D/g, '');

  if (numbers.length === 0) {
    return { valid: false, message: '' };
  }

  if (numbers.length < 10) {
    return { valid: false, message: `${10 - numbers.length} chiffre(s) manquant(s)` };
  }

  if (numbers.length > 10) {
    return { valid: false, message: 'Trop de chiffres' };
  }

  // Vérifier les préfixes valides (opérateurs ivoiriens)
  const validPrefixes = ['01', '05', '07', '27'];
  const prefix = numbers.slice(0, 2);

  if (!validPrefixes.includes(prefix)) {
    return { valid: false, message: 'Préfixe invalide (01, 05, 07, 27)' };
  }

  return { valid: true, message: 'Numéro valide' };
};

/**
 * Composant PhoneInput
 */
export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  required = false,
  label = 'Numéro de téléphone',
  placeholder = '01 23 45 67 89',
  error,
  className = '',
  autoValidate = true,
}) => {
  const [localValue, setLocalValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [validation, setValidation] = useState<{ valid: boolean; message: string }>({
    valid: true,
    message: '',
  });
  const [hasInteracted, setHasInteracted] = useState(false);

  // Synchroniser avec la valeur externe
  useEffect(() => {
    // Extraire seulement les chiffres de la valeur externe
    const externalNumbers = value.replace(/\D/g, '').replace(/^225/, ''); // Retirer +225 si présent
    if (externalNumbers !== localValue.replace(/\D/g, '')) {
      setLocalValue(formatPhoneNumber(externalNumbers));
    }
  }, [value]);

  // Initialiser la validation au montage (état valide par défaut)
  useEffect(() => {
    if (localValue.length === 0) {
      setValidation({ valid: true, message: '' });
    }
  }, []);

  // Valider automatiquement après interaction
  useEffect(() => {
    if (autoValidate && hasInteracted && localValue.length > 0) {
      const result = validateIvorianPhone(localValue);
      setValidation(result);
    } else if (!hasInteracted && localValue.length === 0) {
      // Réinitialiser à un état valide et neutre au montage
      setValidation({ valid: true, message: '' });
    }
  }, [localValue, autoValidate, hasInteracted]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const formatted = formatPhoneNumber(input);
    setLocalValue(formatted);
    setHasInteracted(true);

    // Retourner le numéro complet avec indicatif
    const numbers = formatted.replace(/\D/g, '');
    const fullNumber = numbers ? `+225 ${formatted}` : '';
    onChange(fullNumber);
  };

  const handleFocus = () => {
    setIsFocused(true);
    setHasInteracted(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const showValidation = autoValidate && hasInteracted && localValue.length > 0;
  const showError = error || (showValidation && !validation.valid && localValue.length >= 10);
  const showSuccess = showValidation && validation.valid;

  return (
    <div className={`phone-input-wrapper ${className}`}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-bold text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Input Container */}
      <div
        className={`
        relative flex items-center
        border-2 rounded-2xl transition-all
        ${isFocused ? 'ring-4 ring-blue-200 border-blue-500' : 'border-gray-200'}
        ${showError ? 'border-red-500 ring-4 ring-red-100' : ''}
        ${showSuccess ? 'border-green-500 ring-4 ring-green-100' : ''}
        bg-white
      `}
      >
        {/* Icône Téléphone */}
        <div className="pl-4 pr-3 flex items-center border-r-2 border-gray-200">
          <Phone
            className={`h-5 w-5 ${
              isFocused
                ? 'text-blue-600'
                : showError
                  ? 'text-red-500'
                  : showSuccess
                    ? 'text-green-500'
                    : 'text-gray-400'
            }`}
          />
        </div>

        {/* Indicatif Pays (Fixe) */}
        <div className="px-3 py-3 flex items-center gap-2 border-r-2 border-gray-200 bg-gray-50">
          <span className="text-2xl">🇨🇮</span>
          <span className="text-sm font-bold text-gray-700">+225</span>
        </div>

        {/* Input Numéro */}
        <input
          type="tel"
          value={localValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          required={required}
          className="flex-1 px-4 py-3 bg-transparent border-none outline-none text-base font-medium text-gray-900 placeholder-gray-400"
          inputMode="numeric"
        />

        {/* Icône de Validation */}
        {showValidation && (
          <div className="pr-4">
            {validation.valid ? (
              <Check className="h-5 w-5 text-green-500" />
            ) : localValue.length >= 10 ? (
              <X className="h-5 w-5 text-red-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-500" />
            )}
          </div>
        )}
      </div>

      {/* Messages d'Aide / Erreur */}
      <div className="mt-2 min-h-[20px]">
        {error ? (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <X className="h-4 w-4" />
            <span>{error}</span>
          </p>
        ) : showValidation ? (
          <p
            className={`text-sm flex items-center gap-1 ${
              validation.valid
                ? 'text-green-600'
                : localValue.length >= 10
                  ? 'text-red-600'
                  : 'text-amber-600'
            }`}
          >
            {validation.valid ? (
              <>
                <Check className="h-4 w-4" />
                <span>{validation.message}</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4" />
                <span>{validation.message || 'Continuez à saisir...'}</span>
              </>
            )}
          </p>
        ) : (
          <p className="text-sm text-gray-500">Format: 01 23 45 67 89 (10 chiffres)</p>
        )}
      </div>

      {/* Exemples d'Opérateurs (Optionnel) */}
      {isFocused && !hasInteracted && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl animate-fade-in">
          <p className="text-xs font-semibold text-blue-900 mb-2">Opérateurs acceptés :</p>
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 bg-white rounded-lg text-xs font-medium text-gray-700 border border-blue-200">
              01 XX XX XX XX (MTN)
            </span>
            <span className="px-2 py-1 bg-white rounded-lg text-xs font-medium text-gray-700 border border-blue-200">
              05 XX XX XX XX (Orange)
            </span>
            <span className="px-2 py-1 bg-white rounded-lg text-xs font-medium text-gray-700 border border-blue-200">
              07 XX XX XX XX (Moov)
            </span>
            <span className="px-2 py-1 bg-white rounded-lg text-xs font-medium text-gray-700 border border-blue-200">
              27 XX XX XX XX
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Composant PhoneInput Compact (pour formulaires serrés)
 */
export const PhoneInputCompact: React.FC<PhoneInputProps> = (props) => {
  return <PhoneInput {...props} className={`phone-input-compact ${props.className || ''}`} />;
};

/**
 * Hook pour utiliser PhoneInput avec validation
 */
export const usePhoneInput = (initialValue: string = '') => {
  const [phone, setPhone] = useState(initialValue);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const numbers = phone.replace(/\D/g, '').replace(/^225/, '');
    const validation = validateIvorianPhone(numbers);
    setIsValid(validation.valid);
  }, [phone]);

  return {
    phone,
    setPhone,
    isValid,
    formatted: phone,
    numbers: phone.replace(/\D/g, '').replace(/^225/, ''),
  };
};

export default PhoneInput;
