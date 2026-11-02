import { X, LogIn, UserPlus, Shield } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
  action?: string; // Reserved for future use
}

export default function AuthModal({ isOpen, onClose, message }: AuthModalProps) {
  if (!isOpen) return null;

  const defaultMessage = 'Pour accéder à cette fonctionnalité, vous devez être connecté';
  const displayMessage = message || defaultMessage;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-scale-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-xl transition-colors"
          aria-label="Fermer"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>

        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-terracotta-500 to-coral-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-glow">
            <Shield className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Connexion requise</h2>
          <p className="text-gray-600 leading-relaxed">{displayMessage}</p>
        </div>

        <div className="space-y-3">
          <a
            href="/auth"
            className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-terracotta-600 to-coral-600 text-white rounded-xl hover:from-terracotta-700 hover:to-coral-700 transition-all hover:scale-105 shadow-lg font-bold"
          >
            <LogIn className="h-5 w-5" />
            <span>Se connecter</span>
          </a>

          <a
            href="/auth"
            className="w-full flex items-center justify-center space-x-2 px-6 py-3 border-2 border-terracotta-600 text-terracotta-600 rounded-xl hover:bg-terracotta-50 transition-all font-bold"
          >
            <UserPlus className="h-5 w-5" />
            <span>Créer un compte</span>
          </a>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          100% gratuit • Vérification sécurisée
        </p>
      </div>
    </div>
  );
}
