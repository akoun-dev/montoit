import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { logger } from '@/services/logger';

interface PropertyAnalytics {
  property_id: string;
  property_title: string;
  property_image: string | null;
  monthly_rent: number;
  views_7d: number;
  views_30d: number;
  applications_count: number;
  conversion_rate: number;
  status: string;
}

interface OwnerAnalyticsStats {
  total_properties: number;
  total_views_7d: number;
  total_applications: number;
  avg_conversion_rate: number;
}

export const useOwnerAnalytics = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<PropertyAnalytics[]>([]);
  const [stats, setStats] = useState<OwnerAnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .rpc('get_owner_analytics', { owner_user_id: user.id });

        if (error) throw error;

        setAnalytics(data || []);

        // Calculer les stats globales
        if (data && data.length > 0) {
          const totalViews7d = data.reduce((sum, p) => sum + Number(p.views_7d), 0);
          const totalApplications = data.reduce((sum, p) => sum + Number(p.applications_count), 0);
          const avgConversion = data.reduce((sum, p) => sum + Number(p.conversion_rate), 0) / data.length;

          setStats({
            total_properties: data.length,
            total_views_7d: totalViews7d,
            total_applications: totalApplications,
            avg_conversion_rate: Math.round(avgConversion * 100) / 100
          });
        } else {
          setStats({
            total_properties: 0,
            total_views_7d: 0,
            total_applications: 0,
            avg_conversion_rate: 0
          });
        }
      } catch (err: any) {
        logger.error('Failed to fetch owner analytics', { error: err.message, userId: user.id });
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [user]);

  return { analytics, stats, loading, error };
};
