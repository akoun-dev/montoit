import { useCallback } from 'react';
import { Share, ShareOptions, ShareResult } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

interface SharePropertyOptions {
  propertyId: string;
  title: string;
  description?: string;
  imageUrl?: string;
}

export function useNativeShare() {
  const isNative = Capacitor.isNativePlatform();

  const canShare = useCallback(async (): Promise<boolean> => {
    if (!isNative) {
      // Check Web Share API support
      return !!navigator.share;
    }

    const result = await Share.canShare();
    return result.value;
  }, [isNative]);

  const share = useCallback(
    async (options: ShareOptions): Promise<ShareResult | null> => {
      try {
        if (!isNative && navigator.share) {
          // Web Share API fallback
          await navigator.share({
            title: options.title,
            text: options.text,
            url: options.url,
          });
          return { activityType: 'web-share' };
        }

        const result = await Share.share(options);
        return result;
      } catch (err) {
        // User cancelled or error
        console.error('Share error:', err);
        return null;
      }
    },
    [isNative]
  );

  const shareProperty = useCallback(
    async (options: SharePropertyOptions): Promise<ShareResult | null> => {
      const baseUrl = window.location.origin;
      const propertyUrl = `${baseUrl}/propriete/${options.propertyId}`;

      const shareText = options.description
        ? `${options.title}\n\n${options.description}`
        : options.title;

      return share({
        title: options.title,
        text: shareText,
        url: propertyUrl,
        dialogTitle: 'Partager cette propriété',
      });
    },
    [share]
  );

  const shareViaWhatsApp = useCallback(
    async (text: string, url?: string) => {
      const message = url ? `${text}\n${url}` : text;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

      if (isNative) {
        window.open(whatsappUrl, '_system');
      } else {
        window.open(whatsappUrl, '_blank');
      }
    },
    [isNative]
  );

  return {
    isNative,
    canShare,
    share,
    shareProperty,
    shareViaWhatsApp,
  };
}
