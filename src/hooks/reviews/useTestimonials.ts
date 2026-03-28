/**
 * Hook for fetching testimonials from reviews
 *
 * Fetches approved reviews with high ratings to display as testimonials
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Testimonial {
  id: string;
  content: string;
  rating: number;
  reviewerName: string | null;
  reviewerAvatar: string | null;
  reviewerCity: string | null;
  propertyTitle: string | null;
  createdAt: string;
  userRole: string | null;
}

interface TestimonialsResponse {
  data: Testimonial[] | null;
  error: Error | null;
  isLoading: boolean;
}

const fetchTestimonials = async (): Promise<Testimonial[]> => {
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      id,
      comment,
      rating,
      created_at,
      reviewer_id,
      reviewer:profiles!reviews_reviewer_id_fkey(
        full_name,
        avatar_url,
        city,
        user_type
      ),
      property:properties(
        title
      )
    `)
    .eq('is_visible', true)
    .in('moderation_status', ['approved', 'pending'])
    .gte('rating', 4)
    .not('comment', 'is', null)
    .not('comment', 'eq', '')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching testimonials:', error);
    throw error;
  }

  // Transform data into testimonial format
  return (data || [])
    .filter((review: { comment?: string | null }) => {
      // Filter out very short comments
      const commentLength = review.comment?.length || 0;
      return commentLength >= 50; // At least 50 characters
    })
    .map((review: {
      id: string;
      comment: string;
      rating: number;
      created_at: string;
      reviewer?: {
        full_name?: string | null;
        avatar_url?: string | null;
        city?: string | null;
        user_type?: string | null;
      } | null;
      property?: {
        title?: string | null;
      } | null;
    }) => ({
      id: review.id,
      content: review.comment,
      rating: review.rating,
      reviewerName: review.reviewer?.full_name || 'Utilisateur anonyme',
      reviewerAvatar: review.reviewer?.avatar_url,
      reviewerCity: review.reviewer?.city,
      propertyTitle: review.property?.title,
      createdAt: review.created_at,
      userRole: getRoleLabel(review.reviewer?.user_type),
    }))
    .slice(0, 10); // Max 10 testimonials
};

function getRoleLabel(userType: string | null): string | null {
  if (!userType) return null;

  const roleLabels: Record<string, string> = {
    tenant: 'Locataire',
    owner: 'Propriétaire',
    agency: 'Agence',
    locataire: 'Locataire',
    proprietaire: 'Propriétaire',
  };

  return roleLabels[userType] || userType;
}

export function useTestimonials(): TestimonialsResponse {
  const query = useQuery({
    queryKey: ['testimonials'],
    queryFn: fetchTestimonials,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  return {
    data: query.data ?? [],
    error: query.error as Error | null,
    isLoading: query.isLoading,
  };
}
