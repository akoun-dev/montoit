import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HeroSlide {
  id: string;
  image_url: string;
  title: string;
  description: string | null;
  display_order: number;
}

export function useHeroSlides() {
  return useQuery({
    queryKey: ['hero-slides'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hero_slides')
        .select('id, image_url, title, description, display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as HeroSlide[];
    },
    staleTime: 1000 * 60 * 5, // Cache 5 minutes
  });
}
