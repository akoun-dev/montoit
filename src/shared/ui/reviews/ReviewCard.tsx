import { Star, Calendar, MessageSquare, Flag } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ReviewCardProps {
  review: {
    id: string;
    rating: number;
    comment: string | null;
    response: string | null;
    response_at: string | null;
    created_at: string;
    criteria_ratings?: {
      overall?: number;
      location?: number;
      condition?: number;
      value?: number;
      communication?: number;
    };
    reviewer?: {
      full_name: string | null;
      avatar_url?: string | null;
    };
  };
  onReport?: (reviewId: string) => void;
}

export default function ReviewCard({ review, onReport }: ReviewCardProps) {
  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const criteria = review.criteria_ratings || {};

  return (
    <div className="bg-[#FAF7F4] rounded-xl p-4 border border-[#EFEBE9]">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#E8D4C5] flex items-center justify-center text-[#2C1810] font-semibold">
            {review.reviewer?.full_name?.[0] || 'U'}
          </div>
          <div>
            <p className="font-semibold text-[#2C1810]">
              {review.reviewer?.full_name || 'Utilisateur'}
            </p>
            <div className="flex items-center gap-2">
              {renderStars(review.rating)}
              <span className="text-xs text-[#6B5A4E] flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(review.created_at), 'd MMM yyyy', { locale: fr })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Comment */}
      {review.comment && (
        <p className="text-sm text-[#2C1810] mb-3">{review.comment}</p>
      )}

      {/* Criteria Ratings (if available) */}
      {Object.keys(criteria).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          {criteria.location !== undefined && (
            <div className="text-xs">
              <span className="text-[#6B5A4E]">Emplacement: </span>
              <span className="font-medium text-[#2C1810]">{criteria.location}/5</span>
            </div>
          )}
          {criteria.condition !== undefined && (
            <div className="text-xs">
              <span className="text-[#6B5A4E]">Propreté: </span>
              <span className="font-medium text-[#2C1810]">{criteria.condition}/5</span>
            </div>
          )}
          {criteria.value !== undefined && (
            <div className="text-xs">
              <span className="text-[#6B5A4E]">Qualité/prix: </span>
              <span className="font-medium text-[#2C1810]">{criteria.value}/5</span>
            </div>
          )}
          {criteria.communication !== undefined && (
            <div className="text-xs">
              <span className="text-[#6B5A4E]">Communication: </span>
              <span className="font-medium text-[#2C1810]">{criteria.communication}/5</span>
            </div>
          )}
        </div>
      )}

      {/* Response */}
      {review.response && (
        <div className="bg-white rounded-lg p-3 border border-[#EFEBE9]">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-4 h-4 text-[#F16522]" />
            <span className="text-xs font-semibold text-[#2C1810]">Réponse du propriétaire</span>
          </div>
          <p className="text-sm text-[#6B5A4E]">{review.response}</p>
          {review.response_at && (
            <p className="text-xs text-[#6B5A4E] mt-1">
              {format(new Date(review.response_at), 'd MMM yyyy', { locale: fr })}
            </p>
          )}
        </div>
      )}

      {/* Report Button */}
      {onReport && (
        <div className="mt-3">
          <button
            onClick={() => onReport(review.id)}
            className="text-xs text-[#6B5A4E] hover:text-[#F16522] flex items-center gap-1 transition-colors"
          >
            <Flag className="w-3 h-3" />
            Signaler
          </button>
        </div>
      )}
    </div>
  );
}
