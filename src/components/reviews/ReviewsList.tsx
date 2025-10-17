import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/services/logger';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  review_type: string;
  created_at: string;
  reviewer: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface ReviewsListProps {
  userId: string;
  reviewType?: 'all' | 'as_tenant' | 'as_landlord';
}

export const ReviewsList = ({ userId, reviewType = 'all' }: ReviewsListProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, [userId, reviewType]);

  const fetchReviews = async () => {
    try {
      let query = supabase
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          review_type,
          created_at,
          reviewer:reviewer_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('reviewee_id', userId)
        .order('created_at', { ascending: false });

      if (reviewType === 'as_tenant') {
        query = query.eq('review_type', 'landlord_to_tenant');
      } else if (reviewType === 'as_landlord') {
        query = query.eq('review_type', 'tenant_to_landlord');
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data to match our interface
      const transformedData = data?.map((review: any) => ({
        ...review,
        reviewer: Array.isArray(review.reviewer) ? review.reviewer[0] : review.reviewer,
      })) || [];

      setReviews(transformedData);
    } catch (error) {
      logger.logError(error, { context: 'ReviewsList', action: 'fetch', userId });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (reviews.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">Aucun avis pour le moment</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <Card key={review.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={review.reviewer?.avatar_url || ''} />
                  <AvatarFallback>
                    {review.reviewer?.full_name?.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{review.reviewer?.full_name || 'Utilisateur'}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(review.created_at), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </p>
                </div>
              </div>
              <Badge variant="outline">
                {review.review_type === 'tenant_to_landlord' 
                  ? 'En tant que propriétaire' 
                  : 'En tant que locataire'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= review.rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
              <span className="ml-2 text-sm font-medium">{review.rating}/5</span>
            </div>
            {review.comment && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {review.comment}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
