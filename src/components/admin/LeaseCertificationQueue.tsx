import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, FileText, MapPin, User } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import LeaseCertificationReview from '@/components/admin/LeaseCertificationReview';
import { Skeleton } from '@/components/ui/skeleton';
import { logger } from '@/services/logger';

interface LeaseCertificationQueueProps {
  status?: 'pending' | 'in_review' | 'certified' | 'rejected';
}

interface PendingLease {
  id: string;
  property_id: string;
  landlord_id: string;
  tenant_id: string;
  monthly_rent: number;
  start_date: string;
  certification_requested_at: string;
  certification_notes?: string;
  property: {
    title: string;
    address: string;
    city: string;
  };
  landlord: {
    full_name: string;
  };
  tenant: {
    full_name: string;
  };
}

const LeaseCertificationQueue = ({ status = 'pending' }: LeaseCertificationQueueProps) => {
  const [pendingLeases, setPendingLeases] = useState<PendingLease[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeaseId, setSelectedLeaseId] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  const fetchPendingLeases = async () => {
    try {
      const { data, error } = await supabase
        .from('leases')
        .select(`
          id,
          property_id,
          landlord_id,
          tenant_id,
          monthly_rent,
          start_date,
          certification_requested_at,
          certification_notes,
          property:properties (
            title,
            address,
            city
          ),
          landlord:profiles!leases_landlord_id_fkey (
            full_name
          ),
          tenant:profiles!leases_tenant_id_fkey (
            full_name
          )
        `)
        .eq('certification_status', status)
        .order('certification_requested_at', { ascending: true });

      if (error) throw error;
      setPendingLeases(data as any || []);
    } catch (error) {
      logger.error('Error fetching leases for certification', { error });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingLeases();

    // Real-time subscription for lease updates
    const channel = supabase
      .channel(`certification-queue-${status}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leases',
          filter: `certification_status=eq.${status}`
        },
        () => {
          fetchPendingLeases();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [status]);

  const handleReviewClick = (leaseId: string) => {
    setSelectedLeaseId(leaseId);
    setReviewOpen(true);
  };

  const handleReviewClose = () => {
    setReviewOpen(false);
    setSelectedLeaseId(null);
    fetchPendingLeases();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'en attente';
      case 'in_review': return 'en révision';
      case 'certified': return 'certifié';
      case 'rejected': return 'rejeté';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Baux {getStatusLabel(status)}</h2>
          <p className="text-muted-foreground">
            {pendingLeases.length} {pendingLeases.length === 1 ? 'bail' : 'baux'} {getStatusLabel(status)}
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {pendingLeases.length}
        </Badge>
      </div>

      {pendingLeases.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Aucun bail en attente de certification</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pendingLeases.map((lease) => (
            <Card key={lease.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {lease.property.title}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <MapPin className="h-4 w-4" />
                      {lease.property.address}, {lease.property.city}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">
                    {lease.monthly_rent.toLocaleString()} FCFA/mois
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Propriétaire</p>
                      <p className="font-medium">{lease.landlord.full_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Locataire</p>
                      <p className="font-medium">{lease.tenant.full_name}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Demandé le {format(new Date(lease.certification_requested_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                  </div>
                  <Button onClick={() => handleReviewClick(lease.id)}>
                    Examiner
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedLeaseId && (
        <LeaseCertificationReview
          leaseId={selectedLeaseId}
          open={reviewOpen}
          onClose={handleReviewClose}
        />
      )}
    </div>
  );
};

export { LeaseCertificationQueue };
export default LeaseCertificationQueue;
