import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/services/logger';

interface QueuedAction {
  id: string;
  type: 'favorite' | 'message';
  propertyId?: string;
  data?: any;
  timestamp: number;
}

export const useOfflineSync = () => {
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Load queued actions from localStorage
    const storedQueue = localStorage.getItem('offlineQueue');
    if (storedQueue) {
      setQueue(JSON.parse(storedQueue));
    }
  }, []);

  useEffect(() => {
    // Save queue to localStorage whenever it changes
    localStorage.setItem('offlineQueue', JSON.stringify(queue));
  }, [queue]);

  useEffect(() => {
    // Sync when coming back online
    const handleOnline = async () => {
      if (queue.length > 0 && !isSyncing) {
        await syncQueue();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [queue, isSyncing]);

  const addToQueue = (action: Omit<QueuedAction, 'id' | 'timestamp'>) => {
    const newAction: QueuedAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    setQueue(prev => [...prev, newAction]);
  };

  const syncQueue = async () => {
    if (queue.length === 0 || !navigator.onLine) return;

    setIsSyncing(true);
    const failedActions: QueuedAction[] = [];

    for (const action of queue) {
      try {
        if (action.type === 'favorite' && action.propertyId) {
          const { error } = await supabase
            .from('user_favorites')
            .upsert({ property_id: action.propertyId, user_id: (await supabase.auth.getUser()).data.user?.id });
          
          if (error) throw error;
        }
        // Add more action types as needed
      } catch (error) {
        logger.warn('Failed to sync offline action', { actionType: action.type });
        failedActions.push(action);
      }
    }

    setQueue(failedActions);
    setIsSyncing(false);

    if (failedActions.length === 0) {
      toast({
        title: "✅ Synchronisation réussie",
        description: `${queue.length} action(s) synchronisée(s)`,
      });
    } else {
      toast({
        title: "⚠️ Synchronisation partielle",
        description: `${queue.length - failedActions.length}/${queue.length} action(s) synchronisée(s)`,
        variant: "destructive",
      });
    }
  };

  return {
    queue,
    addToQueue,
    syncQueue,
    isSyncing,
    hasQueuedActions: queue.length > 0,
  };
};
