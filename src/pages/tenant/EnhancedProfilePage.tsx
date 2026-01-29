import { useState, useEffect, ChangeEvent, useCallback } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  User,
  Shield,
  Camera,
  CheckCircle,
  AlertCircle,
  Home,
  FileText,
  CreditCard,
  Star,
  Calendar,
  Plus,
  Upload,
  Briefcase,
  GraduationCap,
  Building as BuildingIcon,
  Send,
  Loader2,
  Info,
  Clock,
  Eye,
  XCircle,
} from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import { toast } from '@/hooks/shared/useSafeToast';
import { AddressValue, formatAddress } from '@/shared/utils/address';
import { STORAGE_BUCKETS } from '@/services/upload/uploadService';
import RoleSwitcher from '@/components/role/RoleSwitcher';
import { RoleSwitchModal } from '@/shared/ui/Modal';
import verificationApplicationsService from '@/features/verification/services/verificationApplications.service';

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

// TODO: Uncomment when user_documents table is created
// interface UserDocument {
//   id: string;
//   user_id: string;
//   document_type: string;
//   document_name: string;
//   file_url: string;
//   file_name: string;
//   file_size: number;
//   mime_type: string;
//   status: 'pending' | 'verified' | 'rejected';
//   uploaded_at: string;
//   verified_at?: string;
//   rejection_reason?: string;
// }

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
    name: 'Carte d\'identité ou Passeport',
    description: 'Pièce d\'identité en cours de validité',
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
    name: 'Attestation d\'immatriculation (RCCM)',
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
    description: 'Certificat de l\'année en cours',
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
    name: 'Pièce d\'identité du garant',
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
  const { user, updateProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'infos');
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [becomingOwner, setBecomingOwner] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);

  // Stats dynamiques
  const [stats, setStats] = useState({
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
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [submittingDossier, setSubmittingDossier] = useState(false);
  const [dossierApplication, setDossierApplication] = useState<any>(null);

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
          .in('status', ['actif', 'en_cours', 'signé']),

        // Candidatures en cours
        supabase
          .from('rental_applications')
          .select('id')
          .eq('tenant_id', user.id)
          .in('status', ['pending', 'in_review', 'shortlisted']),

        // Visites à venir
        supabase
          .from('property_visits')
          .select('id')
          .eq('tenant_id', user.id)
          .gte('scheduled_date', new Date().toISOString())
          .eq('status', 'confirmed'),
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
      const applications = await verificationApplicationsService.getUserApplications(user.id, 'tenant');
      // Priorité: dossiers en cours ou récents
      const activeApp = applications.find(
        (app) => app.status === 'pending' || app.status === 'in_review' || app.status === 'more_info_requested'
      ) || applications.find(app => app.status === 'approved')
        || applications[0] || null;

      if (activeApp) {
        setDossierApplication(activeApp);
      } else {
        setDossierApplication(null);
      }
    } catch (error) {
      console.error('Error loading dossier application:', error);
    }
  }, [user?.id]);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        // Calculer le score si non présent ou à zéro
        if (!profileData.trust_score || profileData.trust_score === 0) {
          try {
            const { ScoringService } = await import('@/services/scoringService');
            const scoreBreakdown = await ScoringService.calculateGlobalTrustScore(user.id);

            // Mettre à jour le trust_score dans la base de données
            const { error: scoreError } = await supabase
              .from('profiles')
              .update({ trust_score: scoreBreakdown.globalScore })
              .eq('id', user.id);

            if (!scoreError) {
              profileData.trust_score = scoreBreakdown.globalScore;
            }
          } catch (scoreErr) {
            console.warn('Could not calculate score:', scoreErr);
          }
        }

        setProfile(profileData);
        setFormData({
          full_name: profileData.full_name || '',
          phone: profileData.phone || '',
          city: profileData.city || '',
          address: profileData.address ? formatAddress(profileData.address) : '',
          bio: profileData.bio || '',
          gender: profileData.gender || '',
        });
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
  }, [user, loadProfile, loadStats]);

  useEffect(() => {
    if (profile?.avatar_url) {
      // No-op: avatar already synced via profile load
    }
  }, [profile?.avatar_url]);

  const handleSaveProfile = async (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    try {
      const updates: Record<string, unknown> = {
        ...formData,
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
        .update({ user_type: 'proprietaire' })
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
          loadDocumentsForCategory(category);
        });
    }
  };

  // Load documents for the selected category
  const loadDocumentsForCategory = async (category: TenantCategory) => {
    if (!user) return;

    try {
      setDocumentsLoading(true);

      // Get the tenant verification application
      const applications = await verificationApplicationsService.getUserApplications(user.id, 'tenant');
      const activeApp = applications.find(
        (app) => app.status === 'pending' || app.status === 'in_review' || app.status === 'more_info_requested'
      ) || applications[0] || null;

      if (activeApp) {
        setDossierApplication(activeApp);
        const appDocuments = await verificationApplicationsService.getDocuments(activeApp.id);
        const docsMap: Record<string, string> = {};
        appDocuments.forEach((doc) => {
          docsMap[doc.document_type] = doc.document_url;
        });
        setDocuments(docsMap);
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
      toast.error(`Type de fichier non autorisé. Formats acceptés: ${requirement.fileTypes.join(', ')}`);
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

  // Check if dossier can be submitted
  const canSubmitDossier = () => {
    if (!selectedCategory) return false;
    const requiredDocs = getRequiredDocumentsForCategory(selectedCategory).filter((doc) => doc.required);
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
      await loadDocumentsForCategory(selectedCategory);
    } catch (error) {
      console.error('Error submitting dossier:', error);
      toast.error('Erreur lors de la soumission du dossier');
    } finally {
      setSubmittingDossier(false);
    }
  };

  // Load user documents
  // TODO: Create user_documents table in Supabase
  // const loadDocuments = useCallback(async () => {
  //   if (!user) return;
  //   try {
  //     setDocumentsLoading(true);
  //     const { data, error } = await supabase
  //       .from('user_documents')
  //       .select('*')
  //       .eq('user_id', user.id)
  //       .order('uploaded_at', { ascending: false });
  //
  //     if (error) throw error;
  //     setDocuments(data || []);
  //   } catch (error) {
  //     console.error('Error loading documents:', error);
  //   } finally {
  //     setDocumentsLoading(false);
  //   }
  // }, [user]);

  // useEffect(() => {
  //   if (activeTab === 'documents') {
  //     loadDocuments();
  //   }
  // }, [activeTab, loadDocuments]);

  // Handle document upload
  // const handleDocumentUpload = async (docType: string, file: File) => {
  //   if (!user) return;
  //
  //   const requirement = DOCUMENT_REQUIREMENTS.find(req => req.id === docType);
  //   if (!requirement) {
  //     toast.error('Type de document invalide');
  //     return;
  //   }
  //
  //   // Validate file type
  //   if (!requirement.fileTypes.includes(file.type)) {
  //     toast.error(`Type de fichier non autorisé. Formats acceptés: ${requirement.fileTypes.join(', ')}`);
  //     return;
  //   }
  //
  //   // Validate file size
  //   if (file.size > requirement.maxSize * 1024 * 1024) {
  //     toast.error(`Fichier trop volumineux. Maximum: ${requirement.maxSize}MB`);
  //     return;
  //   }
  //
  //   setUploadingDoc(docType);
  //   try {
  //     // Upload file to storage
  //     const fileName = `${user.id}/documents/${docType}-${Date.now()}-${file.name}`;
  //     const { error: uploadError } = await supabase.storage
  //       .from('documents')
  //       .upload(fileName, file, { upsert: true });
  //
  //     if (uploadError) throw uploadError;
  //
  //     // Get public URL
  //     const { data: publicUrlData } = supabase.storage.from('documents').getPublicUrl(fileName);
  //     const publicUrl = publicUrlData?.publicUrl;
  //     if (!publicUrl) throw new Error('URL publique introuvable');
  //
  //     // Save document record
  //     const { error: dbError } = await supabase
  //       .from('user_documents')
  //       .insert({
  //         user_id: user.id,
  //         document_type: docType,
  //         document_name: requirement.name,
  //         file_url: publicUrl,
  //         file_name: file.name,
  //         file_size: file.size,
  //         mime_type: file.type,
  //         status: 'pending',
  //       });
  //
  //     if (dbError) throw dbError;
  //
  //     toast.success('Document téléchargé avec succès');
  //     await loadDocuments();
  //   } catch (error) {
  //     console.error('Error uploading document:', error);
  //     toast.error('Erreur lors du téléchargement du document');
  //   } finally {
  //     setUploadingDoc(null);
  //   }
  // };

  // Handle document deletion
  // const handleDeleteDocument = async (docId: string) => {
  //   if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;
  //
  //   setDeletingDoc(docId);
  //   try {
  //     // Get document to get file path
  //     const { data: doc } = await supabase
  //       .from('user_documents')
  //       .select('file_url')
  //       .eq('id', docId)
  //       .single();
  //
  //     if (doc?.file_url) {
  //       // Extract file path from URL
  //       const url = new URL(doc.file_url);
  //       const pathParts = url.pathname.split('/');
  //       const filePath = pathParts.slice(pathParts.indexOf('documents') + 1).join('/');
  //
  //       // Delete from storage
  //       await supabase.storage.from('documents').remove([filePath]);
  //     }
  //
  //     // Delete record
  //     const { error } = await supabase
  //       .from('user_documents')
  //       .delete()
  //       .eq('id', docId);
  //
  //     if (error) throw error;
  //
  //     toast.success('Document supprimé');
  //     await loadDocuments();
  //   } catch (error) {
  //     console.error('Error deleting document:', error);
  //     toast.error('Erreur lors de la suppression');
  //   } finally {
  //     setDeletingDoc(null);
  //   }
  // };

  // Get documents by type
  // const getDocumentByType = (docType: string) => {
  //   return documents.find(doc => doc.document_type === docType);
  // };

  const displayName = (profile?.full_name && profile.full_name.trim()) || 'Utilisateur';

  const tabs = [
    { id: 'infos', label: 'Informations', icon: User },
    { id: 'verification', label: 'Vérifications', icon: Shield },
    { id: 'history', label: 'Historique', icon: Calendar },
    { id: 'dossier', label: 'Dossier', icon: FileText },
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
        {/* Profile Header - Simplifié et moderne */}
        <div className="bg-white rounded-2xl border border-[#EFEBE9] p-6 mb-5">
          <div className="flex items-center gap-5">
            {/* Avatar */}
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
              <label className="absolute bottom-0 right-0 bg-white rounded-lg p-1 shadow-sm cursor-pointer hover:bg-[#FAF7F4]">
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

            {/* Info principale */}
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-[#2C1810]">{displayName}</h2>
                {profile?.is_verified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    <CheckCircle className="w-3 h-3" />
                    Vérifié
                  </span>
                )}
              </div>
              <p className="text-sm text-[#6B5A4E] mt-0.5">{profile?.city || 'Ville non renseignée'}</p>
            </div>

            {/* Score et actions */}
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-[#F16522]">{profile?.tenant_score || profile?.trust_score || 0}%</p>
                <p className="text-xs text-[#6B5A4E]">Score</p>
              </div>
              <div className="w-px h-10 bg-[#EFEBE9]" />
              <button
                onClick={handleBecomeOwner}
                disabled={becomingOwner}
                className="px-4 py-2 bg-[#F16522] hover:bg-[#D95318] text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                {becomingOwner ? '...' : '+ Propriétaire'}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats - Vue rapide avec stats dynamiques */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          <Link
            to="/locataire/mes-contrats"
            className="bg-white rounded-xl border border-[#EFEBE9] p-4 text-center hover:border-[#F16522] transition-colors"
          >
            <p className="text-lg font-bold text-[#2C1810]">{stats.activeLeases}</p>
            <p className="text-xs text-[#6B5A4E]">Locations</p>
          </Link>
          <Link
            to="/locataire/mes-candidatures"
            className="bg-white rounded-xl border border-[#EFEBE9] p-4 text-center hover:border-[#F16522] transition-colors"
          >
            <p className="text-lg font-bold text-[#2C1810]">{stats.pendingApplications}</p>
            <p className="text-xs text-[#6B5A4E]">Candidatures</p>
          </Link>
          <Link
            to="/locataire/mes-visites"
            className="bg-white rounded-xl border border-[#EFEBE9] p-4 text-center hover:border-[#F16522] transition-colors"
          >
            <p className="text-lg font-bold text-[#2C1810]">{stats.upcomingVisits}</p>
            <p className="text-xs text-[#6B5A4E]">Visites</p>
          </Link>
          <div className="bg-white rounded-xl border border-[#EFEBE9] p-4 text-center">
            <p className="text-lg font-bold text-[#2C1810]">
              {[true, profile?.oneci_verified, facialStatus === 'verified'].filter(Boolean).length}/3
            </p>
            <p className="text-xs text-[#6B5A4E]">Vérifications</p>
            <p className="text-xs text-green-600 mt-0.5">Email + ONECI + Facial</p>
          </div>
        </div>

        {/* Tabs Navigation - Simplifié */}
        <div className="bg-white rounded-2xl border border-[#EFEBE9] mb-5">
          <div className="border-b border-[#EFEBE9]">
            <nav className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-[#F16522] text-[#F16522]'
                      : 'border-transparent text-[#6B5A4E] hover:text-[#2C1810] hover:border-[#EFEBE9]'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-2xl border border-[#EFEBE9] p-6">
          {activeTab === 'infos' && (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom complet
                  </label>
                  <Input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Votre nom complet"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <Input
                    type="email"
                    value={profile?.email || ''}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Votre numéro de téléphone"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Genre</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'Homme' | 'Femme' | 'Non spécifié' | '' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="Homme">Homme</option>
                    <option value="Femme">Femme</option>
                    <option value="Non spécifié">Non spécifié</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ville</label>
                  <Input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Votre ville"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Adresse</label>
                <Input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Votre adresse complète"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  rows={4}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Parlez-vous brièvement..."
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving} className="flex items-center gap-2">
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </form>
          )}

          {activeTab === 'verification' && (
            <div className="space-y-6">
              {/* Progress Overview */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-[#2C1810]">Vos vérifications</h3>
                  <span className="text-sm text-[#6B5A4E]">{[profile?.is_verified, profile?.oneci_verified, facialStatus === 'verified', dossierApplication?.status === 'approved'].filter(Boolean).length}/4 complétées</span>
                </div>
                <div className="w-full bg-[#FAF7F4] rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-[#F16522] to-[#D95318] transition-all"
                    style={{ width: `${([profile?.is_verified, profile?.oneci_verified, facialStatus === 'verified', dossierApplication?.status === 'approved'].filter(Boolean).length / 4) * 100}%` }}
                  />
                </div>
              </div>

              {/* Verification Grid */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Email - Toujours vérifié */}
                <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-green-900">Email vérifié</h4>
                      <p className="text-sm text-green-700 mt-1">Adresse email confirmée</p>
                    </div>
                  </div>
                </div>

                {/* ONECI */}
                <div className={`p-4 rounded-xl border ${profile?.oneci_verified ? 'bg-green-50 border-green-200' : 'bg-white border-[#EFEBE9]'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${profile?.oneci_verified ? 'bg-green-100' : 'bg-amber-100'}`}>
                      {profile?.oneci_verified ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-medium ${profile?.oneci_verified ? 'text-green-900' : 'text-[#2C1810]'}`}>
                        Vérification ONECI
                      </h4>
                      <p className={`text-sm mt-1 ${profile?.oneci_verified ? 'text-green-700' : 'text-[#6B5A4E]'}`}>
                        {profile?.oneci_verified ? 'Carte d\'identité vérifiée' : 'Pièce d\'identité requise'}
                      </p>
                      {!profile?.oneci_verified && (
                        <button
                          onClick={() => navigate('/locataire/verification-oneci')}
                          className="mt-2 text-sm text-[#F16522] hover:underline font-medium"
                        >
                          Vérifier maintenant →
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Facial Recognition */}
                <div className={`p-4 rounded-xl border ${facialStatus === 'verified' ? 'bg-green-50 border-green-200' : facialStatus === 'pending' || facialStatus === 'in_review' ? 'bg-blue-50 border-blue-200' : facialStatus === 'failed' ? 'bg-red-50 border-red-200' : 'bg-white border-[#EFEBE9]'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${facialStatus === 'verified' ? 'bg-green-100' : facialStatus === 'pending' || facialStatus === 'in_review' ? 'bg-blue-100' : facialStatus === 'failed' ? 'bg-red-100' : 'bg-gray-100'}`}>
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
                      <h4 className={`font-medium ${facialStatus === 'verified' ? 'text-green-900' : facialStatus === 'failed' ? 'text-red-900' : 'text-[#2C1810]'}`}>
                        Reconnaissance faciale
                      </h4>
                      <p className={`text-sm mt-1 ${facialStatus === 'verified' ? 'text-green-700' : facialStatus === 'failed' ? 'text-red-700' : facialStatus === 'pending' || facialStatus === 'in_review' ? 'text-blue-700' : 'text-[#6B5A4E]'}`}>
                        {facialStatus === 'verified'
                          ? `Vérifié (${((profile?.facial_verification_score || 0) * 100).toFixed(0)}%)`
                          : facialStatus === 'failed'
                            ? 'Échec de la vérification'
                            : facialStatus === 'pending' || facialStatus === 'in_review'
                              ? 'En cours de vérification'
                              : 'Vérification biométrique requise'}
                      </p>
                      {facialStatus !== 'verified' && facialStatus !== 'in_review' && facialStatus !== 'pending' && (
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
                <div className={`p-4 rounded-xl border ${dossierApplication?.status === 'approved' ? 'bg-green-50 border-green-200' : dossierApplication?.status === 'pending' || dossierApplication?.status === 'in_review' ? 'bg-blue-50 border-blue-200' : dossierApplication?.status === 'more_info_requested' ? 'bg-purple-50 border-purple-200' : dossierApplication?.status === 'rejected' ? 'bg-red-50 border-red-200' : 'bg-white border-[#EFEBE9]'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${dossierApplication?.status === 'approved' ? 'bg-green-100' : dossierApplication?.status === 'pending' || dossierApplication?.status === 'in_review' ? 'bg-blue-100' : dossierApplication?.status === 'more_info_requested' ? 'bg-purple-100' : dossierApplication?.status === 'rejected' ? 'bg-red-100' : 'bg-gray-100'}`}>
                      {dossierApplication?.status === 'approved' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : dossierApplication?.status === 'rejected' ? (
                        <XCircle className="w-5 h-5 text-red-600" />
                      ) : dossierApplication?.status === 'pending' || dossierApplication?.status === 'in_review' ? (
                        <Eye className="w-5 h-5 text-blue-600" />
                      ) : dossierApplication?.status === 'more_info_requested' ? (
                        <AlertCircle className="w-5 h-5 text-purple-600" />
                      ) : (
                        <FileText className="w-5 h-5 text-gray-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-medium ${dossierApplication?.status === 'approved' ? 'text-green-900' : dossierApplication?.status === 'rejected' ? 'text-red-900' : 'text-[#2C1810]'}`}>
                        Dossier de certification
                      </h4>
                      <p className={`text-sm mt-1 ${dossierApplication?.status === 'approved' ? 'text-green-700' : dossierApplication?.status === 'rejected' ? 'text-red-700' : dossierApplication?.status === 'pending' || dossierApplication?.status === 'in_review' ? 'text-blue-700' : dossierApplication?.status === 'more_info_requested' ? 'text-purple-700' : 'text-[#6B5A4E]'}`}>
                        {dossierApplication?.status === 'approved'
                          ? 'Certification ANSUT obtenue'
                          : dossierApplication?.status === 'rejected'
                            ? dossierApplication?.rejection_reason || 'Dossier refusé'
                            : dossierApplication?.status === 'pending'
                              ? 'Dossier soumis - En attente'
                              : dossierApplication?.status === 'in_review'
                                ? 'Dossier en cours d\'examen'
                                : dossierApplication?.status === 'more_info_requested'
                                  ? 'Informations supplémentaires demandées'
                                  : 'Documents pour certification'}
                      </p>
                      {dossierApplication?.status !== 'approved' && dossierApplication?.status !== 'pending' && dossierApplication?.status !== 'in_review' && (
                        <button
                          onClick={() => setActiveTab('dossier')}
                          className="mt-2 text-sm text-[#F16522] hover:underline font-medium"
                        >
                          {dossierApplication?.status === 'rejected' || dossierApplication?.status === 'more_info_requested' ? 'Compléter' : 'Commencer'} →
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
                      Un profil vérifié augmente vos chances d'acceptation par les propriétaires et vous donne accès aux logements exclusifs ANSUT.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Historique locatif</h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
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
              <h3 className="text-lg font-semibold text-gray-900">Dossier de certification locataire</h3>

              {/* Statut du dossier - Section visible */}
              <div className="mb-6">
                {!dossierApplication ? (
                  /* Aucun dossier commence */
                  <div className="p-5 bg-slate-50 border-2 border-slate-200 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-slate-100 rounded-xl flex-shrink-0">
                        <Upload className="w-6 h-6 text-slate-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900">Dossier non commence</h4>
                        <p className="text-sm text-slate-600 mt-1">
                          Selectionnez votre situation et uploadez vos documents pour commencer votre certification
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full border bg-slate-100 text-slate-700 border-slate-200">
                        <Clock className="w-3.5 h-3.5" />
                        <span>À commencer</span>
                      </span>
                    </div>
                  </div>
                ) : dossierApplication.status === 'pending' ? (
                  <div className="p-5 bg-amber-50 border-2 border-amber-200 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-amber-100 rounded-xl flex-shrink-0">
                        <Clock className="w-6 h-6 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-amber-900">Dossier soumis - En attente de verification</h4>
                        <p className="text-sm text-amber-700 mt-1">
                          Votre dossier a ete recu et sera examine par notre equipe sous peu
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full border bg-amber-100 text-amber-700 border-amber-200">
                        <Clock className="w-3.5 h-3.5" />
                        <span>En attente</span>
                      </span>
                    </div>
                  </div>
                ) : dossierApplication.status === 'in_review' ? (
                  <div className="p-5 bg-blue-50 border-2 border-blue-200 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-100 rounded-xl flex-shrink-0">
                        <Eye className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-blue-900">Dossier en cours d'examen</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Notre equipe est en train de verifier vos documents
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full border bg-blue-100 text-blue-700 border-blue-200">
                        <Eye className="w-3.5 h-3.5" />
                        <span>En cours</span>
                      </span>
                    </div>
                  </div>
                ) : dossierApplication.status === 'more_info_requested' ? (
                  <div className="p-5 bg-purple-50 border-2 border-purple-200 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-purple-100 rounded-xl flex-shrink-0">
                        <AlertCircle className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-purple-900">Informations supplementaires demandees</h4>
                        <p className="text-sm text-purple-700 mt-1">
                          {dossierApplication.rejection_reason || 'Veuillez completer votre dossier avec les documents demandes'}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full border bg-purple-100 text-purple-700 border-purple-200">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Infos demandees</span>
                      </span>
                    </div>
                  </div>
                ) : dossierApplication.status === 'approved' ? (
                  <div className="p-5 bg-green-50 border-2 border-green-200 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-100 rounded-xl flex-shrink-0">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-green-900">Dossier valide !</h4>
                        <p className="text-sm text-green-700 mt-1">
                          Felicitations ! Votre dossier a ete approuve et vous etes desormais certifie ANSUT
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full border bg-green-100 text-green-700 border-green-200">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Valide</span>
                      </span>
                    </div>
                  </div>
                ) : dossierApplication.status === 'rejected' ? (
                  <div className="p-5 bg-red-50 border-2 border-red-200 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-red-100 rounded-xl flex-shrink-0">
                        <XCircle className="w-6 h-6 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-red-900">Dossier refuse</h4>
                        <p className="text-sm text-red-700 mt-1">
                          {dossierApplication.rejection_reason || 'Votre dossier n\'a pas pu etre valide. Veuillez reessayer.'}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full border bg-red-100 text-red-700 border-red-200">
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
                      <p className="text-xs text-gray-500 mt-1">Employé avec contrat de travail</p>
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
                      {getRequiredDocumentsForCategory(selectedCategory).length} document(s) requis
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              isUploaded ? 'bg-green-100' : 'bg-gray-100'
                            }`}>
                              {isUploaded ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              ) : (
                                <FileText className="w-5 h-5 text-gray-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <h5 className="font-medium text-gray-900 text-sm">{req.name}</h5>
                                  <p className="text-xs text-gray-500 mt-0.5">{req.description}</p>
                                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                                    <span>Max: {req.maxSize}MB</span>
                                    {req.required && (
                                      <span className="text-red-500 font-medium">Obligatoire</span>
                                    )}
                                  </div>
                                </div>
                                <label className="cursor-pointer">
                                  <input
                                    type="file"
                                    accept={req.fileTypes.join(',')}
                                    onChange={(e) => handleDocumentUpload(req.id, e.target.files?.[0])}
                                    disabled={isUploading || isUploaded}
                                    className="hidden"
                                  />
                                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-xs font-medium ${
                                    isUploaded
                                      ? 'bg-green-100 text-green-700 cursor-default'
                                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer'
                                  } ${isUploading ? 'opacity-50 cursor-wait' : ''}`}>
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
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Submit Button Section */}
                  <div className="pt-4 border-t border-gray-200">
                    {!dossierApplication || dossierApplication.status === 'more_info_requested' ? (
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
                                <span>{dossierApplication?.status === 'more_info_requested' ? 'Ressoumettre le dossier' : 'Soumettre le dossier'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </>
                    ) : dossierApplication.status === 'pending' || dossierApplication.status === 'in_review' ? (
                      /* Dossier en attente ou en cours */
                      <div className="flex justify-end">
                        <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-lg">
                          <Clock className="w-4 h-4" />
                          <span>Dossier en cours de verification</span>
                        </div>
                      </div>
                    ) : dossierApplication.status === 'approved' ? (
                      /* Dossier approuve */
                      <div className="flex justify-end">
                        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-4 py-2 rounded-lg">
                          <CheckCircle className="w-4 h-4" />
                          <span>Dossier valide</span>
                        </div>
                      </div>
                    ) : dossierApplication.status === 'rejected' ? (
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Score de confiance</p>
                      <p className="text-2xl font-bold">{profile?.trust_score || 0}%</p>
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

    {/* Modal de switch de rôle */}
    <RoleSwitchModal
      isOpen={showRoleModal}
      onClose={() => setShowRoleModal(false)}
      onConfirm={handleConfirmRoleSwitch}
      fromRole="locataire"
      toRole="proprietaire"
      loading={becomingOwner}
    />
    </>
  );
}

function VerificationItem({
  title,
  description,
  verified,
  score,
  onVerify,
  showButton = true,
  status = 'pending',
  allowRetry = false,
  extraInfo,
  isDossier = false,
}: {
  title: string;
  description: string;
  verified: boolean | null;
  score?: number | null;
  onVerify?: () => void;
  showButton?: boolean;
  status?: 'pending' | 'verified' | 'failed' | null;
  allowRetry?: boolean;
  extraInfo?: string | null;
  isDossier?: boolean;
}) {
  const getStatusConfig = () => {
    if (verified || status === 'verified') {
      return {
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        label: 'Vérifié',
      };
    }
    if (status === 'failed') {
      return {
        icon: AlertCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        label: 'Échoué',
      };
    }
    if (status === 'in_review') {
      return {
        icon: AlertCircle,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        label: 'En cours',
      };
    }
    return {
      icon: AlertCircle,
      color: 'text-amber-500',
      bgColor: 'bg-amber-100',
      label: 'En attente',
    };
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <div className="flex items-center justify-between p-4 border border-border rounded-lg">
      <div className="flex items-center gap-3 flex-1">
        <StatusIcon className={`w-6 h-6 ${statusConfig.color} flex-shrink-0`} />
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
          {score && verified && (
            <p className="text-xs text-green-600 mt-1">
              Score de confiance: {(score * 100).toFixed(1)}%
            </p>
          )}
          {extraInfo && (
            <p className="text-xs text-red-600 mt-1">
              {extraInfo}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 ml-4 flex-shrink-0">
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${statusConfig.bgColor} ${statusConfig.color}`}
        >
          {statusConfig.label}
        </span>
        {showButton && onVerify && (() => {
          // Pour le dossier: afficher seulement si pas de dossier, rejected, ou more_info_requested
          if (isDossier) {
            const shouldShow = !verified || status === 'failed' || status === 'more_info_requested';
            return shouldShow;
          }
          // Pour les autres items: afficher si !verified ou allowRetry
          return !verified || allowRetry;
        })() && (
          <Button
            onClick={onVerify}
            variant="outline"
            size="small"
            className="whitespace-nowrap px-5 py-2.5"
          >
            <span className="inline-flex items-center gap-2.5">
              <svg
                className="h-4 w-4 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                {status === 'failed' || allowRetry || (isDossier && status === 'more_info_requested') ? (
                  // Icône de rafraîchissement pour "Réessayer" ou "Refaire"
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                ) : (
                  // Icône de vérification pour "Faire la vérification"
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                )}
              </svg>
              <span>
                {isDossier
                  ? (status === 'failed' || status === 'more_info_requested'
                      ? 'Compléter le dossier'
                      : verified || status === 'verified'
                        ? 'Voir le dossier'
                        : 'Commencer le dossier')
                  : (status === 'failed' ? 'Réessayer' : allowRetry && verified ? 'Refaire la vérification' : 'Faire la vérification')
                }
              </span>
            </span>
          </Button>
        )}
      </div>
    </div>
  );
}
