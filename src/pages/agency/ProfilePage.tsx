import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useSearchParams } from 'react-router-dom';
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
  Users,
  Mail,
  Globe,
  Upload,
  File,
  Trash2,
  Download,
  Loader2,
  Clock,
} from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import { toast } from '@/hooks/shared/useSafeToast';
import { AddressValue, formatAddress } from '@/shared/utils/address';
import { STORAGE_BUCKETS } from '@/services/upload/uploadService';

interface AgencyProfile {
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
  agency_name?: string | null;
  agency_logo?: string | null;
  agency_description?: string | null;
  agency_website?: string | null;
  agency_phone?: string | null;
  agency_email?: string | null;
  properties_count?: number;
  total_revenue?: number;
  mandates_count?: number;
}

interface VerificationDocument {
  id: string;
  name: string;
  type: string;
  file_data?: string; // base64 data
  file_url?: string; // fallback for URL-based storage
  file_size: number;
  uploaded_at: string;
  status: 'pending' | 'verified' | 'rejected';
}

export default function AgencyProfilePage() {
  const { user, profile: authProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'infos');
  const [profile, setProfile] = useState<AgencyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const DOCUMENT_TYPES = [
    { value: 'title_deed', label: 'Titre foncier', icon: FileText, description: 'Document prouvant la propriété', color: 'bg-blue-100 text-blue-600' },
    { value: 'cadastral', label: 'Document cadastral', icon: MapPin, description: 'Plan cadastral du bien', color: 'bg-green-100 text-green-600' },
    { value: 'official_attestation', label: 'Attestation officielle', icon: CheckCircle, description: 'Document officiel d\'agrément', color: 'bg-purple-100 text-purple-600' },
    { value: 'notarized_deed', label: 'Acte notarié', icon: File, description: 'Contrat ou acte notarié', color: 'bg-amber-100 text-amber-600' },
    { value: 'insurance', label: 'Assurance', icon: Shield, description: 'Attestation d\'assurance RC Pro', color: 'bg-red-100 text-red-600' },
    { value: 'other', label: 'Autre document', icon: FileText, description: 'Autre document justificatif', color: 'bg-gray-100 text-gray-600' },
  ];
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    city: '',
    address: '',
    bio: '',
    agency_name: '',
    agency_description: '',
    agency_website: '',
    agency_phone: '',
    agency_email: '',
  });

  useEffect(() => {
    if (user) {
      loadProfile();
      loadDocuments();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      // First try to get profile with agency fields
      let { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // If profile doesn't have agency fields, try to get from agencies table
      if (!profileData?.agency_name) {
        const { data: agencyData } = await supabase
          .from('agencies')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (agencyData) {
          // Merge agency data into profile
          profileData = {
            ...profileData,
            agency_name: agencyData.agency_name,
            agency_logo: agencyData.logo_url,
            agency_description: agencyData.description,
            agency_website: agencyData.website,
            agency_phone: agencyData.phone,
            agency_email: agencyData.email,
            is_verified: agencyData.is_verified,
            trust_score: agencyData.verification_score,
          };
        }
      }

      if (profileData) {
        setProfile(profileData);
        setFormData({
          full_name: profileData.full_name || '',
          phone: profileData.phone || '',
          city: profileData.city || '',
          address: profileData.address ? formatAddress(profileData.address) : '',
          bio: profileData.bio || '',
          agency_name: profileData.agency_name || '',
          agency_description: profileData.agency_description || '',
          agency_website: profileData.agency_website || '',
          agency_phone: profileData.agency_phone || '',
          agency_email: profileData.agency_email || '',
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    try {
      // Load from profile.verification_documents JSON field
      const { data: profileData } = await supabase
        .from('profiles')
        .select('verification_documents')
        .eq('id', user.id)
        .single();

      if (profileData?.verification_documents && Array.isArray(profileData.verification_documents)) {
        const jsonDocs = profileData.verification_documents.map((doc: any) => ({
          id: doc.id,
          name: doc.name,
          type: doc.type,
          file_data: doc.file_data, // base64 data
          file_size: doc.file_size,
          uploaded_at: doc.uploaded_at,
          status: doc.status,
        }));
        setDocuments(jsonDocs);
      } else {
        setDocuments([]);
      }
    } catch (err) {
      console.error('Error loading documents:', err);
    }
  };

  const handleDocumentUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    // Check if PDF
    if (file.type !== 'application/pdf') {
      toast.error('Veuillez uploader un fichier PDF');
      return;
    }

    // Check file size (max 5MB for base64 storage)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Le fichier ne doit pas dépasser 5MB');
      return;
    }

    try {
      setUploadingDoc(true);

      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix (e.g., "data:application/pdf;base64,")
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);

      const base64Data = await base64Promise;

      // Store document metadata and base64 content in profile.verification_documents JSON field
      const existingDocs = (profile as any)?.verification_documents || [];
      const newDoc = {
        id: Date.now().toString(),
        name: file.name,
        type: 'other',
        file_data: base64Data,
        file_size: file.size,
        status: 'pending',
        uploaded_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .update({
          verification_documents: [...existingDocs, newDoc]
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Document uploadé avec succès');
      loadProfile(); // Reload profile to get updated documents
      loadDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Erreur lors de l\'upload du document');
    } finally {
      setUploadingDoc(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;

    try {
      // Delete from profile.verification_documents JSON field
      if (profile?.verification_documents && Array.isArray(profile.verification_documents)) {
        const updatedDocs = profile.verification_documents.filter((doc: any) => doc.id !== docId);
        await supabase
          .from('profiles')
          .update({ verification_documents: updatedDocs })
          .eq('id', user.id);
        toast.success('Document supprimé');
        loadProfile(); // Reload profile
        loadDocuments();
      } else {
        // Update local state immediately
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
        toast.success('Document supprimé');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Octets';
    const k = 1024;
    const sizes = ['Octets', 'Ko', 'Mo', 'Go'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
    (profile?.agency_name && profile.agency_name.trim()) ||
    (profile?.full_name && profile.full_name.trim()) ||
    'Utilisateur';

  const isAgencyUser =
    profile?.user_type === 'agence' ||
    profile?.user_type === 'agent' ||
    authProfile?.user_type === 'agence';

  const tabs = [
    { id: 'infos', label: 'Informations', icon: User },
    { id: 'agency', label: 'Agence', icon: Building2 },
    { id: 'contact', label: 'Contact', icon: Mail },
    { id: 'verification', label: 'Vérifications', icon: Shield },
    { id: 'stats', label: 'Statistiques', icon: TrendingUp },
  ];

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
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold">{displayName}</h2>
              {profile?.agency_logo && (
                <img
                  src={profile.agency_logo}
                  alt="Logo agence"
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}
            </div>
            <p className="text-gray-600">Agence immobilière</p>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du représentant
                </label>
                <Input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Votre nom complet"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email personnel
                </label>
                <Input type="email" value={profile?.email || ''} disabled className="bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Téléphone personnel
                </label>
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

        {activeTab === 'agency' && (
          <div className="space-y-6">
            {!isAgencyUser && (
              <div className="p-4 border border-amber-200 bg-amber-50 rounded-lg">
                <p className="font-semibold text-amber-800 mb-2">Fonctionnalité agence</p>
                <p className="text-amber-700 text-sm">
                  Cet onglet permet de gérer les informations de votre agence. Vous semblez connecté
                  en tant que propriétaire ; pour devenir agence, complétez votre inscription.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button asChild variant="outline">
                    <a href="/agence/inscription">Devenir une agence</a>
                  </Button>
                  <Button asChild>
                    <a href="/proprietaire/mes-mandats">Voir mes mandats</a>
                  </Button>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom de l'agence
                  </label>
                  <Input
                    type="text"
                    value={formData.agency_name}
                    onChange={(e) => setFormData({ ...formData, agency_name: e.target.value })}
                    placeholder="Nom de votre agence"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Site web</label>
                  <Input
                    type="url"
                    value={formData.agency_website}
                    onChange={(e) => setFormData({ ...formData, agency_website: e.target.value })}
                    placeholder="https://www.monagence.ci"
                  />
                </div>
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
                      className="w-20 h-20 rounded-lg object-cover border"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center border">
                      <Building2 className="w-10 h-10 text-gray-400" />
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
                  placeholder="Décrivez votre agence, vos services et votre expertise..."
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

        {activeTab === 'contact' && (
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Téléphone de l'agence
                </label>
                <Input
                  type="tel"
                  value={formData.agency_phone}
                  onChange={(e) => setFormData({ ...formData, agency_phone: e.target.value })}
                  placeholder="+225 XX XX XX XX XX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email de l'agence
                </label>
                <Input
                  type="email"
                  value={formData.agency_email}
                  onChange={(e) => setFormData({ ...formData, agency_email: e.target.value })}
                  placeholder="contact@agence.ci"
                />
              </div>
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
            {/* Status Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Statut de vérification</h3>
              <div className="space-y-3">
                <VerificationItem
                  title="Email vérifié"
                  description="Votre adresse email a été vérifiée"
                  verified={true}
                />
                <VerificationItem
                  title="Agrément ONECI"
                  description="Agrément professionnel vérifié"
                  verified={profile?.oneci_verified}
                />
              </div>
            </div>

            {/* Documents Upload Section */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Documents de vérification</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Complétez votre dossier pour augmenter votre score de confiance
                  </p>
                </div>
                {documents.length > 0 && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                    <File className="w-4 h-4 mr-1" />
                    {documents.length} document{documents.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Document Types Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {DOCUMENT_TYPES.map((docType) => {
                  const Icon = docType.icon;
                  return (
                    <div
                      key={docType.value}
                      onClick={() => fileInputRef.current?.click()}
                      className="group cursor-pointer border-2 border-dashed border-gray-300 hover:border-primary-400 hover:border-solid hover:bg-primary-50/50 rounded-xl p-5 transition-all"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl ${docType.color || 'bg-gray-100 text-gray-600'} group-hover:scale-110 transition-transform`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">
                            {docType.label}
                          </h4>
                          <p className="text-sm text-gray-500 mt-1">{docType.description}</p>
                          <p className="text-xs text-gray-400 mt-2">PDF uniquement - Max 10Mo</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Upload Status */}
              {uploadingDoc && (
                <div className="mb-4 p-4 bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-primary-900">Téléchargement en cours...</p>
                      <p className="text-xs text-primary-600">Veuillez patienter</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Documents List */}
              {documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="p-3 bg-red-50 rounded-xl">
                          <File className="w-6 h-6 text-red-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{doc.name}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                            <span>{formatFileSize(doc.file_size)}</span>
                            <span>•</span>
                            <span>
                              {new Date(doc.uploaded_at).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                            <span>•</span>
                            <span className="text-gray-400">PDF</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        <button
                          onClick={() => {
                            // Download from base64 or URL
                            if (doc.file_data) {
                              const binaryString = atob(doc.file_data);
                              const bytes = new Uint8Array(binaryString.length);
                              for (let i = 0; i < binaryString.length; i++) {
                                bytes[i] = binaryString.charCodeAt(i);
                              }
                              const blob = new Blob([bytes], { type: 'application/pdf' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = doc.name;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                            } else if (doc.file_url) {
                              window.open(doc.file_url, '_blank');
                            }
                          }}
                          className="p-2.5 rounded-lg hover:bg-gray-100 transition-colors"
                          title="Télécharger"
                        >
                          <Download className="w-5 h-5 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="p-2.5 rounded-lg hover:bg-red-50 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-5 h-5 text-red-600" />
                        </button>
                        <span
                          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap flex items-center gap-1.5 ${
                            doc.status === 'verified'
                              ? 'bg-green-100 text-green-700'
                              : doc.status === 'rejected'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {doc.status === 'verified' && <CheckCircle className="w-4 h-4" />}
                          {doc.status === 'rejected' && <AlertCircle className="w-4 h-4" />}
                          {doc.status === 'pending' && <Clock className="w-4 h-4" />}
                          {doc.status === 'verified'
                            ? 'Vérifié'
                            : doc.status === 'rejected'
                            ? 'Rejeté'
                            : 'En attente'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border border-dashed border-gray-300">
                  <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h4 className="text-lg font-semibold text-gray-700 mb-2">Aucun document téléchargé</h4>
                  <p className="text-gray-500 text-sm mb-4">
                    Commencez par ajouter vos documents officiels
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
                  >
                    <Upload className="w-5 h-5" />
                    Ajouter un document
                  </button>
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleDocumentUpload}
                className="hidden"
                disabled={uploadingDoc}
              />
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Statistiques de l'agence</h3>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Biens gérés</p>
                    <p className="text-2xl font-bold">{profile?.properties_count || 0}</p>
                  </div>
                  <Home className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Mandats actifs</p>
                    <p className="text-2xl font-bold">{profile?.mandates_count || 0}</p>
                  </div>
                  <FileText className="w-8 h-8 text-purple-500" />
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
                  <Shield className="w-8 h-8 text-yellow-500" />
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
