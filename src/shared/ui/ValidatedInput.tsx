import { forwardRef, InputHTMLAttributes } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface ValidatedInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label?: string;
  error?: string;
  touched?: boolean;
  isValid?: boolean;
  helperText?: string;
  showValidIcon?: boolean;
  containerClassName?: string;
  inputClassName?: string;
}

/**
 * Composant Input avec feedback visuel de validation
 *
 * - Bordure verte si valide et touché
 * - Bordure rouge + message d'erreur si invalide
 * - Bordure neutre si non touché
 *
 * @example
 * <ValidatedInput
 *   label="Email"
 *   name="email"
 *   value={email}
 *   onChange={(e) => setEmail(e.target.value)}
 *   onBlur={() => validateField('email', () => ValidationService.validateEmail(email))}
 *   error={errors.email}
 *   touched={touched.email}
 *   isValid={!errors.email && touched.email}
 * />
 */
export const ValidatedInput = forwardRef<HTMLInputElement, ValidatedInputProps>(
  (
    {
      label,
      error,
      touched = false,
      isValid = false,
      helperText,
      showValidIcon = true,
      containerClassName,
      inputClassName,
      required,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || props.name;
    const showError = touched && error;
    const showSuccess = touched && isValid && showValidIcon;

    return (
      <div className={cn('space-y-1.5', containerClassName)}>
        {label && (
          <label htmlFor={inputId} className="block text-sm font-semibold text-foreground">
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            aria-invalid={showError ? 'true' : 'false'}
            aria-describedby={
              showError ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            className={cn(
              'w-full px-4 py-3 border rounded-xl bg-background text-foreground transition-all duration-200',
              'focus:ring-2 focus:outline-none',
              // État par défaut
              !touched && 'border-border focus:ring-primary/20 focus:border-primary',
              // État valide
              showSuccess &&
                'border-green-500 focus:ring-green-500/20 focus:border-green-500 pr-10',
              // État invalide
              showError &&
                'border-destructive focus:ring-destructive/20 focus:border-destructive pr-10',
              // Disabled
              props.disabled && 'opacity-50 cursor-not-allowed bg-muted',
              inputClassName
            )}
            {...props}
          />

          {/* Icône de validation */}
          {showSuccess && (
            <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
          )}
          {showError && (
            <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-destructive" />
          )}
        </div>

        {/* Message d'erreur */}
        {showError && (
          <p id={`${inputId}-error`} className="text-sm text-destructive flex items-center gap-1">
            {error}
          </p>
        )}

        {/* Texte d'aide */}
        {helperText && !showError && (
          <p id={`${inputId}-helper`} className="text-sm text-muted-foreground">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

ValidatedInput.displayName = 'ValidatedInput';

export default ValidatedInput;
