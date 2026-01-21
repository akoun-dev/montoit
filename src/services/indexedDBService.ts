/**
 * Service IndexedDB pour stockage offline
 * Gère favoris, recherches récentes et cache de données
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

const DB_NAME = 'montoit-offline-db';
const DB_VERSION = 1;

interface MontoitDB extends DBSchema {
  favorites: {
    key: string;
    value: {
      id: string;
      propertyData: any;
      addedAt: number;
      syncStatus: 'synced' | 'pending' | 'error';
    };
    indexes: { 'by-sync-status': string };
  };
  searchHistory: {
    key: number;
    value: {
      id: number;
      query: string;
      filters: any;
      location?: { lat: number; lng: number };
      timestamp: number;
    };
    indexes: { 'by-timestamp': number };
  };
  syncQueue: {
    key: number;
    value: {
      id: number;
      action: 'favorite_add' | 'favorite_remove' | 'property_view' | 'contact_submit';
      data: any;
      timestamp: number;
      retryCount: number;
      status: 'pending' | 'processing' | 'failed';
    };
    indexes: { 'by-status': string };
  };
  propertyCache: {
    key: string;
    value: {
      id: string;
      data: any;
      cachedAt: number;
      expiresAt: number;
    };
    indexes: { 'by-expires': number };
  };
}

class IndexedDBService {
  private db: IDBPDatabase<MontoitDB> | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<MontoitDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Store favoris
        if (!db.objectStoreNames.contains('favorites')) {
          const favStore = db.createObjectStore('favorites', { keyPath: 'id' });
          favStore.createIndex('by-sync-status', 'syncStatus');
        }

        // Store historique recherches
        if (!db.objectStoreNames.contains('searchHistory')) {
          const searchStore = db.createObjectStore('searchHistory', {
            keyPath: 'id',
            autoIncrement: true,
          });
          searchStore.createIndex('by-timestamp', 'timestamp');
        }

        // Store queue synchronisation
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', {
            keyPath: 'id',
            autoIncrement: true,
          });
          syncStore.createIndex('by-status', 'status');
        }

        // Store cache propriétés
        if (!db.objectStoreNames.contains('propertyCache')) {
          const cacheStore = db.createObjectStore('propertyCache', { keyPath: 'id' });
          cacheStore.createIndex('by-expires', 'expiresAt');
        }
      },
    });
  }

  // === FAVORIS ===

  async addFavorite(propertyId: string, propertyData: any): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    await this.db.put('favorites', {
      id: propertyId,
      propertyData,
      addedAt: Date.now(),
      syncStatus: 'pending',
    });

    // Ajouter à la queue de sync
    await this.addToSyncQueue('favorite_add', { propertyId });
  }

  async removeFavorite(propertyId: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    await this.db.delete('favorites', propertyId);

    // Ajouter à la queue de sync
    await this.addToSyncQueue('favorite_remove', { propertyId });
  }

  async getFavorites(): Promise<any[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const favorites = await this.db.getAll('favorites');
    return favorites.map((f) => f.propertyData);
  }

  async updateFavoriteStatus(
    propertyId: string,
    status: 'synced' | 'pending' | 'error'
  ): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const favorite = await this.db.get('favorites', propertyId);
    if (favorite) {
      favorite.syncStatus = status;
      await this.db.put('favorites', favorite);
    }
  }

  async getPendingFavorites(): Promise<string[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const pending = await this.db.getAllFromIndex('favorites', 'by-sync-status', 'pending');
    return pending.map((f) => f.id);
  }

  // === HISTORIQUE RECHERCHES ===

  async addSearchHistory(
    query: string,
    filters: any,
    location?: { lat: number; lng: number }
  ): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    await this.db.add('searchHistory', {
      id: Date.now(),
      query,
      filters,
      location,
      timestamp: Date.now(),
    });

    // Limiter à 50 recherches
    const all = await this.db.getAll('searchHistory');
    if (all.length > 50) {
      const sorted = all.sort((a, b) => b.timestamp - a.timestamp);
      const toDelete = sorted.slice(50);
      for (const item of toDelete) {
        await this.db.delete('searchHistory', item.id);
      }
    }
  }

  async getSearchHistory(limit = 20): Promise<any[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const all = await this.db.getAll('searchHistory');
    return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  }

  async clearSearchHistory(): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    await this.db.clear('searchHistory');
  }

  // === QUEUE SYNCHRONISATION ===

  async addToSyncQueue(action: string, data: any): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    await this.db.add('syncQueue', {
      id: Date.now(),
      action: action as any,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
    });
  }

  async getSyncQueue(): Promise<any[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return await this.db.getAllFromIndex('syncQueue', 'by-status', 'pending');
  }

  async updateSyncQueueItem(
    id: number,
    status: 'pending' | 'processing' | 'failed',
    retryCount?: number
  ): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const item = await this.db.get('syncQueue', id);
    if (item) {
      item.status = status;
      if (retryCount !== undefined) {
        item.retryCount = retryCount;
      }
      await this.db.put('syncQueue', item);
    }
  }

  async removeSyncQueueItem(id: number): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    await this.db.delete('syncQueue', id);
  }

  async clearSyncQueue(): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    await this.db.clear('syncQueue');
  }

  // === CACHE PROPRIÉTÉS ===

  async cacheProperty(propertyId: string, data: any, ttlMinutes = 30): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const now = Date.now();
    await this.db.put('propertyCache', {
      id: propertyId,
      data,
      cachedAt: now,
      expiresAt: now + ttlMinutes * 60 * 1000,
    });
  }

  async getCachedProperty(propertyId: string): Promise<any | null> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const cached = await this.db.get('propertyCache', propertyId);
    if (!cached) return null;

    // Vérifier expiration
    if (Date.now() > cached.expiresAt) {
      await this.db.delete('propertyCache', propertyId);
      return null;
    }

    return cached.data;
  }

  async clearExpiredCache(): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const all = await this.db.getAll('propertyCache');
    const now = Date.now();

    for (const item of all) {
      if (item.expiresAt < now) {
        await this.db.delete('propertyCache', item.id);
      }
    }
  }

  async clearAllCache(): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    await this.db.clear('propertyCache');
  }

  // === STATISTIQUES ===

  async getStats(): Promise<{
    favoritesCount: number;
    searchHistoryCount: number;
    syncQueueCount: number;
    cacheCount: number;
    lastSync?: number;
  }> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const favorites = await this.db.getAll('favorites');
    const searchHistory = await this.db.getAll('searchHistory');
    const syncQueue = await this.db.getAll('syncQueue');
    const cache = await this.db.getAll('propertyCache');

    return {
      favoritesCount: favorites.length,
      searchHistoryCount: searchHistory.length,
      syncQueueCount: syncQueue.length,
      cacheCount: cache.length,
      lastSync: favorites.length > 0 ? Math.max(...favorites.map((f) => f.addedAt)) : undefined,
    };
  }
}

export const indexedDBService = new IndexedDBService();
export default indexedDBService;
