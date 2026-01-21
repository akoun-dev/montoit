import { useCallback } from 'react';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

export function useNativeStorage() {
  const isNative = Capacitor.isNativePlatform();

  const setItem = useCallback(
    async (key: string, value: unknown): Promise<void> => {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

      if (isNative) {
        await Preferences.set({ key, value: stringValue });
      } else {
        localStorage.setItem(key, stringValue);
      }
    },
    [isNative]
  );

  const getItem = useCallback(
    async <T = string>(key: string): Promise<T | null> => {
      try {
        let value: string | null;

        if (isNative) {
          const result = await Preferences.get({ key });
          value = result.value;
        } else {
          value = localStorage.getItem(key);
        }

        if (value === null) return null;

        // Try to parse as JSON, otherwise return as string
        try {
          return JSON.parse(value) as T;
        } catch {
          return value as unknown as T;
        }
      } catch {
        return null;
      }
    },
    [isNative]
  );

  const removeItem = useCallback(
    async (key: string): Promise<void> => {
      if (isNative) {
        await Preferences.remove({ key });
      } else {
        localStorage.removeItem(key);
      }
    },
    [isNative]
  );

  const clear = useCallback(async (): Promise<void> => {
    if (isNative) {
      await Preferences.clear();
    } else {
      localStorage.clear();
    }
  }, [isNative]);

  const keys = useCallback(async (): Promise<string[]> => {
    if (isNative) {
      const result = await Preferences.keys();
      return result.keys;
    } else {
      return Object.keys(localStorage);
    }
  }, [isNative]);

  return {
    isNative,
    setItem,
    getItem,
    removeItem,
    clear,
    keys,
  };
}
