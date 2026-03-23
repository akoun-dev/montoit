/**
 * Hook React pour la gestion des favoris
 *
 * Facilite l'utilisation du service de favoris dans les composants React
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { favoritesService } from '@/services/favorites.service';

export function useFavorites(propertyId?: string) {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);

  // Charger le statut de favori au montage et quand la propriété change
  const loadFavoriteStatus = useCallback(async () => {
    if (!user || !propertyId) return;

    try {
      const fav = await favoritesService.isFavorite(user.id, propertyId);
      setIsFavorite(fav);
    } catch (error) {
      console.error('Erreur lors du chargement du statut de favori:', error);
    }
  }, [user, propertyId]);

  const loadFavoriteCount = useCallback(async () => {
    if (!propertyId) return;

    try {
      const count = await favoritesService.getPropertyFavoritesCount(propertyId);
      setFavoriteCount(count);
    } catch (error) {
      console.error('Erreur lors du chargement du nombre de favoris:', error);
    }
  }, [propertyId]);

  useEffect(() => {
    if (user && propertyId) {
      loadFavoriteStatus();
      loadFavoriteCount();
    }
  }, [user, propertyId, loadFavoriteStatus, loadFavoriteCount]);

  const toggleFavorite = useCallback(async () => {
    if (!user) {
      throw new Error('Vous devez être connecté pour ajouter des favoris');
    }

    if (!propertyId) {
      throw new Error('ID de propriété manquant');
    }

    setLoading(true);
    try {
      const result = await favoritesService.toggleFavorite(user.id, propertyId);

      if (result.success) {
        setIsFavorite(result.isFavorite);
        // Mettre à jour le compteur
        setFavoriteCount((prev) => (result.isFavorite ? prev + 1 : Math.max(0, prev - 1)));
        return result;
      } else {
        throw new Error(result.error || 'Erreur lors de la mise à jour du favori');
      }
    } finally {
      setLoading(false);
    }
  }, [user, propertyId]);

  const addFavorite = useCallback(async () => {
    if (!user) {
      throw new Error('Vous devez être connecté pour ajouter des favoris');
    }

    if (!propertyId) {
      throw new Error('ID de propriété manquant');
    }

    setLoading(true);
    try {
      const result = await favoritesService.addFavorite(user.id, propertyId);

      if (result.success) {
        setIsFavorite(true);
        setFavoriteCount((prev) => prev + 1);
      }

      return result;
    } finally {
      setLoading(false);
    }
  }, [user, propertyId]);

  const removeFavorite = useCallback(async () => {
    if (!user) {
      throw new Error('Vous devez être connecté pour gérer les favoris');
    }

    if (!propertyId) {
      throw new Error('ID de propriété manquant');
    }

    setLoading(true);
    try {
      const result = await favoritesService.removeFavorite(user.id, propertyId);

      if (result.success) {
        setIsFavorite(false);
        setFavoriteCount((prev) => Math.max(0, prev - 1));
      }

      return result;
    } finally {
      setLoading(false);
    }
  }, [user, propertyId]);

  return {
    isFavorite,
    favoriteCount,
    loading,
    toggleFavorite,
    addFavorite,
    removeFavorite,
    isAuthenticated: !!user,
  };
}

/**
 * Hook pour récupérer tous les favoris de l'utilisateur
 */
export function useUserFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<
    Awaited<ReturnType<typeof favoritesService.getUserFavorites>>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await favoritesService.getUserFavorites(user.id);
      setFavorites(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement des favoris';
      setError(message);
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  return {
    favorites,
    loading,
    error,
    refresh: loadFavorites,
    count: favorites.length,
    isAuthenticated: !!user,
  };
}

export default useFavorites;
