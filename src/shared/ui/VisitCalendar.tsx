/**
 * VisitCalendar - Calendrier de sélection de créneaux de visite
 * Affiche les créneaux disponibles d'un propriétaire pour une propriété
 */

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Clock, Video, MapPin } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, isAfter, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/shared/lib/utils';

interface VisitSlot {
  id: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
  visit_type: 'physical' | 'virtual';
}

interface VisitCalendarProps {
  slots: VisitSlot[];
  selectedSlot: string | null;
  onSelectSlot: (slotId: string) => void;
  loading?: boolean;
}

export function VisitCalendar({
  slots,
  selectedSlot,
  onSelectSlot,
  loading = false,
}: VisitCalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const today = new Date();
  const weekStart = addDays(startOfWeek(today, { weekStartsOn: 1 }), weekOffset * 7);

  // Générer les jours de la semaine
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Grouper les créneaux par jour
  const slotsByDay = useMemo(() => {
    const grouped: Record<string, VisitSlot[]> = {};
    slots.forEach((slot) => {
      const day = format(parseISO(slot.start_time), 'yyyy-MM-dd');
      if (!grouped[day]) grouped[day] = [];
      grouped[day]?.push(slot);
    });
    // Trier chaque jour par heure
    Object.keys(grouped).forEach((day) => {
      grouped[day]?.sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
    });
    return grouped;
  }, [slots]);

  const formatTime = (dateStr: string) => {
    return format(parseISO(dateStr), 'HH:mm');
  };

  const isSlotPast = (slot: VisitSlot) => {
    return !isAfter(parseISO(slot.start_time), new Date());
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-7 gap-2">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      {/* Header navigation */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button
          onClick={() => setWeekOffset((w) => w - 1)}
          disabled={weekOffset === 0}
          className="p-2 hover:bg-muted rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="font-semibold text-foreground">
          {format(weekStart, 'dd MMM', { locale: fr })} -{' '}
          {format(addDays(weekStart, 6), 'dd MMM yyyy', { locale: fr })}
        </h3>
        <button
          onClick={() => setWeekOffset((w) => w + 1)}
          disabled={weekOffset >= 4}
          className="p-2 hover:bg-muted rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendrier grille */}
      <div className="grid grid-cols-7">
        {/* En-têtes des jours */}
        {weekDays.map((day, i) => {
          const isToday = isSameDay(day, today);
          const isPast = !isAfter(day, today) && !isToday;

          return (
            <div
              key={i}
              className={cn(
                'p-2 text-center border-b border-r border-border last:border-r-0',
                isPast && 'opacity-50'
              )}
            >
              <p className="text-xs text-muted-foreground uppercase">
                {format(day, 'EEE', { locale: fr })}
              </p>
              <p className={cn('text-lg font-semibold', isToday && 'text-primary')}>
                {format(day, 'd')}
              </p>
            </div>
          );
        })}

        {/* Créneaux par jour */}
        {weekDays.map((day, dayIndex) => {
          const dayKey = format(day, 'yyyy-MM-dd');
          const daySlots = slotsByDay[dayKey] || [];
          const isPast = !isAfter(day, today) && !isSameDay(day, today);

          return (
            <div
              key={dayIndex}
              className={cn(
                'min-h-[120px] p-2 border-r border-border last:border-r-0',
                isPast && 'bg-muted/30'
              )}
            >
              {daySlots.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center mt-4">
                  {isPast ? '-' : 'Aucun créneau'}
                </p>
              ) : (
                <div className="space-y-1">
                  {daySlots.map((slot) => {
                    const isPastSlot = isSlotPast(slot);
                    const isSelected = selectedSlot === slot.id;
                    const isAvailable = !slot.is_booked && !isPastSlot;

                    return (
                      <button
                        key={slot.id}
                        onClick={() => isAvailable && onSelectSlot(slot.id)}
                        disabled={!isAvailable}
                        className={cn(
                          'w-full text-left px-2 py-1.5 rounded-lg text-xs transition-all',
                          isSelected && 'ring-2 ring-primary bg-primary/10',
                          isAvailable &&
                            !isSelected &&
                            'bg-green-50 hover:bg-green-100 text-green-700',
                          slot.is_booked && 'bg-orange-50 text-orange-600 cursor-not-allowed',
                          isPastSlot && 'bg-muted text-muted-foreground cursor-not-allowed'
                        )}
                      >
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span className="font-medium">{formatTime(slot.start_time)}</span>
                          {slot.visit_type === 'virtual' ? (
                            <Video className="w-3 h-3 text-blue-500" />
                          ) : (
                            <MapPin className="w-3 h-3 text-green-600" />
                          )}
                        </div>
                        {slot.is_booked && <p className="text-[10px] opacity-70">Réservé</p>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Légende */}
      <div className="flex items-center justify-center gap-4 p-3 border-t border-border bg-muted/30">
        <span className="flex items-center gap-1 text-xs">
          <span className="w-3 h-3 rounded bg-green-100" />
          Disponible
        </span>
        <span className="flex items-center gap-1 text-xs">
          <span className="w-3 h-3 rounded bg-orange-100" />
          Réservé
        </span>
        <span className="flex items-center gap-1 text-xs">
          <Video className="w-3 h-3 text-blue-500" />
          Virtuel
        </span>
        <span className="flex items-center gap-1 text-xs">
          <MapPin className="w-3 h-3 text-green-600" />
          Physique
        </span>
      </div>
    </div>
  );
}

export type { VisitSlot, VisitCalendarProps };
