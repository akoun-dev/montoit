import type { CapacitorConfig } from '@capacitor/cli';

// Détection de l'environnement de production
const isProduction = process.env.NODE_ENV === 'production';

const config: CapacitorConfig = {
  appId: 'ci.montoit.app',
  appName: 'Mon Toit',
  webDir: 'dist',
  // Configuration serveur uniquement en développement
  server: {
    url: 'https://mon-toit.ansut.ci',
    cleartext: false,
    allowNavigation: ['mon-toit.ansut.ci']
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      backgroundColor: '#ffffff',
      // Android
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      // iOS
      iosSplashResourceName: 'Splash',
      showSpinner: true,
      spinnerColor: '#ea580c'
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
      style: 'light' // iOS: light keyboard style
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#ffffff',
      overlaysWebView: false // iOS: don't overlay content
    },
    // Camera pour photos de propriétés, profil et vérification
    Camera: {
      permissions: ['camera', 'photos']
    },
    // Géolocalisation pour la carte et recherche proximité
    Geolocation: {
      permissions: ['location', 'coarseLocation']
    },
    // Stockage pour sauvegarder les photos localement
    Filesystem: {
      permissions: ['write', 'read']
    }
  },

  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: !isProduction
  },

  ios: {
    contentInset: 'automatic',
    scrollEnabled: true
  }
};

export default config;
