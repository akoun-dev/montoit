/**
 * OnboardingFlow - Flux d'onboarding guidé après inscription
 * MON-019: Guide l'utilisateur selon son rôle en 3 étapes :
 * 1. Complétez votre profil
 * 2. Uploadez vos documents
 * 3. Soumettez au Tiers de Confiance (TC)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  FileText,
  Shield,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Upload,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type OnboardingStep = 'profile' | 'documents' | 'submit' | 'complete';

interface OnboardingData {
  // Étape 1: Profil
  full_name?: string;
  phone?: string;
  city?: string;
  bio?: string;

  // Étape 2: Documents
  id_document_url?: string;
  id_document_verified?: boolean;

  // Progress tracking
  profile_completed?: boolean;
  documents_uploaded?: boolean;
  submitted_to_tc?: boolean;
}

const ONBOARDING_STEPS = [
  {
    id: 'profile',
    title: 'Complétez votre profil',
    description: 'Ajoutez vos informations personnelles',
    icon: User,
  },
  {
    id: 'documents',
    title: 'Uploadez vos documents',
    description: 'Pièce d\'identité et justificatifs',
    icon: FileText,
  },
  {
    id: 'submit',
    title: 'Soumettez au Tiers de Confiance',
    description: 'Validation de votre dossier par nos experts',
    icon: Shield,
  },
];

export default function OnboardingFlow() {
  const { user, profile, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState<OnboardingStep>('profile');
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    city: profile?.city || '',
    bio: profile?.bio || '',
  });

  const stepIndex = ONBOARDING_STEPS.findIndex(s => s.id === currentStep);
  const currentStepInfo = ONBOARDING_STEPS[stepIndex];

  // Charger les données d'onboarding existantes
  useEffect(() => {
    loadOnboardingData();
  }, []);

  const loadOnboardingData = async () => {
    if (!user?.id) return;

    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setOnboardingData(data);
        setFormData({
          full_name: data.full_name || '',
          phone: data.phone || '',
          city: data.city || '',
          bio: data.bio || '',
        });

        // Déterminer l'étape actuelle
        if (data.submitted_to_tc) {
          setCurrentStep('complete');
        } else if (data.documents_uploaded) {
          setCurrentStep('submit');
        } else if (data.profile_completed) {
          setCurrentStep('documents');
        }
      }
    } catch (error) {
      console.error('Error loading onboarding data:', error);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name.trim()) {
      toast.error('Veuillez entrer votre nom complet');
      return;
    }

    setLoading(true);

    try {
      await updateProfile({
        ...formData,
        profile_completed: true,
      });

      setOnboardingData(prev => ({ ...prev, profile_completed: true }));
      toast.success('Profil complété avec succès !');

      // Passer à l'étape suivante
      setTimeout(() => setCurrentStep('documents'), 500);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erreur lors de la mise à jour du profil');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Valider le type de fichier
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez uploader une image (JPG, PNG, etc.)');
      return;
    }

    // Valider la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Le fichier est trop volumineux (max 5MB)');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}_id_document.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('identity_documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('identity_documents')
        .getPublicUrl(fileName);

      await updateProfile({
        id_document_url: publicUrl,
        documents_uploaded: true,
      });

      setOnboardingData(prev => ({ ...prev, documents_uploaded: true }));
      toast.success('Document uploadé avec succès !');

      // Passer à l'étape suivante
      setTimeout(() => setCurrentStep('submit'), 500);
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Erreur lors de l\'upload du document');
    } finally {
      setUploading(false);
    }
  };

  const handleTCSubmission = async () => {
    setLoading(true);

    try {
      // Créer une demande de vérification
      const { data, error } = await supabase
        .from('verification_applications')
        .insert({
          user_id: user?.id,
          dossier_type: profile?.user_type || 'tenant',
          personal_info: {
            full_name: formData.full_name,
            phone: formData.phone,
            city: formData.city,
          },
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      await updateProfile({
        submitted_to_tc: true,
      });

      setOnboardingData(prev => ({ ...prev, submitted_to_tc: true }));

      toast.success('Dossier soumis au Tiers de Confiance ! Vous recevrez une notification une fois validé.');

      setTimeout(() => setCurrentStep('complete'), 500);
    } catch (error) {
      console.error('Error submitting to TC:', error);
      toast.error('Erreur lors de la soumission du dossier');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipForNow = () => {
    toast.info('Vous pourrez compléter votre profil plus tard depuis votre espace.');
    // Rediriger selon le rôle
    const userType = profile?.user_type || 'tenant';
    const redirectPath =
      userType === 'tenant'
        ? '/recherche'
        : userType === 'owner'
          ? '/proprietaire/ajouter-propriete'
          : '/dashboard';
    navigate(redirectPath);
  };

  const handleComplete = () => {
    // Rediriger selon le rôle
    const userType = profile?.user_type || 'tenant';
    const redirectPath =
      userType === 'tenant'
        ? '/recherche'
        : userType === 'owner'
          ? '/proprietaire/ajouter-propriete'
          : '/dashboard';
    navigate(redirectPath);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'profile':
        return renderProfileStep();
      case 'documents':
        return renderDocumentsStep();
      case 'submit':
        return renderSubmitStep();
      case 'complete':
        return renderCompleteStep();
      default:
        return null;
    }
  };

  const renderProfileStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Complétez votre profil
        </h2>
        <p className="text-gray-600">
          Ces informations aideront les propriétaires à vous connaître
        </p>
      </div>

      <form onSubmit={handleProfileSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nom complet *
          </label>
          <input
            type="text"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="Votre nom complet"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Téléphone
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="+225 XX XX XX XX"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ville
          </label>
          <select
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="">Sélectionnez votre ville</option>
            <option value="Abidjan">Abidjan</option>
            <option value="Bouaké">Bouaké</option>
            <option value="Yamoussoukro">Yamoussoukro</option>
            <option value="San-Pédro">San-Pédro</option>
            <option value="Korhogo">Korhogo</option>
            <option value="Man">Man</option>
            <option value="Daloa">Daloa</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bio (optionnel)
          </label>
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="Parlez-nous de vous..."
            rows={3}
            maxLength={500}
          />
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={handleSkipForNow}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Plus tard
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                Continuer
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );

  const renderDocumentsStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Uploadez vos documents
        </h2>
        <p className="text-gray-600">
          Pièce d'identité pour vérifier votre profil
        </p>
      </div>

      <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-orange-400 transition-colors">
        <input
          type="file"
          id="document-upload"
          className="hidden"
          accept="image/*"
          onChange={handleDocumentUpload}
          disabled={uploading}
        />
        <label
          htmlFor="document-upload"
          className="cursor-pointer flex flex-col items-center gap-4"
        >
          <div className="p-4 bg-orange-100 rounded-full">
            <Upload className="w-8 h-8 text-orange-600" />
          </div>
          <div>
            <p className="text-lg font-medium text-gray-900">
              {uploading ? 'Upload en cours...' : 'Cliquez pour uploader votre pièce d\'identité'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              JPG, PNG (max 5MB)
            </p>
          </div>
        </label>
      </div>

      {onboardingData.id_document_url && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-green-900">Document uploadé</p>
            <p className="text-sm text-green-700">Vous pouvez passer à l'étape suivante</p>
          </div>
        </div>
      )}

      <div className="flex gap-4 pt-4">
        <button
          onClick={() => setCurrentStep('profile')}
          className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          <ChevronLeft className="w-5 h-5" />
          Retour
        </button>
        <button
          onClick={() => setCurrentStep('submit')}
          disabled={!onboardingData.id_document_url}
          className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          Continuer
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  const renderSubmitStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Soumettez au Tiers de Confiance
        </h2>
        <p className="text-gray-600">
          Votre dossier sera examiné par notre équipe d'experts
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
        <div className="flex items-start gap-3">
          <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">
              Processus de vérification
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Examen de vos documents sous 48h</li>
              <li>• Vérification de votre identité</li>
              <li>• Notification de la décision par email</li>
              <li>• Possibilité de corriger votre dossier si nécessaire</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
            onboardingData.profile_completed ? 'bg-green-500' : 'bg-gray-300'
          }`}>
            {onboardingData.profile_completed && <CheckCircle2 className="w-4 h-4 text-white" />}
          </div>
          <span className="text-sm text-gray-700">Profil complété</span>
        </div>

        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
            onboardingData.documents_uploaded ? 'bg-green-500' : 'bg-gray-300'
          }`}>
            {onboardingData.documents_uploaded && <CheckCircle2 className="w-4 h-4 text-white" />}
          </div>
          <span className="text-sm text-gray-700">Documents uploadés</span>
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <button
          onClick={() => setCurrentStep('documents')}
          className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          <ChevronLeft className="w-5 h-5" />
          Retour
        </button>
        <button
          onClick={handleTCSubmission}
          disabled={loading || !onboardingData.profile_completed || !onboardingData.documents_uploaded}
          className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Soumission...
            </>
          ) : (
            <>
              Soumettre mon dossier
              <Shield className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle2 className="w-10 h-10 text-green-600" />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Félicitations !
        </h2>
        <p className="text-gray-600">
          Votre onboarding est complet. Votre dossier est en cours de vérification.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-left">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Prochaines étapes :</p>
            <ul className="space-y-1 text-blue-800">
              <li>• Vous recevrez une notification email une fois votre dossier vérifié</li>
              <li>• Le délai de vérification est de 48h maximum</li>
              <li>• En attendant, vous pouvez continuer à explorer la plateforme</li>
            </ul>
          </div>
        </div>
      </div>

      <button
        onClick={handleComplete}
        className="px-8 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
      >
        Commencer à explorer
      </button>
    </div>
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress indicator */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            {ONBOARDING_STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = index < stepIndex;
              const isCurrent = index === stepIndex;

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center transition-colors
                      ${isCompleted ? 'bg-orange-600 text-white' : isCurrent ? 'bg-orange-100 text-orange-600' : 'bg-gray-200 text-gray-400'}
                    `}>
                      {isCompleted ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : (
                        <StepIcon className="w-6 h-6" />
                      )}
                    </div>
                    <span className={`text-xs font-medium mt-2 ${
                      isCurrent ? 'text-orange-600' : isCompleted ? 'text-orange-600' : 'text-gray-400'
                    }`}>
                      {index + 1}
                    </span>
                  </div>
                  {index < ONBOARDING_STEPS.length - 1 && (
                    <div className={`flex-1 h-1 mx-2 ${isCompleted ? 'bg-orange-600' : 'bg-gray-200'}`} />
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-gray-900">{currentStepInfo.title}</p>
            <p className="text-xs text-gray-500">{currentStepInfo.description}</p>
          </div>
        </div>

        {/* Card content */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          {renderStep()}
        </div>
      </div>
    </div>
  );
}
