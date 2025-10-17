import { ReactNode } from 'react';
import PullToRefreshLib from 'react-pull-to-refresh';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
}

/**
 * Pull to Refresh pour mobile
 * - Tire vers le bas pour rafraîchir
 * - Indicateur de chargement
 * - Feedback visuel
 * - Désactivable
 */
export const PullToRefresh = ({ 
  children, 
  onRefresh, 
  disabled = false 
}: PullToRefreshProps) => {
  if (disabled) {
    return <>{children}</>;
  }

  const handleRefresh = async () => {
    try {
      await onRefresh();
    } catch (error) {
      console.error('Erreur lors du rafraîchissement:', error);
    }
  };

  return (
    <PullToRefreshLib
      onRefresh={handleRefresh}
      resistance={2.5}
      hammerOptions={{ touchAction: 'pan-y' }}
      icon={
        <div className="flex flex-col items-center justify-center py-4">
          <RefreshCw className="h-6 w-6 text-primary animate-spin" />
          <span className="text-sm text-muted-foreground mt-2">
            Rafraîchissement...
          </span>
        </div>
      }
      loading={
        <div className="flex flex-col items-center justify-center py-4">
          <RefreshCw className="h-6 w-6 text-primary animate-spin" />
          <span className="text-sm text-muted-foreground mt-2">
            Chargement...
          </span>
        </div>
      }
    >
      {children}
    </PullToRefreshLib>
  );
};

