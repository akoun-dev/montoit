import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { StickyHeader } from '@/components/ui/sticky-header';
import { Shield } from 'lucide-react';
import AdminStats from '@/components/admin/AdminStats';
import AdminProperties from '@/components/admin/AdminProperties';
import AdminUsers from '@/components/admin/AdminUsers';
import AdminLeases from '@/components/admin/AdminLeases';
import AdminIntegrations from '@/components/admin/AdminIntegrations';
import PlatformAnalytics from '@/components/admin/PlatformAnalytics';
import DisputeManager from '@/components/admin/DisputeManager';
import AdminVerificationQueue from '@/components/admin/AdminVerificationQueue';
import ReviewModeration from '@/components/admin/ReviewModeration';
import AdvancedReporting from '@/components/admin/AdvancedReporting';
import LeaseCertificationQueue from '@/components/admin/LeaseCertificationQueue';
import { AuditLogViewer } from '@/components/admin/AuditLogViewer';
import { LeaseTemplateManager } from '@/components/admin/LeaseTemplateManager';
import { PromoteToSuperAdmin } from '@/components/admin/PromoteToSuperAdmin';
import PropertyModerationQueue from '@/components/admin/PropertyModerationQueue';
import SensitiveDataAccessMonitor from '@/components/admin/SensitiveDataAccessMonitor';
import { EnhancedMfaSecurityMonitor } from '@/components/admin/EnhancedMfaSecurityMonitor';
import { ProcessingConfigPanel } from '@/components/admin/ProcessingConfigPanel';
import { ProcessingAnalytics } from '@/components/admin/ProcessingAnalytics';
import { SeedDemoDataButton } from '@/components/admin/SeedDemoDataButton';
import { ElectronicSignaturesDashboard } from '@/components/admin/ElectronicSignaturesDashboard';
import { CertificateManager } from '@/components/admin/CertificateManager';
import { PropertyAlertsMonitor } from '@/components/admin/PropertyAlertsMonitor';
import { ReportGenerator } from '@/components/admin/ReportGenerator';
import { IllustrationGenerator } from '@/components/admin/IllustrationGenerator';
import { supabase } from '@/lib/supabase';

const AdminDashboard = () => {
  const { hasRole, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [pendingCertifications, setPendingCertifications] = useState(0);
  const [openDisputes, setOpenDisputes] = useState(0);
  const [pendingProperties, setPendingProperties] = useState(0);
  const [overdueApplications, setOverdueApplications] = useState(0);

  useEffect(() => {
    const fetchPendingCount = async () => {
      const { count } = await supabase
        .from('leases')
        .select('*', { count: 'exact', head: true })
        .eq('certification_status', 'pending');
      setPendingCertifications(count || 0);
    };

    const fetchOpenDisputes = async () => {
      // Utiliser le RPC sécurisé via get_my_disputes
      const { data: disputes } = await supabase.rpc('get_my_disputes');
      const openCount = disputes?.filter(d => d.status === 'open').length || 0;
      setOpenDisputes(openCount);
    };

    const fetchPendingProperties = async () => {
      const { count } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('moderation_status', 'pending');
      setPendingProperties(count || 0);
    };

    const fetchOverdueApplications = async () => {
      const { count } = await supabase
        .from('rental_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('is_overdue', true);
      setOverdueApplications(count || 0);
    };

    fetchPendingCount();
    fetchOpenDisputes();
    fetchPendingProperties();
    fetchOverdueApplications();

    const leasesChannel = supabase
      .channel('admin-pending-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leases',
          filter: 'certification_status=eq.pending'
        },
        () => fetchPendingCount()
      )
      .subscribe();

    const disputesChannel = supabase
      .channel('admin-open-disputes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'disputes',
          filter: 'status=eq.open'
        },
        () => fetchOpenDisputes()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leasesChannel);
      supabase.removeChannel(disputesChannel);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasRole('admin')) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <SidebarProvider>
        <div className="flex w-full min-h-screen">
          <AdminSidebar 
            activeTab={activeTab}
            onTabChange={setActiveTab}
            badges={{
              certifications: pendingCertifications,
              disputes: openDisputes,
              properties: pendingProperties,
              overdueApplications: overdueApplications,
            }}
          />

          <SidebarInset className="flex-1">
            <main className="container mx-auto px-6 py-6">
              <StickyHeader>
                <h1 className="text-2xl font-bold">Administration ANSUT</h1>
                <p className="text-sm text-muted-foreground">
                  Gestion et validation de la plateforme Mon Toit
                </p>
              </StickyHeader>

              {/* Vue d'ensemble */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <SeedDemoDataButton />
                  <AdminStats />
                </div>
              )}

              {/* Certifications */}
              {activeTab === 'certifications' && (
                <LeaseCertificationQueue />
              )}

              {/* Vérifications */}
              {activeTab === 'verifications' && (
                <AdminVerificationQueue />
              )}

              {/* Traitement */}
              {activeTab === 'processing' && (
                <div className="grid gap-6 lg:grid-cols-2">
                  <ProcessingConfigPanel />
                  <ProcessingAnalytics />
                </div>
              )}

              {/* Sécurité - Accès sensibles */}
              {activeTab === 'security' && (
                <SensitiveDataAccessMonitor />
              )}

              {/* Sécurité 2FA */}
            {activeTab === 'mfa' && (
              <EnhancedMfaSecurityMonitor />
            )}

              {/* Audit */}
              {activeTab === 'audit' && (
                <div className="space-y-6">
                  {!hasRole('super_admin') && !hasRole('admin') && (
                    <PromoteToSuperAdmin />
                  )}
                  <AuditLogViewer />
                </div>
              )}

              {/* Analytics */}
              {activeTab === 'analytics' && (
                <PlatformAnalytics />
              )}

              {/* Litiges */}
              {activeTab === 'disputes' && (
                <DisputeManager />
              )}

              {/* Modération */}
              {activeTab === 'moderation' && (
                <ReviewModeration />
              )}

              {/* Rapports */}
              {activeTab === 'reporting' && (
                <AdvancedReporting />
              )}

              {/* Rapports Mensuels */}
              {activeTab === 'reports' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      📊 Générateur de Rapports Mensuels
                    </CardTitle>
                    <CardDescription>
                      Générer et envoyer des rapports de performance aux propriétaires
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ReportGenerator />
                  </CardContent>
                </Card>
              )}

              {/* Générateur d'Illustrations */}
              {activeTab === 'illustrations' && (
                <IllustrationGenerator />
              )}

              {/* Signatures Électroniques */}
              {activeTab === 'electronic-signatures' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Signatures Électroniques CryptoNeo
                    </CardTitle>
                    <CardDescription>
                      Gestion des certificats numériques et signatures électroniques
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="dashboard" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="dashboard">Tableau de bord</TabsTrigger>
                        <TabsTrigger value="certificates">Gestion des certificats</TabsTrigger>
                      </TabsList>

                      <TabsContent value="dashboard">
                        <ElectronicSignaturesDashboard />
                      </TabsContent>

                      <TabsContent value="certificates">
                        <CertificateManager />
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              )}

              {/* Biens */}
              {activeTab === 'properties' && (
                <AdminProperties />
              )}

              {/* Utilisateurs */}
              {activeTab === 'users' && (
                <AdminUsers />
              )}

              {/* Baux */}
              {activeTab === 'leases' && (
                <Tabs defaultValue="list" className="w-full">
                  <TabsList>
                    <TabsTrigger value="list">Liste des Baux</TabsTrigger>
                    <TabsTrigger value="templates">Modèles de Baux</TabsTrigger>
                  </TabsList>

                  <TabsContent value="list" className="mt-4">
                    <AdminLeases />
                  </TabsContent>

                  <TabsContent value="templates" className="mt-4">
                    <LeaseTemplateManager />
                  </TabsContent>
                </Tabs>
              )}

              {/* Alertes Propriétés */}
              {activeTab === 'alerts' && (
                <PropertyAlertsMonitor />
              )}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>

      <Footer />
    </div>
  );
};

export default AdminDashboard;
