import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ci.montoit.app',
  appName: 'Mon Toit',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    // Security: Restrict navigation to app domains
    allowNavigation: [
      'https://montoit.ci',
      'https://*.supabase.co',
      'https://api.mapbox.com',
      'https://tiles.mapbox.com',
      'https://*.mapbox.com',
      'https://mon-toit.netlify.app/'
    ],
    // Cleartext is not permitted
    cleartext: false,
  },
  // iOS configuration
  ios: {
    scheme: 'montoit',
    // Build configuration
    contentInset: 'automatic',
    // WebView configuration
    scrollEnabled: true,
    // Orientation configuration
    orientation: ['portrait'],
  },
  // Android configuration
  android: {
    // Deep linking configuration
    webContentsDebuggingEnabled: false,
    // Input method configuration
    captureInput: true,
    // Log configuration
    loggingBehavior: 'production',
    // WebView configuration
    allowMixedContent: 'never',
    // Orientation configuration
    orientation: 'portrait',
  },
  plugins: {
    // SplashScreen configuration
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#667eea',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      // iOS specific
      launchFadeInDuration: 300,
    },
    // StatusBar configuration
    StatusBar: {
      style: 'dark',
      backgroundColor: '#FF8F00',
      overlaysWebView: true,
    },
    // App plugin configuration
    App: {
      appendUserAgent: ' MonToit-Secure-App/1.0',
      handleUrlOpen: true,
      allowNavigation: true,
    },
    // Keyboard plugin configuration
    Keyboard: {
      resize: 'ionic',
      style: 'dark',
      mode: 'resize',
      hideFormActionBar: false,
    },
    // Share plugin configuration
    Share: {
      enabled: true,
    },
    // Haptics plugin configuration
    Haptics: {
      enabled: true,
    },
    // Geolocation plugin configuration
    Geolocation: {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000,
    },
    // Camera plugin configuration
    Camera: {
      permissions: ['camera', 'photos'],
      resultType: 'uri',
      quality: 90,
      allowEditing: false,
      correctOrientation: true,
      saveToGallery: true,
    },
    // Filesystem plugin configuration
    Filesystem: {
      directory: 'DOCUMENTS',
      permissions: ['read', 'write'],
    },
    // Preferences plugin configuration
    Preferences: {
      group: 'montoit.storage',
    },
    // Browser plugin configuration
    Browser: {
      toolbarColor: '#667eea',
      presentationStyle: 'fullscreen',
    },
    // Network plugin configuration
    Network: {
      // Network monitoring for offline functionality
    },
    // Device plugin configuration
    Device: {
      // Device information access
    },
    // Push Notifications (when Firebase is configured)
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
