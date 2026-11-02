/**
 * useProfileGuard - Hook pour rediriger vers la page de complétion de profil
 * si le profil n'est pas complet
 */

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';

const EXCLUDED_PATHS = [
  '/completer-profil',
  '/connexion',
  '/inscription',
  '/auth',
  '/auth/callback',
  '/mot-de-passe-oublie',
];

export function useProfileGuard() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Ne rien faire pendant le chargement
    if (loading) return;

    // Ne rien faire si pas d'utilisateur
    if (!user) return;

    // Ne pas rediriger si on est sur une page exclue
    if (EXCLUDED_PATHS.some((path) => location.pathname.startsWith(path))) return;

    // Vérifier si le profil existe et est complet
    const needsCompletion = profile && profile.profile_setup_completed === false;

    if (needsCompletion) {
      navigate('/completer-profil', { replace: true });
    }
  }, [user, profile, loading, navigate, location.pathname]);

  return {
    needsProfileCompletion: profile?.profile_setup_completed === false,
    isLoading: loading,
  };
}
