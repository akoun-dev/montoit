/**
 * OnboardingModal - Modal d'onboarding guidé
 * MON-019: Modal qui s'affiche tant que le profil n'est pas complet
 * Guide l'utilisateur selon son rôle en 3 étapes :
 * 1. Complétez votre profil → 2. Dossier locataire → 3. Soumettez au TC
 */

import { useState, useEffect, useRef } from 'react';
import { X, XCircle, Upload, FileText, Briefcase, GraduationCap, Building, Shield, Star, Zap, CheckCircle, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/app/providers/AuthProvider';
import type { AddressValue } from '@/shared/utils/address';
import { formatAddress } from '@/shared/utils/address';
import verificationApplicationsService from '@/features/verification/services/verificationApplications.service';

type TenantCategory = 'salarie' | 'entrepreneur' | 'etudiant';
type OnboardingStep = 'profile' | 'documents' | 'submit' | 'complete';

interface TenantDocumentRequirement {
  id: string;
  name: string;
  description: string;
  required: boolean;
  categories: TenantCategory[];
  fileTypes: string[];
  maxSize: number;
}

// Configuration des documents pour locataires
const TENANT_DOCUMENTS: TenantDocumentRequirement[] = [
  {
    id: 'carte_identite',
    name: "Carte d'identité ou Passeport",
    description: "Pièce d'identité en cours de validité",
    required: true,
    categories: ['salarie', 'entrepreneur', 'etudiant'],
    fileTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxSize: 5,
  },
  {
    id: 'contrat_travail',
    name: 'Contrat de travail',
    description: 'Contrat de travail signé',
    required: true,
    categories: ['salarie'],
    fileTypes: ['application/pdf'],
    maxSize: 10,
  },
  {
    id: 'attestation_travail',
    name: 'Attestation de travail récente',
    description: 'Attestation de moins de 3 mois',
    required: true,
    categories: ['salarie'],
    fileTypes: ['application/pdf'],
    maxSize: 5,
  },
  {
    id: 'bulletins_salaire',
    name: 'Bulletins de salaire (3 derniers mois)',
    description: 'Les 3 derniers bulletins de salaire',
    required: true,
    categories: ['salarie'],
    fileTypes: ['application/pdf'],
    maxSize: 10,
  },
  {
    id: 'releves_bancaires_salarie',
    name: 'Relevés bancaires (3 derniers mois)',
    description: 'Relevés de compte des 3 derniers mois',
    required: true,
    categories: ['salarie'],
    fileTypes: ['application/pdf'],
    maxSize: 10,
  },
  {
    id: 'registre_commerce',
    name: 'Registre de commerce',
    description: 'Document officiel d\'enregistrement de l\'entreprise',
    required: true,
    categories: ['entrepreneur'],
    fileTypes: ['application/pdf'],
    maxSize: 10,
  },
  {
    id: 'attestation_immatriculation',
    name: 'Attestation d\'immatriculation',
    description: 'Attestation récente d\'immatriculation',
    required: true,
    categories: ['entrepreneur'],
    fileTypes: ['application/pdf'],
    maxSize: 5,
  },
  {
    id: 'releves_bancaires_entrepreneur',
    name: 'Relevés bancaires (3 derniers mois)',
    description: 'Relevés de compte des 3 derniers mois',
    required: true,
    categories: ['entrepreneur'],
    fileTypes: ['application/pdf'],
    maxSize: 10,
  },
  {
    id: 'carte_etudiant',
    name: 'Carte d\'étudiant',
    description: 'Carte d\'étudiant en cours de validité',
    required: true,
    categories: ['etudiant'],
    fileTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxSize: 5,
  },
  {
    id: 'attestation_scolarite',
    name: 'Attestation de scolarité',
    description: 'Attestation d\'inscription ou certificat de scolarité',
    required: true,
    categories: ['etudiant'],
    fileTypes: ['application/pdf'],
    maxSize: 5,
  },
  {
    id: 'garantie_financiere',
    name: 'Garantie financière',
    description: 'Attestation de garantie ou caution',
    required: true,
    categories: ['etudiant'],
    fileTypes: ['application/pdf'],
    maxSize: 10,
  },
];

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ONBOARDING_STEPS = [
  { id: 'profile', title: 'Complétez votre profil', description: 'Augmentez votre visibilité auprès des propriétaires' },
  { id: 'documents', title: 'Dossier locataire', description: 'Obtenez la certification de confiance ANSUT' },
  { id: 'submit', title: 'Soumettez au Tiers de Confiance', description: 'Débloquez toutes les fonctionnalités' },
];

export default function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const { user, profile, updateProfile } = useAuth();

  const [currentStep, setCurrentStep] = useState<OnboardingStep>('profile');
  const [loading, setLoading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [canClose, setCanClose] = useState(false);
  const wasOpen = useRef(false);

  // Determine user type
  const userType = profile?.user_type || 'tenant';
  const isTenant = userType === 'tenant' || userType === 'locataire';
  const isOwner = userType === 'owner' || userType === 'proprietaire';
  const isAgency = userType === 'agent' || userType === 'agence';

  // Tenant category state (only for tenants)
  const [selectedCategory, setSelectedCategory] = useState<TenantCategory | null>(null);
  const [documents, setDocuments] = useState<Record<string, string>>({});
  const [dossierApplication, setDossierApplication] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    city: profile?.city || '',
    address: profile?.address ? formatAddress(profile.address as AddressValue) : '',
    bio: profile?.bio || '',
    gender: (profile?.gender as string) || '',
  });

  const stepIndex = ONBOARDING_STEPS.findIndex(s => s.id === currentStep);
  const currentStepInfo = stepIndex !== -1 ? ONBOARDING_STEPS[stepIndex] : ONBOARDING_STEPS[0];

  // Log pour déboguer l'état du modal
  console.log('[OnboardingModal] Render - isOpen:', isOpen, 'currentStep:', currentStep, 'user:', !!user, 'profile:', profile);

  // Permettre la fermeture après 30 secondes
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setCanClose(true), 30000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Réinitialiser à l'étape profile uniquement à l'ouverture du modal (pas à chaque changement de profil)
  useEffect(() => {
    // Si le modal vient de s'ouvrir (n'était pas ouvert avant)
    if (isOpen && !wasOpen.current) {
      console.log('[OnboardingModal] Modal opened - resetting to profile step');
      setCurrentStep('profile');
      setFormData({
        full_name: profile?.full_name || '',
        phone: profile?.phone || '',
        city: profile?.city || '',
        address: profile?.address ? formatAddress(profile.address as AddressValue) : '',
        bio: profile?.bio || '',
        gender: (profile?.gender as string) || '',
      });
      wasOpen.current = true;
    }
    // Si le modal se ferme, réinitialiser le flag
    if (!isOpen) {
      wasOpen.current = false;
    }
  }, [isOpen]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name.trim()) {
      toast.error('Veuillez entrer votre nom complet');
      return;
    }

    setLoading(true);

    try {
      console.log('[OnboardingModal] Updating profile with data:', formData);
      
      // Mettre à jour le profil directement via Supabase pour inclure profile_setup_completed
      const { error: updateError, data } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          city: formData.city,
          address: formData.address,
          bio: formData.bio,
          gender: formData.gender,
          profile_setup_completed: true, // Marquer le profil comme complété
        } as any)
        .eq('id', user?.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Mettre à jour le contexte AuthProvider avec les données fraîches
      await updateProfile({
        full_name: formData.full_name,
        phone: formData.phone,
        city: formData.city,
        address: formData.address,
        bio: formData.bio,
        gender: formData.gender,
        profile_setup_completed: true,
      });

      toast.success('Profil complété avec succès !');
      console.log('[OnboardingModal] Profile updated, setting step to documents');
      setCurrentStep('documents');
      console.log('[OnboardingModal] Step set to documents');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erreur lors de la mise à jour du profil');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentUpload = async (docType: string, file?: File) => {
    if (!user || !file || !selectedCategory) return;

    const requirement = TENANT_DOCUMENTS.find((req) => req.id === docType);
    if (!requirement) {
      toast.error('Type de document invalide');
      return;
    }

    // Validate file type
    if (!requirement.fileTypes.includes(file.type)) {
      toast.error(
        `Type de fichier non autorisé. Formats acceptés: ${requirement.fileTypes.join(', ')}`
      );
      return;
    }

    // Validate file size
    if (file.size > requirement.maxSize * 1024 * 1024) {
      toast.error(`Fichier trop volumineux. Maximum: ${requirement.maxSize}MB`);
      return;
    }

    setUploadingDoc(docType);

    try {
      // Create or get application
      let currentApp = dossierApplication;
      if (!currentApp) {
        currentApp = await verificationApplicationsService.create(user.id, {
          dossier_type: 'tenant',
        });
        setDossierApplication(currentApp);
      }

      // Upload file
      const fileUrl = await verificationApplicationsService.uploadFile(
        user.id,
        'tenant',
        file,
        docType
      );

      // Add document to application
      await verificationApplicationsService.addDocument(currentApp.id, {
        document_type: docType,
        document_url: fileUrl,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
      });

      // Update local state
      setDocuments((prev) => ({ ...prev, [docType]: fileUrl }));
      toast.success('Document téléchargé avec succès');
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Erreur lors du téléchargement du document');
    } finally {
      setUploadingDoc(null);
    }
  };

  // Get documents for selected category
  const getRequiredDocumentsForCategory = (category: TenantCategory) => {
    return TENANT_DOCUMENTS.filter((doc) => doc.categories.includes(category));
  };

  const handleCategorySelect = (category: TenantCategory) => {
    setSelectedCategory(category);
    // Save tenant category to profile
    if (user) {
      supabase
        .from('profiles')
        .update({ tenant_category: category } as any)
        .eq('id', user.id)
        .then(({ error }) => {
          if (error) {
            console.error('Error saving tenant category:', error);
          }
        });
    }
  };

  const canSubmitDossier = () => {
    if (!selectedCategory) return false;
    const requiredDocs = getRequiredDocumentsForCategory(selectedCategory).filter(
      (doc) => doc.required
    );
    return requiredDocs.every((doc) => documents[doc.id]);
  };

  const handleTCSubmission = async () => {
    setLoading(true);

    try {
      if (!user?.id) throw new Error('User ID is required');

      console.log('[OnboardingModal] Submitting dossier for user:', user.id);
      console.log('[OnboardingModal] Current dossier application:', dossierApplication);
      console.log('[OnboardingModal] Documents uploaded:', Object.keys(documents));

      // Use existing application or create new one
      let currentApp = dossierApplication;
      if (!currentApp) {
        console.log('[OnboardingModal] Creating new verification application');
        try {
          // Determine dossier_type based on user role
          const dossierType = isTenant ? 'tenant' : isOwner ? 'owner' : isAgency ? 'agency' : 'tenant';
          currentApp = await verificationApplicationsService.create(user.id, {
            dossier_type: dossierType,
          });
          console.log('[OnboardingModal] Application created:', currentApp);
          setDossierApplication(currentApp);
        } catch (createError) {
          console.error('[OnboardingModal] Error creating application:', createError);
          throw createError;
        }
      }

      // Submit the application
      console.log('[OnboardingModal] Submitting application:', currentApp.id);
      try {
        await verificationApplicationsService.submit(currentApp.id);
        console.log('[OnboardingModal] Application submitted successfully');
      } catch (submitError) {
        console.error('[OnboardingModal] Error submitting application:', submitError);
        // Continue anyway - the profile update is more important
      }

      // Update profile directly with supabase
      console.log('[OnboardingModal] Updating profile with submitted_to_tc=true');
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          submitted_to_tc: true,
          profile_setup_completed: true, // Also mark setup as completed
        } as any)
        .eq('id', user.id);

      if (updateError) {
        console.error('[OnboardingModal] Error updating profile:', updateError);
        throw updateError;
      }

      console.log('[OnboardingModal] Profile updated successfully');
      toast.success('Dossier soumis au Tiers de Confiance !');
      setCurrentStep('complete');

      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('[OnboardingModal] Error in handleTCSubmission:', error);
      toast.error(`Erreur: ${error instanceof Error ? error.message : 'Erreur lors de la soumission'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipForNow = async () => {
    if (!user) return;

    setLoading(true);

    try {
      // Préparer les données à sauvegarder
      const updates: Record<string, unknown> = {
        full_name: formData.full_name || null,
        phone: formData.phone || null,
        city: formData.city || null,
        bio: formData.bio || null,
        gender: formData.gender || null,
        // Marquer le setup comme complété pour éviter que le modal ne se réaffiche
        profile_setup_completed: true,
        updated_at: new Date().toISOString(),
      };

      // Ajouter l'adresse si renseignée
      if (formData.address?.trim()) {
        updates['address'] = {
          street: formData.address.trim(),
          city: formData.city?.trim() || '',
        };
      }

      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);

      if (error) throw error;

      // Mettre à jour le contexte AuthProvider avec profile_setup_completed
      await updateProfile({
        full_name: formData.full_name || undefined,
        phone: formData.phone || undefined,
        city: formData.city || undefined,
        bio: formData.bio || undefined,
        gender: formData.gender || undefined,
        profile_setup_completed: true,
      });

      // Informer l'utilisateur que les données ont été sauvegardées
      toast.success('Informations sauvegardées ! Vous pourrez compléter votre profil plus tard.');
      onClose();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Erreur lors de la sauvegarde des informations');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Permettre la fermeture si :
    // 1. 30 secondes se sont écoulées (canClose)
    // 2. OU le profil a un nom complet (l'utilisateur a au moins commencé le profil)
    const canCloseModal = canClose || (formData.full_name && formData.full_name.trim() !== '');

    if (canCloseModal) {
      onClose();
    } else {
      toast.info('Veuillez compléter au moins l\'étape profil pour fermer');
    }
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
      {/* Motivational header */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-5 mb-6">
        <div className="flex items-start gap-3">
          <Star className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-orange-900 mb-2">
              Complétez votre profil pour multiplier vos chances
            </h3>
            <p className="text-sm text-orange-800 mb-3">
              Les propriétaires privilégient les profils complets et vérifiés. Un profil bien renseigné augmente vos chances de réponse jusqu'à <strong>3x</strong> !
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
              <div className="flex items-center gap-2 text-xs text-orange-700">
                <CheckCircle className="w-4 h-4" />
                <span>Plus de visibilité</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-orange-700">
                <CheckCircle className="w-4 h-4" />
                <span>Confiance accrue</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-orange-700">
                <CheckCircle className="w-4 h-4" />
                <span>Location facilitée</span>
              </div>
            </div>
          </div>
        </div>
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
            placeholder="+225 XX XX XX XX XX"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ville
          </label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="Votre ville"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Adresse
          </label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="Votre adresse"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Genre
          </label>
          <select
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="">Sélectionner...</option>
            <option value="Homme">Homme</option>
            <option value="Femme">Femme</option>
            <option value="Non spécifié">Non spécifié</option>
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
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSkipForNow();
            }}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Plus tard
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? 'Enregistrement...' : 'Continuer'}
          </button>
        </div>
      </form>
    </div>
  );

  const renderDocumentsStep = () => {
    {/* Pour les propriétaires et agences : version simplifiée */}
    if (!isTenant) {
      return (
        <div className="space-y-6">
          {/* Motivational header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 mb-6">
            <div className="flex items-start gap-3">
              <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">
                  Obtenez le badge de vérification
                </h3>
                <p className="text-sm text-blue-800 mb-3">
                  Les propriétaires vérifiés reçoivent <strong>2x plus de demandes</strong> et bénéficient d'une crédibilité instantanée auprès des locataires.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
                  <div className="flex items-center gap-2 text-xs text-blue-700">
                    <CheckCircle className="w-4 h-4" />
                    <span>Badge vérifié</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-blue-700">
                    <CheckCircle className="w-4 h-4" />
                    <span>Plus de demandes</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-blue-700">
                    <CheckCircle className="w-4 h-4" />
                    <span>Confiance totale</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
            <div className="flex gap-3">
              <FileText className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">
                  Document requis
                </h3>
                <p className="text-sm text-blue-800">
                  Une pièce d'identité en cours de validité est requise pour vérifier votre identité.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div
              className={`p-4 rounded-xl border ${
                documents['carte_identite']
                  ? 'bg-green-50 border-green-200'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900">Pièce d'identité</h4>
                    <span className="text-red-500 text-xs">*</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Carte d'identité nationale, passeport ou permis de conduire
                  </p>
                  <p className="text-xs text-gray-500">
                    Formats: JPG, PNG, PDF • Max: 5MB
                  </p>
                </div>

                <div>
                  <input
                    type="file"
                    id="doc-carte_identite"
                    className="hidden"
                    accept="image/jpeg,image/png,application/pdf"
                    onChange={(e) => handleDocumentUpload('carte_identite', e.target.files?.[0])}
                    disabled={uploadingDoc === 'carte_identite'}
                  />
                  <label
                    htmlFor="doc-carte_identite"
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                      documents['carte_identite']
                        ? 'bg-green-100 text-green-700 cursor-default'
                        : uploadingDoc === 'carte_identite'
                        ? 'bg-gray-100 text-gray-500 cursor-wait'
                        : 'bg-orange-600 text-white hover:bg-orange-700'
                    }`}
                  >
                    {documents['carte_identite'] ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Uploadé
                      </>
                    ) : uploadingDoc === 'carte_identite' ? (
                      'Upload en cours...'
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Uploader
                      </>
                    )}
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Note :</span> Vous pourrez compléter votre profil et ajouter plus de documents depuis votre profil.
            </p>
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
              type="button"
              onClick={() => setCurrentStep('submit')}
              disabled={!documents['carte_identite']}
              className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continuer
            </button>
          </div>
        </div>
      );
    }

    {/* Pour les locataires : version complète avec catégories */}
    return (
      <div className="space-y-6">
        {/* Motivational header for tenants */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-900 mb-2">
                Obtenez la certification de confiance ANSUT
              </h3>
              <p className="text-sm text-green-800 mb-3">
                Un dossier certifié vous démarque de 95% des candidats. Les propriétaires font confiance aux locataires vérifiés par notre Tiers de Confiance.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
                <div className="flex items-center gap-2 text-xs text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  <span>Signature prioritaire</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  <span>Propriétaires rassurés</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  <span>Crédibilité instantanée</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {!selectedCategory ? (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
            <div className="flex gap-3">
              <FileText className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">
                  Préparez votre dossier de certification
                </h3>
                <p className="text-sm text-blue-800">
                  Sélectionnez votre situation professionnelle pour voir les documents requis.
                  Vous pourrez compléter votre dossier plus tard depuis votre profil.
                </p>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900">
            Quelle est votre situation ?
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => handleCategorySelect('salarie')}
              className="p-6 border-2 border-gray-200 rounded-xl hover:border-orange-400 hover:bg-orange-50 transition-all text-left"
            >
              <Briefcase className="w-8 h-8 text-orange-600 mb-3" />
              <h4 className="font-semibold text-gray-900 mb-1">Salarié</h4>
              <p className="text-sm text-gray-600">
                Contrat de travail, bulletins de salaire...
              </p>
            </button>

            <button
              onClick={() => handleCategorySelect('entrepreneur')}
              className="p-6 border-2 border-gray-200 rounded-xl hover:border-orange-400 hover:bg-orange-50 transition-all text-left"
            >
              <Building className="w-8 h-8 text-orange-600 mb-3" />
              <h4 className="font-semibold text-gray-900 mb-1">Entrepreneur</h4>
              <p className="text-sm text-gray-600">
                Registre de commerce, attestations...
              </p>
            </button>

            <button
              onClick={() => handleCategorySelect('etudiant')}
              className="p-6 border-2 border-gray-200 rounded-xl hover:border-orange-400 hover:bg-orange-50 transition-all text-left"
            >
              <GraduationCap className="w-8 h-8 text-orange-600 mb-3" />
              <h4 className="font-semibold text-gray-900 mb-1">Étudiant</h4>
              <p className="text-sm text-gray-600">
                Carte étudiant, garantie financière...
              </p>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <p className="text-sm text-orange-800">
              <span className="font-semibold">Catégorie sélectionnée :</span> {
                selectedCategory === 'salarie' ? 'Salarié' :
                selectedCategory === 'entrepreneur' ? 'Entrepreneur' :
                'Étudiant'
              }
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Documents requis
            </h3>
            {getRequiredDocumentsForCategory(selectedCategory).map((req) => {
              const isUploaded = documents[req.id];
              const isUploading = uploadingDoc === req.id;

              return (
                <div
                  key={req.id}
                  className={`p-4 rounded-xl border ${
                    isUploaded
                      ? 'bg-green-50 border-green-200'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900">{req.name}</h4>
                        {req.required && (
                          <span className="text-red-500 text-xs">*</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{req.description}</p>
                      <p className="text-xs text-gray-500">
                        Formats: {req.fileTypes.join(', ')} • Max: {req.maxSize}MB
                      </p>
                    </div>

                    <div>
                      <input
                        type="file"
                        id={`doc-${req.id}`}
                        className="hidden"
                        accept={req.fileTypes.join(',')}
                        onChange={(e) => handleDocumentUpload(req.id, e.target.files?.[0])}
                        disabled={isUploading || isUploaded}
                      />
                      <label
                        htmlFor={`doc-${req.id}`}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                          isUploaded
                            ? 'bg-green-100 text-green-700 cursor-default'
                            : isUploading
                            ? 'bg-gray-100 text-gray-500 cursor-wait'
                            : 'bg-orange-600 text-white hover:bg-orange-700'
                        }`}
                      >
                        {isUploaded ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Uploadé
                          </>
                        ) : isUploading ? (
                          'Upload en cours...'
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            Uploader
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Important :</span> Tous les documents marqués d'un astérisque (*) sont obligatoires pour soumettre votre dossier.
            </p>
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
              type="button"
              onClick={() => setCurrentStep('submit')}
              disabled={!canSubmitDossier()}
              className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Soumettre le dossier
            </button>
          </div>
        </div>
      )}
    </div>
    );
  };

  const renderSubmitStep = () => {
    {/* Pour les propriétaires et agences : version simplifiée */}
    if (!isTenant) {
      const hasIdDocument = documents['carte_identite'];

      return (
        <div className="space-y-6">
          {/* Final motivational message */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-5 mb-6">
            <div className="flex items-start gap-3">
              <Zap className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-purple-900 mb-2">
                  Vous y êtes presque ! Finalisez pour débloquer tous les avantages
                </h3>
                <p className="text-sm text-purple-800 mb-3">
                  Une fois votre profil finalisé, accédez à <strong>toutes les fonctionnalités</strong> de la plateforme et commencez à recevoir des demandes de location.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
                  <div className="flex items-center gap-2 text-xs text-purple-700">
                    <TrendingUp className="w-4 h-4" />
                    <span>Recevez des demandes</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-purple-700">
                    <TrendingUp className="w-4 h-4" />
                    <span>Gérez vos biens</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-purple-700">
                    <TrendingUp className="w-4 h-4" />
                    <span>Suivi en temps réel</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">
                  Profil completé
                </h3>
                <p className="text-sm text-blue-800">
                  Une fois votre profil complété, vous pourrez accéder à toutes les fonctionnalités de la plateforme.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <h3 className="font-semibold text-gray-900">Récapitulatif</h3>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                formData.full_name ? 'bg-green-500' : 'bg-gray-300'
              }`}>
                {formData.full_name && (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-gray-700">Profil complété</span>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                hasIdDocument ? 'bg-green-500' : 'bg-gray-300'
              }`}>
                {hasIdDocument && (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-gray-700">Document d'identité uploadé</span>
            </div>
          </div>

          {!hasIdDocument && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm text-amber-800">
                <span className="font-semibold">Attention :</span> Veuillez uploader votre pièce d'identité pour finaliser votre profil.
              </p>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={handleSkipForNow}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Plus tard
            </button>
            <button
              onClick={handleTCSubmission}
              disabled={loading || !hasIdDocument}
              className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? 'Finalisation...' : 'Finaliser mon profil'}
            </button>
          </div>
        </div>
      );
    }

    {/* Pour les locataires : version complète */}
    if (!selectedCategory) return null;

    const requiredDocs = getRequiredDocumentsForCategory(selectedCategory).filter(doc => doc.required);
    const allDocsUploaded = requiredDocs.every(doc => documents[doc.id]);

    return (
      <div className="space-y-6">
        {/* Final motivational message for tenants */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <Zap className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-900 mb-2">
                Dernière étape ! Soumettez pour obtenir votre certification
              </h3>
              <p className="text-sm text-green-800 mb-3">
                Une fois certifié, vous aurez un avantage décisif sur les autres candidats. Les propriétaires font confiance aux locataires vérifiés ANSUT.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
                <div className="flex items-center gap-2 text-xs text-green-700">
                  <TrendingUp className="w-4 h-4" />
                  <span>Signature prioritaire</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-green-700">
                  <TrendingUp className="w-4 h-4" />
                  <span>Badge de confiance</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-green-700">
                  <TrendingUp className="w-4 h-4" />
                  <span>Accès prioritaire</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
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
          <h3 className="font-semibold text-gray-900">Récapitulatif de votre dossier</h3>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              formData.full_name ? 'bg-green-500' : 'bg-gray-300'
            }`}>
              {formData.full_name && (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-sm text-gray-700">Profil complété</span>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              selectedCategory ? 'bg-green-500' : 'bg-gray-300'
            }`}>
              {selectedCategory && (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-sm text-gray-700">
              Catégorie : {selectedCategory === 'salarie' ? 'Salarié' : selectedCategory === 'entrepreneur' ? 'Entrepreneur' : 'Étudiant'}
            </span>
          </div>

          {requiredDocs.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                documents[doc.id] ? 'bg-green-500' : 'bg-gray-300'
              }`}>
                {documents[doc.id] && (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-gray-700">
                {doc.name} {documents[doc.id] ? '✓' : '✗'}
              </span>
            </div>
          ))}
        </div>

        {!allDocsUploaded && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-800">
              <span className="font-semibold">Attention :</span> Tous les documents obligatoires doivent être uploadés pour soumettre votre dossier.
            </p>
          </div>
        )}

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSkipForNow();
            }}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Plus tard
          </button>
          <button
            onClick={handleTCSubmission}
            disabled={loading || !allDocsUploaded}
            className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? 'Soumission...' : 'Soumettre mon dossier'}
          </button>
        </div>
      </div>
    );
  };

  const renderCompleteStep = () => (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Félicitations !
        </h2>
        <p className="text-gray-600">
          Votre onboarding est complet. Le modal va se fermer...
        </p>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {ONBOARDING_STEPS.map((step, index) => {
                const isCompleted = index < stepIndex;
                const isCurrent = index === stepIndex;

                return (
                  <div key={step.id} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                        isCompleted ? 'bg-orange-600 text-white' : isCurrent ? 'bg-orange-100 text-orange-600' : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      {isCompleted ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span className="text-xs font-semibold">{index + 1}</span>
                      )}
                    </div>
                    {index < ONBOARDING_STEPS.length - 1 && (
                      <div className={`w-8 h-0.5 ${isCompleted ? 'bg-orange-600' : 'bg-gray-200'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title={(canClose || (formData.full_name?.trim())) ? 'Fermer' : 'Complétez au moins le profil pour fermer'}
          >
            {(canClose || (formData.full_name?.trim())) ? (
              <X className="w-5 h-5 text-gray-500" />
            ) : (
              <XCircle className="w-5 h-5 text-gray-400" />
            )}
          </button>
        </div>

        {/* Progress info */}
        <div className="text-center py-4 bg-gray-50 border-b border-gray-200">
          <p className="text-sm font-medium text-gray-900">{currentStepInfo.title}</p>
          <p className="text-xs text-gray-500">{currentStepInfo.description}</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {renderStep()}
        </div>
      </div>
    </div>
  );
}
