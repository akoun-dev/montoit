import { useState, useEffect, useCallback } from 'react';
import {
  PushNotifications,
  Token,
  PushNotificationSchema,
  ActionPerformed,
} from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

interface NotificationData {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

type PushTokenPlatform = 'native' | 'web';

interface PushTokenPayload {
  token: string;
  platform: PushTokenPlatform;
  details?: Record<string, unknown>;
}

const VAPID_PUBLIC_KEY = import.meta.env.VITE_PUBLIC_PUSH_VAPID_KEY;
const isBrowser = typeof window !== 'undefined' && typeof navigator !== 'undefined';
const isServiceWorkerSupported = isBrowser && 'serviceWorker' in navigator;
const isPushManagerSupported = isBrowser && 'PushManager' in window;
const isNotificationSupported = isBrowser && 'Notification' in window;
const isWebPushSupported = isServiceWorkerSupported && isPushManagerSupported && isNotificationSupported;

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
};

export function usePushNotifications() {
  const [token, setToken] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastNotification, setLastNotification] = useState<NotificationData | null>(null);

  const isNative = Capacitor.isNativePlatform();

  const registerToken = useCallback(async ({ token: pushToken, platform, details }: PushTokenPayload) => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.warn('Impossible de stocker le token push : utilisateur non authentifié');
        return;
      }

      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;

      const metadata = {
        userAgent,
        time: new Date().toISOString(),
        ...(details || {}),
      };

      const { error: upsertError } = await supabase
        .from('push_tokens')
        .upsert(
          {
            user_id: user.id,
            token: pushToken,
            platform,
            platform_details: metadata,
            last_seen: new Date().toISOString(),
            is_active: true,
          },
          { onConflict: 'token' }
        );

      if (upsertError) {
        console.error('Erreur lors de l\'enregistrement du token push:', upsertError);
      }
    } catch (err) {
      console.error('Erreur lors de l\'enregistrement du token push:', err);
    }
  }, []);

  const deactivateToken = useCallback(async (pushToken?: string) => {
    if (!pushToken) return;

    const { error: updateError } = await supabase
      .from('push_tokens')
      .update({ is_active: false, last_seen: new Date().toISOString() })
      .eq('token', pushToken);

    if (updateError) {
      console.error('Erreur lors de la désactivation du token push:', updateError);
    }
  }, []);

  const registerNative = useCallback(async () => {
    try {
      setError(null);
      const permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        const newStatus = await PushNotifications.requestPermissions();
        if (newStatus.receive !== 'granted') {
          throw new Error('Permission notifications refusée');
        }
      } else if (permStatus.receive !== 'granted') {
        throw new Error('Permission notifications refusée');
      }

      await PushNotifications.register();
      setIsRegistered(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inscription notifications';
      console.error('Native push registration failed', err);
      setError(message);
    }
  }, []);

  const registerWeb = useCallback(async () => {
    if (!isWebPushSupported) {
      setError('Ce navigateur ne supporte pas les notifications push');
      return;
    }

    if (!VAPID_PUBLIC_KEY) {
      setError('Clé VAPID publique manquante');
      return;
    }

    try {
      setError(null);

      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js');
      }

      if (!registration) {
        throw new Error('Impossible de charger le service worker des notifications');
      }

      if (Notification.permission === 'default') {
        const requested = await Notification.requestPermission();
        if (requested !== 'granted') {
          throw new Error('Permission notifications refusée');
        }
      }

      if (Notification.permission !== 'granted') {
        throw new Error('Permission notifications refusée');
      }

      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      }

      if (!subscription) {
        throw new Error('Impossible de créer l\'abonnement push');
      }

      await registerToken({
        token: subscription.endpoint,
        platform: 'web',
        details: { subscription: subscription.toJSON() },
      });

      setToken(subscription.endpoint);
      setIsRegistered(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inscription notifications';
      console.error('Web push registration failed', err);
      setError(message);
      setIsRegistered(false);
    }
  }, [registerToken]);

  const register = useCallback(async () => {
    if (isNative) {
      await registerNative();
      return;
    }

    await registerWeb();
  }, [isNative, registerNative, registerWeb]);

  const unregister = useCallback(async () => {
    try {
      if (isNative) {
        await PushNotifications.removeAllListeners();
      } else if (isWebPushSupported) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          await deactivateToken(subscription.endpoint);
        }
      }
    } catch (err) {
      console.error('Error unregistering push notifications:', err);
    } finally {
      setIsRegistered(false);
      setToken(null);
    }
  }, [isNative, deactivateToken]);

  useEffect(() => {
    if (!isNative) return;

    const tokenListener = PushNotifications.addListener('registration', async (tokenData: Token) => {
      setToken(tokenData.value);
      await registerToken({ token: tokenData.value, platform: 'native' });
    });

    const errorListener = PushNotifications.addListener('registrationError', (err) => {
      setError(err.error);
    });

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

    const actionListener = PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        const notification = action.notification;
        setLastNotification({
          title: notification.title || '',
          body: notification.body || '',
          data: notification.data,
        });

        const data = notification.data;
        if (data?.route) {
          window.location.href = data.route as string;
        }
      }
    );

    return () => {
      tokenListener.then((listener) => listener.remove());
      errorListener.then((listener) => listener.remove());
      notificationListener.then((listener) => listener.remove());
      actionListener.then((listener) => listener.remove());
    };
  }, [isNative, registerToken]);

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
