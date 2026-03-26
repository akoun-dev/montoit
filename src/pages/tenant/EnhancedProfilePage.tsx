import { useState, useEffect, ChangeEvent, useCallback } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  User,
  Shield,
  Camera,
  CheckCircle,
  AlertCircle,
  Home,
  FileText,
  Star,
  Upload,
  Briefcase,
  GraduationCap,
  Building as BuildingIcon,
  Info,
  Send,
  Loader2,
  Eye,
  XCircle,
  Calendar,
  Clock,
} from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import Modal from '@/shared/ui/Modal';
import Input from '@/shared/ui/Input';
import { toast } from '@/hooks/shared/useSafeToast';
import { AddressValue, formatAddress } from '@/shared/utils/address';
import { STORAGE_BUCKETS } from '@/services/upload/uploadService';
import { ScoringService, TENANT_SCORING_WEIGHTS } from '@/services/scoringService';
import { RoleSwitchModal } from '@/shared/ui/Modal';
import verificationApplicationsService, {
  type VerificationApplication,
} from '@/features/verification/services/verificationApplications.service';

interface TenantProfile {
  id: string;
  user_id: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  address: AddressValue;
  bio: string | null;
  avatar_url: string | null;
  user_type: string | null;
  is_verified: boolean | null;
  oneci_verified: boolean | null;
  facial_verification_status?: 'pending' | 'verified' | 'failed' | null;
  facial_verification_date?: string | null;
  facial_verification_score?: number | null;
  trust_score: number | null;
  tenant_score?: number;
  rental_history_count?: number;
  applications_count?: number;
  contracts_count?: number;
  payment_history?: boolean;
  gender?: 'Homme' | 'Femme' | 'Non spécifié' | null;
  tenant_category?: 'salarie' | 'entrepreneur' | 'etudiant' | null;
}


type TenantCategory = 'salarie' | 'entrepreneur' | 'etudiant';

interface TenantDocumentRequirement {
  id: string;
  name: string;
  description: string;
  required: boolean;
  categories: TenantCategory[];
  fileTypes: string[];
  maxSize: number; // in MB
}

// Configuration des documents pour locataires avec catégories
const TENANT_DOCUMENTS: TenantDocumentRequirement[] = [
  // Document commun à tous les locataires
  {
    id: 'carte_identite',
    name: "Carte d'identité ou Passeport",
    description: "Pièce d'identité en cours de validité",
    required: true,
    categories: ['salarie', 'entrepreneur', 'etudiant'],
    fileTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxSize: 5,
  },
  // Locataire Salarié
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
    id: 'justificatif_domicile_salarie',
    name: 'Justificatif de domicile actuel',
    description: 'Facture CIE, SODECI ou quittance de loyer',
    required: true,
    categories: ['salarie'],
    fileTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSize: 5,
  },
  // Locataire Entrepreneur
  {
    id: 'rccm',
    name: "Attestation d'immatriculation (RCCM)",
    description: 'Registre du Commerce et des Crédits Mobiliers',
    required: true,
    categories: ['entrepreneur'],
    fileTypes: ['application/pdf'],
    maxSize: 10,
  },
  {
    id: 'declaration_fiscale',
    name: 'Dernière déclaration fiscale',
    description: 'Déclaration des revenus',
    required: true,
    categories: ['entrepreneur'],
    fileTypes: ['application/pdf'],
    maxSize: 10,
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
    id: 'justificatif_domicile_entrepreneur',
    name: 'Justificatif de domicile actuel',
    description: 'Facture CIE, SODECI',
    required: true,
    categories: ['entrepreneur'],
    fileTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSize: 5,
  },
  // Locataire Étudiant
  {
    id: 'certificat_scolarite',
    name: 'Certificat de scolarité',
    description: "Certificat de l'année en cours",
    required: true,
    categories: ['etudiant'],
    fileTypes: ['application/pdf'],
    maxSize: 5,
  },
  {
    id: 'attestation_bourse',
    name: 'Attestation de bourse',
    description: 'Si vous êtes boursier',
    required: false,
    categories: ['etudiant'],
    fileTypes: ['application/pdf'],
    maxSize: 5,
  },
  {
    id: 'justificatif_domicile_parents',
    name: 'Justificatif de domicile des parents',
    description: 'Facture CIE, SODECI des parents',
    required: true,
    categories: ['etudiant'],
    fileTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSize: 5,
  },
  {
    id: 'piece_identite_garant',
    name: "Pièce d'identité du garant",
    description: 'CNI ou passeport du garant',
    required: true,
    categories: ['etudiant'],
    fileTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxSize: 5,
  },
  {
    id: 'justificatif_revenus_garant',
    name: 'Justificatif de revenus du garant',
    description: 'Bulletins de salaire ou relevés bancaires',
    required: true,
    categories: ['etudiant'],
    fileTypes: ['application/pdf'],
    maxSize: 10,
  },
];

export default function EnhancedProfilePage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'infos');
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [, setUploadingAvatar] = useState(false);
  const [becomingOwner, setBecomingOwner] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showOneciChoiceModal, setShowOneciChoiceModal] = useState(false);

  // Stats dynamiques
  const [, setStats] = useState({
    activeLeases: 0,
    pendingApplications: 0,
    upcomingVisits: 0,
    completedVisits: 0,
  });

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    city: '',
    address: '',
    bio: '',
    gender: '' as 'Homme' | 'Femme' | 'Non spécifié' | '',
  });

  // Documents states
  const [selectedCategory, setSelectedCategory] = useState<TenantCategory | null>(null);
  const [documents, setDocuments] = useState<Record<string, string>>({});
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [, setDocumentsLoading] = useState(false);
  const [submittingDossier, setSubmittingDossier] = useState(false);
  const [dossierApplication, setDossierApplication] = useState<VerificationApplication | null>(
    null
  );
  const [dossierDocCount, setDossierDocCount] = useState(0);

  const facialStatus = profile?.facial_verification_status;

  // Charger les stats dynamiques
  const loadStats = useCallback(async () => {
    if (!user?.id) return;

    try {
      const [leasesRes, applicationsRes, visitsRes] = await Promise.all([
        // Baux actifs
        supabase
          .from('lease_contracts')
          .select('id')
          .eq('tenant_id', user.id)
          .in('status', ['active', 'pending_signature']),

        // Candidatures en cours
        supabase
          .from('rental_applications')
          .select('id')
          .eq('tenant_id', user.id)
          .in('status', ['pending', 'in_progress']),

        // Visites à venir
        supabase
          .from('property_visits')
          .select('id')
          .eq('tenant_id', user.id)
          .gte('visit_date', new Date().toISOString())
          .in('status', ['scheduled', 'confirmed']),
      ]);

      setStats({
        activeLeases: leasesRes.data?.length || 0,
        pendingApplications: applicationsRes.data?.length || 0,
        upcomingVisits: visitsRes.data?.length || 0,
        completedVisits: 0, // Pourrait être calculé si nécessaire
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, [user?.id]);

  // Charger le dossier de certification
  const loadDossierApplication = useCallback(async () => {
    if (!user?.id) return;

    try {
    const applications = await verificationApplicationsService.getUserApplications(
      user.id,
      'tenant'
    );
      // Priorité: dossiers en cours ou récents
      const activeApp =
        applications.find(
          (app) =>
            app.status === 'pending' ||
            app.status === 'in_review' ||
            app.status === 'more_info_requested'
        ) ||
        applications.find((app) => app.status === 'approved') ||
        applications[0] ||
        null;

      if (activeApp) {
        setDossierApplication(activeApp);
        try {
          const appDocuments = await verificationApplicationsService.getDocuments(activeApp.id);
          setDossierDocCount(appDocuments.length);
        } catch (docError) {
          console.error('Error loading dossier documents:', docError);
          setDossierDocCount(0);
        }
      } else {
        setDossierApplication(null);
        setDossierDocCount(0);
      }
    } catch (error) {
      console.error('Error loading dossier application:', error);
    }
  }, [user?.id]);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      let resolvedProfile = profileData || null;

      if (!resolvedProfile) {
        const rawRole =
          (user.user_metadata?.user_type as string | undefined) ||
          (user.user_metadata?.role as string | undefined) ||
          '';
        const normalizedRole = rawRole.toLowerCase().trim();
        const mappedRole =
          normalizedRole === 'owner' || normalizedRole === 'proprietaire'
            ? 'owner'
            : normalizedRole === 'agency' || normalizedRole === 'agence'
              ? 'agency'
              : normalizedRole === 'trust_agent' ||
                  normalizedRole === 'trust-agent' ||
                  normalizedRole === 'tiers_de_confiance' ||
                  normalizedRole === 'tiers-de-confiance'
                ? 'trust_agent'
                : normalizedRole === 'admin'
                  ? 'admin'
                  : normalizedRole === 'tenant' || normalizedRole === 'locataire'
                    ? 'tenant'
                    : null;

        const { data: createdProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email ?? null,
            phone: user.phone ?? null,
            full_name:
              (user.user_metadata?.full_name as string | undefined) ||
              (user.user_metadata?.name as string | undefined) ||
              null,
            user_type: mappedRole,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select('*')
          .single();

        if (insertError) {
          console.warn('Could not auto-create profile:', insertError);
        } else {
          resolvedProfile = createdProfile;
        }
      }

      if (resolvedProfile) {
        // Toujours recalculer et mettre à jour le score pour synchroniser avec la sidebar
        try {
          const { ScoringService } = await import('@/services/scoringService');
          const scoreBreakdown = await ScoringService.calculateGlobalTrustScore(user.id);

          // Mettre à jour le trust_score dans la base de données
          const { error: scoreError } = await supabase
            .from('profiles')
            .update({ trust_score: scoreBreakdown.globalScore })
            .eq('id', user.id);

          if (!scoreError) {
            resolvedProfile.trust_score = scoreBreakdown.globalScore;
          }
        } catch (scoreErr) {
          console.warn('Could not calculate score:', scoreErr);
        }

        setProfile(resolvedProfile);
        setFormData({
          full_name: resolvedProfile.full_name || '',
          phone: resolvedProfile.phone || '',
          city: resolvedProfile.city || '',
          address: resolvedProfile.address ? formatAddress(resolvedProfile.address) : '',
          bio: resolvedProfile.bio || '',
          gender: resolvedProfile.gender || '',
        });
      } else if (error) {
        console.warn('No profile found for user:', error);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadStats();
      loadDossierApplication();
    }
  }, [user, loadProfile, loadStats, loadDossierApplication]);

  useEffect(() => {
    if (profile?.avatar_url) {
      // No-op: avatar already synced via profile load
    }
  }, [profile?.avatar_url]);

  const handleSaveProfile = async (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    // Validation des champs obligatoires
    if (!formData.full_name?.trim()) {
      toast.error('Le nom complet est obligatoire');
      return;
    }
    if (!formData.phone?.trim()) {
      toast.error('Le téléphone est obligatoire');
      return;
    }
    if (!formData.city?.trim()) {
      toast.error('La ville est obligatoire');
      return;
    }
    if (!formData.address?.trim()) {
      toast.error("L'adresse est obligatoire");
      return;
    }
    if (!formData.gender) {
      toast.error('Le genre est obligatoire');
      return;
    }

    setSaving(true);

    try {
      const addressPayload = {
        street: formData.address.trim(),
        city: formData.city.trim(),
      };

      const updates: Record<string, unknown> = {
        full_name: formData.full_name,
        phone: formData.phone,
        city: formData.city,
        address: addressPayload,
        bio: formData.bio,
        gender: formData.gender,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);

      if (error) throw error;

      // Calculer et mettre à jour le score de confiance
      try {
        const { ScoringService } = await import('@/services/scoringService');
        const scoreBreakdown = await ScoringService.calculateGlobalTrustScore(user.id);

        // Mettre à jour le trust_score dans la base de données
        const { error: scoreError } = await supabase
          .from('profiles')
          .update({ trust_score: scoreBreakdown.globalScore })
          .eq('id', user.id);

        if (scoreError) {
          console.warn('Could not update trust_score:', scoreError);
        }
      } catch (scoreErr) {
        console.warn('Could not calculate score:', scoreErr);
      }

      await loadProfile();
      toast.success('Profil mis à jour avec succès');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Échec de la mise à jour du profil');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;
    const file = e.target.files[0];

    try {
      setUploadingAvatar(true);
      const fileName = `${user.id}/avatar-${Date.now()}`;
      const bucket = STORAGE_BUCKETS.AVATARS;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(fileName);

      const publicUrl = publicUrlData?.publicUrl;
      if (!publicUrl) throw new Error('URL publique introuvable');

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
      if (updateError) throw updateError;

      // Calculer et mettre à jour le score après l'upload de l'avatar
      try {
        const { ScoringService } = await import('@/services/scoringService');
        const scoreBreakdown = await ScoringService.calculateGlobalTrustScore(user.id);

        // Mettre à jour le trust_score dans la base de données
        const { error: scoreError } = await supabase
          .from('profiles')
          .update({ trust_score: scoreBreakdown.globalScore })
          .eq('id', user.id);

        if (scoreError) {
          console.warn('Could not update trust_score:', scoreError);
        }
      } catch (scoreErr) {
        console.warn('Could not calculate score:', scoreErr);
      }

      await loadProfile();
      toast.success('Photo de profil mise à jour');
    } catch (err) {
      console.error('Error uploading avatar:', err);
      toast.error('Échec du téléchargement de la photo');
    } finally {
      setUploadingAvatar(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleBecomeOwner = () => {
    if (!user) return;
    setShowRoleModal(true);
  };

  const handleConfirmRoleSwitch = async () => {
    if (!user) return;

    setBecomingOwner(true);

    try {
      // Mettre à jour le user_type directement dans la base de données
      const { error } = await supabase
        .from('profiles')
        .update({ user_type: 'owner' })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Vous êtes maintenant propriétaire ! Redirection...');

      // Rediriger immédiatement sans attendre
      window.location.href = '/proprietaire/dashboard';
    } catch (error) {
      console.error('Error becoming owner:', error);
      toast.error('Échec de la modification du rôle');
      setBecomingOwner(false);
    }
    // Note: setBecomingOwner(false) n'est pas appelé en cas de succès car on redirige
  };

  const handleOpenOneciChoiceModal = () => setShowOneciChoiceModal(true);
  const handleCloseOneciChoiceModal = () => setShowOneciChoiceModal(false);
  const handleRedirectFromOneciChoice = (path: string) => {
    handleCloseOneciChoiceModal();
    navigate(path);
  };

  // Get documents for selected category
  const getRequiredDocumentsForCategory = (category: TenantCategory) => {
    return TENANT_DOCUMENTS.filter((doc) => doc.categories.includes(category));
  };

  // Get category label
  const getCategoryLabel = (category: TenantCategory): string => {
    const labels = {
      salarie: 'Salarié',
      entrepreneur: 'Entrepreneur',
      etudiant: 'Étudiant',
    };
    return labels[category];
  };

  // Handle category selection
  const handleCategorySelect = (category: TenantCategory) => {
    setSelectedCategory(category);
    // Save tenant category to profile
    if (user) {
      supabase
        .from('profiles')
        .update({ tenant_category: category })
        .eq('id', user.id)
        .then(() => {
          // Load existing documents for this category
          loadDocumentsForCategory();
        });
    }
  };

  // Load documents for the selected category
  const loadDocumentsForCategory = async () => {
    if (!user) return;

    try {
      setDocumentsLoading(true);

      // Get the tenant verification application
      const applications = await verificationApplicationsService.getUserApplications(
        user.id,
        'tenant'
      );
      const activeApp =
        applications.find(
          (app) =>
            app.status === 'pending' ||
            app.status === 'in_review' ||
            app.status === 'more_info_requested'
        ) ||
        applications[0] ||
        null;

      if (activeApp) {
        setDossierApplication(activeApp);
        const appDocuments = await verificationApplicationsService.getDocuments(activeApp.id);
        const docsMap: Record<string, string> = {};
        appDocuments.forEach((doc) => {
          docsMap[doc.document_type] = doc.document_url;
        });
        setDocuments(docsMap);
        setDossierDocCount(appDocuments.length);
      } else {
        setDossierDocCount(0);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setDocumentsLoading(false);
    }
  };

  // Handle document upload
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
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: unknown }).message)
          : '';
      if (message.toLowerCase().includes('bucket') && message.toLowerCase().includes('not found')) {
        toast.error(
          "Espace de stockage introuvable. Créez le bucket 'documents' dans Supabase Storage."
        );
      } else {
        toast.error('Erreur lors du téléchargement du document');
      }
    } finally {
      setUploadingDoc(null);
    }
  };

  // Check if dossier can be submitted
  const canSubmitDossier = () => {
    if (!selectedCategory) return false;
    const requiredDocs = getRequiredDocumentsForCategory(selectedCategory).filter(
      (doc) => doc.required
    );
    return requiredDocs.every((doc) => documents[doc.id]);
  };

  // Handle dossier submission
  const handleDossierSubmit = async () => {
    if (!canSubmitDossier()) {
      toast.error('Veuillez télécharger tous les documents requis');
      return;
    }

    setSubmittingDossier(true);

    try {
      // Create application if it doesn't exist
      let currentApp = dossierApplication;
      if (!currentApp) {
        currentApp = await verificationApplicationsService.create(user.id, {
          dossier_type: 'tenant',
        });
        setDossierApplication(currentApp);
      }

      await verificationApplicationsService.submit(currentApp.id);
      toast.success('Dossier soumis avec succès !');
      await loadDocumentsForCategory();
    } catch (error) {
      console.error('Error submitting dossier:', error);
      toast.error('Erreur lors de la soumission du dossier');
    } finally {
      setSubmittingDossier(false);
    }
  };

  const displayName = (profile?.full_name && profile.full_name.trim()) || 'Utilisateur';
  const addressLabel = profile?.address
    ? formatAddress(profile.address, profile?.city || undefined)
    : '';
  const profileScoreResult = profile ? ScoringService.calculateProfileScore(profile) : null;
  const profileComplete = profileScoreResult
    ? ScoringService.isProfileComplete(profileScoreResult.details)
    : false;
  const profileCompletionChecks = [
    { label: 'Nom', ok: profileScoreResult?.details.fullName ?? false },
    { label: 'Téléphone', ok: profileScoreResult?.details.phone ?? false },
    { label: 'Ville', ok: profileScoreResult?.details.city ?? false },
    { label: 'Adresse', ok: profileScoreResult?.details.address ?? false },
    { label: 'Genre', ok: profileScoreResult?.details.gender ?? false },
  ];
  const completedProfileFields = profileCompletionChecks.filter((item) => item.ok).length;
  const profileCompletionPercent = Math.round(
    (completedProfileFields / profileCompletionChecks.length) * 100
  );
  const missingProfileFields = profileCompletionChecks
    .filter((item) => !item.ok)
    .map((item) => item.label);
  const dossierHasDocs = dossierDocCount > 0;
  const dossierStatus = dossierHasDocs ? dossierApplication?.status : null;
  const dossierSubmitted = dossierApplication
    ? dossierApplication.status !== 'pending' ||
      dossierApplication.submitted_at !== dossierApplication.created_at
    : false;
  const dossierDisplayStatus = dossierHasDocs
    ? dossierSubmitted
      ? dossierStatus
      : 'draft'
    : null;
  const dossierApproved = dossierDisplayStatus === 'approved';
  const computedTrustScore =
    (profileComplete ? TENANT_SCORING_WEIGHTS.profileComplete : 0) +
    (profile?.facial_verification_status === 'verified' ? TENANT_SCORING_WEIGHTS.facial : 0) +
    (profile?.oneci_verified ? TENANT_SCORING_WEIGHTS.oneci : 0) +
    (dossierApproved && dossierHasDocs ? TENANT_SCORING_WEIGHTS.dossier : 0);
  const trustScoreClamped = Math.min(100, Math.max(0, Math.round(computedTrustScore)));
  const trustSteps = [
    {
      id: 'profile',
      label: 'Informations profil',
      weight: TENANT_SCORING_WEIGHTS.profileComplete,
      done: profileComplete,
    },
    {
      id: 'facial',
      label: 'Reconnaissance faciale',
      weight: TENANT_SCORING_WEIGHTS.facial,
      done: profile?.facial_verification_status === 'verified',
    },
    {
      id: 'oneci',
      label: "Vérification d'identé (ONECI)",
      weight: TENANT_SCORING_WEIGHTS.oneci,
      done: !!profile?.oneci_verified,
    },
    {
      id: 'dossier',
      label: 'Dossier locataire',
      weight: TENANT_SCORING_WEIGHTS.dossier,
      done: dossierApproved,
    },
  ];

  const tabs = [
    { id: 'infos', label: 'Informations profil', icon: User },
    { id: 'verification', label: "Vérifications d'identité", icon: Shield },
    { id: 'history', label: 'Historique', icon: Calendar },
    { id: 'dossier', label: 'Dossier locataire', icon: FileText },
    { id: 'stats', label: 'Statistiques', icon: Star },
  ];

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div>
        <div className="w-full">
          {/* Profile Header - Expérience enrichie */}
          <div className="relative overflow-hidden rounded-2xl border border-[#EFEBE9] p-6 mb-6 bg-gradient-to-br from-white via-white to-[#FFF4EC] animate-fade-in">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(241,101,34,0.08),_transparent_55%)]" />
            <div className="absolute -bottom-16 -right-10 w-40 h-40 bg-[#2C1810]/10 rounded-full blur-3xl" />
            <div className="relative grid gap-6 lg:grid-cols-[1.35fr,0.9fr]">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="relative">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={displayName}
                        className="w-16 h-16 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#F16522] to-[#D95318] flex items-center justify-center">
                        <User className="w-7 h-7 text-white" />
                      </div>
                    )}
                    <label className="absolute -bottom-2 -right-2 bg-white rounded-lg p-1 shadow-sm cursor-pointer hover:bg-[#FAF7F4] border border-[#EFEBE9]">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                        id="avatar-upload"
                      />
                      <Camera className="w-3 h-3 text-gray-600" />
                    </label>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-[#2C1810]">{displayName}</h2>
                      {profile?.is_verified ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          Vérifié
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                          <AlertCircle className="w-3 h-3" />
                          À compléter
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#6B5A4E] mt-0.5">
                      {profile?.city || 'Ville non renseignée'}
                    </p>
                    {addressLabel ? (
                      <p className="text-xs text-[#8B7355] mt-1">{addressLabel}</p>
                    ) : null}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-[#6B5A4E] mb-1">
                    <span>Profil complété</span>
                    <span className="font-semibold text-[#2C1810]">
                      {completedProfileFields}/{profileCompletionChecks.length}
                    </span>
                  </div>
                  <div className="w-full bg-[#FAF7F4] rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-[#F16522] to-[#D95318] transition-all"
                      style={{ width: `${profileCompletionPercent}%` }}
                    />
                  </div>
                  {missingProfileFields.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {missingProfileFields.map((item) => (
                        <span
                          key={item}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFF2E6] text-[#9C3D0D] border border-[#F5D9C6]"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleBecomeOwner}
                    disabled={becomingOwner}
                    className="px-3 py-2 text-sm font-medium rounded-xl border border-[#F16522] text-[#F16522] hover:bg-[#FFF2E6] transition-colors disabled:opacity-50"
                  >
                    {becomingOwner ? '...' : ' Devenir propriétaire'}
                  </button>
                </div>
              </div>

              <div className="bg-white/90 border border-[#F2E7DE] rounded-2xl p-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-[#6B5A4E]">
                      Global Trust Score
                    </p>
                    <p className="text-3xl font-bold text-[#F16522]">{trustScoreClamped}%</p>
                    <p className="text-xs text-[#6B5A4E] mt-1">
                      Objectif: 70%+ pour être prioritaire
                    </p>
                  </div>
                  <div className="relative w-20 h-20">
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: `conic-gradient(#F16522 ${trustScoreClamped * 3.6}deg, #F5E9DF 0deg)`,
                      }}
                    />
                    <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center text-sm font-semibold text-[#2C1810]">
                      {trustScoreClamped}%
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {trustSteps.map((step) => (
                    <div key={step.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {step.done ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-500" />
                        )}
                        <span className="text-[#2C1810]">{step.label}</span>
                      </div>
                      <span className={step.done ? 'text-green-600' : 'text-[#6B5A4E]'}>
                        +{step.weight}%
                      </span>
                    </div>
                  ))}
                </div>

                {!profileComplete && (
                  <div className="mt-3 text-xs text-[#9C3D0D] bg-[#FFF2E6] border border-[#F5D9C6] rounded-lg px-3 py-2">
                    Complétez votre profil pour débloquer{' '}
                    <strong>+{TENANT_SCORING_WEIGHTS.profileComplete}%</strong>.
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Tabs Navigation - Responsive */}
          <div className="bg-white rounded-2xl border border-[#EFEBE9] mb-5">
            <div className="flex items-center justify-between px-4 pt-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#A69B95]">Navigation</p>
              <span className="text-xs text-[#6B5A4E]">Glissez pour voir</span>
            </div>
            <nav className="mt-3 px-3 pb-3 overflow-x-auto">
              <div className="flex gap-2 min-w-max">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      aria-pressed={isActive}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold text-sm transition-all whitespace-nowrap border ${
                        isActive
                          ? 'bg-[#F16522] text-white border-[#F16522] shadow-md shadow-orange-500/20'
                          : 'bg-white text-[#6B5A4E] border-[#EFEBE9] hover:bg-[#FAF7F4] hover:text-[#2C1810]'
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full ${
                          isActive ? 'bg-white/20' : 'bg-[#F5E6D3] text-[#9C3D0D]'
                        }`}
                      >
                        <tab.icon className="w-4 h-4" />
                      </span>
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4 sm:p-6">
            {activeTab === 'infos' && (
              <div className="grid grid-cols-1 xl:grid-cols-[1.15fr,0.85fr] gap-6">
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <section className="rounded-2xl border border-[#EFEBE9] bg-[#FAF7F4] p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base font-semibold text-[#2C1810]">Identité</h3>
                        <p className="text-xs text-[#8B7355]">Les informations principales</p>
                      </div>
                      <span className="text-[11px] text-[#9C3D0D] bg-[#FFF2E6] border border-[#F5D9C6] px-2 py-1 rounded-full">
                        Obligatoire
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nom complet <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="text"
                          value={formData.full_name}
                          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                          placeholder="Votre nom complet"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Genre <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.gender}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              gender: e.target.value as 'Homme' | 'Femme' | 'Non spécifié' | '',
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          required
                        >
                          <option value="">Sélectionner...</option>
                          <option value="Homme">Homme</option>
                          <option value="Femme">Femme</option>
                          <option value="Non spécifié">Non spécifié</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                        <Input
                          type="email"
                          value={profile?.email || ''}
                          disabled
                          className="bg-gray-50"
                        />
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-[#EFEBE9] bg-white p-4 sm:p-5">
                    <div className="mb-4">
                      <h3 className="text-base font-semibold text-[#2C1810]">Coordonnées</h3>
                      <p className="text-xs text-[#8B7355]">Pour vous contacter rapidement</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Téléphone <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="Votre numéro de téléphone"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Ville <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="text"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          placeholder="Votre ville"
                          required
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Adresse <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="text"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          placeholder="Quartier, rue, repères utiles"
                          required
                        />
                        <p className="text-[11px] text-[#A69B95] mt-1">
                          Exemple: Cocody, Riviera 3, près de la pharmacie
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-[#EFEBE9] bg-white p-4 sm:p-5">
                    <div className="mb-4">
                      <h3 className="text-base font-semibold text-[#2C1810]">Présentation</h3>
                      <p className="text-xs text-[#8B7355]">Aidez les propriétaires à vous connaître</p>
                    </div>
                    <textarea
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      rows={5}
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      placeholder="Décrivez votre situation, votre métier, et pourquoi ce logement vous convient."
                    />
                  </section>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-xs text-[#8B7355]">
                      Les champs marqués <span className="text-red-500">*</span> sont requis.
                    </div>
                    <Button type="submit" disabled={saving} className="flex items-center gap-2">
                      {saving ? 'Enregistrement...' : 'Enregistrer'}
                    </Button>
                  </div>
                </form>

                <aside className="space-y-4">
                  <div className="rounded-2xl border border-[#EFEBE9] bg-white p-4">
                    <h4 className="text-sm font-semibold text-[#2C1810] mb-2">Checklist profil</h4>
                    <div className="space-y-2">
                      {profileCompletionChecks.map((item) => (
                        <div key={item.label} className="flex items-center justify-between text-sm">
                          <span className="text-[#6B5A4E]">{item.label}</span>
                          {item.ok ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#F5D9C6] bg-[#FFF2E6] p-4">
                    <p className="text-sm font-semibold text-[#9C3D0D]">Astuce score</p>
                    <p className="text-xs text-[#8B7355] mt-1">
                      Profil complet = <strong>+{TENANT_SCORING_WEIGHTS.profileComplete}%</strong>.
                      Ajoutez vos infos pour débloquer votre score.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#EFEBE9] bg-white p-4">
                    <p className="text-sm font-semibold text-[#2C1810]">Pourquoi ces infos ?</p>
                    <p className="text-xs text-[#8B7355] mt-1">
                      Elles améliorent votre crédibilité et accélèrent la validation des dossiers
                      auprès des propriétaires.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('verification')}
                      className="mt-3 text-xs font-semibold text-[#F16522] hover:underline"
                    >
                      Voir les vérifications →
                    </button>
                  </div>
                </aside>
              </div>
            )}

            {activeTab === 'verification' && (
              <div className="space-y-6">
                {/* Progress Overview */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                    <h3 className="text-base font-semibold text-[#2C1810]">Vos vérifications</h3>
                    <span className="text-sm text-[#6B5A4E]">
                      {
                        [
                          profile?.is_verified,
                          profile?.oneci_verified,
                          facialStatus === 'verified',
                          dossierStatus === 'approved',
                        ].filter(Boolean).length
                      }
                      /4 complétées
                    </span>
                  </div>
                  <div className="w-full bg-[#FAF7F4] rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-[#F16522] to-[#D95318] transition-all"
                      style={{
                        width: `${([profile?.is_verified, profile?.oneci_verified, facialStatus === 'verified', dossierStatus === 'approved'].filter(Boolean).length / 4) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Verification Grid */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Profil - Toujours vérifié */}
                  <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-green-900">Profil complet</h4>
                        <p className="text-sm text-green-700 mt-1">Informations de base complétées</p>
                      </div>
                    </div>
                  </div>

                  {/* ONECI */}
                  <div
                    className={`p-4 rounded-xl border ${profile?.oneci_verified ? 'bg-green-50 border-green-200' : 'bg-white border-[#EFEBE9]'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-lg ${profile?.oneci_verified ? 'bg-green-100' : 'bg-amber-100'}`}
                      >
                        {profile?.oneci_verified ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-amber-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4
                          className={`font-medium ${profile?.oneci_verified ? 'text-green-900' : 'text-[#2C1810]'}`}
                        >
                          Vérification ONECI
                        </h4>
                        <p
                          className={`text-sm mt-1 ${profile?.oneci_verified ? 'text-green-700' : 'text-[#6B5A4E]'}`}
                        >
                          {profile?.oneci_verified
                            ? "Carte d'identité vérifiée"
                            : "Pièce d'identité requise"}
                        </p>
                        {profile?.oneci_verified ? (
                          <button
                            onClick={() => navigate('/verification-oneci?redo=true')}
                            className="mt-2 text-sm text-[#F16522] hover:underline font-medium"
                          >
                            Refaire la vérification →
                          </button>
                        ) : (
                          <button
                            onClick={handleOpenOneciChoiceModal}
                            className="mt-2 text-sm text-[#F16522] hover:underline font-medium"
                          >
                            Vérifier maintenant →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Facial Recognition */}
                  <div
                    className={`p-4 rounded-xl border ${facialStatus === 'verified' ? 'bg-green-50 border-green-200' : facialStatus === 'pending' || facialStatus === 'in_review' ? 'bg-blue-50 border-blue-200' : facialStatus === 'failed' ? 'bg-red-50 border-red-200' : 'bg-white border-[#EFEBE9]'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-lg ${facialStatus === 'verified' ? 'bg-green-100' : facialStatus === 'pending' || facialStatus === 'in_review' ? 'bg-blue-100' : facialStatus === 'failed' ? 'bg-red-100' : 'bg-gray-100'}`}
                      >
                        {facialStatus === 'verified' ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : facialStatus === 'failed' ? (
                          <XCircle className="w-5 h-5 text-red-600" />
                        ) : facialStatus === 'pending' || facialStatus === 'in_review' ? (
                          <Eye className="w-5 h-5 text-blue-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-gray-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4
                          className={`font-medium ${facialStatus === 'verified' ? 'text-green-900' : facialStatus === 'failed' ? 'text-red-900' : 'text-[#2C1810]'}`}
                        >
                          Reconnaissance faciale
                        </h4>
                        <p
                          className={`text-sm mt-1 ${facialStatus === 'verified' ? 'text-green-700' : facialStatus === 'failed' ? 'text-red-700' : facialStatus === 'pending' || facialStatus === 'in_review' ? 'text-blue-700' : 'text-[#6B5A4E]'}`}
                        >
                          {facialStatus === 'verified'
                            ? `Vérifié (${((profile?.facial_verification_score || 0) * 100).toFixed(0)}%)`
                            : facialStatus === 'failed'
                              ? 'Échec de la vérification'
                              : facialStatus === 'pending' || facialStatus === 'in_review'
                                ? 'En cours de vérification'
                                : 'Vérification biométrique requise'}
                        </p>
                        {facialStatus !== 'verified' &&
                          facialStatus !== 'in_review' &&
                          facialStatus !== 'pending' && (
                            <button
                              onClick={() => navigate('/verification-biometrique?reset=true')}
                              className="mt-2 text-sm text-[#F16522] hover:underline font-medium"
                            >
                              {facialStatus === 'failed' ? 'Réessayer' : 'Commencer'} →
                            </button>
                          )}
                      </div>
                    </div>
                  </div>

                  {/* Dossier */}
                  <div
                    className={`p-4 rounded-xl border ${dossierDisplayStatus === 'approved' ? 'bg-green-50 border-green-200' : dossierDisplayStatus === 'pending' || dossierDisplayStatus === 'in_review' ? 'bg-blue-50 border-blue-200' : dossierDisplayStatus === 'more_info_requested' ? 'bg-purple-50 border-purple-200' : dossierDisplayStatus === 'rejected' ? 'bg-red-50 border-red-200' : dossierDisplayStatus === 'draft' ? 'bg-amber-50 border-amber-200' : 'bg-white border-[#EFEBE9]'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-lg ${dossierDisplayStatus === 'approved' ? 'bg-green-100' : dossierDisplayStatus === 'pending' || dossierDisplayStatus === 'in_review' ? 'bg-blue-100' : dossierDisplayStatus === 'more_info_requested' ? 'bg-purple-100' : dossierDisplayStatus === 'rejected' ? 'bg-red-100' : dossierDisplayStatus === 'draft' ? 'bg-amber-100' : 'bg-gray-100'}`}
                      >
                        {dossierDisplayStatus === 'approved' ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : dossierDisplayStatus === 'rejected' ? (
                          <XCircle className="w-5 h-5 text-red-600" />
                        ) : dossierDisplayStatus === 'pending' ||
                          dossierDisplayStatus === 'in_review' ? (
                          <Eye className="w-5 h-5 text-blue-600" />
                        ) : dossierDisplayStatus === 'more_info_requested' ? (
                          <AlertCircle className="w-5 h-5 text-purple-600" />
                        ) : dossierDisplayStatus === 'draft' ? (
                          <Clock className="w-5 h-5 text-amber-600" />
                        ) : (
                          <FileText className="w-5 h-5 text-gray-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4
                          className={`font-medium ${dossierDisplayStatus === 'approved' ? 'text-green-900' : dossierDisplayStatus === 'rejected' ? 'text-red-900' : 'text-[#2C1810]'}`}
                        >
                          Dossier de certification
                        </h4>
                        <p
                          className={`text-sm mt-1 ${dossierDisplayStatus === 'approved' ? 'text-green-700' : dossierDisplayStatus === 'rejected' ? 'text-red-700' : dossierDisplayStatus === 'pending' || dossierDisplayStatus === 'in_review' ? 'text-blue-700' : dossierDisplayStatus === 'more_info_requested' ? 'text-purple-700' : dossierDisplayStatus === 'draft' ? 'text-amber-700' : 'text-[#6B5A4E]'}`}
                        >
                          {dossierDisplayStatus === 'approved'
                            ? 'Certification ANSUT obtenue'
                            : dossierDisplayStatus === 'rejected'
                              ? dossierApplication?.rejection_reason || 'Dossier refusé'
                              : dossierDisplayStatus === 'pending'
                                ? 'Dossier soumis - En attente'
                                : dossierDisplayStatus === 'in_review'
                                  ? "Dossier en cours d'examen"
                                  : dossierDisplayStatus === 'more_info_requested'
                                    ? 'Informations supplémentaires demandées'
                                    : dossierDisplayStatus === 'draft'
                                      ? 'Préparez vos documents avant soumission'
                                    : 'Documents pour certification'}
                        </p>
                        {dossierDisplayStatus !== 'approved' &&
                          dossierDisplayStatus !== 'pending' &&
                          dossierDisplayStatus !== 'in_review' && (
                            <button
                              onClick={() => setActiveTab('dossier')}
                              className="mt-2 text-sm text-[#F16522] hover:underline font-medium"
                            >
                              {dossierDisplayStatus === 'rejected' ||
                              dossierDisplayStatus === 'more_info_requested'
                                ? 'Compléter'
                                : dossierDisplayStatus === 'draft'
                                  ? 'Continuer'
                                  : 'Commencer'}{' '}
                              →
                            </button>
                          )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Benefits Section */}
                <div className="p-4 bg-gradient-to-r from-[#F16522]/5 to-[#D95318]/5 rounded-xl border border-[#F16522]/20">
                  <div className="flex gap-3">
                    <Shield className="w-5 h-5 text-[#F16522] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-[#2C1810]">Pourquoi vous certifier ?</p>
                      <p className="text-sm text-[#6B5A4E] mt-1">
                        Un profil vérifié augmente vos chances d'acceptation par les propriétaires
                        et vous donne accès aux logements exclusifs ANSUT.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Historique locatif</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <p className="text-sm text-gray-600">Locations passées</p>
                        <p className="text-2xl font-bold">{profile?.rental_history_count || 0}</p>
                      </div>
                      <Home className="w-8 h-8 text-blue-500 flex-shrink-0 mt-1" />
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Candidatures</p>
                        <p className="text-2xl font-bold">{profile?.applications_count || 0}</p>
                      </div>
                      <FileText className="w-8 h-8 text-purple-500 flex-shrink-0 mt-1" />
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Contrats</p>
                        <p className="text-2xl font-bold">{profile?.contracts_count || 0}</p>
                      </div>
                      <FileText className="w-8 h-8 text-green-500 flex-shrink-0 mt-1" />
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <Button className="flex items-center gap-2">Voir l'historique complet</Button>
                </div>
              </div>
            )}

            {activeTab === 'dossier' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Dossier locataire
                </h3>

                {/* Statut du dossier - Section visible */}
                <div className="mb-6">
                  {!dossierHasDocs ? (
                    /* Aucun dossier commence */
                    <div className="p-5 bg-slate-50 border-2 border-slate-200 rounded-2xl">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="p-3 bg-slate-100 rounded-xl flex-shrink-0">
                          <Upload className="w-6 h-6 text-slate-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-900">Dossier non commence</h4>
                          <p className="text-sm text-slate-600 mt-1">
                            Selectionnez votre situation et uploadez vos documents pour commencer
                            votre certification
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full border bg-slate-100 text-slate-700 border-slate-200 self-start sm:self-auto sm:ml-auto">
                          <Clock className="w-3.5 h-3.5" />
                          <span>À commencer</span>
                        </span>
                      </div>
                    </div>
                  ) : dossierDisplayStatus === 'draft' ? (
                    <div className="p-5 bg-amber-50 border-2 border-amber-200 rounded-2xl">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="p-3 bg-amber-100 rounded-xl flex-shrink-0">
                          <Clock className="w-6 h-6 text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-amber-900">Dossier en preparation</h4>
                          <p className="text-sm text-amber-700 mt-1">
                            Vos documents sont en cours de préparation. Soumettez le dossier
                            lorsque tout est prêt.
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full border bg-amber-100 text-amber-700 border-amber-200 self-start sm:self-auto sm:ml-auto">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Préparation</span>
                        </span>
                      </div>
                    </div>
                  ) : dossierDisplayStatus === 'pending' ? (
                    <div className="p-5 bg-amber-50 border-2 border-amber-200 rounded-2xl">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="p-3 bg-amber-100 rounded-xl flex-shrink-0">
                          <Clock className="w-6 h-6 text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-amber-900">
                            Dossier soumis - En attente de verification
                          </h4>
                          <p className="text-sm text-amber-700 mt-1">
                            Votre dossier a ete recu et sera examine par notre equipe sous peu
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full border bg-amber-100 text-amber-700 border-amber-200 self-start sm:self-auto sm:ml-auto">
                          <Clock className="w-3.5 h-3.5" />
                          <span>En attente</span>
                        </span>
                      </div>
                    </div>
                  ) : dossierDisplayStatus === 'in_review' ? (
                    <div className="p-5 bg-blue-50 border-2 border-blue-200 rounded-2xl">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-xl flex-shrink-0">
                          <Eye className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-blue-900">Dossier en cours d'examen</h4>
                          <p className="text-sm text-blue-700 mt-1">
                            Notre equipe est en train de verifier vos documents
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full border bg-blue-100 text-blue-700 border-blue-200 self-start sm:self-auto sm:ml-auto">
                          <Eye className="w-3.5 h-3.5" />
                          <span>En cours</span>
                        </span>
                      </div>
                    </div>
                  ) : dossierDisplayStatus === 'more_info_requested' ? (
                    <div className="p-5 bg-purple-50 border-2 border-purple-200 rounded-2xl">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="p-3 bg-purple-100 rounded-xl flex-shrink-0">
                          <AlertCircle className="w-6 h-6 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-purple-900">
                            Informations supplementaires demandees
                          </h4>
                          <p className="text-sm text-purple-700 mt-1">
                            {dossierApplication.rejection_reason ||
                              'Veuillez completer votre dossier avec les documents demandes'}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full border bg-purple-100 text-purple-700 border-purple-200 self-start sm:self-auto sm:ml-auto">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Infos demandees</span>
                        </span>
                      </div>
                    </div>
                  ) : dossierDisplayStatus === 'approved' ? (
                    <div className="p-5 bg-green-50 border-2 border-green-200 rounded-2xl">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="p-3 bg-green-100 rounded-xl flex-shrink-0">
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-green-900">Dossier valide !</h4>
                          <p className="text-sm text-green-700 mt-1">
                            Felicitations ! Votre dossier a ete approuve et vous etes desormais
                            certifie ANSUT
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full border bg-green-100 text-green-700 border-green-200 self-start sm:self-auto sm:ml-auto">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Valide</span>
                        </span>
                      </div>
                    </div>
                  ) : dossierDisplayStatus === 'rejected' ? (
                    <div className="p-5 bg-red-50 border-2 border-red-200 rounded-2xl">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="p-3 bg-red-100 rounded-xl flex-shrink-0">
                          <XCircle className="w-6 h-6 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-red-900">Dossier refuse</h4>
                          <p className="text-sm text-red-700 mt-1">
                            {dossierApplication.rejection_reason ||
                              "Votre dossier n'a pas pu etre valide. Veuillez reessayer."}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full border bg-red-100 text-red-700 border-red-200 self-start sm:self-auto sm:ml-auto">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Refuse</span>
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Category Selection */}
                {!selectedCategory && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Sélectionnez votre situation pour voir les documents à fournir
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <button
                        onClick={() => handleCategorySelect('salarie')}
                        className="p-4 rounded-xl border-2 text-left transition-all hover:border-blue-400 hover:bg-blue-50"
                      >
                        <Briefcase className="w-6 h-6 text-blue-600 mb-2" />
                        <h4 className="font-semibold text-gray-900">Salarié</h4>
                        <p className="text-xs text-gray-500 mt-1">
                          Employé avec contrat de travail
                        </p>
                      </button>

                      <button
                        onClick={() => handleCategorySelect('entrepreneur')}
                        className="p-4 rounded-xl border-2 text-left transition-all hover:border-purple-400 hover:bg-purple-50"
                      >
                        <BuildingIcon className="w-6 h-6 text-purple-600 mb-2" />
                        <h4 className="font-semibold text-gray-900">Entrepreneur</h4>
                        <p className="text-xs text-gray-500 mt-1">Travailleur indépendant</p>
                      </button>

                      <button
                        onClick={() => handleCategorySelect('etudiant')}
                        className="p-4 rounded-xl border-2 text-left transition-all hover:border-green-400 hover:bg-green-50"
                      >
                        <GraduationCap className="w-6 h-6 text-green-600 mb-2" />
                        <h4 className="font-semibold text-gray-900">Étudiant</h4>
                        <p className="text-xs text-gray-500 mt-1">Inscrit dans un établissement</p>
                      </button>
                    </div>
                  </div>
                )}

                {/* Documents List */}
                {selectedCategory && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedCategory(null)}
                          className="text-sm text-gray-500 hover:text-gray-700"
                        >
                          ← Changer de catégorie
                        </button>
                        <span className="text-gray-300">|</span>
                        <span className="text-sm font-medium text-gray-700">
                          {getCategoryLabel(selectedCategory)}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {getRequiredDocumentsForCategory(selectedCategory).length} document(s)
                        requis
                      </span>
                    </div>

                    <div className="hidden md:grid grid-cols-[2fr,1.1fr,0.9fr,auto] gap-3 text-[11px] uppercase tracking-wider text-[#A69B95] px-3">
                      <span>Document</span>
                      <span>Formats</span>
                      <span>Taille max</span>
                      <span className="text-right">Action</span>
                    </div>

                    <div className="space-y-3">
                      {getRequiredDocumentsForCategory(selectedCategory).map((req) => {
                        const isUploaded = documents[req.id];
                        const isUploading = uploadingDoc === req.id;

                        return (
                          <div
                            key={req.id}
                            className={`border rounded-xl p-4 transition-all ${
                              isUploaded
                                ? 'border-green-300 bg-green-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="grid grid-cols-1 md:grid-cols-[2fr,1.1fr,0.9fr,auto] gap-3 items-start md:items-center">
                              <div className="flex items-start gap-3">
                                <div
                                  className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                    isUploaded ? 'bg-green-100' : 'bg-gray-100'
                                  }`}
                                >
                                  {isUploaded ? (
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                  ) : (
                                    <FileText className="w-5 h-5 text-gray-600" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h5 className="font-medium text-gray-900 text-sm">
                                      {req.name}
                                    </h5>
                                    {req.required && (
                                      <span className="text-[10px] uppercase tracking-wider text-red-500 border border-red-200 rounded-full px-2 py-0.5">
                                        Obligatoire
                                      </span>
                                    )}
                                    <span
                                      className={`text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 ${
                                        isUploaded
                                          ? 'bg-green-100 text-green-700 border border-green-200'
                                          : 'bg-amber-100 text-amber-700 border border-amber-200'
                                      }`}
                                    >
                                      {isUploaded ? 'Reçu' : 'À fournir'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                    {req.description}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-400 md:hidden">
                                    <span>Formats: {req.fileTypes.map((t) => t.split('/')[1]).join(', ')}</span>
                                    <span>Max: {req.maxSize}MB</span>
                                  </div>
                                </div>
                              </div>

                              <div className="text-xs text-[#6B5A4E] hidden md:block">
                                {req.fileTypes.map((t) => t.split('/')[1]).join(', ')}
                              </div>
                              <div className="text-xs text-[#6B5A4E] hidden md:block">
                                {req.maxSize} MB
                              </div>

                              <label className="cursor-pointer w-full md:w-auto">
                                <input
                                  type="file"
                                  accept={req.fileTypes.join(',')}
                                  onChange={(e) =>
                                    handleDocumentUpload(req.id, e.target.files?.[0])
                                  }
                                  disabled={isUploading || isUploaded}
                                  className="hidden"
                                />
                                <div
                                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors text-xs font-medium w-full md:w-auto ${
                                    isUploaded
                                      ? 'bg-green-100 text-green-700 cursor-default'
                                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer'
                                  } ${isUploading ? 'opacity-50 cursor-wait' : ''}`}
                                >
                                  {isUploading ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      <span>Upload...</span>
                                    </>
                                  ) : isUploaded ? (
                                    <>
                                      <CheckCircle className="w-3 h-3" />
                                      <span>Envoyé</span>
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="w-3 h-3" />
                                      <span>Télécharger</span>
                                    </>
                                  )}
                                </div>
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Submit Button Section */}
                    <div className="pt-4 border-t border-gray-200">
                      {!dossierSubmitted || dossierDisplayStatus === 'more_info_requested' ? (
                        /* Afficher le bouton de soumission si pas de dossier ou infos demandees */
                        <>
                          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                            <div className="flex gap-3">
                              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                              <div className="text-sm text-blue-800">
                                <p className="font-semibold mb-1">Documents acceptes</p>
                                <ul className="space-y-1 text-blue-700">
                                  <li>• PDF - Maximum 10Mo par fichier</li>
                                  <li>• Images (JPG, PNG) - Maximum 5Mo par fichier</li>
                                  <li>• Documents lisibles et en couleurs</li>
                                </ul>
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-end gap-3">
                            <button
                              onClick={() => setSelectedCategory(null)}
                              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm"
                            >
                              Annuler
                            </button>
                            <button
                              onClick={handleDossierSubmit}
                              disabled={!canSubmitDossier() || submittingDossier}
                              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {submittingDossier ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>Soumission...</span>
                                </>
                              ) : (
                                <>
                                  <Send className="w-4 h-4" />
                                  <span>
                                    {dossierDisplayStatus === 'more_info_requested'
                                      ? 'Ressoumettre le dossier'
                                      : 'Soumettre le dossier'}
                                  </span>
                                </>
                              )}
                            </button>
                          </div>
                        </>
                      ) : dossierDisplayStatus === 'pending' ||
                        dossierDisplayStatus === 'in_review' ? (
                        /* Dossier en attente ou en cours */
                        <div className="flex justify-end">
                          <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-lg">
                            <Clock className="w-4 h-4" />
                            <span>Dossier en cours de verification</span>
                          </div>
                        </div>
                      ) : dossierDisplayStatus === 'approved' ? (
                        /* Dossier approuve */
                        <div className="flex justify-end">
                          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-4 py-2 rounded-lg">
                            <CheckCircle className="w-4 h-4" />
                            <span>Dossier valide</span>
                          </div>
                        </div>
                      ) : dossierDisplayStatus === 'rejected' ? (
                        /* Dossier refuse */
                        <div className="flex justify-end">
                          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">
                            <XCircle className="w-4 h-4" />
                            <span>Dossier refuse - Veuillez reessayer</span>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Statistiques</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Score de confiance</p>
                        <p className="text-2xl font-bold">{trustScoreClamped}%</p>
                        <p className="text-xs text-gray-500">Moyenne nationale: 65%</p>
                      </div>
                      <Star className="w-8 h-8 text-yellow-500 flex-shrink-0 mt-1" />
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Score locataire</p>
                        <p className="text-2xl font-bold">{profile?.tenant_score || 0}/100</p>
                        <p className="text-xs text-gray-500">Basé sur l'historique</p>
                      </div>
                      <Star className="w-8 h-8 text-purple-500 flex-shrink-0 mt-1" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={showOneciChoiceModal}
        onClose={handleCloseOneciChoiceModal}
        title="Choisissez votre parcours"
        size="sm"
      >
        <p className="text-sm text-[#6B5A4E]">
          Sélectionnez la page qui reflète votre méthode de vérification pour continuer.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Button
            onClick={() =>
              handleRedirectFromOneciChoice('/verification-oneci?source=modal&method=attributes')
            }
          >
            Vérification ONECI complète
          </Button>
          <p className="text-xs text-[#6B5A4E]">
            La reconnaissance faciale autonome est gérée via la carte « Reconnaissance faciale »
            dans l’onglet des vérifications.
          </p>
          <Button variant="ghost" onClick={handleCloseOneciChoiceModal}>
            Annuler
          </Button>
        </div>
      </Modal>

      {/* Modal de switch de rôle */}
      <RoleSwitchModal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        onConfirm={handleConfirmRoleSwitch}
        fromRole="tenant"
        toRole="owner"
        loading={becomingOwner}
      />
    </>
  );
}
