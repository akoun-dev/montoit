import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, id, ...props }, ref) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className="space-y-2">
        {label && (
          <label htmlFor={inputId} className="text-sm font-semibold text-[#2C1810]">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'w-full rounded-lg border border-[#EFEBE9] bg-white px-4 py-3 text-[#2C1810] placeholder:text-[#A69B95] outline-none transition focus:border-[#F16522] focus:ring-2 focus:ring-[#F16522]/20',
            error && 'border-red-400 focus:border-red-500 focus:ring-red-200',
            className
          )}
          {...props}
        />
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          hint && <p className="text-xs text-[#6B5A4E]">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
