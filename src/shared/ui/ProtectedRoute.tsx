import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { useUserRoles } from '@/hooks/shared/useUserRoles';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  /**
   * Allowed roles - can be:
   * - Business types from profiles.user_type: 'tenant', 'owner', 'agent', 'locataire', 'proprietaire', 'agence'
   * - System roles from user_roles table: 'admin', 'moderator', 'trust_agent', 'user'
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
  const { user, loading: authLoading, profile } = useAuth();
  const { isAdmin, isTrustAgent, loading: rolesLoading, roles } = useUserRoles();
  const [accessChecked, setAccessChecked] = useState(false);

  const isLoading = authLoading || rolesLoading;

  useEffect(() => {
    if (isLoading) return;

    // Not logged in - redirect to login
    if (!user) {
      navigate('/connexion', { replace: true });
      return;
    }

    // Check admin requirement
    if (requireAdmin && !isAdmin) {
      navigate('/', { replace: true });
      return;
    }

    // Check trust_agent requirement
    if (requireTrustAgent && !isTrustAgent) {
      navigate('/', { replace: true });
      return;
    }

    // Check role-based access
    if (allowedRoles && allowedRoles.length > 0) {
      const userType = profile?.user_type || profile?.active_role;

      // Check if user has any of the allowed roles
      // First check business type (from profile)
      const hasBusinessType = userType && allowedRoles.includes(userType);

      // Then check system roles (from user_roles table)
      const hasSystemRole = roles.some((role) => allowedRoles.includes(role));

      // Admin always has access
      const adminOverride = isAdmin;

      if (!hasBusinessType && !hasSystemRole && !adminOverride) {
        navigate('/', { replace: true });
        return;
      }
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
    roles,
    navigate,
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

  if (!user) {
    return null;
  }

  // Wait for access check to complete before rendering
  if (allowedRoles && allowedRoles.length > 0 && !accessChecked) {
    return null;
  }

  return <>{children}</>;
}
