/**
 * Formulaire de vérification ONECI (version client-side)
 *
 * Ce composant utilise le service ONECI côté client au lieu des Edge Functions
 * Utilisez ce composant si vous voulez faire les appels API directement depuis le navigateur
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase/client';
import { CreditCard, User, Calendar, Loader, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import { toast } from '@/hooks/shared/useSafeToast';
import { useOneCIVerification } from '@/hooks/useOneCIVerification';

interface ONECIFormClientProps {
  userId: string;
  onSuccess?: () => void;
  useClientAPI?: boolean; // Force l'utilisation de l'API client
}

type VerificationStatus = 'idle' | 'loading' | 'success' | 'error';

export default function ONECIFormClient({ userId, onSuccess, useClientAPI = true }: ONECIFormClientProps) {
  const [formData, setFormData] = useState({
    oneci_number: '',
    first_name: '',
    last_name: '',
    birth_date: '',
    gender: '', // M ou F
    // Champs optionnels
    birth_town: '',
    birth_country: 'CIV', // Par défaut : Côte d'Ivoire
    nationality: 'CIV', // Par défaut : Côte d'Ivoire
    residence_adr_1: '',
    residence_adr_2: '',
    residence_town: '',
  });
  const [showOptional, setShowOptional] = useState(false);
  const [status, setStatus] = useState<VerificationStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [showRemaining, setShowRemaining] = useState(false);

  const {
    isVerifying,
    verificationResult,
    error,
    remainingRequests,
    verifyIdentity,
    refreshRemainingRequests,
    isConfigured,
  } = useOneCIVerification();

  // Charger le quota de requêtes au montage
  useEffect(() => {
    if (isConfigured && useClientAPI) {
      refreshRemainingRequests().then((count) => {
        if (count > 0 && count < 10) {
          setShowRemaining(true);
        }
      });
    }
  }, [isConfigured, useClientAPI, refreshRemainingRequests]);

  const validateForm = () => {
    if (!formData.oneci_number.trim()) {
      toast.error('Veuillez entrer votre numéro CNI');
      return false;
    }
    if (formData.oneci_number.trim().length < 8) {
      toast.error('Le numéro CNI doit comporter au moins 8 caractères');
      return false;
    }
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      toast.error('Veuillez entrer votre nom et prénom');
      return false;
    }
    if (!formData.birth_date) {
      toast.error('Veuillez entrer votre date de naissance');
      return false;
    }

    // Vérifier que la date de naissance n'est pas dans le futur
    const birthDate = new Date(formData.birth_date);
    const today = new Date();
    if (birthDate > today) {
      toast.error('La date de naissance ne peut pas être dans le futur');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setStatus('loading');
    setErrorMessage('');

    try {
      let result;

      if (useClientAPI && isConfigured) {
        // Utiliser le service client ONECI
        result = await verifyIdentity(formData.oneci_number.trim(), {
          firstName: formData.first_name.trim(),
          lastName: formData.last_name.trim(),
          birthDate: formData.birth_date,
          gender: formData.gender || undefined,
          birthTown: formData.birth_town.trim() || undefined,
          birthCountry: formData.birth_country || undefined,
          nationality: formData.nationality || undefined,
          residenceAdr1: formData.residence_adr_1.trim() || undefined,
          residenceAdr2: formData.residence_adr_2.trim() || undefined,
          residenceTown: formData.residence_town.trim() || undefined,
        });

        if (result.isVerified) {
          // Sauvegarder le résultat dans la base de données
          const { error: dbError } = await supabase
            .from('identity_verifications')
            .upsert({
              user_id: userId,
              verification_type: 'oneci',
              verification_data: {
                oneci_number: formData.oneci_number.trim(),
                match_score: result.matchScore,
                raw_response: result.rawResponse,
                verified_at: new Date().toISOString(),
              },
              is_verified: true,
              verification_date: new Date().toISOString(),
            });

          if (dbError) {
            console.error('Error saving verification:', dbError);
          }

          // Mettre à jour le profil
          await supabase
            .from('profiles')
            .update({
              oneci_verified: true,
              oneci_number: formData.oneci_number.trim(),
              oneci_verification_date: new Date().toISOString(),
              oneci_data: result.rawResponse,
            })
            .eq('id', userId);

          setStatus('success');
          toast.success('Identité vérifiée avec succès !');
          onSuccess?.();
        } else {
          setStatus('error');
          setErrorMessage(
            `La vérification a échoué. Score de correspondance: ${Math.round(
              (result.matchScore || 0) * 100
            )}%. Vérifiez vos informations et réessayez.`
          );
        }
      } else {
        // Utiliser l'Edge Function (fallback)
        const { data, error } = await supabase.functions.invoke('oneci-verification', {
          body: {
            user_id: userId,
            oneci_number: formData.oneci_number.trim(),
            first_name: formData.first_name.trim(),
            last_name: formData.last_name.trim(),
            birth_date: formData.birth_date,
          },
        });

        if (error) throw error;

        if (data.verified) {
          setStatus('success');
          toast.success('Identité vérifiée avec succès !');
          onSuccess?.();
        } else {
          setStatus('error');
          setErrorMessage(data.message || 'La vérification a échoué. Vérifiez vos informations.');
        }
      }
    } catch (err) {
      console.error('ONECI verification error:', err);
      setStatus('error');
      setErrorMessage(
        error || 'Service temporairement indisponible. Réessayez plus tard.'
      );
    }
  };

  if (status === 'success') {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-green-700 mb-2">Identité vérifiée !</h3>
        <p className="text-green-600">
          Votre CNI a été vérifiée avec succès via ONECI
          {verificationResult?.matchScore && (
            <span className="block mt-1 text-sm">
              (Score de confiance: {Math.round(verificationResult.matchScore * 100)}%)
            </span>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Vérification ONECI</h3>
          <p className="text-sm text-muted-foreground">
            Vérifiez votre carte nationale d'identité
            {useClientAPI && isConfigured && (
              <span className="ml-2 text-xs bg-primary/10 px-2 py-0.5 rounded-full">
                API Direct
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Documentation importante pour l'utilisateur */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <Info className="w-4 h-4" />
          Informations importantes
        </h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>NNI</strong> = Numéro à 11 chiffres (ex: 11793253275)</li>
          <li>• <strong>N'utilisez PAS</strong> votre numéro de CNI qui commence par "CI"</li>
          <li>• Vos informations doivent correspondre <strong>exactement</strong> à celles de votre pièce d'identité</li>
          <li>• Les champs optionnels peuvent améliorer la correspondance</li>
        </ul>
      </div>

      {/* Affichage du quota de requêtes */}
      {showRemaining && remainingRequests !== null && remainingRequests >= 0 && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <p className="text-sm text-blue-700">
            Requêtes disponibles aujourd'hui: <strong>{remainingRequests}</strong>
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            NNI (Numéro National d'Identification) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={formData.oneci_number}
              onChange={(e) => setFormData({ ...formData, oneci_number: e.target.value.replace(/[^0-9]/g, '') })}
              className="pl-10"
              placeholder="Ex: 11793253275 (11 chiffres)"
              disabled={isVerifying}
              maxLength={11}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Numéro unique d'identification dans le registre national (11 chiffres, sans CI)
          </p>
          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            <span>Attention : N'utilisez PAS le numéro de votre carte CNI (CI...)</span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Prénom</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="pl-10"
                placeholder="Votre prénom"
                disabled={isVerifying}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Nom</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="pl-10"
                placeholder="Votre nom"
                disabled={isVerifying}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Date de naissance
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="date"
              value={formData.birth_date}
              onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
              className="pl-10"
              disabled={isVerifying}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Sexe
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, gender: 'M' })}
              className={`p-3 rounded-lg border-2 transition-all ${
                formData.gender === 'M'
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border hover:border-primary/50'
              }`}
              disabled={isVerifying}
            >
              Masculin
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, gender: 'F' })}
              className={`p-3 rounded-lg border-2 transition-all ${
                formData.gender === 'F'
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border hover:border-primary/50'
              }`}
              disabled={isVerifying}
            >
              Féminin
            </button>
          </div>
        </div>

        {/* Bouton pour afficher les champs optionnels */}
        <button
          type="button"
          onClick={() => setShowOptional(!showOptional)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
        >
          <span>{showOptional ? '−' : '+'}</span>
          <span>Champs optionnels (pour améliorer la correspondance)</span>
        </button>

        {/* Champs optionnels */}
        {showOptional && (
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">
              Ces champs peuvent aider à améliorer la correspondance avec la base ONECI
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Ville de naissance
                </label>
                <Input
                  value={formData.birth_town}
                  onChange={(e) => setFormData({ ...formData, birth_town: e.target.value })}
                  placeholder="Ex: ABIDJAN"
                  disabled={isVerifying}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Pays de naissance
                </label>
                <Input
                  value={formData.birth_country}
                  onChange={(e) => setFormData({ ...formData, birth_country: e.target.value.toUpperCase() })}
                  placeholder="CIV"
                  disabled={isVerifying}
                  maxLength={3}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Nationalité
              </label>
              <Input
                value={formData.nationality}
                onChange={(e) => setFormData({ ...formData, nationality: e.target.value.toUpperCase() })}
                placeholder="CIV"
                disabled={isVerifying}
                maxLength={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Code pays à 3 lettres (ex: CIV pour Côte d'Ivoire)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Adresse de résidence
              </label>
              <Input
                value={formData.residence_adr_1}
                onChange={(e) => setFormData({ ...formData, residence_adr_1: e.target.value })}
                placeholder="Ligne 1 (quartier, avenue...)"
                disabled={isVerifying}
              />
            </div>

            <div>
              <Input
                value={formData.residence_adr_2}
                onChange={(e) => setFormData({ ...formData, residence_adr_2: e.target.value })}
                placeholder="Ligne 2 (complément d'adresse...)"
                disabled={isVerifying}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Ville de résidence
              </label>
              <Input
                value={formData.residence_town}
                onChange={(e) => setFormData({ ...formData, residence_town: e.target.value })}
                placeholder="Ex: YAMOUSSOUKRO"
                disabled={isVerifying}
              />
            </div>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isVerifying}>
          {isVerifying ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Vérification en cours...
            </>
          ) : (
            'Vérifier mon identité'
          )}
        </Button>
      </form>

      <p className="text-xs text-muted-foreground text-center">
        Vos données sont transmises de manière sécurisée à l'ONECI pour vérification et ne sont
        utilisées qu'à cette fin.
      </p>
    </div>
  );
}
