import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/services/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, Eye } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import LeaseCertificationReview from '@/components/admin/LeaseCertificationReview';
import ANSUTCertifiedBadge from '@/components/ui/ansut-certified-badge';

type Lease = {
  id: string;
  property_id: string;
  monthly_rent: number;
  status: string;
  lease_type: string;
  ansut_certified_at: string | null;
  certification_status: 'not_requested' | 'pending' | 'certified' | 'rejected';
  certification_requested_at: string | null;
  created_at: string;
  properties: {
    title: string;
  } | null;
  tenant: {
    full_name: string;
  } | null;
  landlord: {
    full_name: string;
  } | null;
};

const AdminLeases = () => {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeaseId, setSelectedLeaseId] = useState<string | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  useEffect(() => {
    fetchLeases();
  }, []);

  const fetchLeases = async () => {
    try {
      const { data, error } = await supabase
        .from('leases')
        .select(`
          id,
          property_id,
          monthly_rent,
          status,
          lease_type,
          ansut_certified_at,
          certification_status,
          certification_requested_at,
          created_at,
          properties:property_id (title),
          tenant:tenant_id (full_name),
          landlord:landlord_id (full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeases((data || []) as unknown as Lease[]);
    } catch (error) {
      logger.error('Error fetching leases', { error });
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les baux',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReviewLease = (leaseId: string) => {
    setSelectedLeaseId(leaseId);
    setReviewDialogOpen(true);
  };

  const certifyLease = async (leaseId: string) => {
    try {
      const { error } = await supabase
        .from('leases')
        .update({ 
          ansut_certified_at: new Date().toISOString(),
          status: 'active'
        })
        .eq('id', leaseId);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Bail certifié par l\'ANSUT',
      });

      fetchLeases();
    } catch (error) {
      logger.error('Error certifying lease', { error, leaseId });
      toast({
        title: 'Erreur',
        description: 'Impossible de certifier le bail',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'draft': 'secondary',
      'pending': 'secondary',
      'active': 'default',
      'terminated': 'outline',
    };

    const labels: Record<string, string> = {
      'draft': 'Brouillon',
      'pending': 'En attente',
      'active': 'Actif',
      'terminated': 'Terminé',
    };

    return <Badge variant={variants[status] || 'outline'}>{labels[status] || status}</Badge>;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestion des baux</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bien</TableHead>
              <TableHead>Propriétaire</TableHead>
              <TableHead>Locataire</TableHead>
              <TableHead>Loyer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Certification</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Aucun bail trouvé
                </TableCell>
              </TableRow>
            ) : (
              leases.map((lease) => (
                <TableRow key={lease.id}>
                  <TableCell className="font-medium">{lease.properties?.title || 'N/A'}</TableCell>
                  <TableCell>{lease.landlord?.full_name || 'N/A'}</TableCell>
                  <TableCell>{lease.tenant?.full_name || 'N/A'}</TableCell>
                  <TableCell>{lease.monthly_rent.toLocaleString()} FCFA</TableCell>
                  <TableCell className="capitalize">{lease.lease_type}</TableCell>
                  <TableCell>{getStatusBadge(lease.status)}</TableCell>
                  <TableCell>
                    <ANSUTCertifiedBadge 
                      status={lease.certification_status}
                      certifiedAt={lease.ansut_certified_at}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    {lease.certification_status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReviewLease(lease.id)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Examiner
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      {selectedLeaseId && (
        <LeaseCertificationReview
          leaseId={selectedLeaseId}
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          onStatusUpdated={fetchLeases}
        />
      )}
    </Card>
  );
};

export default AdminLeases;
