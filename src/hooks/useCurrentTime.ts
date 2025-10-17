import { useState, useEffect, useCallback } from 'react';

interface TimeFormat {
  includeSeconds?: boolean;
}

interface CurrentTimeReturn {
  formatTime: (options?: TimeFormat) => string;
  formatDate: () => string;
  dayPeriod: string;
  currentTime: Date;
}

export const useCurrentTime = (): CurrentTimeReturn => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second for smoother experience

    return () => clearInterval(timer);
  }, []);

  const formatTime = useCallback((options?: TimeFormat) => {
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Abidjan',
      ...(options?.includeSeconds && { second: '2-digit' })
    };
    
    return currentTime.toLocaleTimeString('fr-FR', timeOptions);
  }, [currentTime]);

  const formatDate = useCallback(() => {
    return currentTime.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      timeZone: 'Africa/Abidjan'
    });
  }, [currentTime]);

  const getDayPeriod = useCallback(() => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Matin';
    if (hour < 18) return 'Après-midi';
    return 'Soir';
  }, [currentTime]);

  return {
    formatTime,
    formatDate,
    dayPeriod: getDayPeriod(),
    currentTime
  };
};
