import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { useUserRoles } from '@/hooks/shared/useUserRoles';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  /**
   * Allowed roles - can be:
   * - Business types from profiles.user_type: 'tenant', 'owner', 'agency'
   * - System roles from user_roles table: 'admin', 'trust_agent'
   */
  allowedRoles?: string[];
  /** If true, requires admin role from user_roles table */
  requireAdmin?: boolean;
  /** If true, requires trust_agent role from user_roles table */
  requireTrustAgent?: boolean;
}

export default function ProtectedRoute({
  children,
  allowedRoles,
  requireAdmin,
  requireTrustAgent,
}: ProtectedRouteProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, profile } = useAuth();
  const { isAdmin, isTrustAgent, loading: rolesLoading, userType, systemRoles } = useUserRoles();
  const [accessChecked, setAccessChecked] = useState(false);

  const isLoading = authLoading || rolesLoading;

  useEffect(() => {
    if (isLoading) return;

    // Exception pour la page /choix-profil pendant l'inscription
    // Permettre l'accès si l'utilisateur n'est pas encore authentifié mais a un pending_full_name
    if (location.pathname === '/choix-profil' || location.pathname.endsWith('/choix-profil')) {
      const pendingFullName = sessionStorage.getItem('pending_full_name');
      if (!user && pendingFullName) {
        console.log("[ProtectedRoute] Accès autorisé à /choix-profil pendant l'inscription");
        setAccessChecked(true);
        return;
      }
    }

    // Not logged in - redirect to login
    if (!user) {
      console.log('[ProtectedRoute] No user, redirecting to /connexion');
      navigate('/connexion', { replace: true });
      return;
    }

    // Check admin requirement
    if (requireAdmin && !isAdmin) {
      console.log('[ProtectedRoute] requireAdmin failed, isAdmin:', isAdmin);
      navigate('/', { replace: true });
      return;
    }

    // Check trust_agent requirement
    if (requireTrustAgent && !isTrustAgent) {
      console.log('[ProtectedRoute] requireTrustAgent failed, isTrustAgent:', isTrustAgent);
      navigate('/', { replace: true });
      return;
    }

    // Check role-based access
    if (allowedRoles && allowedRoles.length > 0) {
      const profileUserType = profile?.user_type || profile?.active_role;

      console.log('[ProtectedRoute] Checking roles:', {
        allowedRoles,
        profileUserType,
        userType,
        systemRoles,
        isAdmin,
      });

      // Check if user has any of the allowed roles
      // First check business type (from profile or hook)
      const hasBusinessType =
        (userType || profileUserType) && allowedRoles.includes(userType || profileUserType);

      // Then check system roles (from user_roles table)
      const hasSystemRole = systemRoles.some((role) => allowedRoles.includes(role));

      // Admin always has access
      const adminOverride = isAdmin;

      if (!hasBusinessType && !hasSystemRole && !adminOverride) {
        console.log('[ProtectedRoute] Access denied, redirecting to /');
        navigate('/', { replace: true });
        return;
      }
      console.log('[ProtectedRoute] Access granted');
    }

    setAccessChecked(true);
  }, [
    user,
    isLoading,
    profile,
    allowedRoles,
    requireAdmin,
    requireTrustAgent,
    isAdmin,
    isTrustAgent,
    userType,
    systemRoles,
    navigate,
    location.pathname,
  ]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // Wait for access check to complete before rendering
  // Si accessChecked est vrai (exception appliquée), rendre les enfants même sans user
  if (!accessChecked) {
    return null;
  }

  // Si user est null mais accessChecked est vrai (exception), rendre les enfants
  if (!user && accessChecked) {
    return <>{children}</>;
  }

  // Vérification des rôles (seulement si user existe)
  if (allowedRoles && allowedRoles.length > 0 && !accessChecked) {
    return null;
  }

  return <>{children}</>;
}
