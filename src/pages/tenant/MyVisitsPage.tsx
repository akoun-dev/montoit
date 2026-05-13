import { useEffect, useState } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock, MapPin, Video, X, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import TenantDashboardLayout from '../../features/tenant/components/TenantDashboardLayout';
import { logger } from '@/shared/lib/logger';
import type { Visit, VisitFilter } from '@/types/visit.types';
import { formatAddress } from '@/shared/utils/address';
import PropertyRatingDialog, { type PropertyRating } from '../../features/tenant/components/PropertyRatingDialog';

const statusStyles: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  completed: 'bg-blue-100 text-blue-800',
};

const statusLabels: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  cancelled: 'Annulée',
  completed: 'Terminée',
};

export default function MyVisits() {
  const { user } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<VisitFilter>('all');
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
          visit_date,
          visit_time,
          confirmed_date,
          created_at,
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
        query = query.gte('confirmed_date', today).in('status', ['pending', 'confirmed']);
      } else if (filter === 'past') {
        const today = new Date().toISOString();
        query = query.or(`confirmed_date.lt.${today},status.eq.completed,status.eq.cancelled`);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedVisits: Visit[] = (data || []).map((visit) => {
        const fallbackDate =
          visit.confirmed_date ||
          (visit.visit_date ? `${visit.visit_date}T${visit.visit_time || '00:00'}` : null) ||
          visit.created_at ||
          new Date().toISOString();
        return {
          id: visit.id,
          property_id: visit.property_id,
          visit_type: visit.visit_type || 'in_person',
          visit_date: visit.visit_date || fallbackDate,
          visit_time: visit.visit_time || fallbackDate,
          status: visit.status || 'pending',
          notes: visit.notes,
          feedback: visit.metadata?.feedback || null,
          rating: visit.metadata?.rating || null,
          property: visit.properties,
        };
      });

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
          status: 'cancelled',
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
          status: 'completed',
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
    const value = date.includes('T') ? date : `${date}T00:00:00`;
    return new Date(value).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (dateOrTime: string) => {
    if (/^\d{2}:\d{2}/.test(dateOrTime)) return dateOrTime;
    const d = new Date(dateOrTime);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const getVisitDateLabel = (visit: Visit) => {
    if (visit.visit_date) return formatDate(visit.visit_date);
    return formatDate(new Date().toISOString());
  };

  const getVisitTimeLabel = (visit: Visit) => {
    if (visit.visit_time) return formatTime(visit.visit_time);
    return formatTime(new Date().toISOString());
  };

  const statusCounts = visits.reduce(
    (acc, visit) => {
      acc.total += 1;
      if (visit.status === 'pending' || visit.status === 'confirmed') acc.upcoming += 1;
      if (visit.status === 'completed') acc.completed += 1;
      if (visit.status === 'cancelled') acc.cancelled += 1;
      return acc;
    },
    { total: 0, upcoming: 0, completed: 0, cancelled: 0 }
  );

  if (!user) {
    return (
      <TenantDashboardLayout title="Mes Visites" icon={<Calendar className="h-5 w-5" />} description="Suivez vos visites et préparez votre prochaine rencontre">
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
    <TenantDashboardLayout title="Mes Visites" icon={<Calendar className="h-5 w-5" />} description="Suivez vos visites et préparez votre prochaine rencontre">
      <div className="w-full">
        <div className="bg-[#2C1810] rounded-[24px] p-4 sm:p-6 mb-4 sm:mb-6 text-white">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
            <div className="hidden lg:flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#F16522] flex items-center justify-center flex-shrink-0">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Mes Visites</h1>
                <p className="text-[#E8D4C5] mt-1">
                  Suivez vos visites et préparez votre prochaine rencontre.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center">
              <Link
                to="/recherche"
                className="px-3 sm:px-4 py-2 rounded-xl font-semibold bg-white text-[#F16522] hover:bg-[#FFE7DA] transition text-sm sm:text-base"
              >
                Planifier une visite
              </Link>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold transition ${
                    filter === 'all'
                      ? 'bg-white text-[#F16522]'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  Toutes
                </button>
                <button
                  onClick={() => setFilter('upcoming')}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold transition ${
                    filter === 'upcoming'
                      ? 'bg-white text-[#F16522]'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  À venir
                </button>
                <button
                  onClick={() => setFilter('past')}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold transition ${
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

          <div className="mt-4 sm:mt-5 grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
            {[
              { label: 'Total', value: statusCounts.total },
              { label: 'À venir', value: statusCounts.upcoming },
              { label: 'Terminées', value: statusCounts.completed },
              { label: 'Annulées', value: statusCounts.cancelled },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl bg-white/10 p-3 sm:p-4">
                <p className="text-xs text-[#E8D4C5]">{stat.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          </div>
        ) : visits.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucune visite</h3>
            <p className="text-gray-600 mb-6">Vous n'avez pas encore planifié de visite</p>
            <Link
              to="/recherche"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 transition"
            >
              Rechercher des biens
            </Link>
          </div>
        ) : (
          <div className="grid gap-5">
            {visits.map((visit) => (
              <article
                key={visit.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <div className="grid md:grid-cols-[220px,1fr]">
                  <div className="relative">
                    <img
                      src={visit.property.main_image || 'https://via.placeholder.com/400x300'}
                      alt={visit.property.title}
                      className="w-full h-36 sm:h-44 md:h-full object-cover"
                    />
                    <div className="absolute top-3 left-3">{getStatusBadge(visit.status)}</div>
                    <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/90 text-[#2C1810]">
                      {visit.visit_type === 'in_person' ? 'Visite physique' : 'Visite virtuelle'}
                    </span>
                  </div>
                  <div className="p-4 sm:p-5 space-y-3 sm:space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{visit.property.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {formatAddress(visit.property.address, visit.property.city)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 text-orange-600 text-xs font-semibold">
                        <Calendar className="w-3.5 h-3.5" />
                        {getVisitDateLabel(visit)}
                      </span>
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
                        <Clock className="w-3.5 h-3.5" />
                        {getVisitTimeLabel(visit)}
                      </span>
                    </div>

                    {visit.notes && (
                      <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                        <p className="text-xs font-semibold text-gray-600 mb-1">Note</p>
                        <p className="text-sm text-gray-600">{visit.notes}</p>
                      </div>
                    )}

                    {visit.feedback && (
                      <div className="rounded-xl bg-green-50 border border-green-100 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-green-700">Mon avis</p>
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

                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/propriete/${visit.property_id}`}
                        className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition"
                      >
                        Voir le bien
                      </Link>

                      {(visit.status === 'pending' || visit.status === 'confirmed') && (
                        <button
                          onClick={() => cancelVisit(visit.id)}
                          className="px-4 py-2 rounded-xl bg-red-50 text-red-700 text-sm font-semibold hover:bg-red-100 transition"
                        >
                          Annuler
                        </button>
                      )}

                      {visit.status === 'confirmed' && !visit.feedback && (
                        <button
                          onClick={() => openFeedbackModal(visit)}
                          className="px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition"
                        >
                          Laisser un avis
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
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
                  status: 'completed',
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
