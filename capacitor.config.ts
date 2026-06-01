import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.montoit.app',
  appName: 'Mon Toit',
  webDir: 'out',

  server: {
    androidScheme: 'https',
    url: 'https://mon-toit.ansut.ci',
    cleartext: true,
    errorPath: 'offline.html',
    allowNavigation: [
      'mon-toit.ansut.ci',
      'neoface.aineo.ai',
      '*.aineo.ai',
    ],
  },

  plugins: {
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK',
      backgroundColor: '#FFFFFF',
    },

    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#FFFFFF',
      showSpinner: false,
    },

    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },

    App: {
      disableBackButtonHandler: true,
    },

    Browser: {},

    InAppBrowser: {},

    Geolocation: {
      permissions: true,
    },

    Network: {},

    AppLauncher: {},
  },

  ios: {
    contentInset: 'always',
    limitsNavigationsToAppBoundDomains: false,
  },

  android: {
    allowMixedContent: true,
    captureInput: true,
  },
}

export default config