/**
 * Composant de route protégée amélioré
 *
 * Ce composant protège les routes en vérifiant les rôles et permissions
 * avec une meilleure gestion des erreurs et feedback utilisateur.
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Shield, AlertTriangle, Lock } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { useAuthStore } from '@/store/authStore';
import {
  getCurrentUserRole,
  hasPermission,
  hasRole,
} from '@/shared/services/roleValidation.service';
import { LoadingSpinner } from '@/shared/ui/loading-spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  requiredPermission?: string;
  fallback?: React.ReactNode;
  redirectTo?: string;
  allowPending?: boolean;
}

export function ProtectedRoute({
  children,
  requiredRole,
  requiredPermission,
  fallback,
  redirectTo = '/unauthorized',
  allowPending = false,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuthStore();
  const location = useLocation();
  const [userRole, setUserRole] = React.useState<string | null>(null);
  const [isCheckingRole, setIsCheckingRole] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Vérifier le rôle de l'utilisateur
  React.useEffect(() => {
    const checkRole = async () => {
      if (!user) {
        setIsCheckingRole(false);
        return;
      }

      try {
        const role = await getCurrentUserRole();
        setUserRole(role);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsCheckingRole(false);
      }
    };

    checkRole();
  }, [user]);

  // Afficher le spinner pendant le chargement
  if (isLoading || isCheckingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner className="h-8 w-8 mx-auto mb-4" />
          <p className="text-gray-600">Vérification des autorisations...</p>
        </div>
      </div>
    );
  }

  // Non connecté
  if (!user) {
    const loginPath = `/login?redirect=${encodeURIComponent(location.pathname)}`;
    return <Navigate to={loginPath} replace />;
  }

  // Erreur lors de la vérification du rôle
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle>Erreur de vérification</CardTitle>
            <CardDescription>
              Une erreur est survenue lors de la vérification de vos autorisations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">{error}</p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Composant par défaut en cas d'accès refusé
  const defaultFallback = (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <CardTitle>Accès non autorisé</CardTitle>
          <CardDescription>
            Vous n'avez pas les permissions nécessaires pour accéder à cette page
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600 space-y-2">
            <p>
              {requiredRole && (
                <span>
                  Rôle requis:{' '}
                  {Array.isArray(requiredRole) ? requiredRole.join(' ou ') : requiredRole}
                </span>
              )}
              {requiredPermission && (
                <span>
                  {requiredRole && ' • '}
                  Permission requise: {requiredPermission}
                </span>
              )}
            </p>
            <p>Votre rôle actuel: {userRole || 'Non défini'}</p>
          </div>
          <Button onClick={() => window.history.back()} variant="outline" className="w-full">
            Retour
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  // Fonction pour vérifier si l'utilisateur a accès
  const hasAccess = async (): Promise<boolean> => {
    // Vérification du rôle
    if (requiredRole) {
      if (Array.isArray(requiredRole)) {
        const hasRequiredRole = await hasRole(requiredRole as any[]);
        if (!hasRequiredRole) return false;
      } else {
        const hasRequiredRole = await hasRole([requiredRole as any]);
        if (!hasRequiredRole) return false;
      }
    }

    // Vérification de la permission
    if (requiredPermission) {
      const hasRequiredPermission = await hasPermission(requiredPermission as any);
      if (!hasRequiredPermission) return false;
    }

    return true;
  };

  // Hook asynchrone pour vérifier l'accès
  const AccessCheck = ({ children }: { children: React.ReactNode }) => {
    const [accessGranted, setAccessGranted] = React.useState<boolean | null>(null);
    const [isChecking, setIsChecking] = React.useState(true);

    React.useEffect(() => {
      const checkAccess = async () => {
        try {
          const granted = await hasAccess();
          setAccessGranted(granted);
        } catch (err) {
          console.error('Error checking access:', err);
          setAccessGranted(false);
        } finally {
          setIsChecking(false);
        }
      };

      checkAccess();
    }, []);

    if (isChecking) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner className="h-8 w-8" />
        </div>
      );
    }

    if (!accessGranted) {
      return <>{fallback || defaultFallback}</>;
    }

    return <>{children}</>;
  };

  // Si pas de restrictions, autoriser l'accès
  if (!requiredRole && !requiredPermission) {
    return <>{children}</>;
  }

  return <AccessCheck>{children}</AccessCheck>;
}

/**
 * Composant pour les routes nécessitant une connexion simple
 */
export function AuthenticatedRoute({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { user, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    const loginPath = `/login?redirect=${encodeURIComponent(location.pathname)}`;
    return <Navigate to={loginPath} replace />;
  }

  return <>{children}</>;
}

/**
 * Composant pour les routes publiques (redirige si déjà connecté)
 */
export function PublicRoute({
  children,
  redirectTo = '/dashboard',
}: {
  children: React.ReactNode;
  redirectTo?: string;
}) {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (user) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}

/**
 * Composant pour les routes admin
 */
export function AdminRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requiredRole="admin">{children}</ProtectedRoute>;
}

/**
 * Composant pour les routes propriétaires
 */
export function OwnerRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requiredRole={['owner', 'agency']}>{children}</ProtectedRoute>;
}

/**
 * Composant pour les routes locataires
 */
export function TenantRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requiredRole="tenant">{children}</ProtectedRoute>;
}

/**
 * HOC pour protéger les composants
 */
export function withProtection<P extends object>(
  Component: React.ComponentType<P>,
  protectionProps: Omit<ProtectedRouteProps, 'children'>
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute {...protectionProps}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

/**
 * Hook pour vérifier les permissions dans les composants
 */
export function usePermissions() {
  const [userRole, setUserRole] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchRole = async () => {
      try {
        const role = await getCurrentUserRole();
        setUserRole(role);
      } catch (error) {
        console.error('Error fetching user role:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, []);

  const checkPermission = React.useCallback(async (permission: string) => {
    return hasPermission(permission as any);
  }, []);

  const checkRole = React.useCallback(async (role: string | string[]) => {
    return hasRole(Array.isArray(role) ? role : [role]);
  }, []);

  return {
    userRole,
    loading,
    checkPermission,
    checkRole,
  };
}
