import { forwardRef, TextareaHTMLAttributes } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface ValidatedTextareaProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'className'
> {
  label?: string;
  error?: string;
  touched?: boolean;
  isValid?: boolean;
  helperText?: string;
  showValidIcon?: boolean;
  showCharCount?: boolean;
  maxLength?: number;
  containerClassName?: string;
  textareaClassName?: string;
}

/**
 * Composant Textarea avec feedback visuel de validation
 */
export const ValidatedTextarea = forwardRef<HTMLTextAreaElement, ValidatedTextareaProps>(
  (
    {
      label,
      error,
      touched = false,
      isValid = false,
      helperText,
      showValidIcon = true,
      showCharCount = false,
      maxLength,
      containerClassName,
      textareaClassName,
      required,
      id,
      value,
      ...props
    },
    ref
  ) => {
    const textareaId = id || props.name;
    const showError = touched && error;
    const showSuccess = touched && isValid && showValidIcon;
    const charCount = typeof value === 'string' ? value.length : 0;

    return (
      <div className={cn('space-y-1.5', containerClassName)}>
        {label && (
          <div className="flex items-center justify-between">
            <label htmlFor={textareaId} className="block text-sm font-semibold text-foreground">
              {label}
              {required && <span className="text-destructive ml-1">*</span>}
            </label>
            {showCharCount && maxLength && (
              <span
                className={cn(
                  'text-xs',
                  charCount > maxLength ? 'text-destructive' : 'text-muted-foreground'
                )}
              >
                {charCount}/{maxLength}
              </span>
            )}
          </div>
        )}

        <div className="relative">
          <textarea
            ref={ref}
            id={textareaId}
            value={value}
            aria-invalid={showError ? 'true' : 'false'}
            aria-describedby={
              showError ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined
            }
            className={cn(
              'w-full px-4 py-3 border rounded-xl bg-background text-foreground transition-all duration-200 resize-y',
              'focus:ring-2 focus:outline-none',
              // État par défaut
              !touched && 'border-border focus:ring-primary/20 focus:border-primary',
              // État valide
              showSuccess && 'border-green-500 focus:ring-green-500/20 focus:border-green-500',
              // État invalide
              showError && 'border-destructive focus:ring-destructive/20 focus:border-destructive',
              // Disabled
              props.disabled && 'opacity-50 cursor-not-allowed bg-muted',
              textareaClassName
            )}
            {...props}
          />

          {/* Icône de validation (coin supérieur droit) */}
          {showSuccess && <CheckCircle className="absolute right-3 top-3 w-5 h-5 text-green-500" />}
          {showError && <AlertCircle className="absolute right-3 top-3 w-5 h-5 text-destructive" />}
        </div>

        {/* Message d'erreur */}
        {showError && (
          <p
            id={`${textareaId}-error`}
            className="text-sm text-destructive flex items-center gap-1"
          >
            {error}
          </p>
        )}

        {/* Texte d'aide */}
        {helperText && !showError && (
          <p id={`${textareaId}-helper`} className="text-sm text-muted-foreground">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

ValidatedTextarea.displayName = 'ValidatedTextarea';

export default ValidatedTextarea;
