import { AlertCircle, RefreshCw, LogOut, Mail } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';

export default function ProfileErrorDisplay() {
  const { profileError, refreshProfile, signOut, clearProfileError } = useAuth();

  if (!profileError) return null;

  const getErrorIcon = () => {
    switch (profileError.type) {
      case 'network':
        return <AlertCircle className="h-12 w-12 text-red-500" />;
      case 'permission':
        return <AlertCircle className="h-12 w-12 text-amber-500" />;
      case 'not_found':
        return <AlertCircle className="h-12 w-12 text-blue-500" />;
      default:
        return <AlertCircle className="h-12 w-12 text-gray-500" />;
    }
  };

  const getErrorTitle = () => {
    switch (profileError.type) {
      case 'network':
        return 'Connexion à la base de données impossible';
      case 'permission':
        return 'Problème de permissions résolu';
      case 'not_found':
        return 'Profil introuvable';
      default:
        return 'Une erreur est survenue';
    }
  };

  const getErrorDescription = () => {
    switch (profileError.type) {
      case 'network':
        return 'Nous ne pouvons pas nous connecter à la base de données. Veuillez vérifier votre connexion Internet et réessayer.';
      case 'permission':
        return 'Votre profil a été récupéré avec succès. Veuillez rafraîchir la page pour continuer.';
      case 'not_found':
        return 'Votre profil utilisateur semble manquant. Cela peut arriver lors de la création de compte. Nous pouvons tenter de le récupérer automatiquement.';
      default:
        return "Une erreur inattendue s'est produite lors du chargement de votre profil.";
    }
  };

  const handleRetry = async () => {
    clearProfileError();
    await refreshProfile();
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/connexion';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-terracotta-50 via-coral-50 to-amber-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <div className="flex justify-center">{getErrorIcon()}</div>

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">{getErrorTitle()}</h2>
          <p className="text-gray-600">{getErrorDescription()}</p>
        </div>

        {profileError.details && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Détails techniques:</span>
              <br />
              {profileError.details}
            </p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleRetry}
            className="w-full flex items-center justify-center space-x-2 bg-terracotta-500 text-white px-6 py-3 rounded-xl hover:bg-terracotta-600 transition-colors font-medium"
          >
            <RefreshCw className="h-5 w-5" />
            <span>Réessayer</span>
          </button>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center space-x-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-200 transition-colors font-medium"
          >
            <LogOut className="h-5 w-5" />
            <span>Se déconnecter</span>
          </button>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">Besoin d'aide ? Contactez-nous</p>
            <a
              href="mailto:support@montoit.ci"
              className="inline-flex items-center space-x-2 text-terracotta-600 hover:text-terracotta-700 font-medium text-sm"
            >
              <Mail className="h-4 w-4" />
              <span>support@montoit.ci</span>
            </a>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">Code d'erreur: {profileError.type.toUpperCase()}</p>
        </div>
      </div>
    </div>
  );
}
