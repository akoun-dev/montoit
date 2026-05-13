import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Star,
  MessageSquare,
  Calendar,
  MapPin,
  Home,
  Reply,
  ChevronRight,
  Filter,
  Loader2,
  Edit3,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ReviewResponseModal, { useReviewResponseModal } from '@/shared/ui/reviews/ReviewResponseModal';

interface ReceivedReview {
  id: string;
  property_id: string;
  property_title: string;
  property_city: string;
  property_image: string | null;
  overall_rating: number;
  location_rating: number;
  condition_rating: number;
  value_rating: number;
  communication_rating: number;
  comment: string;
  created_at: string;
  response: string | null;
  response_at: string | null;
  reviewer_name: string | null;
  reviewer_email: string | null;
}

const COLORS = {
  chocolat: '#2C1810',
  sable: '#E8D4C5',
  orange: '#F16522',
  creme: '#FAF7F4',
  grisTexte: '#6B5A4E',
  border: '#EFEBE9',
};

export default function ReceivedReviewsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<ReceivedReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'responded'>('all');
  const { isOpen, selectedReviewId, existingResponse, openModal, closeModal } = useReviewResponseModal();

  useEffect(() => {
    if (user) {
      loadReviews();
    }
  }, [user, filter]);

  const loadReviews = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get reviews received by the owner (reviews about them/their properties)
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select(`
          *,
          properties!inner(title, city, main_image),
          reviewer:profiles!reviews_reviewer_id_fkey(full_name, email)
        `)
        .eq('reviewee_id', user.id)
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: false });

      if (reviewsError) {
        console.error('Error loading reviews:', reviewsError);
        setReviews([]);
        return;
      }

      const reviews: ReceivedReview[] = (reviewsData || []).map((r: any) => {
        const criteria = r.criteria_ratings || {};
        const overall = r.rating || criteria.overall || 0;

        return {
          id: r.id,
          property_id: r.property_id,
          property_title: r.properties?.title || 'Propriété',
          property_city: r.properties?.city || '',
          property_image: r.properties?.main_image || null,
          overall_rating: overall,
          location_rating: criteria.location || criteria.emplacement || 0,
          condition_rating: criteria.condition || criteria.proprete || 0,
          value_rating: criteria.value || criteria.qualite_prix || 0,
          communication_rating: criteria.communication || 0,
          comment: r.comment || '',
          created_at: r.created_at,
          response: r.response || null,
          response_at: r.response_at || null,
          reviewer_name: r.reviewer?.full_name || 'Locataire',
          reviewer_email: r.reviewer?.email || null,
        };
      });

      // Apply filter
      let filteredReviews = reviews;
      if (filter === 'pending') {
        filteredReviews = reviews.filter((r) => !r.response);
      } else if (filter === 'responded') {
        filteredReviews = reviews.filter((r) => r.response);
      }

      setReviews(filteredReviews);
    } catch (error) {
      console.error('Error loading reviews:', error);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResponseSubmit = () => {
    loadReviews();
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

  const getAverageRating = (review: ReceivedReview) => {
    const ratings = [
      review.overall_rating,
      review.location_rating,
      review.condition_rating,
      review.value_rating,
      review.communication_rating,
    ];
    const validRatings = ratings.filter(r => r > 0);
    if (validRatings.length === 0) return '0.0';
    return (validRatings.reduce((a, b) => a + b, 0) / validRatings.length).toFixed(1);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F4]">
      {/* Header */}
      <div className="bg-[#2C1810] rounded-[20px] p-6 mb-8 hidden lg:block">
        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-[#F16522] flex items-center justify-center">
            <Star className="h-6 w-6 text-white" />
          </div>
          <span>Avis reçus</span>
        </h1>
        <p className="text-[#E8D4C5] text-lg ml-15">
          Consultez et répondez aux avis des locataires
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <Filter className="h-5 w-5 text-[#6B5A4E]" />
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'all'
                ? 'bg-[#F16522] text-white'
                : 'bg-white text-[#2C1810] border border-[#EFEBE9] hover:border-[#F16522]'
            }`}
          >
            Tous ({reviews.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'pending'
                ? 'bg-[#F16522] text-white'
                : 'bg-white text-[#2C1810] border border-[#EFEBE9] hover:border-[#F16522]'
            }`}
          >
            Sans réponse
          </button>
          <button
            onClick={() => setFilter('responded')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'responded'
                ? 'bg-[#F16522] text-white'
                : 'bg-white text-[#2C1810] border border-[#EFEBE9] hover:border-[#F16522]'
            }`}
          >
            Avec réponse
          </button>
        </div>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#F16522]" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-[20px] p-12 text-center border border-[#EFEBE9]">
          <Star className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-[#2C1810] mb-2">Aucun avis</h3>
          <p className="text-[#6B5A4E]">
            Vous n'avez pas encore reçu d'avis de la part des locataires
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white rounded-[20px] p-6 border border-[#EFEBE9] hover:shadow-lg transition-shadow"
            >
              <div className="flex gap-4">
                {/* Property Image */}
                <img
                  src={
                    review.property_image ||
                    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=200'
                  }
                  alt={review.property_title}
                  className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-lg text-[#2C1810] truncate">
                        {review.property_title}
                      </h3>
                      <p className="text-sm text-[#6B5A4E] flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {review.property_city}
                      </p>
                      <p className="text-sm text-[#6B5A4E]">
                        Par {review.reviewer_name}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      {renderStars(Math.round(parseFloat(getAverageRating(review))))}
                      <span className="text-sm font-bold text-[#2C1810]">
                        {getAverageRating(review)}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-[#6B5A4E] line-clamp-2 mb-3">
                    {review.comment}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
                    <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-600 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(review.created_at), 'd MMM yyyy', { locale: fr })}
                    </span>
                  </div>

                  {/* Owner Response */}
                  {review.response ? (
                    <div className="bg-[#FAF7F4] rounded-lg p-3 mb-3 border border-[#EFEBE9]">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="w-4 h-4 text-[#F16522]" />
                        <span className="text-xs font-semibold text-[#2C1810]">
                          Votre réponse
                        </span>
                        {review.response_at && (
                          <span className="text-xs text-[#6B5A4E]">
                            {format(new Date(review.response_at), 'd MMM yyyy', { locale: fr })}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#6B5A4E]">{review.response}</p>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 rounded-lg p-3 mb-3 border border-yellow-200">
                      <p className="text-xs text-yellow-800">
                        Vous n'avez pas encore répondu à cet avis
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openModal(review.id, review.response)}
                      className="flex items-center gap-1 text-xs font-medium text-[#F16522] hover:underline px-2 py-1 rounded hover:bg-[#FAF7F4] transition-colors"
                    >
                      {review.response ? (
                        <>
                          <Edit3 className="w-3 h-3" />
                          Modifier la réponse
                        </>
                      ) : (
                        <>
                          <Reply className="w-3 h-3" />
                          Répondre
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => navigate(`/propriete/${review.property_id}`)}
                      className="flex items-center gap-1 text-xs font-medium text-[#6B5A4E] hover:underline px-2 py-1 rounded hover:bg-[#FAF7F4] transition-colors"
                    >
                      Voir la propriété
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Response Modal */}
      <ReviewResponseModal
        isOpen={isOpen}
        onClose={closeModal}
        onSubmit={handleResponseSubmit}
        reviewId={selectedReviewId}
        existingResponse={existingResponse}
      />
    </div>
  );
}
