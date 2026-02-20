/**
 * Formulaire de vérification d'identité ONECI
 *
 * Ce composant permet aux utilisateurs de saisir leurs informations personnelles
 * pour vérification auprès de l'Office National de l'État Civil (ONECI)
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { Loader2, AlertCircle, CheckCircle, User, Calendar, Fingerprint } from 'lucide-react';
import {
  verifyPersonAttributes,
  type OneciPersonMatchResponse,
  isValidNni,
} from '@/services/oneci';
import { apiKeysConfig } from '@/shared/config/api-keys.config';
import { cn } from '@/shared/lib/utils';

export interface OneciFormData {
  nni: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: 'M' | 'F';
}

export interface OneciVerificationSuccessData {
  result: OneciPersonMatchResponse;
  formData: OneciFormData;
}

export interface OneciVerificationFormProps {
  onSuccess?: (data: OneciVerificationSuccessData) => void;
  onError?: (error: string) => void;
  className?: string;
  initialData?: Partial<OneciFormData>;
  showFaceAuth?: boolean;
}

export function OneciVerificationForm({
  onSuccess,
  onError,
  className,
  initialData = {},
  showFaceAuth = false,
}: OneciVerificationFormProps) {
  const [formData, setFormData] = useState<OneciFormData>({
    nni: initialData.nni || '',
    firstName: initialData.firstName || '',
    lastName: initialData.lastName || '',
    birthDate: initialData.birthDate || '',
    gender: initialData.gender || 'M',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof OneciFormData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<OneciPersonMatchResponse | null>(null);

  const isOneciConfigured = apiKeysConfig.verification.oneci.isConfigured;

  // Validation des champs
  const validateField = (name: keyof OneciFormData, value: string): string | null => {
    if (!value?.trim()) {
      return 'Ce champ est requis';
    }

    switch (name) {
      case 'nni':
        if (!isValidNni(value)) {
          return 'NNI invalide (10-12 chiffres requis)';
        }
        break;
      case 'firstName':
      case 'lastName':
        if (value.trim().length < 2) {
          return 'Ce champ doit contenir au moins 2 caractères';
        }
        break;
      case 'birthDate': {
        const birthDate = new Date(value);
        const now = new Date();
        const minAgeDate = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate());
        if (birthDate > minAgeDate) {
          return 'Vous devez avoir au moins 18 ans';
        }
        if (birthDate > now) {
          return 'La date de naissance ne peut pas être dans le futur';
        }
        break;
      }
    }

    return null;
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof OneciFormData, string>> = {};

    (Object.keys(formData) as Array<keyof OneciFormData>).forEach((key) => {
      const error = validateField(key, formData[key]);
      if (error) {
        newErrors[key] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (name: keyof OneciFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Valider le champ lors de la saisie
    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error || undefined }));
  };

  const handleGenderChange = (gender: 'M' | 'F') => {
    setFormData((prev) => ({ ...prev, gender }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isOneciConfigured) {
      onError?.('Service ONECI non configuré. Veuillez contacter l\'administrateur.');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setVerificationResult(null);

    try {
      const result = await verifyPersonAttributes(
        formData.nni,
        formData.firstName,
        formData.lastName,
        formData.birthDate,
        formData.gender
      );

      setVerificationResult(result);

      if (result.success && result.match) {
        onSuccess?.({ result, formData });
      } else if (!result.success) {
        onError?.(result.error || result.message || 'Erreur lors de la vérification');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      onError?.(errorMessage);
      setErrors((prev) => ({ ...prev, form: errorMessage }));
    } finally {
      setLoading(false);
    }
  };

  if (!isOneciConfigured) {
    return (
      <Card className={cn('border-amber-200 bg-amber-50', className)}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3 text-amber-800">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Service non disponible</p>
              <p className="text-sm mt-1">Le service de vérification ONECI n'est pas configuré.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint className="h-5 w-5" />
          Vérification d'Identité ONECI
        </CardTitle>
        <CardDescription>
          Entrez vos informations personnelles pour vérifier votre identité auprès de l'Office National
          de l'État Civil.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* NNI */}
          <div className="space-y-2">
            <label htmlFor="nni" className="text-sm font-medium text-[#2C1810]">
              Numéro National d'Identification (NNI)
            </label>
            <Input
              id="nni"
              type="text"
              inputMode="numeric"
              placeholder="Ex: 123456789012"
              value={formData.nni}
              onChange={(e) => handleInputChange('nni', e.target.value)}
              className={errors.nni ? 'border-red-500' : ''}
              disabled={loading}
              maxLength={12}
            />
            {errors.nni && <p className="text-xs text-red-500">{errors.nni}</p>}
          </div>

          {/* Nom et Prénom */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="firstName" className="text-sm font-medium text-[#2C1810]">
                Prénom(s)
              </label>
              <Input
                id="firstName"
                type="text"
                placeholder="Votre prénom"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className={errors.firstName ? 'border-red-500' : ''}
                disabled={loading}
              />
              {errors.firstName && <p className="text-xs text-red-500">{errors.firstName}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="lastName" className="text-sm font-medium text-[#2C1810]">
                Nom
              </label>
              <Input
                id="lastName"
                type="text"
                placeholder="Votre nom"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                className={errors.lastName ? 'border-red-500' : ''}
                disabled={loading}
              />
              {errors.lastName && <p className="text-xs text-red-500">{errors.lastName}</p>}
            </div>
          </div>

          {/* Date de naissance */}
          <div className="space-y-2">
            <label htmlFor="birthDate" className="text-sm font-medium text-[#2C1810] flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Date de naissance
            </label>
            <Input
              id="birthDate"
              type="date"
              value={formData.birthDate}
              onChange={(e) => handleInputChange('birthDate', e.target.value)}
              className={errors.birthDate ? 'border-red-500' : ''}
              disabled={loading}
              max={new Date().toISOString().split('T')[0]}
            />
            {errors.birthDate && <p className="text-xs text-red-500">{errors.birthDate}</p>}
          </div>

          {/* Genre */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#2C1810] flex items-center gap-2">
              <User className="h-4 w-4" />
              Genre
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleGenderChange('M')}
                className={cn(
                  'flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all',
                  formData.gender === 'M'
                    ? 'border-[#F16522] bg-[#F16522]/10 text-[#F16522]'
                    : 'border-neutral-200 bg-white hover:border-neutral-300'
                )}
                disabled={loading}
              >
                <User className="h-5 w-5" />
                Masculin
              </button>
              <button
                type="button"
                onClick={() => handleGenderChange('F')}
                className={cn(
                  'flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all',
                  formData.gender === 'F'
                    ? 'border-[#F16522] bg-[#F16522]/10 text-[#F16522]'
                    : 'border-neutral-200 bg-white hover:border-neutral-300'
                )}
                disabled={loading}
              >
                <User className="h-5 w-5" />
                Féminin
              </button>
            </div>
          </div>

          {/* Bouton de soumission */}
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Vérification en cours...
              </>
            ) : (
              <>
                <Fingerprint className="mr-2 h-4 w-4" />
                Vérifier mon identité
              </>
            )}
          </Button>

          {/* Message d'erreur global */}
          {errors.form && (
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{errors.form}</p>
            </div>
          )}

          {/* Résultat de la vérification */}
          {verificationResult && (
            <OneciVerificationResult result={verificationResult} showFaceAuth={showFaceAuth} />
          )}
        </form>
      </CardContent>
    </Card>
  );
}

/**
 * Composant d'affichage du résultat de vérification
 */
interface OneciVerificationResultProps {
  result: OneciPersonMatchResponse;
}

function OneciVerificationResult({ result }: OneciVerificationResultProps) {
  if (!result.success) {
    return (
      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-red-800">Vérification échouée</p>
          <p className="text-sm text-red-600 mt-1">{result.message}</p>
        </div>
      </div>
    );
  }

  if (!result.match) {
    return (
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-amber-800">Informations non correspondantes</p>
          <p className="text-sm text-amber-600 mt-1">
            Les informations saisies ne correspondent pas aux registres ONECI. Veuillez vérifier vos
            données.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-medium text-green-800">Identité vérifiée avec succès</p>
        <p className="text-sm text-green-600 mt-1">
          Vos informations correspondent aux registres de l'Office National de l'État Civil.
          {result.confidence && ` Confiance: ${Math.round(result.confidence * 100)}%`}
        </p>

        {result.person && (
          <div className="mt-3 p-3 bg-white rounded-lg border border-green-100">
            <p className="text-xs font-medium text-neutral-600 mb-2">Informations ONECI:</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-neutral-500">NNI:</span>{' '}
                <span className="font-medium">{result.person.nni}</span>
              </div>
              <div>
                <span className="text-neutral-500">Nom:</span>{' '}
                <span className="font-medium">
                  {result.person.firstName} {result.person.lastName}
                </span>
              </div>
              <div>
                <span className="text-neutral-500">Né(e) le:</span>{' '}
                <span className="font-medium">
                  {new Date(result.person.birthDate).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <div>
                <span className="text-neutral-500">Sexe:</span>{' '}
                <span className="font-medium">{result.person.gender === 'M' ? 'Masculin' : 'Féminin'}</span>
              </div>
              {result.person.birthPlace && (
                <div>
                  <span className="text-neutral-500">Lieu de naissance:</span>{' '}
                  <span className="font-medium">{result.person.birthPlace}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
