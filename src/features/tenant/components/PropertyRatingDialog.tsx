import { useState, useEffect } from 'react';
import { X, Star, Send, XCircle } from 'lucide-react';

interface PropertyRatingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: PropertyRating) => Promise<void>;
  propertyTitle: string;
  propertyAddress?: string;
  initialRating?: Partial<PropertyRating>;
  isEditMode?: boolean;
}

export interface PropertyRating {
  property_id: string;
  overall_rating: number; // 1-5
  location_rating: number; // 1-5
  condition_rating: number; // 1-5
  value_rating: number; // 1-5
  communication_rating: number; // 1-5
  comment?: string;
  would_recommend: boolean;
}

const RATING_CATEGORIES = [
  { key: 'location_rating', label: 'Emplacement', description: 'Quartier, proximité commerces, transports' },
  { key: 'condition_rating', label: 'État', description: 'Propreté, entretien, équipements' },
  { key: 'value_rating', label: 'Rapport qualité-prix', description: 'Par rapport au loyer et au marché' },
  { key: 'communication_rating', label: 'Communication', description: 'Réactivité du propriétaire' },
] as const;

export default function PropertyRatingDialog({
  isOpen,
  onClose,
  onSubmit,
  propertyTitle,
  propertyAddress,
  initialRating,
  isEditMode = false,
}: PropertyRatingDialogProps) {
  const [ratings, setRatings] = useState({
    overall_rating: 0,
    location_rating: 0,
    condition_rating: 0,
    value_rating: 0,
    communication_rating: 0,
  });
  const [comment, setComment] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Initialize with initialRating when opening in edit mode
  useEffect(() => {
    if (isOpen && initialRating) {
      setRatings({
        overall_rating: initialRating.overall_rating || 0,
        location_rating: initialRating.location_rating || 0,
        condition_rating: initialRating.condition_rating || 0,
        value_rating: initialRating.value_rating || 0,
        communication_rating: initialRating.communication_rating || 0,
      });
      setComment(initialRating.comment || '');
      setWouldRecommend(initialRating.would_recommend ? true : null);
    } else if (isOpen) {
      // Reset for new rating
      setRatings({
        overall_rating: 0,
        location_rating: 0,
        condition_rating: 0,
        value_rating: 0,
        communication_rating: 0,
      });
      setComment('');
      setWouldRecommend(null);
    }
  }, [isOpen, initialRating]);

  if (!isOpen) return null;

  const handleStarClick = (category: keyof typeof ratings, value: number) => {
    setRatings((prev) => ({ ...prev, [category]: value }));
  };

  const getOverallRating = () => {
    const { overall_rating, ...otherRatings } = ratings;
    if (overall_rating > 0) return overall_rating;
    const values = Object.values(otherRatings);
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum > 0 ? Math.round(sum / values.length) : 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (getOverallRating() === 0) return;

    setSubmitting(true);
    try {
      await onSubmit({
        property_id: '', // sera rempli par le parent
        overall_rating: getOverallRating(),
        location_rating: ratings.location_rating,
        condition_rating: ratings.condition_rating,
        value_rating: ratings.value_rating,
        communication_rating: ratings.communication_rating,
        comment: comment.trim() || undefined,
        would_recommend: wouldRecommend === true,
      });
      handleClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setRatings({
      overall_rating: 0,
      location_rating: 0,
      condition_rating: 0,
      value_rating: 0,
      communication_rating: 0,
    });
    setComment('');
    setWouldRecommend(null);
    onClose();
  };

  const StarButton = ({ value, category }: { value: number; category: keyof typeof ratings }) => {
    const currentRating = category === 'overall_rating' ? getOverallRating() : ratings[category];
    const isFilled = value <= currentRating;

    return (
      <button
        type="button"
        onClick={() => handleStarClick(category, value)}
        className="transition-transform hover:scale-110 focus:outline-none"
        disabled={submitting}
      >
        <Star
          className={`w-6 h-6 ${
            isFilled ? 'fill-[#F16522] text-[#F16522]' : 'fill-transparent text-gray-300'
          } transition-colors`}
        />
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-[20px] shadow-xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[#2C1810] mb-1">
            {isEditMode ? 'Modifier votre avis' : 'Donner votre avis'}
          </h2>
          <p className="text-sm text-gray-600">
            {isEditMode
              ? 'Mettez à jour votre évaluation'
              : 'Aidez les autres locataires en partageant votre expérience'}
          </p>
        </div>

        {/* Property Info */}
        <div className="mb-6 p-4 bg-[#FAF7F4] rounded-xl border border-[#EFEBE9]">
          <p className="font-semibold text-[#2C1810]">{propertyTitle}</p>
          {propertyAddress && <p className="text-sm text-gray-600">{propertyAddress}</p>}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Overall Rating */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#2C1810] mb-2">
              Note générale
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <StarButton key={value} value={value} category="overall_rating" />
              ))}
              <span className="ml-2 text-sm text-gray-600">
                {getOverallRating() > 0 ? `${getOverallRating()}/5` : ''}
              </span>
            </div>
          </div>

          {/* Category Ratings */}
          <div className="mb-6 space-y-4">
            {RATING_CATEGORIES.map((category) => (
              <div key={category.key}>
                <label className="block text-sm font-medium text-[#2C1810] mb-1">
                  {category.label}
                </label>
                <p className="text-xs text-gray-500 mb-2">{category.description}</p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <StarButton
                      key={value}
                      value={value}
                      category={category.key as keyof typeof ratings}
                    />
                  ))}
                  <span className="ml-2 text-sm text-gray-600">
                    {ratings[category.key] > 0 ? `${ratings[category.key]}/5` : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Comment */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#2C1810] mb-2">
              Votre avis (optionnel)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Décrivez votre expérience..."
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F16522] focus:border-transparent resize-none"
              disabled={submitting}
            />
          </div>

          {/* Recommendation */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#2C1810] mb-3">
              Recommanderiez-vous cette propriété ?
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setWouldRecommend(true)}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
                  wouldRecommend === true
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                disabled={submitting}
              >
                <Star className="w-5 h-5" />
                Oui
              </button>
              <button
                type="button"
                onClick={() => setWouldRecommend(false)}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
                  wouldRecommend === false
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                disabled={submitting}
              >
                <XCircle className="w-5 h-5" />
                Non
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              disabled={submitting}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={getOverallRating() === 0 || submitting}
              className="flex-1 py-3 px-4 bg-[#F16522] text-white rounded-xl hover:bg-[#d9571d] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  {isEditMode ? 'Mise à jour...' : 'Envoi...'}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {isEditMode ? 'Mettre à jour' : 'Envoyer'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
