/**
 * Page de calendrier améliorée pour l'agent de confiance
 *
 * Fonctionnalités:
 * - Drag-and-drop pour replanifier les missions
 * - Vue semaine/mois basculable
 * - Filtres par type de mission
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar as CalendarIcon, ArrowLeft, Plus, List, Filter, Grid } from 'lucide-react';
import {
  isSameDay,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  addDays,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { DndContext, closestCenter, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { Button } from '@/shared/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/badge';
import { toast } from '@/hooks/shared/useSafeToast';
import { cn } from '@/shared/lib/utils';

interface Mission {
  id: string;
  property_id: string;
  mission_type: 'inspection' | 'verification' | 'mediation' | 'documentation';
  status: string;
  urgency: string;
  scheduled_date: string | null;
  notes: string | null;
  created_at: string;
  property?: {
    title: string;
    address: string;
    city: string;
  };
}

type ViewMode = 'month' | 'week';
type MissionTypeFilter = Mission['mission_type'] | 'all';

const MISSION_TYPE_CONFIG = {
  inspection: { label: 'Inspection', color: 'bg-blue-500' },
  verification: { label: 'Vérification', color: 'bg-green-500' },
  mediation: { label: 'Médiation', color: 'bg-purple-500' },
  documentation: { label: 'Documentation', color: 'bg-orange-500' },
};

const MISSION_TYPE_FILTERS = [
  { value: 'all' as const, label: 'Toutes' },
  { value: 'inspection' as const, label: 'Inspections' },
  { value: 'verification' as const, label: 'Vérifications' },
  { value: 'mediation' as const, label: 'Médiations' },
  { value: 'documentation' as const, label: 'Documentations' },
];

export default function CalendarPage() {
  const { user } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [missionTypeFilter, setMissionTypeFilter] = useState<MissionTypeFilter>('all');
  const [activeMissionId, setActiveMissionId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    if (user) {
      loadMissions();
    }
  }, [user]);

  const loadMissions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cev_missions')
        .select(
          `
          *,
          property:properties(title, address, city)
        `
        )
        .not('scheduled_date', 'is', null)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setMissions((data || []) as Mission[]);
    } catch (error) {
      console.error('Error loading missions:', error);
      toast.error('Erreur lors du chargement des missions');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveMissionId(null);

    if (!over || active.id === over.id) return;

    try {
      const newDate = over.id as string;

      const { error } = await supabase
        .from('cev_missions')
        .update({
          scheduled_date: newDate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', active.id);

      if (error) throw error;

      toast.success('Mission replanifiée avec succès');
      loadMissions();
    } catch (error) {
      console.error('Error rescheduling mission:', error);
      toast.error('Erreur lors de la replanification de la mission');
    }
  };

  const filteredMissions = missions.filter((mission) => {
    if (missionTypeFilter === 'all') return true;
    return mission.mission_type === missionTypeFilter;
  });

  const getVisibleDays = (): Date[] => {
    if (viewMode === 'week') {
      return eachDayOfInterval({
        start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
        end: endOfWeek(selectedDate, { weekStartsOn: 1 }),
      });
    }
    return eachDayOfInterval({
      start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
      end: endOfWeek(selectedDate, { weekStartsOn: 1 }),
    });
  };

  const visibleDays = getVisibleDays();

  const getMissionsForDate = (date: Date): Mission[] => {
    return filteredMissions.filter((mission) => {
      if (!mission.scheduled_date) return false;
      return isSameDay(new Date(mission.scheduled_date), date);
    });
  };

  const stats = {
    total: filteredMissions.length,
    thisWeek: filteredMissions.filter((m) => {
      if (!m.scheduled_date) return false;
      const missionDate = new Date(m.scheduled_date);
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return missionDate >= now && missionDate <= weekFromNow;
    }).length,
    urgent: filteredMissions.filter((m) => m.urgency === 'urgent' || m.urgency === 'high').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/trust-agent/dashboard">
                <Button variant="ghost" size="small">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Retour
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <CalendarIcon className="h-6 w-6 text-primary-500" />
                  Calendrier des Missions
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Glissez-déposez les missions pour les replanifier
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('week')}
                  className={cn(
                    'px-3 py-2 text-sm font-medium transition-colors',
                    viewMode === 'week'
                      ? 'bg-primary-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <List className="h-4 w-4 mr-1 inline" />
                  Semaine
                </button>
                <button
                  onClick={() => setViewMode('month')}
                  className={cn(
                    'px-3 py-2 text-sm font-medium transition-colors',
                    viewMode === 'month'
                      ? 'bg-primary-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <Grid className="h-4 w-4 mr-1 inline" />
                  Mois
                </button>
              </div>

              <Button onClick={() => {/* Open plan modal */}}>
                <Plus className="h-4 w-4 mr-1" />
                Nouvelle
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          <Card className="lg:col-span-1">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Type de mission</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {MISSION_TYPE_FILTERS.map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setMissionTypeFilter(filter.value)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      missionTypeFilter === filter.value
                        ? 'bg-primary-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <CalendarIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-xs text-gray-500">Missions planifiées</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100">
                    <List className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.thisWeek}</p>
                    <p className="text-xs text-gray-500">Cette semaine</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-100">
                    <Plus className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">{stats.urgent}</p>
                    <p className="text-xs text-gray-500">Urgentes</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-96 bg-gray-200 rounded-xl animate-pulse" />
            <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>
                        {viewMode === 'week'
                          ? `Semaine du ${format(visibleDays[0], 'dd MMM', { locale: fr })}`
                          : format(selectedDate, 'MMMM yyyy', { locale: fr })
                        }
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="small"
                          onClick={() => setSelectedDate(addDays(selectedDate, -7))}
                        >
                          ←
                        </Button>
                        <Button
                          variant="outline"
                          size="small"
                          onClick={() => setSelectedDate(new Date())}
                        >
                          Auj.
                        </Button>
                        <Button
                          variant="outline"
                          size="small"
                          onClick={() => setSelectedDate(addDays(selectedDate, 7))}
                        >
                          →
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-7 gap-2 mb-4">
                      {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
                        <div
                          key={day}
                          className="text-center font-medium text-gray-500 text-sm py-2"
                        >
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                      {visibleDays.map((day) => {
                        const dayMissions = getMissionsForDate(day);
                        const isToday = isSameDay(day, new Date());

                        return (
                          <div
                            key={day.toISOString()}
                            id={day.toISOString()}
                            className={cn(
                              'min-h-[120px] p-2 rounded-lg border-2 border-dashed transition-all',
                              isToday ? 'border-primary-300 bg-primary-50' : 'border-gray-200 bg-gray-50',
                              'hover:border-primary-400'
                            )}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className={cn(
                                'text-sm font-medium',
                                isToday && 'text-primary-600'
                              )}>
                                {format(day, 'd')}
                              </span>
                              {isToday && (
                                <Badge className="text-xs">Auj.</Badge>
                              )}
                            </div>

                            <div className="space-y-1">
                              {dayMissions.map((mission) => {
                                const config = MISSION_TYPE_CONFIG[mission.mission_type];
                                return (
                                  <div
                                    key={mission.id}
                                    id={mission.id}
                                    className={cn(
                                      'p-2 rounded-lg text-xs cursor-grab active:cursor-grabbing',
                                      'hover:shadow-md transition-shadow',
                                      config.color,
                                      'text-white'
                                    )}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium truncate flex-1">
                                        {mission.property?.title || 'Mission'}
                                      </span>
                                      {mission.urgency === 'urgent' && (
                                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="mt-2 text-center">
                              <span className="text-xs text-gray-400">
                                {dayMissions.length} mission{dayMissions.length > 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {format(selectedDate, 'dd MMMM yyyy', { locale: fr })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const selectedDayMissions = getMissionsForDate(selectedDate);
                      if (selectedDayMissions.length === 0) {
                        return (
                          <div className="text-center py-8 text-gray-400">
                            <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>Aucune mission ce jour</p>
                          </div>
                        );
                      }
                      return (
                        <div className="space-y-3">
                          {selectedDayMissions.map((mission) => {
                            const config = MISSION_TYPE_CONFIG[mission.mission_type];
                            return (
                              <div
                                key={mission.id}
                                className={cn(
                                  'p-3 rounded-lg',
                                  'bg-white border border-gray-200'
                                )}
                              >
                                <div className="flex items-start gap-2">
                                  <div className={cn('w-3 h-3 rounded-full mt-1', config.color)} />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">
                                      {mission.property?.title || 'Mission'}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {config.label}
                                    </p>
                                    {mission.property?.address && (
                                      <p className="text-xs text-gray-400 mt-1 truncate">
                                        {mission.property.address}
                                      </p>
                                    )}
                                  </div>
                                  <Badge
                                    className={cn(
                                      'text-xs',
                                      mission.urgency === 'urgent' && 'bg-red-100 text-red-700',
                                      mission.urgency === 'high' && 'bg-orange-100 text-orange-700'
                                    )}
                                  >
                                    {mission.urgency}
                                  </Badge>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>
            </div>

            <DragOverlay>
              {activeMissionId && (
                <div className="p-3 rounded-lg bg-primary-500 text-white shadow-lg cursor-grabbing">
                  {missions.find(m => m.id === activeMissionId)?.property?.title || 'Mission'}
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </main>
    </div>
  );
}
