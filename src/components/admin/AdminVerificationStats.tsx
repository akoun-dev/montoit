import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Users, 
  TrendingUp, 
  Download,
  Shield,
  Award
} from 'lucide-react';
import { handleError } from '@/lib/errorHandler';
import { toast } from '@/hooks/use-toast';

interface VerificationStats {
  total: number;
  pending: number;
  verified: number;
  rejected: number;
  oneci_verified: number;
  cnam_verified: number;
  avg_processing_time_hours: number;
  avg_tenant_score: number;
}

export const AdminVerificationStats = () => {
  const [stats, setStats] = useState<VerificationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Utiliser le RPC sécurisé pour accès aux données de vérification
      const { data: verifications, error } = await supabase
        .rpc('get_verifications_for_admin_review');

      if (error) throw error;

      if (!verifications) {
        setStats(null);
        return;
      }

      const pending = verifications.filter(v => 
        v.oneci_status === 'pending_review' || v.cnam_status === 'pending_review'
      ).length;

      const oneci_verified = verifications.filter(v => v.oneci_status === 'verified').length;
      const cnam_verified = verifications.filter(v => v.cnam_status === 'verified').length;
      const verified = verifications.filter(v => 
        v.oneci_status === 'verified' || v.cnam_status === 'verified'
      ).length;
      const rejected = verifications.filter(v => 
        v.oneci_status === 'rejected' || v.cnam_status === 'rejected'
      ).length;

      // Calculate average processing time
      const reviewedVerifications = verifications.filter(v => v.admin_reviewed_at);
      let avgProcessingTime = 0;
      if (reviewedVerifications.length > 0) {
        const totalTime = reviewedVerifications.reduce((sum, v) => {
          const created = new Date(v.created_at).getTime();
          const reviewed = new Date(v.admin_reviewed_at!).getTime();
          return sum + (reviewed - created);
        }, 0);
        avgProcessingTime = totalTime / reviewedVerifications.length / (1000 * 60 * 60); // Convert to hours
      }

      // Calculate average tenant score (avec cast any car RPC ne type pas tenant_score)
      const scoresWithValues = verifications.filter(v => (v as any).tenant_score && (v as any).tenant_score > 0);
      const avgScore = scoresWithValues.length > 0
        ? scoresWithValues.reduce((sum, v) => sum + ((v as any).tenant_score || 0), 0) / scoresWithValues.length
        : 0;

      setStats({
        total: verifications.length,
        pending,
        verified,
        rejected,
        oneci_verified,
        cnam_verified,
        avg_processing_time_hours: avgProcessingTime,
        avg_tenant_score: avgScore,
      });
    } catch (error) {
      handleError(error, 'Impossible de charger les statistiques');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = async () => {
    try {
      // Utiliser le RPC sécurisé qui retourne déjà les données avec full_name
      const { data, error } = await supabase
        .rpc('get_verifications_for_admin_review');

      if (error) throw error;

      const csvRows = [
        ['ID Utilisateur', 'Nom', 'Type', 'Statut ONECI', 'Statut CNAM', 'Score Locataire', 'Date Création', 'Date Révision', 'Révisé Par'].join(','),
        ...data.map((v: any) => [
          v.user_id,
          v.full_name || 'N/A',
          v.user_type || 'N/A',
          v.oneci_status,
          v.cnam_status,
          (v as any).tenant_score || 0,
          new Date(v.created_at).toLocaleDateString('fr-FR'),
          v.admin_reviewed_at ? new Date(v.admin_reviewed_at).toLocaleDateString('fr-FR') : 'N/A',
          v.admin_reviewed_by || 'N/A'
        ].join(','))
      ];

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `verifications-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Export réussi',
        description: 'Les données ont été exportées en CSV',
      });
    } catch (error) {
      handleError(error, "Impossible d'exporter les données");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Aucune donnée disponible</p>
        </CardContent>
      </Card>
    );
  }

  const approvalRate = stats.total > 0 
    ? ((stats.verified / stats.total) * 100).toFixed(1) 
    : '0';

  const rejectionRate = stats.total > 0 
    ? ((stats.rejected / stats.total) * 100).toFixed(1) 
    : '0';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Statistiques des Vérifications</h2>
          <p className="text-muted-foreground">Vue d'ensemble des vérifications d'identité</p>
        </div>
        <Button onClick={exportToCSV} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exporter CSV
        </Button>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Vérifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              En Attente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total > 0 ? ((stats.pending / stats.total) * 100).toFixed(1) : 0}% du total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Approuvées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.verified}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Taux d'approbation: {approvalRate}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Rejetées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.rejected}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Taux de rejet: {rejectionRate}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Vérifications par Type
            </CardTitle>
            <CardDescription>Répartition des vérifications ONECI et CNAM</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <span className="font-medium">ONECI Vérifiées</span>
              <Badge variant="default" className="text-lg px-3 py-1">
                {stats.oneci_verified}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <span className="font-medium">CNAM Vérifiées</span>
              <Badge variant="default" className="text-lg px-3 py-1">
                {stats.cnam_verified}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Métriques de Performance
            </CardTitle>
            <CardDescription>Temps de traitement et scores moyens</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <span className="font-medium">Temps Moyen de Traitement</span>
              <Badge variant="outline" className="text-lg px-3 py-1">
                {stats.avg_processing_time_hours.toFixed(1)}h
              </Badge>
            </div>
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                <span className="font-medium">Score Locataire Moyen</span>
              </div>
              <Badge variant="default" className="text-lg px-3 py-1">
                {stats.avg_tenant_score.toFixed(0)}/100
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
