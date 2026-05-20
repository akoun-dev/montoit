import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.montoit.app',
  appName: 'Mon Toit',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    url: 'https://mon-toit.ansut.ci',
    cleartext: true,
    allowNavigation: [
      'neoface.aineo.ai',
      'mon-toit.ansut.ci',
    ],
  },
  plugins: {
    InAppBrowser: {
      // Permet l'ouverture de l'URL NeoFace pour le selfie KYC
    },
    Camera: {
      permissions: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    App: {
      // Désactive le handler retour par défaut — géré par AppBackHandler
      disableBackButtonHandler: true,
    },
    Browser: {
      // Ouverture d'URLs externes (liens, documents, etc.)
    },
    Geolocation: {
      permissions: true,
    },
    Network: {
      // Détection de la connectivité réseau
    },
    AppLauncher: {
      // Lancement d'autres applications depuis Mon Toit
    },
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
}

export default config
