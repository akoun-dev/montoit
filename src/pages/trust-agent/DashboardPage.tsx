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
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import TrustAgentHeader from '../../features/trust-agent/components/TrustAgentHeader';
import ValidationMetrics from '../../features/trust-agent/components/ValidationMetrics';
import QuickActionsPanel from '../../features/trust-agent/components/QuickActionsPanel';
import WeekCalendarWidget from '../../features/trust-agent/components/WeekCalendarWidget';
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

export default function TrustAgentDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
  });

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
        .order('created_at', { ascending: false });

      if (error) throw error;

      const missionData = (data || []) as Mission[];
      setMissions(missionData);

      setStats({
        total: missionData.length,
        pending: missionData.filter((m) => m.status === 'pending' || m.status === 'assigned')
          .length,
        inProgress: missionData.filter((m) => m.status === 'in_progress').length,
        completed: missionData.filter((m) => m.status === 'completed').length,
      });
    } catch (error) {
      console.error('Error loading missions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMissionClick = (mission: Mission) => {
    navigate(`/trust-agent/mission/${mission.id}`);
  };

  const metricsStats = {
    activeDisputes: stats.pending,
    resolvedDisputes: stats.completed,
    avgResolutionTime: 2.5,
    satisfactionScore: 4.2,
    pendingValidations: stats.inProgress,
    underReview: 0,
    escalationRate: 5,
    successRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
  };

  return (
    <div className="min-h-screen bg-background">
      <TrustAgentHeader title="Dashboard Agent" />

      <main className="w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <ClipboardList className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Missions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-sm text-muted-foreground">En attente</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.inProgress}</p>
                  <p className="text-sm text-muted-foreground">En cours</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.completed}</p>
                  <p className="text-sm text-muted-foreground">Terminées</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Missions List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Mes Missions</h2>
              <Badge variant="outline">{missions.length} mission(s)</Badge>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="h-32" />
                  </Card>
                ))}
              </div>
            ) : missions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Aucune mission assignée pour le moment</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {missions.map((mission) => {
                  const MissionIcon =
                    missionTypeConfig[mission.mission_type]?.icon || ClipboardList;
                  const typeLabel =
                    missionTypeConfig[mission.mission_type]?.label || mission.mission_type;
                  const statusInfo = statusConfig[mission.status] ?? {
                    label: mission.status,
                    variant: 'secondary' as const,
                  };
                  const urgencyInfo = urgencyConfig[mission.urgency] ?? {
                    label: mission.urgency,
                    color: 'text-muted-foreground',
                  };

                  return (
                    <Card
                      key={mission.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleMissionClick(mission)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className="p-3 rounded-lg bg-primary/10">
                              <MissionIcon className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{typeLabel}</h3>
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
                              {mission.urgency === 'urgent' && (
                                <AlertTriangle className="h-3 w-3 inline mr-1" />
                              )}
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
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <ValidationMetrics stats={metricsStats} />
            <WeekCalendarWidget missions={missions} />
            <QuickActionsPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
