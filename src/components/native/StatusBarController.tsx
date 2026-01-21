import { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

interface StatusBarControllerProps {
  style?: 'light' | 'dark';
  backgroundColor?: string;
  overlay?: boolean;
}

export function StatusBarController({
  style = 'dark',
  backgroundColor = '#ffffff',
  overlay = false,
}: StatusBarControllerProps) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const configureStatusBar = async () => {
      try {
        await StatusBar.setStyle({
          style: style === 'light' ? Style.Light : Style.Dark,
        });

        await StatusBar.setBackgroundColor({ color: backgroundColor });

        if (overlay) {
          await StatusBar.setOverlaysWebView({ overlay: true });
        }
      } catch (err) {
        console.error('StatusBar configuration error:', err);
      }
    };

    configureStatusBar();
  }, [style, backgroundColor, overlay]);

  return null;
}

// Utility functions for imperative status bar control
export const statusBarUtils = {
  async show() {
    if (!Capacitor.isNativePlatform()) return;
    await StatusBar.show();
  },

  async hide() {
    if (!Capacitor.isNativePlatform()) return;
    await StatusBar.hide();
  },

  async setStyle(style: 'light' | 'dark') {
    if (!Capacitor.isNativePlatform()) return;
    await StatusBar.setStyle({
      style: style === 'light' ? Style.Light : Style.Dark,
    });
  },

  async setBackgroundColor(color: string) {
    if (!Capacitor.isNativePlatform()) return;
    await StatusBar.setBackgroundColor({ color });
  },
};
