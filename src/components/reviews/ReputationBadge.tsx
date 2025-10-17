import { Star, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface ReputationBadgeProps {
  score: number;
  totalReviews: number;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

export const ReputationBadge = ({ 
  score, 
  totalReviews, 
  size = 'md',
  showDetails = false 
}: ReputationBadgeProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 4.5) return 'text-green-600';
    if (score >= 3.5) return 'text-blue-600';
    if (score >= 2.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 4.5) return 'Excellent';
    if (score >= 3.5) return 'Très bien';
    if (score >= 2.5) return 'Bien';
    if (score >= 1.5) return 'Moyen';
    return 'À améliorer';
  };

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  if (!showDetails) {
    return (
      <div className="flex items-center gap-1">
        <Star className={`${iconSizes[size]} fill-yellow-400 text-yellow-400`} />
        <span className={`font-semibold ${sizeClasses[size]} ${getScoreColor(score)}`}>
          {score.toFixed(1)}
        </span>
        <span className={`text-muted-foreground ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
          ({totalReviews})
        </span>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-full bg-primary/10">
            <Award className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className={`font-bold text-2xl ${getScoreColor(score)}`}>
                {score.toFixed(1)}
              </span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= Math.round(score)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {getScoreLabel(score)} · {totalReviews} avis
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
