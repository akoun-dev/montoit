import * as React from 'react';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onCheckedChange?: (checked: boolean | 'indeterminate') => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, checked, ...props }, ref) => {
    return (
      <input
        type="checkbox"
        ref={ref}
        checked={checked as boolean}
        className={`h-4 w-4 rounded border-neutral-300 text-primary 
          focus:ring-primary focus:ring-offset-0 cursor-pointer ${className || ''}`}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        {...props}
      />
    );
  }
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
