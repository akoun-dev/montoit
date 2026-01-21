import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

interface SearchFilters {
  city?: string;
  property_type?: string;
  min_price?: number;
  max_price?: number;
  min_bedrooms?: number;
  furnished?: boolean;
}

export function useSaveSearch() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const saveSearch = async (
    name: string,
    filters: SearchFilters,
    notificationsEnabled: boolean
  ): Promise<boolean> => {
    if (!user) {
      toast.error('Vous devez être connecté pour sauvegarder une recherche');
      return false;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('saved_searches').insert([
        {
          user_id: user.id,
          name,
          filters: filters as unknown as Json,
          notifications_enabled: notificationsEnabled,
        },
      ]);

      if (error) throw error;

      toast.success('Recherche sauvegardée !', {
        description: notificationsEnabled
          ? 'Vous recevrez des notifications pour les nouvelles propriétés'
          : undefined,
      });
      return true;
    } catch (err) {
      console.error('Error saving search:', err);
      toast.error('Erreur lors de la sauvegarde');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { saveSearch, saving, isAuthenticated: !!user };
}
