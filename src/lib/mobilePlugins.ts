/**
 * Mobile Plugins Configuration and Verification
 *
 * This file verifies that all required Capacitor plugins are installed
 * and provides proper error handling for missing plugins.
 */

import React from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Haptics } from '@capacitor/haptics';
import { Keyboard } from '@capacitor/keyboard';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar } from '@capacitor/status-bar';
import { Share } from '@capacitor/share';
import { Device } from '@capacitor/device';
import { Network } from '@capacitor/network';
import { PushNotifications } from '@capacitor/push-notifications';
import { Filesystem } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Browser } from '@capacitor/browser';

export interface PluginStatus {
  name: string;
  installed: boolean;
  available: boolean;
  version?: string;
  error?: string;
}

export interface MobilePluginReport {
  corePlugins: PluginStatus[];
  communityPlugins: PluginStatus[];
  missingPlugins: string[];
  availablePlugins: string[];
  platform: string;
  isNative: boolean;
}

/**
 * Required plugins for Mon Toit mobile app
 */
const REQUIRED_PLUGINS = {
  core: [
    'App',
    'Camera',
    'Geolocation',
    'Haptics',
    'Keyboard',
    'SplashScreen',
    'StatusBar',
    'Share',
    'Device',
    'Network',
  ],
  community: [
    'PushNotifications',
    'Filesystem',
    'Storage',
    'Preferences',
    'Browser',
    'Modals',
    'Toast',
  ],
};

/**
 * Optional plugins for enhanced functionality
 */
const OPTIONAL_PLUGINS = [
  'BackgroundTask',
  'Clipboard',
  'Dialogs',
  'LocalNotifications',
  'Media',
  'Photos',
  'ScreenReader',
  'TextZoom',
];

/**
 * Check if a plugin is available
 */
async function checkPluginAvailability(pluginName: string): Promise<PluginStatus> {
  try {
    // Check if plugin is registered with Capacitor
    const plugin = (window as any).Capacitor?.Plugins?.[pluginName];

    if (!plugin) {
      return {
        name: pluginName,
        installed: false,
        available: false,
        error: 'Plugin not registered with Capacitor',
      };
    }

    // Try to call a basic method to verify it's working
    // Different plugins have different methods to test
    let testMethod = '';
    switch (pluginName) {
      case 'App':
        testMethod = 'getState';
        break;
      case 'Device':
        testMethod = 'getInfo';
        break;
      case 'Network':
        testMethod = 'getStatus';
        break;
      case 'StatusBar':
        testMethod = 'getStyle';
        break;
      case 'Keyboard':
        testMethod = 'getAccessoryInfo';
        break;
      default:
        // For plugins without a simple test method, just check if it exists
        return {
          name: pluginName,
          installed: true,
          available: true,
        };
    }

    if (plugin[testMethod]) {
      return {
        name: pluginName,
        installed: true,
        available: true,
      };
    } else {
      return {
        name: pluginName,
        installed: true,
        available: false,
        error: `Plugin exists but method ${testMethod} not available`,
      };
    }

  } catch (error) {
    return {
      name: pluginName,
      installed: false,
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate mobile plugin report
 */
export async function generateMobilePluginReport(): Promise<MobilePluginReport> {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();

  const corePluginStatuses: PluginStatus[] = [];
  const communityPluginStatuses: PluginStatus[] = [];

  // Check core plugins
  for (const pluginName of REQUIRED_PLUGINS.core) {
    const status = await checkPluginAvailability(pluginName);
    corePluginStatuses.push(status);
  }

  // Check community plugins
  for (const pluginName of REQUIRED_PLUGINS.community) {
    const status = await checkPluginAvailability(pluginName);
    communityPluginStatuses.push(status);
  }

  // Check optional plugins
  const optionalPluginStatuses: PluginStatus[] = [];
  for (const pluginName of OPTIONAL_PLUGINS) {
    const status = await checkPluginAvailability(pluginName);
    optionalPluginStatuses.push(status);
  }

  const allPlugins = [...corePluginStatuses, ...communityPluginStatuses, ...optionalPluginStatuses];
  const missingPlugins = allPlugins.filter(p => !p.installed).map(p => p.name);
  const availablePlugins = allPlugins.filter(p => p.available).map(p => p.name);

  return {
    corePlugins: corePluginStatuses,
    communityPlugins: communityPluginStatuses,
    missingPlugins,
    availablePlugins,
    platform,
    isNative,
  };
}

/**
 * Log plugin report to console
 */
export async function logPluginReport(): Promise<void> {
  const report = await generateMobilePluginReport();

  console.group('📱 Capacitor Plugin Report');
  console.log('Platform:', report.platform);
  console.log('Native Platform:', report.isNative);

  console.group('✅ Available Core Plugins');
  report.corePlugins
    .filter(p => p.available)
    .forEach(p => console.log(`✓ ${p.name}`));
  console.groupEnd();

  if (report.corePlugins.some(p => !p.available)) {
    console.group('❌ Missing Core Plugins');
    report.corePlugins
      .filter(p => !p.available)
      .forEach(p => console.log(`✗ ${p.name}: ${p.error}`));
    console.groupEnd();
  }

  console.group('✅ Available Community Plugins');
  report.communityPlugins
    .filter(p => p.available)
    .forEach(p => console.log(`✓ ${p.name}`));
  console.groupEnd();

  if (report.communityPlugins.some(p => !p.available)) {
    console.group('❌ Missing Community Plugins');
    report.communityPlugins
      .filter(p => !p.available)
      .forEach(p => console.log(`✗ ${p.name}: ${p.error}`));
    console.groupEnd();
  }

  console.log('Total Available Plugins:', report.availablePlugins.length);
  console.log('Total Missing Plugins:', report.missingPlugins.length);
  console.groupEnd();

  // Log warnings for critical missing plugins
  const criticalMissing = ['App', 'Device', 'Network'].filter(
    name => !report.corePlugins.find(p => p.name === name)?.available
  );

  if (criticalMissing.length > 0) {
    console.warn('⚠️ Critical plugins missing:', criticalMissing.join(', '));
  }
}

/**
 * Initialize essential mobile plugins
 */
export async function initializeMobilePlugins(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    console.log('📱 Not running on native platform, skipping plugin initialization');
    return;
  }

  try {
    // Initialize StatusBar
    await StatusBar.setStyle({ style: 'dark' });
    await StatusBar.setBackgroundColor({ color: '#FF8F00' });

    // Hide splash screen
    await SplashScreen.hide();

    console.log('✅ Mobile plugins initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize mobile plugins:', error);
  }
}

/**
 * Get plugin installation commands
 */
export function getPluginInstallationCommands(): string[] {
  return [
    // Core plugins (should be installed by default)
    '# Core Capacitor plugins',
    'npm install @capacitor/app @capacitor/core @capacitor/cli',
    'npm install @capacitor/android @capacitor/ios',

    '# Feature-specific plugins',
    'npm install @capacitor/camera @capacitor/geolocation @capacitor/haptics',
    'npm install @capacitor/keyboard @capacitor/splash-screen @capacitor/status-bar',
    'npm install @capacitor/share @capacitor/device @capacitor/network',

    '# Optional plugins for enhanced functionality',
    'npm install @capacitor/push-notifications @capacitor/filesystem',
    'npm install @capacitor/preferences @capacitor/browser @capacitor/dialogs',

    '# Sync with native platforms',
    'npx cap sync',
  ];
}

/**
 * Check if plugin requires additional setup
 */
export function getPluginSetupInstructions(pluginName: string): string[] {
  const setupInstructions: Record<string, string[]> = {
    'Camera': [
      'Add camera permissions to AndroidManifest.xml:',
      '<uses-permission android:name="android.permission.CAMERA" />',
      '<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />',
      '',
      'Add camera permissions to Info.plist:',
      '<key>NSCameraUsageDescription</key>',
      '<string>This app needs camera access to take photos</string>',
    ],
    'Geolocation': [
      'Add location permissions to AndroidManifest.xml:',
      '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />',
      '<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />',
      '',
      'Add location permissions to Info.plist:',
      '<key>NSLocationWhenInUseUsageDescription</key>',
      '<string>This app needs location access to show properties on map</string>',
    ],
    'PushNotifications': [
      'Add push notification permissions to Info.plist:',
      '<key>NSUserNotificationAlertStyle</key>',
      '<string>alert</string>',
      '',
      'Configure Firebase for push notifications:',
      '1. Create Firebase project',
      '2. Download GoogleService-Info.plist (iOS) and google-services.json (Android)',
      '3. Add to your native projects',
    ],
    'Share': [
      'Add export intent filter to AndroidManifest.xml:',
      '<intent-filter>',
      '  <action android:name="android.intent.action.SEND" />',
      '  <category android:name="android.intent.category.DEFAULT" />',
      '  <data android:mimeType="text/plain" />',
      '</intent-filter>',
    ],
  };

  return setupInstructions[pluginName] || [
    `No special setup instructions available for ${pluginName}`,
  ];
}

/**
 * Plugin verification hook
 */
export function usePluginVerification() {
  const [pluginReport, setPluginReport] = React.useState<MobilePluginReport | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const verifyPlugins = async () => {
      setIsLoading(true);
      const report = await generateMobilePluginReport();
      setPluginReport(report);
      setIsLoading(false);
    };

    verifyPlugins();
  }, []);

  const refreshReport = React.useCallback(async () => {
    setIsLoading(true);
    const report = await generateMobilePluginReport();
    setPluginReport(report);
    setIsLoading(false);
  }, []);

  return {
    pluginReport,
    isLoading,
    refreshReport,
    isReady: pluginReport?.missingPlugins.length === 0,
  };
}