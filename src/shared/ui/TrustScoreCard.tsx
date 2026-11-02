import React from 'react';
import { Shield, CheckCircle, XCircle, User, FileCheck, History, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Badge } from './badge';
import { Progress } from './Progress';
import { ScoreBreakdown, ScoringService } from '@/services/scoringService';

interface TrustScoreCardProps {
  scoreBreakdown: ScoreBreakdown;
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

const TrustScoreCard: React.FC<TrustScoreCardProps> = ({
  scoreBreakdown,
  showDetails = true,
  compact = false,
  className = '',
}) => {
  const { globalScore, profileScore, verificationScore, historyScore, recommendation, details } =
    scoreBreakdown;

  const getScoreColor = (score: number): string => {
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRecommendationBadge = () => {
    const label = ScoringService.getRecommendationLabel(recommendation);
    const variants: Record<string, 'success' | 'warning' | 'destructive'> = {
      approved: 'success',
      conditional: 'warning',
      rejected: 'destructive',
    };
    return (
      <Badge variant={variants[recommendation]} className="flex items-center gap-1">
        {recommendation === 'approved' ? (
          <CheckCircle className="h-3 w-3" />
        ) : recommendation === 'conditional' ? (
          <Shield className="h-3 w-3" />
        ) : (
          <XCircle className="h-3 w-3" />
        )}
        {label}
      </Badge>
    );
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="relative">
          <div className={`text-2xl font-bold ${getScoreColor(globalScore)}`}>{globalScore}</div>
          <div className="text-xs text-muted-foreground">/100</div>
        </div>
        {getRecommendationBadge()}
      </div>
    );
  }

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            Global Trust Score
          </CardTitle>
          {getRecommendationBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score Principal */}
        <div className="flex items-center justify-center py-4">
          <div className="relative">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-muted"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${(globalScore / 100) * 352} 352`}
                className={getScoreColor(globalScore).replace('text-', 'text-')}
                style={{
                  stroke: globalScore >= 70 ? '#16a34a' : globalScore >= 50 ? '#ca8a04' : '#dc2626',
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold ${getScoreColor(globalScore)}`}>
                {globalScore}
              </span>
              <span className="text-sm text-muted-foreground">/100</span>
            </div>
          </div>
        </div>

        {showDetails && (
          <>
            {/* Sous-scores */}
            <div className="space-y-3">
              {/* Score Profil */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>Profil (20%)</span>
                  </div>
                  <span className={`font-medium ${getScoreColor(profileScore)}`}>
                    {profileScore}/100
                  </span>
                </div>
                <Progress value={profileScore} className="h-2" />
              </div>

              {/* Score Vérification */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-muted-foreground" />
                    <span>Vérifications (40%)</span>
                  </div>
                  <span className={`font-medium ${getScoreColor(verificationScore)}`}>
                    {verificationScore}/100
                  </span>
                </div>
                <Progress value={verificationScore} className="h-2" />
              </div>

              {/* Score Historique */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-muted-foreground" />
                    <span>Historique (40%)</span>
                  </div>
                  <span className={`font-medium ${getScoreColor(historyScore)}`}>
                    {historyScore}/100
                  </span>
                </div>
                <Progress value={historyScore} className="h-2" />
              </div>
            </div>

            {/* Détails des vérifications */}
            <div className="pt-2 border-t">
              <p className="text-sm font-medium mb-2">Vérifications</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant={details.verification.oneci ? 'success' : 'secondary'}>
                  {details.verification.oneci ? (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  ) : (
                    <XCircle className="h-3 w-3 mr-1" />
                  )}
                  ONECI
                </Badge>
                <Badge variant={details.verification.facial ? 'success' : 'secondary'}>
                  {details.verification.facial ? (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  ) : (
                    <XCircle className="h-3 w-3 mr-1" />
                  )}
                  Facial
                </Badge>
                <Badge variant={details.verification.ansut ? 'success' : 'secondary'}>
                  {details.verification.ansut ? (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  ) : (
                    <XCircle className="h-3 w-3 mr-1" />
                  )}
                  ANSUT
                </Badge>
              </div>
            </div>

            {/* Conseils d'amélioration */}
            {globalScore < 70 && (
              <div className="pt-2 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span>
                    {globalScore < 50
                      ? 'Complétez votre profil et vos vérifications pour améliorer votre score'
                      : 'Ajoutez des vérifications pour atteindre le statut "Approuvé"'}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TrustScoreCard;
