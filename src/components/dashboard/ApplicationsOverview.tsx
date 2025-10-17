import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/services/logger';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle, XCircle, Eye, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface ApplicationWithProperty {
  id: string;
  status: string;
  created_at: string;
  application_score: number;
  property: {
    id: string;
    title: string;
    address: string;
    city: string;
    main_image: string | null;
    monthly_rent: number;
  };
}

const STATUS_CONFIG = {
  pending: {
    label: 'En attente',
    variant: 'outline' as const,
    icon: Clock,
    color: 'text-yellow-600'
  },
  under_review: {
    label: 'Sous examen',
    variant: 'secondary' as const,
    icon: Eye,
    color: 'text-blue-600'
  },
  accepted: {
    label: 'Acceptée',
    variant: 'default' as const,
    icon: CheckCircle,
    color: 'text-green-600'
  },
  rejected: {
    label: 'Refusée',
    variant: 'destructive' as const,
    icon: XCircle,
    color: 'text-red-600'
  }
};

export const ApplicationsOverview = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [applications, setApplications] = useState<ApplicationWithProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (user) {
      fetchApplications();
    }
  }, [user]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('rental_applications')
        .select(`
          id,
          status,
          created_at,
          application_score,
          property:properties (
            id,
            title,
            address,
            city,
            main_image,
            monthly_rent
          )
        `)
        .eq('applicant_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data as any);
    } catch (error) {
      logger.logError(error, { context: 'ApplicationsOverview', action: 'fetch' });
      toast({
        title: 'Erreur',
        description: 'Impossible de charger vos candidatures',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (applicationId: string) => {
    try {
      const { error } = await supabase
        .from('rental_applications')
        .update({ status: 'withdrawn' })
        .eq('id', applicationId);

      if (error) throw error;

      toast({
        title: 'Candidature retirée',
        description: 'Votre candidature a été retirée avec succès'
      });

      fetchApplications();
    } catch (error) {
      logger.logError(error, { context: 'ApplicationsOverview', action: 'withdraw' });
      toast({
        title: 'Erreur',
        description: 'Impossible de retirer la candidature',
        variant: 'destructive'
      });
    }
  };

  const filteredApplications = activeTab === 'all' 
    ? applications 
    : applications.filter(app => app.status === activeTab);

  const getStatusCount = (status: string) => 
    applications.filter(app => app.status === status).length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mes candidatures</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Chargement...</div>
        </CardContent>
      </Card>
    );
  }

  if (applications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mes candidatures</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Aucune candidature pour le moment
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mes candidatures</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="all">
              Toutes ({applications.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              En attente ({getStatusCount('pending')})
            </TabsTrigger>
            <TabsTrigger value="under_review">
              Examen ({getStatusCount('under_review')})
            </TabsTrigger>
            <TabsTrigger value="accepted">
              Acceptées ({getStatusCount('accepted')})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Refusées ({getStatusCount('rejected')})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {filteredApplications.map((application) => {
              const config = STATUS_CONFIG[application.status as keyof typeof STATUS_CONFIG];
              const StatusIcon = config?.icon || Clock;

              return (
                <div
                  key={application.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {/* Property Image */}
                  <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                    {application.property.main_image ? (
                      <img
                        src={application.property.main_image}
                        alt={application.property.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Eye className="h-8 w-8" />
                      </div>
                    )}
                  </div>

                  {/* Property Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{application.property.title}</h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {application.property.address}, {application.property.city}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="font-medium">
                        {application.property.monthly_rent.toLocaleString()} FCFA/mois
                      </span>
                      <span className="text-muted-foreground">
                        {format(new Date(application.created_at), 'dd MMM yyyy', { locale: fr })}
                      </span>
                    </div>
                  </div>

                  {/* Status & Score */}
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={config?.variant || 'outline'} className="gap-1">
                      <StatusIcon className={`h-3 w-3 ${config?.color}`} />
                      {config?.label || application.status}
                    </Badge>
                    {application.application_score > 0 && (
                      <span className="text-xs text-muted-foreground">
                        Score: {application.application_score}%
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/application/${application.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        Détails
                      </Link>
                    </Button>
                    
                    {application.status === 'pending' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Retirer la candidature ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action est irréversible. Votre candidature sera définitivement retirée.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleWithdraw(application.id)}>
                              Confirmer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              );
            })}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
