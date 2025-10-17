import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { AgencyMandate } from '@/types/admin';
import { useQuery } from '@tanstack/react-query';

import { useDocumentHead } from '@/hooks/useDocumentHead';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Heart, MapPin, Bed, Bath, Maximize, Home, CheckCircle2, 
  ArrowLeft, MessageCircle, Calendar, DollarSign, Edit, Users,
  Eye, Star, FileText, TrendingUp, Clock, Lock, ExternalLink, Building2, Info
} from 'lucide-react';
import { getPropertyStatusLabel } from '@/constants';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from '@/hooks/use-toast';
import { RecommendationsSection } from '@/components/recommendations/RecommendationsSection';
import { MediaGallery } from '@/components/property/MediaGallery';
import { LocationSection } from '@/components/property/LocationSection';
import { VerificationGuard } from '@/components/application/VerificationGuard';
import { GuestContactForm } from '@/components/messaging/GuestContactForm';
import { TitleDeedSection } from '@/components/property/TitleDeedSection';
import { WorkStatusSection } from '@/components/property/WorkStatusSection';
import { logger } from '@/services/logger';
import { sanitizePropertyDescription, sanitizeText } from '@/lib/sanitize';
import type { Property, Application, PropertyStats } from '@/types';

interface PropertyOwner {
  id: string;
  full_name: string;
  user_type: string;
  phone: string | null;
}

interface ApplicationDisplay extends Application {
  profiles: {
    full_name: string;
    phone: string | null;
  };
  user_verifications: {
    tenant_score: number | null;
    oneci_status: string;
    cnam_status: string;
  }[];
}

const PropertyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canAccessAdminDashboard } = usePermissions();
  const { toggleFavorite, isFavorite } = useFavorites();
  const [property, setProperty] = useState<Property | null>(null);
  const [owner, setOwner] = useState<PropertyOwner | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [applications, setApplications] = useState<ApplicationDisplay[]>([]);
  const [stats, setStats] = useState<PropertyStats | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [agencyMandate, setAgencyMandate] = useState<AgencyMandate | null>(null);

  const isOwner = user?.id === property?.owner_id;

  // Set document head with meta tags - MUST be called before any conditional returns
  useDocumentHead({
    title: property ? `${property.title} - ${property.city} | Mon Toit` : 'Bien Immobilier | Mon Toit',
    description: property?.description?.substring(0, 155) || `${property?.property_type || 'Bien'} à ${property?.city || 'Abidjan'} - ${property?.monthly_rent ? property.monthly_rent.toLocaleString('fr-FR') + ' FCFA/mois' : 'Prix sur demande'}`,
    ogTitle: property ? `${property.title} - ${property.city}` : 'Bien Immobilier',
    ogDescription: property?.description?.substring(0, 200),
    ogImage: property?.main_image || property?.images?.[0] || 'https://mon-toit.lovable.app/placeholder.svg',
    ogUrl: property ? `https://mon-toit.lovable.app/properties/${property.id}` : 'https://mon-toit.lovable.app',
    twitterCard: 'summary_large_image'
  });

  useEffect(() => {
    if (id) {
      fetchPropertyDetails();
      fetchAgencyMandate();
      if (isOwner) {
        fetchApplications();
        fetchStats();
      }
    }
  }, [id, isOwner]);

  const fetchAgencyMandate = async () => {
    if (!id) return;
    
    const { data } = await supabase
      .from('agency_mandates')
      .select('*, profiles!agency_mandates_agency_id_fkey(full_name, phone)')
      .eq('property_id', id)
      .eq('status', 'active')
      .maybeSingle();
    
    setAgencyMandate(data);
  };

  const fetchPropertyDetails = async () => {
    // Validate UUID before query
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
      setLoading(false);
      return; // Show "Bien introuvable"
    }

    try {
      const { data: propertyData, error: propertyError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .maybeSingle(); // Use maybeSingle() instead of single()

      if (propertyError) throw propertyError;
      
      if (!propertyData) {
        // Property doesn't exist (deleted or never existed)
        setLoading(false);
        return; // Just show "Bien introuvable", no toast
      }

      // Vérifier si bien loué ET utilisateur n'est pas le propriétaire
      if (
        propertyData.status === 'loué' && 
        propertyData.owner_id !== user?.id &&
        !canAccessAdminDashboard
      ) {
        toast({
          title: "Bien non disponible",
          description: "Ce bien n'est plus disponible à la location.",
          variant: "destructive"
        });
        navigate('/recherche');
        return;
      }

      setProperty(propertyData);
      setSelectedImage(propertyData.main_image);

      // Fetch owner details
      const { data: ownerData, error: ownerError } = await supabase
        .from('profiles')
        .select('id, full_name, user_type, phone')
        .eq('id', propertyData.owner_id)
        .maybeSingle(); // Also maybeSingle() here

      if (ownerError) throw ownerError;
      
      if (ownerData) {
        setOwner(ownerData);
      }
    } catch (error) {
      // Toast error ONLY for technical errors
      logger.error('Error fetching property details', { error, propertyId: id });
      toast({
        title: "Erreur technique",
        description: "Impossible de charger les détails du bien. Veuillez réessayer plus tard.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('rental_applications')
        .select(`
          id,
          applicant_id,
          status,
          created_at,
          application_score,
          profiles:applicant_id(full_name, phone)
        `)
        .eq('property_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch user verifications separately
      if (data) {
        const applicationsWithVerifications = await Promise.all(
          data.map(async (app: any) => {
            const { data: verificationData } = await supabase
              .from('user_verifications')
              .select('tenant_score, oneci_status, cnam_status')
              .eq('user_id', app.applicant_id)
              .single();

            return {
              ...app,
              user_verifications: verificationData ? [verificationData] : [],
            };
          })
        );
        setApplications(applicationsWithVerifications as ApplicationDisplay[]);
      }
    } catch (error) {
      logger.error('Error fetching applications', { error, propertyId: id });
    }
  };

  const fetchStats = async () => {
    try {
      // Get favorites count
      const { count: favCount } = await supabase
        .from('user_favorites')
        .select('*', { count: 'exact', head: true })
        .eq('property_id', id);

      // Get applications count
      const { count: appCount } = await supabase
        .from('rental_applications')
        .select('*', { count: 'exact', head: true })
        .eq('property_id', id);

      // Get property view count
      const { data: propertyData } = await supabase
        .from('properties')
        .select('view_count')
        .eq('id', id)
        .single();

      setStats({
        views: propertyData?.view_count || 0,
        favorites: favCount || 0,
        applications: appCount || 0,
        conversionRate: 0,
        view_count: propertyData?.view_count || 0,
        favorites_count: favCount || 0,
        applications_count: appCount || 0,
      });
    } catch (error) {
      logger.error('Error fetching property stats', { error, propertyId: id });
    }
  };

  const handleStatusChange = async () => {
    if (!newStatus || !property) return;

    try {
      const { error } = await supabase
        .from('properties')
        .update({ status: newStatus })
        .eq('id', property.id);

      if (error) throw error;

      setProperty({ ...property, status: newStatus });
      setStatusDialogOpen(false);
      toast({
        title: 'Succès',
        description: 'Statut mis à jour avec succès',
      });
    } catch (error) {
      logger.error('Error updating property status', { error, propertyId: property.id, newStatus });
      toast({
        title: 'Erreur',
        description: 'Erreur lors de la mise à jour du statut',
        variant: 'destructive',
      });
    }
  };

  const handleContact = () => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour contacter le propriétaire",
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }
    // Navigate to messaging with owner
    navigate(`/messages?recipient=${property?.owner_id}`);
  };

  const handleApply = () => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour postuler",
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }
    navigate(`/application/${property?.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Bien introuvable</h1>
          <Button asChild>
            <Link to="/recherche">Retour à la recherche</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const allImages = [
    property.main_image,
    ...(property.images || [])
  ].filter(Boolean) as string[];

  const favorite = isFavorite(property.id);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 pt-24">
        <div className="max-w-7xl mx-auto">
          {/* Back button */}
          <Button variant="ghost" className="mb-4" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Images and main content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Multimedia Gallery */}
              <div className="relative">
                <MediaGallery
                  propertyId={property.id}
                  images={allImages}
                  videoUrl={property.video_url || undefined}
                  virtualTourUrl={property.virtual_tour_url || undefined}
                  panoramicImages={Array.isArray(property.panoramic_images) ? property.panoramic_images : []}
                  floorPlans={Array.isArray(property.floor_plans) ? property.floor_plans : []}
                />
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute top-4 right-4 z-10"
                  onClick={() => toggleFavorite(property.id)}
                >
                  <Heart className={`h-5 w-5 ${favorite ? 'fill-current text-destructive' : ''}`} />
                </Button>
                <Badge 
                  className={`absolute top-4 left-4 z-10 flex items-center gap-1 ${
                    property.status === 'disponible' 
                      ? 'bg-green-500 hover:bg-green-600 text-white' 
                      : property.status === 'en_negociation'
                      ? 'bg-orange-500 hover:bg-orange-600 text-white'
                      : 'bg-gray-400 hover:bg-gray-500 text-white'
                  }`}
                >
                  {property.status === 'en_negociation' && <Clock className="h-3 w-3" />}
                  {property.status === 'loué' && <Lock className="h-3 w-3" />}
                  {getPropertyStatusLabel(property.status)}
                </Badge>
              </div>

              {/* Agency Management Info */}
              {agencyMandate && (
                <Alert>
                  <Building2 className="h-4 w-4" />
                  <AlertTitle>Géré par une agence</AlertTitle>
                  <AlertDescription>
                    <p className="mb-2">
                      Ce bien est actuellement géré par une agence immobilière
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge variant="secondary">
                        {agencyMandate.mandate_type === 'location' ? 'Location' : 
                         agencyMandate.mandate_type === 'gestion_complete' ? 'Gestion complète' : 'Vente'}
                      </Badge>
                      {agencyMandate.commission_rate && (
                        <Badge variant="outline">Commission: {agencyMandate.commission_rate}%</Badge>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Description */}
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="text-muted-foreground whitespace-pre-line"
                    dangerouslySetInnerHTML={{
                      __html: sanitizePropertyDescription(property.description) || 'Aucune description disponible.'
                    }}
                  />
                </CardContent>
              </Card>

              {/* Characteristics */}
              <Card>
                <CardHeader>
                  <CardTitle>Caractéristiques</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Home className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Type</p>
                        <p className="font-medium">{property.property_type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Maximize className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Surface</p>
                        <p className="font-medium">{property.surface_area || 'N/A'} m²</p>
                      </div>
                    </div>
                <div className="flex items-center gap-2">
                  <Bed className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Chambres</p>
                    <p className="font-medium">
                      {property.bedrooms === 0 
                        ? 'Studio (0 chambre séparée)' 
                        : property.bedrooms
                      }
                    </p>
                  </div>
                </div>
                    <div className="flex items-center gap-2">
                      <Bath className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Salles de bain</p>
                        <p className="font-medium">{property.bathrooms}</p>
                      </div>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="flex flex-wrap gap-2">
                    {property.is_furnished && (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Meublé
                      </Badge>
                    )}
                    {property.has_ac && (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Climatisation
                      </Badge>
                    )}
                    {property.has_parking && (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Parking
                      </Badge>
                    )}
                    {property.has_garden && (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Jardin
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Location */}
              {property.latitude && property.longitude && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Localisation
                      </CardTitle>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        asChild
                      >
                        <a 
                          href={`https://maps.google.com/?q=${property.latitude},${property.longitude}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="gap-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Google Maps
                        </a>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <LocationSection 
                      propertyId={property.id}
                      latitude={property.latitude}
                      longitude={property.longitude}
                      city={property.city}
                      address={property.address}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Work Status Section */}
              <WorkStatusSection
                workStatus={property.work_status || 'aucun_travail'}
                workDescription={property.work_description}
                workImages={Array.isArray(property.work_images) ? property.work_images : []}
                workEstimatedCost={property.work_estimated_cost}
                workEstimatedDuration={property.work_estimated_duration}
                workStartDate={property.work_start_date}
              />

              {/* Title Deed Section */}
              <TitleDeedSection 
                propertyId={property.id}
                titleDeedUrl={property.title_deed_url}
                ownerId={property.owner_id}
              />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Owner actions */}
              {isOwner && (
                <Card className="border-primary">
                  <CardHeader>
                    <CardTitle>Actions propriétaire</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full gap-2" 
                      onClick={() => navigate(`/biens/${property.id}/modifier`)}
                    >
                      <Edit className="h-4 w-4" />
                      Modifier ce bien
                    </Button>
                    
                    <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Changer le statut
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Changer le statut du bien</DialogTitle>
                          <DialogDescription>
                            Sélectionnez le nouveau statut pour ce bien
                          </DialogDescription>
                        </DialogHeader>
                        <Select value={newStatus} onValueChange={setNewStatus}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un statut" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="disponible">Disponible</SelectItem>
                            <SelectItem value="loué">Loué</SelectItem>
                            <SelectItem value="retiré">Retiré</SelectItem>
                          </SelectContent>
                        </Select>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
                            Annuler
                          </Button>
                          <Button onClick={handleStatusChange}>
                            Confirmer
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              )}

              {/* Statistics for owner */}
              {isOwner && stats && (
                <Card>
                  <CardHeader>
                    <CardTitle>Statistiques</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Eye className="h-4 w-4" />
                        <span className="text-sm">Vues</span>
                      </div>
                      <span className="font-semibold">{stats.view_count}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Star className="h-4 w-4" />
                        <span className="text-sm">Favoris</span>
                      </div>
                      <span className="font-semibold">{stats.favorites_count}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">Candidatures</span>
                      </div>
                      <span className="font-semibold">{stats.applications_count}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Price card */}
              <Card>
                <CardHeader>
                  <h1 className="text-3xl font-bold">{property.title}</h1>
                  <p className="text-3xl font-bold text-primary mt-2">
                    {property.monthly_rent ? property.monthly_rent.toLocaleString('fr-FR') : 'N/A'} FCFA
                    <span className="text-sm text-muted-foreground font-normal">/mois</span>
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {property.deposit_amount && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Caution</span>
                      <span className="font-medium">{property.deposit_amount.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                  )}

                  <Separator />

                  {!isOwner && !user && property.status === 'disponible' && (
                    <div className="space-y-2">
                      <Button asChild size="lg" className="w-full gap-2">
                        <Link to="/auth">
                          <Users className="h-5 w-5" />
                          Créer un compte pour postuler
                        </Link>
                      </Button>
                      <p className="text-xs text-center text-muted-foreground">
                        Inscription gratuite en 2 minutes
                      </p>
                    </div>
                  )}
                  
                  {!isOwner && user && (
                    <div className="space-y-2">
                      <Button className="w-full gap-2" onClick={handleContact}>
                        <MessageCircle className="h-4 w-4" />
                        Contacter le propriétaire
                      </Button>
                      {property.status === 'disponible' && (
                        <VerificationGuard propertyId={property.id}>
                          <Button variant="outline" className="w-full gap-2">
                            <Calendar className="h-4 w-4" />
                            Postuler
                          </Button>
                        </VerificationGuard>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Guest Contact Form (for non-authenticated users) */}
              {!isOwner && !user && property.status === 'disponible' && owner && (
                <GuestContactForm 
                  propertyId={property.id}
                  ownerId={owner.id}
                  propertyTitle={property.title}
                />
              )}

              {/* Owner card */}
              {owner && !isOwner && (
                <Card>
                  <CardHeader>
                    <CardTitle>Propriétaire</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>
                          {owner.full_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{sanitizeText(owner.full_name)}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {sanitizeText(owner.user_type)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Applications for owner */}
              {isOwner && applications.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Candidatures ({applications.length})
                    </CardTitle>
                    <CardDescription>
                      Liste des candidats pour ce bien
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {applications.slice(0, 5).map((app) => (
                        <div key={app.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">{sanitizeText(app.profiles.full_name)}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={app.status === 'pending' ? 'secondary' : app.status === 'approved' ? 'default' : 'destructive'}>
                                {app.status === 'pending' ? 'En attente' : app.status === 'approved' ? 'Approuvé' : 'Rejeté'}
                              </Badge>
                              {app.user_verifications[0]?.tenant_score && (
                                <Badge variant="outline">
                                  Score: {app.user_verifications[0].tenant_score}/100
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => navigate(`/candidatures`)}
                          >
                            Voir
                          </Button>
                        </div>
                      ))}
                      {applications.length > 5 && (
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => navigate(`/candidatures`)}
                        >
                          Voir toutes les candidatures
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Info card */}
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Publié le {new Date(property.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Similar Properties Section */}
          {!isOwner && user && (
            <div className="mt-12">
              <RecommendationsSection
                userId={user.id}
                type="properties"
                limit={4}
                title="Biens similaires"
              />
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PropertyDetail;
