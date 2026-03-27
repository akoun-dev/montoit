/**
 * OnboardingWrapper - Wrapper qui affiche le modal d'onboarding
 * tant que le profil n'est pas completé
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import OnboardingModal from '@/features/onboarding/OnboardingModal';

// Routes où le modal d'onboarding ne doit PAS s'afficher
const EXCLUDED_ROUTES = [
  '/connexion',
  '/inscription',
  '/login',
  '/auth',
  '/auth/callback',
  '/auth/onboarding',
  '/choix-profil',
  '/completer-profil',
];

/**
 * Vérifie si l'onboarding est nécessaire
 */
async function needsOnboarding(profile: any, userId?: string): Promise<boolean> {
  console.log('[OnboardingWrapper] needsOnboarding called with profile:', profile);

  if (!profile) {
    console.log('[OnboardingWrapper] needsOnboarding: no profile');
    return false;
  }

  // PRIORITÉ: Si déjà soumis au TC, pas besoin d'onboarding
  if (profile.submitted_to_tc === true) {
    console.log('[OnboardingWrapper] needsOnboarding: NO - already submitted to TC');
    return false;
  }

  // PRIORITÉ: Si le profil a un dossier de certification en cours ou approuvé, pas d'onboarding
  if (profile.verification_status === 'pending' ||
      profile.verification_status === 'in_review' ||
      profile.verification_status === 'approved') {
    console.log('[OnboardingWrapper] needsOnboarding: NO - verification in progress or approved');
    return false;
  }

  // PRIORITÉ: Si profile_setup_completed est explicitement true, pas d'onboarding
  if (profile.profile_setup_completed === true) {
    console.log('[OnboardingWrapper] needsOnboarding: NO - profile_setup_completed is true');
    return false;
  }

  // Vérifier si l'utilisateur a déjà une application de dossier (pour éviter de montrer l'onboarding si déjà commencé)
  if (userId) {
    try {
      const { data: applications } = await supabase
        .from('verification_applications')
        .select('id, status, submitted_at')
        .eq('user_id', userId)
        .eq('dossier_type', 'tenant')
        .order('created_at', { ascending: false })
        .limit(1);

      if (applications && applications.length > 0) {
        const app = applications[0];
        // Si le dossier a été soumis (submitted_at différent de created_at) ou a des documents
        if (app.submitted_at && app.submitted_at !== app.created_at) {
          console.log('[OnboardingWrapper] needsOnboarding: NO - dossier already submitted');
          // Marquer le profil comme complété pour éviter les vérifications futures
          await supabase
            .from('profiles')
            .update({ profile_setup_completed: true, submitted_to_tc: true } as any)
            .eq('id', userId);
          return false;
        }
      }
    } catch (error) {
      console.error('[OnboardingWrapper] Error checking verification applications:', error);
    }
  }

  // Si profile_setup_completed est explicitement false, onboarding est nécessaire
  // MAIS seulement si pas encore soumis au TC
  if (profile.profile_setup_completed === false) {
    console.log('[OnboardingWrapper] needsOnboarding: YES - profile_setup_completed is false');
    return true;
  }

  // Vérifier les critères d'onboarding
  const hasBasicProfile = profile.full_name && profile.full_name.trim() !== '';
  const hasPhone = profile.phone && profile.phone.trim() !== '';

  console.log('[OnboardingWrapper] hasBasicProfile:', hasBasicProfile, 'hasPhone:', hasPhone);

  // Si aucune info de base, onboarding nécessaire
  if (!hasBasicProfile || !hasPhone) {
    console.log('[OnboardingWrapper] needsOnboarding: YES - missing basic info');
    return true;
  }

  console.log('[OnboardingWrapper] needsOnboarding: NO - profile is complete');
  return false;
}

export default function OnboardingWrapper({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const location = useLocation();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasCheckedOnboarding, setHasCheckedOnboarding] = useState(false);
  const [userManuallyClosed, setUserManuallyClosed] = useState(false);

  // Vérifier si la route actuelle est exclue
  const isExcludedRoute = EXCLUDED_ROUTES.some(route =>
    location.pathname === route || location.pathname.startsWith(route + '/')
  );

  // Log au montage du composant
  console.log('[OnboardingWrapper] Component mounted');
  console.log('[OnboardingWrapper] Current state:', {
    pathname: location.pathname,
    isExcludedRoute,
    hasUser: !!user,
    hasProfile: !!profile,
    profile: profile,
    showOnboarding,
    hasCheckedOnboarding,
  });

  useEffect(() => {
    // Ne vérifier l'onboarding que si l'utilisateur est connecté
    // et pas sur une route exclue
    console.log('[OnboardingWrapper] useEffect - user:', !!user, 'profile:', !!profile, 'isExcludedRoute:', isExcludedRoute, 'pathname:', location.pathname);

    if (!user || isExcludedRoute) {
      console.log('[OnboardingWrapper] useEffect - skipping (no user or excluded route)');
      return;
    }

    // Attendre un peu que le profil soit chargé
    const timer = setTimeout(async () => {
      console.log('[OnboardingWrapper] setTimeout - profile:', profile);
      if (profile && await needsOnboarding(profile, user.id)) {
        console.log('[OnboardingWrapper] setTimeout - SHOWING modal');
        setShowOnboarding(true);
      } else {
        console.log('[OnboardingWrapper] setTimeout - NOT showing modal');
      }
      setHasCheckedOnboarding(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [user, profile, isExcludedRoute]);

  // Mettre à jour l'état si le profil change
  useEffect(() => {
    console.log('[OnboardingWrapper] profile change useEffect - hasCheckedOnboarding:', hasCheckedOnboarding, 'profile:', !!profile, 'isExcludedRoute:', isExcludedRoute, 'userManuallyClosed:', userManuallyClosed);

    if (hasCheckedOnboarding && profile && !isExcludedRoute && user && !userManuallyClosed) {
      needsOnboarding(profile, user.id).then(needsIt => {
        // Si le modal est ouvert et que le profil est maintenant complet
        if (!needsIt && showOnboarding) {
          console.log('[OnboardingWrapper] profile change - HIDING modal (profile complete)');
          setShowOnboarding(false);
        }
        // Si le modal n'est pas ouvert et que le profil est incomplet
        // NE PAS réafficher si l'utilisateur l'a fermé manuellement
        else if (needsIt && !showOnboarding && hasCheckedOnboarding && !userManuallyClosed) {
          console.log('[OnboardingWrapper] profile change - SHOWING modal (profile incomplete)');
          setShowOnboarding(true);
        }
      });
    }

    // Fermer le modal si on change vers une route exclue
    if (isExcludedRoute && showOnboarding) {
      console.log('[OnboardingWrapper] profile change - HIDING modal (excluded route)');
      setShowOnboarding(false);
    }

    // Réinitialiser userManuallyClosed si le profil est complété
    if (userManuallyClosed && profile?.profile_setup_completed) {
      console.log('[OnboardingWrapper] Resetting userManuallyClosed (profile completed)');
      setUserManuallyClosed(false);
    }
  }, [profile, showOnboarding, hasCheckedOnboarding, isExcludedRoute, user, userManuallyClosed]);

  const handleCloseOnboarding = () => {
    console.log('[OnboardingWrapper] Modal manually closed by user');
    setUserManuallyClosed(true);
    setShowOnboarding(false);
  };

  return (
    <>
      {children}
      {showOnboarding && createPortal(
        <OnboardingModal
          isOpen={showOnboarding}
          onClose={handleCloseOnboarding}
        />,
        document.body
      )}
    </>
  );
}

/**
 * Hook pour contrôler l'affichage du modal d'onboarding
 * Note: Ce hook utilise une version synchrone simplifiée car les hooks React ne peuvent pas être async
 */
export function useOnboardingModal() {
  const { profile } = useAuth();

  // Vérification synchrone simplifiée
  const needsIt = !profile?.profile_setup_completed &&
    !profile?.submitted_to_tc &&
    (!profile?.full_name || !profile?.phone);

  return {
    show: needsIt,
    needsProfile: !profile?.full_name || !profile?.phone,
    needsDocuments: !profile?.id_document_url,
    needsSubmission: !profile?.submitted_to_tc,
  };
}
