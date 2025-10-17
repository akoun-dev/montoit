import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building,
  Users,
  DollarSign,
  TrendingUp,
  Calendar,
  FileText,
  Settings,
  Plus,
  Eye,
  CheckCircle,
  Clock,
  AlertTriangle,
  Home,
  BarChart3,
  PieChart,
  Target,
  Star,
  Phone,
  Mail
} from 'lucide-react';
import { MotionDiv } from '@/components/ui/motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface Property {
  id: string;
  title: string;
  type: string;
  address: string;
  status: 'occupied' | 'vacant' | 'maintenance';
  monthlyRent: number;
  tenant?: string;
  occupancyRate: number;
  lastMaintenance: string;
}

interface Application {
  id: string;
  propertyId: string;
  propertyTitle: string;
  applicantName: string;
  applicantEmail: string;
  submittedDate: string;
  status: 'pending' | 'reviewing' | 'accepted' | 'rejected';
  score: number;
  monthlyIncome: number;
}

interface FinancialMetrics {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  occupancyRate: number;
  averageRent: number;
  yield: number;
  monthlyTrend: number[];
}

interface MaintenanceRequest {
  id: string;
  propertyId: string;
  propertyTitle: string;
  tenantName: string;
  category: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'resolved';
  createdDate: string;
}

export const OwnerDashboardEnhanced: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [properties, setProperties] = useState<Property[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [financialMetrics, setFinancialMetrics] = useState<FinancialMetrics | null>(null);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data - in real app, fetch from API
  useEffect(() => {
    setProperties([
      {
        id: '1',
        title: 'Appartement T3 Cocody',
        type: 'Appartement',
        address: 'Rue des Jardins, Cocody',
        status: 'occupied',
        monthlyRent: 250000,
        tenant: 'Marie Koné',
        occupancyRate: 100,
        lastMaintenance: '2024-09-15'
      },
      {
        id: '2',
        title: 'Villa 4 chambres Riviera',
        type: 'Villa',
        address: 'Boulevard de la Riviera',
        status: 'vacant',
        monthlyRent: 450000,
        occupancyRate: 0,
        lastMaintenance: '2024-08-20'
      }
    ]);

    setApplications([
      {
        id: '1',
        propertyId: '2',
        propertyTitle: 'Villa 4 chambres Riviera',
        applicantName: 'Jean-Baptiste Ouattara',
        applicantEmail: 'jboattara@email.com',
        submittedDate: '2024-10-14',
        status: 'pending',
        score: 85,
        monthlyIncome: 800000
      }
    ]);

    setFinancialMetrics({
      totalIncome: 250000,
      totalExpenses: 50000,
      netIncome: 200000,
      occupancyRate: 50,
      averageRent: 350000,
      yield: 6.8,
      monthlyTrend: [200000, 250000, 250000, 200000, 250000, 250000]
    });

    setMaintenanceRequests([
      {
        id: '1',
        propertyId: '1',
        propertyTitle: 'Appartement T3 Cocody',
        tenantName: 'Marie Koné',
        category: 'Plomberie',
        description: 'Fuite d\'eau dans la salle de bain',
        priority: 'medium',
        status: 'open',
        createdDate: '2024-10-15'
      }
    ]);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'occupied':
      case 'accepted':
      case 'resolved':
        return 'bg-status-success text-status-success-foreground';
      case 'vacant':
      case 'pending':
      case 'open':
        return 'bg-status-warning text-status-warning-foreground';
      case 'maintenance':
      case 'rejected':
      case 'in_progress':
        return 'bg-status-info text-status-info-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-status-danger text-status-danger-foreground';
      case 'medium':
        return 'bg-status-warning text-status-warning-foreground';
      case 'low':
        return 'bg-status-success text-status-success-foreground';
      default:
        return 'bg-muted text-muted-foreground';
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
              Tableau de Bord Propriétaire 🏠
            </h1>
            <p className="text-muted-foreground">
              Gérez vos propriétés et optimisez vos revenus
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/ajouter-bien')}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un bien
            </Button>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Paramètres
            </Button>
          </div>
        </div>
      </MotionDiv>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Aperçu</TabsTrigger>
          <TabsTrigger value="properties">Biens</TabsTrigger>
          <TabsTrigger value="applications">Candidatures</TabsTrigger>
          <TabsTrigger value="financial">Finances</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Financial Metrics */}
          {financialMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <MotionDiv
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-status-success/10 rounded-lg">
                        <DollarSign className="h-5 w-5 text-status-success" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">
                          {(financialMetrics.totalIncome / 1000).toFixed(0)}k
                        </p>
                        <p className="text-sm text-muted-foreground">Revenus/mois</p>
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
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Building className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{financialMetrics.occupancyRate}%</p>
                        <p className="text-sm text-muted-foreground">Taux d'occupation</p>
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
                      <div className="p-2 bg-secondary/10 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-secondary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{financialMetrics.yield}%</p>
                        <p className="text-sm text-muted-foreground">Rendement</p>
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
                      <div className="p-2 bg-status-warning/10 rounded-lg">
                        <FileText className="h-5 w-5 text-status-warning" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{applications.length}</p>
                        <p className="text-sm text-muted-foreground">Candidatures</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </MotionDiv>
            </div>
          )}

          {/* Properties Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Mes Propriétés
                </CardTitle>
                <CardDescription>
                  État actuel de vos biens immobiliers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {properties.map((property) => (
                    <div key={property.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{property.title}</h4>
                        <p className="text-sm text-muted-foreground">{property.address}</p>
                        <p className="text-sm font-medium">
                          {(property.monthlyRent / 1000).toFixed(0)}k FCFA/mois
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className={cn(getStatusColor(property.status))}>
                          {property.status === 'occupied' ? 'Occupé' :
                           property.status === 'vacant' ? 'Libre' : 'Maintenance'}
                        </Badge>
                        {property.tenant && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {property.tenant}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Dernières Candidatures
                </CardTitle>
                <CardDescription>
                  Les nouvelles demandes à traiter
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {applications.slice(0, 3).map((application) => (
                    <div key={application.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{application.applicantName}</h4>
                        <p className="text-sm text-muted-foreground">{application.propertyTitle}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500 fill-current" />
                            <span className="text-xs">{application.score}/100</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            Revenu: {(application.monthlyIncome / 1000).toFixed(0)}k/mois
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={cn(getStatusColor(application.status))}>
                          {application.status === 'pending' ? 'En attente' :
                           application.status === 'reviewing' ? 'Examen' :
                           application.status === 'accepted' ? 'Accepté' : 'Refusé'}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {application.submittedDate}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Maintenance Alerts */}
          {maintenanceRequests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-status-warning" />
                  Demandes de Maintenance
                </CardTitle>
                <CardDescription>
                  Les requêtes nécessitant votre attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {maintenanceRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{request.category}</h4>
                        <p className="text-sm text-muted-foreground">{request.propertyTitle}</p>
                        <p className="text-sm">{request.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Par {request.tenantName} • {request.createdDate}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className={cn(getPriorityColor(request.priority))}>
                          {request.priority === 'high' ? 'Urgent' :
                           request.priority === 'medium' ? 'Moyen' : 'Faible'}
                        </Badge>
                        <Badge className={cn(getStatusColor(request.status), "mt-1")}>
                          {request.status === 'open' ? 'Ouvert' :
                           request.status === 'in_progress' ? 'En cours' : 'Résolu'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Properties Tab */}
        <TabsContent value="properties" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Gestion des Propriétés</h2>
            <Button onClick={() => navigate('/ajouter-bien')}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une propriété
            </Button>
          </div>

          <div className="grid gap-4">
            {properties.map((property) => (
              <Card key={property.id} className="hover:shadow-elevation-2 transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{property.title}</h3>
                        <Badge className={cn(getStatusColor(property.status))}>
                          {property.status === 'occupied' ? 'Occupé' :
                           property.status === 'vacant' ? 'Libre' : 'Maintenance'}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mb-3">{property.address}</p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Loyer</p>
                          <p className="font-semibold">{(property.monthlyRent / 1000).toFixed(0)}k FCFA</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Occupation</p>
                          <p className="font-semibold">{property.occupancyRate}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Type</p>
                          <p className="font-semibold">{property.type}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Dernière maintenance</p>
                          <p className="font-semibold">{property.lastMaintenance}</p>
                        </div>
                      </div>

                      {property.tenant && (
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-sm font-medium mb-1">Locataire actuel</p>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{property.tenant}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Détails
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4 mr-1" />
                        Gérer
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Applications Tab */}
        <TabsContent value="applications" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Candidatures Reçues</h2>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filtrer
            </Button>
          </div>

          <div className="grid gap-4">
            {applications.map((application) => (
              <Card key={application.id} className="hover:shadow-elevation-2 transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{application.applicantName}</h3>
                        <Badge className={cn(getStatusColor(application.status))}>
                          {application.status === 'pending' ? 'En attente' :
                           application.status === 'reviewing' ? 'Examen' :
                           application.status === 'accepted' ? 'Accepté' : 'Refusé'}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mb-3">
                        Candidature pour: {application.propertyTitle}
                      </p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Score</p>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            <span className="font-semibold">{application.score}/100</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Revenu mensuel</p>
                          <p className="font-semibold">{(application.monthlyIncome / 1000).toFixed(0)}k FCFA</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-semibold text-sm">{application.applicantEmail}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Date</p>
                          <p className="font-semibold">{application.submittedDate}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Voir
                      </Button>
                      <Button size="sm">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Accepter
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-6">
          {financialMetrics && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-status-success" />
                      Revenus
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-status-success">
                      {(financialMetrics.totalIncome / 1000).toFixed(0)}k
                    </p>
                    <p className="text-sm text-muted-foreground">FCFA par mois</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-status-danger" />
                      Dépenses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-status-danger">
                      {(financialMetrics.totalExpenses / 1000).toFixed(0)}k
                    </p>
                    <p className="text-sm text-muted-foreground">FCFA par mois</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Net
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-primary">
                      {(financialMetrics.netIncome / 1000).toFixed(0)}k
                    </p>
                    <p className="text-sm text-muted-foreground">FCFA par mois</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Performance Globale
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">Taux d'occupation</span>
                            <span className="text-sm font-medium">{financialMetrics.occupancyRate}%</span>
                          </div>
                          <Progress value={financialMetrics.occupancyRate} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">Rendement annuel</span>
                            <span className="text-sm font-medium">{financialMetrics.yield}%</span>
                          </div>
                          <Progress value={financialMetrics.yield * 10} className="h-2" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Indicateurs clés</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Loyer moyen</span>
                          <span className="text-sm font-medium">
                            {(financialMetrics.averageRent / 1000).toFixed(0)}k FCFA
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Nombre de biens</span>
                          <span className="text-sm font-medium">{properties.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Biens occupés</span>
                          <span className="text-sm font-medium">
                            {properties.filter(p => p.status === 'occupied').length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Demandes de Maintenance</h2>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle demande
            </Button>
          </div>

          <div className="grid gap-4">
            {maintenanceRequests.map((request) => (
              <Card key={request.id} className="hover:shadow-elevation-2 transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{request.category}</h3>
                        <Badge className={cn(getPriorityColor(request.priority))}>
                          {request.priority === 'high' ? 'Urgent' :
                           request.priority === 'medium' ? 'Moyen' : 'Faible'}
                        </Badge>
                        <Badge className={cn(getStatusColor(request.status))}>
                          {request.status === 'open' ? 'Ouvert' :
                           request.status === 'in_progress' ? 'En cours' : 'Résolu'}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mb-1">
                        {request.propertyTitle} • {request.tenantName}
                      </p>
                      <p className="mb-3">{request.description}</p>
                      <p className="text-sm text-muted-foreground">
                        Créée le {request.createdDate}
                      </p>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Détails
                      </Button>
                      <Button size="sm">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Résoudre
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OwnerDashboardEnhanced;