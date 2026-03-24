import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/services/supabase/client';
import {
  Calendar,
  Video,
  MapPin,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { AddressValue, formatAddress } from '@/shared/utils/address';

interface Property {
  id: string;
  title: string;
  address: AddressValue;
  city: string;
  main_image: string | null;
  owner_id: string | null;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

const DEFAULT_TIME_SLOTS: TimeSlot[] = [
  { time: '09:00', available: true },
  { time: '10:00', available: true },
  { time: '11:00', available: true },
  { time: '14:00', available: true },
  { time: '15:00', available: true },
  { time: '16:00', available: true },
  { time: '17:00', available: true },
];

export default function ScheduleVisit() {
  const { user } = useAuth();
  const { id: routeId } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const initialProperty = (location.state as { property?: Property } | null)?.property ?? null;
  const [property, setProperty] = useState<Property | null>(initialProperty);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [visitType, setVisitType] = useState<'in_person' | 'virtual'>('in_person');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const propertyId = routeId || window.location.pathname.split('/').pop();

   
  useEffect(() => {
    if (propertyId && !property) {
      loadProperty();
    } else {
      setLoading(false);
    }
  }, [propertyId, property]);

   
  useEffect(() => {
    if (selectedDate && property) {
      loadAvailableSlots();
    }
  }, [selectedDate, property]);

  const loadProperty = async () => {
    if (!propertyId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, title, address, city, main_image, owner_id')
        .eq('id', propertyId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setProperty(null);
        return;
      }
      setProperty(data as Property);
    } catch (error) {
      console.error('Error loading property:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSlots = async () => {
    if (!selectedDate || !property) return;

    const dateStr = selectedDate.toISOString().split('T')[0] ?? '';
    const nextDay = new Date(selectedDate);
    nextDay.setDate(selectedDate.getDate() + 1);
    const nextStr = nextDay.toISOString().split('T')[0] ?? '';

    try {
      const { data: existingVisits } = await supabase
        .from('visit_requests')
        .select('visit_date, visit_time')
        .eq('property_id', property.id)
        .in('status', ['pending', 'confirmed'])
        .gte('visit_date', dateStr)
        .lt('visit_date', nextStr);

      const bookedTimesSet = new Set(
        (existingVisits || []).map((v) => v.visit_time).filter(Boolean)
      );

      const slots = DEFAULT_TIME_SLOTS.map((slot) => ({
        ...slot,
        available: !bookedTimesSet.has(slot.time),
      }));

      setBookedTimes(Array.from(bookedTimesSet));
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error loading slots:', error);
      setBookedTimes([]);
      setAvailableSlots(DEFAULT_TIME_SLOTS);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !property || !selectedDate || !selectedTime) return;

    setSubmitting(true);
    try {
      const parts = selectedTime.split(':');
      const hoursStr = parts[0] ?? '0';
      const minutesStr = parts[1] ?? '0';
      const hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);
      const visitDate = new Date(selectedDate);
      if (!isNaN(hours)) visitDate.setHours(hours, minutes || 0, 0, 0);

      const visitDateStr = selectedDate.toISOString().split('T')[0];

      const { error } = await supabase.from('visit_requests').insert({
        property_id: property.id,
        tenant_id: user.id,
        owner_id: property.owner_id,
        visit_type: visitType,
        visit_date: visitDateStr,
        visit_time: selectedTime,
        status: 'pending',
      } as never);

      if (error) throw error;

      // Envoyer une notification au propriétaire via l'Edge Function
      try {
        const { data: notifData, error: notifError } = await supabase.functions.invoke('create-visit-notification', {
          body: {
            action: 'new',
            property_id: property.id,
            tenant_id: user.id,
            owner_id: property.owner_id,
            visit_date: visitDateStr,
            visit_time: selectedTime,
            visit_type: visitType,
            property_title: property.title,
          },
        });

        if (notifError) {
          console.error('Erreur lors de l\'envoi de la notification:', notifError);
        } else {
          console.log('Notification envoyée avec succès:', notifData);
        }
      } catch (notifError) {
        console.error('Erreur lors de l\'envoi de la notification:', notifError);
        // Ne pas bloquer le succès si la notification échoue
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/locataire/mes-visites');
      }, 1500);
    } catch (error) {
      console.error('Error scheduling visit:', error);
      alert('Erreur lors de la planification de la visite');
    } finally {
      setSubmitting(false);
    }
  };

  const formatMonthLabel = (date: Date) =>
    date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const getCalendarDays = (month: Date) => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const firstDay = new Date(year, monthIndex, 1);
    const startOffset = (firstDay.getDay() + 6) % 7; // Monday start
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const cells: Array<Date | null> = [];

    for (let i = 0; i < startOffset; i += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(year, monthIndex, day));
    }

    while (cells.length < 42) {
      cells.push(null);
    }

    return cells;
  };

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const calendarDays = getCalendarDays(currentMonth);
  const availableCount = availableSlots.filter((slot) => slot.available).length;
  const isTimeBooked = selectedTime ? bookedTimes.includes(selectedTime) : false;

  if (!user) {
    return (
      <div className="form-page-container flex items-center justify-center">
        <div className="form-section-premium text-center max-w-md">
          <Calendar className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--form-sable)' }} />
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--form-chocolat)' }}>
            Connexion requise
          </h2>
          <p className="mb-4" style={{ color: 'var(--form-sable)' }}>
            Veuillez vous connecter pour planifier une visite
          </p>
          <a href="/connexion" className="form-button-primary">
            Se connecter
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="form-page-container flex items-center justify-center">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
            style={{ borderColor: 'var(--form-orange)' }}
          ></div>
          <p style={{ color: 'var(--form-sable)' }}>Chargement...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="form-page-container flex items-center justify-center">
        <div className="form-section-premium text-center max-w-md">
          <p className="mb-4" style={{ color: 'var(--form-sable)' }}>
            Propriété non trouvée ou inaccessible.
          </p>
          <div className="flex justify-center gap-3">
            <button onClick={() => navigate(-1)} className="form-button-secondary">
              Retour
            </button>
            <button onClick={() => navigate('/recherche')} className="form-button-primary">
              Voir les biens
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="form-page-container flex items-center justify-center">
        <div className="form-section-premium text-center max-w-md animate-scale-in">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
          >
            <Check className="w-10 h-10" style={{ color: 'var(--form-success)' }} />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--form-chocolat)' }}>
            Visite planifiée avec succès !
          </h2>
          <p className="mb-4" style={{ color: 'var(--form-sable)' }}>
            Vous recevrez une confirmation par email
          </p>
          <p className="text-sm" style={{ color: 'var(--form-orange)' }}>
            Redirection en cours...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="form-page-container">
      <div className="form-content-wrapper px-4">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-6 font-medium transition-all hover:scale-105"
          style={{ color: 'var(--form-orange)' }}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Retour</span>
        </button>

        {/* Property Header */}
        <div className="form-section-premium mb-6">
          <div className="flex items-center gap-4">
            {property.main_image && (
              <img
                src={property.main_image}
                alt={property.title}
                className="w-24 h-24 rounded-xl object-cover"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--form-chocolat)' }}>
                Planifier une visite
              </h1>
              <p style={{ color: 'var(--form-chocolat)' }}>{property.title}</p>
              <p className="text-sm" style={{ color: 'var(--form-sable)' }}>
                {formatAddress(property.address, property.city)}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid lg:grid-cols-[1.05fr,0.95fr] gap-6">
            <div className="space-y-6 order-2 lg:order-1">
              <div className="form-section-premium">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-base font-semibold" style={{ color: 'var(--form-chocolat)' }}>
                      Date & Heure
                    </h2>
                    <p className="text-xs" style={{ color: 'var(--form-sable)' }}>
                      Choisissez votre créneau en un seul endroit.
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full border border-orange-200 bg-orange-50 text-orange-600">
                    {availableCount} créneau(x) dispo
                  </span>
                </div>

                <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
                  <div className="max-w-[320px] mx-auto">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentMonth(
                            new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
                          )
                        }
                        className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:border-orange-300 hover:bg-orange-50 transition"
                      >
                        <ChevronLeft className="w-4 h-4" style={{ color: 'var(--form-orange)' }} />
                      </button>
                      <span
                        className="text-sm font-semibold capitalize"
                        style={{ color: 'var(--form-chocolat)' }}
                      >
                        {formatMonthLabel(currentMonth)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentMonth(
                            new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
                          )
                        }
                        className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:border-orange-300 hover:bg-orange-50 transition"
                      >
                        <ChevronRight className="w-4 h-4" style={{ color: 'var(--form-orange)' }} />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 text-center text-[10px] mb-2">
                      {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
                        <span key={day} style={{ color: 'var(--form-sable)' }}>
                          {day}
                        </span>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1.5">
                      {calendarDays.map((date, index) => {
                        if (!date) {
                          return <div key={`empty-${index}`} className="h-9 w-9" />;
                        }
                        const disabled = date < today;
                        const selected = selectedDate ? isSameDay(date, selectedDate) : false;
                        const isToday = isSameDay(date, today);
                        return (
                          <button
                            key={date.toISOString()}
                            type="button"
                            disabled={disabled}
                            onClick={() => {
                              setSelectedDate(date);
                              setSelectedTime('');
                            }}
                            className={`h-9 w-9 rounded-lg border text-xs font-semibold flex items-center justify-center transition ${
                              disabled
                                ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                                : selected
                                  ? 'bg-orange-500 text-white border-orange-500'
                                  : 'border-gray-200 text-gray-700 hover:border-orange-300 hover:bg-orange-50'
                            } ${isToday && !selected ? 'ring-1 ring-orange-200' : ''}`}
                          >
                            {date.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold" style={{ color: 'var(--form-sable)' }}>
                        Heure souhaitée
                      </label>
                      <input
                        type="time"
                        value={selectedTime}
                        onChange={(e) => setSelectedTime(e.target.value)}
                        disabled={!selectedDate}
                        className="form-input-premium disabled:opacity-50"
                      />
                      <p className="text-xs" style={{ color: 'var(--form-sable)' }}>
                        {selectedDate
                          ? "Saisissez l'heure exacte ou choisissez un créneau proposé."
                          : "Choisissez d'abord une date pour activer l'heure."}
                      </p>
                      {isTimeBooked && (
                        <p className="text-xs text-red-500">
                          Ce créneau est déjà réservé. Choisissez une autre heure.
                        </p>
                      )}
                    </div>

                    <div className="rounded-xl border border-gray-100 bg-white/60 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold" style={{ color: 'var(--form-sable)' }}>
                          Créneaux proposés
                        </span>
                        <span className="text-[10px] font-semibold text-orange-500">
                          {availableCount} dispo
                        </span>
                      </div>
                      {!selectedDate ? (
                        <div className="text-xs" style={{ color: 'var(--form-sable)' }}>
                          Sélectionnez une date pour voir les propositions.
                        </div>
                      ) : availableSlots.length === 0 ? (
                        <div className="text-center py-4 text-xs" style={{ color: 'var(--form-sable)' }}>
                          Aucun créneau disponible pour cette date
                        </div>
                      ) : availableCount === 0 ? (
                        <div className="text-center py-4 text-xs" style={{ color: 'var(--form-sable)' }}>
                          Tous les créneaux sont déjà réservés
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {availableSlots.map((slot) => (
                            <button
                              key={slot.time}
                              type="button"
                              onClick={() => setSelectedTime(slot.time)}
                              disabled={!slot.available}
                              className={`form-toggle-button justify-center ${
                                selectedTime === slot.time ? 'active' : ''
                              } ${!slot.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              {slot.time}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>

            <div className="space-y-6 order-1 lg:order-2">
              <div className="form-section-premium lg:sticky lg:top-6">
                <h3 className="form-label-premium mb-4">Récapitulatif</h3>
                <div className="space-y-3">
                  <div className="flex justify-between gap-4">
                    <span style={{ color: 'var(--form-sable)' }}>Bien</span>
                    <span className="font-semibold text-right" style={{ color: 'var(--form-chocolat)' }}>
                      {property.title}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span style={{ color: 'var(--form-sable)' }}>Type</span>
                    <span className="font-semibold" style={{ color: 'var(--form-chocolat)' }}>
                      {visitType === 'in_person' ? 'Visite physique' : 'Visite virtuelle'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span style={{ color: 'var(--form-sable)' }}>Date</span>
                    <span className="font-semibold" style={{ color: 'var(--form-chocolat)' }}>
                      {selectedDate
                        ? selectedDate.toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                          })
                        : 'Sélectionner une date'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span style={{ color: 'var(--form-sable)' }}>Heure</span>
                    <span className="font-semibold" style={{ color: 'var(--form-orange)' }}>
                      {selectedTime || 'Sélectionner une heure'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50 p-3 text-xs">
                  {isTimeBooked
                    ? 'Ce créneau est déjà réservé. Sélectionnez un autre horaire.'
                    : selectedDate && selectedTime
                      ? 'Créneau sélectionné. Votre demande sera envoyée au propriétaire.'
                      : 'Choisissez une date et un horaire pour confirmer la visite.'}
                </div>
              </div>

              <div className="form-section-premium">
                <label className="form-label-premium mb-3 block">Type de visite</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setVisitType('in_person')}
                    className={`form-card-selectable p-4 text-left ${visitType === 'in_person' ? 'selected' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center">
                        <MapPin className="w-4 h-4" style={{ color: 'var(--form-orange)' }} />
                      </span>
                      <div>
                        <p className="font-semibold" style={{ color: 'var(--form-chocolat)' }}>
                          Visite physique
                        </p>
                        <p className="text-xs" style={{ color: 'var(--form-sable)' }}>
                          Sur place avec le propriétaire
                        </p>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisitType('virtual')}
                    className={`form-card-selectable p-4 text-left ${visitType === 'virtual' ? 'selected' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center">
                        <Video className="w-4 h-4" style={{ color: 'var(--form-orange)' }} />
                      </span>
                      <div>
                        <p className="font-semibold" style={{ color: 'var(--form-chocolat)' }}>
                          Visite virtuelle
                        </p>
                        <p className="text-xs" style={{ color: 'var(--form-sable)' }}>
                          En visio depuis chez vous
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => navigate(-1)} className="form-button-secondary">
              <ArrowLeft className="h-5 w-5" />
              <span>Retour</span>
            </button>
            <button
              type="submit"
              disabled={!selectedDate || !selectedTime || submitting || isTimeBooked}
              className="form-button-primary"
            >
              <Check className="h-5 w-5" />
              <span>{submitting ? 'Planification...' : 'Confirmer la visite'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
