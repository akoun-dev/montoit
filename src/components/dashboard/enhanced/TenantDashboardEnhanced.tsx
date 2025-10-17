import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Home,
  FileText,
  Heart,
  Calendar,
  Bell,
  TrendingUp,
  MapPin,
  DollarSign,
  Star,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  Settings
} from 'lucide-react';
import { MotionDiv } from '@/components/ui/motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useFavorites } from '@/hooks/useFavorites';
import { useApplications } from '@/hooks/useApplications';

interface LeaseStatus {
  id: string;
  property: string;
  address: string;
  status: 'active' | 'pending' | 'expiring';
  rent: number;
  nextPayment: string;
  daysUntilExpiry: number;
}

interface Application {
  id: string;
  property: string;
  status: 'pending' | 'accepted' | 'rejected';
  submittedDate: string;
  lastUpdate: string;
}

interface SavedSearch {
  id: string;
  query: string;
  filters: string[];
  lastRun: string;
  newResults: number;
}

interface NeighborhoodGuide {
  name: string;
  rating: number;
  transportScore: number;
  amenitiesScore: number;
  safetyScore: number;
  averageRent: number;
  description: string;
}

export const TenantDashboardEnhanced: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { favorites } = useFavorites();
  const { applications } = useApplications();

  const [leaseStatuses, setLeaseStatuses] = useState<LeaseStatus[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [neighborhoodGuides, setNeighborhoodGuides] = useState<NeighborhoodGuide[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data - in real app, fetch from API
  useEffect(() => {
    setLeaseStatuses([
      {
        id: '1',
        property: 'Appartement T3 Cocody',
        address: 'Rue des Jardins, Cocody',
        status: 'active',
        rent: 250000,
        nextPayment: '2024-11-01',
        daysUntilExpiry: 89
      }
    ]);

    setSavedSearches([
      {
        id: '1',
        query: 'Appartement 2 chambres Cocody',
        filters: ['2 chambres', 'Cocody', 'Moins de 300k'],
        lastRun: '2024-10-15',
        newResults: 3
      }
    ]);

    setNeighborhoodGuides([
      {
        name: 'Cocody',
        rating: 4.5,
        transportScore: 4.2,
        amenitiesScore: 4.7,
        safetyScore: 4.8,
        averageRent: 280000,
        description: 'Quartier résidentiel huppé avec nombreuses écoles internationales'
      },
      {
        name: 'Marcory',
        rating: 4.2,
        transportScore: 4.8,
        amenitiesScore: 4.3,
        safetyScore: 4.0,
        averageRent: 180000,
        description: 'Zone commerciale très animée, idéale pour les jeunes professionnels'
      }
    ]);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-status-success text-status-success-foreground';
      case 'pending':
        return 'bg-status-warning text-status-warning-foreground';
      case 'expiring':
        return 'bg-status-danger text-status-danger-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'expiring':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <MotionDiv
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-6 border border-primary/20"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              Bienvenue, {profile?.full_name || 'Cher locataire'} 👋
            </h1>
            <p className="text-muted-foreground">
              Gérez vos locations et trouvez votre prochain logement idéal
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Search className="h-4 w-4 mr-2" />
              Rechercher
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Préférences
            </Button>
          </div>
        </div>
      </MotionDiv>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Aperçu</TabsTrigger>
          <TabsTrigger value="leases">Mes Baux</TabsTrigger>
          <TabsTrigger value="applications">Candidatures</TabsTrigger>
          <TabsTrigger value="discovery">Découverte</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MotionDiv
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Home className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{leaseStatuses.length}</p>
                      <p className="text-sm text-muted-foreground">Baux actifs</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </MotionDiv>

            <MotionDiv
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-status-warning/10 rounded-lg">
                      <FileText className="h-5 w-5 text-status-warning" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{applications?.length || 0}</p>
                      <p className="text-sm text-muted-foreground">Candidatures</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </MotionDiv>

            <MotionDiv
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-status-danger/10 rounded-lg">
                      <Heart className="h-5 w-5 text-status-danger" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{favorites?.length || 0}</p>
                      <p className="text-sm text-muted-foreground">Favoris</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </MotionDiv>

            <MotionDiv
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-secondary/10 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-secondary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{savedSearches.length}</p>
                      <p className="text-sm text-muted-foreground">Alertes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </MotionDiv>
          </div>

          {/* Current Lease Status */}
          {leaseStatuses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Mon Bail Actuel
                </CardTitle>
                <CardDescription>
                  Suivez l'état de votre location et les échéances à venir
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {leaseStatuses.map((lease) => (
                    <div key={lease.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{lease.property}</h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {lease.address}
                          </p>
                        </div>
                        <Badge className={cn(getStatusColor(lease.status), "gap-1")}>
                          {getStatusIcon(lease.status)}
                          {lease.status === 'active' ? 'Actif' :
                           lease.status === 'pending' ? 'En attente' : 'Expirant'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Loyer mensuel</p>
                          <p className="font-semibold">{lease.rent.toLocaleString()} FCFA</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Prochain paiement</p>
                          <p className="font-semibold">{lease.nextPayment}</p>
                        </div>
                      </div>

                      {lease.daysUntilExpiry <= 30 && (
                        <div className="bg-status-warning/10 border border-status-warning/20 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-status-warning">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm font-medium">
                              Votre bail expire dans {lease.daysUntilExpiry} jours
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:shadow-elevation-2 transition-all">
              <CardContent className="p-4 text-center">
                <div className="p-3 bg-primary/10 rounded-lg w-fit mx-auto mb-3">
                  <Search className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">Nouvelle Recherche</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Trouvez votre prochain logement
                </p>
                <Button size="sm" className="w-full">
                  Commencer
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-elevation-2 transition-all">
              <CardContent className="p-4 text-center">
                <div className="p-3 bg-secondary/10 rounded-lg w-fit mx-auto mb-3">
                  <FileText className="h-6 w-6 text-secondary" />
                </div>
                <h3 className="font-semibold mb-1">Documents</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Gérez vos contrats et documents
                </p>
                <Button size="sm" variant="outline" className="w-full">
                  Accéder
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-elevation-2 transition-all">
              <CardContent className="p-4 text-center">
                <div className="p-3 bg-status-success/10 rounded-lg w-fit mx-auto mb-3">
                  <Calendar className="h-6 w-6 text-status-success" />
                </div>
                <h3 className="font-semibold mb-1">Rappels</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Configurez vos alertes de paiement
                </p>
                <Button size="sm" variant="outline" className="w-full">
                  Configurer
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Leases Tab */}
        <TabsContent value="leases" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Historique des Baux</CardTitle>
              <CardDescription>
                Consultez tous vos baux actuels et passés
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucun bail actif</h3>
                <p className="text-muted-foreground mb-4">
                  Commencez à rechercher votre prochain logement
                </p>
                <Button onClick={() => navigate('/search')}>
                  <Search className="h-4 w-4 mr-2" />
                  Rechercher un logement
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Applications Tab */}
        <TabsContent value="applications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Mes Candidatures</CardTitle>
              <CardDescription>
                Suivez l'état de vos demandes de location
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucune candidature</h3>
                <p className="text-muted-foreground mb-4">
                  Postulez aux propriétés qui vous intéressent
                </p>
                <Button onClick={() => navigate('/search')}>
                  <Search className="h-4 w-4 mr-2" />
                  Trouver une propriété
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Discovery Tab */}
        <TabsContent value="discovery" className="space-y-6">
          {/* Saved Searches */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Recherches Sauvegardées
              </CardTitle>
              <CardDescription>
                Vos alertes de recherche et nouveaux résultats
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {savedSearches.map((search) => (
                  <div key={search.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{search.query}</p>
                      <p className="text-sm text-muted-foreground">
                        {search.filters.join(' • ')}
                      </p>
                    </div>
                    <div className="text-right">
                      {search.newResults > 0 && (
                        <Badge variant="destructive" className="mb-1">
                          {search.newResults} nouveaux
                        </Badge>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Dernière recherche: {search.lastRun}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Neighborhood Guides */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Guides de Quartier
              </CardTitle>
              <CardDescription>
                Découvrez les quartiers d'Abidjan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {neighborhoodGuides.map((guide) => (
                  <div key={guide.name} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold">{guide.name}</h3>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span className="text-sm">{guide.rating}</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{guide.description}</p>

                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Transport</p>
                        <div className="flex items-center justify-center gap-1">
                          <div className="h-2 bg-muted rounded-full w-16 overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${(guide.transportScore / 5) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs">{guide.transportScore}</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Commerces</p>
                        <div className="flex items-center justify-center gap-1">
                          <div className="h-2 bg-muted rounded-full w-16 overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${(guide.amenitiesScore / 5) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs">{guide.amenitiesScore}</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Sécurité</p>
                        <div className="flex items-center justify-center gap-1">
                          <div className="h-2 bg-muted rounded-full w-16 overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${(guide.safetyScore / 5) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs">{guide.safetyScore}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        <DollarSign className="h-3 w-3 inline" />
                        Moyenne: {(guide.averageRent / 1000).toFixed(0)}k FCFA/mois
                      </p>
                      <Button size="sm" variant="outline">
                        Explorer
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TenantDashboardEnhanced;