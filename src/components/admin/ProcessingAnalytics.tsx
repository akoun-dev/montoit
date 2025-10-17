import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { BarChart, TrendingUp, Download, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { AuditLogViewer } from './AuditLogViewer';
import { logger } from '@/services/logger';

interface AnalyticsKPI {
  totalProcessed: number;
  avgProcessingTimeHours: number;
  complianceRate: number;
  currentOverdue: number;
  autoProcessed: number;
}

export const ProcessingAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<AnalyticsKPI>({
    totalProcessed: 0,
    avgProcessingTimeHours: 0,
    complianceRate: 0,
    currentOverdue: 0,
    autoProcessed: 0
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Total traités (approved + rejected)
      const { count: totalProcessed } = await supabase
        .from('rental_applications')
        .select('*', { count: 'exact', head: true })
        .in('status', ['approved', 'rejected']);

      // Temps moyen de traitement
      const { data: processedApps } = await supabase
        .from('rental_applications')
        .select('created_at, reviewed_at')
        .not('reviewed_at', 'is', null);

      let avgProcessingTimeHours = 0;
      if (processedApps && processedApps.length > 0) {
        const totalHours = processedApps.reduce((sum, app) => {
          if (app.reviewed_at && app.created_at) {
            const diffMs = new Date(app.reviewed_at).getTime() - new Date(app.created_at).getTime();
            return sum + (diffMs / (1000 * 60 * 60));
          }
          return sum;
        }, 0);
        avgProcessingTimeHours = Math.round(totalHours / processedApps.length);
      }

      // Taux de respect du délai
      const { data: allProcessed } = await supabase
        .from('rental_applications')
        .select('processing_deadline, reviewed_at')
        .not('reviewed_at', 'is', null);

      let complianceRate = 0;
      if (allProcessed && allProcessed.length > 0) {
        const withinDeadline = allProcessed.filter(app => {
          if (!app.reviewed_at || !app.processing_deadline) return false;
          return new Date(app.reviewed_at) <= new Date(app.processing_deadline);
        }).length;
        complianceRate = Math.round((withinDeadline / allProcessed.length) * 100);
      }

      // Dossiers en retard actuellement
      const { count: currentOverdue } = await supabase
        .from('rental_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('is_overdue', true);

      // Dossiers auto-traités
      const { count: autoProcessed } = await supabase
        .from('rental_applications')
        .select('*', { count: 'exact', head: true })
        .eq('auto_processed', true);

      setKpis({
        totalProcessed: totalProcessed || 0,
        avgProcessingTimeHours,
        complianceRate,
        currentOverdue: currentOverdue || 0,
        autoProcessed: autoProcessed || 0
      });
    } catch (error) {
      logger.error('Error fetching processing analytics', { error });
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les analytics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportOverdue = async () => {
    try {
      const { data, error } = await supabase
        .from('rental_applications')
        .select(`
          *,
          properties (title, city, monthly_rent),
          profiles!rental_applications_applicant_id_fkey (full_name, phone)
        `)
        .eq('status', 'pending')
        .eq('is_overdue', true)
        .order('processing_deadline', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: 'Aucun dossier en retard',
          description: 'Il n\'y a aucun dossier en retard à exporter.',
        });
        return;
      }

      // Générer CSV
      const headers = ['ID', 'Candidat', 'Téléphone', 'Propriété', 'Ville', 'Loyer', 'Date soumission', 'Deadline', 'Score'];
      const csvContent = [
        headers.join(','),
        ...data.map(app => [
          app.id,
          (app.profiles as any)?.full_name || 'N/A',
          (app.profiles as any)?.phone || 'N/A',
          (app.properties as any)?.title || 'N/A',
          (app.properties as any)?.city || 'N/A',
          (app.properties as any)?.monthly_rent || '0',
          new Date(app.created_at).toLocaleDateString('fr-FR'),
          app.processing_deadline ? new Date(app.processing_deadline).toLocaleDateString('fr-FR') : 'N/A',
          app.application_score || '0'
        ].join(','))
      ].join('\n');

      // Télécharger
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `dossiers-retard-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      toast({
        title: 'Export réussi',
        description: `${data.length} dossier(s) exporté(s) avec succès.`,
      });
    } catch (error) {
      logger.error('Error exporting processing analytics', { error });
      toast({
        title: 'Erreur d\'export',
        description: 'Impossible d\'exporter les dossiers',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart className="h-4 w-4" />
              Total Traités
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalProcessed}</div>
            <p className="text-xs text-muted-foreground mt-1">Dossiers approuvés ou rejetés</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Temps Moyen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.avgProcessingTimeHours}h</div>
            <p className="text-xs text-muted-foreground mt-1">
              ~{Math.round(kpis.avgProcessingTimeHours / 24)} jours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Taux de Respect
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.complianceRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">Traités dans les délais</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-orange-600 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              En Retard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{kpis.currentOverdue}</div>
            <p className="text-xs text-muted-foreground mt-1">Nécessitent attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Auto-traités
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.autoProcessed}</div>
            <p className="text-xs text-muted-foreground mt-1">Traités automatiquement</p>
          </CardContent>
        </Card>
      </div>

      {/* Export */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                Export des Données
              </CardTitle>
              <CardDescription>
                Exportez les dossiers en retard au format CSV
              </CardDescription>
            </div>
            <Button onClick={handleExportOverdue} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Exporter les dossiers en retard
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Audit Logs filtrés */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5 text-primary" />
            Historique des Actions Automatiques
          </CardTitle>
          <CardDescription>
            Journal des traitements automatiques effectués par le système
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Pour consulter l'historique complet des actions automatiques, utilisez le filtre "auto_process_overdue_applications" dans l'onglet Audit.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
