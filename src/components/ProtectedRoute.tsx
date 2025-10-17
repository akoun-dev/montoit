import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { EmptyState } from '@/components/ui/empty-state';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedUserTypes?: ('locataire' | 'proprietaire' | 'agence' | 'admin_ansut')[];
  requiredRoles?: string[];
  requireAll?: boolean;
}

const ProtectedRoute = ({ 
  children, 
  allowedUserTypes,
  requiredRoles,
  requireAll = false 
}: ProtectedRouteProps) => {
  const { user, profile, hasRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen page-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <Lock className="h-16 w-16 text-primary animate-pulse relative" />
          </div>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div className="min-h-screen page-background flex items-center justify-center">
          <EmptyState
            icon={Lock}
            title="Connexion requise"
            description="Vous devez être connecté pour accéder à cette page. Redirection en cours..."
          />
        </div>
        <Navigate to="/auth" replace />
      </>
    );
  }

  // Vérification des user_types
  if (allowedUserTypes && profile && !allowedUserTypes.includes(profile.user_type)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle>Accès refusé</AlertTitle>
          <AlertDescription>
            Votre type de compte ne permet pas d'accéder à cette page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Vérification des rôles
  if (requiredRoles && requiredRoles.length > 0) {
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
            </AlertDescription>
          </Alert>
        </div>
      );
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
