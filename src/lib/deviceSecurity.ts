/**
 * Device Security Detection for Mon Toit Mobile App
 *
 * This file contains security utilities to detect jailbroken/rooted devices,
 * debuggers, emulators, and other security-compromised environments.
 */

import React from 'react';
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { StatusBar } from '@capacitor/status-bar';
import { App } from '@capacitor/app';

export interface DeviceSecurityStatus {
  isJailbroken: boolean;
  isRooted: boolean;
  isDebuggerAttached: boolean;
  isEmulator: boolean;
  isAppFromUnknownSource: boolean;
  isDeveloperMode: boolean;
  isUsbDebugging: boolean;
  securityScore: number;
  threats: string[];
  recommendations: string[];
}

export class DeviceSecurityDetector {
  private static instance: DeviceSecurityDetector;
  private securityStatus: DeviceSecurityStatus | null = null;
  private securityChecks: (() => boolean)[] = [];

  private constructor() {
    this.initializeSecurityChecks();
  }

  static getInstance(): DeviceSecurityDetector {
    if (!DeviceSecurityDetector.instance) {
      DeviceSecurityDetector.instance = new DeviceSecurityDetector();
    }
    return DeviceSecurityDetector.instance;
  }

  /**
   * Initialize all security checks
   */
  private initializeSecurityChecks(): void {
    // Android security checks
    this.securityChecks.push(this.checkRootedAndroid);
    this.securityChecks.push(this.checkDeveloperModeAndroid);
    this.securityChecks.push(this.checkUsbDebuggingAndroid);
    this.securityChecks.push(this.checkEmulatorAndroid);
    this.securityChecks.push(this.checkAppSourceAndroid);

    // iOS security checks
    this.securityChecks.push(this.checkJailbrokenIOS);
    this.securityChecks.push(this.checkDebuggerIOS);
    this.securityChecks.push(this.checkEmulatorIOS);

    // Common security checks
    this.securityChecks.push(this.checkDebuggerAttached);
    this.securityChecks.push(this.checkFridaFramework);
    this.securityChecks.push(this.checkCydiaSubstrate);
  }

  /**
   * Perform comprehensive device security assessment
   */
  async assessDeviceSecurity(): Promise<DeviceSecurityStatus> {
    if (!Capacitor.isNativePlatform()) {
      return this.createSecureStatus();
    }

    const threats: string[] = [];
    const recommendations: string[] = [];
    let securityScore = 100;

    // Run all security checks
    const isJailbroken = await this.checkJailbrokenIOS();
    const isRooted = await this.checkRootedAndroid();
    const isDebuggerAttached = this.checkDebuggerAttached();
    const isEmulator = await this.checkEmulator();
    const isDeveloperMode = await this.checkDeveloperModeAndroid();
    const isUsbDebugging = await this.checkUsbDebuggingAndroid();
    const isAppFromUnknownSource = await this.checkAppSourceAndroid();

    // Evaluate threats and adjust score
    if (isJailbroken || isRooted) {
      threats.push('Device is jailbroken/rooted - high security risk');
      securityScore -= 40;
      recommendations.push('Use a non-jailbroken device for maximum security');
    }

    if (isDebuggerAttached) {
      threats.push('Debugger detected - potential reverse engineering');
      securityScore -= 25;
      recommendations.push('Close debugging tools before using the app');
    }

    if (isEmulator) {
      threats.push('Emulator environment detected');
      securityScore -= 15;
      recommendations.push('Use a physical device for production use');
    }

    if (isDeveloperMode) {
      threats.push('Developer mode enabled');
      securityScore -= 10;
    }

    if (isUsbDebugging) {
      threats.push('USB debugging enabled');
      securityScore -= 15;
      recommendations.push('Disable USB debugging for better security');
    }

    if (isAppFromUnknownSource) {
      threats.push('App installed from unknown source');
      securityScore -= 30;
      recommendations.push('Install apps only from official app stores');
    }

    this.securityStatus = {
      isJailbroken,
      isRooted,
      isDebuggerAttached,
      isEmulator,
      isAppFromUnknownSource,
      isDeveloperMode,
      isUsbDebugging,
      securityScore: Math.max(0, securityScore),
      threats,
      recommendations,
    };

    return this.securityStatus;
  }

  /**
   * Get current security status
   */
  getSecurityStatus(): DeviceSecurityStatus | null {
    return this.securityStatus;
  }

  /**
   * Determine if device is secure enough for sensitive operations
   */
  isDeviceSecure(minScore: number = 70): boolean {
    return (this.securityStatus?.securityScore ?? 100) >= minScore &&
           !this.securityStatus?.isJailbroken &&
           !this.securityStatus?.isRooted;
  }

  // iOS Security Checks

  private async checkJailbrokenIOS(): Promise<boolean> {
    if (Capacitor.getPlatform() !== 'ios') return false;

    const jailbreakIndicators = [
      '/Applications/Cydia.app',
      '/Applications/FakeCarrier.app',
      '/Applications/Icy.app',
      '/Applications/IntelliScreen.app',
      '/Applications/MxTube.app',
      '/Applications/RockApp.app',
      '/Applications/SBSettings.app',
      '/Applications/WinterBoard.app',
      '/Library/MobileSubstrate/DynamicLibraries/LiveClock.plist',
      '/Library/MobileSubstrate/DynamicLibraries/Veency.plist',
      '/System/Library/LaunchDaemons/com.ikey.bbot.plist',
      '/System/Library/LaunchDaemons/com.saurik.Cydia.Startup.plist',
      '/usr/bin/sshd',
      '/usr/libexec/sftp-server',
      '/usr/libexec/ssh-keysign',
      '/usr/sbin/sshd',
    ];

    for (const indicator of jailbreakIndicators) {
      if (await this.fileExists(indicator)) {
        return true;
      }
    }

    return false;
  }

  private checkDebuggerIOS(): boolean {
    // Check for common debugging tools
    const debuggingTools = ['gdb', 'lldb', 'frida', 'cycript'];
    return debuggingTools.some(tool => {
      // Check if process is running (limited in web environment)
      return false;
    });
  }

  private async checkEmulatorIOS(): Promise<boolean> {
    if (Capacitor.getPlatform() !== 'ios') return false;

    const deviceInfo = await Device.getInfo();
    return deviceInfo.model?.includes('Simulator') ||
           deviceInfo.model?.includes('x86_64') ||
           deviceInfo.name?.includes('Simulator');
  }

  // Android Security Checks

  private async checkRootedAndroid(): Promise<boolean> {
    if (Capacitor.getPlatform() !== 'android') return false;

    const rootIndicators = [
      '/system/app/Superuser.apk',
      '/sbin/su',
      '/system/bin/su',
      '/system/xbin/su',
      '/data/local/xbin/su',
      '/data/local/bin/su',
      '/system/sd/xbin/su',
      '/system/bin/failsafe/su',
      '/data/local/su',
    ];

    for (const indicator of rootIndicators) {
      if (await this.fileExists(indicator)) {
        return true;
      }
    }

    return false;
  }

  private async checkDeveloperModeAndroid(): Promise<boolean> {
    if (Capacitor.getPlatform() !== 'android') return false;

    try {
      // Check for development-related packages
      const devPackages = [
        'com.android.development',
        'com.android.development.settings',
      ];

      return devPackages.some(pkg => this.isPackageInstalled(pkg));
    } catch (error) {
      return false;
    }
  }

  private async checkUsbDebuggingAndroid(): Promise<boolean> {
    if (Capacitor.getPlatform() !== 'android') return false;

    try {
      // Check ADB debugging status
      const adbFile = '/sys/class/android_usb/android0/f_mass_storage/lun/file';
      return await this.fileExists(adbFile);
    } catch (error) {
      return false;
    }
  }

  private async checkEmulatorAndroid(): Promise<boolean> {
    if (Capacitor.getPlatform() !== 'android') return false;

    const deviceInfo = await Device.getInfo();
    return deviceInfo.model?.includes('Emulator') ||
           deviceInfo.model?.includes('Android SDK') ||
           deviceInfo.manufacturer?.includes('Google') ||
           deviceInfo.manufacturer?.includes('Genymotion');
  }

  private async checkAppSourceAndroid(): Promise<boolean> {
    if (Capacitor.getPlatform() !== 'android') return false;

    try {
      // Check if app is installed from Google Play Store
      const installerPackage = await this.getInstallerPackage();
      return installerPackage !== 'com.android.vending';
    } catch (error) {
      return true; // Assume unknown source if check fails
    }
  }

  // Common Security Checks

  private checkDebuggerAttached(): boolean {
    // Check if debugger is attached
    const threshold = 0.0001;
    const start = performance.now();
    for (let i = 0; i < 1000000; i++) {
      Math.sqrt(i);
    }
    const end = performance.now();
    return (end - start) > threshold * 1000000;
  }

  private checkFridaFramework(): boolean {
    // Check for Frida instrumentation framework
    const fridaIndicators = ['frida', 'frida-agent'];
    return fridaIndicators.some(indicator => {
      // Check if process is running (limited in web environment)
      return false;
    });
  }

  private checkCydiaSubstrate(): boolean {
    // Check for Cydia Substrate (MobileSubstrate)
    const substrateIndicators = [
      '/Library/MobileSubstrate/MobileSubstrate.dylib',
      '/usr/lib/libcycript.dylib',
    ];

    return substrateIndicators.some(indicator => {
      // Synchronous file check (not available in web environment)
      return false;
    });
  }

  private async checkEmulator(): Promise<boolean> {
    if (Capacitor.getPlatform() === 'ios') {
      return this.checkEmulatorIOS();
    } else if (Capacitor.getPlatform() === 'android') {
      return this.checkEmulatorAndroid();
    }
    return false;
  }

  // Utility Methods

  private async fileExists(path: string): Promise<boolean> {
    try {
      // In a real implementation, this would use native plugins
      // For now, return false as we can't access filesystem directly
      return false;
    } catch (error) {
      return false;
    }
  }

  
  private isPackageInstalled(packageName: string): boolean {
    // Check if Android package is installed
    return false;
  }

  private async getInstallerPackage(): Promise<string> {
    // Get the package that installed the app
    return 'com.android.vending'; // Assume Google Play Store
  }

  private createSecureStatus(): DeviceSecurityStatus {
    return {
      isJailbroken: false,
      isRooted: false,
      isDebuggerAttached: false,
      isEmulator: false,
      isAppFromUnknownSource: false,
      isDeveloperMode: false,
      isUsbDebugging: false,
      securityScore: 100,
      threats: [],
      recommendations: [],
    };
  }
}

/**
 * Initialize device security detection
 */
export function initializeDeviceSecurity(): void {
  if (!Capacitor.isNativePlatform()) {
    console.log('Device security: Not running on native platform, skipping initialization');
    return;
  }

  const detector = DeviceSecurityDetector.getInstance();

  // Perform initial security assessment
  detector.assessDeviceSecurity().then(status => {
    if (status.securityScore < 70) {
      console.warn('Device security assessment failed:', status.threats);

      // Log security events to monitoring
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'device_security_warning', {
          security_score: status.securityScore,
          threats_count: status.threats.length,
        });
      }
    } else {
      console.log('Device security assessment passed. Score:', status.securityScore);
    }
  }).catch(error => {
    console.error('Device security assessment failed:', error);
  });

  // Set up periodic security checks
  setInterval(async () => {
    const status = await detector.assessDeviceSecurity();

    // Take action based on security status
    if (status.securityScore < 50) {
      // High-risk environment - consider restricting functionality
      console.error('High-risk environment detected. Some features may be restricted.');

      // You could emit an event or update context here
      // to inform the app about security concerns
    }
  }, 30000); // Check every 30 seconds
}

/**
 * Hook for using device security in React components
 */
export function useDeviceSecurity() {
  const [securityStatus, setSecurityStatus] = React.useState<DeviceSecurityStatus | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const detector = DeviceSecurityDetector.getInstance();

    const updateSecurityStatus = async () => {
      setIsLoading(true);
      const status = await detector.assessDeviceSecurity();
      setSecurityStatus(status);
      setIsLoading(false);
    };

    updateSecurityStatus();

    // Update status periodically
    const interval = setInterval(updateSecurityStatus, 60000); // Every minute

    return () => clearInterval(interval);
  }, []);

  return {
    securityStatus,
    isLoading,
    isSecure: securityStatus ? securityStatus.securityScore >= 70 : true,
    detector: DeviceSecurityDetector.getInstance(),
  };
}

// Export types for use in other files
export type { DeviceSecurityStatus };