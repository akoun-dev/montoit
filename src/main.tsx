import React from 'react';
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from '@tanstack/react-query';
import * as Sentry from "@sentry/react";
import { queryClient } from '@/lib/queryClient';
import { initPerformanceMonitoring } from '@/lib/analytics';
import { migrateToSecureStorage, secureStorage } from '@/lib/secureStorage';
import { Capacitor } from '@capacitor/core';
import { initializeWebViewSecurity } from '@/lib/webviewSecurity';
import { initializeDeviceSecurity } from '@/lib/deviceSecurity';
import { initializeMobilePlugins, logPluginReport } from '@/lib/mobilePlugins';
import { MobileNotificationService } from '@/lib/mobileNotifications';
import { MobileFileSystemService } from '@/lib/mobileFileSystem';
import { MobileNetworkService } from '@/lib/mobileNetwork';
import App from "./App.tsx";
import "./index.css";

// Initialize secure storage migration on app startup
migrateToSecureStorage();

// Initialize WebView security for mobile apps
initializeWebViewSecurity();

// Initialize device security detection
initializeDeviceSecurity();

// Initialize and verify mobile plugins
initializeMobilePlugins();

// Initialize mobile services
initializeMobileServices();

// Log plugin report for debugging
logPluginReport();

// Initialize mobile services asynchronously
async function initializeMobileServices() {
  if (Capacitor.isNativePlatform()) {
    try {
      // Initialize notification service
      const notificationService = MobileNotificationService.getInstance();
      await notificationService.initialize();

      // Initialize file system service
      const fileSystemService = MobileFileSystemService.getInstance();
      await fileSystemService.initialize();

      // Initialize network service
      const networkService = MobileNetworkService.getInstance();
      await networkService.initialize();

      console.log('✅ All mobile services initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize mobile services:', error);
    }
  }
}

// Initialize Sentry in production
if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN || "",
    environment: import.meta.env.MODE,
    
    // Performance monitoring
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    
    // Performance traces
    tracesSampleRate: 1.0, // 100% in production
    
    // Session replays
    replaysSessionSampleRate: 0.1, // 10% of normal sessions
    replaysOnErrorSampleRate: 1.0, // 100% of error sessions
    
    // Context enrichment
    beforeSend(event, hint) {
      // Add user ID if available (using secure storage)
      const userId = secureStorage.getItem('supabase.auth.token', true);
      if (userId) {
        event.user = { ...event.user, id: userId };
      }
      
      // Filter out benign errors
      if (event.exception?.values?.[0]?.value?.includes('ResizeObserver')) {
        return null;
      }
      
      return event;
    },
    
    // Ignore specific errors
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      'ChunkLoadError',
    ],
  });

  // Initialize performance monitoring
  initPerformanceMonitoring();
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
