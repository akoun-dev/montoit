/**
 * ProfileCompletionPage - Redirection vers le flux d'onboarding guidé
 * MON-019: Redirige vers le nouveau flux d'onboarding en 3 étapes
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';

export default function ProfileCompletionPage() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();

  // Rediriger vers le nouveau flux d'onboarding
  useEffect(() => {
    if (!authLoading && user) {
      // Vérifier si l'utilisateur a déjà complété l'onboarding
      if (profile?.submitted_to_tc || profile?.profile_setup_completed) {
        // L'utilisateur a déjà complété l'onboarding, rediriger selon le rôle
        const userType = profile?.user_type || 'tenant';
        const redirectPath =
          userType === 'tenant'
            ? '/recherche'
            : userType === 'owner'
              ? '/proprietaire/ajouter-propriete'
              : '/dashboard';
        navigate(redirectPath, { replace: true });
      } else {
        // Rediriger vers le nouveau flux d'onboarding
        navigate('/auth/onboarding', { replace: true });
      }
    }
  }, [user, profile, authLoading, navigate]);

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

  // Pendant la redirection, afficher un loader
  return (
    <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-[#F16522] mx-auto" />
        <p className="text-[#A69B95]">Préparation de votre onboarding...</p>
      </div>
    </div>
  );
}
