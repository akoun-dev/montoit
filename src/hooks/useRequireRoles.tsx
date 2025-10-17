import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { toast } from './use-toast';

/**
 * Hook pour exiger plusieurs rôles
 * @param roles - Liste des rôles requis
 * @param requireAll - Si true, l'utilisateur doit avoir tous les rôles. Si false, au moins un.
 * @param redirectTo - URL de redirection si accès refusé
 */
export const useRequireRoles = (
  roles: string[], 
  requireAll = false, 
  redirectTo = '/'
) => {
  const { hasRole, loading } = useAuth();
  const navigate = useNavigate();

  const hasAccess = requireAll
    ? roles.every(role => hasRole(role))
    : roles.some(role => hasRole(role));

  useEffect(() => {
    if (!loading && !hasAccess) {
      toast({
        title: "Accès refusé",
        description: requireAll
          ? `Vous devez avoir tous ces rôles : ${roles.join(', ')}`
          : `Vous devez avoir au moins un de ces rôles : ${roles.join(', ')}`,
        variant: "destructive",
      });
      navigate(redirectTo);
    }
  }, [hasAccess, loading, roles, requireAll, navigate, redirectTo]);

  return { hasAccess, loading };
};
