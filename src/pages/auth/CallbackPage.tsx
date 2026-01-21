import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { Loader } from 'lucide-react';

export default function AuthCallback() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const errorParam = hashParams.get('error');
      const errorDescription = hashParams.get('error_description');

      if (errorParam) {
        setError(errorDescription || "Erreur lors de l'authentification");
        setTimeout(() => {
          navigate('/connexion');
        }, 3000);
        return;
      }

      if (user && !loading) {
        // Vérifier si c'est un nouvel utilisateur nécessitant la sélection de rôle
        const needsProfileCompletion = sessionStorage.getItem('needsProfileCompletion');

        if (needsProfileCompletion === 'true') {
          sessionStorage.removeItem('needsProfileCompletion');
          navigate('/choix-profil');
          return;
        }

        // Vérifier si le profil a un user_type défini
        // Si oui, DashboardRouter redirigera vers le bon dashboard
        // Si non, l'utilisateur doit choisir son rôle
        if (profile?.user_type) {
          console.log('[CallbackPage] user_type trouvé:', profile.user_type, '-> /dashboard');
          navigate('/dashboard');
          return;
        }

        // Pas de user_type -> rediriger vers choix de profil
        console.log('[CallbackPage] Pas de user_type -> /choix-profil');
        navigate('/choix-profil');
      }
    };

    if (!loading) {
      const timer = setTimeout(() => {
        handleCallback();
      }, 1000);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [user, profile, loading, navigate]);

  return (
    <div className="min-h-screen bg-warm-50 flex items-center justify-center">
      <div className="text-center">
        {error ? (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-3xl">❌</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Erreur</h2>
            <p className="text-gray-600">{error}</p>
            <p className="text-sm text-gray-500">Redirection vers la page de connexion...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Loader className="w-16 h-16 text-terracotta-600 mx-auto animate-spin" />
            <h2 className="text-2xl font-bold text-gray-900">Connexion en cours...</h2>
            <p className="text-gray-600">Veuillez patienter</p>
          </div>
        )}
      </div>
    </div>
  );
}
