/**
 * Formulaire de vérification d'identité ONECI
 *
 * Ce composant permet aux utilisateurs de saisir leurs informations personnelles
 * pour vérification auprès de l'Office National de l'État Civil (ONECI)
 */

import { useState } from 'react';
import type { OneciAttributeMatch } from '@/services/oneci/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Loader2, AlertCircle, CheckCircle, User, Fingerprint } from 'lucide-react';
import {
  verifyPersonAttributes,
  type OneciPersonMatchResponse,
  isValidNni,
} from '@/services/oneci';
import { apiKeysConfig } from '@/shared/config/api-keys.config';
import { cn } from '@/shared/lib/utils';
import { SimpleInput } from './SimpleInput';

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
}

export function OneciVerificationForm({
  onSuccess,
  onError,
  className,
  initialData = {},
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

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint className="h-5 w-5" />
          Vérification d'Identité ONECI
        </CardTitle>
        <CardDescription>
          Entrez vos informations personnelles pour vérifier votre identité auprès de l'Office
          National de l'État Civil.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* NNI */}
          <div className="space-y-2">
            <SimpleInput
              id="nni"
              label="Numéro National d'Identification (NNI)"
              type="text"
              inputMode="numeric"
              placeholder="Ex: 123456789012"
              value={formData.nni}
              onChange={(e) => handleInputChange('nni', e.target.value)}
              error={!!errors.nni}
              maxLength={12}
              disabled={loading}
            />
            {errors.nni && <p className="text-xs text-red-500">{errors.nni}</p>}
          </div>

          {/* Nom et Prénom */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <SimpleInput
                id="firstName"
                label="Prénom(s)"
                type="text"
                placeholder="Votre prénom"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                error={!!errors.firstName}
                disabled={loading}
              />
              {errors.firstName && <p className="text-xs text-red-500">{errors.firstName}</p>}
            </div>

            <div className="space-y-2">
              <SimpleInput
                id="lastName"
                label="Nom"
                type="text"
                placeholder="Votre nom"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                error={!!errors.lastName}
                disabled={loading}
              />
              {errors.lastName && <p className="text-xs text-red-500">{errors.lastName}</p>}
            </div>
          </div>

          {/* Date de naissance */}
          <div className="space-y-2">
            <SimpleInput
              id="birthDate"
              label="Date de naissance"
              type="date"
              value={formData.birthDate}
              onChange={(e) => handleInputChange('birthDate', e.target.value)}
              error={!!errors.birthDate}
              disabled={loading}
              max={new Date().toISOString().split('T')[0]}
            />
            {errors.birthDate && <p className="text-xs text-red-500">{errors.birthDate}</p>}
          </div>

          {/* Genre */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#2C1810] mb-3 flex items-center gap-2">
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
            <OneciVerificationResult result={verificationResult} />
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

  // Détermine si c'est un succès partiel ou complet
  const isPartialMatch = result.attributes && result.attributes.some((a) => a.ErrorCode !== '0');

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 border rounded-xl',
        result.match && !isPartialMatch
          ? 'bg-green-50 border-green-200'
          : 'bg-amber-50 border-amber-200'
      )}
    >
      {result.match && !isPartialMatch ? (
        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
      ) : (
        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
      )}
      <div className="flex-1">
        <p
          className={cn(
            'font-medium',
            result.match && !isPartialMatch ? 'text-green-800' : 'text-amber-800'
          )}
        >
          {result.match && !isPartialMatch
            ? 'Identité vérifiée avec succès'
            : isPartialMatch
              ? 'Correspondance partielle'
              : 'Informations non correspondantes'}
        </p>
        <p className="text-sm mt-1 text-neutral-600">{result.message}</p>

        {/* Affichage détaillé par attribut */}
        {result.attributes && result.attributes.length > 0 && (
          <div className="mt-3 p-3 bg-white rounded-lg border border-neutral-100">
            <p className="text-xs font-medium text-neutral-600 mb-2">
              Détails de la vérification:
            </p>
            <div className="space-y-1">
              {result.attributes.map((attr) => (
                <OneciAttributeItem key={attr.AttributeName} attribute={attr} />
              ))}
            </div>
          </div>
        )}

        {/* Informations de la personne si disponibles */}
        {result.person && (
          <div className="mt-3 p-3 bg-white rounded-lg border border-neutral-100">
            <p className="text-xs font-medium text-neutral-600 mb-2">
              Informations ONECI:
            </p>
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
                <span className="font-medium">
                  {result.person.gender === 'M' ? 'Masculin' : 'Féminin'}
                </span>
              </div>
            </div>
          </div>
        )}

        {result.confidence !== undefined && (
          <p className="text-sm mt-2 text-neutral-600">
            Confiance: {Math.round(result.confidence)}%
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Composant pour afficher un attribut avec son statut de correspondance
 */
interface OneciAttributeItemProps {
  attribute: OneciAttributeMatch;
}

function OneciAttributeItem({ attribute }: OneciAttributeItemProps) {
  const isMatch = attribute.ErrorCode === '0';

  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded-md bg-neutral-50">
      <span className="text-sm text-neutral-700">{getAttributeLabel(attribute.AttributeName)}</span>
      <div className="flex items-center gap-1.5">
        {isMatch ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <AlertCircle className="h-4 w-4 text-red-500" />
        )}
        <span
          className={cn('text-xs font-medium', isMatch ? 'text-green-700' : 'text-red-700')}
        >
          {isMatch ? 'Correspond' : 'Non correspondant'}
        </span>
      </div>
    </div>
  );
}

/**
 * Convertit le nom d'attribut API en libellé lisible
 */
function getAttributeLabel(attributeName: string): string {
  const labels: Record<string, string> = {
    FIRST_NAME: 'Prénom',
    LAST_NAME: 'Nom',
    BIRTH_DATE: 'Date de naissance',
    GENDER: 'Genre',
  };
  return labels[attributeName] || attributeName;
}
