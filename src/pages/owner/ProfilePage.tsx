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
} from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import { toast } from '@/hooks/shared/useSafeToast';
import { AddressValue, formatAddress } from '@/shared/utils/address';
import { STORAGE_BUCKETS } from '@/services/upload/uploadService';

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

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

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
      const fileName = `${user.id}/avatar-${Date.now()}`;
      const bucket = STORAGE_BUCKETS.PROFILE_IMAGES;

      // Create bucket if needed
      const { data: existingBuckets, error: bucketError } = await supabase.storage.listBuckets();
      if (bucketError) throw bucketError;

      const bucketExists = (existingBuckets || []).some((b) => b.name === bucket);
      if (!bucketExists) {
        const { error: createError } = await supabase.storage.createBucket(bucket, {
          public: true,
        });
        if (createError) throw createError;
      }

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
      const fileName = `${user.id}/logo-${Date.now()}`;
      const bucket = STORAGE_BUCKETS.PROFILE_IMAGES;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: true });
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

  const displayName =
    (profile?.full_name && profile.full_name.trim()) ||
    (profile?.agency_name && profile.agency_name.trim()) ||
    'Utilisateur';

  const tabs = [
    { id: 'infos', label: 'Informations', icon: User },
    { id: 'agency', label: 'Agence', icon: Building2 },
    { id: 'verification', label: 'Vérifications', icon: Shield },
    { id: 'stats', label: 'Statistiques', icon: TrendingUp },
  ];
  const isOwnerOnly =
    profile?.user_type === 'proprietaire' ||
    profile?.user_type === 'owner' ||
    authProfile?.user_type === 'proprietaire';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center gap-6">
          <div className="relative">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-primary-600" />
              </div>
            )}
            <label className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow-sm cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
                id="avatar-upload"
              />
              <Camera className="w-4 h-4 text-gray-600" />
            </label>
            {uploadingAvatar && (
              <span className="absolute -bottom-5 right-0 text-xs text-muted-foreground">
                Upload...
              </span>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{displayName}</h2>
            <p className="text-gray-600">
              {profile?.user_type === 'proprietaire' ? 'Propriétaire' : 'Agence immobilière'}
            </p>
            {profile?.trust_score && (
              <div className="flex items-center gap-2 mt-2">
                <Shield className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">
                  Score de confiance: {profile.trust_score}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="border-b">
          <nav className="flex -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
      <div className="bg-white rounded-lg shadow-sm p-6">
        {activeTab === 'infos' && (
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom complet</label>
                <Input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Votre nom complet"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <Input type="email" value={profile?.email || ''} disabled className="bg-gray-50" />
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

        {activeTab === 'agency' && (
          <div className="space-y-6">
            {isOwnerOnly && (
              <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                <p className="font-semibold text-blue-800 mb-1">Fonctionnalité agence</p>
                <p className="text-blue-700 text-sm">
                  Vous êtes identifié comme propriétaire. Vous pouvez ajouter des informations
                  d'agence à votre profil ou gérer vos mandats avec des agences immobilières.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/proprietaire/mes-mandats')}
                    className="whitespace-nowrap"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Voir mes mandats
                  </Button>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom de l'agence
                </label>
                <Input
                  type="text"
                  value={formData.agency_name}
                  onChange={(e) => setFormData({ ...formData, agency_name: e.target.value })}
                  placeholder="Nom de votre agence"
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
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <label className="cursor-pointer flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
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
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description de l'agence
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  rows={4}
                  value={formData.agency_description}
                  onChange={(e) => setFormData({ ...formData, agency_description: e.target.value })}
                  placeholder="Décrivez votre agence..."
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving} className="flex items-center gap-2">
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'verification' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Statut de vérification</h3>
            <VerificationItem
              title="Email vérifié"
              description="Votre adresse email a été vérifiée"
              verified={true}
            />
            <VerificationItem
              title="Vérification ONECI"
              description="Carte d'identité vérifiée"
              verified={profile?.oneci_verified}
            />
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Statistiques</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Biens publiés</p>
                    <p className="text-2xl font-bold">{profile?.properties_count || 0}</p>
                  </div>
                  <Home className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Revenus totaux</p>
                    <p className="text-2xl font-bold">
                      {profile?.total_revenue
                        ? `${profile.total_revenue.toLocaleString()} FCFA`
                        : '0 FCFA'}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Score de confiance</p>
                    <p className="text-2xl font-bold">{profile?.trust_score || 0}%</p>
                  </div>
                  <Shield className="w-8 h-8 text-purple-500" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function VerificationItem({
  title,
  description,
  verified,
}: {
  title: string;
  description: string;
  verified: boolean | null;
}) {
  return (
    <div className="flex items-center justify-between p-4 border border-border rounded-lg">
      <div className="flex items-center gap-3">
        {verified ? (
          <CheckCircle className="w-6 h-6 text-green-600" />
        ) : (
          <AlertCircle className="w-6 h-6 text-amber-500" />
        )}
        <div>
          <h3 className="font-medium text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <span
        className={`px-3 py-1 rounded-full text-sm font-medium ${
          verified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
        }`}
      >
        {verified ? 'Vérifié' : 'En attente'}
      </span>
    </div>
  );
}
