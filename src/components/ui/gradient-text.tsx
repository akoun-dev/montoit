import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GradientTextProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'rainbow';
  className?: string;
  animate?: boolean;
}

export const GradientText = ({ 
  children, 
  variant = 'primary',
  className = '',
  animate = true
}: GradientTextProps) => {
  const gradients = {
    primary: 'from-primary via-primary-600 to-secondary',
    secondary: 'from-secondary via-orange-500 to-yellow-500',
    rainbow: 'from-primary via-secondary to-green-500'
  };

  return (
    <motion.span
      className={cn(
        'bg-gradient-to-r',
        gradients[variant],
        'bg-clip-text text-transparent',
        'font-bold',
        animate && 'animate-gradient',
        className
      )}
      style={{
        backgroundSize: animate ? '200% auto' : '100% auto'
      }}
    >
      {children}
    </motion.span>
  );
};

