/**
 * PhoneInputWithCountry - Input téléphone avec dropdown pays
 *
 * Features:
 * - Dropdown avec drapeaux et indicatifs pays
 * - +225 (Côte d'Ivoire) par défaut
 * - Formatage automatique du numéro
 * - Support des pays d'Afrique de l'Ouest
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

export interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  phoneLength: number;
}

const COUNTRIES: Country[] = [
  { code: 'CI', name: "Côte d'Ivoire", dialCode: '+225', flag: '🇨🇮', phoneLength: 10 },
  { code: 'SN', name: 'Sénégal', dialCode: '+221', flag: '🇸🇳', phoneLength: 9 },
  { code: 'ML', name: 'Mali', dialCode: '+223', flag: '🇲🇱', phoneLength: 8 },
  { code: 'BF', name: 'Burkina Faso', dialCode: '+226', flag: '🇧🇫', phoneLength: 8 },
  { code: 'GN', name: 'Guinée', dialCode: '+224', flag: '🇬🇳', phoneLength: 9 },
  { code: 'TG', name: 'Togo', dialCode: '+228', flag: '🇹🇬', phoneLength: 8 },
  { code: 'BJ', name: 'Bénin', dialCode: '+229', flag: '🇧🇯', phoneLength: 8 },
  { code: 'NE', name: 'Niger', dialCode: '+227', flag: '🇳🇪', phoneLength: 8 },
  { code: 'CM', name: 'Cameroun', dialCode: '+237', flag: '🇨🇲', phoneLength: 9 },
  { code: 'GA', name: 'Gabon', dialCode: '+241', flag: '🇬🇦', phoneLength: 7 },
];

// Préfixes opérateurs valides pour la Côte d'Ivoire
const CI_VALID_PREFIXES = ['01', '05', '07', '27'];

// Validation du numéro selon le pays
const validatePhoneNumber = (
  digits: string,
  country: Country
): { isValid: boolean; error?: string } => {
  if (digits.length === 0) {
    return { isValid: false };
  }

  if (digits.length !== country.phoneLength) {
    return {
      isValid: false,
      error: `Le numéro doit contenir ${country.phoneLength} chiffres`,
    };
  }

  // Validation spécifique pour la Côte d'Ivoire
  if (country.code === 'CI') {
    const prefix = digits.substring(0, 2);
    if (!CI_VALID_PREFIXES.includes(prefix)) {
      return {
        isValid: false,
        error: 'Le numéro doit commencer par 01, 05, 07 ou 27',
      };
    }
  }

  return { isValid: true };
};

interface PhoneInputWithCountryProps {
  value: string;
  onChange: (value: string, fullNumber: string, countryCode: string, isValid: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  error?: boolean;
  className?: string;
}

export function PhoneInputWithCountry({
  value,
  onChange,
  placeholder = '   07 00 00 00 00',
  disabled = false,
  autoFocus = false,
  error = false,
  className = '',
}: PhoneInputWithCountryProps) {
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]!);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Validation du numéro actuel
  const digits = value.replace(/\D/g, '');
  const validation = useMemo(
    () => validatePhoneNumber(digits, selectedCountry),
    [digits, selectedCountry]
  );
  const showValidation = digits.length > 0;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format phone number with spaces
  const formatPhoneNumber = (input: string): string => {
    const digits = input.replace(/\D/g, '');
    // Format as XX XX XX XX XX for CI
    if (selectedCountry.code === 'CI') {
      return digits.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
    }
    // Generic format for other countries
    return digits.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const newDigits = rawValue.replace(/\D/g, '');

    // Limit to country's phone length
    const limitedDigits = newDigits.slice(0, selectedCountry.phoneLength);
    const formatted = formatPhoneNumber(limitedDigits);

    // Build full number (dialCode without + + digits)
    const dialCodeDigits = selectedCountry.dialCode.replace('+', '');
    const fullNumber = dialCodeDigits + limitedDigits;

    // Validate and callback
    const newValidation = validatePhoneNumber(limitedDigits, selectedCountry);
    onChange(formatted, fullNumber, selectedCountry.dialCode, newValidation.isValid);
  };

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setIsOpen(false);

    // Recalculate full number with new country code
    const currentDigits = value.replace(/\D/g, '');
    const limitedDigits = currentDigits.slice(0, country.phoneLength);
    const formatted = formatPhoneNumber(limitedDigits);
    const dialCodeDigits = country.dialCode.replace('+', '');
    const fullNumber = dialCodeDigits + limitedDigits;

    // Validate with new country
    const newValidation = validatePhoneNumber(limitedDigits, country);
    onChange(formatted, fullNumber, country.dialCode, newValidation.isValid);

    // Focus input after selection
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Déterminer les classes de bordure selon l'état
  const getBorderClasses = () => {
    if (error) return 'border-red-400 ring-2 ring-red-100';
    if (!showValidation)
      return 'border-[#EFEBE9] focus-within:border-[#F16522] focus-within:ring-4 focus-within:ring-[#F16522]/10';
    if (validation.isValid) return 'border-green-500 ring-2 ring-green-100';
    return 'border-red-400 ring-2 ring-red-100';
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div
        className={`
        flex items-stretch rounded-xl bg-white border overflow-hidden transition-all
        ${getBorderClasses()}
        ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
      `}
      >
        {/* Country Selector Button */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`
            flex items-center gap-2 px-4 py-4 bg-[#FAF7F4] border-r border-[#EFEBE9]
            hover:bg-[#F5F0EB] transition-colors min-w-[110px] justify-between
            ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
          `}
          disabled={disabled}
        >
          <span className="text-xl">{selectedCountry.flag}</span>
          <span className="font-bold text-[#2C1810] text-sm">{selectedCountry.dialCode}</span>
          <ChevronDown
            className={`w-4 h-4 text-[#A69B95] transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Phone Input */}
        <div className="flex-1 relative flex items-center">
          <input
            ref={inputRef}
            type="tel"
            value={value}
            onChange={handleInputChange}
            placeholder={placeholder}
            disabled={disabled}
            autoFocus={autoFocus}
            className="
              w-full py-4 pl-4 pr-12 bg-transparent text-[#2C1810] font-medium
              placeholder:text-[#A69B95] outline-none
            "
          />
          {/* Validation Icon */}
          {showValidation && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {validation.isValid ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : (
                <X className="w-5 h-5 text-red-500" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Validation Error Message */}
      {showValidation && !validation.isValid && validation.error && (
        <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
          <X className="w-3.5 h-3.5" />
          {validation.error}
        </p>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="
          absolute top-full left-0 right-0 mt-2 
          bg-white border border-[#EFEBE9] rounded-xl shadow-xl 
          z-50 max-h-64 overflow-y-auto
          animate-fade-in
        "
        >
          {COUNTRIES.map((country) => (
            <button
              key={country.code}
              type="button"
              onClick={() => handleCountrySelect(country)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 text-left
                hover:bg-[#FAF7F4] transition-colors
                ${selectedCountry.code === country.code ? 'bg-[#F16522]/5 text-[#F16522]' : 'text-[#2C1810]'}
              `}
            >
              <span className="text-xl">{country.flag}</span>
              <span className="flex-1 font-medium text-sm">{country.name}</span>
              <span className="text-[#A69B95] font-bold text-sm">{country.dialCode}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default PhoneInputWithCountry;
