/**
 * PhoneInputV2 - Composant Simplifié et Moderne
 * Mon Toit - Nouvelle Expérience Auth 2025
 *
 * Design ultra-simple : Drapeau + Indicatif fixe + Input
 */

import React, { useState, useEffect } from 'react';
import { Phone } from 'lucide-react';

interface PhoneInputV2Props {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * Formater le numéro : 0123456789 → 01 23 45 67 89
 */
const formatPhone = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  const limited = numbers.slice(0, 10);
  return limited.match(/.{1,2}/g)?.join(' ') || limited;
};

/**
 * Valider le numéro ivoirien
 */
const isValidIvorianPhone = (phone: string): boolean => {
  const numbers = phone.replace(/\D/g, '');
  if (numbers.length !== 10) return false;

  const validPrefixes = ['01', '05', '07', '27'];
  const prefix = numbers.slice(0, 2);
  return validPrefixes.includes(prefix);
};

export const PhoneInputV2: React.FC<PhoneInputV2Props> = ({
  value,
  onChange,
  error,
  disabled = false,
  autoFocus = false,
  placeholder = '01 23 45 67 89',
  className = '',
}) => {
  const [localValue, setLocalValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Synchroniser avec la valeur externe
  useEffect(() => {
    const externalNumbers = value.replace(/\D/g, '').replace(/^225/, '');
    if (externalNumbers !== localValue.replace(/\D/g, '')) {
      setLocalValue(formatPhone(externalNumbers));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const formatted = formatPhone(input);
    setLocalValue(formatted);
    setHasInteracted(true);

    // Retourner le numéro complet avec indicatif
    const numbers = formatted.replace(/\D/g, '');
    const fullNumber = numbers ? `+225${numbers}` : '';
    onChange(fullNumber);
  };

  // Gérer l'état initial au montage
  useEffect(() => {
    if (localValue.length === 0) {
      setHasInteracted(false);
    }
  }, []);

  const numbers = localValue.replace(/\D/g, '');
  const isValid = isValidIvorianPhone(localValue);
  const showSuccess = hasInteracted && numbers.length === 10 && isValid;
  const showError = hasInteracted && (error || (numbers.length === 10 && !isValid));

  return (
    <div className={`phone-input-v2 ${className}`}>
      {/* Container */}
      <div
        className={`
        relative flex items-center
        border-2 rounded-2xl transition-all duration-200
        ${isFocused ? 'ring-4 ring-primary-light border-primary' : 'border-gray-300'}
        ${showError ? 'border-red-500 ring-4 ring-red-100' : ''}
        ${showSuccess ? 'border-green-500 ring-4 ring-green-100' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'bg-white'}
        hover:border-gray-400
      `}
      >
        {/* Icône Téléphone */}
        <div className="pl-4 pr-3 flex items-center border-r-2 border-gray-200">
          <Phone
            className={`h-5 w-5 ${
              isFocused
                ? 'text-primary'
                : showError
                  ? 'text-red-500'
                  : showSuccess
                    ? 'text-green-500'
                    : 'text-gray-400'
            } transition-colors`}
          />
        </div>

        {/* Indicatif Pays */}
        <div className="px-4 py-4 flex items-center gap-2 border-r-2 border-gray-200 bg-gray-50">
          <span className="text-2xl leading-none">🇨🇮</span>
          <span className="text-base font-semibold text-gray-700">+225</span>
        </div>

        {/* Input Numéro */}
        <input
          type="tel"
          value={localValue}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          inputMode="numeric"
          className="
            flex-1 px-4 py-4
            bg-transparent border-none outline-none
            text-lg font-medium text-gray-900
            placeholder-gray-400
            disabled:cursor-not-allowed
          "
        />

        {/* Icône de Validation */}
        {showSuccess && (
          <div className="pr-4">
            <svg
              className="h-6 w-6 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Message d'Erreur */}
      {showError && (
        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          <span>{error || 'Numéro invalide. Utilisez un préfixe valide (01, 05, 07, 27)'}</span>
        </p>
      )}

      {/* Aide */}
      {hasInteracted && !showError && !showSuccess && numbers.length > 0 && (
        <p className="mt-2 text-sm text-gray-500">
          {10 - numbers.length} chiffre{10 - numbers.length > 1 ? 's' : ''} restant
          {10 - numbers.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
};

export default PhoneInputV2;
