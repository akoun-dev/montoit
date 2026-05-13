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
  if (!profile) {
    return false;
  }

  // PRIORITÉ: Si déjà soumis au TC, pas besoin d'onboarding
  if (profile.submitted_to_tc === true) {
    console.log('[needsOnboarding] submitted_to_tc is true, no onboarding needed');
    return false;
  }

  // PRIORITÉ: Si le profil a un dossier de certification en cours ou approuvé, pas d'onboarding
  if (profile.verification_status === 'pending' ||
      profile.verification_status === 'in_review' ||
      profile.verification_status === 'approved') {
    console.log('[needsOnboarding] verification_status is', profile.verification_status, ', no onboarding needed');
    return false;
  }

  // PRIORITÉ: Si profile_setup_completed est explicitement true, pas d'onboarding
  if (profile.profile_setup_completed === true) {
    console.log('[needsOnboarding] profile_setup_completed is true, no onboarding needed');
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
          // Marquer le profil comme complété pour éviter les vérifications futures
          await supabase
            .from('profiles')
            .update({ profile_setup_completed: true, submitted_to_tc: true })
            .eq('id', userId);
          console.log('[needsOnboarding] Application already submitted, marking profile as complete');
          return false;
        }
      }
    } catch (error) {
      console.error('[OnboardingWrapper] Error checking verification applications:', error);
    }
  }

  // Si profile_setup_completed est undefined ou false, vérifier les critères d'onboarding
  // Note: On ne retourne true que si profile_setup_completed n'est pas true ET qu'il manque des infos de base
  if (profile.profile_setup_completed !== true) {
    const hasBasicProfile = profile.full_name && profile.full_name.trim() !== '';
    const hasPhone = profile.phone && profile.phone.trim() !== '';

    // Si aucune info de base, onboarding nécessaire
    if (!hasBasicProfile || !hasPhone) {
      console.log('[needsOnboarding] Missing basic profile info, onboarding needed');
      return true;
    }
  }

  console.log('[needsOnboarding] Profile is complete enough, no onboarding needed');
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

  useEffect(() => {
    // Ne vérifier l'onboarding que si l'utilisateur est connecté
    // et pas sur une route exclue
    if (!user || isExcludedRoute) {
      return;
    }

    // Attendre un peu que le profil soit chargé
    const timer = setTimeout(async () => {
      if (profile && await needsOnboarding(profile, user.id)) {
        setShowOnboarding(true);
      }
      setHasCheckedOnboarding(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [user, profile, isExcludedRoute]);

  // Mettre à jour l'état si le profil change
  useEffect(() => {
    if (hasCheckedOnboarding && profile && !isExcludedRoute && user) {
      needsOnboarding(profile, user.id).then(needsIt => {
        // Si le modal est ouvert et que le profil est maintenant complet
        if (!needsIt && showOnboarding) {
          console.log('[OnboardingWrapper] Profile is now complete, closing onboarding modal');
          setShowOnboarding(false);
          setUserManuallyClosed(false); // Réinitialiser pour permettre une future réouverture si nécessaire
        }
        // Si le modal n'est pas ouvert et que le profil est incomplet
        // NE PAS réafficher si l'utilisateur l'a fermé manuellement
        else if (needsIt && !showOnboarding && hasCheckedOnboarding && !userManuallyClosed) {
          console.log('[OnboardingWrapper] Profile incomplete and not manually closed, showing onboarding');
          setShowOnboarding(true);
        }
      });
    }

    // Fermer le modal si on change vers une route exclue
    if (isExcludedRoute && showOnboarding) {
      setShowOnboarding(false);
    }

    // Réinitialiser userManuallyClosed si le profil est complété
    if (userManuallyClosed && profile?.profile_setup_completed) {
      setUserManuallyClosed(false);
    }
  }, [profile, showOnboarding, hasCheckedOnboarding, isExcludedRoute, user, userManuallyClosed]);

  const handleCloseOnboarding = () => {
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
