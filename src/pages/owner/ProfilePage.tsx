import { useState, useEffect, ChangeEvent } from 'react';
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
  Building2,
  Home,
  FileText,
  TrendingUp,
  Mail,
  Loader2,
  Key,
  FolderOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatAddress } from '@/shared/utils/address';
import { STORAGE_BUCKETS } from '@/services/upload/uploadService';
import RoleSwitcher from '@/components/role/RoleSwitcher';
import { RoleSwitchModal } from '@/shared/ui/Modal';
import { DossierSubmissionTab } from '@/shared/ui/verification/DossierSubmissionTab';
import verificationApplicationsService from '@/features/verification/services/verificationApplications.service';

interface Profile {
  id: string;
  user_id: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  address: any;
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
  icon: any;
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
  status?: 'pending' | 'verified' | 'failed' | 'in_review' | null;
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
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:shadow-sm transition-all">
      <div className="flex items-center gap-3 flex-1">
        <StatusIcon className={`w-6 h-6 ${statusConfig.color} flex-shrink-0`} />
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
          {score && verified && (
            <p className="text-xs text-green-600 mt-1">
              Score: {score}%
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
          className={`px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap border ${statusConfig.bgColor} ${statusConfig.color}`}
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
          <button
            onClick={onVerify}
            className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          >
            <svg
              className="h-4 w-4 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {status === 'failed' || allowRetry || (isDossier && status === 'more_info_requested') ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              ) : (
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
                : (status === 'failed' ? 'Réessayer' : allowRetry && verified ? 'Refaire' : 'Vérifier')
              }
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

export default function OwnerProfilePage() {
  const { user, profile: authProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'infos');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [becomingTenant, setBecomingTenant] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [dossierApplication, setDossierApplication] = useState<any>(null);
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

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  // Charger le dossier de certification propriétaire
  useEffect(() => {
    if (user) {
      loadDossierApplication();
    }
  }, [user]);

  const loadDossierApplication = async () => {
    if (!user) return;

    try {
      const applications = await verificationApplicationsService.getUserApplications(user.id, 'owner');
      const activeApp = applications.find(
        (app) => app.status === 'pending' || app.status === 'in_review' || app.status === 'more_info_requested'
      ) || applications[0] || null;

      if (activeApp) {
        setDossierApplication(activeApp);
      }
    } catch (error) {
      console.error('Error loading dossier application:', error);
    }
  };

  const loadProfile = async () => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
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

        // Recalculer le score et mettre à jour si différent
        try {
          const { ScoringService } = await import('@/services/scoringService');
          const scoreBreakdown = await ScoringService.calculateGlobalTrustScore(user.id);
          const newScore = scoreBreakdown.globalScore;

          if (profileData.trust_score !== newScore) {
            await supabase.from('profiles').update({ trust_score: newScore }).eq('id', user.id);
            // Mettre à jour le profil local
            setProfile({ ...profileData, trust_score: newScore });
          }
        } catch (scoreError) {
          console.error('Error recalculating score:', scoreError);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updates: any = {
        ...formData,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);

      if (error) throw error;

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

  const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    try {
      setUploadingLogo(true);
      const fileName = `${user.id}/logo-${Date.now()}.${file.name.split('.').pop()}`;
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
        .update({ agency_logo: publicUrl })
        .eq('id', user.id);
      if (updateError) throw updateError;

      await loadProfile();
      toast.success("Logo de l'agence mis à jour");
    } catch (err) {
      console.error('Error uploading logo:', err);
      toast.error('Échec du téléchargement du logo');
    } finally {
      setUploadingLogo(false);
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
        .update({ user_type: 'locataire' })
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

  // Filter tabs based on user type
  const allTabs = [
    { id: 'infos', label: 'Informations', icon: User },
    { id: 'agency', label: 'Agence', icon: Building2 },
    { id: 'verification', label: 'Vérifications', icon: Shield },
    { id: 'dossier', label: 'Dossier', icon: FolderOpen },
    { id: 'stats', label: 'Statistiques', icon: TrendingUp },
  ];

  const isAgency = profile?.user_type === 'agence' || profile?.user_type === 'agency' || authProfile?.user_type === 'agence';
  const tabs = allTabs.filter(tab => tab.id !== 'agency' || isAgency);

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
    <div className="w-full min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#2C1810] rounded-2xl shadow-sm mb-8">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#F16522] flex items-center justify-center">
              <User className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Mon Profil</h1>
              <p className="text-[#E8D4C5]">Gérez vos informations personnelles</p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Profile Header Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
                />
              ) : (
                <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center border-4 border-white shadow-md">
                  <User className="w-12 h-12 text-orange-500" />
                </div>
              )}
              <label className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-md cursor-pointer hover:bg-gray-50 transition-colors border border-gray-200">
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

            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-2xl font-bold text-gray-900">{displayName}</h2>
              <div className="flex items-center gap-3 mt-1 flex-wrap justify-center sm:justify-start">
                <span className="text-gray-500">Rôle :</span>
                <RoleSwitcher variant="compact" size="sm" />
              </div>
              <div className="flex items-center gap-3 mt-3 flex-wrap justify-center sm:justify-start">
                {profile?.trust_score && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full border border-green-200">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-700">
                      Score: {profile.trust_score}%
                    </span>
                  </div>
                )}
                <button
                  onClick={handleBecomeTenant}
                  disabled={becomingTenant}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Key className="w-4 h-4" />
                  <span>{becomingTenant ? 'Changement...' : 'Je suis locataire'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 mb-8 inline-flex gap-2">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <TabIcon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {activeTab === 'infos' && (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nom complet</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Votre nom complet"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={profile?.email || ''}
                      disabled
                      className="bg-transparent flex-1 outline-none text-gray-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
                  <div className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-500">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Votre numéro de téléphone"
                      className="flex-1 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Genre</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'Homme' | 'Femme' | 'Non spécifié' | '' })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="Homme">Homme</option>
                    <option value="Femme">Femme</option>
                    <option value="Non spécifié">Non spécifié</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ville</label>
                  <div className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-500">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Votre ville"
                      className="flex-1 outline-none"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Adresse</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Votre adresse complète"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                <textarea
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
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
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg font-medium transition-all disabled:opacity-50"
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
          )}

          {activeTab === 'agency' && (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom de l'agence
                </label>
                <input
                  type="text"
                  value={formData.agency_name}
                  onChange={(e) => setFormData({ ...formData, agency_name: e.target.value })}
                  placeholder="Nom de votre agence"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo de l'agence
                </label>
                <div className="flex items-center gap-4">
                  {profile?.agency_logo ? (
                    <img
                      src={profile.agency_logo}
                      alt="Logo agence"
                      className="w-20 h-20 rounded-xl object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200">
                      <Building2 className="w-10 h-10 text-gray-400" />
                    </div>
                  )}
                  <label className="cursor-pointer flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <Camera className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                    />
                    {uploadingLogo ? 'Upload...' : 'Changer le logo'}
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description de l'agence
                </label>
                <textarea
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                  rows={4}
                  value={formData.agency_description}
                  onChange={(e) => setFormData({ ...formData, agency_description: e.target.value })}
                  placeholder="Décrivez votre agence..."
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg font-medium transition-all disabled:opacity-50"
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
          )}

          {activeTab === 'verification' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Statut de vérification</h3>

              {/* Verified items with action buttons */}
              <div className="space-y-3 mb-8">
                <VerificationItem
                  title="Email vérifié"
                  description="Votre adresse email a été vérifiée"
                  verified={true}
                  showButton={false}
                />
                <VerificationItem
                  title="Vérification ONECI"
                  description="Carte d'identité vérifiée"
                  verified={profile?.oneci_verified ?? null}
                  onVerify={() => navigate('/proprietaire/verification-oneci')}
                  showButton={!profile?.oneci_verified}
                />
                <VerificationItem
                  title="Reconnaissance faciale"
                  description="Vérification biométrique NeoFace avec contrôle de vivacité"
                  verified={facialStatus === 'verified'}
                  score={profile?.facial_verification_score}
                  onVerify={() => navigate('/verification-biometrique?reset=true')}
                  showButton={true}
                  status={facialStatus || 'pending'}
                  allowRetry={facialStatus === 'verified'}
                />
                <VerificationItem
                  title="Dossier de certification propriétaire"
                  description="Documents verifies pour obtenir la certification ANSUT"
                  verified={dossierApplication?.status === 'approved'}
                  status={dossierApplication?.status === 'rejected' ? 'failed' : dossierApplication?.status === 'approved' ? 'verified' : dossierApplication?.status === 'pending' || dossierApplication?.status === 'in_review' ? 'in_review' : 'pending'}
                  onVerify={() => setActiveTab('dossier')}
                  showButton={!dossierApplication || dossierApplication?.status === 'more_info_requested' || dossierApplication?.status === 'rejected'}
                  extraInfo={dossierApplication?.rejection_reason}
                  isDossier={true}
                  allowRetry={dossierApplication?.status === 'rejected' || dossierApplication?.status === 'more_info_requested'}
                />
              </div>

              {/* Info Box */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">Pourquoi se faire vérifier ?</p>
                    <ul className="mt-2 text-sm text-blue-800 space-y-1">
                      <li>• Augmentez votre score de confiance et crédibilité</li>
                      <li>• Gagnez la confiance des locataires potentiels</li>
                      <li>• Accédez à des fonctionnalités prioritaires</li>
                      <li>• Vos annonces seront mises en avant dans les recherches</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'dossier' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Dossier de certification propriétaire</h3>
              <DossierSubmissionTab dossierType="owner" />
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Statistiques</h3>
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
      fromRole="proprietaire"
      toRole="locataire"
      loading={becomingTenant}
    />
    </>
  );
}
