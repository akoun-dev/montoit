/**
 * Service de cache localStorage avec TTL et gestion de taille
 */

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
}

interface CacheStats {
  totalSize: number;
  itemCount: number;
  hitRate: number;
  hits: number;
  misses: number;
}

class CacheService {
  private prefix = 'montoit_cache_';
  private maxSize = 5 * 1024 * 1024; // 5MB
  private stats = {
    hits: 0,
    misses: 0,
  };

  /**
   * Sauvegarde une donnée dans le cache
   */
  set<T>(key: string, data: T, ttlMinutes: number = 60): boolean {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttlMinutes * 60 * 1000,
        accessCount: 0,
        lastAccessed: Date.now(),
        size: this.calculateSize(data),
      };

      const serialized = JSON.stringify(entry);

      // Vérifier la taille
      if (serialized.length > this.maxSize) {
        console.warn(`Cache entry too large: ${key} (${this.formatBytes(serialized.length)})`);
        return false;
      }

      // Éviction si nécessaire
      if (!this.hasSpace(serialized.length)) {
        this.evictOldest();
      }

      localStorage.setItem(this.prefix + key, serialized);
      return true;
    } catch (error) {
      console.error('Error setting cache:', error);

      // Si localStorage est plein, tenter un nettoyage
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.clear();
        try {
          localStorage.setItem(
            this.prefix + key,
            JSON.stringify({
              data,
              timestamp: Date.now(),
              expiresAt: Date.now() + ttlMinutes * 60 * 1000,
              accessCount: 0,
              lastAccessed: Date.now(),
              size: this.calculateSize(data),
            })
          );
          return true;
        } catch {
          return false;
        }
      }

      return false;
    }
  }

  /**
   * Récupère une donnée du cache
   */
  get<T>(key: string): T | null {
    try {
      const serialized = localStorage.getItem(this.prefix + key);

      if (!serialized) {
        this.stats.misses++;
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(serialized);

      // Vérifier l'expiration
      if (Date.now() > entry.expiresAt) {
        this.remove(key);
        this.stats.misses++;
        return null;
      }

      // Mettre à jour les stats d'accès
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      localStorage.setItem(this.prefix + key, JSON.stringify(entry));

      this.stats.hits++;
      return entry.data;
    } catch (error) {
      console.error('Error getting cache:', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Vérifie si une clé existe et n'est pas expirée
   */
  has(key: string): boolean {
    const data = this.get(key);
    return data !== null;
  }

  /**
   * Supprime une entrée du cache
   */
  remove(key: string): void {
    localStorage.removeItem(this.prefix + key);
  }

  /**
   * Vide tout le cache
   */
  clear(): void {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Nettoie les entrées expirées
   */
  cleanup(): number {
    let cleaned = 0;
    const keys = Object.keys(localStorage);

    keys.forEach((key) => {
      if (key.startsWith(this.prefix)) {
        try {
          const serialized = localStorage.getItem(key);
          if (serialized) {
            const entry: CacheEntry = JSON.parse(serialized);
            if (Date.now() > entry.expiresAt) {
              localStorage.removeItem(key);
              cleaned++;
            }
          }
        } catch {
          // Entrée corrompue, la supprimer
          localStorage.removeItem(key);
          cleaned++;
        }
      }
    });

    return cleaned;
  }

  /**
   * Calcule la taille approximative d'un objet
   */
  private calculateSize(obj: unknown): number {
    return new Blob([JSON.stringify(obj)]).size;
  }

  /**
   * Vérifie s'il y a assez d'espace
   */
  private hasSpace(requiredSize: number): boolean {
    const stats = this.getStats();
    return stats.totalSize + requiredSize < this.maxSize;
  }

  /**
   * Éviction LRU : supprime l'entrée la moins récemment utilisée
   */
  private evictOldest(): void {
    const keys = Object.keys(localStorage);
    const entries: Array<{ key: string; entry: CacheEntry }> = [];

    keys.forEach((key) => {
      if (key.startsWith(this.prefix)) {
        try {
          const serialized = localStorage.getItem(key);
          if (serialized) {
            const entry: CacheEntry = JSON.parse(serialized);
            entries.push({ key, entry });
          }
        } catch {
          // Ignorer les entrées corrompues
        }
      }
    });

    // Trier par lastAccessed (le plus ancien en premier)
    entries.sort((a, b) => a.entry.lastAccessed - b.entry.lastAccessed);

    // Supprimer les 10% les plus anciens
    const toRemove = Math.ceil(entries.length * 0.1);
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      const entry = entries[i];
      if (entry?.key) {
        localStorage.removeItem(entry.key);
      }
    }
  }

  /**
   * Obtient les statistiques du cache
   */
  getStats(): CacheStats {
    const keys = Object.keys(localStorage);
    let totalSize = 0;
    let itemCount = 0;

    keys.forEach((key) => {
      if (key.startsWith(this.prefix)) {
        const serialized = localStorage.getItem(key);
        if (serialized) {
          totalSize += serialized.length;
          itemCount++;
        }
      }
    });

    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;

    return {
      totalSize,
      itemCount,
      hitRate,
      hits: this.stats.hits,
      misses: this.stats.misses,
    };
  }

  /**
   * Formate les bytes en format lisible
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Affiche les statistiques dans la console
   */
  logStats(): void {
    if (!import.meta.env.DEV) return;
    const stats = this.getStats();
    console.log('📊 Cache Statistics:');
    console.log(`   Items: ${stats.itemCount}`);
    console.log(
      `   Size: ${this.formatBytes(stats.totalSize)} / ${this.formatBytes(this.maxSize)}`
    );
    console.log(`   Hit Rate: ${stats.hitRate.toFixed(2)}%`);
    console.log(`   Hits: ${stats.hits}`);
    console.log(`   Misses: ${stats.misses}`);
  }

  /**
   * Invalide les entrées correspondant à un pattern
   */
  invalidatePattern(pattern: string): number {
    let invalidated = 0;
    const keys = Object.keys(localStorage);

    keys.forEach((key) => {
      if (key.startsWith(this.prefix) && key.includes(pattern)) {
        localStorage.removeItem(key);
        invalidated++;
      }
    });

    return invalidated;
  }
}

// Instance singleton
export const cacheService = new CacheService();

// Nettoyage automatique au chargement
cacheService.cleanup();

// Nettoyage automatique toutes les 5 minutes
if (typeof window !== 'undefined') {
  setInterval(
    () => {
      cacheService.cleanup();
    },
    5 * 60 * 1000
  );
}
