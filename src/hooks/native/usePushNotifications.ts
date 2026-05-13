import { useState, useEffect, useCallback } from 'react';
import {
  PushNotifications,
  Token,
  PushNotificationSchema,
  ActionPerformed,
} from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';

interface NotificationData {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastNotification, setLastNotification] = useState<NotificationData | null>(null);

  const isNative = Capacitor.isNativePlatform();

  const registerToken = useCallback(async (
    pushToken: string,
    userId: string
  ) => {
    try {
      // Upsert token in database
      const { error } = await supabase
        .from('push_tokens')
        .upsert({
          token: pushToken,
          user_id: userId,
          platform: Capacitor.getPlatform(),
          last_seen: new Date().toISOString(),
          is_active: true,
        }, {
          onConflict: 'token'
        });

      if (error) {
        console.error('Error storing push token:', error);
        throw error;
      }

      console.log('Push token stored successfully');
    } catch (err) {
      console.error('Failed to store push token:', err);
      throw err;
    }
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
    const tokenListener = PushNotifications.addListener('registration', async (tokenData: Token) => {
      setToken(tokenData.value);

      // Store token in database when user is available
      if (tokenData.value && user) {
        try {
          await registerToken(tokenData.value, user.id);
        } catch (err) {
          console.error('Failed to store push token:', err);
        }
      }
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
  }, [isNative, user, registerToken]);

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
