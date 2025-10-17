import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/services/logger';

export interface SavedSearch {
  id: string;
  name: string;
  filters: any;
  created_at: string;
}

export const useSavedSearches = () => {
  const { user } = useAuth();
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setSavedSearches([]);
      return;
    }

    fetchSavedSearches();
  }, [user]);

  const fetchSavedSearches = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_searches')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedSearches(data || []);
    } catch (error) {
      logger.error('Failed to fetch saved searches', { userId: user?.id });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSearch = async (filters: any, name: string) => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour sauvegarder vos recherches",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('saved_searches')
        .insert({
          user_id: user.id,
          name,
          filters,
        });

      if (error) throw error;

      toast({
        title: "Recherche sauvegardée !",
        description: `"${name}" a été ajouté à vos recherches sauvegardées`,
      });

      await fetchSavedSearches();
    } catch (error) {
      logger.error('Failed to save search', { userId: user?.id });
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la recherche",
        variant: "destructive",
      });
    }
  };

  const deleteSearch = async (id: string) => {
    try {
      const { error } = await supabase
        .from('saved_searches')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSavedSearches(prev => prev.filter(s => s.id !== id));
      
      toast({
        title: "Recherche supprimée",
        description: "La recherche a été retirée de vos favoris",
      });
    } catch (error) {
      logger.error('Failed to delete saved search', { searchId: id });
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la recherche",
        variant: "destructive",
      });
    }
  };

  return {
    savedSearches,
    isLoading,
    saveSearch,
    deleteSearch,
    refresh: fetchSavedSearches,
  };
};
