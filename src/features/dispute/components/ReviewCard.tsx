import { Star, ThumbsUp, MessageSquare, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_name?: string;
  reviewer_avatar?: string | null;
  is_verified?: boolean;
  response?: string | null;
  response_at?: string | null;
  helpful_count?: number;
  criteria_ratings?: Record<string, number>;
}

interface ReviewCardProps {
  review: Review;
  onHelpful?: (reviewId: string) => void;
  showResponse?: boolean;
}

const CRITERIA_LABELS: Record<string, string> = {
  cleanliness: 'Propreté',
  communication: 'Communication',
  accuracy: 'Exactitude',
  value: 'Rapport qualité/prix',
  location: 'Emplacement',
  checkin: 'Arrivée',
};

export default function ReviewCard({ review, onHelpful, showResponse = true }: ReviewCardProps) {
  const renderStars = (rating: number, size: 'sm' | 'md' = 'md') => {
    const sizeClass = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClass} ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-[#EFEBE9] p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#EFEBE9] flex items-center justify-center overflow-hidden">
            {review.reviewer_avatar ? (
              <img src={review.reviewer_avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[#2C1810] font-medium">
                {review.reviewer_name?.[0]?.toUpperCase() || '?'}
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-[#2C1810]">
                {review.reviewer_name || 'Utilisateur'}
              </span>
              {review.is_verified && <CheckCircle className="w-4 h-4 text-green-500" />}
            </div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(review.created_at), 'dd MMMM yyyy', { locale: fr })}
            </p>
          </div>
        </div>
        {renderStars(review.rating)}
      </div>

      {/* Criteria Ratings */}
      {review.criteria_ratings && Object.keys(review.criteria_ratings).length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {Object.entries(review.criteria_ratings).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{CRITERIA_LABELS[key] || key}</span>
              <div className="flex items-center gap-1">{renderStars(value as number, 'sm')}</div>
            </div>
          ))}
        </div>
      )}

      {/* Comment */}
      {review.comment && <p className="text-[#2C1810] mb-4">{review.comment}</p>}

      {/* Response */}
      {showResponse && review.response && (
        <div className="mt-4 p-4 bg-[#FAF7F4] rounded-lg border-l-4 border-[#F16522]">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-[#F16522]" />
            <span className="text-sm font-medium text-[#2C1810]">Réponse du propriétaire</span>
            {review.response_at && (
              <span className="text-xs text-muted-foreground">
                {format(new Date(review.response_at), 'dd MMM yyyy', { locale: fr })}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{review.response}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[#EFEBE9]">
        <button
          onClick={() => onHelpful?.(review.id)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#F16522] transition-colors"
        >
          <ThumbsUp className="w-4 h-4" />
          <span>Utile</span>
          {(review.helpful_count ?? 0) > 0 && (
            <span className="text-xs">({review.helpful_count})</span>
          )}
        </button>
      </div>
    </div>
  );
}
