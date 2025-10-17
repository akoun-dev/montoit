import { useState, useEffect } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import OfflineIndicator from '@/components/OfflineIndicator';

export const OfflineWrapper = ({ children }: { children: React.ReactNode }) => {
  const isOnline = useOnlineStatus();
  const [showOfflineIndicator, setShowOfflineIndicator] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShowOfflineIndicator(true);
    } else {
      // Hide indicator after a brief delay when coming back online
      const timeout = setTimeout(() => setShowOfflineIndicator(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [isOnline]);

  return (
    <>
      {showOfflineIndicator && <OfflineIndicator />}
      {children}
    </>
  );
};
