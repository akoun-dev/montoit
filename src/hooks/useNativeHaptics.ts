import { useCallback } from 'react';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

export function useNativeHaptics() {
  const isNative = Capacitor.isNativePlatform();

  const impact = useCallback(
    async (style: ImpactStyle = ImpactStyle.Medium) => {
      if (!isNative) return;

      try {
        await Haptics.impact({ style });
      } catch (err) {
        console.error('Haptics error:', err);
      }
    },
    [isNative]
  );

  const notification = useCallback(
    async (type: NotificationType = NotificationType.Success) => {
      if (!isNative) return;

      try {
        await Haptics.notification({ type });
      } catch (err) {
        console.error('Haptics error:', err);
      }
    },
    [isNative]
  );

  const vibrate = useCallback(
    async (duration = 300) => {
      if (!isNative) return;

      try {
        await Haptics.vibrate({ duration });
      } catch (err) {
        console.error('Haptics error:', err);
      }
    },
    [isNative]
  );

  const selectionStart = useCallback(async () => {
    if (!isNative) return;

    try {
      await Haptics.selectionStart();
    } catch (err) {
      console.error('Haptics error:', err);
    }
  }, [isNative]);

  const selectionChanged = useCallback(async () => {
    if (!isNative) return;

    try {
      await Haptics.selectionChanged();
    } catch (err) {
      console.error('Haptics error:', err);
    }
  }, [isNative]);

  const selectionEnd = useCallback(async () => {
    if (!isNative) return;

    try {
      await Haptics.selectionEnd();
    } catch (err) {
      console.error('Haptics error:', err);
    }
  }, [isNative]);

  // Convenience methods
  const lightTap = useCallback(() => impact(ImpactStyle.Light), [impact]);
  const mediumTap = useCallback(() => impact(ImpactStyle.Medium), [impact]);
  const heavyTap = useCallback(() => impact(ImpactStyle.Heavy), [impact]);

  const successFeedback = useCallback(() => notification(NotificationType.Success), [notification]);
  const warningFeedback = useCallback(() => notification(NotificationType.Warning), [notification]);
  const errorFeedback = useCallback(() => notification(NotificationType.Error), [notification]);

  return {
    isNative,
    impact,
    notification,
    vibrate,
    selectionStart,
    selectionChanged,
    selectionEnd,
    // Convenience
    lightTap,
    mediumTap,
    heavyTap,
    successFeedback,
    warningFeedback,
    errorFeedback,
  };
}
