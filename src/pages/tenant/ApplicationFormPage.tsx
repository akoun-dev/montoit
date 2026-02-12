import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  CheckCircle,
  XCircle,
  User,
  MapPin,
  Shield,
  Award,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  FolderOpen,
  Home,
  Star,
  Info,
} from 'lucide-react';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { ScoringService, TENANT_SCORING_WEIGHTS } from '@/services/scoringService';
import { notifyApplicationReceived } from '@/services/notifications/applicationNotificationService';
import { Input } from '@/shared/ui';
import { ConfirmationModal } from '@/shared/ui/ConfirmationModal';
import Modal from '@/shared/ui/Modal';
import verificationApplicationsService, {
  type VerificationApplication,
  type DossierStatus,
} from '@/features/verification/services/verificationApplications.service';
import DossierSubmissionTab from '@/shared/ui/verification/DossierSubmissionTab';
import type { Database } from '@/shared/lib/database.types';
import { formatAddress } from '@/shared/utils/address';

type Property = Database['public']['Tables']['properties']['Row'];

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
  tenant_category?: 'salarie' | 'entrepreneur' | 'etudiant' | null;
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

type VerificationStepId = 'profile' | 'facial' | 'oneci' | 'dossier';

export default function ApplicationForm() {
  const { user, profile: authProfile, updateProfile } = useAuth();
  const { id: routeId } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const profile = authProfile as ExtendedProfile | null;
  const initialProperty = (location.state as { property?: Property } | null)?.property ?? null;
  const [property, setProperty] = useState<Property | null>(initialProperty);
  const [loading, setLoading] = useState(!initialProperty);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [existingApplication, setExistingApplication] = useState(false);
  const [applicationScore, setApplicationScore] = useState(0);
  const [showVerificationPanel, setShowVerificationPanel] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [dossierApplication, setDossierApplication] = useState<VerificationApplication | null>(
    null
  );
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [activeVerificationStep, setActiveVerificationStep] =
    useState<VerificationStepId>('profile');
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone: '',
    city: '',
    gender: '',
    tenant_category: '',
    address: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);

  const facialStatus = profile?.facial_verification_status?.toLowerCase() || '';
  const isFaceVerified = facialStatus === 'verified';
  const isOneciVerified = profile?.oneci_verified ?? false;
  const profileResult = ScoringService.calculateProfileScore(profile);
  const isProfileComplete = ScoringService.isProfileComplete(profileResult.details);

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
      ScoringService.calculateSimpleScore(profile, user?.id)
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
      const applications = await verificationApplicationsService.getUserApplications(
        user.id,
        'tenant'
      );
      const activeApp =
        applications.find((app) =>
          ['pending', 'in_review', 'more_info_requested', 'approved'].includes(app.status)
        ) ||
        applications[0] ||
        null;
      setDossierApplication(activeApp);
    } catch (err) {
      console.error('Error loading dossier:', err);
    }
  };

  const dossierApproved = dossierApplication?.status === 'approved';
  const firstIncompleteStep: VerificationStepId = !isProfileComplete
    ? 'profile'
    : !isFaceVerified
      ? 'facial'
      : !isOneciVerified
        ? 'oneci'
        : !dossierApproved
          ? 'dossier'
          : 'profile';

  useEffect(() => {
    if (!showVerificationModal) return;
    const resolvedAddress =
      typeof profile?.address === 'string'
        ? profile.address
        : formatAddress(profile?.address, profile?.city ?? undefined);
    setProfileForm({
      full_name: profile?.full_name ?? '',
      phone: profile?.phone ?? '',
      city: profile?.city ?? '',
      gender: profile?.gender ?? '',
      tenant_category: profile?.tenant_category ?? '',
      address: resolvedAddress || '',
    });
    setProfileSaveError('');
    setProfileSaved(false);
    setActiveVerificationStep(firstIncompleteStep);
  }, [showVerificationModal, profile, firstIncompleteStep]);

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

      // Vérifier si la propriété est disponible
      const normalizedStatus = data.status ? data.status.toLowerCase() : 'available';

      if (normalizedStatus !== 'available') {
        const errorMessage =
          normalizedStatus === 'rented'
            ? 'Cette propriété est déjà louée. Les candidatures ne sont plus acceptées.'
            : normalizedStatus === 'pending'
              ? 'Cette propriété est déjà en cours de location. Les candidatures ne sont plus acceptées.'
              : normalizedStatus === 'maintenance'
                ? 'Cette propriété est en maintenance. Les candidatures ne sont pas acceptées pour le moment.'
                : 'Cette propriété est indisponible. Les candidatures ne sont plus acceptées.';
        setError(errorMessage);
        setExistingApplication(true); // Réutiliser ce flag pour bloquer le formulaire
        setLoading(false);
        return;
      }

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

  const handleProfileSave = async () => {
    if (!user) return;
    setProfileSaving(true);
    setProfileSaveError('');
    setProfileSaved(false);

    const nextProfile = {
      full_name: profileForm.full_name.trim(),
      phone: profileForm.phone.trim(),
      city: profileForm.city.trim(),
      gender: profileForm.gender,
      tenant_category: profileForm.tenant_category || null,
      address: profileForm.address.trim(),
    };
    const isCompleteAfter =
      !!nextProfile.full_name &&
      !!nextProfile.phone &&
      !!nextProfile.city &&
      !!nextProfile.gender &&
      !!nextProfile.address;

    try {
      await updateProfile({
        full_name: nextProfile.full_name || null,
        phone: nextProfile.phone || null,
        city: nextProfile.city || null,
        gender: nextProfile.gender || null,
        tenant_category: nextProfile.tenant_category,
        address: nextProfile.address || null,
        profile_setup_completed: isCompleteAfter,
      });

      const updatedScore = await ScoringService.calculateSimpleScore(
        {
          ...(profile || {}),
          ...nextProfile,
          address: nextProfile.address || null,
        } as unknown as ExtendedProfile,
        user.id
      );
      setApplicationScore(updatedScore);
      setProfileSaved(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la mise à jour';
      setProfileSaveError(message);
    } finally {
      setProfileSaving(false);
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
      timestamp: new Date().toISOString(),
    });

    // Si score < 70, afficher le modal de confirmation
    if (applicationScore < 70) {
      const missingItems: string[] = [];
      if (!isProfileComplete) {
        missingItems.push('Profil complet — indispensable pour être contacté rapidement.');
      }
      if (!isFaceVerified) {
        missingItems.push('Neoface — selfie + CNI pour rassurer le propriétaire.');
      }
      if (!isOneciVerified) {
        missingItems.push('ONECI — vérifie votre identité et sécurise votre dossier.');
      }
      if (!dossierApplication || dossierApplication.status !== 'approved') {
        missingItems.push('Dossier locataire — Obligatoire pour pouvoir valider votre candidature');
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
      const finalScore = await ScoringService.calculateSimpleScore(profile, user?.id);
      console.log('[ApplicationForm] Final score calculated', { finalScore });

      // Insérer la candidature
      console.log('[ApplicationForm] Inserting application into database...');
      const { data: applicationData, error: insertError } = await supabase
        .from('rental_applications')
        .insert({
          property_id: property.id,
          tenant_id: user.id,
          credit_score: finalScore,
          status: 'pending',
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
          <Link
            to="/recherche"
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition"
          >
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

  const profilePercentage = isProfileComplete ? TENANT_SCORING_WEIGHTS.profileComplete : 0;
  const facialPercentage = isFaceVerified ? TENANT_SCORING_WEIGHTS.facial : 0;
  const oneciPercentage = isOneciVerified ? TENANT_SCORING_WEIGHTS.oneci : 0;

  const verificationItems: VerificationItem[] = [
    {
      id: 'profile',
      label: 'Profil complet',
      description: 'Coordonnées fiables pour être contacté',
      points: profilePercentage,
      completed: isProfileComplete,
      actionLink: '/locataire/profil',
      actionLabel: 'Compléter',
      icon: <User className="h-5 w-5" />,
    },
    {
      id: 'facial',
      label: 'Reconnaissance faciale',
      description: 'Neoface : selfie + CNI pour rassurer',
      points: facialPercentage,
      completed: isFaceVerified,
      actionLink: '/verification-biometrique?reset=true',
      actionLabel: 'Vérifier',
      icon: <Shield className="h-5 w-5" />,
    },
    {
      id: 'oneci',
      label: 'Vérification ONECI',
      description: 'Vérification identitaire et sécurité',
      points: oneciPercentage,
      completed: isOneciVerified,
      actionLink: '/locataire/verification-oneci',
      actionLabel: 'Vérifier',
      icon: <Award className="h-5 w-5" />,
    },
  ];

  const getDossierStatus = () => {
    if (!dossierApplication) return { label: 'Non commencé', color: 'gray', points: 0 };
    if (dossierApplication.status === 'approved')
      return { label: 'Validé', color: 'green', points: TENANT_SCORING_WEIGHTS.dossier };
    if (dossierApplication.status === 'pending')
      return { label: 'En attente', color: 'yellow', points: 0 };
    if (dossierApplication.status === 'in_review')
      return { label: 'En vérification', color: 'blue', points: 0 };
    if (dossierApplication.status === 'rejected')
      return { label: 'Refusé', color: 'red', points: 0 };
    return { label: 'À compléter', color: 'purple', points: 0 };
  };

  const dossierStatus = getDossierStatus();
  const verificationTagData = [
    {
      id: 'profile',
      label: 'Informations profil',
      completed: isProfileComplete,
      points: TENANT_SCORING_WEIGHTS.profileComplete,
    },
    {
      id: 'facial',
      label: 'Reconnaissance faciale',
      completed: isFaceVerified,
      points: TENANT_SCORING_WEIGHTS.facial,
    },
    {
      id: 'oneci',
      label: 'Identité (ONECI)',
      completed: isOneciVerified,
      points: TENANT_SCORING_WEIGHTS.oneci,
    },
    {
      id: 'dossier',
      label: 'Dossier locataire',
      completed: dossierApproved,
      points: TENANT_SCORING_WEIGHTS.dossier,
    },
  ];

  const verificationSteps = [
    {
      id: 'profile',
      title: 'Compléter le profil',
      description: 'Infos de base et contact',
      completed: isProfileComplete,
      actionLabel: 'Compléter',
      actionLink: '/locataire/profil',
    },
    {
      id: 'facial',
      title: 'Vérification faciale',
      description: 'Neoface : selfie + CNI',
      completed: isFaceVerified,
      actionLabel: 'Démarrer',
      actionLink: '/verification-biometrique?reset=true',
    },
    {
      id: 'oneci',
      title: 'Vérification ONECI',
      description: 'Vérification identitaire',
      completed: isOneciVerified,
      actionLabel: 'Démarrer',
      actionLink: '/locataire/verification-oneci',
    },
    {
      id: 'dossier',
      title: 'Dossier locataire',
      description: dossierApproved ? 'Validé' : 'Documents à soumettre',
      completed: dossierApproved,
      actionLabel: 'Gérer',
      actionLink: '/locataire/profil?tab=verification',
    },
  ];

  const missingVerificationCount = verificationSteps.filter((step) => !step.completed).length;
  const hasMissingVerifications = missingVerificationCount > 0;
  const verificationTips = [
    !isProfileComplete && 'Complétez votre profil pour être contacté plus vite.',
    !isFaceVerified && 'Neoface : selfie + CNI pour renforcer la confiance.',
    !isOneciVerified && 'ONECI : vérification identitaire pour sécuriser votre dossier.',
    !dossierApproved && 'Le dossier locataire est indispensable pour postuler.',
  ].filter(Boolean) as string[];

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
            <Star
              className={`h-5 w-5 ${applicationScore >= 70 ? 'text-green-500 fill-green-500' : 'text-orange-500'}`}
            />
            <span
              className={`font-bold ${applicationScore >= 70 ? 'text-green-600' : 'text-orange-600'}`}
            >
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
                <img
                  src={property.image_url}
                  alt={property.title}
                  className="w-full h-full object-cover"
                />
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
        <div
          className={`rounded-2xl p-4 border-2 ${
            applicationScore >= 70
              ? 'bg-green-50 border-green-200'
              : 'bg-orange-50 border-orange-200'
          }`}
        >
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
            <span
              className={`text-2xl font-bold ${
                applicationScore >= 70 ? 'text-green-600' : 'text-orange-600'
              }`}
            >
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
          <div className="mt-3 flex flex-wrap gap-2">
            {verificationTagData.map((tag) => (
              <span
                key={tag.id}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                  tag.completed
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-orange-200 bg-orange-50 text-orange-700'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    tag.completed ? 'bg-green-500' : 'bg-orange-500'
                  }`}
                />
                <span>{tag.label}</span>
                <span className="text-[10px] font-bold">+{tag.points}%</span>
              </span>
            ))}
          </div>
        </div>

        {hasMissingVerifications && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Vérifications incomplètes</p>
              <p className="text-xs text-gray-600">
                Il vous reste {missingVerificationCount} étape(s) pour un profil complet.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveVerificationStep('profile');
                setShowVerificationModal(true);
              }}
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-orange-500 text-white font-semibold text-sm hover:bg-orange-600 transition"
            >
              Faire les vérifications
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-semibold text-gray-700">Astuces utiles</span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 text-xs text-gray-600">
            <div className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-orange-400" />
              <span>
                Le dossier locataire est obligatoire pour pouvoir valider votre candidature
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-orange-400" />
              <span>ONECI confirme votre identité et sécurise votre profil.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-orange-400" />
              <span>Neoface (selfie + CNI) rassure le propriétaire.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-orange-400" />
              <span>Un profil complet améliore la rapidité des réponses.</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Terms */}
          <label className="flex items-start gap-3 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-pointer">
            <input type="checkbox" required className="mt-0.5 w-4 h-4 text-orange-500 rounded" />
            <span className="text-sm text-gray-600">
              Je confirme les informations exactes et j'accepte les{' '}
              <Link
                to="/conditions-utilisation"
                className="text-orange-500 font-semibold hover:underline"
              >
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
              'Envoyer'
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
        message={`Votre score actuel est de ${applicationScore}%. Voici ce qu'il manque — l'importance de chaque point est indiquée ci-dessous. Voulez-vous envoyer la candidature maintenant ?`}
        details={missingConfirmItems}
        confirmText="Envoyer quand même"
        cancelText="Compléter maintenant"
        variant="warning"
      />

      {/* Verification Stepper Modal */}
      <Modal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        title="Faire les vérifications"
        size="full"
      >
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Progression: {verificationSteps.filter((step) => step.completed).length}/
                {verificationSteps.length}
              </p>
              <p className="text-xs text-gray-600">
                Complétez ces étapes pour sécuriser votre profil et postuler plus vite.
              </p>
            </div>
            <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full">
              {missingVerificationCount} étape(s) restantes
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr,1fr]">
            <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-orange-500">Score actuel</p>
                  <p className="text-3xl font-bold text-orange-600">{applicationScore}%</p>
                </div>
                <div className="w-16 h-16 rounded-full bg-white shadow-inner flex items-center justify-center">
                  <span className="text-sm font-semibold text-orange-600">
                    {applicationScore >= 70 ? '✓' : '↗'}
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full h-2 rounded-full bg-white/70 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-400 to-orange-600"
                    style={{ width: `${applicationScore}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  {applicationScore >= 70
                    ? 'Score solide pour candidater rapidement.'
                    : 'Un score supérieur à 70% améliore vos chances.'}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <p className="text-sm font-semibold text-gray-900">Astuces rapides</p>
              {verificationTips.length > 0 ? (
                <div className="mt-3 space-y-2 text-xs text-gray-600">
                  {verificationTips.slice(0, 4).map((tip) => (
                    <div key={tip} className="flex items-start gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-orange-400" />
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-green-600 mt-3">
                  Toutes les vérifications sont terminées. Excellent profil !
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {verificationSteps.map((step, index) => (
              <button
                type="button"
                key={step.id}
                onClick={() => setActiveVerificationStep(step.id as VerificationStepId)}
                className={`relative rounded-2xl border p-4 text-left transition ${
                  step.completed ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'
                } ${activeVerificationStep === step.id ? 'ring-2 ring-orange-300' : ''}`}
              >
                {index < verificationSteps.length - 1 && (
                  <span className="hidden md:block absolute top-6 -right-4 w-4 h-0.5 bg-gray-200" />
                )}
                <div className="flex md:flex-col gap-3 md:gap-2">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                      step.completed ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {step.completed ? '✓' : index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">{step.title}</p>
                    <p className="text-xs text-gray-500">{step.description}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      step.completed ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {step.completed ? 'Terminé' : 'À faire'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {activeVerificationStep === step.id ? 'Sélectionné' : 'Choisir'}
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            {activeVerificationStep === 'profile' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Modifier le profil</p>
                    <p className="text-xs text-gray-600">
                      Remplissez les champs requis pour valider votre profil.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full">
                    Champs requis
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="Nom complet"
                    value={profileForm.full_name}
                    onChange={(e) =>
                      setProfileForm((prev) => ({ ...prev, full_name: e.target.value }))
                    }
                    fullWidth
                    required
                  />
                  <Input
                    label="Téléphone"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                    fullWidth
                    required
                  />
                  <Input
                    label="Ville"
                    value={profileForm.city}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, city: e.target.value }))}
                    fullWidth
                    required
                  />
                  <div className="md:col-span-2 grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-neutral-700">
                        Genre <span className="text-semantic-error ml-1">*</span>
                      </label>
                      <select
                        value={profileForm.gender}
                        onChange={(e) =>
                          setProfileForm((prev) => ({ ...prev, gender: e.target.value }))
                        }
                        className="w-full px-4 py-3 border-2 rounded-base border-neutral-100 hover:border-neutral-300 focus:border-primary-500 focus:ring-primary-500 focus:ring-2 transition-fast"
                      >
                        <option value="">Sélectionner</option>
                        <option value="Homme">Homme</option>
                        <option value="Femme">Femme</option>
                        <option value="Non spécifié">Non spécifié</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-neutral-700">
                        Situation
                      </label>
                      <select
                        value={profileForm.tenant_category}
                        onChange={(e) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            tenant_category: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-3 border-2 rounded-base border-neutral-100 hover:border-neutral-300 focus:border-primary-500 focus:ring-primary-500 focus:ring-2 transition-fast"
                      >
                        <option value="">Sélectionner</option>
                        <option value="salarie">Salarié</option>
                        <option value="entrepreneur">Entrepreneur</option>
                        <option value="etudiant">Étudiant</option>
                      </select>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      label="Adresse"
                      value={profileForm.address}
                      onChange={(e) =>
                        setProfileForm((prev) => ({ ...prev, address: e.target.value }))
                      }
                      fullWidth
                      required
                    />
                  </div>
                </div>

                {profileSaveError && <p className="text-sm text-red-600">{profileSaveError}</p>}
                {profileSaved && (
                  <p className="text-sm text-green-600">Profil mis à jour avec succès.</p>
                )}

                <div className="flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowVerificationModal(false)}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50"
                  >
                    Fermer
                  </button>
                  <button
                    type="button"
                    onClick={handleProfileSave}
                    disabled={profileSaving}
                    className="px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 disabled:opacity-60"
                  >
                    {profileSaving ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            ) : activeVerificationStep === 'dossier' ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Dossier locataire</p>
                    <p className="text-xs text-gray-600">
                      Déposez vos documents et soumettez votre dossier pour validation.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full">
                    {dossierStatus.label}
                  </span>
                </div>
                <DossierSubmissionTab dossierType="tenant" />
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {verificationSteps.find((step) => step.id === activeVerificationStep)?.title}
                  </p>
                  <p className="text-xs text-gray-600">
                    {
                      verificationSteps.find((step) => step.id === activeVerificationStep)
                        ?.description
                    }
                  </p>
                </div>
                {verificationSteps
                  .filter((step) => step.id === activeVerificationStep)
                  .map((step) =>
                    step.completed ? (
                      <span
                        key={step.id}
                        className="text-xs font-semibold text-green-600 bg-green-50 px-3 py-1.5 rounded-full"
                      >
                        Déjà terminé
                      </span>
                    ) : (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => {
                          setShowVerificationModal(false);
                          navigate(step.actionLink);
                        }}
                        className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition"
                      >
                        {step.actionLabel}
                      </button>
                    )
                  )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowVerificationModal(false)}
              className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50"
            >
              Plus tard
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
