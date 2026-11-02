import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  ChevronRight,
  Clock,
  MapPin,
  ClipboardList,
  Camera,
  FileCheck,
  Home,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/badge';
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isToday,
  isSameDay,
  parseISO,
} from 'date-fns';
import { fr } from 'date-fns/locale';

interface Mission {
  id: string;
  property_id: string;
  mission_type: string;
  status: string;
  urgency: string;
  scheduled_date: string | null;
  notes: string | null;
  property?: {
    title: string;
    address: string;
    city: string;
  };
}

interface WeekCalendarWidgetProps {
  missions: Mission[];
}

const urgencyColors: Record<string, string> = {
  urgent: 'bg-destructive',
  high: 'bg-orange-500',
  medium: 'bg-amber-500',
  low: 'bg-green-500',
};

const missionTypeConfig: Record<string, { label: string; icon: React.ElementType }> = {
  cev: { label: 'CEV', icon: ClipboardList },
  photos: { label: 'Photos', icon: Camera },
  documents: { label: 'Documents', icon: FileCheck },
  etat_lieux: { label: 'État des lieux', icon: Home },
  verification: { label: 'Vérification', icon: CheckCircle2 },
};

export default function WeekCalendarWidget({ missions }: WeekCalendarWidgetProps) {
  const today = new Date();

  // Get days of current week (Monday to Sunday)
  const weekDays = useMemo(() => {
    const start = startOfWeek(today, { weekStartsOn: 1 });
    const end = endOfWeek(today, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, []);

  // Get missions for each day of the week
  const missionsByDay = useMemo(() => {
    const byDay: Record<string, Mission[]> = {};

    weekDays.forEach((day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      byDay[dateKey] = missions.filter((m) => {
        if (!m.scheduled_date) return false;
        return isSameDay(parseISO(m.scheduled_date), day);
      });
    });

    return byDay;
  }, [missions, weekDays]);

  // Get today's missions
  const todaysMissions = useMemo(() => {
    return missions
      .filter((m) => {
        if (!m.scheduled_date) return false;
        return isToday(parseISO(m.scheduled_date));
      })
      .slice(0, 3); // Show max 3
  }, [missions]);

  const totalTodayMissions = missions.filter((m) => {
    if (!m.scheduled_date) return false;
    return isToday(parseISO(m.scheduled_date));
  }).length;

  // Get highest urgency for a day
  const getDayUrgency = (dayMissions: Mission[]): string | null => {
    if (dayMissions.length === 0) return null;

    const urgencyOrder = ['urgent', 'high', 'medium', 'low'];
    for (const urgency of urgencyOrder) {
      if (dayMissions.some((m) => m.urgency === urgency)) {
        return urgency;
      }
    }
    return 'low';
  };

  return (
    <Card className="bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Cette Semaine
          </CardTitle>
          <Link
            to="/trust-agent/calendar"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            Calendrier
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Week Grid */}
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayMissions = missionsByDay[dateKey] || [];
            const urgency = getDayUrgency(dayMissions);
            const isDayToday = isToday(day);

            return (
              <div
                key={dateKey}
                className={`
                  flex flex-col items-center p-2 rounded-lg transition-colors
                  ${isDayToday ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}
                `}
              >
                <span
                  className={`text-[10px] uppercase font-medium ${isDayToday ? '' : 'text-muted-foreground'}`}
                >
                  {format(day, 'EEE', { locale: fr }).slice(0, 3)}
                </span>
                <span className={`text-sm font-semibold ${isDayToday ? '' : ''}`}>
                  {format(day, 'd')}
                </span>

                {/* Mission indicators */}
                <div className="flex gap-0.5 mt-1 min-h-[8px]">
                  {dayMissions.length > 0 && (
                    <>
                      {dayMissions.length <= 3 ? (
                        dayMissions.map((m, idx) => (
                          <div
                            key={idx}
                            className={`w-1.5 h-1.5 rounded-full ${urgencyColors[m.urgency] || 'bg-muted-foreground'}`}
                          />
                        ))
                      ) : (
                        <>
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${urgencyColors[urgency || 'low']}`}
                          />
                          <span
                            className={`text-[8px] font-medium ${isDayToday ? '' : 'text-muted-foreground'}`}
                          >
                            +{dayMissions.length}
                          </span>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Today's Missions */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              Aujourd'hui
            </h4>
            {totalTodayMissions > 0 && (
              <Badge variant="secondary" className="text-xs">
                {totalTodayMissions} mission{totalTodayMissions > 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          {todaysMissions.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">
              Aucune mission planifiée aujourd'hui
            </p>
          ) : (
            <div className="space-y-2">
              {todaysMissions.map((mission) => {
                const config = missionTypeConfig[mission.mission_type] || {
                  label: mission.mission_type,
                  icon: ClipboardList,
                };
                const MissionIcon = config.icon;

                return (
                  <Link
                    key={mission.id}
                    to={`/trust-agent/mission/${mission.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors group"
                  >
                    <div
                      className={`w-1 h-8 rounded-full ${urgencyColors[mission.urgency] || 'bg-muted-foreground'}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <MissionIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium truncate">{config.label}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{mission.property?.title || 'Propriété'}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                );
              })}

              {totalTodayMissions > 3 && (
                <Link
                  to="/trust-agent/calendar"
                  className="block text-xs text-center text-primary hover:underline pt-1"
                >
                  +{totalTodayMissions - 3} autre{totalTodayMissions - 3 > 1 ? 's' : ''} mission
                  {totalTodayMissions - 3 > 1 ? 's' : ''}
                </Link>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
