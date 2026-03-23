/**
 * Service pour la gestion des favoris
 *
 * Permet aux utilisateurs de sauvegarder leurs propriétés préférées
 * et de gérer leur liste de favoris.
 */

import { supabase } from '@/integrations/supabase/client';

export interface Favorite {
  id: string;
  user_id: string;
  property_id: string;
  created_at: string;
}

export interface FavoriteWithProperty extends Favorite {
  property: {
    id: string;
    title: string;
    city: string;
    neighborhood: string | null;
    property_type: string;
    bedrooms: number | null;
    bathrooms: number | null;
    surface_area: number | null;
    price: number | null;
    monthly_rent: number | null;
    status: string | null;
    main_image: string | null;
    images: string[] | null;
  };
}

/**
 * Service pour gérer les favoris
 */
export const favoritesService = {
  /**
   * Vérifier si une propriété est dans les favoris de l'utilisateur
   */
  async isFavorite(userId: string, propertyId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('property_id', propertyId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    } catch (error) {
      console.error('Erreur lors de la vérification du favori:', error);
      return false;
    }
  },

  /**
   * Ajouter une propriété aux favoris
   */
  async addFavorite(userId: string, propertyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Vérifier si déjà favori
      const existing = await this.isFavorite(userId, propertyId);
      if (existing) {
        return { success: true }; // Déjà favori, pas d'erreur
      }

      const { error } = await supabase.from('favorites').insert({
        user_id: userId,
        property_id: propertyId,
      });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de l\'ajout aux favoris:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  },

  /**
   * Supprimer une propriété des favoris
   */
  async removeFavorite(
    userId: string,
    propertyId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('property_id', propertyId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la suppression des favoris:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  },

  /**
   * Basculer le statut de favori (ajouter si absent, supprimer si présent)
   */
  async toggleFavorite(
    userId: string,
    propertyId: string
  ): Promise<{ success: boolean; isFavorite: boolean; error?: string }> {
    try {
      const isFav = await this.isFavorite(userId, propertyId);

      if (isFav) {
        const result = await this.removeFavorite(userId, propertyId);
        return { ...result, isFavorite: false };
      } else {
        const result = await this.addFavorite(userId, propertyId);
        return { ...result, isFavorite: true };
      }
    } catch (error) {
      console.error('Erreur lors du basculement du favori:', error);
      return {
        success: false,
        isFavorite: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  },

  /**
   * Récupérer tous les favoris d'un utilisateur avec les détails des propriétés
   */
  async getUserFavorites(userId: string): Promise<FavoriteWithProperty[]> {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select(
          `
          id,
          user_id,
          property_id,
          created_at,
          properties (
            id,
            title,
            city,
            neighborhood,
            property_type,
            bedrooms,
            bathrooms,
            surface_area,
            price,
            monthly_rent,
            status,
            main_image,
            images
          )
        `
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((fav: Record<string, unknown>) => ({
        id: fav.id,
        user_id: fav.user_id,
        property_id: fav.property_id,
        created_at: fav.created_at,
        property: fav.properties || {
          id: fav.property_id,
          title: 'Propriété supprimée',
          city: '',
          neighborhood: null,
          property_type: '',
          bedrooms: null,
          bathrooms: null,
          surface_area: null,
          price: null,
          monthly_rent: null,
          status: null,
          main_image: null,
          images: null,
        },
      }));
    } catch (error) {
      console.error('Erreur lors de la récupération des favoris:', error);
      return [];
    }
  },

  /**
   * Compter les favoris d'un utilisateur
   */
  async getUserFavoritesCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('favorites')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Erreur lors du comptage des favoris:', error);
      return 0;
    }
  },

  /**
   * Compter le nombre de fois qu'une propriété a été ajoutée aux favoris
   */
  async getPropertyFavoritesCount(propertyId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('favorites')
        .select('*', { count: 'exact', head: true })
        .eq('property_id', propertyId);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Erreur lors du comptage des favoris:', error);
      return 0;
    }
  },

  /**
   * Supprimer tous les favoris d'une propriété (lors de la suppression d'une propriété)
   */
  async removePropertyFavorites(propertyId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('property_id', propertyId);

      if (error) throw error;
    } catch (error) {
      console.error('Erreur lors de la suppression des favoris de la propriété:', error);
    }
  },

  /**
   * Récupérer les IDs des propriétés favorites d'un utilisateur
   */
  async getUserFavoritePropertyIds(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('property_id')
        .eq('user_id', userId);

      if (error) throw error;
      return (data || []).map((fav) => fav.property_id);
    } catch (error) {
      console.error('Erreur lors de la récupération des IDs de favoris:', error);
      return [];
    }
  },
};

export default favoritesService;
