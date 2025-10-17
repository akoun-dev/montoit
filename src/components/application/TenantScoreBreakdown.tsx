import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TenantScoreBadge } from '@/components/ui/tenant-score-badge';
import { Shield, Briefcase, CreditCard, TrendingUp, FileText, User } from 'lucide-react';

interface ScoreBreakdown {
  identity_verification: number;
  face_verification: number;
  payment_history: number;
  documents: number;
  profile_completeness: number;
}

interface TenantScoreBreakdownProps {
  score: number;
  breakdown?: ScoreBreakdown;
  recommendation?: 'approved' | 'conditional' | 'rejected';
}

export const TenantScoreBreakdown = ({ score, breakdown, recommendation }: TenantScoreBreakdownProps) => {
  const getRecommendationBadge = (rec: string) => {
    const config = {
      approved: { variant: 'default' as const, label: '✓ Recommandé' },
      conditional: { variant: 'secondary' as const, label: '~ Conditionnel' },
      rejected: { variant: 'destructive' as const, label: '✗ Non recommandé' },
    };
    const { variant, label } = config[rec as keyof typeof config];
    return <Badge variant={variant}>{label}</Badge>;
  };

  const breakdownItems = breakdown ? [
    { 
      icon: Shield, 
      label: 'Vérification identité ONECI', 
      score: breakdown.identity_verification, 
      max: 40,
      color: 'text-blue-600'
    },
    { 
      icon: User, 
      label: 'Vérification faciale', 
      score: breakdown.face_verification, 
      max: 30,
      color: 'text-green-600'
    },
    {
      icon: FileText,
      label: 'Documents fournis',
      score: breakdown.documents,
      max: 20,
      color: 'text-warning'
    },
    { 
      icon: CreditCard, 
      label: 'Historique de paiements', 
      score: breakdown.payment_history, 
      max: 10,
      color: 'text-orange-600'
    },
  ] : [];

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle>Évaluation automatique</CardTitle>
        <CardDescription>Score de fiabilité calculé automatiquement</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-background rounded-lg border">
          <span className="font-medium">Score du candidat</span>
          <TenantScoreBadge score={score} size="lg" />
        </div>

        {recommendation && (
          <div className="flex items-center justify-between p-4 bg-background rounded-lg border">
            <span className="font-medium">Recommandation</span>
            {getRecommendationBadge(recommendation)}
          </div>
        )}

        {breakdown && (
          <div className="space-y-2 mt-4 p-4 bg-background rounded-lg border">
            <p className="text-sm font-semibold mb-3">Détails de l'évaluation:</p>
            {breakdownItems.map((item, index) => {
              const Icon = item.icon;
              const percentage = (item.score / item.max) * 100;
              return (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between items-center text-sm py-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${item.color}`} />
                      <span className="text-muted-foreground">{item.label}</span>
                    </div>
                    <span className="font-medium">{item.score}/{item.max} pts</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
