import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/services/logger';

interface CertificationMetrics {
  totalCertified: number;
  totalRejected: number;
  totalPending: number;
  avgProcessingDays: number;
  approvalRate: number;
  topRejectionReasons: { reason: string; count: number }[];
  thisMonthCertified: number;
}

const CertificationStats = () => {
  const [metrics, setMetrics] = useState<CertificationMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const { data: leases, error } = await supabase
        .from('leases')
        .select('certification_status, certification_requested_at, ansut_certified_at, certification_notes');

      if (error) throw error;

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const totalCertified = leases.filter(l => l.certification_status === 'certified').length;
      const totalRejected = leases.filter(l => l.certification_status === 'rejected').length;
      const totalPending = leases.filter(l => l.certification_status === 'pending').length;

      const processingTimes = leases
        .filter(l => l.certification_requested_at && l.ansut_certified_at)
        .map(l => {
          const requested = new Date(l.certification_requested_at!);
          const certified = new Date(l.ansut_certified_at!);
          return (certified.getTime() - requested.getTime()) / (1000 * 60 * 60 * 24);
        });

      const avgProcessingDays = processingTimes.length > 0
        ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
        : 0;

      const totalProcessed = totalCertified + totalRejected;
      const approvalRate = totalProcessed > 0 ? (totalCertified / totalProcessed) * 100 : 0;

      const thisMonthCertified = leases.filter(l => 
        l.certification_status === 'certified' && 
        l.ansut_certified_at &&
        new Date(l.ansut_certified_at) >= thirtyDaysAgo
      ).length;

      const rejectionNotes = leases
        .filter(l => l.certification_status === 'rejected' && l.certification_notes)
        .map(l => l.certification_notes!);

      const reasonCounts: { [key: string]: number } = {};
      rejectionNotes.forEach(note => {
        const key = note.substring(0, 50);
        reasonCounts[key] = (reasonCounts[key] || 0) + 1;
      });

      const topRejectionReasons = Object.entries(reasonCounts)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      setMetrics({
        totalCertified,
        totalRejected,
        totalPending,
        avgProcessingDays,
        approvalRate,
        topRejectionReasons,
        thisMonthCertified,
      });
    } catch (error) {
      logger.error('Error fetching certification metrics', { error });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Certifications (30j)</CardTitle>
            <Shield className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.thisMonthCertified}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total: {metrics.totalCertified}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux d'approbation</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.approvalRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.totalCertified} approuvés / {metrics.totalRejected} rejetés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temps moyen</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgProcessingDays.toFixed(1)} jours</div>
            <p className="text-xs text-muted-foreground mt-1">
              De la demande à l'approbation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalPending}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Demandes à traiter
            </p>
          </CardContent>
        </Card>
      </div>

      {metrics.topRejectionReasons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Top 3 des raisons de rejet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.topRejectionReasons.map((reason, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {reason.count}x
                    </Badge>
                    <span className="text-sm text-muted-foreground line-clamp-1">
                      {reason.reason}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CertificationStats;
