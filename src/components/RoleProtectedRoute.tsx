import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles: string[];
  requireAll?: boolean;
  fallbackPath?: string;
}

const RoleProtectedRoute = ({ 
  children, 
  requiredRoles, 
  requireAll = false,
  fallbackPath = '/'
}: RoleProtectedRouteProps) => {
  const { user, hasRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const hasAccess = requireAll
    ? requiredRoles.every(role => hasRole(role))
    : requiredRoles.some(role => hasRole(role));

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle>Accès refusé</AlertTitle>
          <AlertDescription>
            Vous n'avez pas les permissions nécessaires pour accéder à cette page.
            {requireAll 
              ? ` Vous devez avoir tous ces rôles : ${requiredRoles.join(', ')}`
              : ` Vous devez avoir au moins un de ces rôles : ${requiredRoles.join(', ')}`
            }
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
};

export default RoleProtectedRoute;
