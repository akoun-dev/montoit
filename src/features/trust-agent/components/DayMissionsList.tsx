import { useNavigate } from 'react-router-dom';
import { format, isToday, isTomorrow, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ClipboardList,
  Camera,
  FileCheck,
  Home,
  CheckCircle2,
  Clock,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/badge';
import { cn } from '@/shared/lib/utils';

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

interface DayMissionsListProps {
  date: Date;
  missions: Mission[];
}

const missionTypeConfig: Record<string, { label: string; icon: React.ElementType }> = {
  cev: { label: 'CEV Complète', icon: ClipboardList },
  photos: { label: 'Photos', icon: Camera },
  documents: { label: 'Documents', icon: FileCheck },
  etat_lieux: { label: 'État des Lieux', icon: Home },
  verification: { label: 'Vérification', icon: CheckCircle2 },
};

// Urgency colors used directly in template

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

function getDateLabel(date: Date): string {
  if (isToday(date)) return "Aujourd'hui";
  if (isTomorrow(date)) return 'Demain';
  if (isYesterday(date)) return 'Hier';
  return format(date, 'EEEE d MMMM', { locale: fr });
}

export default function DayMissionsList({ date, missions }: DayMissionsListProps) {
  const navigate = useNavigate();
  const dateLabel = getDateLabel(date);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base capitalize">{dateLabel}</CardTitle>
          <Badge variant="outline">{missions.length} mission(s)</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {missions.length === 0 ? (
          <div className="py-8 text-center">
            <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">Aucune mission planifiée</p>
          </div>
        ) : (
          <div className="space-y-3">
            {missions.map((mission) => {
              const typeConfig = missionTypeConfig[mission.mission_type] || {
                label: mission.mission_type,
                icon: ClipboardList,
              };
              const Icon = typeConfig.icon;
              const missionStatus = statusConfig[mission.status] || statusConfig['pending'];

              return (
                <div
                  key={mission.id}
                  onClick={() => navigate(`/trust-agent/mission/${mission.id}`)}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                >
                  {/* Urgency indicator */}
                  <div
                    className={cn(
                      'w-1 h-12 rounded-full',
                      mission.urgency === 'urgent' && 'bg-red-500',
                      mission.urgency === 'high' && 'bg-orange-500',
                      mission.urgency === 'medium' && 'bg-amber-500',
                      mission.urgency === 'low' && 'bg-green-500'
                    )}
                  />

                  {/* Icon */}
                  <div className="p-2 rounded-lg bg-background">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{typeConfig.label}</span>
                      {mission.urgency === 'urgent' && (
                        <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {mission.property?.title || 'Propriété'}
                    </p>
                    {mission.scheduled_date && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {format(new Date(mission.scheduled_date), 'HH:mm', { locale: fr })}
                      </p>
                    )}
                  </div>

                  {/* Status & Arrow */}
                  <div className="flex items-center gap-2">
                    {missionStatus && (
                      <Badge variant={missionStatus.variant} className="text-xs">
                        {missionStatus.label}
                      </Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
