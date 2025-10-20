import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { DynamicBreadcrumb } from '@/components/navigation/DynamicBreadcrumb';
import { MainLayout } from '@/components/layout/MainLayout';
import { Footer } from '@/components/Footer';
import { ApplicationsStatusWidget } from '@/components/dashboard/tenant/ApplicationsStatusWidget';
import { ActiveLeaseWidget } from '@/components/dashboard/tenant/ActiveLeaseWidget';
import { PaymentHistoryWidget } from '@/components/dashboard/tenant/PaymentHistoryWidget';
import { MaintenanceRequestsWidget } from '@/components/dashboard/tenant/MaintenanceRequestsWidget';
import { RecommendedPropertiesWidget } from '@/components/dashboard/tenant/RecommendedPropertiesWidget';
import { LayoutDashboard, Home, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const TenantDashboard = () => {
  const { user } = useAuth();

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['tenant-dashboard', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase.rpc('get_tenant_dashboard_summary', {
        p_tenant_id: user.id
      });

      if (error) throw error;
      return data as {
        applications: {
          total: number;
          pending: number;
          approved: number;
          rejected: number;
          recent: any[];
        };
        leases: {
          active: number;
          total: number;
          current: any;
        };
        payments: {
          total_paid: number;
          pending: number;
          count: number;
          recent: any[];
        };
        maintenance: {
          total: number;
          pending: number;
          in_progress: number;
          completed: number;
          recent: any[];
        };
      };
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <MainLayout>
      <main className="container mx-auto px-4 py-8">
        <div className="mb-10">
          <DynamicBreadcrumb />
          
          <h1 className="text-4xl font-bold mb-3 mt-6 flex items-center gap-3">
            <LayoutDashboard className="h-8 w-8 text-primary" />
            Tableau de bord Locataire
          </h1>
          <p className="text-lg text-muted-foreground">
            Vue d'ensemble de vos candidatures, baux et paiements
          </p>
        </div>

        <div className="space-y-8">
          {/* Recommended Properties Section */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-semibold flex items-center gap-2">
                  <Home className="h-6 w-6 text-primary" />
                  Annonces recommandées
                </h2>
                <p className="text-muted-foreground">
                  Découvrez les biens qui correspondent à vos critères
                </p>
              </div>
              <Button asChild variant="outline">
                <Link to="/recherche">
                  <Search className="h-4 w-4 mr-2" />
                  Voir toutes les annonces
                </Link>
              </Button>
            </div>
            <RecommendedPropertiesWidget userId={user?.id} />
          </div>

          {/* Dashboard Widgets */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ApplicationsStatusWidget data={dashboardData?.applications} />
            <ActiveLeaseWidget data={dashboardData?.leases} />
            <PaymentHistoryWidget data={dashboardData?.payments} />
            <MaintenanceRequestsWidget data={dashboardData?.maintenance} />
          </div>
        </div>
      </main>

      <Footer />
    </MainLayout>
  );
};

export default TenantDashboard;
