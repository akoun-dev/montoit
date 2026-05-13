import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Star,
  Flag,
  Check,
  X,
  Eye,
  Filter,
  Search,
  Trash2,
  AlertCircle,
  ThumbsDown,
  Calendar,
  User,
  MapPin,
  MessageSquare,
  Loader2,
  Ban,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Dialog } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/Button';

interface Review {
  id: string;
  reviewer_id: string;
  reviewee_id: string;
  property_id: string | null;
  rating: number;
  comment: string | null;
  review_type: string | null;
  moderation_status: 'pending' | 'approved' | 'rejected' | 'flagged';
  is_visible: boolean;
  created_at: string;
  helpful_count: number;
  response: string | null;
  response_at: string | null;
  reporter_count?: number;
  reviewer?: {
    full_name: string | null;
    email: string | null;
  };
  reviewee?: {
    full_name: string | null;
    email: string | null;
  };
  property?: {
    title: string | null;
    city: string | null;
  };
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected' | 'flagged';
type SortBy = 'created_at' | 'rating' | 'helpful_count' | 'reporter_count';

export default function ReviewModerationPage() {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('created_at');
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    flagged: 0,
    total: 0,
  });

  useEffect(() => {
    loadReviews();
    loadStats();
  }, [filterStatus, sortBy]);

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('moderation_status')
        .not('moderation_status', 'is', null);

      if (!error && data) {
        const stats = {
          pending: data.filter((r) => r.moderation_status === 'pending').length,
          approved: data.filter((r) => r.moderation_status === 'approved').length,
          rejected: data.filter((r) => r.moderation_status === 'rejected').length,
          flagged: data.filter((r) => r.moderation_status === 'flagged').length,
          total: data.length,
        };
        setStats(stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadReviews = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('reviews')
        .select(`
          *,
          reviewer:profiles!reviews_reviewer_id_fkey(full_name, email),
          reviewee:profiles!reviews_reviewee_id_fkey(full_name, email),
          property:properties(id, title, city)
        `)
        .not('moderation_status', 'is', null);

      if (filterStatus !== 'all') {
        query = query.eq('moderation_status', filterStatus);
      }

      // Order by
      const orderColumn = sortBy === 'reporter_count' ? 'helpful_count' : sortBy;
      query = query.order(orderColumn, { ascending: false });

      const { data, error } = await query.limit(100);

      if (error) throw error;

      const reviewsWithFlags = (data || []).map((review) => ({
        ...review,
        reporter_count: review.helpful_count < 0 ? Math.abs(review.helpful_count) : 0,
      }));

      setReviews(reviewsWithFlags);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (reviewId: string) => {
    try {
      setActionLoading(reviewId);
      const { error } = await supabase
        .from('reviews')
        .update({
          moderation_status: 'approved',
          is_visible: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reviewId);

      if (error) throw error;

      await loadReviews();
      await loadStats();
    } catch (error) {
      console.error('Error approving review:', error);
      alert('Erreur lors de l\'approbation de l\'avis');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (reviewId: string) => {
    try {
      setActionLoading(reviewId);
      const { error } = await supabase
        .from('reviews')
        .update({
          moderation_status: 'rejected',
          is_visible: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reviewId);

      if (error) throw error;

      await loadReviews();
      await loadStats();
    } catch (error) {
      console.error('Error rejecting review:', error);
      alert('Erreur lors du rejet de l\'avis');
    } finally {
      setActionLoading(null);
    }
  };

  const handleFlag = async (reviewId: string) => {
    try {
      setActionLoading(reviewId);
      const { error } = await supabase
        .from('reviews')
        .update({
          moderation_status: 'flagged',
          is_visible: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reviewId);

      if (error) throw error;

      await loadReviews();
      await loadStats();
    } catch (error) {
      console.error('Error flagging review:', error);
      alert('Erreur lors du signalement de l\'avis');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet avis de manière permanente ?')) return;

    try {
      setActionLoading(reviewId);
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;

      await loadReviews();
      await loadStats();
      setSelectedReview(null);
    } catch (error) {
      console.error('Error deleting review:', error);
      alert('Erreur lors de la suppression de l\'avis');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredReviews = reviews.filter((review) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      review.comment?.toLowerCase().includes(query) ||
      review.reviewer?.full_name?.toLowerCase().includes(query) ||
      review.reviewee?.full_name?.toLowerCase().includes(query) ||
      review.property?.title?.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      flagged: 'bg-orange-100 text-orange-800 border-orange-200',
    };

    const labels = {
      pending: 'En attente',
      approved: 'Approuvé',
      rejected: 'Rejeté',
      flagged: 'Signalé',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FAF7F4]">
      {/* Header */}
      <div className="bg-[#2C1810]">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#F16522] flex items-center justify-center">
              <Flag className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Modération des Avis</h1>
              <p className="text-[#E8D4C5] mt-1">Gérez et modérez les avis des utilisateurs</p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl p-4 border border-[#EFEBE9]">
            <p className="text-sm text-[#6B5A4E]">Total</p>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.total}</p>
          </div>
          <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
            <p className="text-sm text-yellow-800">En attente</p>
            <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
            <p className="text-sm text-green-800">Approuvés</p>
            <p className="text-2xl font-bold text-green-900">{stats.approved}</p>
          </div>
          <div className="bg-red-50 rounded-xl p-4 border border-red-200">
            <p className="text-sm text-red-800">Rejetés</p>
            <p className="text-2xl font-bold text-red-900">{stats.rejected}</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
            <p className="text-sm text-orange-800">Signalés</p>
            <p className="text-2xl font-bold text-orange-900">{stats.flagged}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 border border-[#EFEBE9]">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Search className="w-5 h-5 text-[#6B5A4E]" />
              <input
                type="text"
                placeholder="Rechercher par commentaire, auteur, propriété..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 border border-[#EFEBE9] rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-[#6B5A4E]" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className="px-4 py-2 border border-[#EFEBE9] rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-transparent"
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="approved">Approuvés</option>
                <option value="rejected">Rejetés</option>
                <option value="flagged">Signalés</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="px-4 py-2 border border-[#EFEBE9] rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-transparent"
              >
                <option value="created_at">Plus récents</option>
                <option value="rating">Note</option>
                <option value="helpful_count">Utile</option>
              </select>
            </div>
          </div>
        </div>

        {/* Reviews List */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#F16522]" />
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-[#EFEBE9]">
            <MessageSquare className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-bold text-[#2C1810] mb-2">Aucun avis</h3>
            <p className="text-[#6B5A4E]">
              {searchQuery ? 'Aucun avis ne correspond à votre recherche' : 'Aucun avis à modérer'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <div
                key={review.id}
                className="bg-white rounded-xl p-6 border border-[#EFEBE9] hover:shadow-lg transition-shadow"
              >
                <div className="flex gap-4">
                  {/* Rating Section */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-xl bg-[#FAF7F4] flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-[#2C1810]">{review.rating}</p>
                        <div className="flex justify-center">
                          {renderStars(review.rating)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getStatusBadge(review.moderation_status)}
                          {review.reporter_count && review.reporter_count > 0 && (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                              <Flag className="w-3 h-3 inline mr-1" />
                              {review.reporter_count} signalement(s)
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-[#6B5A4E]">
                        {format(new Date(review.created_at), 'd MMM yyyy', { locale: fr })}
                      </p>
                    </div>

                    <p className="text-sm text-[#6B5A4E] mb-2">
                      <span className="font-semibold text-[#2C1810]">
                        {review.reviewer?.full_name || 'Utilisateur'}
                      </span>
                      {' '}→{' '}
                      <span className="font-semibold text-[#2C1810]">
                        {review.reviewee?.full_name || 'Utilisateur'}
                      </span>
                      {review.property && (
                        <>
                          {' '}•{' '}
                          <span className="text-[#6B5A4E]">
                            <MapPin className="w-3 h-3 inline mr-1" />
                            {review.property.title}, {review.property.city}
                          </span>
                        </>
                      )}
                    </p>

                    {review.comment && (
                      <p className="text-sm text-[#2C1810] line-clamp-2 mb-2">{review.comment}</p>
                    )}

                    {review.response && (
                      <div className="bg-[#FAF7F4] rounded-lg p-3 mb-2 border border-[#EFEBE9]">
                        <p className="text-xs font-semibold text-[#2C1810] mb-1">Réponse:</p>
                        <p className="text-sm text-[#6B5A4E]">{review.response}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedReview(review)}
                        className="text-[#F16522] hover:text-[#d9571d]"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Voir détails
                      </Button>

                      {review.moderation_status === 'pending' || review.moderation_status === 'flagged' ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleApprove(review.id)}
                            disabled={actionLoading === review.id}
                            className="text-green-600 hover:text-green-700"
                          >
                            {actionLoading === review.id ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4 mr-1" />
                            )}
                            Approuver
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReject(review.id)}
                            disabled={actionLoading === review.id}
                            className="text-red-600 hover:text-red-700"
                          >
                            {actionLoading === review.id ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <X className="w-4 h-4 mr-1" />
                            )}
                            Rejeter
                          </Button>
                        </>
                      ) : null}

                      {review.moderation_status === 'approved' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFlag(review.id)}
                          disabled={actionLoading === review.id}
                          className="text-orange-600 hover:text-orange-700"
                        >
                          {actionLoading === review.id ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <Flag className="w-4 h-4 mr-1" />
                          )}
                          Signaler
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedReview(review)}
                        disabled={actionLoading === review.id}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Supprimer
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedReview} onOpenChange={() => setSelectedReview(null)}>
        <div className="bg-white rounded-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          {selectedReview && (
            <>
              <div className="p-6 border-b border-[#EFEBE9]">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-[#2C1810]">Détails de l'avis</h2>
                    <p className="text-sm text-[#6B5A4E] mt-1">
                      ID: {selectedReview.id}
                    </p>
                  </div>
                  {getStatusBadge(selectedReview.moderation_status)}
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl bg-[#FAF7F4] flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-[#2C1810]">{selectedReview.rating}</p>
                      <p className="text-xs text-[#6B5A4E]">/ 5</p>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-[#6B5A4E]">Note globale</p>
                    <div className="mt-1">{renderStars(selectedReview.rating)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#FAF7F4] rounded-lg p-4">
                    <p className="text-xs text-[#6B5A4E] mb-1">Auteur</p>
                    <p className="font-semibold text-[#2C1810]">
                      {selectedReview.reviewer?.full_name || 'Utilisateur'}
                    </p>
                    <p className="text-sm text-[#6B5A4E]">
                      {selectedReview.reviewer?.email || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-[#FAF7F4] rounded-lg p-4">
                    <p className="text-xs text-[#6B5A4E] mb-1">Destinataire</p>
                    <p className="font-semibold text-[#2C1810]">
                      {selectedReview.reviewee?.full_name || 'Utilisateur'}
                    </p>
                    <p className="text-sm text-[#6B5A4E]">
                      {selectedReview.reviewee?.email || 'N/A'}
                    </p>
                  </div>
                </div>

                {selectedReview.property && (
                  <div className="bg-[#FAF7F4] rounded-lg p-4">
                    <p className="text-xs text-[#6B5A4E] mb-1">Propriété concernée</p>
                    <p className="font-semibold text-[#2C1810]">
                      {selectedReview.property.title}
                    </p>
                    <p className="text-sm text-[#6B5A4E]">
                      <MapPin className="w-3 h-3 inline mr-1" />
                      {selectedReview.property.city}
                    </p>
                  </div>
                )}

                {selectedReview.comment && (
                  <div>
                    <p className="text-xs text-[#6B5A4E] mb-2">Commentaire</p>
                    <p className="text-sm text-[#2C1810] bg-[#FAF7F4] rounded-lg p-4">
                      {selectedReview.comment}
                    </p>
                  </div>
                )}

                {selectedReview.response && (
                  <div>
                    <p className="text-xs text-[#6B5A4E] mb-2">Réponse</p>
                    <p className="text-sm text-[#2C1810] bg-[#FAF7F4] rounded-lg p-4">
                      {selectedReview.response}
                    </p>
                    <p className="text-xs text-[#6B5A4E] mt-1">
                      {selectedReview.response_at &&
                        format(new Date(selectedReview.response_at), 'd MMM yyyy à HH:mm', { locale: fr })}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-[#6B5A4E]">Date de création</p>
                    <p className="font-semibold text-[#2C1810]">
                      {format(new Date(selectedReview.created_at), 'd MMM yyyy à HH:mm', { locale: fr })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6B5A4E]">Visibilité</p>
                    <p className="font-semibold text-[#2C1810]">
                      {selectedReview.is_visible ? 'Visible' : 'Masqué'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6B5A4E]">Votes utiles</p>
                    <p className="font-semibold text-[#2C1810]">{selectedReview.helpful_count}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6B5A4E]">Type d'avis</p>
                    <p className="font-semibold text-[#2C1810] capitalize">
                      {selectedReview.review_type || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-[#EFEBE9] flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setSelectedReview(null)}
                >
                  Fermer
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(selectedReview.id)}
                  disabled={actionLoading === selectedReview.id}
                >
                  {actionLoading === selectedReview.id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Supprimer définitivement
                </Button>
              </div>
            </>
          )}
        </div>
      </Dialog>
    </div>
  );
}
