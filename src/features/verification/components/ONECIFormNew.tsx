/**
 * Formulaire de vérification ONECI avec support de la nouvelle logique
 *
 * Ce composant permet:
 * 1. La vérification des informations (NNI, nom, prénom, date de naissance, sexe)
 * 2. L'affichage détaillé des résultats par attribut
 * 3. L'authentification faciale (optionnel)
 *
 * Flux:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  1. Utilisateur remplit le formulaire                           │
 * │  2. Vérification des informations via ONECI                     │
 * │  3. Affichage des résultats par attribut (✅/❌)                 │
 * │  4. Optionnel: Authentification faciale                         │
 * └─────────────────────────────────────────────────────────────────┘
 */

import { useState } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import {
  CreditCard,
  User,
  Calendar,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Camera,
  Fingerprint,
} from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import { toast } from 'sonner';
import type { AttributeVerificationResult } from '@/services/oneci/types';

interface ONECIFormProps {
  userId: string;
  onSuccess?: () => void;
}

type VerificationStatus = 'idle' | 'loading' | 'success' | 'error' | 'partial';

interface FormData {
  nni: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  gender: 'M' | 'F' | '';
}

export default function ONECIFormNew({ userId, onSuccess }: ONECIFormProps) {
  const { refreshProfile } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    nni: '',
    first_name: '',
    last_name: '',
    birth_date: '',
    gender: '',
  });
  const [status, setStatus] = useState<VerificationStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [attributeResults, setAttributeResults] = useState<AttributeVerificationResult[]>([]);
  const [showFaceAuth, setShowFaceAuth] = useState(false);
  const [faceAuthLoading, setFaceAuthLoading] = useState(false);
  const [faceAuthSuccess, setFaceAuthSuccess] = useState<boolean | null>(null);

  // Validation du formulaire
  const validateForm = (): boolean => {
    // NNI: exactement 11 chiffres
    const normalizedNni = formData.nni.replace(/[\s-]/g, '');
    if (!/^\d{11}$/.test(normalizedNni)) {
      toast.error('Le NNI doit contenir exactement 11 chiffres');
      return false;
    }

    // Nom et prénom
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      toast.error('Veuillez entrer votre nom et prénom');
      return false;
    }

    // Date de naissance
    if (!formData.birth_date || !/^\d{4}-\d{2}-\d{2}$/.test(formData.birth_date)) {
      toast.error('Format de date inval. Utilisez YYYY-MM-DD');
      return false;
    }

    // Sexe
    if (!['M', 'F'].includes(formData.gender)) {
      toast.error('Veuillez sélectionner votre sexe');
      return false;
    }

    return true;
  };

  // Soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setStatus('loading');
    setErrorMessage('');
    setAttributeResults([]);

    try {
      const { data, error } = await supabase.functions.invoke('oneci-verify', {
        body: {
          action: 'verify',
          user_id: userId,
          nni: formData.nni.replace(/[\s-]/g, ''),
          firstName: formData.first_name.trim().toUpperCase(),
          lastName: formData.last_name.trim().toUpperCase(),
          birthDate: formData.birth_date,
          gender: formData.gender,
        },
      });

      if (error) throw error;

      // Stocker les résultats des attributs
      if (data.attributeResults) {
        setAttributeResults(data.attributeResults);
      }

      if (data.match) {
        setStatus('success');
        toast.success('Identité vérifiée avec succès !');
        await refreshProfile();
        onSuccess?.();
      } else if (data.attributeResults && data.attributeResults.length > 0) {
        // Correspondance partielle
        setStatus('partial');
        setShowFaceAuth(true);
        toast.warning('Vérification partielle - Certains attributs ne correspondent pas');
      } else {
        setStatus('error');
        setErrorMessage(data.message || 'La vérification a échoué. Vérifiez vos informations.');
      }
    } catch (err) {
      console.error('ONECI verification error:', err);
      setStatus('error');
      setErrorMessage('Service temporairement indisponible. Réessayez plus tard.');
    }
  };

  // Authentification faciale
  const handleFaceAuth = async (imageBase64: string) => {
    setFaceAuthLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('oneci-verify', {
        body: {
          action: 'face-auth',
          nni: formData.nni.replace(/[\s-]/g, ''),
          faceImage: imageBase64,
        },
      });

      if (error) throw error;

      setFaceAuthSuccess(data.authenticated);

      if (data.authenticated) {
        toast.success('Authentification faciale réussie !');
        setStatus('success');
        await refreshProfile();
        onSuccess?.();
      } else {
        toast.error('Visage non reconnu');
      }
    } catch (err) {
      console.error('Face auth error:', err);
      toast.error("Erreur lors de l'authentification faciale");
      setFaceAuthSuccess(false);
    } finally {
      setFaceAuthLoading(false);
    }
  };

  // Capture d'image pour auth faciale
  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convertir en base64 sans le préfixe
    const reader = new FileReader();
    reader.onload = async () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || '';
      await handleFaceAuth(base64);
    };
    reader.readAsDataURL(file);
  };

  // État de succès complet
  if (status === 'success') {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-green-700 mb-2">Identité vérifiée !</h3>
        <p className="text-green-600">Votre CNI a été vérifiée avec succès via ONECI.</p>
        {attributeResults.length > 0 && (
          <div className="mt-4 p-4 bg-green-50 rounded-lg">
            <h4 className="font-medium text-green-800 mb-2">Détails de la vérification</h4>
            <div className="space-y-1">
              {attributeResults.map((attr) => (
                <div key={attr.name} className="flex items-center gap-2 text-sm">
                  {attr.matched ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className="text-gray-700">{attr.label}:</span>
                  <span className={attr.matched ? 'text-green-600' : 'text-red-600'}>
                    {attr.matched ? 'Correspond' : 'Ne correspond pas'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Vérification ONECI</h3>
          <p className="text-sm text-muted-foreground">
            Vérifiez votre carte nationale d'identité ivoirienne
          </p>
        </div>
      </div>

      {/* Message d'erreur */}
      {status === 'error' && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      )}

      {/* Résultats partiels */}
      {attributeResults.length > 0 && status === 'partial' && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h4 className="font-medium text-amber-800 mb-2">Résultats de la vérification</h4>
          <div className="space-y-2">
            {attributeResults.map((attr) => (
              <div key={attr.name} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{attr.label}</span>
                <div className="flex items-center gap-1">
                  {attr.matched ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-600">Correspond</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span className="text-sm text-red-600">Ne correspond pas</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* NNI */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Numéro National d'Identification (NNI)
          </label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={formData.nni}
              onChange={(e) => setFormData({ ...formData, nni: e.target.value })}
              className="pl-10"
              placeholder="12004091753"
              disabled={status === 'loading'}
              maxLength={11}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">11 chiffres exactement</p>
        </div>

        {/* Nom et Prénom */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Prénom</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="pl-10"
                placeholder="ABOA"
                disabled={status === 'loading'}
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
                placeholder="AKOUN BERNARD"
                disabled={status === 'loading'}
              />
            </div>
          </div>
        </div>

        {/* Date de naissance */}
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
              disabled={status === 'loading'}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Format: YYYY-MM-DD (ex: 2000-12-31)</p>
        </div>

        {/* Sexe */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Sexe</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="gender"
                value="M"
                checked={formData.gender === 'M'}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'M' })}
                disabled={status === 'loading'}
                className="w-4 h-4 text-primary"
              />
              <span className="text-sm">Masculin</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="gender"
                value="F"
                checked={formData.gender === 'F'}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'F' })}
                disabled={status === 'loading'}
                className="w-4 h-4 text-primary"
              />
              <span className="text-sm">Féminin</span>
            </label>
          </div>
        </div>

        {/* Bouton de soumission */}
        <Button type="submit" className="w-full" disabled={status === 'loading'}>
          {status === 'loading' ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Vérification en cours...
            </>
          ) : (
            'Vérifier mon identité'
          )}
        </Button>
      </form>

      {/* Authentification faciale (optionnel) */}
      {showFaceAuth && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Fingerprint className="w-5 h-5 text-blue-600" />
            <h4 className="font-medium text-blue-800">Authentification faciale</h4>
          </div>
          <p className="text-sm text-blue-700 mb-4">
            Certains attributs ne correspondent pas. Vous pouvez compléter la vérification avec une
            authentification faciale.
          </p>

          {faceAuthSuccess === null ? (
            <label className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors">
              <Camera className="w-5 h-5" />
              <span>{faceAuthLoading ? 'Vérification...' : 'Prendre une photo'}</span>
              <input
                type="file"
                accept="image/*"
                capture="user"
                onChange={handleImageCapture}
                disabled={faceAuthLoading}
                className="hidden"
              />
            </label>
          ) : (
            <div
              className={`flex items-center gap-2 ${faceAuthSuccess ? 'text-green-600' : 'text-red-600'}`}
            >
              {faceAuthSuccess ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              <span>{faceAuthSuccess ? 'Authentification réussie' : 'Visage non reconnu'}</span>
            </div>
          )}
        </div>
      )}

      {/* Note de confidentialité */}
      <p className="text-xs text-muted-foreground text-center">
        Vos données sont traitées de manière sécurisée et ne sont utilisées que pour la
        vérification.
      </p>
    </div>
  );
}
