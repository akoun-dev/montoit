import { useState, useEffect } from 'react';
import { Star, Flag, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ReviewCard from './ReviewCard';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  response: string | null;
  response_at: string | null;
  created_at: string;
  criteria_ratings?: {
    overall?: number;
    location?: number;
    condition?: number;
    value?: number;
    communication?: number;
  };
  reviewer?: {
    full_name: string | null;
    avatar_url?: string | null;
  };
}

interface ReviewStats {
  average_rating: number;
  total_reviews: number;
  distribution: Record<number, number>;
}

interface ReviewsSectionProps {
  revieweeId: string;
  revieweeType: 'owner' | 'agency';
  onReportReview?: (reviewId: string) => void;
}

export default function ReviewsSection({
  revieweeId,
  revieweeType,
  onReportReview,
}: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const reviewsPerPage = 5;

  useEffect(() => {
    loadReviews();
    loadStats();
  }, [revieweeId]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url)
        `)
        .eq('reviewee_id', revieweeId)
        .eq('moderation_status', 'approved')
        .eq('is_visible', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error loading reviews:', error);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Calculate stats from reviews
      const { data, error } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewee_id', revieweeId)
        .eq('moderation_status', 'approved')
        .eq('is_visible', true);

      if (error) throw error;

      const reviews = data || [];
      const total = reviews.length;
      const average = total > 0
        ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / total
        : 0;

      // Calculate distribution
      const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      reviews.forEach((r) => {
        const rating = r.rating || 0;
        if (rating >= 1 && rating <= 5) {
          distribution[rating]++;
        }
      });

      setStats({
        average_rating: Math.round(average * 10) / 10,
        total_reviews: total,
        distribution,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const renderStars = (rating: number, size: 'sm' | 'md' = 'md') => {
    const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClass} ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  // Pagination
  const totalPages = Math.ceil(reviews.length / reviewsPerPage);
  const startIndex = (currentPage - 1) * reviewsPerPage;
  const endIndex = startIndex + reviewsPerPage;
  const currentReviews = reviews.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9]">
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F16522]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-[#2C1810] flex items-center gap-2">
          <Star className="h-6 w-6 text-[#F16522]" />
          Avis
        </h2>
        {stats && stats.total_reviews > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-[#2C1810]">{stats.average_rating}</span>
            {renderStars(Math.round(stats.average_rating))}
            <span className="text-sm text-[#6B5A4E]">({stats.total_reviews} avis)</span>
          </div>
        )}
      </div>

      {reviews.length === 0 ? (
        <div className="text-center py-8">
          <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-[#6B5A4E]">Aucun avis pour le moment</p>
        </div>
      ) : (
        <>
          {/* Stats Section */}
          {stats && stats.total_reviews > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Rating Summary */}
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <p className="text-4xl font-bold text-[#2C1810]">{stats.average_rating}</p>
                  <div className="flex justify-center my-2">
                    {renderStars(Math.round(stats.average_rating))}
                  </div>
                  <p className="text-sm text-[#6B5A4E]">{stats.total_reviews} avis</p>
                </div>
              </div>

              {/* Distribution */}
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = stats.distribution[star] || 0;
                  const percentage = stats.total_reviews > 0
                    ? (count / stats.total_reviews) * 100
                    : 0;
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-sm text-[#6B5A4E] w-8">{star} ★</span>
                      <div className="flex-1 h-2 bg-[#FAF7F4] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-400 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-[#6B5A4E] w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reviews List */}
          <div className="space-y-4">
            {currentReviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onReport={onReportReview}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-[#EFEBE9] hover:bg-[#FAF7F4] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === page
                        ? 'bg-[#F16522] text-white'
                        : 'border border-[#EFEBE9] hover:bg-[#FAF7F4]'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-[#EFEBE9] hover:bg-[#FAF7F4] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
