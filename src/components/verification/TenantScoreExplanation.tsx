import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { HelpCircle, CheckCircle2, XCircle, Shield, Camera, FileText, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TenantScoreExplanationProps {
  currentScore: number;
  oneciVerified?: boolean;
  faceVerified?: boolean;
}

export const TenantScoreExplanation = ({
  currentScore,
  oneciVerified = false,
  faceVerified = false,
}: TenantScoreExplanationProps) => {
  const criteria = [
    {
      icon: Shield,
      label: 'Identité ONECI vérifiée',
      points: 40,
      verified: oneciVerified,
      description: 'Vérification de votre Carte Nationale d\'Identité',
      action: oneciVerified ? null : 'Compléter ma vérification ONECI',
    },
    {
      icon: Camera,
      label: 'Vérification faciale',
      points: 30,
      verified: faceVerified,
      description: 'Vérification biométrique Smile ID',
      action: faceVerified ? null : 'Activer la vérification faciale',
    },
    {
      icon: FileText,
      label: 'Documents fournis',
      points: 20,
      verified: false,
      description: 'Fiches de paie, contrat de travail, etc.',
      action: 'Ajouter mes documents',
    },
    {
      icon: Clock,
      label: 'Historique de location',
      points: 10,
      verified: false,
      description: 'Attestations de bons paiements',
      action: 'Ajouter mon historique',
    },
  ];

  const maxScore = 100;
  const earnedPoints = criteria.reduce((sum, c) => sum + (c.verified ? c.points : 0), 0);
  const potentialGain = maxScore - earnedPoints;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Comment fonctionne le Score de Fiabilité ?
          </DialogTitle>
          <DialogDescription>
            Votre score est calculé automatiquement selon vos vérifications et votre profil
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Score Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Votre score actuel</span>
              <span className="text-2xl font-bold text-primary">{currentScore}/{maxScore}</span>
            </div>
            <Progress value={currentScore} className="h-3" />
            {potentialGain > 0 && (
              <p className="text-sm text-muted-foreground">
                +{potentialGain} points possibles pour atteindre le score maximum
              </p>
            )}
          </div>

          {/* Criteria Breakdown */}
          <div>
            <h4 className="font-semibold mb-4">📋 Composition du Score (100 points max)</h4>
            <div className="space-y-3">
              {criteria.map((criterion, index) => {
                const Icon = criterion.icon;
                return (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      criterion.verified
                        ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900'
                        : 'bg-muted/50 border-border'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`h-5 w-5 mt-0.5 ${criterion.verified ? 'text-green-600' : 'text-muted-foreground'}`} />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{criterion.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{criterion.description}</p>
                        {criterion.action && !criterion.verified && (
                          <p className="text-xs text-primary font-medium mt-2">
                            → {criterion.action}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {criterion.verified ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                        <span className={`text-sm font-bold ${criterion.verified ? 'text-green-600' : 'text-muted-foreground'}`}>
                          +{criterion.points}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tips */}
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              💡 Conseils pour améliorer votre score
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {!oneciVerified && (
                <li>• Complétez votre vérification ONECI pour gagner +40 points immédiatement</li>
              )}
              {!faceVerified && (
                <li>• Activez la vérification faciale pour +30 points supplémentaires</li>
              )}
              <li>• Un score élevé augmente vos chances d'obtenir un logement</li>
              <li>• Les propriétaires privilégient les profils vérifiés</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
