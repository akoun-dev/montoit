import { useRecommendations } from '@/hooks/useRecommendations';
import { RecommendationCard } from './RecommendationCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

interface RecommendationsSectionProps {
  userId: string;
  type: 'properties' | 'tenants';
  propertyId?: string;
  limit?: number;
  title?: string;
}

export const RecommendationsSection = ({
  userId,
  type,
  propertyId,
  limit = 5,
  title,
}: RecommendationsSectionProps) => {
  const { recommendations, loading, refetch } = useRecommendations({
    type,
    propertyId,
    limit,
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(limit)].map((_, i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      </div>
    );
  }

  if (!recommendations.length) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {title || (type === 'properties' ? '🎯 Recommandations pour vous' : '⭐ Locataires recommandés')}
        </h2>
        <Button
          variant="outline"
          onClick={refetch}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      <Carousel
        opts={{
          align: "start",
          loop: false,
          watchDrag: true,
          skipSnaps: false,
        }}
        plugins={[]}
        className="w-full"
      >
        <CarouselContent className="-ml-4">
          {recommendations.map((rec) => (
            <CarouselItem key={rec.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
              <RecommendationCard
                item={rec}
                type={type === 'properties' ? 'property' : 'tenant'}
                score={rec.score}
                reasons={rec.reasons}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex" />
        <CarouselNext className="hidden md:flex" />
      </Carousel>
    </div>
  );
};
