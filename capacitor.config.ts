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
      // false = la status bar reste séparée de la WebView (pas de chevauchement)
      // c'est ce qui empêchait le scroll de fonctionner naturellement quand combiné à contentInset:'always'
      overlaysWebView: false,
      style: 'DARK',
      backgroundColor: '#FFFFFF',
    },

    // Pas de plugin SplashScreen Capacitor : on utilise notre splash custom natif
    // (MainViewController.swift sur iOS, MainActivity.java sur Android) qui affiche
    // l'icône + 3 points orange animés et se cache quand la WebView a fini de charger.

    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config',
      iconColor: '#F57C00',
      sound: 'notification.wav',
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
    // 'never' = pas d'inset auto. La WebView est contrainte manuellement à la
    // safe-area dans MainViewController (constrainWebViewToSafeArea) — ça donne
    // une séparation propre entre status bar et contenu web, sans bande de
    // contenu qui dépasse derrière la barre de tâche.
    contentInset: 'never',
    limitsNavigationsToAppBoundDomains: false,
    // Fond blanc derrière la WebView (visible dans la zone safe-area top)
    backgroundColor: '#FFFFFF',
  },

  android: {
    allowMixedContent: true,
    captureInput: true,
  },
}

export default config
