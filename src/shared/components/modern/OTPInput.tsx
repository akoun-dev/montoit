/**
 * OTPInput - Composant Moderne pour Code de Vérification
 * Mon Toit - Nouvelle Expérience Auth 2025
 */

import React, { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

export const OTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  value,
  onChange,
  onComplete,
  autoFocus = true,
  disabled = false,
  error = false,
  className = '',
}) => {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Synchroniser avec la valeur externe
  useEffect(() => {
    const otpArray = value.split('').slice(0, length);
    const paddedOtp = [...otpArray, ...Array(length - otpArray.length).fill('')];
    setOtp(paddedOtp);
  }, [value, length]);

  // Auto-focus sur le premier champ
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  // Détecter OTP auto-fill (iOS/Android)
  useEffect(() => {
    const handleAutofill = () => {
      setTimeout(() => {
        const filledValue = inputRefs.current.map((ref) => ref?.value || '').join('');

        if (filledValue.length === length) {
          handleOTPChange(filledValue);
        }
      }, 100);
    };

    inputRefs.current.forEach((ref) => {
      ref?.addEventListener('input', handleAutofill);
    });

    return () => {
      inputRefs.current.forEach((ref) => {
        ref?.removeEventListener('input', handleAutofill);
      });
    };
  }, [length]);

  const handleOTPChange = (newOtp: string) => {
    onChange(newOtp);

    if (newOtp.length === length && onComplete) {
      onComplete(newOtp);
    }
  };

  const handleChange = (index: number, newValue: string) => {
    // Accepter uniquement les chiffres
    const sanitized = newValue.replace(/\D/g, '');

    if (sanitized.length === 0) {
      // Suppression
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
      handleOTPChange(newOtp.join(''));
      return;
    }

    if (sanitized.length === 1) {
      // Saisie d'un seul chiffre
      const newOtp = [...otp];
      newOtp[index] = sanitized;
      setOtp(newOtp);
      handleOTPChange(newOtp.join(''));

      // Focus sur le champ suivant
      if (index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    } else if (sanitized.length > 1) {
      // Paste de plusieurs chiffres
      const digits = sanitized.split('').slice(0, length);
      const newOtp = [...Array(length)].map((_, i) => digits[i] || '');
      setOtp(newOtp);
      handleOTPChange(newOtp.join(''));

      // Focus sur le dernier champ rempli ou le suivant
      const lastFilledIndex = Math.min(digits.length - 1, length - 1);
      inputRefs.current[lastFilledIndex]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();

      if (otp[index]) {
        // Supprimer le chiffre actuel
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
        handleOTPChange(newOtp.join(''));
      } else if (index > 0) {
        // Si vide, aller au champ précédent et le vider
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        handleOTPChange(newOtp.join(''));
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const sanitized = pastedData.replace(/\D/g, '').slice(0, length);

    if (sanitized) {
      const digits = sanitized.split('');
      const newOtp = [...Array(length)].map((_, i) => digits[i] || '');
      setOtp(newOtp);
      handleOTPChange(newOtp.join(''));

      // Focus sur le dernier champ rempli
      const lastFilledIndex = Math.min(digits.length - 1, length - 1);
      inputRefs.current[lastFilledIndex]?.focus();
    }
  };

  const handleFocus = (index: number) => {
    // Sélectionner le contenu au focus
    inputRefs.current[index]?.select();
  };

  return (
    <div className={`otp-input-container ${className}`}>
      <div className="flex gap-2 sm:gap-3 justify-center">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onFocus={() => handleFocus(index)}
            disabled={disabled}
            className={`
              otp-input-box
              w-12 h-14 sm:w-14 sm:h-16
              text-center text-2xl sm:text-3xl font-bold
              border-2 rounded-xl
              transition-all duration-200
              ${digit ? 'border-primary bg-primary-light' : 'border-gray-300 bg-white'}
              ${error ? 'border-red-500 bg-red-50' : ''}
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}
              focus:outline-none focus:ring-4 focus:ring-primary-light focus:border-primary
              hover:border-gray-400
            `}
            aria-label={`Chiffre ${index + 1}`}
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
          />
        ))}
      </div>

      <style>{`
        .otp-input-box::-webkit-outer-spin-button,
        .otp-input-box::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        
        .otp-input-box[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  );
};

export default OTPInput;
