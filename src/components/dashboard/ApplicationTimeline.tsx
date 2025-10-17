import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, XCircle, FileText, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TimelineStep {
  status: string;
  date: string | null;
  label: string;
  icon: React.ReactNode;
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
}

interface ApplicationTimelineProps {
  application: {
    status: string;
    created_at: string;
    reviewed_at: string | null;
    updated_at: string;
  };
}

const ApplicationTimeline = ({ application }: ApplicationTimelineProps) => {
  const getTimelineSteps = (): TimelineStep[] => {
    const steps: TimelineStep[] = [
      {
        status: 'submitted',
        date: application.created_at,
        label: 'Candidature déposée',
        icon: <FileText className="h-5 w-5" />,
        variant: 'default'
      }
    ];

    if (application.status === 'pending') {
      steps.push({
        status: 'pending',
        date: application.updated_at,
        label: 'En cours de révision',
        icon: <Clock className="h-5 w-5" />,
        variant: 'secondary'
      });
    }

    if (application.status === 'approved') {
      steps.push({
        status: 'approved',
        date: application.reviewed_at,
        label: 'Candidature acceptée',
        icon: <CheckCircle2 className="h-5 w-5" />,
        variant: 'outline'
      });
    }

    if (application.status === 'rejected') {
      steps.push({
        status: 'rejected',
        date: application.reviewed_at,
        label: 'Candidature rejetée',
        icon: <XCircle className="h-5 w-5" />,
        variant: 'destructive'
      });
    }

    if (application.status === 'withdrawn') {
      steps.push({
        status: 'withdrawn',
        date: application.updated_at,
        label: 'Candidature retirée',
        icon: <AlertCircle className="h-5 w-5" />,
        variant: 'default'
      });
    }

    return steps;
  };

  const steps = getTimelineSteps();
  const currentStepIndex = steps.length - 1;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500';
      case 'rejected':
        return 'bg-red-500';
      case 'pending':
        return 'bg-yellow-500';
      default:
        return 'bg-blue-500';
    }
  };

  const getDuration = () => {
    const start = new Date(application.created_at);
    const end = application.reviewed_at ? new Date(application.reviewed_at) : new Date();
    const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Chronologie de la candidature</h3>
            <Badge variant={steps[currentStepIndex].variant}>
              {steps[currentStepIndex].label}
            </Badge>
          </div>

          <div className="relative">
            {steps.map((step, index) => (
              <div key={step.status} className="flex gap-4 pb-8 last:pb-0">
                {/* Timeline line */}
                {index < steps.length - 1 && (
                  <div className="absolute left-[18px] top-10 w-0.5 h-full bg-border" />
                )}

                {/* Icon */}
                <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full ${getStatusColor(step.status)} text-white shrink-0`}>
                  {step.icon}
                </div>

                {/* Content */}
                <div className="flex-1 pt-1">
                  <div className="font-medium">{step.label}</div>
                  {step.date && (
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(step.date), 'PPP à HH:mm', { locale: fr })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {application.status === 'pending' && (
            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                <span className="text-muted-foreground">
                  En attente depuis {getDuration()} jour{getDuration() > 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Durée moyenne de traitement: 3-5 jours
              </p>
            </div>
          )}

          {application.status === 'approved' && (
            <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-800 dark:text-green-200">
                🎉 Félicitations! Le propriétaire va vous contacter prochainement.
              </p>
            </div>
          )}

          {application.status === 'rejected' && (
            <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-200">
                Votre candidature n'a pas été retenue. N'hésitez pas à continuer vos recherches.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ApplicationTimeline;