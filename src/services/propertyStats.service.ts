/**
 * Service pour les statistiques des annonces immobilières
 *
 * Fournit des statistiques détaillées sur les propriétés:
 * - Vues et visibilité
 * - Favoris
 * - Candidatures
 * - Taux de conversion
 * - Performance par période
 */

import { supabase } from '@/integrations/supabase/client';

export interface PropertyStats {
  propertyId: string;
  totalViews: number;
  uniqueViews: number;
  favorites: number;
  applications: {
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
  };
  viewsOverTime: Array<{
    date: string;
    views: number;
    uniqueViews: number;
  }>;
  conversionRate: number;
  avgTimeToApplication: number | null; // en jours
  publishedAt: string | null;
}

export interface OwnerStats {
  totalProperties: number;
  totalViews: number;
  totalFavorites: number;
  totalApplications: number;
  avgViewsPerProperty: number;
  avgConversionRate: number;
  topPerformingProperties: Array<{
    id: string;
    title: string;
    views: number;
    applications: number;
    conversionRate: number;
  }>;
}

/**
 * Service pour les statistiques de propriétés
 */
export const propertyStatsService = {
  /**
   * Enregistrer une vue de propriété
   */
  async recordView(propertyId: string): Promise<void> {
    try {
      // Appeler la fonction via RPC ou Edge Function
      await supabase.rpc('record_property_view', {
        p_property_id: propertyId,
      });

      // Si la fonction n'existe pas encore, fallback sur insertion directe
      const { error: rpcError } = await supabase.rpc('record_property_view', {
        p_property_id: propertyId,
      });

      if (rpcError && rpcError.code === 'PGRST202') {
        // La fonction n'existe pas, utiliser l'insertion directe
        await supabase.from('property_view_stats').insert({
          property_id: propertyId,
          view_date: new Date().toISOString().split('T')[0],
          views_count: 1,
          unique_views: 1,
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de la vue:', error);
    }
  },

  /**
   * Obtenir les statistiques d'une propriété
   */
  async getPropertyStats(propertyId: string): Promise<PropertyStats> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Vues totales
    const { data: viewsData } = await supabase
      .from('property_view_stats')
      .select('views_count, unique_views')
      .eq('property_id', propertyId);

    const totalViews = viewsData?.reduce((sum, row) => sum + (row.views_count || 0), 0) || 0;
    const uniqueViews = viewsData?.reduce((sum, row) => sum + (row.unique_views || 0), 0) || 0;

    // Vues des 30 derniers jours
    const { data: recentViews } = await supabase
      .from('property_view_stats')
      .select('view_date, views_count, unique_views')
      .eq('property_id', propertyId)
      .gte('view_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('view_date', { ascending: true });

    // Favoris
    const { count: favoritesCount } = await supabase
      .from('favorites')
      .select('*', { count: 'exact', head: true })
      .eq('property_id', propertyId);

    // Candidatures
    const { data: applications } = await supabase
      .from('rental_applications')
      .select('id, status, created_at')
      .eq('property_id', propertyId);

    const applicationsStats = {
      total: applications?.length || 0,
      pending: 0,
      accepted: 0,
      rejected: 0,
    };

    let totalApplicationTime = 0;
    let applicationCount = 0;

    applications?.forEach((app) => {
      if (app.status === 'pending') applicationsStats.pending++;
      else if (app.status === 'accepted') applicationsStats.accepted++;
      else if (app.status === 'rejected') applicationsStats.rejected++;

      // Calculer le temps entre publication et candidature
      if (app.created_at) {
        const applicationDate = new Date(app.created_at);
        totalApplicationTime += (applicationDate.getTime() - applicationDate.getTime());
        applicationCount++;
      }
    });

    // Taux de conversion
    const conversionRate = totalViews > 0
      ? Math.round((applicationsStats.total / totalViews) * 100)
      : 0;

    // Temps moyen pour candidature
    const avgTimeToApplication = applicationCount > 0
      ? totalApplicationTime / applicationCount / (1000 * 60 * 60 * 24) // en jours
      : null;

    // Date de publication
    const { data: property } = await supabase
      .from('properties')
      .select('created_at')
      .eq('id', propertyId)
      .single();

    return {
      propertyId,
      totalViews,
      uniqueViews,
      favorites: favoritesCount || 0,
      applications: applicationsStats,
      viewsOverTime: (recentViews || []).map((row) => ({
        date: row.view_date,
        views: row.views_count || 0,
        uniqueViews: row.unique_views || 0,
      })),
      conversionRate,
      avgTimeToApplication,
      publishedAt: property?.created_at || null,
    };
  },

  /**
   * Obtenir les statistiques globales d'un propriétaire
   */
  async getOwnerStats(ownerId: string): Promise<OwnerStats> {
    // Récupérer toutes les propriétés du propriétaire
    const { data: properties } = await supabase
      .from('properties')
      .select('id, title, created_at')
      .eq('owner_id', ownerId);

    if (!properties || properties.length === 0) {
      return {
        totalProperties: 0,
        totalViews: 0,
        totalFavorites: 0,
        totalApplications: 0,
        avgViewsPerProperty: 0,
        avgConversionRate: 0,
        topPerformingProperties: [],
      };
    }

    const propertyIds = properties.map((p) => p.id);

    // Vues totales
    const { data: viewsData } = await supabase
      .from('property_view_stats')
      .select('property_id, views_count')
      .in('property_id', propertyIds);

    const totalViews = viewsData?.reduce((sum, row) => sum + (row.views_count || 0), 0) || 0;

    // Favoris
    const { count: totalFavorites } = await supabase
      .from('favorites')
      .select('*', { count: 'exact', head: true })
      .in('property_id', propertyIds);

    // Candidatures
    const { data: applications } = await supabase
      .from('rental_applications')
      .select('property_id, status')
      .in('property_id', propertyIds);

    const totalApplications = applications?.length || 0;

    // Stats par propriété
    const propertyStatsMap = new Map<
      string,
      { views: number; applications: number; title: string }
    >();

    // Initialiser avec 0
    properties.forEach((p) => {
      propertyStatsMap.set(p.id, { views: 0, applications: 0, title: p.title });
    });

    // Ajouter les vues
    viewsData?.forEach((row) => {
      const current = propertyStatsMap.get(row.property_id);
      if (current) {
        propertyStatsMap.set(row.property_id, {
          ...current,
          views: current.views + (row.views_count || 0),
        });
      }
    });

    // Ajouter les candidatures
    applications?.forEach((app) => {
      const current = propertyStatsMap.get(app.property_id);
      if (current) {
        propertyStatsMap.set(app.property_id, {
          ...current,
          applications: current.applications + 1,
        });
      }
    });

    // Top propriétés
    const topProperties = Array.from(propertyStatsMap.entries())
      .map(([id, stats]) => ({
        id,
        title: stats.title,
        views: stats.views,
        applications: stats.applications,
        conversionRate: stats.views > 0 ? Math.round((stats.applications / stats.views) * 100) : 0,
      }))
      .sort((a, b) => b.applications - a.applications || b.views - a.views)
      .slice(0, 5);

    return {
      totalProperties: properties.length,
      totalViews,
      totalFavorites: totalFavorites || 0,
      totalApplications,
      avgViewsPerProperty: Math.round(totalViews / properties.length),
      avgConversionRate: totalViews > 0 ? Math.round((totalApplications / totalViews) * 100) : 0,
      topPerformingProperties: topProperties,
    };
  },

  /**
   * Obtenir les tendances de vues sur une période
   */
  async getViewTrends(propertyId: string, days: number = 30): Promise<
    Array<{
      date: string;
      views: number;
      uniqueViews: number;
      applications: number;
    }>
  > {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Vues par jour
    const { data: viewsData } = await supabase
      .from('property_view_stats')
      .select('view_date, views_count, unique_views')
      .eq('property_id', propertyId)
      .gte('view_date', startDate.toISOString().split('T')[0])
      .order('view_date', { ascending: true });

    // Candidatures par jour
    const { data: applications } = await supabase
      .from('rental_applications')
      .select('created_at')
      .eq('property_id', propertyId)
      .gte('created_at', startDate.toISOString());

    // Compter les candidatures par jour
    const applicationsByDate = new Map<string, number>();
    applications?.forEach((app) => {
      const date = app.created_at.split('T')[0];
      applicationsByDate.set(date, (applicationsByDate.get(date) || 0) + 1);
    });

    // Combiner les données
    const trends: Array<{
      date: string;
      views: number;
      uniqueViews: number;
      applications: number;
    }> = [];

    viewsData?.forEach((row) => {
      trends.push({
        date: row.view_date,
        views: row.views_count || 0,
        uniqueViews: row.unique_views || 0,
        applications: applicationsByDate.get(row.view_date) || 0,
      });
    });

    return trends;
  },

  /**
   * Comparer les performances de plusieurs propriétés
   */
  async compareProperties(propertyIds: string[]): Promise<
    Array<{
      propertyId: string;
      title: string;
      views: number;
      favorites: number;
      applications: number;
      conversionRate: number;
      rank: number;
    }>
  > {
    const stats = await Promise.all(
      propertyIds.map(async (id) => {
        const stats = await this.getPropertyStats(id);
        const { data: property } = await supabase
          .from('properties')
          .select('title')
          .eq('id', id)
          .single();

        return {
          propertyId: id,
          title: property?.title || 'Sans titre',
          views: stats.totalViews,
          favorites: stats.favorites,
          applications: stats.applications.total,
          conversionRate: stats.conversionRate,
        };
      })
    );

    // Trier par performance (pondérée: applications > views > conversion rate)
    const ranked = stats
      .map((s) => ({
        ...s,
        score: s.applications * 100 + s.views + s.conversionRate,
      }))
      .sort((a, b) => b.score - a.score)
      .map((s, index) => ({
        ...s,
        rank: index + 1,
      }));

    return ranked;
  },
};

export default propertyStatsService;
