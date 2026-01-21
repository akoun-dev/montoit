/**
 * OneCiVerificationForm - Formulaire de vérification ONECI complet
 *
 * Permet à l'utilisateur de choisir entre deux méthodes de vérification :
 * 1. Vérification par attributs (nom, prénom, date de naissance)
 * 2. Authentification faciale
 */

import { useState } from 'react';
import { FileText, Camera, ArrowLeft } from 'lucide-react';
import ONECIFormClient from './ONECIFormClient';
import { OneCiFaceAuth } from './OneCiFaceAuth';

type VerificationMethod = 'choice' | 'attributes' | 'face';

interface OneCiVerificationFormProps {
  userId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  defaultMethod?: 'attributes' | 'face';
}

export function OneCiVerificationForm({
  userId,
  onSuccess,
  onCancel,
  defaultMethod,
}: OneCiVerificationFormProps) {
  const [method, setMethod] = useState<VerificationMethod>(
    defaultMethod || 'choice'
  );

  // Si une méthode par défaut est spécifiée, directement l'afficher
  if (method === 'attributes') {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setMethod('choice')}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Retour</span>
        </button>
        <ONECIFormClient userId={userId} onSuccess={onSuccess} />
      </div>
    );
  }

  if (method === 'face') {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setMethod('choice')}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Retour</span>
        </button>
        <OneCiFaceAuth userId={userId} onAuthSuccess={onSuccess} onAuthCancel={onCancel} />
      </div>
    );
  }

  // Étape: Choix de la méthode
  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 mb-2">
          <FileText className="w-10 h-10 text-primary" />
        </div>
        <h3 className="font-bold text-2xl">Choisissez votre méthode de vérification</h3>
        <p className="text-base text-muted-foreground max-w-lg mx-auto">
          Sélectionnez la méthode que vous préférez pour vérifier votre identité auprès de l'ONECI
        </p>
      </div>

      {/* Cartes de choix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* Carte: Vérification par attributs */}
        <button
          type="button"
          onClick={() => setMethod('attributes')}
          className="group relative p-8 bg-gradient-to-br from-card to-card/50 border-2 border-border hover:border-primary hover:shadow-xl hover:shadow-primary/10 rounded-2xl transition-all duration-300 text-left"
        >
          <div className="absolute top-4 right-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
              Recommandé
            </span>
          </div>

          <div className="flex flex-col space-y-5">
            {/* Icône large */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 group-hover:scale-110 transition-transform duration-300 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <FileText className="w-10 h-10 text-white" />
            </div>

            {/* Contenu */}
            <div>
              <h4 className="font-bold text-lg mb-2">Vérification par attributs</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Entrez vos informations personnelles figurant sur votre CNI (nom, prénom, date de naissance)
              </p>
            </div>

            {/* Avantages */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600">✓</span>
                </div>
                <span className="text-muted-foreground">Rapide et simple</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600">✓</span>
                </div>
                <span className="text-muted-foreground">Pas besoin de caméra</span>
              </div>
            </div>

            {/* Bouton */}
            <div className="pt-2">
              <span className="inline-flex items-center text-sm font-medium text-primary group-hover:gap-2 transition-all">
                Choisir cette méthode
                <FileText className="w-4 h-4 ml-2" />
              </span>
            </div>
          </div>
        </button>

        {/* Carte: Authentification faciale */}
        <button
          type="button"
          onClick={() => setMethod('face')}
          className="group relative p-8 bg-gradient-to-br from-card to-card/50 border-2 border-border hover:border-primary hover:shadow-xl hover:shadow-primary/10 rounded-2xl transition-all duration-300 text-left"
        >
          <div className="absolute top-4 right-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
              Biométrie
            </span>
          </div>

          <div className="flex flex-col space-y-5">
            {/* Icône large */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 group-hover:scale-110 transition-transform duration-300 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Camera className="w-10 h-10 text-white" />
            </div>

            {/* Contenu */}
            <div>
              <h4 className="font-bold text-lg mb-2">Authentification faciale</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Utilisez la reconnaissance faciale pour vérifier votre identité de manière sécurisée
              </p>
            </div>

            {/* Avantages */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600">✓</span>
                </div>
                <span className="text-muted-foreground">Haute sécurité</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600">✓</span>
                </div>
                <span className="text-muted-foreground">Vérification biométrique</span>
              </div>
            </div>

            {/* Bouton */}
            <div className="pt-2">
              <span className="inline-flex items-center text-sm font-medium text-primary group-hover:gap-2 transition-all">
                Choisir cette méthode
                <Camera className="w-4 h-4 ml-2" />
              </span>
            </div>
          </div>
        </button>
      </div>

      {/* Pied de page */}
      <div className="text-center space-y-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            Annuler et retourner au profil
          </button>
        )}

        <p className="text-sm text-muted-foreground">
          🔒 Toutes les données sont transmises de manière sécurisée et chiffrée à l'ONECI
        </p>
      </div>
    </div>
  );
}

export default OneCiVerificationForm;
