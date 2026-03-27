import { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  User,
  Phone,
  MapPin,
  Shield,
  Camera,
  Save,
  CheckCircle,
  AlertCircle,
  Home,
  FileText,
  TrendingUp,
  Mail,
  Loader2,
  Key,
  FolderOpen,
  Calendar,
  Eye,
  Clock,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatAddress, type AddressValue } from '@/shared/utils/address';
import { STORAGE_BUCKETS } from '@/services/upload/uploadService';
import RoleSwitcher from '@/components/role/RoleSwitcher';
import { RoleSwitchModal } from '@/shared/ui/Modal';
import { DossierSubmissionTab } from '@/shared/ui/verification/DossierSubmissionTab';
import verificationApplicationsService, {
  type VerificationApplication,
} from '@/features/verification/services/verificationApplications.service';

interface Profile {
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
  trust_score: number | null;
  gender?: 'Homme' | 'Femme' | 'Non spécifié' | null;
  agency_name?: string | null;
  agency_logo?: string | null;
  agency_description?: string | null;
  properties_count?: number;
  total_revenue?: number;
  facial_verification_status?: 'pending' | 'verified' | 'failed' | null;
  facial_verification_date?: string | null;
  facial_verification_score?: number | null;
}

// Helper component
const StatCard = ({
  icon: Icon,
  label,
  value,
  color = 'gray',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color?: 'gray' | 'blue' | 'green' | 'orange' | 'purple';
}) => {
  const colors = {
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
  };

  return (
    <div className={`p-5 rounded-xl border ${colors[color]}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${color === 'gray' ? 'bg-gray-200' : 'bg-white'}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
};

export default function OwnerProfilePage() {
  const { user, refreshProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'infos');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [becomingTenant, setBecomingTenant] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [dossierApplication, setDossierApplication] = useState<VerificationApplication | null>(
    null
  );
  const [dossierDocCount, setDossierDocCount] = useState(0);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    city: '',
    address: '',
    bio: '',
    gender: '' as 'Homme' | 'Femme' | 'Non spécifié' | '',
    agency_name: '',
    agency_description: '',
  });

  const facialStatus = profile?.facial_verification_status;

  const loadDossierApplication = useCallback(async () => {
    if (!user) return;

    try {
      const applications = await verificationApplicationsService.getUserApplications(
        user.id,
        'owner'
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
  }, [user?.id]); // Only depend on user ID, not the setters

  useEffect(() => {
    if (user) {
      loadDossierApplication();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Only reload when user ID changes, not the entire user object

  const loadProfile = useCallback(async (shouldRefreshAuth = false) => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        // Recalculer le score et mettre à jour si nécessaire
        try {
          const { ScoringService } = await import('@/services/scoringService');
          const scoreBreakdown = await ScoringService.calculateGlobalTrustScore(user.id);
          const newScore = scoreBreakdown.globalScore;

          if (profileData.trust_score !== newScore) {
            await supabase.from('profiles').update({ trust_score: newScore }).eq('id', user.id);
            profileData.trust_score = newScore;
          }
        } catch (scoreError) {
          console.error('Error recalculating score:', scoreError);
        }

        // Rafraîchir le profil dans le AuthProvider SEULEMENT si demandé explicitement
        // (pour éviter la boucle infinie)
        if (shouldRefreshAuth) {
          await refreshProfile();
        }

        setProfile(profileData);
        setFormData({
          full_name: profileData.full_name || '',
          phone: profileData.phone || '',
          city: profileData.city || '',
          address: profileData.address ? formatAddress(profileData.address) : '',
          bio: profileData.bio || '',
          gender: profileData.gender || '',
          agency_name: profileData.agency_name || '',
          agency_description: profileData.agency_description || '',
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }, [user, refreshProfile]);

  useEffect(() => {
    if (user) {
      loadProfile(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Only reload when user ID changes, not the entire user object

  const handleSaveProfile = async (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();

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
        agency_name: formData.agency_name,
        agency_description: formData.agency_description,
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

      // Recharger le profil dans le contexte AuthProvider pour synchroniser la sidebar
      await refreshProfile();

      toast.success('Profil mis à jour avec succès');
      // Recharger le profil local pour mettre à jour l'affichage
      await loadProfile(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Échec de la mise à jour du profil');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    try {
      setUploadingAvatar(true);
      const fileName = `${user.id}/avatar-${Date.now()}.${file.name.split('.').pop()}`;
      const bucket = STORAGE_BUCKETS.AVATARS;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: true, cacheControl: '3600' });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(fileName);

      const publicUrl = publicUrlData?.publicUrl;
      if (!publicUrl) throw new Error('URL publique introuvable');

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
      if (updateError) throw updateError;

      // Recharger le profil dans le contexte AuthProvider pour synchroniser la sidebar
      await refreshProfile();
      // Recharger le profil local pour mettre à jour l'affichage
      await loadProfile(false);
      toast.success('Photo de profil mise à jour');
    } catch (err) {
      console.error('Error uploading avatar:', err);
      toast.error('Échec du téléchargement de la photo');
    } finally {
      setUploadingAvatar(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleBecomeTenant = () => {
    if (!user) return;
    setShowRoleModal(true);
  };

  const handleConfirmRoleSwitch = async () => {
    if (!user) return;

    setBecomingTenant(true);

    try {
      // Mettre à jour le user_type directement dans la base de données
      const { error } = await supabase
        .from('profiles')
        .update({ user_type: 'tenant' })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Vous êtes maintenant locataire ! Redirection...');

      // Rediriger immédiatement sans attendre
      window.location.href = '/locataire/dashboard';
    } catch (error) {
      console.error('Error becoming tenant:', error);
      toast.error('Échec de la modification du rôle');
      setBecomingTenant(false);
    }
    // Note: setBecomingTenant(false) n'est pas appelé en cas de succès car on redirige
  };

  const displayName =
    (profile?.full_name && profile.full_name.trim()) ||
    (profile?.agency_name && profile.agency_name.trim()) ||
    'Utilisateur';

  const dossierHasDocs = dossierDocCount > 0;
  const dossierSubmitted = dossierApplication
    ? dossierApplication.status !== 'pending' ||
      dossierApplication.submitted_at !== dossierApplication.created_at
    : false;
  const dossierDisplayStatus = dossierHasDocs
    ? dossierSubmitted
      ? dossierApplication?.status ?? null
      : 'draft'
    : null;
  const dossierApproved = dossierDisplayStatus === 'approved';

  const verificationSteps = [
    { id: 'email', label: 'Email', done: true },
    { id: 'oneci', label: 'ONECI', done: !!profile?.oneci_verified },
    { id: 'facial', label: 'NEOFACE', done: facialStatus === 'verified' },
    { id: 'dossier', label: 'Dossier', done: dossierApproved },
  ];
  const verificationDoneCount = verificationSteps.filter((step) => step.done).length;

  const tabs = [
    { id: 'infos', label: 'Informations profil', icon: User },
    { id: 'verification', label: "Vérifications d'identité", icon: Shield },
    { id: 'history', label: 'Historique', icon: Calendar },
    { id: 'dossier', label: 'Dossier propriétaire', icon: FolderOpen },
    { id: 'stats', label: 'Statistiques', icon: TrendingUp },
  ];

  if (!user) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Veuillez vous connecter</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="w-full min-h-[100svh] bg-[#FDF7F2]">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6">
          <div className="relative overflow-hidden rounded-2xl border border-[#EFEBE9] bg-gradient-to-br from-white via-white to-[#FFF4EC] p-6 mb-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(241,101,34,0.08),_transparent_55%)]" />
            <div className="absolute -bottom-16 -right-10 w-40 h-40 bg-[#2C1810]/10 rounded-full blur-3xl" />
            <div className="relative grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
              <div className="flex flex-col sm:flex-row gap-5">
                <div className="relative">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={displayName}
                      className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-sm"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-[#FFF2E6] rounded-2xl flex items-center justify-center border-4 border-white shadow-sm">
                      <User className="w-12 h-12 text-[#F16522]" />
                    </div>
                  )}
                  <label className="absolute -bottom-2 -right-2 bg-white rounded-lg p-2 shadow-sm cursor-pointer hover:bg-[#FAF7F4] border border-[#EFEBE9]">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      id="avatar-upload"
                    />
                    {uploadingAvatar ? (
                      <Loader2 className="w-4 h-4 text-gray-600 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4 text-gray-600" />
                    )}
                  </label>
                </div>

                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-[#A69B95]">
                      Espace propriétaire
                    </p>
                    <h1 className="text-2xl sm:text-3xl font-bold text-[#2C1810]">
                      {displayName}
                    </h1>
                    <p className="text-sm text-[#6B5A4E]">
                      Gérez vos informations et votre crédibilité en un coup d'œil
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <RoleSwitcher variant="compact" size="sm" />
                    <span className="text-xs font-semibold text-[#9C3D0D] bg-[#FFF2E6] border border-[#F5D9C6] px-2 py-1 rounded-full">
                      Propriétaire
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-[#6B5A4E]">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#EFEBE9] rounded-full">
                      <Mail className="w-3.5 h-3.5 text-[#F16522]" />
                      {profile?.email || 'Email non défini'}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#EFEBE9] rounded-full">
                      <Phone className="w-3.5 h-3.5 text-[#F16522]" />
                      {profile?.phone || 'Téléphone non défini'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleBecomeTenant}
                      disabled={becomingTenant}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#2C1810] hover:bg-[#1B0F0A] text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Key className="w-4 h-4" />
                      <span>{becomingTenant ? 'Changement...' : 'Mon espace locataire'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#EFEBE9] bg-white p-4">
                  <p className="text-xs text-[#8B7355]">Score de confiance</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-2xl font-semibold text-[#2C1810]">
                      {profile?.trust_score || 0}%
                    </span>
                    <Shield className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <div className="rounded-xl border border-[#EFEBE9] bg-white p-4">
                  <p className="text-xs text-[#8B7355]">Biens publiés</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-2xl font-semibold text-[#2C1810]">
                      {profile?.properties_count || 0}
                    </span>
                    <Home className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <div className="rounded-xl border border-[#EFEBE9] bg-white p-4 sm:col-span-2">
                  <p className="text-xs text-[#8B7355]">Revenus totaux</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-2xl font-semibold text-[#2C1810]">
                      {profile?.total_revenue
                        ? `${profile.total_revenue.toLocaleString()} FCFA`
                        : '0 FCFA'}
                    </span>
                    <TrendingUp className="w-5 h-5 text-[#F16522]" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-2 mb-6 overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              {tabs.map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-[#F16522] to-[#D95318] text-white shadow-sm'
                        : 'text-[#6B5A4E] hover:bg-[#FAF7F4]'
                    }`}
                  >
                    <TabIcon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-6">
            {activeTab === 'infos' && (
              <div className="grid lg:grid-cols-[1.4fr,0.9fr] gap-6">
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div className="rounded-2xl border border-[#EFEBE9] p-5 space-y-4">
                    <h4 className="text-sm font-semibold text-[#2C1810]">Identité</h4>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#2C1810] mb-2">
                          Nom complet <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.full_name}
                          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                          placeholder="Votre nom complet"
                          className="w-full px-4 py-2.5 rounded-xl border border-[#E7DFD9] focus:outline-none focus:ring-2 focus:ring-[#F16522]/20 focus:border-[#F16522]"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#2C1810] mb-2">
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
                          className="w-full px-4 py-2.5 rounded-xl border border-[#E7DFD9] focus:outline-none focus:ring-2 focus:ring-[#F16522]/20 focus:border-[#F16522]"
                          required
                        >
                          <option value="">Sélectionner...</option>
                          <option value="Homme">Homme</option>
                          <option value="Femme">Femme</option>
                          <option value="Non spécifié">Non spécifié</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#EFEBE9] p-5 space-y-4">
                    <h4 className="text-sm font-semibold text-[#2C1810]">Coordonnées</h4>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#2C1810] mb-2">
                          Email
                        </label>
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#FAF7F4] border border-[#E7DFD9] rounded-xl">
                          <Mail className="w-4 h-4 text-[#A69B95]" />
                          <input
                            type="email"
                            value={profile?.email || ''}
                            disabled
                            className="bg-transparent flex-1 outline-none text-[#8B7355]"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#2C1810] mb-2">
                          Téléphone <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center gap-2 px-4 py-2.5 border border-[#E7DFD9] rounded-xl focus-within:ring-2 focus-within:ring-[#F16522]/20 focus-within:border-[#F16522]">
                          <Phone className="w-4 h-4 text-[#A69B95]" />
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="Votre numéro de téléphone"
                            className="flex-1 outline-none"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#2C1810] mb-2">
                          Ville <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center gap-2 px-4 py-2.5 border border-[#E7DFD9] rounded-xl focus-within:ring-2 focus-within:ring-[#F16522]/20 focus-within:border-[#F16522]">
                          <MapPin className="w-4 h-4 text-[#A69B95]" />
                          <input
                            type="text"
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            placeholder="Votre ville"
                            className="flex-1 outline-none"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#2C1810] mb-2">
                          Adresse <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          placeholder="Votre adresse complète"
                          className="w-full px-4 py-2.5 rounded-xl border border-[#E7DFD9] focus:outline-none focus:ring-2 focus:ring-[#F16522]/20 focus:border-[#F16522]"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#EFEBE9] p-5 space-y-3">
                    <h4 className="text-sm font-semibold text-[#2C1810]">Présentation</h4>
                    <textarea
                      className="w-full px-4 py-2.5 border border-[#E7DFD9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F16522]/20 focus:border-[#F16522] resize-none"
                      rows={4}
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      placeholder="Parlez-vous brièvement..."
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#F16522] to-[#D95318] hover:from-[#E85B1C] hover:to-[#C94A12] text-white rounded-xl font-medium transition-all disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Enregistrement...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Enregistrer
                        </>
                      )}
                    </button>
                  </div>
                </form>

                <aside className="space-y-4">
                  <div className="rounded-2xl border border-[#EFEBE9] bg-white p-4">
                    <h4 className="text-sm font-semibold text-[#2C1810] mb-3">Aperçu profil</h4>
                    <div className="space-y-2 text-sm text-[#6B5A4E]">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-[#F16522]" />
                        <span>{displayName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-[#F16522]" />
                        <span>{profile?.email || 'Email non défini'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#F16522]" />
                        <span>{profile?.city || 'Ville non définie'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-[#F16522]" />
                        <span>{profile?.phone || 'Téléphone non défini'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#F5D9C6] bg-[#FFF2E6] p-4">
                    <p className="text-sm font-semibold text-[#9C3D0D]">Conseil confiance</p>
                    <p className="text-xs text-[#8B7355] mt-1">
                      Complétez vos vérifications pour améliorer votre score et rassurer les
                      locataires.
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
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                    <h3 className="text-base font-semibold text-[#2C1810]">Vos vérifications</h3>
                    <span className="text-sm text-[#6B5A4E]">
                      {verificationDoneCount}/{verificationSteps.length} complétées
                    </span>
                  </div>
                  <div className="w-full bg-[#FAF7F4] rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-[#F16522] to-[#D95318] transition-all"
                      style={{
                        width: `${(verificationDoneCount / verificationSteps.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
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
                            onClick={() => navigate('/verification-oneci')}
                            className="mt-2 text-sm text-[#F16522] hover:underline font-medium"
                          >
                            Vérifier maintenant →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

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
                          Dossier de certification propriétaire
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

                <div className="p-4 bg-gradient-to-r from-[#F16522]/5 to-[#D95318]/5 rounded-xl border border-[#F16522]/20">
                  <div className="flex gap-3">
                    <Shield className="w-5 h-5 text-[#F16522] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-[#2C1810]">Pourquoi se faire vérifier ?</p>
                      <p className="text-sm text-[#6B5A4E] mt-1">
                        Un profil vérifié inspire confiance, accélère vos mises en relation et
                        améliore la visibilité de vos biens.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-[#EFEBE9] p-6 bg-[#FFF9F4]">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-[#F16522] mt-1" />
                    <div>
                      <h4 className="font-semibold text-[#2C1810]">Historique d'activité</h4>
                      <p className="text-sm text-[#6B5A4E] mt-1">
                        Aucun événement récent pour le moment. Ajoutez un bien ou créez un contrat
                        pour alimenter votre historique.
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <button
                          onClick={() => navigate('/proprietaire/ajouter-propriete')}
                          className="text-xs font-semibold text-white bg-[#F16522] rounded-lg px-3 py-2 hover:bg-[#D95318]"
                        >
                          Ajouter un bien
                        </button>
                        <button
                          onClick={() => navigate('/proprietaire/contrats/nouveau')}
                          className="text-xs font-semibold text-[#F16522] bg-white border border-[#F5D9C6] rounded-lg px-3 py-2 hover:border-[#F16522]"
                        >
                          Créer un contrat
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'dossier' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-[#2C1810]">Dossier propriétaire</h3>
                  <p className="text-sm text-[#6B5A4E] mt-1">
                    Préparez vos documents pour obtenir la certification ANSUT.
                  </p>
                </div>
                <DossierSubmissionTab dossierType="owner" />
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-[#2C1810]">Statistiques</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatCard
                    icon={Home}
                    label="Biens publiés"
                    value={profile?.properties_count || 0}
                    color="blue"
                  />
                  <StatCard
                    icon={TrendingUp}
                    label="Revenus totaux"
                    value={
                      profile?.total_revenue
                        ? `${profile.total_revenue.toLocaleString()} FCFA`
                        : '0 FCFA'
                    }
                    color="green"
                  />
                  <StatCard
                    icon={Shield}
                    label="Score de confiance"
                    value={`${profile?.trust_score || 0}%`}
                    color="purple"
                  />
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
        fromRole="owner"
        toRole="tenant"
        loading={becomingTenant}
      />
    </>
  );
}
