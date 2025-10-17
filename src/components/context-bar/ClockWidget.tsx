import { useState } from 'react';
import { Clock } from 'lucide-react';
import { Widget } from './Widget';

interface ClockWidgetProps {
  formatTime: (options?: { includeSeconds?: boolean }) => string;
  formatDate: () => string;
  dayPeriod: string;
}

export const ClockWidget = ({ 
  formatTime, 
  formatDate, 
  dayPeriod 
}: ClockWidgetProps) => {
  const [showSeconds, setShowSeconds] = useState(false);

  return (
    <Widget
      onClick={() => setShowSeconds(!showSeconds)}
      ariaLabel="Heure et date actuelles - Cliquer pour basculer l'affichage des secondes"
    >
      <Clock className="h-4 w-4 text-primary group-hover:rotate-12 transition-transform" />
      <span className="font-semibold text-sm">
        {formatTime({ includeSeconds: showSeconds })}
      </span>
      <span className="text-xs text-muted-foreground">
        {formatDate()}
      </span>
      <span className="text-xs text-primary/70 hidden xl:inline">
        • {dayPeriod}
      </span>
    </Widget>
  );
};
