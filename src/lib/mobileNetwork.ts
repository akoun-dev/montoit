/**
 * Mobile Network Service for Mon Toit Real Estate App
 *
 * This file provides network detection, offline functionality, and
 * connectivity management for the real estate application.
 */

import { Capacitor } from '@capacitor/core';
import { Network, NetworkStatus } from '@capacitor/network';
import { Preferences } from '@capacitor/preferences';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export interface NetworkInfo {
  connected: boolean;
  connectionType: 'wifi' | 'cellular' | 'none' | 'unknown';
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
  online: boolean;
  strength?: number; // Signal strength 0-4
}

export interface OfflineAction {
  id: string;
  type: 'property_save' | 'message_send' | 'booking_create' | 'photo_upload' | 'favorite_add' | 'search';
  data: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
  priority: 'high' | 'medium' | 'low';
}

export interface NetworkSettings {
  enableOfflineMode: boolean;
  autoSyncWhenOnline: boolean;
  maxRetryAttempts: number;
  retryDelay: number; // milliseconds
  notifyOnConnectionChange: boolean;
  dataUsageWarning: boolean;
  downloadOnWifiOnly: boolean;
}

export class MobileNetworkService {
  private static instance: MobileNetworkService;
  private networkStatus: NetworkInfo = {
    connected: true,
    connectionType: 'unknown',
    effectiveType: 'unknown',
    online: true,
  };
  private offlineQueue: OfflineAction[] = [];
  private networkListeners: ((status: NetworkInfo) => void)[] = [];
  private isInitialized = false;

  private settings: NetworkSettings = {
    enableOfflineMode: true,
    autoSyncWhenOnline: true,
    maxRetryAttempts: 3,
    retryDelay: 5000,
    notifyOnConnectionChange: true,
    dataUsageWarning: true,
    downloadOnWifiOnly: false,
  };

  private constructor() {}

  static getInstance(): MobileNetworkService {
    if (!MobileNetworkService.instance) {
      MobileNetworkService.instance = new MobileNetworkService();
    }
    return MobileNetworkService.instance;
  }

  /**
   * Initialize network monitoring
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Load settings
      await this.loadSettings();

      // Get current network status
      const status = await Network.getStatus();
      this.updateNetworkStatus(status);

      // Set up network listener
      await Network.addListener('networkStatusChange', (status) => {
        this.handleNetworkChange(status);
      });

      this.isInitialized = true;
      console.log('✅ Network monitoring initialized successfully');

      // Process offline queue if online
      if (this.networkStatus.connected && this.settings.autoSyncWhenOnline) {
        this.processOfflineQueue();
      }
    } catch (error) {
      console.error('❌ Failed to initialize network monitoring:', error);
      throw error;
    }
  }

  /**
   * Get current network status
   */
  async getNetworkStatus(): Promise<NetworkInfo> {
    if (Capacitor.isNativePlatform()) {
      const status = await Network.getStatus();
      this.updateNetworkStatus(status);
    }
    return { ...this.networkStatus };
  }

  /**
   * Update network status
   */
  private updateNetworkStatus(status: NetworkStatus): void {
    const newStatus: NetworkInfo = {
      connected: status.connected,
      connectionType: status.connectionType,
      effectiveType: this.getEffectiveType(status),
      online: status.connected,
    };

    const statusChanged = JSON.stringify(newStatus) !== JSON.stringify(this.networkStatus);
    this.networkStatus = newStatus;

    if (statusChanged) {
      console.log('📡 Network status changed:', newStatus);
      this.notifyListeners(newStatus);
    }
  }

  /**
   * Handle network change
   */
  private async handleNetworkChange(status: NetworkStatus): Promise<void> {
    const oldStatus = { ...this.networkStatus };
    this.updateNetworkStatus(status);

    // Notify listeners
    this.notifyListeners(this.networkStatus);

    // Handle connection restoration
    if (!oldStatus.connected && this.networkStatus.connected) {
      console.log('🌐 Connection restored');
      await this.handleConnectionRestored();
    }

    // Handle connection loss
    if (oldStatus.connected && !this.networkStatus.connected) {
      console.log('📵 Connection lost');
      await this.handleConnectionLost();
    }

    // Trigger haptic feedback
    if (this.settings.notifyOnConnectionChange) {
      await Haptics.notification({
        type: this.networkStatus.connected ? 'success' : 'warning'
      });
    }
  }

  /**
   * Handle connection restored
   */
  private async handleConnectionRestored(): Promise<void> {
    if (this.settings.autoSyncWhenOnline) {
      await this.processOfflineQueue();
    }

    // Could trigger app refresh, sync data, etc.
    console.log('🔄 Auto-syncing offline actions...');
  }

  /**
   * Handle connection lost
   */
  private async handleConnectionLost(): Promise<void> {
    console.log('⚠️ Entering offline mode');
    // Could show offline banner, disable features, etc.
  }

  /**
   * Add network status listener
   */
  addListener(listener: (status: NetworkInfo) => void): void {
    this.networkListeners.push(listener);
  }

  /**
   * Remove network status listener
   */
  removeListener(listener: (status: NetworkInfo) => void): void {
    const index = this.networkListeners.indexOf(listener);
    if (index > -1) {
      this.networkListeners.splice(index, 1);
    }
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(status: NetworkInfo): void {
    this.networkListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Error in network listener:', error);
      }
    });
  }

  /**
   * Add action to offline queue
   */
  async addToOfflineQueue(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    const offlineAction: OfflineAction = {
      ...action,
      id: this.generateId(),
      timestamp: new Date(),
      retryCount: 0,
    };

    this.offlineQueue.push(offlineAction);
    await this.saveOfflineQueue();

    console.log('📝 Action added to offline queue:', offlineAction.type);
    return offlineAction.id;
  }

  /**
   * Process offline queue
   */
  async processOfflineQueue(): Promise<void> {
    if (!this.networkStatus.connected || this.offlineQueue.length === 0) {
      return;
    }

    console.log('🔄 Processing offline queue...');

    // Sort by priority and timestamp
    const sortedQueue = [...this.offlineQueue].sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp.getTime() - b.timestamp.getTime();
    });

    for (const action of sortedQueue) {
      if (await this.processOfflineAction(action)) {
        // Remove successful action from queue
        const index = this.offlineQueue.findIndex(a => a.id === action.id);
        if (index > -1) {
          this.offlineQueue.splice(index, 1);
        }
      }
    }

    await this.saveOfflineQueue();
  }

  /**
   * Process individual offline action
   */
  private async processOfflineAction(action: OfflineAction): Promise<boolean> {
    try {
      console.log(`🔄 Processing offline action: ${action.type}`);

      // Process different action types
      switch (action.type) {
        case 'property_save':
          return await this.syncPropertySave(action);
        case 'message_send':
          return await this.syncMessageSend(action);
        case 'booking_create':
          return await this.syncBookingCreate(action);
        case 'photo_upload':
          return await this.syncPhotoUpload(action);
        case 'favorite_add':
          return await this.syncFavoriteAdd(action);
        case 'search':
          return await this.syncSearch(action);
        default:
          console.warn('Unknown action type:', action.type);
          return true; // Remove unknown actions
      }
    } catch (error) {
      console.error(`Error processing action ${action.type}:`, error);

      // Increment retry count
      action.retryCount++;

      // Check if max retries exceeded
      if (action.retryCount >= action.maxRetries) {
        console.warn(`Max retries exceeded for action ${action.type}`);
        return true; // Remove failed action
      }

      // Delay before retry
      setTimeout(() => {
        this.processOfflineAction(action);
      }, this.settings.retryDelay);

      return false;
    }
  }

  /**
   * Sync property save action
   */
  private async syncPropertySave(action: OfflineAction): Promise<boolean> {
    // Implementation would depend on your API
    console.log('🏠 Syncing property save:', action.data);
    return true;
  }

  /**
   * Sync message send action
   */
  private async syncMessageSend(action: OfflineAction): Promise<boolean> {
    // Implementation would depend on your API
    console.log('💬 Syncing message send:', action.data);
    return true;
  }

  /**
   * Sync booking create action
   */
  private async syncBookingCreate(action: OfflineAction): Promise<boolean> {
    // Implementation would depend on your API
    console.log('📅 Syncing booking create:', action.data);
    return true;
  }

  /**
   * Sync photo upload action
   */
  private async syncPhotoUpload(action: OfflineAction): Promise<boolean> {
    // Implementation would depend on your API
    console.log('📸 Syncing photo upload:', action.data);
    return true;
  }

  /**
   * Sync favorite add action
   */
  private async syncFavoriteAdd(action: OfflineAction): Promise<boolean> {
    // Implementation would depend on your API
    console.log('❤️ Syncing favorite add:', action.data);
    return true;
  }

  /**
   * Sync search action
   */
  private async syncSearch(action: OfflineAction): Promise<boolean> {
    // Implementation would depend on your API
    console.log('🔍 Syncing search:', action.data);
    return true;
  }

  /**
   * Get offline queue
   */
  getOfflineQueue(): OfflineAction[] {
    return [...this.offlineQueue];
  }

  /**
   * Clear offline queue
   */
  async clearOfflineQueue(): Promise<void> {
    this.offlineQueue = [];
    await this.saveOfflineQueue();
  }

  /**
   * Save offline queue to preferences
   */
  private async saveOfflineQueue(): Promise<void> {
    try {
      const queueData = this.offlineQueue.map(action => ({
        ...action,
        timestamp: action.timestamp.toISOString(),
      }));

      await Preferences.set({
        key: 'offline_queue',
        value: JSON.stringify(queueData),
      });
    } catch (error) {
      console.error('Error saving offline queue:', error);
    }
  }

  /**
   * Load offline queue from preferences
   */
  private async loadOfflineQueue(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: 'offline_queue' });
      if (value) {
        const queueData = JSON.parse(value);
        this.offlineQueue = queueData.map((action: any) => ({
          ...action,
          timestamp: new Date(action.timestamp),
        }));
      }
    } catch (error) {
      console.error('Error loading offline queue:', error);
    }
  }

  /**
   * Update settings
   */
  async updateSettings(newSettings: Partial<NetworkSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    await this.saveSettings();
  }

  /**
   * Get settings
   */
  getSettings(): NetworkSettings {
    return { ...this.settings };
  }

  /**
   * Save settings to preferences
   */
  private async saveSettings(): Promise<void> {
    try {
      await Preferences.set({
        key: 'network_settings',
        value: JSON.stringify(this.settings),
      });
    } catch (error) {
      console.error('Error saving network settings:', error);
    }
  }

  /**
   * Load settings from preferences
   */
  private async loadSettings(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: 'network_settings' });
      if (value) {
        this.settings = { ...this.settings, ...JSON.parse(value) };
      }
    } catch (error) {
      console.error('Error loading network settings:', error);
    }
  }

  /**
   * Get effective connection type
   */
  private getEffectiveType(status: NetworkStatus): 'slow-2g' | '2g' | '3g' | '4g' | 'unknown' {
    // This is a simplified implementation
    // In a real app, you might use additional APIs to determine actual speed
    switch (status.connectionType) {
      case 'wifi':
        return '4g';
      case 'cellular':
        return '3g'; // Default assumption
      default:
        return 'unknown';
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * Check if should use offline mode
   */
  shouldUseOfflineMode(): boolean {
    return !this.networkStatus.connected || this.settings.enableOfflineMode;
  }

  /**
   * Check if can download large files
   */
  canDownloadLargeFiles(): boolean {
    return this.networkStatus.connected &&
           (!this.settings.downloadOnWifiOnly || this.networkStatus.connectionType === 'wifi');
  }
}

/**
 * React hook for network functionality
 */
export function useMobileNetwork() {
  const [networkStatus, setNetworkStatus] = React.useState<NetworkInfo>({
    connected: true,
    connectionType: 'unknown',
    effectiveType: 'unknown',
    online: true,
  });
  const [offlineQueue, setOfflineQueue] = React.useState<OfflineAction[]>([]);
  const [settings, setSettings] = React.useState<NetworkSettings | null>(null);
  const [isInitialized, setIsInitialized] = React.useState(false);

  const networkService = MobileNetworkService.getInstance();

  React.useEffect(() => {
    const initialize = async () => {
      await networkService.initialize();
      setNetworkStatus(await networkService.getNetworkStatus());
      setOfflineQueue(networkService.getOfflineQueue());
      setSettings(networkService.getSettings());
      setIsInitialized(true);
    };

    initialize();

    // Set up listener
    const handleNetworkChange = (status: NetworkInfo) => {
      setNetworkStatus(status);
      setOfflineQueue(networkService.getOfflineQueue());
    };

    networkService.addListener(handleNetworkChange);

    return () => {
      networkService.removeListener(handleNetworkChange);
    };
  }, []);

  const addToOfflineQueue = async (
    type: OfflineAction['type'],
    data: any,
    priority: OfflineAction['priority'] = 'medium'
  ) => {
    const actionId = await networkService.addToOfflineQueue({
      type,
      data,
      priority,
      maxRetries: settings?.maxRetryAttempts || 3,
    });
    setOfflineQueue(networkService.getOfflineQueue());
    return actionId;
  };

  const processOfflineQueue = async () => {
    await networkService.processOfflineQueue();
    setOfflineQueue(networkService.getOfflineQueue());
  };

  const clearOfflineQueue = async () => {
    await networkService.clearOfflineQueue();
    setOfflineQueue([]);
  };

  const updateSettings = async (newSettings: Partial<NetworkSettings>) => {
    await networkService.updateSettings(newSettings);
    setSettings(networkService.getSettings());
  };

  return {
    isInitialized,
    networkStatus,
    offlineQueue,
    settings,
    addToOfflineQueue,
    processOfflineQueue,
    clearOfflineQueue,
    updateSettings,
    isOnline: networkStatus.connected,
    isOffline: !networkStatus.connected,
    canDownloadLargeFiles: networkService.canDownloadLargeFiles(),
    shouldUseOfflineMode: networkService.shouldUseOfflineMode(),
  };
}