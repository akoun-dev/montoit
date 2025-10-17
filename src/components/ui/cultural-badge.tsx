import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CulturalBadgeProps {
  children: ReactNode;
  variant?: 'flag' | 'kente' | 'gold' | 'green';
  className?: string;
}

export const CulturalBadge = ({ 
  children, 
  variant = 'flag',
  className = ''
}: CulturalBadgeProps) => {
  const variants = {
    flag: 'bg-gradient-to-r from-[hsl(30_100%_50%)] via-white to-[hsl(142_76%_36%)]',
    kente: 'bg-gradient-to-r from-[hsl(30_100%_50%)] via-[hsl(45_100%_51%)] to-[hsl(142_76%_36%)]',
    gold: 'bg-[hsl(45_100%_51%)]',
    green: 'bg-[hsl(142_76%_36%)]'
  };

  const textColors = {
    flag: 'text-gray-800',
    kente: 'text-white',
    gold: 'text-white',
    green: 'text-white'
  };

  return (
    <div className={cn(
      'inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold',
      variants[variant],
      textColors[variant],
      'shadow-md',
      className
    )}>
      {children}
    </div>
  );
};

