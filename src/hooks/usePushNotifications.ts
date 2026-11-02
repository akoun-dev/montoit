import { useState, useEffect, useCallback } from 'react';
import {
  PushNotifications,
  Token,
  PushNotificationSchema,
  ActionPerformed,
} from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
// import { supabase } from '@/integrations/supabase/client';

interface NotificationData {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export function usePushNotifications() {
  const [token, setToken] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastNotification, setLastNotification] = useState<NotificationData | null>(null);

  const isNative = Capacitor.isNativePlatform();

  const registerToken = useCallback(async (_pushToken: string, _userId: string) => {
    // Store token in database for server-side push
    // Note: You may need to add a push_token column to profiles table
    // and uncomment the following code:
    // const { error: dbError } = await supabase
    //   .from('profiles')
    //   .update({ push_token: _pushToken })
    //   .eq('user_id', _userId);
    // if (dbError) console.error('Error storing push token:', dbError);
  }, []);

  const register = useCallback(async () => {
    if (!isNative) {
      // Web fallback - could use Web Push API
      return;
    }

    try {
      // Request permission
      const permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        const newStatus = await PushNotifications.requestPermissions();
        if (newStatus.receive !== 'granted') {
          throw new Error('Permission notifications refusée');
        }
      } else if (permStatus.receive !== 'granted') {
        throw new Error('Permission notifications refusée');
      }

      // Register with APNs/FCM
      await PushNotifications.register();
      setIsRegistered(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inscription notifications';
      setError(message);
    }
  }, [isNative]);

  const unregister = useCallback(async () => {
    if (!isNative) return;

    try {
      await PushNotifications.removeAllListeners();
      setIsRegistered(false);
      setToken(null);
    } catch (err) {
      console.error('Error unregistering push notifications:', err);
    }
  }, [isNative]);

  useEffect(() => {
    if (!isNative) return;

    // Token received
    const tokenListener = PushNotifications.addListener('registration', (tokenData: Token) => {
      setToken(tokenData.value);
    });

    // Registration error
    const errorListener = PushNotifications.addListener('registrationError', (err) => {
      setError(err.error);
    });

    // Notification received while app is open
    const notificationListener = PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        setLastNotification({
          title: notification.title || '',
          body: notification.body || '',
          data: notification.data,
        });
      }
    );

    // User tapped on notification
    const actionListener = PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        const notification = action.notification;
        setLastNotification({
          title: notification.title || '',
          body: notification.body || '',
          data: notification.data,
        });

        // Handle navigation based on notification data
        const data = notification.data;
        if (data?.route) {
          // Navigate to the route specified in the notification
          window.location.href = data.route as string;
        }
      }
    );

    return () => {
      tokenListener.then((l) => l.remove());
      errorListener.then((l) => l.remove());
      notificationListener.then((l) => l.remove());
      actionListener.then((l) => l.remove());
    };
  }, [isNative]);

  return {
    isNative,
    token,
    isRegistered,
    error,
    lastNotification,
    register,
    unregister,
    registerToken,
  };
}
