/**
 * Agent Dashboard Page
 *
 * Dashboard for agency agents showing their assigned properties and statistics.
 * Agents can only see properties that have been assigned to them via the
 * property_assignments table.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { Card, CardContent } from '@/shared/ui';
import {
  Building2,
  Home,
  Calendar,
  Users,
  TrendingUp,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
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
  } | null;
}

interface AgentStats {
  totalProperties: number;
  activeProperties: number;
  pendingVisits: number;
  activeContracts: number;
  totalRentValue: number;
}

interface AgencyInfo {
  id: string;
  name: string;
  logo_url: string | null;
}

export default function AgentDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AgentStats>({
    totalProperties: 0,
    activeProperties: 0,
    pendingVisits: 0,
    activeContracts: 0,
    totalRentValue: 0,
  });
  const [recentProperties, setRecentProperties] = useState<AssignedProperty[]>([]);
  const [agencyInfo, setAgencyInfo] = useState<AgencyInfo | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      // Get the agent's record
      const { data: agentData, error: agentError } = await supabase
        .from('agency_agents')
        .select('agency_id, id, role, commission_split')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (agentError || !agentData) {
        console.error('Error loading agent data:', agentError);
        setLoading(false);
        return;
      }

      // Load agency info
      const { data: agency } = await supabase
        .from('agencies')
        .select('id, name, logo_url')
        .eq('id', agentData.agency_id)
        .single();

      setAgencyInfo(agency);

      // Load assigned properties with stats
      const { data: assignments, error: assignmentsError } = await supabase
        .from('property_assignments')
        .select(
          `
          id,
          property_id,
          assignment_type,
          start_date,
          commission_override,
          properties:property_id(id, title, city, neighborhood, price, main_image, status)
        `
        )
        .eq('agent_id', agentData.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;

      const properties = (assignments as AssignedProperty[]) || [];
      const activeProperties = properties.filter(
        (p) => p.properties?.status === 'disponible'
      ).length;
      const totalRentValue = properties.reduce(
        (sum, p) => sum + (p.properties?.price || 0),
        0
      );

      // Count pending visits
      const { data: visits } = await supabase
        .from('visit_requests')
        .select('id')
        .in(
          'property_id',
          properties.map((p) => p.property_id)
        )
        .eq('status', 'pending');

      // Count active contracts
      const { data: contracts } = await supabase
        .from('lease_contracts')
        .select('id')
        .in(
          'property_id',
          properties.map((p) => p.property_id)
        )
        .eq('status', 'active');

      setStats({
        totalProperties: properties.length,
        activeProperties,
        pendingVisits: visits?.length || 0,
        activeContracts: contracts?.length || 0,
        totalRentValue,
      });

      // Set recent properties (first 6)
      setRecentProperties(properties.slice(0, 6));
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
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
            <p className="text-[#2C1810]/60 text-sm">
              {agencyInfo?.name && `Espace Agent • ${agencyInfo.name}`}
            </p>
            <h1 className="text-3xl font-bold text-[#2C1810]">Tableau de bord</h1>
            <p className="text-[#2C1810]/60 mt-1">Gérez vos propriétés attribuées</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white border-[#EFEBE9]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#2C1810]">{stats.totalProperties}</p>
                  <p className="text-sm text-[#2C1810]/60">Biens attribués</p>
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
                  <p className="text-2xl font-bold text-[#2C1810]">{stats.activeProperties}</p>
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
                  <p className="text-2xl font-bold text-[#2C1810]">{stats.pendingVisits}</p>
                  <p className="text-sm text-[#2C1810]/60">Visites en attente</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-[#EFEBE9]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#F16522]/10">
                  <TrendingUp className="w-5 h-5 text-[#F16522]" />
                </div>
                <div>
                  <p className="text-lg font-bold text-[#2C1810]">
                    {stats.totalRentValue.toLocaleString()} F
                  </p>
                  <p className="text-sm text-[#2C1810]/60">Loyers/mois</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => navigate('/agent/proprietes')}
            className="flex items-center justify-between p-4 bg-white border-[#EFEBE9] rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#F16522]/10">
                <Home className="w-5 h-5 text-[#F16522]" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-[#2C1810]">Mes propriétés</p>
                <p className="text-sm text-[#2C1810]/60">
                  {stats.totalProperties} bien(s)
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#2C1810]/40" />
          </button>

          <button
            onClick={() => navigate('/agent/visites')}
            className="flex items-center justify-between p-4 bg-white border-[#EFEBE9] rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-[#2C1810]">Visites</p>
                <p className="text-sm text-[#2C1810]/60">
                  {stats.pendingVisits} en attente
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#2C1810]/40" />
          </button>

          <button
            onClick={() => navigate('/agent/candidatures')}
            className="flex items-center justify-between p-4 bg-white border-[#EFEBE9] rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-[#2C1810]">Candidatures</p>
                <p className="text-sm text-[#2C1810]/60">En cours</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#2C1810]/40" />
          </button>
        </div>

        {/* Recent Properties */}
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-[#2C1810] mb-4">Propriétés récentes</h2>
        </div>

        {recentProperties.length === 0 ? (
          <Card className="bg-white border-[#EFEBE9]">
            <CardContent className="p-12 text-center">
              <Home className="w-12 h-12 mx-auto text-[#2C1810]/20 mb-4" />
              <h3 className="text-lg font-semibold text-[#2C1810] mb-2">
                Aucune propriété attribuée
              </h3>
              <p className="text-[#2C1810]/60">
                Vous n'avez pas encore de propriétés attribuées. Contactez votre agence.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentProperties.map((assignment) => {
              const property = assignment.properties;
              if (!property) return null;

              return (
                <Card
                  key={assignment.id}
                  className="bg-white border-[#EFEBE9] overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/agent/proprietes/${property.id}`)}
                >
                  <div className="h-40 bg-[#FAF7F4] relative">
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
                    <div className="absolute top-2 right-2">
                      {property.status === 'disponible' ? (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                          Disponible
                        </span>
                      ) : property.status === 'loue' ? (
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                          Loué
                        </span>
                      ) : property.status === 'en_attente' ? (
                        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                          En attente
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded">
                          {property.status}
                        </span>
                      )}
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-[#2C1810] mb-1 line-clamp-1">
                      {property.title}
                    </h3>
                    <p className="text-sm text-[#2C1810]/60 mb-3">
                      {property.city}
                      {property.neighborhood && `, ${property.neighborhood}`}
                    </p>
                    <div className="flex items-center justify-between pt-3 border-t border-[#EFEBE9] text-sm">
                      <span className="text-[#2C1810]/60">
                        {assignment.assignment_type === 'exclusive' ? 'Exclusif' : 'Partagé'}
                      </span>
                      <span className="font-semibold text-[#F16522]">
                        {property.price.toLocaleString()} F
                      </span>
                    </div>
                    {assignment.start_date && (
                      <p className="text-xs text-[#2C1810]/40 mt-2">
                        Depuis {format(new Date(assignment.start_date), 'MMMM yyyy', { locale: fr })}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* View All Button */}
        {recentProperties.length > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/agent/proprietes')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#F16522] hover:bg-[#D14E12] text-white rounded-lg font-medium transition-colors"
            >
              Voir toutes mes propriétés
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
