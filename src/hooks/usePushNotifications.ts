import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/services/logger';

export const usePushNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsSupported('Notification' in window && 'serviceWorker' in navigator);
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!isSupported) {
      toast({
        title: "Non supporté",
        description: "Les notifications ne sont pas supportées sur ce navigateur",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        await subscribeToNotifications();
        toast({
          title: "Notifications activées",
          description: "Vous recevrez des alertes pour les nouveaux événements",
        });
      }
    } catch (error) {
      logger.logError(error, { context: 'usePushNotifications', action: 'requestPermission' });
      toast({
        title: "Erreur",
        description: "Impossible d'activer les notifications",
        variant: "destructive",
      });
    }
  };

  const subscribeToNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          // This should be your VAPID public key
          'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
        ),
      });

      // Save subscription to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('push_subscriptions').upsert({
          user_id: user.id,
          subscription: subscription.toJSON() as any,
        }, {
          onConflict: 'user_id'
        });
      }
    } catch (error) {
      logger.logError(error, { context: 'usePushNotifications', action: 'subscribe' });
    }
  };

  const unsubscribe = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Remove from database
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('push_subscriptions').delete().eq('user_id', user.id);
        }

        toast({
          title: "Notifications désactivées",
          description: "Vous ne recevrez plus d'alertes push",
        });
      }
    } catch (error) {
      logger.logError(error, { context: 'usePushNotifications', action: 'unsubscribe' });
    }
  };

  return {
    permission,
    isSupported,
    requestPermission,
    unsubscribe,
  };
};

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
