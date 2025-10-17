/**
 * Mobile Push Notifications Service for Mon Toit Real Estate App
 *
 * This file provides push notification functionality for property alerts,
 * messages, and other real-time updates for the real estate application.
 */

import { Capacitor } from '@capacitor/core';
import {
  PushNotifications,
  PermissionStatus,
  PushNotificationSchema,
  ActionPerformed
} from '@capacitor/push-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Preferences } from '@capacitor/preferences';

export interface NotificationChannel {
  id: string;
  name: string;
  description: string;
  importance: 'high' | 'default' | 'low';
  sound?: string;
  vibrate?: boolean;
}

export interface CustomNotificationData {
  type: 'property_alert' | 'message' | 'booking' | 'payment' | 'system';
  propertyId?: string;
  messageId?: string;
  userId?: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export interface NotificationSettings {
  enabled: boolean;
  channels: Record<string, boolean>;
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string;   // HH:mm format
  };
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export class MobileNotificationService {
  private static instance: MobileNotificationService;
  private isInitialized = false;
  private settings: NotificationSettings = {
    enabled: true,
    channels: {
      property_alert: true,
      message: true,
      booking: true,
      payment: true,
      system: true,
    },
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
    },
    soundEnabled: true,
    vibrationEnabled: true,
  };

  private readonly NOTIFICATION_CHANNELS: NotificationChannel[] = [
    {
      id: 'property_alert',
      name: 'Alertes biens immobiliers',
      description: 'Nouveaux biens correspondant à vos critères',
      importance: 'high',
      sound: 'default',
      vibrate: true,
    },
    {
      id: 'message',
      name: 'Messages',
      description: 'Nouveaux messages d\'autres utilisateurs',
      importance: 'high',
      sound: 'default',
      vibrate: true,
    },
    {
      id: 'booking',
      name: 'Réservations',
      description: 'Confirmations et rappels de réservations',
      importance: 'high',
      sound: 'default',
      vibrate: true,
    },
    {
      id: 'payment',
      name: 'Paiements',
      description: 'Confirmations de paiements et factures',
      importance: 'default',
      sound: 'default',
      vibrate: true,
    },
    {
      id: 'system',
      name: 'Système',
      description: 'Notifications importantes de l\'application',
      importance: 'low',
      sound: 'default',
      vibrate: false,
    },
  ];

  private constructor() {}

  static getInstance(): MobileNotificationService {
    if (!MobileNotificationService.instance) {
      MobileNotificationService.instance = new MobileNotificationService();
    }
    return MobileNotificationService.instance;
  }

  /**
   * Initialize push notifications
   */
  async initialize(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.log('Push notifications: Not running on native platform');
      return;
    }

    if (this.isInitialized) {
      return;
    }

    try {
      // Load settings
      await this.loadSettings();

      // Request permissions
      const permission = await this.requestPermissions();
      if (!permission.granted) {
        console.warn('Push notifications permission not granted');
        return;
      }

      // Register for push notifications
      await this.register();

      // Set up listeners
      this.setupListeners();

      this.isInitialized = true;
      console.log('✅ Push notifications initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize push notifications:', error);
      throw error;
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<PermissionStatus> {
    try {
      const permission = await PushNotifications.requestPermissions();
      return permission;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      throw error;
    }
  }

  /**
   * Check notification permissions
   */
  async checkPermissions(): Promise<PermissionStatus> {
    try {
      return await PushNotifications.checkPermissions();
    } catch (error) {
      console.error('Error checking permissions:', error);
      throw error;
    }
  }

  /**
   * Register for push notifications
   */
  private async register(): Promise<void> {
    try {
      await PushNotifications.register();

      // Get registration token
      const result = await PushNotifications.addListener('registration',
        (token) => {
          console.log('📱 Push notification token:', token.value);
          // Here you would typically send this token to your backend
          this.sendTokenToBackend(token.value);
        }
      );

      // Handle registration errors
      await PushNotifications.addListener('registrationError',
        (error) => {
          console.error('❌ Push notification registration error:', error.error);
        }
      );
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      throw error;
    }
  }

  /**
   * Set up notification listeners
   */
  private setupListeners(): void {
    // Handle received notifications (app in foreground)
    PushNotifications.addListener('pushNotificationReceived',
      async (notification: PushNotificationSchema) => {
        console.log('📨 Push notification received:', notification);

        // Check quiet hours
        if (this.isInQuietHours()) {
          console.log('🔕 Quiet hours - notification muted');
          return;
        }

        // Check channel settings
        const channel = notification.data?.type as string;
        if (!this.settings.channels[channel]) {
          console.log('🔕 Channel disabled - notification muted');
          return;
        }

        // Trigger haptic feedback if enabled
        if (this.settings.vibrationEnabled) {
          await Haptics.notification({
            type: notification.data?.type === 'message' ? 'success' : 'warning'
          });
        }

        // Handle notification display and logic here
        this.handleReceivedNotification(notification);
      }
    );

    // Handle notification taps (app in background or closed)
    PushNotifications.addListener('pushNotificationActionPerformed',
      async (notification: ActionPerformed) => {
        console.log('📱 Push notification action performed:', notification);

        // Trigger haptic feedback
        await Haptics.impact({ style: ImpactStyle.Medium });

        // Handle notification action
        await this.handleNotificationAction(notification);
      }
    );
  }

  /**
   * Handle received notification
   */
  private handleReceivedNotification(notification: PushNotificationSchema): void {
    // Custom logic for handling notifications
    switch (notification.data?.type) {
      case 'property_alert':
        console.log('🏠 New property alert:', notification.title);
        // Update property list, show badge, etc.
        break;

      case 'message':
        console.log('💬 New message:', notification.title);
        // Update message list, show badge, etc.
        break;

      case 'booking':
        console.log('📅 Booking notification:', notification.title);
        // Update booking list, show badge, etc.
        break;

      case 'payment':
        console.log('💳 Payment notification:', notification.title);
        // Update payment status, show badge, etc.
        break;

      case 'system':
        console.log('⚙️ System notification:', notification.title);
        // Handle system notifications
        break;

      default:
        console.log('📢 Generic notification:', notification.title);
    }
  }

  /**
   * Handle notification action
   */
  private async handleNotificationAction(notification: ActionPerformed): Promise<void> {
    const { data } = notification.notification;

    // Navigate to appropriate screen based on notification type
    switch (data?.type) {
      case 'property_alert':
        if (data.propertyId) {
          // Navigate to property details
          window.location.href = `/biens/${data.propertyId}`;
        } else {
          // Navigate to property list
          window.location.href = '/biens';
        }
        break;

      case 'message':
        if (data.messageId) {
          // Navigate to message thread
          window.location.href = `/messages/${data.messageId}`;
        } else {
          // Navigate to messages list
          window.location.href = '/messages';
        }
        break;

      case 'booking':
        // Navigate to bookings page
        window.location.href = '/reservations';
        break;

      case 'payment':
        // Navigate to payments page
        window.location.href = '/paiements';
        break;

      default:
        // Navigate to home page
        window.location.href = '/';
    }
  }

  /**
   * Send token to backend
   */
  private async sendTokenToBackend(token: string): Promise<void> {
    try {
      // Here you would send the token to your backend
      console.log('Sending push notification token to backend:', token);

      // Example API call
      // await fetch('/api/push-notifications/register', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ token })
      // });
    } catch (error) {
      console.error('Error sending token to backend:', error);
    }
  }

  /**
   * Schedule local notification (not available in basic Capacitor, would need plugin)
   */
  async scheduleLocalNotification(notification: CustomNotificationData): Promise<void> {
    if (!this.settings.enabled) {
      return;
    }

    // Check quiet hours
    if (this.isInQuietHours()) {
      return;
    }

    // Check channel settings
    if (!this.settings.channels[notification.type]) {
      return;
    }

    try {
      // This would require a local notifications plugin
      console.log('📅 Scheduling local notification:', notification);

      // For now, just log - would need @capacitor/local-notifications plugin
      // await LocalNotifications.schedule({
      //   notifications: [{
      //     title: notification.title,
      //     body: notification.body,
      //     id: Date.now(),
      //     schedule: { at: new Date() },
      //     sound: this.settings.soundEnabled ? 'default' : undefined,
      //     attachments: undefined,
      //     actionTypeId: '',
      //     extra: notification.data,
      //   }]
      // });
    } catch (error) {
      console.error('Error scheduling local notification:', error);
    }
  }

  /**
   * Update notification settings
   */
  async updateSettings(newSettings: Partial<NotificationSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    await this.saveSettings();
  }

  /**
   * Get current settings
   */
  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  /**
   * Load settings from preferences
   */
  private async loadSettings(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: 'notification_settings' });
      if (value) {
        this.settings = { ...this.settings, ...JSON.parse(value) };
      }
    } catch (error) {
      console.warn('Could not load notification settings:', error);
    }
  }

  /**
   * Save settings to preferences
   */
  private async saveSettings(): Promise<void> {
    try {
      await Preferences.set({
        key: 'notification_settings',
        value: JSON.stringify(this.settings),
      });
    } catch (error) {
      console.error('Could not save notification settings:', error);
    }
  }

  /**
   * Check if current time is in quiet hours
   */
  private isInQuietHours(): boolean {
    if (!this.settings.quietHours.enabled) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = this.settings.quietHours.start.split(':').map(Number);
    const [endHour, endMin] = this.settings.quietHours.end.split(':').map(Number);

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime <= endTime) {
      // Normal case (e.g., 22:00 to 08:00 next day)
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Overnight case (e.g., 22:00 to 08:00)
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  /**
   * Get notification channels
   */
  getChannels(): NotificationChannel[] {
    return [...this.NOTIFICATION_CHANNELS];
  }

  /**
   * Get notification history (would need backend implementation)
   */
  async getNotificationHistory(): Promise<any[]> {
    try {
      // This would typically fetch from your backend
      console.log('Fetching notification history...');

      // Example API call
      // const response = await fetch('/api/push-notifications/history');
      // return response.json();

      return [];
    } catch (error) {
      console.error('Error fetching notification history:', error);
      return [];
    }
  }

  /**
   * Clear notification history
   */
  async clearNotificationHistory(): Promise<void> {
    try {
      // This would typically clear via backend API
      console.log('Clearing notification history...');

      // Example API call
      // await fetch('/api/push-notifications/history', { method: 'DELETE' });
    } catch (error) {
      console.error('Error clearing notification history:', error);
    }
  }
}

/**
 * React hook for notification functionality
 */
export function useMobileNotifications() {
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [hasPermission, setHasPermission] = React.useState(false);
  const [settings, setSettings] = React.useState<NotificationSettings | null>(null);

  const notificationService = MobileNotificationService.getInstance();

  React.useEffect(() => {
    initializeNotifications();
  }, []);

  const initializeNotifications = async () => {
    try {
      await notificationService.initialize();
      setIsInitialized(true);

      const permission = await notificationService.checkPermissions();
      setHasPermission(permission.granted);

      setSettings(notificationService.getSettings());
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  };

  const requestPermissions = async () => {
    const permission = await notificationService.requestPermissions();
    setHasPermission(permission.granted);
    return permission;
  };

  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    await notificationService.updateSettings(newSettings);
    setSettings(notificationService.getSettings());
  };

  const scheduleLocalNotification = async (notification: CustomNotificationData) => {
    return await notificationService.scheduleLocalNotification(notification);
  };

  return {
    isInitialized,
    hasPermission,
    settings,
    requestPermissions,
    updateSettings,
    scheduleLocalNotification,
    getChannels: notificationService.getChannels.bind(notificationService),
    getHistory: notificationService.getNotificationHistory.bind(notificationService),
    clearHistory: notificationService.clearNotificationHistory.bind(notificationService),
  };
}