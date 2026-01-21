import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  Award,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { ScoringService } from '@/services/scoringService';
import { notifyApplicationReceived } from '@/services/notifications/applicationNotificationService';
import { ValidationService } from '@/services/validation';
import { useFormValidation } from '@/hooks/shared/useFormValidation';
import { ValidatedTextarea, FormStepper, FormStepContent, useFormStepper } from '@/shared/ui';
import type { Database } from '@/shared/lib/database.types';

type Property = Database['public']['Tables']['properties']['Row'];

interface ApplicationFormData {
  coverLetter: string;
}

// Extended profile type with new columns
interface ExtendedProfile {
  id: string;
  user_id: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  avatar_url: string | null;
  user_type: string | null;
  profile_setup_completed: boolean | null;
  is_verified?: boolean;
  oneci_verified?: boolean;
  facial_verification_status?: string;
  bio?: string;
}

export default function ApplicationForm() {
  const { user, profile: authProfile } = useAuth();
  const { id: routeId } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const profile = authProfile as ExtendedProfile | null;
  const initialProperty = (location.state as { property?: Property } | null)?.property ?? null;
  const [property, setProperty] = useState<Property | null>(initialProperty);
  const [loading, setLoading] = useState(!initialProperty);
  const [submitting, setSubmitting] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [existingApplication, setExistingApplication] = useState(false);

  // Form stepper
  const { step, slideDirection, goToStep, nextStep, prevStep } = useFormStepper(1, 2);

  // Form validation
  const { validateField, getFieldState, touched } = useFormValidation<ApplicationFormData>();

  useEffect(() => {
    if (!user) {
      navigate('/connexion');
      return;
    }

    const propertyId = routeId || window.location.pathname.split('/').pop();
    if (propertyId && !property) {
      loadProperty(propertyId);
    } else if (property) {
      setLoading(false);
    }
  }, [user, navigate, routeId, property]);

  const loadProperty = async (id: string) => {
    try {
      const { data, error: propError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (propError) throw propError;
      if (!data) {
        navigate('/recherche');
        return;
      }

      setProperty(data);

      // Check for existing application (duplicate detection)
      if (user) {
        const { data: existing } = await supabase
          .from('rental_applications')
          .select('id')
          .eq('property_id', id)
          .eq('tenant_id', user.id)
          .maybeSingle();

        if (existing) {
          setExistingApplication(true);
          setError('Vous avez déjà postulé pour cette propriété');
        }
      }
    } catch (err) {
      console.error('Error loading property:', err);
      setError('Erreur lors du chargement de la propriété');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !property) return;

    // Validate cover letter
    const coverLetterValid = validateField('coverLetter', () =>
      ValidationService.validateMinLength(coverLetter, 50, 'La lettre de motivation')
    );

    if (!coverLetterValid) {
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const applicationScore = calculateApplicationScore();

      const { data: applicationData, error: insertError } = await supabase
        .from('rental_applications')
        .insert({
          property_id: property.id,
          tenant_id: user.id,
          application_message: coverLetter,
          credit_score: applicationScore,
          status: 'en_attente',
        } as never)
        .select('id')
        .single();

      if (insertError) throw insertError;

      // Send notification to owner
      try {
        const appId = (applicationData as { id: string } | null)?.id;
        if (appId) {
          await notifyApplicationReceived(appId);
        }
      } catch (notifError) {
        console.error('Failed to send notification:', notifError);
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la soumission de la candidature');
    } finally {
      setSubmitting(false);
    }
  };

  const calculateApplicationScore = () => {
    return ScoringService.calculateSimpleScore(profile);
  };

  if (loading) {
    return (
      <div className="form-page-container flex items-center justify-center">
        <div
          className="animate-spin rounded-full h-16 w-16 border-b-4"
          style={{ borderColor: 'var(--form-orange)' }}
        ></div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="form-page-container flex items-center justify-center">
        <div className="form-section-premium text-center max-w-md">
          <p className="mb-4" style={{ color: 'var(--form-sable)' }}>
            Propriété introuvable ou inaccessible.
          </p>
          <Link to="/recherche" className="form-button-primary">
            Retour à la recherche
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="form-page-container flex items-center justify-center p-4">
        <div className="form-section-premium max-w-md text-center animate-scale-in">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
          >
            <CheckCircle className="h-12 w-12" style={{ color: 'var(--form-success)' }} />
          </div>
          <h2 className="text-3xl font-bold mb-3" style={{ color: 'var(--form-chocolat)' }}>
            Candidature envoyée!
          </h2>
          <p className="text-lg mb-6" style={{ color: 'var(--form-sable)' }}>
            Votre candidature a été envoyée avec succès au propriétaire. Vous serez notifié de sa
            réponse.
          </p>
          <p className="text-sm font-medium animate-pulse" style={{ color: 'var(--form-orange)' }}>
            Redirection en cours...
          </p>
        </div>
      </div>
    );
  }

  const applicationScore = calculateApplicationScore();
  const facialStatus = profile?.facial_verification_status?.toLowerCase() || '';
  const isFaceVerified = facialStatus === 'verified' || facialStatus === 'verifie';
  const isOneciVerified = profile?.oneci_verified ?? false;

  const stepLabels = ['Informations', 'Motivation'];

  return (
    <div className="form-page-container">
      {/* Header */}
      <div
        className="form-section-premium mb-6"
        style={{ borderRadius: 0, border: 'none', borderBottom: '1px solid var(--form-border)' }}
      >
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={() => window.history.back()}
            className="flex items-center space-x-2 font-medium transition-all duration-300 hover:scale-105"
            style={{ color: 'var(--form-orange)' }}
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Retour</span>
          </button>
        </div>
      </div>

      <div className="form-content-wrapper px-4">
        {/* Property Info Header */}
        <div className="form-section-premium mb-6">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="h-8 w-8" style={{ color: 'var(--form-orange)' }} />
            <h1
              className="text-2xl md:text-3xl font-bold"
              style={{ color: 'var(--form-chocolat)' }}
            >
              Postuler pour cette propriété
            </h1>
          </div>
          <div
            className="p-4 rounded-xl"
            style={{
              backgroundColor: 'var(--form-ivoire)',
              border: '1px solid var(--form-border)',
            }}
          >
            <p className="font-bold text-lg" style={{ color: 'var(--form-chocolat)' }}>
              {property.title}
            </p>
            <p className="flex items-center gap-2 mt-1" style={{ color: 'var(--form-sable)' }}>
              <MapPin className="h-4 w-4" />
              <span>
                {property.city}, {property.neighborhood}
              </span>
            </p>
            <p className="font-bold text-lg mt-2" style={{ color: 'var(--form-orange)' }}>
              {(property.monthly_rent ?? property.price) != null
                ? `${(property.monthly_rent ?? property.price).toLocaleString()} FCFA/mois`
                : 'Prix sur demande'}
            </p>
          </div>
        </div>

        {/* Stepper */}
        <div className="mb-8">
          <FormStepper
            currentStep={step}
            totalSteps={2}
            onStepChange={goToStep}
            labels={stepLabels}
          />
        </div>

        {error && (
          <div className="form-error-message mb-6">
            <strong>Erreur:</strong> {error}
          </div>
        )}

        {!isFaceVerified && (
          <div className="form-error-message mb-6 flex-col items-start gap-3">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6" />
              <strong>Reconnaissance faciale OBLIGATOIRE</strong>
            </div>
            <p>Vous devez compléter la reconnaissance faciale (NeoFace) avant de postuler.</p>
            <Link to="/locataire/profil" className="form-button-primary mt-2">
              Compléter ma reconnaissance faciale →
            </Link>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* STEP 1: Informations personnelles */}
          <FormStepContent
            step={1}
            currentStep={step}
            slideDirection={slideDirection}
            className="space-y-6"
          >
            {/* Personal Info */}
            <div className="form-section-premium">
              <h2
                className="text-xl font-bold mb-6 flex items-center gap-2"
                style={{ color: 'var(--form-chocolat)' }}
              >
                <User className="h-5 w-5" style={{ color: 'var(--form-orange)' }} />
                <span>Informations personnelles</span>
              </h2>
              <div className="space-y-4">
                <div
                  className="flex items-center justify-between py-3 border-b"
                  style={{ borderColor: 'var(--form-border)' }}
                >
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5" style={{ color: 'var(--form-sable)' }} />
                    <span className="form-label-premium mb-0">Nom complet</span>
                  </div>
                  <span className="font-bold" style={{ color: 'var(--form-chocolat)' }}>
                    {profile?.full_name || 'Non renseigné'}
                  </span>
                </div>
                <div
                  className="flex items-center justify-between py-3 border-b"
                  style={{ borderColor: 'var(--form-border)' }}
                >
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5" style={{ color: 'var(--form-sable)' }} />
                    <span className="form-label-premium mb-0">Email</span>
                  </div>
                  <span className="font-bold" style={{ color: 'var(--form-chocolat)' }}>
                    {user?.email}
                  </span>
                </div>
                <div
                  className="flex items-center justify-between py-3 border-b"
                  style={{ borderColor: 'var(--form-border)' }}
                >
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5" style={{ color: 'var(--form-sable)' }} />
                    <span className="form-label-premium mb-0">Téléphone</span>
                  </div>
                  <span className="font-bold" style={{ color: 'var(--form-chocolat)' }}>
                    {profile?.phone || 'Non renseigné'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5" style={{ color: 'var(--form-sable)' }} />
                    <span className="form-label-premium mb-0">Ville</span>
                  </div>
                  <span className="font-bold" style={{ color: 'var(--form-chocolat)' }}>
                    {profile?.city || 'Non renseignée'}
                  </span>
                </div>
              </div>
              <Link
                to="/profil"
                className="text-sm font-bold mt-4 inline-block transition-all hover:scale-105"
                style={{ color: 'var(--form-orange)' }}
              >
                Modifier mes informations →
              </Link>
            </div>

            {/* Verification Status */}
            <div className="form-section-premium">
              <h2
                className="text-xl font-bold mb-6 flex items-center gap-2"
                style={{ color: 'var(--form-chocolat)' }}
              >
                <Shield className="h-5 w-5" style={{ color: 'var(--form-orange)' }} />
                <span>Statut de vérification</span>
              </h2>
              <div className="space-y-4">
                <div
                  className="flex items-center justify-between py-3 border-b"
                  style={{ borderColor: 'var(--form-border)' }}
                >
                  <div>
                    <span className="form-label-premium mb-0">Reconnaissance faciale (NeoFace)</span>
                    <span className="text-xs block" style={{ color: 'var(--form-sable)' }}>
                      Selfie + CNI (obligatoire pour postuler)
                    </span>
                  </div>
                  <span
                    className="font-bold px-4 py-2 rounded-full text-sm"
                    style={{
                      backgroundColor: isFaceVerified ? 'var(--form-success)' : 'var(--form-ivoire)',
                      color: isFaceVerified ? 'white' : 'var(--form-sable)',
                    }}
                  >
                    {isFaceVerified ? '✓ Vérifié' : '✗ Non vérifié'}
                  </span>
                </div>
                <div
                  className="flex items-center justify-between py-3 border-b"
                  style={{ borderColor: 'var(--form-border)' }}
                >
                  <div>
                    <span className="form-label-premium mb-0">Vérification d'identité</span>
                    <span className="text-xs block" style={{ color: 'var(--form-sable)' }}>
                      Document CNI authentifié via ONECI/CNAM
                    </span>
                  </div>
                  <span
                    className="font-bold px-4 py-2 rounded-full text-sm"
                    style={{
                      backgroundColor: isOneciVerified ? 'var(--form-success)' : 'var(--form-ivoire)',
                      color: isOneciVerified ? 'white' : 'var(--form-sable)',
                    }}
                  >
                    {isOneciVerified ? '✓ Vérifié' : '✗ Non vérifié'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="form-label-premium mb-0">Profil complet</span>
                  <span
                    className={`font-bold px-4 py-2 rounded-full text-sm`}
                    style={{
                      backgroundColor: profile?.profile_setup_completed
                        ? 'var(--form-success)'
                        : 'var(--form-ivoire)',
                      color: profile?.profile_setup_completed ? 'white' : 'var(--form-sable)',
                    }}
                  >
                    {profile?.profile_setup_completed ? '✓ Complet' : '✗ Incomplet'}
                  </span>
                </div>
              </div>
            </div>

            {/* Score Preview */}
            <div className="form-section-premium" style={{ backgroundColor: 'var(--form-ivoire)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3
                  className="font-bold text-lg flex items-center gap-2"
                  style={{ color: 'var(--form-chocolat)' }}
                >
                  <Award className="h-6 w-6" style={{ color: 'var(--form-orange)' }} />
                  <span>Score de candidature</span>
                </h3>
                <span className="text-3xl font-bold" style={{ color: 'var(--form-orange)' }}>
                  {applicationScore}/100
                </span>
              </div>
              <div className="bg-white rounded-full h-4 overflow-hidden shadow-inner">
                <div
                  className="h-full transition-all duration-500"
                  style={{ width: `${applicationScore}%`, backgroundColor: 'var(--form-orange)' }}
                />
              </div>
            </div>

            {/* Next Button */}
            <div className="form-actions">
              <div></div>
              <button type="button" onClick={nextStep} className="form-button-primary">
                <span>Continuer</span>
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </FormStepContent>

          {/* STEP 2: Lettre de motivation */}
          <FormStepContent
            step={2}
            currentStep={step}
            slideDirection={slideDirection}
            className="space-y-6"
          >
            <div className="form-section-premium">
              <h2
                className="text-xl font-bold mb-6 flex items-center gap-2"
                style={{ color: 'var(--form-chocolat)' }}
              >
                <FileText className="h-5 w-5" style={{ color: 'var(--form-orange)' }} />
                <span>Lettre de motivation</span>
              </h2>
              <ValidatedTextarea
                name="coverLetter"
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                onBlur={() =>
                  validateField('coverLetter', () =>
                    ValidationService.validateMinLength(coverLetter, 50, 'La lettre de motivation')
                  )
                }
                rows={10}
                required
                placeholder="Présentez-vous et expliquez pourquoi vous souhaitez louer cette propriété... (minimum 50 caractères)"
                error={getFieldState('coverLetter').error}
                touched={touched['coverLetter']}
                isValid={getFieldState('coverLetter').isValid}
                showCharCount
                maxLength={2000}
                helperText={
                  coverLetter.length < 50
                    ? `${coverLetter.length}/50 caractères minimum`
                    : undefined
                }
              />
            </div>

            {/* Terms */}
            <div className="form-section-premium">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="terms"
                  required
                  className="mt-1 w-5 h-5 rounded"
                  style={{ accentColor: 'var(--form-orange)' }}
                />
                <label
                  htmlFor="terms"
                  className="text-sm"
                  style={{ color: 'var(--form-chocolat)' }}
                >
                  Je confirme que toutes les informations fournies sont exactes et j'accepte les{' '}
                  <Link
                    to="/conditions-utilisation"
                    className="font-bold"
                    style={{ color: 'var(--form-orange)' }}
                  >
                    conditions d'utilisation
                  </Link>
                  .
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="form-actions">
              <button type="button" onClick={prevStep} className="form-button-secondary">
                <ArrowLeft className="h-5 w-5" />
                <span>Retour</span>
              </button>
              <button
                type="submit"
                disabled={submitting || !!error || !isFaceVerified || existingApplication}
                className="form-button-primary"
              >
                <FileText className="h-5 w-5" />
                <span>
                  {!isFaceVerified
                    ? 'Reconnaissance faciale requise'
                    : submitting
                      ? 'Envoi en cours...'
                      : 'Envoyer ma candidature'}
                </span>
              </button>
            </div>
          </FormStepContent>
        </form>
      </div>
    </div>
  );
}
