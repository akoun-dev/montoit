import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/services/supabase/client';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Download,
  ArrowLeft,
  Coins,
  Home as HomeIcon,
  Eye,
  Wrench,
} from 'lucide-react';

interface CalendarEvent {
  id: string;
  date: Date;
  type: 'payment_due' | 'payment_made' | 'visit' | 'maintenance' | 'lease_end';
  title: string;
  description?: string;
  amount?: number;
  status?: string;
}

export default function TenantCalendar() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/connexion');
      return;
    }

    if (profile && profile.user_type !== 'locataire') {
      navigate('/');
      return;
    }

    loadCalendarEvents();
  }, [user, profile, currentDate, navigate]);

  const loadCalendarEvents = async () => {
    if (!user) return;

    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const calendarEvents: CalendarEvent[] = [];

      // Load lease contracts instead of leases
      const { data: leaseData } = await supabase
        .from('lease_contracts' as any)
        .select('*')
        .eq('tenant_id', user.id)
        .eq('status', 'actif')
        .maybeSingle();

      if (leaseData) {
        const lease = leaseData as any;

        // Load property data to get monthly_rent
        const { data: propertyData } = await supabase
          .from('properties')
          .select('monthly_rent')
          .eq('id', lease.property_id)
          .single();

        const monthlyRent = propertyData?.monthly_rent || 0;

        const paymentDate = new Date(lease.start_date);
        while (paymentDate <= endOfMonth) {
          if (paymentDate >= startOfMonth) {
            calendarEvents.push({
              id: `payment_due_${paymentDate.toISOString()}`,
              date: new Date(paymentDate),
              type: 'payment_due',
              title: 'Échéance de loyer',
              amount: monthlyRent,
            });
          }
          paymentDate.setMonth(paymentDate.getMonth() + 1);
        }

        if (new Date(lease.end_date) >= startOfMonth && new Date(lease.end_date) <= endOfMonth) {
          calendarEvents.push({
            id: `lease_end_${lease.id}`,
            date: new Date(lease.end_date),
            type: 'lease_end',
            title: 'Fin de bail',
            description: 'Votre bail se termine',
          });
        }
      }

      // Load payments
      const { data: paymentsData } = await supabase
        .from('payments' as any)
        .select('*')
        .eq('tenant_id', user.id)
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString())
        .eq('status', 'complete');

      if (paymentsData) {
        (paymentsData as any[]).forEach((payment) => {
          calendarEvents.push({
            id: payment.id,
            date: new Date(payment.created_at),
            type: 'payment_made',
            title: 'Paiement effectué',
            amount: payment.amount,
            status: payment.status,
          });
        });
      }

      // Load visit requests
      const { data: visitsData } = await supabase
        .from('visit_requests' as any)
        .select('*, properties(title)')
        .eq('tenant_id', user.id)
        .gte('visit_date', startOfMonth.toISOString().split('T')[0])
        .lte('visit_date', endOfMonth.toISOString().split('T')[0])
        .eq('status', 'acceptee');

      if (visitsData) {
        (visitsData as any[]).forEach((visit) => {
          calendarEvents.push({
            id: visit.id,
            date: new Date(`${visit.visit_date}T${visit.visit_time}`),
            type: 'visit',
            title: `Visite: ${visit.properties?.title}`,
            description: visit.visit_time,
          });
        });
      }

      // Load maintenance requests
      const { data: maintenanceData } = await supabase
        .from('maintenance_requests' as any)
        .select('*')
        .eq('tenant_id', user.id)
        .not('scheduled_date', 'is', null)
        .gte('scheduled_date', startOfMonth.toISOString().split('T')[0])
        .lte('scheduled_date', endOfMonth.toISOString().split('T')[0]);

      if (maintenanceData) {
        (maintenanceData as any[]).forEach((maintenance) => {
          calendarEvents.push({
            id: maintenance.id,
            date: new Date(maintenance.scheduled_date!),
            type: 'maintenance',
            title: 'Intervention prévue',
            description: maintenance.issue_type,
          });
        });
      }

      setEvents(calendarEvents);
    } catch (error) {
      console.error('Error loading calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const getEventsForDay = (day: number) => {
    return events.filter((event) => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getDate() === day &&
        eventDate.getMonth() === currentDate.getMonth() &&
        eventDate.getFullYear() === currentDate.getFullYear()
      );
    });
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'payment_due':
        return <Coins className="h-3 w-3" />;
      case 'payment_made':
        return <Coins className="h-3 w-3" />;
      case 'visit':
        return <Eye className="h-3 w-3" />;
      case 'maintenance':
        return <Wrench className="h-3 w-3" />;
      case 'lease_end':
        return <HomeIcon className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'payment_due':
        return 'bg-red-500 text-white';
      case 'payment_made':
        return 'bg-green-500 text-white';
      case 'visit':
        return 'bg-blue-500 text-white';
      case 'maintenance':
        return 'bg-orange-500 text-white';
      case 'lease_end':
        return 'bg-purple-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const exportToICS = () => {
    let icsContent = 'BEGIN:VCALENDAR\n';
    icsContent += 'VERSION:2.0\n';
    icsContent += 'PRODID:-//Mon Toit//Tenant Calendar//FR\n';
    icsContent += 'CALSCALE:GREGORIAN\n';

    events.forEach((event) => {
      const eventDate = new Date(event.date);
      const dateStr = eventDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      icsContent += 'BEGIN:VEVENT\n';
      icsContent += `UID:${event.id}@montoit.ci\n`;
      icsContent += `DTSTAMP:${dateStr}\n`;
      icsContent += `DTSTART:${dateStr}\n`;
      icsContent += `SUMMARY:${event.title}\n`;
      if (event.description) {
        icsContent += `DESCRIPTION:${event.description}\n`;
      }
      icsContent += 'END:VEVENT\n';
    });

    icsContent += 'END:VCALENDAR';

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calendrier-montoit-${currentDate.getFullYear()}-${currentDate.getMonth() + 1}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const exportToGoogleCalendar = () => {
    const event = events[0];
    if (!event) return;

    const startDate = new Date(event.date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endDate =
      new Date(event.date.getTime() + 60 * 60 * 1000)
        .toISOString()
        .replace(/[-:]/g, '')
        .split('.')[0] + 'Z';

    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startDate}/${endDate}&details=${encodeURIComponent(event.description || '')}`;
    window.open(googleUrl, '_blank');
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-coral-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-terracotta-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-coral-50">
      <div className="glass-card border-b border-white/20">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                to="/dashboard/locataire"
                className="flex items-center space-x-2 text-terracotta-600 hover:text-terracotta-700 font-bold"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Retour</span>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gradient flex items-center space-x-2">
                  <CalendarIcon className="h-8 w-8 text-terracotta-500" />
                  <span>Mon Calendrier</span>
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button onClick={exportToICS} className="btn-secondary text-sm flex items-center">
                <Download className="h-4 w-4 mr-2" />
                Export iCal
              </button>
              <button
                onClick={exportToGoogleCalendar}
                className="btn-secondary text-sm flex items-center"
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                Google Calendar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        <div className="card-scrapbook p-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={previousMonth}
              className="p-2 hover:bg-terracotta-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-6 w-6 text-terracotta-600" />
            </button>
            <h2 className="text-2xl font-bold text-gradient capitalize">{monthName}</h2>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-terracotta-100 rounded-lg transition-colors"
            >
              <ChevronRight className="h-6 w-6 text-terracotta-600" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((day) => (
              <div key={day} className="text-center font-bold text-gray-700 text-sm py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: firstDay }, (_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const dayEvents = getEventsForDay(day);
              const isToday =
                new Date().getDate() === day &&
                new Date().getMonth() === currentDate.getMonth() &&
                new Date().getFullYear() === currentDate.getFullYear();

              return (
                <div
                  key={day}
                  className={`aspect-square border-2 rounded-lg p-2 ${
                    isToday
                      ? 'border-terracotta-500 bg-gradient-to-br from-terracotta-50 to-coral-50'
                      : 'border-gray-200 bg-white hover:border-terracotta-300'
                  } transition-colors cursor-pointer`}
                >
                  <div className="font-bold text-gray-900 text-sm mb-1">{day}</div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <button
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className={`w-full text-left text-xs px-1 py-0.5 rounded flex items-center space-x-1 ${getEventColor(event.type)}`}
                        title={event.title}
                      >
                        {getEventIcon(event.type)}
                        <span className="truncate flex-1">{event.title.split(':')[0]}</span>
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-gray-600 text-center">
                        +{dayEvents.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded bg-red-500"></div>
              <span className="text-sm text-gray-700">Échéance</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded bg-green-500"></div>
              <span className="text-sm text-gray-700">Paiement</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded bg-blue-500"></div>
              <span className="text-sm text-gray-700">Visite</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded bg-orange-500"></div>
              <span className="text-sm text-gray-700">Maintenance</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded bg-purple-500"></div>
              <span className="text-sm text-gray-700">Fin de bail</span>
            </div>
          </div>
        </div>

        {selectedEvent && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedEvent(null)}
          >
            <div
              className="card-scrapbook p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gradient mb-4">{selectedEvent.title}</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="font-bold text-gray-900">
                    {selectedEvent.date.toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                {selectedEvent.amount && (
                  <div>
                    <p className="text-sm text-gray-600">Montant</p>
                    <p className="font-bold text-terracotta-600 text-xl">
                      {selectedEvent.amount.toLocaleString()} FCFA
                    </p>
                  </div>
                )}
                {selectedEvent.description && (
                  <div>
                    <p className="text-sm text-gray-600">Description</p>
                    <p className="text-gray-900">{selectedEvent.description}</p>
                  </div>
                )}
              </div>
              <button onClick={() => setSelectedEvent(null)} className="btn-primary w-full mt-6">
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
