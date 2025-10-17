import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PropertyCard } from '@/components/properties/PropertyCard';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useEmblaCarousel from 'embla-carousel-react';
import type { Property } from '@/types';
import { logger } from '@/services/logger';

interface RecommendationsCarouselProps {
  userId: string;
  limit?: number;
}

export const RecommendationsCarousel = ({ userId, limit = 8 }: RecommendationsCarouselProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: false, 
    align: 'start',
    slidesToScroll: 1,
  });
  const [properties, setProperties] = useState<Property[]>([]);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        // Fetch user preferences
        const { data: prefsData } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        let query = supabase
          .from('properties')
          .select('*')
          .eq('moderation_status', 'approved')
          .eq('status', 'disponible')
          .order('created_at', { ascending: false })
          .limit(limit);

        // Apply preference filters if they exist
        if (prefsData) {
          if (prefsData.preferred_cities?.length > 0) {
            query = query.in('city', prefsData.preferred_cities);
          }
          if (prefsData.min_budget) {
            query = query.gte('monthly_rent', prefsData.min_budget);
          }
          if (prefsData.max_budget) {
            query = query.lte('monthly_rent', prefsData.max_budget);
          }
        }

        const { data, error } = await query;

        if (error) throw error;
        setProperties(data || []);
      } catch (error) {
        logger.logError(error, { context: 'RecommendationsCarousel', action: 'fetch', userId });
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [userId, limit]);

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      setCanScrollPrev(emblaApi.canScrollPrev());
      setCanScrollNext(emblaApi.canScrollNext());
    };

    emblaApi.on('select', onSelect);
    onSelect();

    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Chargement des recommandations...
        </CardContent>
      </Card>
    );
  }

  if (properties.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Aucune recommandation pour le moment. Configurez vos préférences pour recevoir des suggestions personnalisées.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Recommandations pour vous
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => emblaApi?.scrollPrev()}
              disabled={!canScrollPrev}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => emblaApi?.scrollNext()}
              disabled={!canScrollNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-hidden p-0">
        <div className="embla" ref={emblaRef}>
          <div className="embla__container flex gap-4 p-4">
            {properties.map((property) => (
              <div key={property.id} className="embla__slide flex-[0_0_300px] min-w-0">
                <PropertyCard property={property} />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};