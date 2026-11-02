import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const baseStyles =
  'inline-flex items-center justify-center font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

const variantStyles: Record<Variant, string> = {
  primary: 'bg-[#F16522] text-white hover:bg-[#D95318] focus:ring-[#F16522]',
  secondary: 'border border-[#EFEBE9] text-[#2C1810] hover:bg-[#FAF7F4] focus:ring-[#2C1810]',
  ghost: 'text-[#2C1810] hover:bg-[#FAF7F4] focus:ring-[#2C1810]',
};

const sizeStyles: Record<Size, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2.5 text-base',
  lg: 'px-5 py-3 text-lg',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      {...props}
    />
  )
);

Button.displayName = 'Button';

export default Button;
