import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Camera,
  FileCheck,
  Home,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
} from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import TrustAgentHeader from '../../features/trust-agent/components/TrustAgentHeader';
import { AddressValue, formatAddress } from '@/shared/utils/address';

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
}

const statusConfig: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  pending: { label: 'En attente', variant: 'secondary' },
  assigned: { label: 'Assignée', variant: 'outline' },
  in_progress: { label: 'En cours', variant: 'default' },
  completed: { label: 'Terminée', variant: 'secondary' },
  cancelled: { label: 'Annulée', variant: 'destructive' },
};

const urgencyConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'Basse', color: 'text-muted-foreground' },
  medium: { label: 'Moyenne', color: 'text-amber-600' },
  high: { label: 'Haute', color: 'text-orange-600' },
  urgent: { label: 'Urgente', color: 'text-destructive' },
};

const missionTypeConfig: Record<string, { label: string; icon: React.ElementType }> = {
  cev: { label: 'CEV Complète', icon: ClipboardList },
  photos: { label: 'Vérification Photos', icon: Camera },
  documents: { label: 'Validation Documents', icon: FileCheck },
  etat_lieux: { label: 'État des Lieux', icon: Home },
  verification: { label: 'Vérification', icon: CheckCircle2 },
};

export default function MissionsListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadMissions();
    }
  }, [user]);

  const loadMissions = async () => {
    try {
      const { data, error } = await supabase
        .from('cev_missions')
        .select(
          `
          *,
          property:properties(title, address, city)
        `
        )
        .eq('assigned_agent_id', user?.id ?? '')
        .order('urgency', { ascending: false })
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setMissions((data || []) as Mission[]);
    } catch (error) {
      console.error('Error loading missions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMissions = missions.filter((mission) => {
    const missionType = (mission.mission_type || '').toLowerCase();
    const selectedType = typeFilter ? typeFilter.toLowerCase() : null;

    // Status filter
    if (activeTab === 'pending' && !['pending', 'assigned'].includes(mission.status)) return false;
    if (activeTab === 'in_progress' && mission.status !== 'in_progress') return false;
    if (activeTab === 'completed' && mission.status !== 'completed') return false;

    // Type filter
    if (selectedType && missionType !== selectedType) return false;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const addressText = formatAddress(
        mission.property?.address,
        mission.property?.city
      ).toLowerCase();
      return (
        mission.property?.title?.toLowerCase().includes(query) ||
        mission.property?.city?.toLowerCase().includes(query) ||
        addressText.includes(query)
      );
    }

    return true;
  });

  const stats = {
    all: missions.length,
    pending: missions.filter((m) => ['pending', 'assigned'].includes(m.status)).length,
    in_progress: missions.filter((m) => m.status === 'in_progress').length,
    completed: missions.filter((m) => m.status === 'completed').length,
  };

  return (
    <div className="min-h-screen bg-background">
      <TrustAgentHeader title="Mes Missions" />

      <main className="w-full px-4 lg:px-8 xl:px-12 py-8">
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une mission..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={typeFilter === null ? 'secondary' : 'outline'}
              size="small"
              className="flex items-center gap-2"
              onClick={() => setTypeFilter(null)}
            >
              <Filter className="h-4 w-4" />
              Tous types
            </Button>
            {Object.entries(missionTypeConfig).map(([key, config]) => (
              <Button
                key={key}
                variant={(typeFilter || '') === key ? 'secondary' : 'outline'}
                size="small"
                className="flex items-center gap-2"
                onClick={() => setTypeFilter(key)}
              >
                <config.icon className="h-4 w-4" />
                {config.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" className="relative">
              Toutes
              <Badge variant="secondary" className="ml-2">
                {stats.all}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="pending">
              En attente
              <Badge variant="secondary" className="ml-2">
                {stats.pending}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="in_progress">
              En cours
              <Badge variant="secondary" className="ml-2">
                {stats.in_progress}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="completed">
              Terminées
              <Badge variant="secondary" className="ml-2">
                {stats.completed}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="h-32" />
                  </Card>
                ))}
              </div>
            ) : filteredMissions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Aucune mission trouvée</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredMissions.map((mission) => {
                  const typeKey = (mission.mission_type || '').toLowerCase();
                  const MissionIcon = missionTypeConfig[typeKey]?.icon || ClipboardList;
                  const typeLabel = missionTypeConfig[typeKey]?.label || mission.mission_type;
                  const statusInfo = statusConfig[mission.status] ?? {
                    label: mission.status,
                    variant: 'secondary' as const,
                  };
                  const urgencyInfo = urgencyConfig[mission.urgency] ?? {
                    label: mission.urgency,
                    color: 'text-muted-foreground',
                  };
                  const isUrgent = mission.urgency === 'urgent' || mission.urgency === 'high';

                  const handleMissionClick = (e: React.MouseEvent) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (!mission.id) {
                      console.error('Mission ID is missing', mission);
                      return;
                    }
                    console.log(
                      'Navigating to mission:',
                      mission.id,
                      'navigate function:',
                      typeof navigate
                    );
                    try {
                      navigate(`/trust-agent/mission/${mission.id}`);
                    } catch (err) {
                      console.error('Navigation error:', err);
                    }
                  };

                  return (
                    <Card
                      key={mission.id}
                      className={`cursor-pointer hover:shadow-md transition-shadow ${isUrgent ? 'border-l-4 border-l-destructive' : ''}`}
                      onClick={handleMissionClick}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div
                              className={`p-3 rounded-lg ${isUrgent ? 'bg-destructive/10' : 'bg-primary/10'}`}
                            >
                              <MissionIcon
                                className={`h-6 w-6 ${isUrgent ? 'text-destructive' : 'text-primary'}`}
                              />
                            </div>
                            <div>
                              <h3 className="font-semibold flex items-center gap-2">
                                {typeLabel}
                                {isUrgent && (
                                  <span className="animate-pulse">
                                    <AlertTriangle className="h-4 w-4 text-destructive" />
                                  </span>
                                )}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {mission.property?.title || 'Propriété inconnue'}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatAddress(mission.property?.address, mission.property?.city)}
                              </p>
                              {mission.scheduled_date && (
                                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Planifiée le{' '}
                                  {new Date(mission.scheduled_date).toLocaleDateString('fr-FR')}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                            <span className={`text-xs font-medium ${urgencyInfo.color}`}>
                              {urgencyInfo.label}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
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
