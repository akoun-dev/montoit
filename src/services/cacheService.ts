interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
}

export class CacheService {
  private static cache = new Map<string, CacheItem<any>>();

  static set<T>(key: string, data: T, expiresInMinutes: number = 5): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiresIn: expiresInMinutes * 60 * 1000,
    };

    this.cache.set(key, item);
  }

  static get<T>(key: string): T | null {
    const item = this.cache.get(key) as CacheItem<T> | undefined;

    if (!item) {
      return null;
    }

    const now = Date.now();
    const isExpired = now - item.timestamp > item.expiresIn;

    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  static has(key: string): boolean {
    const item = this.cache.get(key);

    if (!item) {
      return false;
    }

    const now = Date.now();
    const isExpired = now - item.timestamp > item.expiresIn;

    if (isExpired) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  static delete(key: string): void {
    this.cache.delete(key);
  }

  static clear(): void {
    this.cache.clear();
  }

  static invalidatePattern(pattern: string): void {
    const keys = Array.from(this.cache.keys());
    const regex = new RegExp(pattern);

    keys.forEach((key) => {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    });
  }

  static getSize(): number {
    return this.cache.size;
  }

  static cleanExpired(): void {
    const now = Date.now();
    const keys = Array.from(this.cache.keys());

    keys.forEach((key) => {
      const item = this.cache.get(key);
      if (item && now - item.timestamp > item.expiresIn) {
        this.cache.delete(key);
      }
    });
  }
}

export class LocalStorageCache {
  private static prefix = 'montoit_cache_';

  static set(key: string, data: any, expiresInMinutes: number = 60): void {
    try {
      const item = {
        data,
        timestamp: Date.now(),
        expiresIn: expiresInMinutes * 60 * 1000,
      };

      localStorage.setItem(this.prefix + key, JSON.stringify(item));
    } catch (error) {
      console.error('LocalStorage cache error:', error);
    }
  }

  static get<T>(key: string): T | null {
    try {
      const itemStr = localStorage.getItem(this.prefix + key);

      if (!itemStr) {
        return null;
      }

      const item = JSON.parse(itemStr);
      const now = Date.now();
      const isExpired = now - item.timestamp > item.expiresIn;

      if (isExpired) {
        this.delete(key);
        return null;
      }

      return item.data as T;
    } catch (error) {
      console.error('LocalStorage cache error:', error);
      return null;
    }
  }

  static delete(key: string): void {
    localStorage.removeItem(this.prefix + key);
  }

  static clear(): void {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
