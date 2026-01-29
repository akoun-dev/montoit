/**
 * Agent Properties Page
 *
 * Lists all properties assigned to the agent with filtering and management options.
 * Agents can view property details, manage visits, and see applications for their assigned properties.
 */
import { useState, useEffect, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import {
  Button,
  Input,
  Card,
  CardContent,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui';
import {
  Search,
  Home,
  MapPin,
  Coins,
  Calendar,
  Users,
  Eye,
  Building2,
  SlidersHorizontal,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AssignedProperty {
  id: string;
  property_id: string;
  assignment_type: string | null;
  start_date: string | null;
  commission_override: number | null;
  properties: {
    id: string;
    title: string;
    city: string | null;
    neighborhood: string | null;
    price: number;
    main_image: string | null;
    status: string | null;
    surface_area: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    description: string | null;
  } | null;
}

interface PropertyStats {
  totalVisits: number;
  pendingVisits: number;
  totalApplications: number;
  pendingApplications: number;
}

export default function AgentPropertiesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<AssignedProperty[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<AssignedProperty[]>([]);
  const [propertyStats, setPropertyStats] = useState<Record<string, PropertyStats>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assignmentTypeFilter, setAssignmentTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('recent');

  useEffect(() => {
    loadProperties();
  }, [user]);

  useEffect(() => {
    filterAndSortProperties();
  }, [properties, searchQuery, statusFilter, assignmentTypeFilter, sortBy]);

  const loadProperties = async () => {
    if (!user) return;

    try {
      // Get the agent's record
      const { data: agentData, error: agentError } = await supabase
        .from('agency_agents')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (agentError || !agentData) {
        console.error('Error loading agent data:', agentError);
        setLoading(false);
        return;
      }

      // Load assigned properties
      const { data: assignments, error: assignmentsError } = await supabase
        .from('property_assignments')
        .select(
          `
          id,
          property_id,
          assignment_type,
          start_date,
          commission_override,
          properties:property_id(id, title, city, neighborhood, price, main_image, status, surface_area, bedrooms, bathrooms, description)
        `
        )
        .eq('agent_id', agentData.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;

      const props = (assignments as AssignedProperty[]) || [];
      setProperties(props);

      // Load stats for each property
      await loadPropertyStats(props);
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPropertyStats = async (props: AssignedProperty[]) => {
    const stats: Record<string, PropertyStats> = {};

    for (const prop of props) {
      const propertyId = prop.property_id;

      // Count visits
      const { data: visits } = await supabase
        .from('visit_requests')
        .select('id, status')
        .eq('property_id', propertyId);

      // Count applications
      const { data: applications } = await supabase
        .from('rental_applications')
        .select('id, status')
        .eq('property_id', propertyId);

      stats[propertyId] = {
        totalVisits: visits?.length || 0,
        pendingVisits: visits?.filter((v) => v.status === 'pending').length || 0,
        totalApplications: applications?.length || 0,
        pendingApplications: applications?.filter((a) => a.status === 'pending').length || 0,
      };
    }

    setPropertyStats(stats);
  };

  const filterAndSortProperties = () => {
    let filtered = [...properties];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.properties?.title?.toLowerCase().includes(query) ||
          p.properties?.city?.toLowerCase().includes(query) ||
          p.properties?.neighborhood?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => p.properties?.status === statusFilter);
    }

    // Apply assignment type filter
    if (assignmentTypeFilter !== 'all') {
      filtered = filtered.filter((p) => p.assignment_type === assignmentTypeFilter);
    }

    // Apply sorting
    switch (sortBy) {
      case 'recent':
        filtered.sort((a, b) => {
          const dateA = a.start_date ? new Date(a.start_date).getTime() : 0;
          const dateB = b.start_date ? new Date(b.start_date).getTime() : 0;
          return dateB - dateA;
        });
        break;
      case 'rent_low':
        filtered.sort(
          (a, b) => (a.properties?.price || 0) - (b.properties?.price || 0)
        );
        break;
      case 'rent_high':
        filtered.sort(
          (a, b) => (b.properties?.price || 0) - (a.properties?.price || 0)
        );
        break;
      case 'name':
        filtered.sort((a, b) =>
          (a.properties?.title || '').localeCompare(b.properties?.title || '')
        );
        break;
    }

    setFilteredProperties(filtered);
  };

  const getStatusBadge = (status: string | null) => {
    const styles: Record<string, string> = {
      disponible: 'bg-green-100 text-green-800',
      loue: 'bg-gray-100 text-gray-800',
      en_attente: 'bg-yellow-100 text-yellow-800',
      retire: 'bg-red-100 text-red-800',
      maintenance: 'bg-orange-100 text-orange-800',
    };
    const labels: Record<string, string> = {
      disponible: 'Disponible',
      loue: 'Loué',
      en_attente: 'En attente',
      retire: 'Retiré',
      maintenance: 'En travaux',
    };
    const s = status || 'disponible';
    return (
      <Badge className={styles[s] || styles['disponible']}>{labels[s] || s}</Badge>
    );
  };

  const getAssignmentTypeBadge = (type: string | null) => {
    const styles: Record<string, string> = {
      exclusive: 'bg-purple-100 text-purple-800',
      shared: 'bg-blue-100 text-blue-800',
      primary: 'bg-green-100 text-green-800',
    };
    const labels: Record<string, string> = {
      exclusive: 'Exclusif',
      shared: 'Partagé',
      primary: 'Principal',
    };
    const t = type || 'exclusive';
    return (
      <Badge variant="outline" className={styles[t] || styles['exclusive']}>
        {labels[t] || t}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F4] py-8">
      <div className="w-full mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#2C1810]">Mes propriétés</h1>
            <p className="text-[#2C1810]/60 mt-1">
              {filteredProperties.length} bien{filteredProperties.length > 1 ? 's' : ''} attribué
              {filteredProperties.length > 1 ? 's' : ''}
            </p>
          </div>
          <Button
            onClick={() => navigate('/agent/dashboard')}
            variant="outline"
            className="border-[#EFEBE9]"
          >
            Retour au tableau de bord
          </Button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white border-[#EFEBE9]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#2C1810]">{properties.length}</p>
                  <p className="text-sm text-[#2C1810]/60">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#EFEBE9]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <Home className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#2C1810]">
                    {properties.filter((p) => p.properties?.status === 'disponible').length}
                  </p>
                  <p className="text-sm text-[#2C1810]/60">Disponibles</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#EFEBE9]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-100">
                  <Calendar className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#2C1810]">
                    {Object.values(propertyStats).reduce((sum, s) => sum + s.pendingVisits, 0)}
                  </p>
                  <p className="text-sm text-[#2C1810]/60">Visites en attente</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#EFEBE9]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#F16522]/10">
                  <Users className="w-5 h-5 text-[#F16522]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#2C1810]">
                    {Object.values(propertyStats).reduce((sum, s) => sum + s.pendingApplications, 0)}
                  </p>
                  <p className="text-sm text-[#2C1810]/60">Candidatures en attente</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-white border-[#EFEBE9] mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2C1810]/40" />
                <Input
                  placeholder="Rechercher par titre, ville, quartier..."
                  value={searchQuery}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="pl-10 border-[#EFEBE9]"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48 border-[#EFEBE9]">
                  <SelectValue placeholder="Statut du bien" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="disponible">Disponible</SelectItem>
                  <SelectItem value="loue">Loué</SelectItem>
                  <SelectItem value="en_attente">En attente</SelectItem>
                  <SelectItem value="maintenance">En travaux</SelectItem>
                </SelectContent>
              </Select>

              {/* Assignment Type Filter */}
              <Select value={assignmentTypeFilter} onValueChange={setAssignmentTypeFilter}>
                <SelectTrigger className="w-full md:w-48 border-[#EFEBE9]">
                  <SelectValue placeholder="Type d'assignation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="exclusive">Exclusif</SelectItem>
                  <SelectItem value="shared">Partagé</SelectItem>
                  <SelectItem value="primary">Principal</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-48 border-[#EFEBE9]">
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Trier par" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Plus récent</SelectItem>
                  <SelectItem value="rent_low">Loyer croissant</SelectItem>
                  <SelectItem value="rent_high">Loyer décroissant</SelectItem>
                  <SelectItem value="name">Nom A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Properties Grid */}
        {filteredProperties.length === 0 ? (
          <Card className="bg-white border-[#EFEBE9]">
            <CardContent className="p-12 text-center">
              <Home className="w-12 h-12 mx-auto text-[#2C1810]/20 mb-4" />
              <h3 className="text-lg font-semibold text-[#2C1810] mb-2">
                {properties.length === 0 ? 'Aucune propriété attribuée' : 'Aucun résultat'}
              </h3>
              <p className="text-[#2C1810]/60">
                {properties.length === 0
                  ? "Vous n'avez pas encore de propriétés attribuées. Contactez votre agence."
                  : 'Essayez de modifier vos critères de recherche.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((assignment) => {
              const property = assignment.properties;
              const stats = propertyStats[assignment.property_id];
              if (!property) return null;

              return (
                <Card
                  key={assignment.id}
                  className="bg-white border-[#EFEBE9] overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="h-48 bg-[#FAF7F4] relative">
                    {property.main_image ? (
                      <img
                        src={property.main_image}
                        alt={property.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Home className="w-12 h-12 text-[#2C1810]/20" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2 flex gap-2">
                      {getStatusBadge(property.status)}
                      {getAssignmentTypeBadge(assignment.assignment_type)}
                    </div>
                    <button
                      onClick={() => navigate(`/biens/${property.id}`)}
                      className="absolute top-2 right-2 p-2 bg-white/80 hover:bg-white rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4 text-[#2C1810]" />
                    </button>
                  </div>

                  <CardContent className="p-4">
                    <h3 className="font-semibold text-[#2C1810] mb-1 line-clamp-1">
                      {property.title}
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-[#2C1810]/60 mb-3">
                      <MapPin className="w-3 h-3" />
                      {property.city}
                      {property.neighborhood && `, ${property.neighborhood}`}
                    </div>

                    {/* Property Features */}
                    <div className="flex items-center gap-3 text-sm text-[#2C1810]/60 mb-3">
                      {property.surface_area && (
                        <span>{property.surface_area} m²</span>
                      )}
                      {property.bedrooms && (
                        <span>{property.bedrooms} ch.</span>
                      )}
                      {property.bathrooms && (
                        <span>{property.bathrooms} sdb.</span>
                      )}
                    </div>

                    {/* Stats */}
                    {stats && (stats.pendingVisits > 0 || stats.pendingApplications > 0) && (
                      <div className="flex items-center gap-2 text-xs text-[#2C1810]/60 mb-3">
                        {stats.pendingVisits > 0 && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {stats.pendingVisits} visite(s)
                          </span>
                        )}
                        {stats.pendingApplications > 0 && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {stats.pendingApplications} candidature(s)
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-[#EFEBE9]">
                      <span className="text-sm text-[#2C1810]/60">
                        {assignment.start_date &&
                          `Depuis ${format(new Date(assignment.start_date), 'MMM yyyy', { locale: fr })}`}
                      </span>
                      <div className="text-right">
                        <span className="font-semibold text-[#F16522]">
                          {property.price.toLocaleString()} F
                        </span>
                        <span className="text-xs text-[#2C1810]/60 block">/mois</span>
                      </div>
                    </div>

                    {/* Commission Override */}
                    {assignment.commission_override && (
                      <div className="mt-2 pt-2 border-t border-[#EFEBE9] text-xs">
                        <span className="text-[#2C1810]/60">Commission: </span>
                        <span className="font-semibold text-[#F16522]">
                          {assignment.commission_override}%
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
