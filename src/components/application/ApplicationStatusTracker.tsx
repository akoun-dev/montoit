import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, CheckCircle, XCircle, AlertCircle, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';

interface ApplicationStatusTrackerProps {
  status: ApplicationStatus;
  createdAt: string;
  reviewedAt?: string | null;
  processingDeadline?: string | null;
  isOverdue?: boolean;
  autoProcessed?: boolean;
}

export const ApplicationStatusTracker = ({
  status,
  createdAt,
  reviewedAt,
  processingDeadline,
  isOverdue,
  autoProcessed
}: ApplicationStatusTrackerProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        if (isOverdue) {
          return {
            icon: AlertCircle,
            color: 'text-orange-600',
            bgColor: 'bg-orange-50 dark:bg-orange-950',
            borderColor: 'border-orange-200 dark:border-orange-800',
            label: 'En cours d\'examen',
            description: 'Votre dossier est actuellement en cours de traitement approfondi.'
          };
        }
        return {
          icon: Clock,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 dark:bg-blue-950',
          borderColor: 'border-blue-200 dark:border-blue-800',
          label: 'En attente de traitement',
          description: 'Votre candidature sera traitée sous 48-72h.'
        };
      case 'approved':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50 dark:bg-green-950',
          borderColor: 'border-green-200 dark:border-green-800',
          label: 'Candidature approuvée',
          description: autoProcessed 
            ? 'Votre candidature a été approuvée automatiquement après le délai de traitement.'
            : 'Félicitations ! Le propriétaire a accepté votre candidature.'
        };
      case 'rejected':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50 dark:bg-red-950',
          borderColor: 'border-red-200 dark:border-red-800',
          label: 'Candidature non retenue',
          description: autoProcessed
            ? 'Votre candidature n\'a pas été retenue dans le délai imparti.'
            : 'Le propriétaire a choisi un autre candidat pour ce bien.'
        };
      case 'withdrawn':
        return {
          icon: XCircle,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50 dark:bg-gray-950',
          borderColor: 'border-gray-200 dark:border-gray-800',
          label: 'Candidature retirée',
          description: 'Vous avez retiré votre candidature pour ce bien.'
        };
      default:
        return {
          icon: Clock,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50 dark:bg-gray-950',
          borderColor: 'border-gray-200 dark:border-gray-800',
          label: 'Statut inconnu',
          description: ''
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const getTimeRemaining = () => {
    if (!processingDeadline || status !== 'pending') return null;

    const deadline = new Date(processingDeadline);
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (isOverdue) {
      return null;
    }

    if (diffHours < 24) {
      return `Moins de 24h`;
    } else if (diffHours < 48) {
      return `Moins de 48h`;
    } else {
      const diffDays = Math.ceil(diffHours / 24);
      return `${diffDays} jours`;
    }
  };

  const timeRemaining = getTimeRemaining();

  return (
    <Card className={`${config.bgColor} ${config.borderColor} border-2`}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${config.bgColor}`}>
              <Icon className={`h-6 w-6 ${config.color}`} />
            </div>
            <div>
              <CardTitle className={`text-xl ${config.color}`}>
                {config.label}
              </CardTitle>
              {autoProcessed && (
                <Badge variant="outline" className="mt-1 text-xs">
                  Traité automatiquement
                </Badge>
              )}
            </div>
          </div>
          <Badge variant={status === 'approved' ? 'default' : status === 'rejected' ? 'destructive' : 'secondary'}>
            {status === 'pending' ? 'En cours' : status === 'approved' ? 'Approuvé' : status === 'rejected' ? 'Rejeté' : 'Retiré'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {config.description}
        </p>

        {/* Délai indicatif pour candidatures en attente */}
        {status === 'pending' && !isOverdue && (
          <div className="p-4 rounded-lg bg-background/60 border">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Délai indicatif de traitement</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Votre dossier sera traité sous 48-72 heures
            </p>
            {timeRemaining && processingDeadline && (
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <AlertCircle className="h-3 w-3" />
                <span>Temps restant estimé : {timeRemaining}</span>
              </div>
            )}
          </div>
        )}

        {/* Message rassurant pour candidatures en retard */}
        {status === 'pending' && isOverdue && (
          <div className="p-4 rounded-lg bg-background/60 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <span className="font-medium text-sm">Examen approfondi en cours</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Votre dossier nécessite une analyse plus détaillée. Nous vous tiendrons informé(e) prochainement.
            </p>
          </div>
        )}

        {/* Timeline des dates */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Soumise :</span>
            <span className="font-medium">
              {new Date(createdAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </span>
            <span className="text-xs text-muted-foreground">
              ({formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: fr })})
            </span>
          </div>

          {reviewedAt && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Traitée :</span>
              <span className="font-medium">
                {new Date(reviewedAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
              <span className="text-xs text-muted-foreground">
                ({formatDistanceToNow(new Date(reviewedAt), { addSuffix: true, locale: fr })})
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
