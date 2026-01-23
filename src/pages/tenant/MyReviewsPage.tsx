import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Star,
  Edit3,
  Trash2,
  MessageSquare,
  Calendar,
  MapPin,
  Home,
  Award,
  Shield,
  Zap,
  ChevronRight,
  Filter,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import TenantDashboardLayout from '../../features/tenant/components/TenantDashboardLayout';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import PropertyRatingDialog, { type PropertyRating } from '../../features/tenant/components/PropertyRatingDialog';

interface Review {
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
  would_recommend: boolean;
  created_at: string;
  owner_response: string | null;
  owner_response_date: string | null;
  owner_name: string | null;
  visit_id: string | null;
  lease_id: string | null;
  is_editable: boolean;
}

interface TrustBadge {
  id: string;
  badge_type: 'verified' | 'reliable' | 'best_tenant';
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  earned: boolean;
  earned_date?: string;
  progress?: number;
}

const COLORS = {
  chocolat: '#2C1810',
  sable: '#E8D4C5',
  orange: '#F16522',
  creme: '#FAF7F4',
  grisTexte: '#6B5A4E',
  border: '#EFEBE9',
};

export default function MyReviewsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'responded'>('all');
  const [badges, setBadges] = useState<TrustBadge[]>([]);

  useEffect(() => {
    if (user) {
      loadReviews();
      loadBadges();
    }
  }, [user, filter]);

  const loadReviews = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get property ratings from tenant
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('property_ratings')
        .select(`
          *,
          properties!inner(title, city, main_image)
        `)
        .eq('tenant_id', user.id)
        .order('created_at', { ascending: false });

      if (ratingsError) {
        // Table doesn't exist or other error - show empty state
        console.log('Property ratings table not available yet:', ratingsError.message);
        setReviews([]);
        return;
      }

      const reviews: Review[] = (ratingsData || []).map((r: any) => {
        const createdAt = new Date(r.created_at);
        const daysSinceCreation = Math.floor(
          (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          id: r.id,
          property_id: r.property_id,
          property_title: r.properties?.title || 'Propriété',
          property_city: r.properties?.city || '',
          property_image: r.properties?.main_image || null,
          overall_rating: r.overall_rating || 0,
          location_rating: r.location_rating || 0,
          condition_rating: r.condition_rating || 0,
          value_rating: r.value_rating || 0,
          communication_rating: r.communication_rating || 0,
          comment: r.comment || '',
          would_recommend: r.would_recommend || false,
          created_at: r.created_at,
          owner_response: null, // Would be joined from owner_responses table
          owner_response_date: null,
          owner_name: null,
          visit_id: r.visit_id || null,
          lease_id: r.lease_id || null,
          is_editable: daysSinceCreation <= 30,
        };
      });

      // Apply filter
      let filteredReviews = reviews;
      if (filter === 'pending') {
        filteredReviews = reviews.filter((r) => !r.owner_response);
      } else if (filter === 'responded') {
        filteredReviews = reviews.filter((r) => r.owner_response);
      }

      setReviews(filteredReviews);
    } catch (error) {
      console.error('Error loading reviews:', error);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const loadBadges = async () => {
    if (!user) return;

    try {
      // Get user's trust score and review count
      const { data: profile } = await supabase
        .from('profiles')
        .select('trust_score, is_verified')
        .eq('id', user.id)
        .single();

      // Get review count - handle if table doesn't exist
      let reviewCount = 0;
      try {
        const { count } = await supabase
          .from('property_ratings')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', user.id);

        reviewCount = count || 0;
      } catch (e) {
        // Table doesn't exist yet, use 0
        reviewCount = 0;
      }

      const trustScore = profile?.trust_score || 0;
      const isVerified = profile?.is_verified || false;

      const trustBadges: TrustBadge[] = [
        {
          id: 'verified',
          badge_type: 'verified',
          title: 'Locataire Vérifié',
          description: 'Identité vérifiée par MonToit',
          icon: <Shield className="w-6 h-6" />,
          color: 'bg-blue-100 text-blue-700 border-blue-200',
          earned: isVerified,
          earned_date: isVerified ? undefined : undefined,
        },
        {
          id: 'reliable',
          badge_type: 'reliable',
          title: 'Locataire Fiable',
          description: 'Trust Score supérieur à 70',
          icon: <Award className="w-6 h-6" />,
          color: 'bg-green-100 text-green-700 border-green-200',
          earned: trustScore >= 70,
          progress: trustScore,
        },
        {
          id: 'best_tenant',
          badge_type: 'best_tenant',
          title: 'Meilleur Locataire',
          description: 'Plus de 10 avis et Trust Score > 90',
          icon: <Zap className="w-6 h-6" />,
          color: 'bg-amber-100 text-amber-700 border-amber-200',
          earned: reviewCount >= 10 && trustScore > 90,
          progress: reviewCount,
        },
      ];

      setBadges(trustBadges);
    } catch (error) {
      console.error('Error loading badges:', error);
    }
  };

  const handleEditReview = (review: Review) => {
    setSelectedReview(review);
    setEditModalOpen(true);
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet avis ?')) return;

    try {
      const { error } = await supabase
        .from('property_ratings')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;

      loadReviews();
      loadBadges();
    } catch (error) {
      console.error('Error deleting review:', error);
      alert('Erreur lors de la suppression de l\'avis');
    }
  };

  const handleUpdateReview = async (ratingData: PropertyRating) => {
    if (!selectedReview) return;

    try {
      const { error } = await supabase
        .from('property_ratings')
        .update({
          overall_rating: ratingData.overall_rating,
          location_rating: ratingData.location_rating,
          condition_rating: ratingData.condition_rating,
          value_rating: ratingData.value_rating,
          communication_rating: ratingData.communication_rating,
          comment: ratingData.comment,
          would_recommend: ratingData.would_recommend,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedReview.id);

      if (error) {
        // Table doesn't exist or other error
        if (error.code === 'PGRST204' || error.code === 'PGRST205') {
          alert('La fonctionnalité des avis n\'est pas encore disponible. Veuillez contacter le support.');
        } else {
          throw error;
        }
        return;
      }

      setEditModalOpen(false);
      loadReviews();
    } catch (error) {
      console.error('Error updating review:', error);
      alert('Erreur lors de la mise à jour de l\'avis');
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

  const getAverageRating = (review: Review) => {
    const ratings = [
      review.overall_rating,
      review.location_rating,
      review.condition_rating,
      review.value_rating,
      review.communication_rating,
    ];
    return (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
  };

  return (
    <TenantDashboardLayout title="Mes Avis">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-[#2C1810] rounded-[20px] p-6 mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-[#F16522] flex items-center justify-center">
              <Star className="h-6 w-6 text-white" />
            </div>
            <span>Mes Avis</span>
          </h1>
          <p className="text-[#E8D4C5] text-lg ml-15">
            Gérez vos avis et améliorez votre Trust Score
          </p>
        </div>

        {/* Trust Badges Section */}
        <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9]">
          <h2 className="text-xl font-bold text-[#2C1810] mb-4 flex items-center gap-2">
            <Award className="h-6 w-6 text-[#F16522]" />
            <span>Badges de Confiance</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className={`relative p-4 rounded-xl border-2 transition-all ${
                  badge.earned
                    ? `${badge.color} bg-opacity-10`
                    : 'bg-gray-50 border-gray-200 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      badge.earned ? badge.color.split(' ')[0] : 'bg-gray-200'
                    }`}
                  >
                    {badge.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">{badge.title}</h3>
                    <p className="text-xs mt-1 opacity-80">{badge.description}</p>
                    {badge.progress !== undefined && !badge.earned && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-[#F16522] h-1.5 rounded-full transition-all"
                            style={{
                              width: `${Math.min(
                                badge.badge_type === 'best_tenant'
                                  ? (badge.progress / 10) * 100
                                  : badge.progress,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                    {badge.earned && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold mt-2">
                        <Shield className="w-3 h-3" />
                        Obtenu
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
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
              En attente de réponse
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
            <p className="text-[#6B5A4E] mb-6">
              Vous n'avez pas encore laissé d'avis. Laissez votre premier avis après une visite !
            </p>
            <button
              onClick={() => navigate('/recherche')}
              className="bg-[#F16522] hover:bg-[#d9571d] text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              Découvrir des logements
            </button>
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
                      <span className="px-2 py-1 rounded-full bg-[#FAF7F4] text-[#6B5A4E]">
                        {review.visit_id ? 'Après visite' : 'Après emménagement'}
                      </span>
                      {review.would_recommend && (
                        <span className="px-2 py-1 rounded-full bg-green-100 text-green-700">
                          Recommandé
                        </span>
                      )}
                      <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-600 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(review.created_at), 'd MMM yyyy', { locale: fr })}
                      </span>
                      {review.is_editable && (
                        <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                          Modifiable (30j)
                        </span>
                      )}
                    </div>

                    {/* Owner Response */}
                    {review.owner_response && (
                      <div className="bg-[#FAF7F4] rounded-lg p-3 mb-3 border border-[#EFEBE9]">
                        <div className="flex items-center gap-2 mb-1">
                          <MessageSquare className="w-4 h-4 text-[#F16522]" />
                          <span className="text-xs font-semibold text-[#2C1810]">
                            Réponse du propriétaire
                          </span>
                        </div>
                        <p className="text-sm text-[#6B5A4E]">{review.owner_response}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {review.is_editable && (
                        <button
                          onClick={() => handleEditReview(review)}
                          className="flex items-center gap-1 text-xs font-medium text-[#F16522] hover:underline px-2 py-1 rounded hover:bg-[#FAF7F4] transition-colors"
                        >
                          <Edit3 className="w-3 h-3" />
                          Modifier
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteReview(review.id)}
                        className="flex items-center gap-1 text-xs font-medium text-red-600 hover:underline px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        Supprimer
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
      </div>

      {/* Edit Modal */}
      {selectedReview && (
        <PropertyRatingDialog
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedReview(null);
          }}
          onSubmit={handleUpdateReview}
          propertyTitle={selectedReview.property_title}
          propertyAddress={selectedReview.property_city}
          initialRating={{
            overall_rating: selectedReview.overall_rating,
            location_rating: selectedReview.location_rating,
            condition_rating: selectedReview.condition_rating,
            value_rating: selectedReview.value_rating,
            communication_rating: selectedReview.communication_rating,
            comment: selectedReview.comment,
            would_recommend: selectedReview.would_recommend,
          }}
        />
      )}
    </TenantDashboardLayout>
  );
}
