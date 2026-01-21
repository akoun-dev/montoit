/**
 * ProfileCompletionPage - Complétion du profil après première connexion
 * Design Premium Ivorian (Chocolat/Orange/Sable)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, User, MapPin, FileText, Loader2, Check } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { InputWithIcon } from '@/shared/ui';
import '@/styles/form-premium.css';

const USER_TYPES = [
  { value: 'tenant', label: 'Locataire', description: 'Je cherche un logement' },
  { value: 'owner', label: 'Propriétaire', description: 'Je loue mes biens' },
  { value: 'agent', label: 'Agence', description: 'Je gère des biens immobiliers' },
] as const;

const IVORIAN_CITIES = [
  'Abidjan',
  'Bouaké',
  'Yamoussoukro',
  'San-Pédro',
  'Korhogo',
  'Man',
  'Daloa',
  'Gagnoa',
  'Divo',
  'Abengourou',
  'Grand-Bassam',
  'Assinie',
  'Bingerville',
  'Cocody',
  'Marcory',
  'Plateau',
  'Treichville',
  'Yopougon',
  'Adjamé',
  'Abobo',
];

export default function ProfileCompletionPage() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, updateProfile } = useAuth();

  const [fullName, setFullName] = useState('');
  const [userType, setUserType] = useState<'tenant' | 'owner' | 'agent'>('tenant');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Pré-remplir avec les données du profil existant
  useEffect(() => {
    if (profile?.full_name) {
      setFullName(profile.full_name);
    }
    if (profile?.user_type) {
      setUserType(profile.user_type as 'tenant' | 'owner' | 'agent');
    }
    if (profile?.city) {
      setCity(profile.city);
    }
    if (profile?.bio) {
      setBio(profile.bio);
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Veuillez entrer votre nom complet');
      return;
    }

    setSubmitting(true);

    try {
      await updateProfile({
        full_name: fullName.trim(),
        user_type: userType,
        city: city || null,
        bio: bio.trim() || null,
        profile_setup_completed: true,
      });

      // Redirection selon le type d'utilisateur
      const redirectPath =
        userType === 'tenant'
          ? '/recherche'
          : userType === 'owner'
            ? '/proprietaire/ajouter-propriete'
            : '/dashboard';

      navigate(redirectPath);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Erreur lors de la mise à jour du profil';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Afficher un loader pendant le chargement de l'auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-[#F16522] mx-auto" />
          <p className="text-[#A69B95]">Chargement...</p>
        </div>
      </div>
    );
  }

  // Rediriger seulement après le chargement si pas d'utilisateur
  if (!user) {
    navigate('/connexion');
    return null;
  }

  return (
    <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 mb-4">
            <Building2 className="h-10 w-10 text-[#F16522]" />
            <span className="text-3xl font-bold bg-gradient-to-r from-[#2C1810] to-[#F16522] bg-clip-text text-transparent">
              Mon Toit
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#2C1810] mb-2">Complétez votre profil</h1>
          <p className="text-[#A69B95]">
            Quelques informations pour personnaliser votre expérience
          </p>
        </div>

        {/* Form Card */}
        <div className="form-section-premium animate-scale-in">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 text-sm font-medium">
                {error}
              </div>
            )}

            {/* Full Name */}
            <div>
              <label className="form-label-premium">Nom complet *</label>
              <InputWithIcon
                icon={User}
                variant="modern"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jean Kouassi"
                required
                autoFocus
                className="mt-2"
              />
            </div>

            {/* User Type Selection */}
            <div>
              <label className="form-label-premium mb-3 block">Vous êtes *</label>
              <div className="space-y-3">
                {USER_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setUserType(type.value)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
                      userType === type.value
                        ? 'border-[#F16522] bg-[#F16522]/10 shadow-md'
                        : 'border-[#A69B95]/30 hover:border-[#F16522]/50'
                    }`}
                  >
                    <div>
                      <p
                        className={`font-semibold ${userType === type.value ? 'text-[#F16522]' : 'text-[#2C1810]'}`}
                      >
                        {type.label}
                      </p>
                      <p className="text-sm text-[#A69B95]">{type.description}</p>
                    </div>
                    {userType === type.value && (
                      <div className="h-6 w-6 rounded-full bg-[#F16522] flex items-center justify-center">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* City Selection */}
            <div>
              <label className="form-label-premium">
                <MapPin className="inline h-4 w-4 mr-1" />
                Ville (optionnel)
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="form-input-premium mt-2"
              >
                <option value="">Sélectionnez une ville</option>
                {IVORIAN_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Bio */}
            <div>
              <label className="form-label-premium">
                <FileText className="inline h-4 w-4 mr-1" />
                Bio (optionnel)
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Parlez-nous un peu de vous..."
                rows={3}
                className="form-input-premium mt-2 resize-none"
                maxLength={300}
              />
              <p className="text-xs text-[#A69B95] mt-1 text-right">{bio.length}/300</p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !fullName.trim()}
              className="form-button-primary w-full flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <span>Commencer</span>
                  <Check className="h-5 w-5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Skip Link */}
        <p className="text-center mt-6 text-sm text-[#A69B95]">
          Vous pourrez modifier ces informations plus tard dans votre profil
        </p>
      </div>
    </div>
  );
}
