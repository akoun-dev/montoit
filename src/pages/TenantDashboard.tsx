import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { DynamicBreadcrumb } from '@/components/navigation/DynamicBreadcrumb';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { ApplicationsStatusWidget } from '@/components/dashboard/tenant/ApplicationsStatusWidget';
import { ActiveLeaseWidget } from '@/components/dashboard/tenant/ActiveLeaseWidget';
import { PaymentHistoryWidget } from '@/components/dashboard/tenant/PaymentHistoryWidget';
import { MaintenanceRequestsWidget } from '@/components/dashboard/tenant/MaintenanceRequestsWidget';
import { LayoutDashboard } from 'lucide-react';

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
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8 pt-24">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ApplicationsStatusWidget data={dashboardData?.applications} />
          <ActiveLeaseWidget data={dashboardData?.leases} />
          <PaymentHistoryWidget data={dashboardData?.payments} />
          <MaintenanceRequestsWidget data={dashboardData?.maintenance} />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TenantDashboard;
