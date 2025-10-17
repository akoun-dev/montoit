import { useState, useEffect } from 'react';

interface NetworkInfo {
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g';
  downlink: number;
  saveData: boolean;
  online: boolean;
}

export const useNetworkStatus = (): NetworkInfo => {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
    effectiveType: '4g',
    downlink: 10,
    saveData: false,
    online: navigator.onLine,
  });

  useEffect(() => {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    const updateNetworkInfo = () => {
      setNetworkInfo({
        effectiveType: connection?.effectiveType || '4g',
        downlink: connection?.downlink || 10,
        saveData: connection?.saveData || false,
        online: navigator.onLine,
      });
    };

    const handleOnlineChange = () => {
      setNetworkInfo(prev => ({ ...prev, online: navigator.onLine }));
    };

    if (connection) {
      connection.addEventListener('change', updateNetworkInfo);
      updateNetworkInfo();
    }

    window.addEventListener('online', handleOnlineChange);
    window.addEventListener('offline', handleOnlineChange);

    return () => {
      if (connection) {
        connection.removeEventListener('change', updateNetworkInfo);
      }
      window.removeEventListener('online', handleOnlineChange);
      window.removeEventListener('offline', handleOnlineChange);
    };
  }, []);

  return networkInfo;
};
