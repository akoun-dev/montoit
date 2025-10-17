import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { DynamicBreadcrumb } from '@/components/navigation/DynamicBreadcrumb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Eye, FileText } from 'lucide-react';
import ApplicationDetail from '@/components/application/ApplicationDetail';
import { ApplicationStatusTracker } from '@/components/application/ApplicationStatusTracker';
import { ApplicationsTableView } from '@/components/application/ApplicationsTableView';
import ViewToggle from '@/components/properties/ViewToggle';
import { logger } from '@/services/logger';

import type { ApplicationStatus } from '@/types';

type ApplicationDisplay = {
  id: string;
  property_id: string;
  applicant_id: string;
  status: ApplicationStatus;
  cover_letter: string | null;
  documents: any[];
  application_score: number | null;
  created_at: string;
  reviewed_at: string | null;
  updated_at: string;
  processing_deadline?: string | null;
  is_overdue?: boolean;
  auto_processed?: boolean;
  auto_action_type?: string | null;
  properties: {
    title: string;
    monthly_rent: number;
    city: string;
    owner_id: string;
    deposit_amount: number | null;
    charges_amount: number | null;
  };
  profiles: {
    full_name: string;
    phone: string | null;
    oneci_verified: boolean;
    cnam_verified: boolean;
  };
};

const Applications = () => {
  const { user, profile } = useAuth();
  const [applications, setApplications] = useState<ApplicationDisplay[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<ApplicationDisplay | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    if (user) {
      fetchApplications();
    }
  }, [user]);

  const fetchApplications = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('rental_applications')
        .select('*, processing_deadline, is_overdue, auto_processed, auto_action_type')
        .order('created_at', { ascending: false });

      // Si propriétaire, voir les candidatures sur ses biens
      if (profile?.user_type === 'proprietaire' || profile?.user_type === 'agence') {
        const { data: myProperties } = await supabase
          .from('properties')
          .select('id')
          .eq('owner_id', user.id);

        const propertyIds = myProperties?.map(p => p.id) || [];
        query = query.in('property_id', propertyIds);
      } else {
        // Si locataire, voir ses propres candidatures
        query = query.eq('applicant_id', user.id);
      }

      const { data: applicationsData, error } = await query;

      if (error) throw error;

      // Enrichir les données avec les infos des propriétés et profils
      const enrichedApplications = await Promise.all(
        (applicationsData || []).map(async (app: any) => {
          // Récupérer les infos de la propriété
          const { data: property } = await supabase
            .from('properties')
            .select('title, monthly_rent, city, owner_id, deposit_amount, charges_amount')
            .eq('id', app.property_id)
            .maybeSingle();

          // Récupérer les infos du candidat
          const { data: applicant } = await supabase
            .from('profiles')
            .select('full_name, phone, oneci_verified, cnam_verified')
            .eq('id', app.applicant_id)
            .maybeSingle();

          return {
            ...app,
            properties: property || { title: 'Propriété supprimée', monthly_rent: 0, city: 'N/A', owner_id: '', deposit_amount: null, charges_amount: null },
            profiles: applicant || { full_name: 'Utilisateur supprimé', phone: null, oneci_verified: false, cnam_verified: false },
          };
        })
      );

      setApplications(enrichedApplications);
    } catch (error) {
      logger.logError(error, { context: 'Applications', action: 'fetchApplications' });
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les candidatures',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationStatus = async (applicationId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('rental_applications')
        .update({ 
          status: newStatus,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (error) throw error;

      toast({
        title: 'Statut mis à jour',
        description: `Candidature ${newStatus === 'approved' ? 'approuvée' : 'rejetée'}`,
      });

      fetchApplications();
      setSelectedApplication(null);
    } catch (error) {
      logger.logError(error, { context: 'Applications', action: 'updateStatus', applicationId });
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour la candidature',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'pending': 'secondary',
      'approved': 'default',
      'rejected': 'destructive',
      'withdrawn': 'outline',
    };

    const labels: Record<string, string> = {
      'pending': 'En attente',
      'approved': 'Approuvée',
      'rejected': 'Rejetée',
      'withdrawn': 'Retirée',
    };

    return <Badge variant={variants[status] || 'outline'}>{labels[status] || status}</Badge>;
  };

  const isOwner = profile?.user_type === 'proprietaire' || profile?.user_type === 'agence';

  const filteredApplications = useMemo(() => {
    if (activeFilter === 'all') return applications;
    return applications.filter(a => a.status === activeFilter);
  }, [applications, activeFilter]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-6 pt-24">
        <div className="mb-10">
          <DynamicBreadcrumb />
          
          <h1 className="text-4xl font-bold mb-3 mt-6 flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            {isOwner ? 'Candidatures reçues' : 'Mes candidatures'}
          </h1>
          <p className="text-lg text-muted-foreground">
            {isOwner 
              ? 'Gérez les candidatures pour vos biens immobiliers' 
              : 'Suivez l\'état de vos candidatures locatives'}
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Tabs value={activeFilter} onValueChange={setActiveFilter} className="w-auto">
              <TabsList>
                <TabsTrigger value="all">Toutes ({applications.length})</TabsTrigger>
                <TabsTrigger value="pending">
                  En attente ({applications.filter(a => a.status === 'pending').length})
                </TabsTrigger>
                <TabsTrigger value="approved">
                  Approuvées ({applications.filter(a => a.status === 'approved').length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <ViewToggle 
              view={viewMode === 'cards' ? 'list' : 'table'} 
              onViewChange={(v) => setViewMode(v === 'list' ? 'cards' : 'table')}
              options={['list', 'table']}
            />
          </div>

          {viewMode === 'table' ? (
            <ApplicationsTableView
              applications={filteredApplications}
              onSelect={(app: ApplicationDisplay) => setSelectedApplication(app)}
              isOwner={isOwner}
            />
          ) : (
            <ApplicationsList
              applications={filteredApplications}
              onSelect={(app: ApplicationDisplay) => setSelectedApplication(app)}
              getStatusBadge={getStatusBadge}
              isOwner={isOwner}
            />
          )}
        </div>

        {/* Dialog pour ApplicationDetail */}
        <Dialog open={!!selectedApplication} onOpenChange={() => setSelectedApplication(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
            {selectedApplication && (
              <ApplicationDetail
                application={selectedApplication}
                onClose={() => setSelectedApplication(null)}
                onStatusUpdate={updateApplicationStatus}
                isOwner={isOwner}
              />
            )}
          </DialogContent>
        </Dialog>
      </main>

      <Footer />
    </div>
  );
};

const ApplicationsList = ({ 
  applications, 
  onSelect, 
  getStatusBadge,
  isOwner 
}: { 
  applications: ApplicationDisplay[];
  onSelect: (app: ApplicationDisplay) => void;
  getStatusBadge: (status: string) => JSX.Element;
  isOwner: boolean;
}) => {
  if (applications.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="space-y-4">
            <p className="text-muted-foreground text-lg">Aucune candidature pour le moment</p>
            {!isOwner && (
              <p className="text-sm text-muted-foreground">
                Parcourez nos annonces et déposez votre première candidature !
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {applications.map((application) => (
        <div key={application.id} className="space-y-4">
          {!isOwner && (
            <ApplicationStatusTracker
              status={application.status}
              createdAt={application.created_at}
              reviewedAt={application.reviewed_at}
              processingDeadline={application.processing_deadline}
              isOverdue={application.is_overdue}
              autoProcessed={application.auto_processed}
            />
          )}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">
                    {application.properties?.title || 'Propriété non disponible'}
                  </CardTitle>
                  <CardDescription>
                    {isOwner 
                      ? `Candidat: ${application.profiles?.full_name || 'Inconnu'}`
                      : application.properties?.city || 'N/A'
                    }
                  </CardDescription>
                </div>
                {getStatusBadge(application.status)}
              </div>
            </CardHeader>
            <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">
                    Loyer: {application.properties?.monthly_rent?.toLocaleString() || '0'} FCFA
                  </span>
                  {isOwner && (
                    <div className="flex gap-2">
                      {application.profiles?.oneci_verified && (
                        <Badge variant="outline" className="text-xs">ONECI ✓</Badge>
                      )}
                      {application.profiles?.cnam_verified && (
                        <Badge variant="outline" className="text-xs">CNAM ✓</Badge>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-muted-foreground">
                  Déposée le {new Date(application.created_at).toLocaleDateString('fr-FR')}
                </div>
                {application.application_score > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Score:</span>
                    <Badge variant="default">{application.application_score}/100</Badge>
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelect(application)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Voir détails
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      ))}
    </div>
  );
};

export default Applications;
