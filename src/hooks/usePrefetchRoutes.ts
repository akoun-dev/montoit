import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export const usePrefetchRoutes = () => {
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    // ✅ SÉCURITÉ : Précharger uniquement si l'utilisateur est authentifié
    if (!user) return;

    // Page d'accueil → Précharger propriétés populaires (optimisé)
    if (location.pathname === '/') {
      // ⚡ Attendre que la page soit interactive avant de précharger
      const prefetchTimer = setTimeout(() => {
        queryClient.prefetchQuery({
          queryKey: ['properties', 'public', { limit: 5 }],
          queryFn: async () => {
            const { data } = await supabase
              .from('properties')
              .select('id, title, price, location, main_image, status, moderation_status, view_count')
              .eq('moderation_status', 'approved')
              .eq('status', 'disponible')
              .order('view_count', { ascending: false })
              .limit(5);
            return data;
          },
          staleTime: 5 * 60 * 1000,
        });
      }, 2000);

      return () => clearTimeout(prefetchTimer);
    }

    // ✅ SÉCURITÉ : Ne JAMAIS précharger de données sensibles
    // (applications, messages, données d'administration)
  }, [location.pathname, queryClient, user]);
};
