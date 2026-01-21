import { useEffect, useCallback, useState } from 'react';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

interface AppState {
  isActive: boolean;
  lastActiveTime: number | null;
}

export function useAppLifecycle() {
  const [appState, setAppState] = useState<AppState>({
    isActive: true,
    lastActiveTime: null,
  });
  const [deepLinkUrl, setDeepLinkUrl] = useState<string | null>(null);

  const isNative = Capacitor.isNativePlatform();

  const exitApp = useCallback(async () => {
    if (isNative) {
      await App.exitApp();
    }
  }, [isNative]);

  const getAppInfo = useCallback(async () => {
    if (!isNative) {
      return {
        name: 'Mon Toit',
        id: 'app.lovable.4d8f59374e734af7a740286b13067a1d',
        build: '1',
        version: '1.0.0',
      };
    }

    const info = await App.getInfo();
    return info;
  }, [isNative]);

  const getLaunchUrl = useCallback(async () => {
    if (!isNative) return null;

    const launchUrl = await App.getLaunchUrl();
    return launchUrl?.url ?? null;
  }, [isNative]);

  useEffect(() => {
    if (!isNative) return;

    // App state change listener
    const stateListener = App.addListener('appStateChange', ({ isActive }) => {
      setAppState({
        isActive,
        lastActiveTime: isActive ? null : Date.now(),
      });
    });

    // Deep link listener
    const urlListener = App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      setDeepLinkUrl(event.url);

      // Handle deep link navigation
      const url = new URL(event.url);
      const path = url.pathname;

      // Navigate to the path (you may want to use your router here)
      if (path && path !== '/') {
        window.location.href = path;
      }
    });

    // Back button listener (Android)
    const backButtonListener = App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        // Optionally minimize or exit app
        App.minimizeApp();
      }
    });

    // Check for launch URL on startup
    getLaunchUrl().then((url) => {
      if (url) setDeepLinkUrl(url);
    });

    return () => {
      stateListener.then((l) => l.remove());
      urlListener.then((l) => l.remove());
      backButtonListener.then((l) => l.remove());
    };
  }, [isNative, getLaunchUrl]);

  return {
    isNative,
    isActive: appState.isActive,
    lastActiveTime: appState.lastActiveTime,
    deepLinkUrl,
    exitApp,
    getAppInfo,
    getLaunchUrl,
  };
}
