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
  CreditCard,
  Star,
  Calendar,
} from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import { toast } from '@/hooks/shared/useSafeToast';
import TenantDashboardLayout from '@/features/tenant/components/TenantDashboardLayout';
import { AddressValue, formatAddress } from '@/shared/utils/address';
import { STORAGE_BUCKETS } from '@/services/upload/uploadService';

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
}

export default function EnhancedProfilePage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'infos');
  const [profile, setProfile] = useState<TenantProfile | null>(null);
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
  const facialStatus = profile?.facial_verification_status;

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
    }
  }, [user, loadProfile]);

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

  const displayName = (profile?.full_name && profile.full_name.trim()) || 'Utilisateur';

  const tabs = [
    { id: 'infos', label: 'Informations', icon: User },
    { id: 'verification', label: 'Vérifications', icon: Shield },
    { id: 'history', label: 'Historique', icon: Calendar },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'stats', label: 'Statistiques', icon: Star },
  ];

  if (loading) {
    return (
      <TenantDashboardLayout title="Mon Profil">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </TenantDashboardLayout>
    );
  }

  return (
    <TenantDashboardLayout title="Mon Profil">
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
              <p className="text-gray-600">Locataire</p>
              <div className="flex items-center gap-2 mt-2">
                <Shield className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-sm font-medium leading-tight">
                  Score locataire: {profile?.tenant_score || profile?.trust_score || 0}%
                </span>
              </div>
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
                  <tab.icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
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
              <h3 className="text-lg font-semibold">Statut de vérification</h3>
              <div className="space-y-4">
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
                  onVerify={() => navigate('/locataire/verification-oneci')}
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

          {activeTab === 'documents' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Documents</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-blue-500 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium">Justificatif de domicile</h4>
                      <p className="text-sm text-gray-500">Requis pour certaines locations</p>
                    </div>
                  </div>
                  <Button variant="outline">Télécharger</Button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-8 h-8 text-green-500 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium">Relevés bancaires</h4>
                      <p className="text-sm text-gray-500">3 derniers mois</p>
                    </div>
                  </div>
                  <Button variant="outline">Télécharger</Button>
                </div>
              </div>
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
    </TenantDashboardLayout>
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
}: {
  title: string;
  description: string;
  verified: boolean | null;
  score?: number | null;
  onVerify?: () => void;
  showButton?: boolean;
  status?: 'pending' | 'verified' | 'failed' | null;
  allowRetry?: boolean;
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
        </div>
      </div>
      <div className="flex items-center gap-3 ml-4 flex-shrink-0">
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${statusConfig.bgColor} ${statusConfig.color}`}
        >
          {statusConfig.label}
        </span>
        {showButton && onVerify && (!verified || allowRetry) && (
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
                {status === 'failed' || allowRetry ? (
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
              <span>{status === 'failed' ? 'Réessayer' : allowRetry && verified ? 'Refaire la vérification' : 'Faire la vérification'}</span>
            </span>
          </Button>
        )}
      </div>
    </div>
  );
}
