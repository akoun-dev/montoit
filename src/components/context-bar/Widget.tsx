import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';
import type { WidgetProps } from './types';
import { logger } from '@/services/logger';

export const Widget = ({ 
  isLoading, 
  hasError, 
  onClick, 
  children, 
  ariaLabel
}: Omit<WidgetProps, 'tooltip'>) => {
  logger.debug('Widget rendering');
  
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "group flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300",
        "bg-background/40 hover:bg-background/60 hover:scale-105",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        "active:scale-95",
        hasError && "border border-destructive/50"
      )}
    >
      {isLoading ? (
        <>
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </>
      ) : hasError ? (
        <>
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm font-medium text-destructive">Erreur</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};
