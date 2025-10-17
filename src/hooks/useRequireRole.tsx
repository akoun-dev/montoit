import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { toast } from './use-toast';

/**
 * Hook pour exiger un rôle spécifique
 * Redirige automatiquement si l'utilisateur n'a pas le rôle requis
 */
export const useRequireRole = (role: string, redirectTo = '/') => {
  const { hasRole, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !hasRole(role)) {
      toast({
        title: "Accès refusé",
        description: `Vous devez avoir le rôle '${role}' pour accéder à cette page.`,
        variant: "destructive",
      });
      navigate(redirectTo);
    }
  }, [hasRole, loading, role, navigate, redirectTo]);

  return { hasRole: hasRole(role), loading };
};
