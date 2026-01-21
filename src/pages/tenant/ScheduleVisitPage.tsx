import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/services/supabase/client';
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  ArrowLeft,
  Check,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';
import { FormStepper, FormStepContent, useFormStepper } from '@/shared/ui';
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
  const [visitType, setVisitType] = useState<'physique' | 'virtuelle'>('physique');
  const [notes, setNotes] = useState('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);

  // Form stepper - 3 steps
  const { step, slideDirection, goToStep, nextStep, prevStep } = useFormStepper(1, 3);

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
        .in('status', ['en_attente', 'confirmee'])
        .gte('visit_date', dateStr)
        .lt('visit_date', nextStr);

      const bookedTimes = new Set((existingVisits || []).map((v) => v.visit_time).filter(Boolean));

      const slots = DEFAULT_TIME_SLOTS.map((slot) => ({
        ...slot,
        available: !bookedTimes.has(slot.time),
      }));

      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error loading slots:', error);
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

      const { error } = await supabase.from('visit_requests').insert({
        property_id: property.id,
        tenant_id: user.id,
        owner_id: property.owner_id,
        visit_type: visitType,
        visit_date: selectedDate.toISOString().split('T')[0],
        visit_time: selectedTime,
        notes: notes || null,
        status: 'en_attente',
      } as never);

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        navigate(`/propriete/${property.id}`);
      }, 2000);
    } catch (error) {
      console.error('Error scheduling visit:', error);
      alert('Erreur lors de la planification de la visite');
    } finally {
      setSubmitting(false);
    }
  };

  const getNextDays = (count: number) => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 1; i <= count; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const canProceedToStep2 = visitType !== null;
  const canProceedToStep3 = selectedDate && selectedTime;

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

  const stepLabels = ['Type de visite', 'Date & Heure', 'Confirmation'];

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

        {/* Stepper */}
        <div className="mb-8">
          <FormStepper
            currentStep={step}
            totalSteps={3}
            onStepChange={goToStep}
            labels={stepLabels}
          />
        </div>

        <form onSubmit={handleSubmit}>
          {/* STEP 1: Type de visite */}
          <FormStepContent
            step={1}
            currentStep={step}
            slideDirection={slideDirection}
            className="space-y-6"
          >
            <div className="form-section-premium">
              <label className="form-label-premium mb-4 block">Type de visite</label>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setVisitType('physique')}
                  className={`form-card-selectable p-6 text-center ${visitType === 'physique' ? 'selected' : ''}`}
                >
                  <MapPin
                    className={`w-10 h-10 mx-auto mb-3 ${visitType === 'physique' ? '' : ''}`}
                    style={{
                      color: visitType === 'physique' ? 'var(--form-orange)' : 'var(--form-sable)',
                    }}
                  />
                  <p className="font-semibold" style={{ color: 'var(--form-chocolat)' }}>
                    Visite physique
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--form-sable)' }}>
                    Visitez le bien en personne
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setVisitType('virtuelle')}
                  className={`form-card-selectable p-6 text-center ${visitType === 'virtuelle' ? 'selected' : ''}`}
                >
                  <Video
                    className="w-10 h-10 mx-auto mb-3"
                    style={{
                      color: visitType === 'virtuelle' ? 'var(--form-orange)' : 'var(--form-sable)',
                    }}
                  />
                  <p className="font-semibold" style={{ color: 'var(--form-chocolat)' }}>
                    Visite virtuelle
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--form-sable)' }}>
                    Visitez par vidéo conférence
                  </p>
                </button>
              </div>
            </div>

            <div className="form-actions">
              <div></div>
              <button
                type="button"
                onClick={nextStep}
                disabled={!canProceedToStep2}
                className="form-button-primary"
              >
                <span>Continuer</span>
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </FormStepContent>

          {/* STEP 2: Date & Heure */}
          <FormStepContent
            step={2}
            currentStep={step}
            slideDirection={slideDirection}
            className="space-y-6"
          >
            <div className="form-section-premium">
              <label className="form-label-premium mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Choisir une date
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {getNextDays(14).map((date) => (
                  <button
                    key={date.toISOString()}
                    type="button"
                    onClick={() => {
                      setSelectedDate(date);
                      setSelectedTime('');
                    }}
                    className={`form-card-selectable p-3 text-center ${selectedDate?.toDateString() === date.toDateString() ? 'selected' : ''}`}
                  >
                    <p
                      className="text-sm font-semibold"
                      style={{
                        color:
                          selectedDate?.toDateString() === date.toDateString()
                            ? 'var(--form-orange)'
                            : 'var(--form-chocolat)',
                      }}
                    >
                      {formatDate(date)}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {selectedDate && (
              <div className="form-section-premium">
                <label className="form-label-premium mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Choisir un horaire
                </label>
                {availableSlots.length === 0 ? (
                  <div className="text-center py-8" style={{ color: 'var(--form-sable)' }}>
                    Aucun créneau disponible pour cette date
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.time}
                        type="button"
                        onClick={() => setSelectedTime(slot.time)}
                        disabled={!slot.available}
                        className={`form-toggle-button justify-center ${selectedTime === slot.time ? 'active' : ''} ${!slot.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="form-actions">
              <button type="button" onClick={prevStep} className="form-button-secondary">
                <ArrowLeft className="h-5 w-5" />
                <span>Retour</span>
              </button>
              <button
                type="button"
                onClick={nextStep}
                disabled={!canProceedToStep3}
                className="form-button-primary"
              >
                <span>Continuer</span>
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </FormStepContent>

          {/* STEP 3: Notes & Confirmation */}
          <FormStepContent
            step={3}
            currentStep={step}
            slideDirection={slideDirection}
            className="space-y-6"
          >
            {/* Summary */}
            <div className="form-section-premium" style={{ backgroundColor: 'var(--form-ivoire)' }}>
              <h3 className="form-label-premium mb-4">Récapitulatif</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--form-sable)' }}>Type</span>
                  <span className="font-semibold" style={{ color: 'var(--form-chocolat)' }}>
                    {visitType === 'physique' ? 'Visite physique' : 'Visite virtuelle'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--form-sable)' }}>Date</span>
                  <span className="font-semibold" style={{ color: 'var(--form-chocolat)' }}>
                    {selectedDate?.toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--form-sable)' }}>Heure</span>
                  <span className="font-semibold" style={{ color: 'var(--form-orange)' }}>
                    {selectedTime}
                  </span>
                </div>
              </div>
            </div>

            <div className="form-section-premium">
              <label className="form-label-premium mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Notes supplémentaires (optionnel)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Ajoutez des informations supplémentaires pour le propriétaire..."
                className="form-input-premium form-textarea-premium"
              />
            </div>

            <div className="form-actions">
              <button type="button" onClick={prevStep} className="form-button-secondary">
                <ArrowLeft className="h-5 w-5" />
                <span>Retour</span>
              </button>
              <button
                type="submit"
                disabled={!selectedDate || !selectedTime || submitting}
                className="form-button-primary"
              >
                <Check className="h-5 w-5" />
                <span>{submitting ? 'Planification...' : 'Confirmer la visite'}</span>
              </button>
            </div>
          </FormStepContent>
        </form>
      </div>
    </div>
  );
}
