import { useState, useCallback } from 'react';
import type { FormValidationResult, ValidationResult } from '@/services/validation';

interface FieldState {
  isValid: boolean;
  isInvalid: boolean;
  error?: string;
}

interface UseFormValidationReturn<T> {
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  validateField: (field: keyof T, validator: () => ValidationResult) => boolean;
  validateAll: (validationFn: () => FormValidationResult) => boolean;
  setFieldTouched: (field: keyof T) => void;
  setFieldError: (field: keyof T, error: string) => void;
  clearFieldError: (field: keyof T) => void;
  clearAllErrors: () => void;
  getFieldState: (field: keyof T) => FieldState;
  isFormValid: boolean;
}

/**
 * Hook réutilisable pour la validation de formulaires en temps réel
 *
 * @example
 * const { errors, touched, validateField, getFieldState, validateAll } = useFormValidation<FormData>();
 *
 * // Validation d'un champ
 * validateField('email', () => ValidationService.validateEmail(formData.email));
 *
 * // État d'un champ
 * const emailState = getFieldState('email');
 * // { isValid: true, isInvalid: false, error: undefined }
 */
export function useFormValidation<T extends object>(): UseFormValidationReturn<T> {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = useCallback(
    (field: keyof T, validator: () => ValidationResult): boolean => {
      const result = validator();

      setErrors((prev) => {
        const newErrors = { ...prev };
        if (result.isValid) {
          delete newErrors[field as string];
        } else if (result.error) {
          newErrors[field as string] = result.error;
        }
        return newErrors;
      });

      setTouched((prev) => ({ ...prev, [field]: true }));

      return result.isValid;
    },
    []
  );

  const validateAll = useCallback((validationFn: () => FormValidationResult): boolean => {
    const result = validationFn();

    // Marquer tous les champs comme touchés
    const allTouched = Object.keys(result.errors).reduce(
      (acc, key) => {
        acc[key] = true;
        return acc;
      },
      {} as Record<string, boolean>
    );

    setErrors(result.errors);
    setTouched((prev) => ({ ...prev, ...allTouched }));

    return result.isValid;
  }, []);

  const setFieldTouched = useCallback((field: keyof T) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const setFieldError = useCallback((field: keyof T, error: string) => {
    setErrors((prev) => ({ ...prev, [field]: error }));
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const clearFieldError = useCallback((field: keyof T) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field as string];
      return newErrors;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  const getFieldState = useCallback(
    (field: keyof T): FieldState => {
      const fieldKey = field as string;
      const isTouched = touched[fieldKey] || false;
      const error = errors[fieldKey];

      return {
        isValid: isTouched && !error,
        isInvalid: isTouched && !!error,
        error: isTouched ? error : undefined,
      };
    },
    [errors, touched]
  );

  const isFormValid = Object.keys(errors).length === 0;

  return {
    errors,
    touched,
    validateField,
    validateAll,
    setFieldTouched,
    setFieldError,
    clearFieldError,
    clearAllErrors,
    getFieldState,
    isFormValid,
  };
}

export default useFormValidation;
