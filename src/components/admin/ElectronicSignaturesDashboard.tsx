import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';
import { DataTable } from './DataTable';
import { logger } from '@/services/logger';

interface SignatureMetrics {
  totalCertificates: number;
  activeCertificates: number;
  expiringSoon: number;
  totalSignatures: number;
  successfulSignatures: number;
  failedSignatures: number;
  successRate: number;
  avgProcessingTime: number;
}

interface RecentSignature {
  id: string;
  lease_id: string;
  user_id: string;
  operation_id: string;
  signature_type: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export const ElectronicSignaturesDashboard = () => {
  const [metrics, setMetrics] = useState<SignatureMetrics>({
    totalCertificates: 0,
    activeCertificates: 0,
    expiringSoon: 0,
    totalSignatures: 0,
    successfulSignatures: 0,
    failedSignatures: 0,
    successRate: 0,
    avgProcessingTime: 0
  });
  const [recentSignatures, setRecentSignatures] = useState<RecentSignature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
    fetchRecentSignatures();
  }, []);

  const fetchMetrics = async () => {
    try {
      // Certificates
      const { count: totalCerts } = await supabase
        .from('digital_certificates')
        .select('*', { count: 'exact', head: true });

      const { count: activeCerts } = await supabase
        .from('digital_certificates')
        .select('*', { count: 'exact', head: true })
        .eq('certificate_status', 'active');

      const expiringDate = new Date();
      expiringDate.setDate(expiringDate.getDate() + 30);
      
      const { count: expiring } = await supabase
        .from('digital_certificates')
        .select('*', { count: 'exact', head: true })
        .eq('certificate_status', 'active')
        .lt('expires_at', expiringDate.toISOString());

      // Signatures
      const { count: totalSigs } = await supabase
        .from('electronic_signature_logs')
        .select('*', { count: 'exact', head: true });

      const { count: successSigs } = await supabase
        .from('electronic_signature_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      const { count: failedSigs } = await supabase
        .from('electronic_signature_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed');

      // Average processing time (simplified)
      const avgTime = 45; // TODO: Calculate from actual data

      setMetrics({
        totalCertificates: totalCerts || 0,
        activeCertificates: activeCerts || 0,
        expiringSoon: expiring || 0,
        totalSignatures: totalSigs || 0,
        successfulSignatures: successSigs || 0,
        failedSignatures: failedSigs || 0,
        successRate: totalSigs ? ((successSigs || 0) / totalSigs) * 100 : 0,
        avgProcessingTime: avgTime
      });
    } catch (error) {
      logger.error('Error fetching signature metrics', { error });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentSignatures = async () => {
    const { data } = await supabase
      .from('electronic_signature_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setRecentSignatures(data);
    }
  };

  const columns: any[] = [
    {
      header: 'Type',
      accessorKey: 'signature_type',
      cell: ({ row }: any) => (
        <Badge variant="outline">
          {row.original.signature_type === 'landlord' ? 'Propriétaire' : 'Locataire'}
        </Badge>
      )
    },
    {
      header: 'Statut',
      accessorKey: 'status',
      cell: ({ row }: any) => {
        const status = row.original.status;
        return (
          <Badge variant={
            status === 'completed' ? 'default' :
            status === 'failed' ? 'destructive' :
            'secondary'
          }>
            {status === 'completed' ? 'Complété' :
             status === 'failed' ? 'Échoué' :
             status === 'in_progress' ? 'En cours' : 'Initié'}
          </Badge>
        );
      }
    },
    {
      header: 'Date',
      accessorKey: 'created_at',
      cell: ({ row }: any) => new Date(row.original.created_at).toLocaleDateString('fr-FR')
    }
  ];

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Certificats Actifs</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeCertificates}</div>
            <p className="text-xs text-muted-foreground">
              sur {metrics.totalCertificates} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de Succès</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics.successfulSignatures} / {metrics.totalSignatures} signatures
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Certificats Expirant</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.expiringSoon}</div>
            <p className="text-xs text-muted-foreground">
              dans les 30 prochains jours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Échecs</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.failedSignatures}</div>
            <p className="text-xs text-muted-foreground">
              signatures échouées
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Signatures Récentes</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable 
            columns={columns}
            data={recentSignatures}
          />
        </CardContent>
      </Card>
    </div>
  );
};
