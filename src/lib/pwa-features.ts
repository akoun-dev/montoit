/**
 * Enhanced PWA Features for Mon Toit
 * Progressive Web App utilities for mobile optimization
 */

export interface PWAInstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  prompt(): Promise<void>;
}

export class PWAInstaller {
  private static deferredPrompt: BeforeInstallPromptEvent | null = null;
  private static installPromptShown = false;

  /**
   * Initialize PWA installation features
   */
  static initialize(): void {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallPrompt();
    });

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.installPromptShown = false;
      this.hideInstallPrompt();
    });

    // Check if app is already installed
    if (this.isInstalled()) {
      this.hideInstallPrompt();
    }
  }

  /**
   * Show install prompt to user
   */
  private static showInstallPrompt(): void {
    if (this.installPromptShown || this.isInstalled()) return;

    const prompt = this.createInstallPromptElement();
    document.body.appendChild(prompt);
    this.installPromptShown = true;

    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (document.body.contains(prompt)) {
        this.hideInstallPrompt();
      }
    }, 10000);
  }

  /**
   * Hide install prompt
   */
  static hideInstallPrompt(): void {
    const prompt = document.querySelector('.install-prompt');
    if (prompt) {
      prompt.remove();
    }
    this.installPromptShown = false;
  }

  /**
   * Create install prompt element
   */
  private static createInstallPromptElement(): HTMLElement {
    const prompt = document.createElement('div');
    prompt.className = 'install-prompt';
    prompt.innerHTML = `
      <div class="install-prompt-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7L12 12L22 7L12 2Z"></path>
          <path d="M2 17L12 22L22 17"></path>
          <path d="M2 12L12 17L22 12"></path>
        </svg>
      </div>
      <div class="install-prompt-content">
        <div class="install-prompt-title">Installer Mon Toit</div>
        <div class="install-prompt-description">Accédez à votre plateforme immobilière préférée hors ligne</div>
      </div>
      <button class="install-prompt-button">Installer</button>
      <button class="install-prompt-dismiss">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;

    // Add event listeners
    const installButton = prompt.querySelector('.install-prompt-button') as HTMLButtonElement;
    const dismissButton = prompt.querySelector('.install-prompt-dismiss') as HTMLButtonElement;

    installButton.addEventListener('click', () => this.install());
    dismissButton.addEventListener('click', () => this.hideInstallPrompt());

    return prompt;
  }

  /**
   * Trigger installation
   */
  static async install(): Promise<void> {
    if (!this.deferredPrompt) return;

    try {
      await this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('PWA installation accepted');
      } else {
        console.log('PWA installation dismissed');
      }
    } catch (error) {
      console.error('Error during PWA installation:', error);
    }

    this.deferredPrompt = null;
    this.hideInstallPrompt();
  }

  /**
   * Check if PWA is already installed
   */
  static isInstalled(): boolean {
    // Check if running in standalone mode
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );
  }

  /**
   * Show manual installation instructions for iOS
   */
  static showIOSInstructions(): void {
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);

    if (!isIOS || this.isInstalled()) return;

    const instructions = document.createElement('div');
    instructions.className = 'install-prompt';
    instructions.innerHTML = `
      <div class="install-prompt-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="2" width="20" height="20" rx="2" ry="2"></rect>
          <line x1="9" y1="9" x2="15" y2="9"></line>
          <line x1="9" y1="12" x2="15" y2="12"></line>
          <line x1="9" y1="15" x2="11" y2="15"></line>
        </svg>
      </div>
      <div class="install-prompt-content">
        <div class="install-prompt-title">Installer Mon Toit</div>
        <div class="install-prompt-description">
          Appuyez sur <strong>Partager</strong> <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="18" cy="5" r="3"></circle>
            <circle cx="6" cy="12" r="3"></circle>
            <circle cx="18" cy="19" r="3"></circle>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
          </svg> puis sur <strong>"Sur l'écran d'accueil"</strong>
        </div>
      </div>
      <button class="install-prompt-dismiss">Compris</button>
    `;

    const dismissButton = instructions.querySelector('.install-prompt-dismiss') as HTMLButtonElement;
    dismissButton.addEventListener('click', () => instructions.remove());

    document.body.appendChild(instructions);

    // Auto-hide after 15 seconds
    setTimeout(() => {
      if (document.body.contains(instructions)) {
        instructions.remove();
      }
    }, 15000);
  }
}

export class PWACacheManager {
  private static CACHE_NAME = 'mon-toit-v1';
  private static STATIC_CACHE = 'mon-toit-static-v1';
  private static IMAGE_CACHE = 'mon-toit-images-v1';

  /**
   * Initialize caching strategies
   */
  static async initialize(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  /**
   * Cache static assets
   */
  static async cacheStaticAssets(urls: string[]): Promise<void> {
    if ('caches' in window) {
      const cache = await caches.open(this.STATIC_CACHE);
      await cache.addAll(urls);
    }
  }

  /**
   * Cache images with lazy loading
   */
  static async cacheImage(url: string): Promise<Response | undefined> {
    if ('caches' in window) {
      const cache = await caches.open(this.IMAGE_CACHE);
      const response = await cache.match(url);

      if (response) {
        return response;
      }

      try {
        const networkResponse = await fetch(url);
        if (networkResponse.ok) {
          cache.put(url, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        console.error('Failed to cache image:', error);
        return undefined;
      }
    }
    return undefined;
  }

  /**
   * Clear old caches
   */
  static async clearOldCaches(): Promise<void> {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      const deletions = cacheNames
        .filter(name => name !== this.CACHE_NAME && name !== this.STATIC_CACHE && name !== this.IMAGE_CACHE)
        .map(name => caches.delete(name));

      await Promise.all(deletions);
    }
  }
}

export class PWAOfflineManager {
  private static isOnline = navigator.onLine;
  private static offlineIndicator: HTMLElement | null = null;

  /**
   * Initialize offline functionality
   */
  static initialize(): void {
    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // Create offline indicator
    this.createOfflineIndicator();

    // Initial state
    if (!this.isOnline) {
      this.showOfflineIndicator();
    }
  }

  /**
   * Handle online state
   */
  private static handleOnline(): void {
    this.isOnline = true;
    this.hideOfflineIndicator();
    this.syncOfflineData();
  }

  /**
   * Handle offline state
   */
  private static handleOffline(): void {
    this.isOnline = false;
    this.showOfflineIndicator();
  }

  /**
   * Create offline indicator
   */
  private static createOfflineIndicator(): void {
    const indicator = document.createElement('div');
    indicator.className = 'offline-indicator';
    indicator.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.07 2.93 1 9z"></path>
        <path d="M5 13l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"></path>
        <path d="M9 17l2 2c0.55-0.55 1.45-0.55 2 0l2-2C13.45 15.55 10.55 15.55 9 17z"></path>
      </svg>
      Mode hors connexion
    `;
    document.body.appendChild(indicator);
    this.offlineIndicator = indicator;
  }

  /**
   * Show offline indicator
   */
  private static showOfflineIndicator(): void {
    if (this.offlineIndicator) {
      this.offlineIndicator.classList.add('show');
    }
  }

  /**
   * Hide offline indicator
   */
  private static hideOfflineIndicator(): void {
    if (this.offlineIndicator) {
      this.offlineIndicator.classList.remove('show');
    }
  }

  /**
   * Sync offline data when back online
   */
  private static async syncOfflineData(): Promise<void> {
    // Get stored offline actions
    const offlineActions = localStorage.getItem('offlineActions');
    if (!offlineActions) return;

    try {
      const actions = JSON.parse(offlineActions);

      for (const action of actions) {
        try {
          await this.executeAction(action);
        } catch (error) {
          console.error('Failed to sync action:', error);
        }
      }

      // Clear synced actions
      localStorage.removeItem('offlineActions');
    } catch (error) {
      console.error('Failed to sync offline data:', error);
    }
  }

  /**
   * Execute a stored action
   */
  private static async executeAction(action: any): Promise<void> {
    switch (action.type) {
      case 'favorite_property':
        // Sync favorite property
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.data)
        });
        break;

      case 'contact_form':
        // Send contact form
        await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.data)
        });
        break;

      // Add more action types as needed
    }
  }

  /**
   * Store action for later sync
   */
  static storeOfflineAction(action: any): void {
    const offlineActions = localStorage.getItem('offlineActions') || '[]';
    const actions = JSON.parse(offlineActions);
    actions.push({
      ...action,
      timestamp: Date.now()
    });
    localStorage.setItem('offlineActions', JSON.stringify(actions));
  }

  /**
   * Check if online
   */
  static isAppOnline(): boolean {
    return this.isOnline;
  }
}

export class PWAPushNotifications {
  private static subscription: PushSubscription | null = null;

  /**
   * Initialize push notifications
   */
  static async initialize(): Promise<void> {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        this.subscription = await registration.pushManager.getSubscription();

        if (!this.subscription) {
          await this.subscribeToNotifications();
        }
      } catch (error) {
        console.error('Push notification initialization failed:', error);
      }
    }
  }

  /**
   * Subscribe to push notifications
   */
  static async subscribeToNotifications(): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        this.subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array('YOUR_VAPID_PUBLIC_KEY')
        });

        await this.sendSubscriptionToServer(this.subscription);
      }
    } catch (error) {
      console.error('Push subscription failed:', error);
    }
  }

  /**
   * Send subscription to server
   */
  private static async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
    }
  }

  /**
   * Convert VAPID key to Uint8Array
   */
  private static urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }

  /**
   * Show local notification
   */
  static async showLocalNotification(title: string, options?: NotificationOptions): Promise<void> {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        await new Notification(title, {
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          ...options
        });
      } catch (error) {
        console.error('Failed to show notification:', error);
      }
    }
  }
}

export class PWAThemeManager {
  /**
   * Initialize theme management
   */
  static initialize(): void {
    // Detect preferred color scheme
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme) {
      this.setTheme(savedTheme as 'light' | 'dark' | 'system');
    } else {
      this.setTheme(prefersDark ? 'dark' : 'light');
    }

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (localStorage.getItem('theme') === 'system') {
        this.setTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  /**
   * Set theme
   */
  static setTheme(theme: 'light' | 'dark' | 'system'): void {
    localStorage.setItem('theme', theme);

    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
    } else {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }

    // Update meta theme-color
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'dark' ? '#1a1a1a' : '#ffffff');
    }
  }

  /**
   * Get current theme
   */
  static getCurrentTheme(): 'light' | 'dark' | 'system' {
    return localStorage.getItem('theme') as 'light' | 'dark' | 'system' || 'system';
  }
}

// Export default PWA manager
export default {
  PWAInstaller,
  PWACacheManager,
  PWAOfflineManager,
  PWAPushNotifications,
  PWAThemeManager
};