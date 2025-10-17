import { motion } from 'framer-motion';
import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GradientButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'success';
  size?: 'sm' | 'md' | 'lg';
}

export const GradientButton = forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ children, variant = 'primary', size = 'md', className = '', ...props }, ref) => {
    const gradients = {
      primary: {
        from: 'from-primary via-primary-600 to-primary-700',
        hover: 'hover:from-primary-700 hover:via-primary-600 hover:to-primary'
      },
      secondary: {
        from: 'from-secondary via-secondary-600 to-secondary-700',
        hover: 'hover:from-secondary-700 hover:via-secondary-600 hover:to-secondary'
      },
      success: {
        from: 'from-green-500 via-green-600 to-green-700',
        hover: 'hover:from-green-700 hover:via-green-600 hover:to-green-500'
      }
    };

    const sizes = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg'
    };

    return (
      <motion.button
        ref={ref}
        className={cn(
          'relative overflow-hidden',
          'bg-gradient-to-r',
          gradients[variant].from,
          gradients[variant].hover,
          'text-white font-semibold',
          sizes[size],
          'rounded-lg',
          'transition-all duration-500 ease-in-out',
          'shadow-lg hover:shadow-2xl',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        {...props}
      >
        {/* Shine effect overlay */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          initial={{ x: '-100%' }}
          whileHover={{ x: '100%' }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        />
        <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
      </motion.button>
    );
  }
);

GradientButton.displayName = 'GradientButton';

