/**
 * Simple Input component pour ONECI
 *
 * Un composant Input simple pour éviter les problèmes d'export complexes
 */

import { cn } from '@/shared/lib/utils';

interface SimpleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  label?: string;
}

export function SimpleInput({ error, label, className, id, ...props }: SimpleInputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-[#2C1810] mb-1">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'block w-full px-4 py-3 rounded-xl border-2',
          error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-neutral-200 focus:border-[#F16522] focus:ring-[#F16522]',
          'focus:outline-none',
          'focus:ring-2',
          'transition-all',
          'min-h-[var(--size-touch-target-min)]',
          className
        )}
        {...props}
      />
    </div>
  );
}
