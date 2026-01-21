/**
 * DashboardRouter - Redirects users to their appropriate dashboard based on user_type and roles
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { useUserRoles } from '@/hooks/shared/useUserRoles';
import { Loader2 } from 'lucide-react';
import { getDashboardRoute } from '@/shared/utils/roleRoutes';

export default function DashboardRouter() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { isAdmin, isTrustAgent, loading: rolesLoading } = useUserRoles();

  useEffect(() => {
    console.log('DashboardRouter - authLoading:', authLoading, 'rolesLoading:', rolesLoading);
    console.log('DashboardRouter - user:', user?.id, 'profile:', profile?.id);

    // Wait for both auth and roles to load, but with a timeout
    if (authLoading || rolesLoading) return;

    // Not logged in - redirect to login
    if (!user) {
      console.log('DashboardRouter - No user, redirecting to /connexion');
      navigate('/connexion', { replace: true });
      return;
    }

    console.log('DashboardRouter - User logged in, checking roles...');

    // Check system roles first (from user_roles table)
    if (isAdmin) {
      console.log('DashboardRouter - Admin user, redirecting to /admin');
      navigate('/admin', { replace: true });
      return;
    }

    if (isTrustAgent) {
      console.log('DashboardRouter - Trust agent, redirecting to /trust-agent/dashboard');
      navigate('/trust-agent/dashboard', { replace: true });
      return;
    }

    // Redirect based on user_type from profile using centralized logic
    const userType = profile?.user_type || profile?.active_role;

    // Log profile details for debugging
    console.log('DashboardRouter - Profile details:', {
      profileId: profile?.id,
      profileUserType: profile?.user_type,
      profileActiveRole: profile?.active_role,
      resolvedUserType: userType,
    });

    // If no user type but we have a user, try to continue with a default
    if (!userType) {
      console.warn('DashboardRouter - No user type defined for user:', user.id);
      // Instead of redirecting to inscription, try to get user metadata
      const userTypeFromMetadata = user.user_metadata?.user_type || user.user_metadata?.role;
      console.log('DashboardRouter - Checking metadata:', {
        metadata: user.user_metadata,
        userTypeFromMetadata,
      });
      if (userTypeFromMetadata) {
        const fallbackRoute = getDashboardRoute(userTypeFromMetadata);
        console.log(
          'DashboardRouter - Using metadata user type:',
          userTypeFromMetadata,
          'redirecting to:',
          fallbackRoute
        );
        navigate(fallbackRoute, { replace: true });
        return;
      }

      // Final fallback - redirect to role selection
      console.log('DashboardRouter - No user type found, redirecting to role selection');
      navigate('/inscription', { replace: true });
      return;
    }

    const dashboardRoute = getDashboardRoute(userType);
    console.log('DashboardRouter - User type:', userType, 'redirecting to:', dashboardRoute);
    navigate(dashboardRoute, { replace: true });
  }, [user, profile, authLoading, rolesLoading, isAdmin, isTrustAgent, navigate]);

  // Show loading while determining redirect
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Redirection en cours...</p>
      </div>
    </div>
  );
}
