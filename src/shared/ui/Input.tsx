import { InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  validationState?: 'error' | 'success' | 'warning';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = false,
      validationState,
      leftIcon,
      rightIcon,
      className = '',
      id,
      required,
      type = 'text',
      ...props
    },
    ref
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const helperId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;

    const widthClass = fullWidth ? 'w-full' : '';

    // Déterminer l'état de validation
    const getValidationClasses = () => {
      if (error || validationState === 'error') {
        return 'border-semantic-error focus:border-semantic-error focus:ring-semantic-error';
      }
      if (validationState === 'success') {
        return 'border-semantic-success focus:border-semantic-success focus:ring-semantic-success';
      }
      if (validationState === 'warning') {
        return 'border-semantic-warning focus:border-semantic-warning focus:ring-semantic-warning';
      }
      return 'border-neutral-100 hover:border-neutral-300 focus:border-primary-500 focus:ring-primary-500';
    };

    const inputClasses = [
      'block',
      'w-full',
      'px-4 py-3',
      'min-h-[var(--size-touch-target-min)]',
      // Typographie avec tokens de design
      'text-body',
      'text-neutral-900',
      'font-regular',
      'leading-body',
      'tracking-normal',
      // Bordures et états
      'border-2',
      'rounded-base',
      'transition-fast',
      'ease-out',
      // Focus et accessibilité
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-offset-2',
      // États désactivés
      'disabled:bg-neutral-50',
      'disabled:cursor-not-allowed',
      'disabled:text-neutral-500',
      // Placeholder
      'placeholder:text-neutral-300',
      // Icônes
      'peer',
      // Classes de validation
      getValidationClasses(),
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const containerClasses = ['relative', widthClass].filter(Boolean).join(' ');

    const inputWrapperClasses = ['relative', 'flex', 'items-center'].filter(Boolean).join(' ');

    // Variables for potential future icon padding adjustments (currently handled inline)

    return (
      <div className={containerClasses}>
        {label && (
          <label
            htmlFor={inputId}
            className={[
              'block',
              'text-small',
              'font-semibold',
              'text-neutral-700',
              'mb-2',
              'leading-relaxed',
            ].join(' ')}
          >
            {label}
            {required && (
              <span className="text-semantic-error ml-1" aria-label="obligatoire">
                *
              </span>
            )}
          </label>
        )}

        <div className={inputWrapperClasses}>
          {leftIcon && (
            <div className="absolute left-3 text-neutral-500 pointer-events-none">{leftIcon}</div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={type}
            className={[inputClasses, leftIcon ? 'pl-10' : '', rightIcon ? 'pr-10' : '']
              .filter(Boolean)
              .join(' ')}
            aria-invalid={!!error || validationState === 'error'}
            aria-describedby={
              [error ? errorId : null, helperText ? helperId : null].filter(Boolean).join(' ') ||
              undefined
            }
            required={required}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 text-neutral-500 pointer-events-none">{rightIcon}</div>
          )}
        </div>

        {/* Messages d'aide et d'erreur */}
        <div className="mt-2 min-h-[1.25rem]">
          {error && (
            <p
              id={errorId}
              className={[
                'text-small',
                'font-regular',
                'text-semantic-error',
                'leading-relaxed',
                'flex',
                'items-center',
                'gap-1',
              ].join(' ')}
              role="alert"
            >
              <svg
                className="h-4 w-4 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {error}
            </p>
          )}

          {!error && helperText && (
            <p
              id={helperId}
              className={['text-small', 'font-regular', 'text-neutral-500', 'leading-relaxed'].join(
                ' '
              )}
            >
              {helperText}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
