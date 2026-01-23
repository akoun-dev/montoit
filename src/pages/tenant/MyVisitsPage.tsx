import { useEffect, useState } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock, MapPin, Video, X, MessageCircle, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import TenantDashboardLayout from '../../features/tenant/components/TenantDashboardLayout';
import { logger } from '@/shared/lib/logger';
import type { Visit, VisitFilter } from '@/types/visit.types';
import { formatAddress } from '@/shared/utils/address';
import PropertyRatingDialog, { type PropertyRating } from '../../features/tenant/components/PropertyRatingDialog';

const statusStyles: Record<string, string> = {
  en_attente: 'bg-yellow-100 text-yellow-800',
  confirmee: 'bg-green-100 text-green-800',
  annulee: 'bg-red-100 text-red-800',
  terminee: 'bg-blue-100 text-blue-800',
};

const statusLabels: Record<string, string> = {
  en_attente: 'En attente',
  confirmee: 'Confirmée',
  annulee: 'Annulée',
  terminee: 'Terminée',
};

export default function MyVisits() {
  const { user } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<VisitFilter>('upcoming');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(0);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    if (user) {
      loadVisits();
    }
  }, [user, filter]);

  const loadVisits = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('visit_requests')
        .select(
          `
          id,
          property_id,
          visit_type,
          confirmed_date,
          status,
          notes,
          metadata,
          properties!inner(id, title, address, city, main_image)
        `
        )
        .eq('tenant_id', user.id)
        .order('confirmed_date', { ascending: false });

      if (filter === 'upcoming') {
        const today = new Date().toISOString();
        query = query.gte('confirmed_date', today).in('status', ['en_attente', 'confirmee']);
      } else if (filter === 'past') {
        const today = new Date().toISOString();
        query = query.or(`confirmed_date.lt.${today},status.eq.terminee,status.eq.annulee`);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedVisits: Visit[] = (data || []).map((visit) => ({
        id: visit.id,
        property_id: visit.property_id,
        visit_type: visit.visit_type || 'physique',
        visit_date: visit.confirmed_date || visit.created_at,
        visit_time: visit.confirmed_date || visit.created_at,
        status: visit.status || 'en_attente',
        notes: visit.notes,
        feedback: visit.metadata?.feedback || null,
        rating: visit.metadata?.rating || null,
        property: visit.properties,
      }));

      setVisits(formattedVisits);
    } catch (error) {
      logger.error('Failed to load visits', error instanceof Error ? error : undefined, {
        userId: user.id,
        filter,
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelVisit = async (visitId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette visite ?')) return;

    try {
      const { error } = await supabase
        .from('visit_requests')
        .update({
          status: 'annulee',
          cancelled_at: new Date().toISOString(),
          rejection_reason: 'Annulée par le visiteur',
        })
        .eq('id', visitId);

      if (error) throw error;
      loadVisits();
    } catch (error) {
      logger.error('Failed to cancel visit', error instanceof Error ? error : undefined, {
        visitId,
      });
      alert("Erreur lors de l'annulation de la visite");
    }
  };

  const openFeedbackModal = (visit: Visit) => {
    setSelectedVisit(visit);
    setFeedback(visit.feedback || '');
    setRating(visit.rating || 0);
    setShowFeedbackModal(true);
  };

  const submitFeedback = async () => {
    if (!selectedVisit || rating === 0) return;

    setSubmittingFeedback(true);
    try {
      // Get current metadata
      const { data: currentVisit } = await supabase
        .from('visit_requests')
        .select('metadata')
        .eq('id', selectedVisit.id)
        .single();

      const updatedMetadata = {
        ...(currentVisit?.metadata || {}),
        feedback,
        rating,
        tenant_feedback: feedback,
        tenant_rating: rating,
      };

      const { error } = await supabase
        .from('visit_requests')
        .update({
          metadata: updatedMetadata,
          tenant_attended: true,
          status: 'terminee',
          completed_at: new Date().toISOString(),
        })
        .eq('id', selectedVisit.id);

      if (error) throw error;

      setShowFeedbackModal(false);
      loadVisits();
    } catch (error) {
      logger.error('Failed to submit feedback', error instanceof Error ? error : undefined, {
        visitId: selectedVisit.id,
        rating,
      });
      alert("Erreur lors de l'envoi du feedback");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const getStatusBadge = (status: string) => {
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}
      >
        {statusLabels[status] || status}
      </span>
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  if (!user) {
    return (
      <TenantDashboardLayout title="Mes Visites">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Connexion requise</h2>
            <p className="text-muted-foreground">Veuillez vous connecter pour voir vos visites</p>
          </div>
        </div>
      </TenantDashboardLayout>
    );
  }

  return (
    <TenantDashboardLayout title="Mes Visites">
      <div className="w-full">
        {/* Header Banner */}
        <div className="bg-[#2C1810] rounded-[20px] p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#F16522] flex items-center justify-center flex-shrink-0">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Mes Visites</h1>
                <p className="text-[#E8D4C5] mt-1">Gérez vos visites programmées</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-xl font-semibold transition ${
                  filter === 'all'
                    ? 'bg-white text-[#F16522]'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                Toutes
              </button>
              <button
                onClick={() => setFilter('upcoming')}
                className={`px-4 py-2 rounded-xl font-semibold transition ${
                  filter === 'upcoming'
                    ? 'bg-white text-[#F16522]'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                À venir
              </button>
              <button
                onClick={() => setFilter('past')}
                className={`px-4 py-2 rounded-xl font-semibold transition ${
                  filter === 'past'
                    ? 'bg-white text-[#F16522]'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                Passées
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          </div>
        ) : visits.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucune visite</h3>
            <p className="text-gray-600 mb-6">Vous n'avez pas encore planifié de visite</p>
            <Link to="/recherche" className="btn-primary inline-block">
              Rechercher des biens
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {visits.map((visit) => (
              <div key={visit.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-1/3">
                    <img
                      src={visit.property.main_image || 'https://via.placeholder.com/400x300'}
                      alt={visit.property.title}
                      className="w-full h-48 md:h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {visit.property.title}
                        </h3>
                        <p className="text-gray-600 mb-2">
                          {formatAddress(visit.property.address, visit.property.city)}
                        </p>
                      </div>
                      {getStatusBadge(visit.status)}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center space-x-2 text-gray-700">
                        <Calendar className="w-5 h-5 text-orange-500" />
                        <span>{formatDate(visit.visit_date)}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-700">
                        <Clock className="w-5 h-5 text-orange-500" />
                        <span>{formatTime(visit.visit_time)}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-700">
                        {visit.visit_type === 'physique' ? (
                          <>
                            <MapPin className="w-5 h-5 text-orange-500" />
                            <span>Visite physique</span>
                          </>
                        ) : (
                          <>
                            <Video className="w-5 h-5 text-orange-500" />
                            <span>Visite virtuelle</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-gray-700">
                        <MessageCircle className="w-5 h-5 text-orange-500" />
                        <span>Contact propriétaire</span>
                      </div>
                    </div>

                    {visit.notes && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-semibold text-gray-700 mb-1">Mes notes :</p>
                        <p className="text-sm text-gray-600">{visit.notes}</p>
                      </div>
                    )}

                    {visit.feedback && (
                      <div className="mb-4 p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold text-green-700">Mon avis :</p>
                          <div className="flex items-center space-x-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= (visit.rating || 0)
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-green-600">{visit.feedback}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3">
                      <Link
                        to={`/propriete/${visit.property_id}`}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                      >
                        Voir le bien
                      </Link>

                      {(visit.status === 'en_attente' || visit.status === 'confirmee') && (
                        <button
                          onClick={() => cancelVisit(visit.id)}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                        >
                          Annuler
                        </button>
                      )}

                      {visit.status === 'confirmee' && !visit.feedback && (
                        <button
                          onClick={() => openFeedbackModal(visit)}
                          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                        >
                          Laisser un avis
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showFeedbackModal && selectedVisit && (
        <PropertyRatingDialog
          isOpen={showFeedbackModal}
          onClose={() => {
            setShowFeedbackModal(false);
            setSelectedVisit(null);
          }}
          onSubmit={async (ratingData) => {
            try {
              const { error } = await supabase
                .from('visit_requests')
                .update({
                  metadata: {
                    ...(selectedVisit.metadata || {}),
                    feedback: ratingData.comment,
                    rating: ratingData.overall_rating,
                    location_rating: ratingData.location_rating,
                    condition_rating: ratingData.condition_rating,
                    value_rating: ratingData.value_rating,
                    communication_rating: ratingData.communication_rating,
                    would_recommend: ratingData.would_recommend,
                  },
                  tenant_attended: true,
                  status: 'terminee',
                  completed_at: new Date().toISOString(),
                })
                .eq('id', selectedVisit.id);

              if (error) throw error;

              // Save rating to property_ratings table
              await supabase.from('property_ratings').insert({
                property_id: selectedVisit.property_id,
                tenant_id: user?.id,
                visit_id: selectedVisit.id,
                ...ratingData,
              });

              loadVisits();
            } catch (error) {
              logger.error('Failed to submit rating', error instanceof Error ? error : undefined);
              alert("Erreur lors de l'envoi de l'avis");
            }
          }}
          propertyTitle={selectedVisit.property?.title || 'Propriété'}
          propertyAddress={selectedVisit.property ? formatAddress(selectedVisit.property.address, selectedVisit.property.city) : undefined}
        />
      )}
    </TenantDashboardLayout>
  );
}
