import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Save, AlertCircle } from 'lucide-react';
import { AutoSaveStatus } from '@/hooks/useAutoSave';
import { cn } from '@/lib/utils';

interface AutoSaveIndicatorProps {
  status: AutoSaveStatus;
  lastSaved: Date | null;
}

export const AutoSaveIndicator = ({ status, lastSaved }: AutoSaveIndicatorProps) => {
  const [timeSince, setTimeSince] = useState<string>('');

  useEffect(() => {
    if (!lastSaved) return;

    const updateTimeSince = () => {
      const seconds = Math.floor((Date.now() - lastSaved.getTime()) / 1000);
      
      if (seconds < 60) {
        setTimeSince(`il y a ${seconds}s`);
      } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        setTimeSince(`il y a ${minutes}min`);
      } else {
        const hours = Math.floor(seconds / 3600);
        setTimeSince(`il y a ${hours}h`);
      }
    };

    updateTimeSince();
    const interval = setInterval(updateTimeSince, 10000); // Update every 10s

    return () => clearInterval(interval);
  }, [lastSaved]);

  const getStatusDisplay = () => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          text: 'Modification en cours...',
          className: 'text-muted-foreground',
        };
      case 'saving':
        return {
          icon: Save,
          text: 'Sauvegarde en cours...',
          className: 'text-primary animate-pulse',
        };
      case 'saved':
        return {
          icon: CheckCircle2,
          text: `Sauvegardé ${timeSince}`,
          className: 'text-green-600',
        };
      case 'error':
        return {
          icon: AlertCircle,
          text: 'Erreur de sauvegarde',
          className: 'text-destructive',
        };
      default:
        return null;
    }
  };

  const statusDisplay = getStatusDisplay();
  
  if (!statusDisplay) return null;

  const Icon = statusDisplay.icon;

  return (
    <div className={cn('flex items-center gap-2 text-sm', statusDisplay.className)}>
      <Icon className="h-4 w-4" />
      <span>{statusDisplay.text}</span>
    </div>
  );
};
