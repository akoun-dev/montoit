import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/shared/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { cn } from '@/shared/lib/utils';

interface Mission {
  id: string;
  scheduled_date: string | null;
  urgency: string;
  status: string;
  mission_type: string;
}

interface MissionCalendarProps {
  missions: Mission[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onPlanMission?: (date: Date) => void;
  compact?: boolean;
}

const urgencyColors: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-500',
  low: 'bg-green-500',
};

export default function MissionCalendar({
  missions,
  selectedDate,
  onSelectDate,
  onPlanMission,
  compact = false,
}: MissionCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getMissionsForDate = (date: Date): Mission[] => {
    return missions.filter((mission) => {
      if (!mission.scheduled_date) return false;
      return isSameDay(new Date(mission.scheduled_date), date);
    });
  };

  const getHighestUrgency = (dayMissions: Mission[]): string | null => {
    if (dayMissions.length === 0) return null;
    const urgencyOrder = ['urgent', 'high', 'medium', 'low'];
    for (const urgency of urgencyOrder) {
      if (dayMissions.some((m) => m.urgency === urgency)) {
        return urgency;
      }
    }
    return 'low';
  };

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className={compact ? 'text-base' : 'text-lg'}>
            {format(currentMonth, 'MMMM yyyy', { locale: fr })}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="small"
              className="h-8 w-8 p-0"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="small"
              className="h-8 w-8 p-0"
              onClick={() => setCurrentMonth(new Date())}
            >
              <span className="text-xs">Auj.</span>
            </Button>
            <Button
              variant="ghost"
              size="small"
              className="h-8 w-8 p-0"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Week days header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div
              key={day}
              className={cn(
                'text-center font-medium text-muted-foreground',
                compact ? 'text-xs py-1' : 'text-sm py-2'
              )}
            >
              {compact ? day.charAt(0) : day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const dayMissions = getMissionsForDate(day);
            const highestUrgency = getHighestUrgency(dayMissions);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);

            return (
              <div key={day.toISOString()} className="relative group">
                <button
                  onClick={() => onSelectDate(day)}
                  className={cn(
                    'relative flex flex-col items-center justify-center rounded-lg transition-colors w-full',
                    compact ? 'h-8' : 'h-12',
                    !isCurrentMonth && 'text-muted-foreground/40',
                    isCurrentMonth && 'hover:bg-muted',
                    isSelected && 'bg-primary text-primary-foreground hover:bg-primary',
                    isTodayDate && !isSelected && 'bg-accent text-accent-foreground font-bold'
                  )}
                >
                  <span className={cn('text-sm', compact && 'text-xs')}>{format(day, 'd')}</span>

                  {/* Mission indicators */}
                  {dayMissions.length > 0 && (
                    <div className={cn('flex gap-0.5 mt-0.5', compact && 'absolute bottom-0.5')}>
                      {compact ? (
                        <span
                          className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            highestUrgency && urgencyColors[highestUrgency]
                          )}
                        />
                      ) : (
                        dayMissions
                          .slice(0, 3)
                          .map((mission, idx) => (
                            <span
                              key={idx}
                              className={cn(
                                'w-1.5 h-1.5 rounded-full',
                                urgencyColors[mission.urgency] || 'bg-muted-foreground'
                              )}
                            />
                          ))
                      )}
                      {!compact && dayMissions.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{dayMissions.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </button>

                {/* Add mission button - only in non-compact mode */}
                {!compact && onPlanMission && isCurrentMonth && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlanMission(day);
                    }}
                    className={cn(
                      'absolute -top-1 -right-1 w-5 h-5 rounded-full',
                      'bg-primary text-primary-foreground',
                      'flex items-center justify-center',
                      'opacity-0 group-hover:opacity-100 transition-opacity',
                      'shadow-sm hover:scale-110 transition-transform',
                      'z-10'
                    )}
                    title="Planifier une mission"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
