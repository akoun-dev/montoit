import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  FileText,
  CheckCircle,
  XCircle,
  User,
  Phone,
  MapPin,
  Shield,
  Award,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  FolderOpen,
  Home,
  Star,
} from 'lucide-react';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { ScoringService } from '@/services/scoringService';
import { notifyApplicationReceived } from '@/services/notifications/applicationNotificationService';
import { ValidationService } from '@/services/validation';
import { useFormValidation } from '@/hooks/shared/useFormValidation';
import { ValidatedTextarea } from '@/shared/ui';
import { ConfirmationModal } from '@/shared/ui/ConfirmationModal';
import verificationApplicationsService, {
  type VerificationApplication,
  type DossierStatus,
} from '@/features/verification/services/verificationApplications.service';
import type { Database } from '@/shared/lib/database.types';

type Property = Database['public']['Tables']['properties']['Row'];

interface ApplicationFormData {
  coverLetter: string;
}

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

interface VerificationItem {
  id: string;
  label: string;
  description: string;
  points: number;
  completed: boolean;
  actionLink: string;
  actionLabel: string;
  icon: React.ReactNode;
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
  const [applicationScore, setApplicationScore] = useState(0);
  const [showVerificationPanel, setShowVerificationPanel] = useState(false);
  const [dossierApplication, setDossierApplication] = useState<VerificationApplication | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

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

    if (profile) {
      ScoringService.calculateSimpleScore(profile)
        .then(setApplicationScore)
        .catch(() => setApplicationScore(50));
    }

    if (user) {
      loadDossierApplication();
    }
  }, [user, navigate, routeId, property, profile]);

  const loadDossierApplication = async () => {
    if (!user) return;
    try {
      const applications = await verificationApplicationsService.getUserApplications(user.id, 'tenant');
      const activeApp = applications.find(
        (app) => ['pending', 'in_review', 'more_info_requested', 'approved'].includes(app.status)
      ) || applications[0] || null;
      setDossierApplication(activeApp);
    } catch (err) {
      console.error('Error loading dossier:', err);
    }
  };

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

    console.log('[ApplicationForm] Submit started', {
      userId: user.id,
      propertyId: property.id,
      propertyName: property.title,
      applicationScore,
      coverLetterLength: coverLetter.length,
      timestamp: new Date().toISOString(),
    });

    const coverLetterValid = validateField('coverLetter', () =>
      ValidationService.validateMinLength(coverLetter, 50, 'La lettre de motivation')
    );

    if (!coverLetterValid) {
      console.warn('[ApplicationForm] Validation failed', {
        field: 'coverLetter',
        length: coverLetter.length,
        required: 50,
      });
      return;
    }

    console.log('[ApplicationForm] Validation passed');

    // Si score < 70, afficher le modal de confirmation
    if (applicationScore < 70) {
      const missingItems: string[] = [];
      if (!isFaceVerified) missingItems.push('Reconnaissance faciale');
      if (!isOneciVerified) missingItems.push('Vérification ONECI');
      if (!profile?.profile_setup_completed) missingItems.push('Profil complet');
      if (!dossierApplication || dossierApplication.status !== 'approved') {
        missingItems.push('Dossier de vérification');
      }

      console.log('[ApplicationForm] Low score - showing confirmation modal', {
        score: applicationScore,
        missingItems,
        missingCount: missingItems.length,
      });

      setMissingConfirmItems(missingItems);
      setShowConfirmModal(true);
      return;
    }

    // Score OK, soumettre directement
    console.log('[ApplicationForm] Score OK, proceeding to submission');
    await submitApplication();
  };

  const [missingConfirmItems, setMissingConfirmItems] = useState<string[]>([]);

  const submitApplication = async () => {
    if (!user || !property) return;

    console.log('[ApplicationForm] Starting application submission', {
      userId: user.id,
      propertyId: property.id,
      timestamp: new Date().toISOString(),
    });

    setSubmitting(true);
    setError('');
    setShowConfirmModal(false);

    try {
      // Calculer le score final
      console.log('[ApplicationForm] Calculating final score...');
      const finalScore = await ScoringService.calculateSimpleScore(profile);
      console.log('[ApplicationForm] Final score calculated', { finalScore });

      // Insérer la candidature
      console.log('[ApplicationForm] Inserting application into database...');
      const { data: applicationData, error: insertError } = await supabase
        .from('rental_applications')
        .insert({
          property_id: property.id,
          tenant_id: user.id,
          application_message: coverLetter,
          credit_score: finalScore,
          status: 'en_attente',
        } as never)
        .select('id')
        .single();

      if (insertError) {
        console.error('[ApplicationForm] Insert error', {
          error: insertError,
          message: insertError.message,
          code: insertError.code,
        });
        throw insertError;
      }

      const appId = (applicationData as { id: string } | null)?.id;
      console.log('[ApplicationForm] Application inserted successfully', {
        applicationId: appId,
        finalScore,
      });

      // Envoyer la notification
      if (appId) {
        console.log('[ApplicationForm] Sending notification to owner...');
        await notifyApplicationReceived(appId).catch((notifErr) => {
          console.warn('[ApplicationForm] Notification failed (non-critical)', {
            error: notifErr,
          });
        });
        console.log('[ApplicationForm] Notification sent');
      }

      console.log('[ApplicationForm] Application submitted successfully', {
        applicationId: appId,
        propertyId: property.id,
        score: finalScore,
      });

      setSuccess(true);
      setTimeout(() => navigate('/locataire/mes-candidatures'), 2000);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur lors de la soumission';
      console.error('[ApplicationForm] Submission failed', {
        error: err,
        message: errorMsg,
      });
      setError(errorMsg);
    } finally {
      console.log('[ApplicationForm] Submission process ended');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md shadow-sm">
          <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Propriété introuvable</p>
          <Link to="/recherche" className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition">
            Retour à la recherche
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md shadow-sm">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Candidature envoyée !</h2>
          <p className="text-gray-600 mb-4">Votre candidature a été envoyée au propriétaire</p>
          <p className="text-sm text-orange-500 animate-pulse">Redirection...</p>
        </div>
      </div>
    );
  }

  const facialStatus = profile?.facial_verification_status?.toLowerCase() || '';
  const isFaceVerified = facialStatus === 'verified' || facialStatus === 'verifie';
  const isOneciVerified = profile?.oneci_verified ?? false;

  // Calculer les pourcentages individuels de chaque vérification
  const profilePercentage = ScoringService.calculateProfileScore(profile).score;

  // Reconnaissance faciale = 34% du score de vérification (sur 100)
  const facialPercentage = isFaceVerified ? 34 : 0;

  // ONECI = 33% du score de vérification (sur 100)
  const oneciPercentage = isOneciVerified ? 33 : 0;

  const verificationItems: VerificationItem[] = [
    {
      id: 'profile',
      label: 'Profil complet',
      description: 'Informations de base renseignées',
      points: profilePercentage,
      completed: profile?.profile_setup_completed ?? false,
      actionLink: '/locataire/profil',
      actionLabel: 'Compléter',
      icon: <User className="h-5 w-5" />,
    },
    {
      id: 'facial',
      label: 'Reconnaissance faciale',
      description: 'Selfie + CNI vérifiés',
      points: facialPercentage,
      completed: isFaceVerified,
      actionLink: '/verification-biometrique?reset=true',
      actionLabel: 'Vérifier',
      icon: <Shield className="h-5 w-5" />,
    },
    {
      id: 'oneci',
      label: 'Vérification ONECI',
      description: 'Document CNI authentifié',
      points: oneciPercentage,
      completed: isOneciVerified,
      actionLink: '/locataire/verification-oneci',
      actionLabel: 'Vérifier',
      icon: <Award className="h-5 w-5" />,
    },
  ];

  const getDossierStatus = () => {
    if (!dossierApplication) return { label: 'Non commencé', color: 'gray', points: 0 };
    if (dossierApplication.status === 'approved') return { label: 'Validé', color: 'green', points: dossierApplication.completion_percentage || 100 };
    if (dossierApplication.status === 'pending') return { label: 'En attente', color: 'yellow', points: dossierApplication.completion_percentage || 0 };
    if (dossierApplication.status === 'in_review') return { label: 'En vérification', color: 'blue', points: dossierApplication.completion_percentage || 0 };
    if (dossierApplication.status === 'rejected') return { label: 'Refusé', color: 'red', points: 0 };
    return { label: 'À compléter', color: 'purple', points: dossierApplication.completion_percentage || 0 };
  };

  const dossierStatus = getDossierStatus();
  const totalScore = verificationItems.reduce((sum, item) => sum + (item.completed ? item.points : 0), 0) + (dossierStatus.points || 0);
  const maxScore = 100 + 100; // Profile verifications + Dossier

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="w-full px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
          >
            <ChevronLeft className="h-5 w-5" />
            <span>Retour</span>
          </button>
          <div className="flex items-center gap-2">
            <Star className={`h-5 w-5 ${applicationScore >= 70 ? 'text-green-500 fill-green-500' : 'text-orange-500'}`} />
            <span className={`font-bold ${applicationScore >= 70 ? 'text-green-600' : 'text-orange-600'}`}>
              {applicationScore}%
            </span>
          </div>
        </div>
      </header>

      <main className="w-full px-4 py-6 space-y-6">
        {/* Property Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex gap-4">
            {property.image_url && (
              <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                <img src={property.image_url} alt={property.title} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-gray-900 truncate">{property.title}</h1>
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                <MapPin className="h-3.5 w-3.5" />
                {property.city}, {property.neighborhood}
              </p>
              <p className="text-lg font-bold text-orange-500 mt-2">
                {(property.monthly_rent ?? property.price)?.toLocaleString()} FCFA/mois
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Verification Score Card */}
        <div className={`rounded-2xl p-4 border-2 ${
          applicationScore >= 70
            ? 'bg-green-50 border-green-200'
            : 'bg-orange-50 border-orange-200'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {applicationScore >= 70 ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-orange-600" />
              )}
              <span className="font-bold text-gray-900">
                {applicationScore >= 70 ? 'Profil solide' : 'Profil à compléter'}
              </span>
            </div>
            <span className={`text-2xl font-bold ${
              applicationScore >= 70 ? 'text-green-600' : 'text-orange-600'
            }`}>
              {applicationScore}%
            </span>
          </div>
          <div className="w-full bg-white rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                applicationScore >= 70 ? 'bg-green-500' : 'bg-orange-500'
              }`}
              style={{ width: `${applicationScore}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-2">
            {applicationScore >= 70
              ? 'Votre profil est bien complété, bonnes chances de succès !'
              : 'Complétez votre profil pour augmenter vos chances'}
          </p>
        </div>

        {/* Verification Items - Collapsible */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            onClick={() => setShowVerificationPanel(!showVerificationPanel)}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-orange-500" />
              <span className="font-semibold text-gray-900">Mes vérifications</span>
            </div>
            <ChevronRight className={`h-5 w-5 text-gray-400 transition ${showVerificationPanel ? 'rotate-90' : ''}`} />
          </button>

          {showVerificationPanel && (
            <div className="p-4 pt-0 space-y-3">
              {verificationItems.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    item.completed
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${item.completed ? 'bg-green-100' : 'bg-gray-100'}`}>
                      {item.completed ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <div className="text-gray-400">{item.icon}</div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      item.points > 0 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {item.points}%
                    </span>
                    {!item.completed && (
                      <Link to={item.actionLink} className="text-xs font-semibold text-orange-500 hover:text-orange-600">
                        {item.actionLabel}
                      </Link>
                    )}
                  </div>
                </div>
              ))}

              {/* Dossier Verification */}
              <div
                className={`flex items-center justify-between p-3 rounded-xl border ${
                  dossierStatus.color === 'green'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    dossierStatus.color === 'green' ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    {dossierStatus.color === 'green' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <FolderOpen className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Dossier de vérification</p>
                    <p className="text-xs text-gray-500">{dossierStatus.label}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    dossierStatus.color === 'green' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    +{dossierStatus.points}%
                  </span>
                  {dossierStatus.color !== 'green' && (
                    <Link to="/locataire/verification" className="text-xs font-semibold text-orange-500 hover:text-orange-600">
                      {dossierStatus.label === 'Non commencé' ? 'Commencer' : 'Voir'}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Compact Tips Section - Responsive */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-semibold text-gray-700">Boostez vos chances</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                Lettre personnalisée
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                Profil complet
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                Dossier validé
              </span>
              <span className="font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                {applicationScore >= 70 ? '✓' : '?'} 3x plus de réponses
              </span>
            </div>
          </div>
        </div>

        {/* Cover Letter */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <label className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
              <FileText className="h-5 w-5 text-orange-500" />
              <span>Lettre de motivation</span>
              <span className="text-xs font-normal text-red-500">*</span>
            </label>
            <ValidatedTextarea
              name="coverLetter"
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              onBlur={() =>
                validateField('coverLetter', () =>
                  ValidationService.validateMinLength(coverLetter, 50, 'La lettre de motivation')
                )
              }
              rows={6}
              required
              placeholder="Présentez-vous et expliquez pourquoi vous souhaitez louer cette propriété..."
              error={getFieldState('coverLetter').error}
              touched={touched['coverLetter']}
              isValid={getFieldState('coverLetter').isValid}
              showCharCount
              maxLength={2000}
              className="w-full resize-none"
              helperText={coverLetter.length < 50 ? `${coverLetter.length}/50 min.` : undefined}
            />
          </div>

          {/* Terms */}
          <label className="flex items-start gap-3 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-pointer">
            <input type="checkbox" required className="mt-0.5 w-4 h-4 text-orange-500 rounded" />
            <span className="text-sm text-gray-600">
              Je confirme les informations exactes et j'accepte les{' '}
              <Link to="/conditions-utilisation" className="text-orange-500 font-semibold hover:underline">
                conditions d'utilisation
              </Link>
            </span>
          </label>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || existingApplication}
            className={`w-full py-4 rounded-xl font-bold text-white text-lg transition-all ${
              submitting || existingApplication
                ? 'bg-gray-300 cursor-not-allowed'
                : applicationScore >= 70
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-orange-500 hover:bg-orange-600'
            }`}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                Envoi...
              </span>
            ) : existingApplication ? (
              'Candidature envoyée'
            ) : applicationScore >= 70 ? (
              'Envoyer ma candidature'
            ) : (
              'Envoyer quand même'
            )}
          </button>

          {applicationScore < 70 && !existingApplication && (
            <p className="text-xs text-center text-gray-500">
              💡 Votre profil sera encore plus attractif avec les vérifications complètes
            </p>
          )}
        </form>
      </main>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => {
          console.log('[ApplicationForm] Confirmation modal cancelled');
          setShowConfirmModal(false);
        }}
        onConfirm={submitApplication}
        title="Profil incomplet"
        message={`Votre score actuel est de ${applicationScore}%. Voulez-vous quand même envoyer votre candidature ?`}
        details={missingConfirmItems}
        confirmText="Envoyer quand même"
        cancelText="Compléter d'abord"
        variant="warning"
      />
    </div>
  );
}
