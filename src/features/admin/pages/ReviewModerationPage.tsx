import { useState, useEffect, ChangeEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import {
  Button,
  Textarea,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui';
import { toast } from 'sonner';
import {
  Star,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  User,
  Home,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string | null;
  reviewer_id: string;
  reviewee_id: string | null;
  property_id: string | null;
  review_type: string | null;
  moderation_status: string | null;
  moderation_notes: string | null;
}

interface Profile {
  user_id: string;
  full_name: string;
}

export default function ReviewModerationPage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [moderationNotes, setModerationNotes] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('moderation_status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;

      setReviews(data || []);

      // Load stats
      const { data: allReviews } = await supabase.from('reviews').select('moderation_status');

      if (allReviews) {
        setStats({
          pending: allReviews.filter((r) => r.moderation_status === 'pending').length,
          approved: allReviews.filter((r) => r.moderation_status === 'approved').length,
          rejected: allReviews.filter((r) => r.moderation_status === 'rejected').length,
        });
      }

      // Load profiles
      const userIds = new Set<string>();
      data?.forEach((r) => {
        userIds.add(r.reviewer_id);
        if (r.reviewee_id) userIds.add(r.reviewee_id);
      });

      if (userIds.size > 0) {
        const { data: profilesData } = await supabase.rpc('get_public_profiles_safe', {
          profile_user_ids: Array.from(userIds),
        });

        if (profilesData) {
          const map: Record<string, Profile> = {};
          profilesData.forEach((p: Profile) => {
            map[p.user_id] = p;
          });
          setProfiles(map);
        }
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (review: Review) => {
    try {
      const { error } = await supabase
        .from('reviews')
        .update({
          moderation_status: 'approved',
          moderated_by: user?.id,
          moderated_at: new Date().toISOString(),
        })
        .eq('id', review.id);

      if (error) throw error;

      toast.success('Avis approuvé');
      loadReviews();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error("Erreur lors de l'approbation");
    }
  };

  const handleReject = async () => {
    if (!selectedReview) return;

    try {
      const { error } = await supabase
        .from('reviews')
        .update({
          moderation_status: 'rejected',
          moderation_notes: moderationNotes,
          moderated_by: user?.id,
          moderated_at: new Date().toISOString(),
        })
        .eq('id', selectedReview.id);

      if (error) throw error;

      toast.success('Avis rejeté');
      setShowRejectModal(false);
      setSelectedReview(null);
      setModerationNotes('');
      loadReviews();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du rejet');
    }
  };

  const handleNotesChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setModerationNotes(e.target.value);
  };

  const renderStars = (rating: number) => (
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#2C1810]">Modération des avis</h1>
        <p className="text-muted-foreground">Validez ou rejetez les avis en attente</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-[#EFEBE9] p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-yellow-100">
            <Clock className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.pending}</p>
            <p className="text-sm text-muted-foreground">En attente</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#EFEBE9] p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-100">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.approved}</p>
            <p className="text-sm text-muted-foreground">Approuvés</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#EFEBE9] p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-100">
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.rejected}</p>
            <p className="text-sm text-muted-foreground">Rejetés</p>
          </div>
        </div>
      </div>

      {/* Reviews Queue */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#F16522]" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#EFEBE9] p-12 text-center">
          <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
          <h3 className="font-semibold text-[#2C1810] mb-2">File d'attente vide</h3>
          <p className="text-muted-foreground">Tous les avis ont été traités.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => {
            const reviewer = profiles[review.reviewer_id];
            const reviewee = review.reviewee_id ? profiles[review.reviewee_id] : null;

            return (
              <div key={review.id} className="bg-white rounded-xl border border-[#EFEBE9] p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#EFEBE9] flex items-center justify-center">
                      <User className="w-5 h-5 text-[#2C1810]" />
                    </div>
                    <div>
                      <p className="font-medium text-[#2C1810]">
                        {reviewer?.full_name || 'Utilisateur'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {review.created_at &&
                          format(new Date(review.created_at), 'dd MMM yyyy à HH:mm', {
                            locale: fr,
                          })}
                      </p>
                    </div>
                  </div>
                  {renderStars(review.rating)}
                </div>

                {/* Target */}
                <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                  {review.property_id ? (
                    <>
                      <Home className="w-4 h-4" />
                      <span>Avis sur une propriété</span>
                    </>
                  ) : reviewee ? (
                    <>
                      <User className="w-4 h-4" />
                      <span>Avis sur {reviewee.full_name}</span>
                    </>
                  ) : null}
                </div>

                {/* Comment */}
                {review.comment && (
                  <div className="p-4 bg-[#FAF7F4] rounded-lg mb-4">
                    <p className="text-[#2C1810]">{review.comment}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4 border-t border-[#EFEBE9]">
                  <Button
                    onClick={() => handleApprove(review)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approuver
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      setSelectedReview(review);
                      setShowRejectModal(true);
                    }}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Rejeter
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter l'avis</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  L'auteur de l'avis sera notifié du rejet. Précisez la raison pour aider à
                  améliorer les futurs avis.
                </p>
              </div>
            </div>
            <Textarea
              placeholder="Raison du rejet (optionnel)..."
              value={moderationNotes}
              onChange={handleNotesChange}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectModal(false)}>
              Annuler
            </Button>
            <Button variant="danger" onClick={handleReject}>
              Confirmer le rejet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
