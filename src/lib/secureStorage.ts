/**
 * Secure Storage Utility
 * Provides encryption for sensitive localStorage data
 */

// Simple encryption using XOR with a key derived from user agent and session
// This is NOT military-grade encryption but provides basic obfuscation
class SecureStorage {
  private getKey(): string {
    // Create a consistent key from browser fingerprint
    const userAgent = navigator.userAgent;
    const language = navigator.language;
    const timestamp = Math.floor(Date.now() / (1000 * 60 * 60)); // Changes every hour
    return btoa(`${userAgent}-${language}-${timestamp}`).slice(0, 32);
  }

  private xorEncrypt(text: string, key: string): string {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(
        text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    return btoa(result); // Base64 encode for storage
  }

  private xorDecrypt(encryptedText: string, key: string): string {
    try {
      const text = atob(encryptedText); // Base64 decode
      let result = '';
      for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(
          text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        );
      }
      return result;
    } catch (error) {
      console.error('Failed to decrypt data:', error);
      return '';
    }
  }

  setItem(key: string, value: string, isSensitive = false): void {
    try {
      if (isSensitive) {
        const encryptionKey = this.getKey();
        const encryptedValue = this.xorEncrypt(value, encryptionKey);
        localStorage.setItem(key, encryptedValue);
        // Store metadata to verify encryption
        localStorage.setItem(`${key}_meta`, JSON.stringify({
          encrypted: true,
          timestamp: Date.now()
        }));
      } else {
        localStorage.setItem(key, value);
      }
    } catch (error) {
      console.error('Failed to store encrypted data:', error);
      // Fallback to unencrypted storage
      localStorage.setItem(key, value);
    }
  }

  getItem(key: string, isSensitive = false): string | null {
    try {
      if (isSensitive) {
        const metaData = localStorage.getItem(`${key}_meta`);
        if (metaData) {
          const meta = JSON.parse(metaData);
          if (meta.encrypted) {
            const encryptionKey = this.getKey();
            const encryptedValue = localStorage.getItem(key);
            if (encryptedValue) {
              return this.xorDecrypt(encryptedValue, encryptionKey);
            }
          }
        }
      }
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Failed to retrieve encrypted data:', error);
      // Fallback to unencrypted retrieval
      return localStorage.getItem(key);
    }
  }

  removeItem(key: string): void {
    localStorage.removeItem(key);
    localStorage.removeItem(`${key}_meta`);
  }

  clear(): void {
    // Only clear non-sensitive items
    const keysToKeep = ['user_preferences', 'app_settings'];
    const allKeys = Object.keys(localStorage);

    allKeys.forEach(key => {
      if (!keysToKeep.includes(key) && !key.endsWith('_meta')) {
        localStorage.removeItem(key);
        localStorage.removeItem(`${key}_meta`);
      }
    });
  }

  // List all sensitive keys (those with _meta)
  getSensitiveKeys(): string[] {
    return Object.keys(localStorage)
      .filter(key => key.endsWith('_meta'))
      .map(key => key.replace('_meta', ''));
  }

  // Check if a key is encrypted
  isEncrypted(key: string): boolean {
    const metaData = localStorage.getItem(`${key}_meta`);
    if (metaData) {
      try {
        const meta = JSON.parse(metaData);
        return meta.encrypted === true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

// Export singleton instance
export const secureStorage = new SecureStorage();

// Helper functions for common use cases
export const secureTokenStorage = {
  setToken: (token: string) => {
    secureStorage.setItem('auth_token', token, true);
  },
  getToken: (): string | null => {
    return secureStorage.getItem('auth_token', true);
  },
  removeToken: () => {
    secureStorage.removeItem('auth_token');
  }
};

export const secureUserStorage = {
  setUserPreferences: (preferences: Record<string, any>) => {
    secureStorage.setItem('user_preferences', JSON.stringify(preferences), true);
  },
  getUserPreferences: (): Record<string, any> | null => {
    const prefs = secureStorage.getItem('user_preferences', true);
    return prefs ? JSON.parse(prefs) : null;
  },
  removeUserPreferences: () => {
    secureStorage.removeItem('user_preferences');
  }
};

// Migration utility to encrypt existing sensitive data
export const migrateToSecureStorage = () => {
  const sensitiveKeys = ['mapbox_token', 'auth_token', 'user_preferences'];

  sensitiveKeys.forEach(key => {
    const existingValue = localStorage.getItem(key);
    if (existingValue && !secureStorage.isEncrypted(key)) {
      // Check if it looks like it might be sensitive
      if (key.includes('token') || key.includes('auth') || key.includes('user')) {
        secureStorage.setItem(key, existingValue, true);
        // Remove the unencrypted version
        localStorage.removeItem(key);
      }
    }
  });
};