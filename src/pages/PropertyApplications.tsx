import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useRecommendations } from '@/hooks/useRecommendations';
import { usePropertyPermissions } from '@/hooks/usePropertyPermissions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { 
  ArrowLeft, CheckCircle2, XCircle, Clock, UserCircle, 
  FileText, TrendingUp, Eye, Award, Sparkles
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ApplicantPhoneDisplay } from '@/components/application/ApplicantPhoneDisplay';
import { logger } from '@/services/logger';
import { DynamicBreadcrumb } from '@/components/navigation/DynamicBreadcrumb';

type Application = {
  id: string;
  property_id: string;
  applicant_id: string;
  status: string;
  cover_letter: string;
  documents: any;
  created_at: string;
  application_score: number;
  recommendation_score?: number;
  recommendation_reasons?: string[];
  profiles: {
    full_name: string;
    phone: string | null;
    oneci_verified: boolean;
    cnam_verified: boolean;
    face_verified: boolean;
    avatar_url: string | null;
  };
};

type Property = {
  id: string;
  title: string;
  city: string;
  monthly_rent: number;
  owner_id: string;
};

const PropertyApplications = () => {
  const { propertyId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { hasAgencyPermission, activeMandates } = usePropertyPermissions();
  
  const [property, setProperty] = useState<Property | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'score'>('score');
  const [filterMatch, setFilterMatch] = useState<'all' | 'high' | 'good'>('all');
  const [isAgencyView, setIsAgencyView] = useState(false);
  const [canManageApps, setCanManageApps] = useState(false);

  const { recommendations, loading: recsLoading } = useRecommendations({
    type: 'tenants',
    propertyId: propertyId || undefined,
    autoFetch: true,
  });

  useEffect(() => {
    if (propertyId) {
      fetchData();
    }
  }, [propertyId]);

  const fetchData = async () => {
    try {
      const { data: propertyData, error: propError } = await supabase
        .from('properties')
        .select('id, title, city, monthly_rent, owner_id')
        .eq('id', propertyId)
        .single();

      if (propError) throw propError;
      
      // Check if user is owner or has agency permissions
      const isOwner = propertyData.owner_id === user?.id;
      const hasViewPerm = hasAgencyPermission(propertyId, propertyData.owner_id, 'can_view_applications');
      const hasManagePerm = hasAgencyPermission(propertyId, propertyData.owner_id, 'can_manage_applications');
      
      if (!isOwner && !hasViewPerm) {
        toast({
          title: 'Accès refusé',
          description: 'Vous n\'avez pas accès aux candidatures de ce bien',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }

      setIsAgencyView(!isOwner && hasViewPerm);
      setCanManageApps(isOwner || hasManagePerm);

      setProperty(propertyData);

      const { data: applicationsData, error: appError } = await supabase
        .from('rental_applications')
        .select(`
          *,
          profiles (
            full_name,
            phone,
            oneci_verified,
            cnam_verified,
            face_verified,
            avatar_url
          )
        `)
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      if (appError) throw appError;

      // Merge applications with recommendation scores
      const enrichedApplications = (applicationsData as any || []).map((app: Application) => {
        const rec = recommendations.find(r => r.id === app.applicant_id);
        return {
          ...app,
          recommendation_score: rec?.score || 0,
          recommendation_reasons: rec?.reasons || [],
        };
      });

      setApplications(enrichedApplications);
    } catch (error) {
      logger.logError(error, { context: 'PropertyApplications', action: 'fetchData', propertyId });
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationStatus = async (applicationId: string, status: string, note?: string) => {
    try {
      const { error } = await supabase
        .from('rental_applications')
        .update({ 
          status,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (error) throw error;

      const application = applications.find(app => app.id === applicationId);
      if (application) {
        await supabase.from('notifications').insert({
          user_id: application.applicant_id,
          type: status === 'approved' ? 'application_approved' : 'application_rejected',
          title: status === 'approved' ? 'Candidature approuvée !' : 'Candidature rejetée',
          message: status === 'approved' 
            ? `Votre candidature pour "${property?.title}" a été approuvée !`
            : `Votre candidature pour "${property?.title}" a été rejetée. ${note || ''}`,
          link: '/candidatures',
        });
      }

      toast({
        title: 'Mise à jour effectuée',
        description: `Candidature ${status === 'approved' ? 'approuvée' : 'rejetée'}`,
      });

      fetchData();
      setRejectDialogOpen(false);
      setRejectionNote('');
      setSelectedApplication(null);
    } catch (error: any) {
      logger.logError(error, { context: 'PropertyApplications', action: 'updateApplication', applicationId });
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleReject = (application: Application) => {
    setSelectedApplication(application);
    setRejectDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'pending': 'outline',
      'approved': 'default',
      'rejected': 'destructive',
    };

    const labels: Record<string, string> = {
      'pending': 'En attente',
      'approved': 'Approuvée',
      'rejected': 'Rejetée',
    };

    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const getScoreBadge = (score: number) => {
    if (score >= 70) return <Badge className="bg-green-500 text-white">Excellent</Badge>;
    if (score >= 50) return <Badge variant="secondary">Bon</Badge>;
    return <Badge variant="destructive">Faible</Badge>;
  };

  const getMatchBadge = (score: number) => {
    if (score >= 80) {
      return (
        <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white gap-1">
          <Sparkles className="h-3 w-3" />
          Highly Recommended
        </Badge>
      );
    }
    if (score >= 60) {
      return (
        <Badge variant="secondary" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Good Match
        </Badge>
      );
    }
    return null;
  };

  // Sort and filter applications
  const processedApps = [...applications]
    .filter(app => {
      if (filterMatch === 'all') return true;
      if (filterMatch === 'high') return (app.recommendation_score || 0) >= 80;
      if (filterMatch === 'good') return (app.recommendation_score || 0) >= 60;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'score') {
        return (b.recommendation_score || 0) - (a.recommendation_score || 0);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!property) {
    return <div>Bien non trouvé</div>;
  }

  const pendingApps = processedApps.filter(app => app.status === 'pending');
  const approvedApps = processedApps.filter(app => app.status === 'approved');
  const rejectedApps = processedApps.filter(app => app.status === 'rejected');

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8 pt-24 max-w-7xl">
        <DynamicBreadcrumb />
        <div className="mb-8">
          {isAgencyView && (
            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Vue Agence</strong> - Vous consultez les candidatures pour le compte du propriétaire.
                {canManageApps ? ' Vous pouvez gérer ces candidatures.' : ' Accès en lecture seule.'}
              </AlertDescription>
            </Alert>
          )}
          
          <Button
            variant="ghost" 
            onClick={() => navigate(`/property/${propertyId}`)}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au bien
          </Button>
          <h1 className="text-4xl font-bold mb-3 flex items-center gap-3">
            <UserCircle className="h-8 w-8 text-primary" />
            Candidatures
          </h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <p className="text-lg text-muted-foreground">{property.title}</p>
            <span className="text-muted-foreground hidden sm:inline">•</span>
            <p className="text-lg text-muted-foreground">{property.city}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <span className="text-3xl font-bold">{applications.length}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">En attente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-orange-500" />
                <span className="text-3xl font-bold">{pendingApps.length}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Approuvées</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
                <span className="text-3xl font-bold">{approvedApps.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Sort */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Trier par</label>
                <Select value={sortBy} onValueChange={(v: 'date' | 'score') => setSortBy(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="score">Score de compatibilité</SelectItem>
                    <SelectItem value="date">Date de candidature</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Filtrer par matching</label>
                <Select value={filterMatch} onValueChange={(v: 'all' | 'high' | 'good') => setFilterMatch(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les candidats</SelectItem>
                    <SelectItem value="high">Highly Recommended (80%+)</SelectItem>
                    <SelectItem value="good">Good Match (60%+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="all">Toutes ({processedApps.length})</TabsTrigger>
            <TabsTrigger value="pending">En attente ({pendingApps.length})</TabsTrigger>
            <TabsTrigger value="approved">Approuvées ({approvedApps.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejetées ({rejectedApps.length})</TabsTrigger>
          </TabsList>

          {[
            { value: 'all', apps: applications },
            { value: 'pending', apps: pendingApps },
            { value: 'approved', apps: approvedApps },
            { value: 'rejected', apps: rejectedApps },
          ].map(({ value, apps }) => (
            <TabsContent key={value} value={value} className="space-y-4">
              {apps.length === 0 ? (
                <Card className="p-12 text-center border-2">
                  <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground text-lg">Aucune candidature</p>
                </Card>
              ) : (
                apps.map((application) => (
                  <Card key={application.id} className="border-2 hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="grid md:grid-cols-[1fr,auto] gap-6">
                        <div className="space-y-4">
                          <div className="flex items-start gap-4">
                            <Avatar className="h-14 w-14">
                              <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                                {application.profiles.full_name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2 flex-wrap">
                                <h3 className="text-xl font-semibold">
                                  {application.profiles.full_name}
                                </h3>
                                {getStatusBadge(application.status)}
                                {application.recommendation_score && getMatchBadge(application.recommendation_score)}
                              </div>
                              <ApplicantPhoneDisplay applicantId={application.applicant_id} />
                              <p className="text-sm text-muted-foreground">
                                Candidature du {new Date(application.created_at).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {application.profiles.oneci_verified && (
                              <Badge variant="outline" className="rounded-full">
                                <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                                ONECI
                              </Badge>
                            )}
                            {application.profiles.cnam_verified && (
                              <Badge variant="outline" className="rounded-full">
                                <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                                CNAM
                              </Badge>
                            )}
                            {application.profiles.face_verified && (
                              <Badge variant="outline" className="rounded-full">
                                <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                                Visage
                              </Badge>
                            )}
                          </div>

                          <div className="space-y-2">
                            {application.application_score > 0 && (
                              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                                <TrendingUp className="h-5 w-5 text-primary" />
                                <span className="text-sm font-medium">Score locataire:</span>
                                <Badge variant="default" className="rounded-xl">
                                  {application.application_score}/100
                                </Badge>
                                {getScoreBadge(application.application_score)}
                              </div>
                            )}

                            {application.recommendation_score && application.recommendation_score > 0 && (
                              <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/20">
                                <Award className="h-5 w-5 text-primary" />
                                <span className="text-sm font-medium">Compatibilité:</span>
                                <Badge variant="default" className="rounded-xl bg-primary">
                                  {Math.round(application.recommendation_score)}%
                                </Badge>
                              </div>
                            )}

                            {application.recommendation_reasons && application.recommendation_reasons.length > 0 && (
                              <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
                                <p className="text-xs font-medium text-primary mb-2">POURQUOI CE CANDIDAT ?</p>
                                <ul className="text-sm space-y-1">
                                  {application.recommendation_reasons.map((reason, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                      <CheckCircle2 className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                                      <span>{reason}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          {application.cover_letter && (
                            <div className="p-4 bg-muted/30 rounded-xl">
                              <p className="text-xs font-medium text-muted-foreground mb-2">
                                LETTRE DE MOTIVATION
                              </p>
                              <p className="text-sm line-clamp-3">
                                {application.cover_letter}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-3 md:min-w-[200px]">
                          <Button
                            variant="outline"
                            onClick={() => navigate(`/candidatures?view=${application.id}`)}
                            className="rounded-xl h-11"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Voir détails
                          </Button>
                          
                          {application.status === 'pending' && canManageApps && (
                            <>
                              <Button
                                onClick={() => updateApplicationStatus(application.id, 'approved')}
                                className="rounded-xl h-11 bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Approuver
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => handleReject(application)}
                                className="rounded-xl h-11"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Rejeter
                              </Button>
                            </>
                          )}

                          {application.status === 'approved' && (
                            <Button
                              variant="outline"
                              onClick={async () => {
                                try {
                                  const startDate = new Date();
                                  const endDate = new Date();
                                  endDate.setFullYear(endDate.getFullYear() + 1);

                                  const { error } = await supabase.from('leases').insert({
                                    property_id: application.property_id,
                                    landlord_id: property.owner_id,
                                    tenant_id: application.applicant_id,
                                    monthly_rent: property.monthly_rent,
                                    lease_type: 'location_meublee',
                                    start_date: startDate.toISOString().split('T')[0],
                                    end_date: endDate.toISOString().split('T')[0],
                                    status: 'draft',
                                  });

                                  if (error) throw error;

                                  toast({
                                    title: 'Bail créé',
                                    description: 'Le bail a été créé avec succès',
                                  });

                                  navigate('/baux');
                                } catch (error: any) {
                                  toast({
                                    title: 'Erreur',
                                    description: error.message,
                                    variant: 'destructive',
                                  });
                                }
                              }}
                              className="rounded-xl h-11"
                            >
                              📄 Créer le bail
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>
      </main>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>Rejeter la candidature</DialogTitle>
            <DialogDescription>
              Vous pouvez ajouter une note pour expliquer le rejet au candidat (optionnel).
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Raison du rejet (optionnel)..."
            value={rejectionNote}
            onChange={(e) => setRejectionNote(e.target.value)}
            className="min-h-[120px] rounded-xl"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)} className="rounded-xl">
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedApplication && updateApplicationStatus(selectedApplication.id, 'rejected', rejectionNote)}
              className="rounded-xl"
            >
              Confirmer le rejet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default PropertyApplications;
