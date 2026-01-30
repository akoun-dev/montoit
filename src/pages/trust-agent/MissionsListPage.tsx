import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Camera,
  FileCheck,
  Home,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Badge } from '@/shared/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { AddressValue, formatAddress } from '@/shared/utils/address';

// New Trust Agent UI Components
import {
  KPICard,
  EmptyState,
  FilterBar,
  TrustAgentPageHeader,
  MissionCard,
} from '@/shared/ui/trust-agent';

interface Mission {
  id: string;
  property_id: string;
  mission_type: string;
  status: string;
  urgency: string;
  scheduled_date: string | null;
  notes: string | null;
  created_at: string;
  property?: {
    title: string;
    address: AddressValue;
    city: string;
  };
  agent?: {
    full_name: string;
    email: string;
    phone: string | null;
  };
}

const STATUS_CONFIG = {
  pending: { label: 'En attente', variant: 'secondary' as const, bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' },
  assigned: { label: 'Assignée', variant: 'outline' as const, bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  in_progress: { label: 'En cours', variant: 'default' as const, bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  completed: { label: 'Terminée', variant: 'secondary' as const, bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  cancelled: { label: 'Annulée', variant: 'destructive' as const, bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
};

const URGENCY_CONFIG = {
  low: { label: 'Basse', color: 'text-gray-500' },
  medium: { label: 'Moyenne', color: 'text-amber-600' },
  high: { label: 'Haute', color: 'text-orange-600' },
  urgent: { label: 'Urgente', color: 'text-red-600' },
};

const MISSION_TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  cev: { label: 'CEV Complète', icon: ClipboardList },
  cev_complete: { label: 'CEV Complète', icon: ClipboardList },
  cev_property: { label: 'CEV Propriété', icon: ClipboardList },
  cev_tenant: { label: 'CEV Locataire', icon: ClipboardList },
  photos: { label: 'Vérification Photos', icon: Camera },
  documents: { label: 'Validation Documents', icon: FileCheck },
  etat_lieux: { label: 'État des Lieux', icon: Home },
  verification: { label: 'Vérification', icon: CheckCircle2 },
};

interface TrustAgentProfile {
  role: 'manager' | 'agent';
}

export default function MissionsListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [agentProfile, setAgentProfile] = useState<TrustAgentProfile | null>(null);

  const loadMissions = useCallback(async () => {
    try {
      // Load all missions (RLS will filter based on role)
      const { data, error } = await supabase
        .from('cev_missions')
        .select(`
          *,
          property:properties(title, address, city),
          agent:field_agents(full_name, email, phone)
        `)
        .order('urgency', { ascending: false })
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setMissions((data || []) as Mission[]);
    } catch (error) {
      console.error('Error loading missions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAgentProfile = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('trust_agent_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading agent profile:', error);
      }

      setAgentProfile(data as TrustAgentProfile | null);
    } catch (error) {
      console.error('Error loading agent profile:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadMissions();
      loadAgentProfile();
    }
  }, [user, loadMissions, loadAgentProfile]);

  const filteredMissions = useMemo(() => {
    return missions.filter((mission) => {
      // Status filter based on tab
      if (activeTab === 'pending' && !['pending', 'assigned'].includes(mission.status)) return false;
      if (activeTab === 'in_progress' && mission.status !== 'in_progress') return false;
      if (activeTab === 'completed' && mission.status !== 'completed') return false;

      // Type filter
      if (typeFilter && mission.mission_type !== typeFilter) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const addressText = formatAddress(mission.property?.address, mission.property?.city).toLowerCase();
        return (
          mission.property?.title?.toLowerCase().includes(query) ||
          mission.property?.city?.toLowerCase().includes(query) ||
          addressText.includes(query)
        );
      }

      return true;
    });
  }, [missions, activeTab, typeFilter, searchQuery]);

  const stats = useMemo(() => ({
    all: missions.length,
    pending: missions.filter((m) => ['pending', 'assigned'].includes(m.status)).length,
    in_progress: missions.filter((m) => m.status === 'in_progress').length,
    completed: missions.filter((m) => m.status === 'completed').length,
  }), [missions]);

  const handleMissionClick = (mission: Mission) => {
    navigate(`/trust-agent/mission/${mission.id}`);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setTypeFilter(null);
  };

  const activeFiltersCount = (typeFilter ? 1 : 0) + (searchQuery ? 1 : 0);

  // KPI Cards Data
  const kpiData = [
    { title: 'Total', value: stats.all, icon: <ClipboardList />, variant: 'default' as const },
    { title: 'En attente', value: stats.pending, icon: <Clock />, variant: 'warning' as const },
    { title: 'En cours', value: stats.in_progress, icon: <AlertTriangle />, variant: 'info' as const },
    { title: 'Terminées', value: stats.completed, icon: <CheckCircle2 />, variant: 'success' as const },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <TrustAgentPageHeader
        title="Mes Missions"
        subtitle="Gérez vos missions de vérification"
        badges={[
          ...(agentProfile ? [{
            label: agentProfile.role === 'manager' ? 'Manager' : 'Agent',
            variant: agentProfile.role === 'manager' ? 'info' as const : 'default' as const,
          }] : []),
          { label: `${stats.pending} en attente`, variant: stats.pending > 0 ? 'warning' : 'secondary' },
          { label: `${stats.in_progress} en cours`, variant: stats.in_progress > 0 ? 'info' : 'secondary' },
        ]}
        actions={[
          {
            label: 'Nouvelle Mission',
            icon: <Plus className="h-4 w-4" />,
            onClick: () => navigate('/trust-agent/missions/new'),
            variant: 'primary',
          },
        ]}
        showSearch
        onSearch={setSearchQuery}
        searchPlaceholder="Rechercher une mission..."
      />

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {kpiData.map((kpi, index) => (
            <KPICard key={index} {...kpi} />
          ))}
        </div>

        {/* Filter Bar */}
        <FilterBar
          searchPlaceholder="Rechercher une mission..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          groups={[
            {
              id: 'type',
              label: 'Type de mission',
              type: 'radio',
              options: [
                { value: 'all', label: 'Tous les types', count: stats.all },
                { value: 'cev', label: 'CEV Complète', count: missions.filter(m => m.mission_type.includes('cev')).length, icon: <ClipboardList className="h-3 w-3" /> },
                { value: 'photos', label: 'Vérification Photos', count: missions.filter(m => m.mission_type === 'photos').length, icon: <Camera className="h-3 w-3" /> },
                { value: 'documents', label: 'Validation Documents', count: missions.filter(m => m.mission_type === 'documents').length, icon: <FileCheck className="h-3 w-3" /> },
                { value: 'etat_lieux', label: 'État des Lieux', count: missions.filter(m => m.mission_type === 'etat_lieux').length, icon: <Home className="h-3 w-3" /> },
              ],
              selected: typeFilter === null ? [] : [typeFilter],
              onChange: (values) => setTypeFilter(values[0] || null),
            },
          ]}
          activeFiltersCount={activeFiltersCount}
          onClearFilters={handleClearFilters}
        />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-white border border-gray-200 rounded-xl">
            <TabsTrigger value="all" className="py-3 data-[state=active]:bg-primary-500 data-[state=active]:text-white">
              Toutes
              <Badge variant="secondary" className="ml-2 data-[state=active]:bg-white/20 data-[state=active]:text-white">
                {stats.all}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="pending" className="py-3 data-[state=active]:bg-primary-500 data-[state=active]:text-white">
              En attente
              <Badge variant="secondary" className="ml-2 data-[state=active]:bg-white/20 data-[state=active]:text-white">
                {stats.pending}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="in_progress" className="py-3 data-[state=active]:bg-primary-500 data-[state=active]:text-white">
              En cours
              <Badge variant="secondary" className="ml-2 data-[state=active]:bg-white/20 data-[state=active]:text-white">
                {stats.in_progress}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="completed" className="py-3 data-[state=active]:bg-primary-500 data-[state=active]:text-white">
              Terminées
              <Badge variant="secondary" className="ml-2 data-[state=active]:bg-white/20 data-[state=active]:text-white">
                {stats.completed}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {loading ? (
              <div className="grid gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredMissions.length === 0 ? (
              <EmptyState
                icon={<ClipboardList />}
                title={activeFiltersCount > 0 ? 'Aucune mission trouvée' : 'Aucune mission'}
                description={
                  activeFiltersCount > 0
                    ? 'Essayez d\'ajuster vos critères de recherche'
                    : 'Vous n\'avez pas encore de missions assignées'
                }
                actionLabel={activeFiltersCount > 0 ? 'Effacer les filtres' : undefined}
                onAction={activeFiltersCount > 0 ? handleClearFilters : undefined}
                variant={activeFiltersCount > 0 ? 'filter' : 'default'}
              />
            ) : (
              <div className="space-y-3">
                {filteredMissions.map((mission) => {
                  const typeKey = mission.mission_type?.toLowerCase() || 'verification';
                  const typeConfig = MISSION_TYPE_CONFIG[typeKey] || MISSION_TYPE_CONFIG.verification;
                  const statusConfig = STATUS_CONFIG[mission.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                  const urgencyConfig = URGENCY_CONFIG[mission.urgency as keyof typeof URGENCY_CONFIG] || URGENCY_CONFIG.low;

                  return (
                    <MissionCard
                      key={mission.id}
                      title={typeConfig.label}
                      type={mission.property?.title || 'Propriété inconnue'}
                      typeIcon={<typeConfig.icon className="h-6 w-6" />}
                      typeColor="bg-primary/10 text-primary-600"
                      status={mission.status as 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'}
                      statusLabel={statusConfig.label}
                      urgency={mission.urgency as 'low' | 'medium' | 'high' | 'urgent'}
                      urgencyLabel={urgencyConfig.label}
                      property={mission.property ? {
                        title: mission.property.title,
                        address: mission.property.address,
                        city: mission.property.city,
                      } : undefined}
                      agent={mission.agent ? {
                        name: mission.agent.full_name,
                        phone: mission.agent.phone || undefined,
                      } : undefined}
                      scheduledDate={mission.scheduled_date ? new Date(mission.scheduled_date) : undefined}
                      progress={mission.status === 'completed' ? 100 : mission.status === 'in_progress' ? 50 : 0}
                      onClick={() => handleMissionClick(mission)}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
