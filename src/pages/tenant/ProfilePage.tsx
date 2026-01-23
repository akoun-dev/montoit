import { useState, useEffect, ChangeEvent } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User, Phone, MapPin, Shield, Camera, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import { toast } from '@/hooks/shared/useSafeToast';
import TenantDashboardLayout from '../../features/tenant/components/TenantDashboardLayout';
import OwnerDashboardLayout from '@/features/owner/components/OwnerDashboardLayout';
import ONECIFormTest from '@/features/verification/components/ONECIFormTest';
import { AddressValue, formatAddress } from '@/shared/utils/address';
import { STORAGE_BUCKETS } from '@/services/upload/uploadService';
import RoleSwitcher from '@/components/role/RoleSwitcher';

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
}

export default function ProfilePage() {
  const { user, profile: authProfile, refetchProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'infos');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    city: '',
    address: '',
    bio: '',
  });

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const loadProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('Profil introuvable');
      }

      // Calculer le score si non présent ou à zéro
      if (!data.trust_score || data.trust_score === 0) {
        try {
          const { ScoringService } = await import('@/services/scoringService');
          const scoreBreakdown = await ScoringService.calculateGlobalTrustScore(user.id);

          // Mettre à jour le trust_score dans la base de données
          const { error: scoreError } = await supabase
            .from('profiles')
            .update({ trust_score: scoreBreakdown.globalScore })
            .eq('id', user.id);

          if (!scoreError) {
            data.trust_score = scoreBreakdown.globalScore;
          }
        } catch (scoreErr) {
          console.warn('Could not calculate score:', scoreErr);
        }
      }

      const formattedAddress = formatAddress(data.address as AddressValue, data.city || undefined);
      const profileData: Profile = {
        id: data.id,
        user_id: data.id,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        city: data.city,
        address: data.address as AddressValue,
        bio: data.bio,
        avatar_url: data.avatar_url,
        user_type: data.user_type,
        is_verified: data.is_verified,
        oneci_verified: data.oneci_verified,
        trust_score: data.trust_score,
      };

      setProfile(profileData);
      setFormData({
        full_name: data.full_name || '',
        phone: data.phone || '',
        city: data.city || '',
        address: formattedAddress,
        bio: data.bio || '',
      });
    } catch (err) {
      console.error('Error loading profile:', err);
      toast.error('Erreur lors du chargement du profil');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Mettre à jour les informations du profil
      const { error: updateError } = await supabase
        .from('profiles')
        .update(formData)
        .eq('id', user.id);
      if (updateError) throw updateError;

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

      toast.success('Profil mis à jour avec succès');
      loadProfile();
      // Recharger aussi le profil dans le contexte AuthProvider
      if (refetchProfile) {
        refetchProfile();
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const isOwner = authProfile?.user_type === 'owner' || authProfile?.user_type === 'proprietaire';
  const Layout = isOwner ? OwnerDashboardLayout : TenantDashboardLayout;

  if (loading) {
    return (
      <Layout title="Mon Profil">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  const displayName =
    (profile?.full_name && profile.full_name.trim()) ||
    (user as any)?.user_metadata?.full_name ||
    profile?.email ||
    user?.email ||
    'Mon Profil';

  const rawRole =
    profile?.user_type ||
    (user as any)?.user_metadata?.user_type ||
    (profile as any)?.active_role ||
    (user as any)?.role ||
    '';

  const roleLabel =
    rawRole === 'locataire'
      ? 'Locataire'
      : rawRole === 'proprietaire' || rawRole === 'owner'
        ? 'Propriétaire'
        : rawRole === 'agence'
          ? 'Agence'
          : rawRole || 'Non renseigné';

  const tabs = [
    { id: 'infos', label: 'Informations', icon: User },
    { id: 'verification', label: 'Vérification', icon: Shield },
  ];

  return (
    <Layout title="Mon Profil">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="bg-card rounded-2xl shadow-card p-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-muted-foreground" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 w-9 h-9 bg-primary rounded-full flex items-center justify-center text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-md">
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    if (!user) return;
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadingAvatar(true);
                    try {
                      const fileExt = file.name.split('.').pop();
                      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
                      const bucket =
                        import.meta.env.VITE_SUPABASE_AVATARS_BUCKET || STORAGE_BUCKETS.AVATARS;
                      const { data: existingBuckets, error: bucketError } =
                        await supabase.storage.listBuckets();
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

                      const { data: publicUrlData } = supabase.storage
                        .from(bucket)
                        .getPublicUrl(fileName);

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
                  }}
                  disabled={uploadingAvatar}
                />
              </label>
              {uploadingAvatar && (
                <span className="absolute -bottom-5 right-0 text-xs text-muted-foreground">
                  Upload...
                </span>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
              <p className="text-muted-foreground">{profile?.email || user?.email}</p>
              <div className="mt-2 flex items-center gap-3 flex-wrap">
                <span className="text-sm text-muted-foreground">Rôle :</span>
                <RoleSwitcher variant="compact" size="sm" />
                {/* Debug: Afficher le rôle directement */}
                <span className="text-xs text-gray-400">
                  (DEBUG: user_type={profile?.user_type})
                </span>
              </div>
              {profile?.trust_score && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Score de confiance:</span>
                  <span
                    className={`font-semibold ${profile.trust_score >= 70 ? 'text-green-600' : profile.trust_score >= 50 ? 'text-amber-600' : 'text-red-600'}`}
                  >
                    {profile.trust_score}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:bg-muted'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-card rounded-2xl shadow-card p-6">
          {activeTab === 'infos' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Informations personnelles
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Nom complet
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={formData.full_name}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setFormData({ ...formData, full_name: e.target.value })
                      }
                      className="pl-10"
                      placeholder="Votre nom complet"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Téléphone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={formData.phone}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="pl-10"
                      placeholder="+225 XX XX XX XX"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Ville</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={formData.city}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                      className="pl-10"
                      placeholder="Votre ville"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Adresse</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={formData.address}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    className="pl-10"
                    placeholder="Votre adresse"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={4}
                  placeholder="Parlez-nous de vous..."
                />
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full md:w-auto">
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </Button>
            </div>
          )}

          {activeTab === 'verification' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Statut de vérification</h2>

              {/* Statuts actuels */}
              <div className="space-y-4">
                <VerificationItem
                  title="Identité ANSUT"
                  description="Vérification de votre identité via le système ANSUT"
                  verified={profile?.is_verified ?? null}
                />
                <VerificationItem
                  title="ONECI"
                  description="Vérification de votre carte nationale d'identité"
                  verified={profile?.oneci_verified ?? null}
                />
              </div>

              {/* Formulaires de vérification */}
              <div className="border-t border-border pt-6 mt-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Lancer une vérification
                </h3>

                <div className="space-y-6">
                  {/* Formulaire ONECI - Version de test */}
                  {!profile?.oneci_verified && user && (
                    <div className="border border-border rounded-xl p-6">
                      <ONECIFormTest userId={user.id} onSuccess={loadProfile} />
                    </div>
                  )}

                  {/* Message de succès quand tout est vérifié */}
                  {profile?.oneci_verified && profile?.is_verified && (
                    <div className="text-center py-6 bg-green-50 rounded-xl border border-green-200">
                      <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                      <h4 className="text-lg font-semibold text-green-700">
                        Vérifications principales complètes !
                      </h4>
                      <p className="text-green-600">Votre profil est vérifié via ANSUT et ONECI.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
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
        {verified ? 'Vérifié' : 'Non vérifié'}
      </span>
    </div>
  );
}
