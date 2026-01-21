import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  MapPin,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Eye,
  FileCheck,
  AlertCircle,
  Building,
  Users,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { trustAgentApi } from '@/features/trust-agent/services/trustAgent.api';
import { toast } from 'sonner';
import TrustAgentHeader from '../../features/trust-agent/components/TrustAgentHeader';
import { AddressValue, formatAddress } from '@/shared/utils/address';

interface Property {
  id: string;
  title: string;
  address: AddressValue;
  city: string;
  neighborhood: string | null;
  property_type: string;
  main_image: string | null;
  verification_status: 'pending' | 'verified' | 'rejected' | 'certified';
  ansut_verified?: boolean;
  ansut_verification_date?: string | null;
  owner_id: string;
  created_at: string;
}

type TabType = 'all' | 'pending' | 'verified' | 'certified';

// Type pour les données retournées par l'API
interface ApiProperty {
  id: string;
  title: string;
  address: AddressValue;
  city: string;
  neighborhood?: string | null;
  property_type?: string;
  main_image?: string | null;
  verification_status?: string;
  ansut_verified?: boolean;
  ansut_verification_date?: string | null;
  owner_id?: string;
  created_at?: string;
}

export default function PropertyManagementPage() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      // Appel de l'API qui retourne directement un tableau
      const data = await trustAgentApi.getPropertiesNeedingVerification();
      // Transformer les données pour correspondre à l'interface Property
      const transformed = data.map((p: ApiProperty) => {
        // Déterminer verification_status en fonction des données disponibles
        let verification_status: 'pending' | 'verified' | 'rejected' | 'certified' = 'pending';
        if (p.ansut_verified) {
          verification_status = 'certified';
        } else if (p.verification_status) {
          verification_status = p.verification_status as
            | 'pending'
            | 'verified'
            | 'rejected'
            | 'certified';
        } else {
          // Par défaut, considérer comme en attente
          verification_status = 'pending';
        }
        return {
          id: p.id,
          title: p.title,
          address: p.address,
          city: p.city,
          neighborhood: p.neighborhood ?? null,
          property_type: p.property_type ?? 'unknown',
          main_image: p.main_image ?? null,
          verification_status,
          ansut_verified: p.ansut_verified,
          ansut_verification_date: p.ansut_verification_date,
          owner_id: p.owner_id ?? '',
          created_at: p.created_at ?? new Date().toISOString(),
        };
      });
      setProperties(transformed);
    } catch (error) {
      console.error('Error loading properties:', error);
      toast.error('Erreur lors du chargement des propriétés');
    } finally {
      setLoading(false);
    }
  };

  const filteredProperties = properties
    .filter((property) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const addressText = formatAddress(property.address, property.city).toLowerCase();
      return (
        property.title.toLowerCase().includes(query) ||
        property.city.toLowerCase().includes(query) ||
        addressText.includes(query)
      );
    })
    .filter((property) => {
      if (activeTab === 'all') return true;
      if (activeTab === 'pending') return property.verification_status === 'pending';
      if (activeTab === 'verified') return property.verification_status === 'verified';
      if (activeTab === 'certified') return property.ansut_verified === true;
      return true;
    });

  const handleViewDetails = (propertyId: string) => {
    navigate(`/trust-agent/certifications/properties?property=${propertyId}`);
  };

  const handleStartCertification = (propertyId: string) => {
    navigate(`/trust-agent/certifications/properties?property=${propertyId}&start=true`);
  };

  const getStatusBadge = (property: Property) => {
    if (property.ansut_verified) {
      return <Badge className="bg-green-100 text-green-800 border-green-200">Certifié ANSUT</Badge>;
    }
    switch (property.verification_status) {
      case 'pending':
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-300">
            En attente
          </Badge>
        );
      case 'verified':
        return (
          <Badge variant="outline" className="text-blue-600 border-blue-300">
            Vérifié
          </Badge>
        );
      case 'rejected':
        return <Badge variant="destructive">Rejeté</Badge>;
      default:
        return <Badge variant="secondary">Inconnu</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TrustAgentHeader title="Gestion des Propriétés" />

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        <div className="space-y-6">
          {/* Header avec stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Home className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{properties.length}</p>
                    <p className="text-sm text-muted-foreground">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {properties.filter((p) => p.verification_status === 'pending').length}
                    </p>
                    <p className="text-sm text-muted-foreground">En attente</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {properties.filter((p) => p.verification_status === 'verified').length}
                    </p>
                    <p className="text-sm text-muted-foreground">Vérifiées</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100">
                    <FileCheck className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {properties.filter((p) => p.ansut_verified).length}
                    </p>
                    <p className="text-sm text-muted-foreground">Certifiées ANSUT</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contrôles de recherche et filtres */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-auto md:flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par titre, ville, adresse..."
                    value={searchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSearchQuery(e.target.value)
                    }
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filtrer :</span>
                  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
                    <TabsList>
                      <TabsTrigger value="all">Toutes</TabsTrigger>
                      <TabsTrigger value="pending">En attente</TabsTrigger>
                      <TabsTrigger value="verified">Vérifiées</TabsTrigger>
                      <TabsTrigger value="certified">Certifiées</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liste des propriétés */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Liste des propriétés
                <Badge variant="secondary">{filteredProperties.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : filteredProperties.length === 0 ? (
                <div className="text-center py-12">
                  <Home className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Aucune propriété trouvée pour les critères sélectionnés.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredProperties.map((property) => (
                    <div
                      key={property.id}
                      className="p-4 rounded-lg border hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        {/* Image */}
                        <div className="w-full md:w-32 h-32 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                          {property.main_image ? (
                            <img
                              src={property.main_image}
                              alt={property.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Home className="h-10 w-10 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        {/* Détails */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
                            <div>
                              <h3 className="font-semibold text-lg">{property.title}</h3>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {formatAddress(property.address, property.city)}
                              </p>
                              <div className="flex flex-wrap gap-2 mt-2">
                                <Badge variant="outline">{property.property_type}</Badge>
                                {getStatusBadge(property)}
                                {property.neighborhood && (
                                  <Badge variant="secondary">{property.neighborhood}</Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Button
                                variant="outline"
                                size="small"
                                onClick={() => handleViewDetails(property.id)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Détails
                              </Button>
                              {property.verification_status === 'pending' && (
                                <Button
                                  size="small"
                                  onClick={() => handleStartCertification(property.id)}
                                >
                                  <FileCheck className="h-4 w-4 mr-2" />
                                  Certifier
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="mt-4 text-xs text-muted-foreground flex items-center gap-4">
                            <span>
                              Créée le {new Date(property.created_at).toLocaleDateString('fr-FR')}
                            </span>
                            {property.ansut_verification_date && (
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Certifiée le{' '}
                                {new Date(property.ansut_verification_date).toLocaleDateString(
                                  'fr-FR'
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions globales */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Actions rapides
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button
                  variant="outline"
                  onClick={() => navigate('/trust-agent/certifications/properties')}
                >
                  <FileCheck className="h-4 w-4 mr-2" />
                  Page de certification
                </Button>
                <Button variant="outline" onClick={() => navigate('/trust-agent/missions')}>
                  <Users className="h-4 w-4 mr-2" />
                  Voir mes missions
                </Button>
                <Button variant="outline" onClick={loadProperties}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualiser la liste
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
