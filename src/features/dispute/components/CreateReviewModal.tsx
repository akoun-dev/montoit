import { useState, ChangeEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Textarea,
  Label,
} from '@/shared/ui';
import { Star, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { toast } from 'sonner';

interface CreateReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId?: string;
  revieweeId?: string;
  reviewType: 'property' | 'owner' | 'tenant' | 'provider';
  onSuccess?: () => void;
}

const CRITERIA = {
  property: ['cleanliness', 'accuracy', 'value', 'location'],
  owner: ['communication', 'responsiveness', 'fairness'],
  tenant: ['payment', 'care', 'communication'],
  provider: ['quality', 'punctuality', 'value', 'communication'],
};

const CRITERIA_LABELS: Record<string, string> = {
  cleanliness: 'Propreté',
  accuracy: "Exactitude de l'annonce",
  value: 'Rapport qualité/prix',
  location: 'Emplacement',
  communication: 'Communication',
  responsiveness: 'Réactivité',
  fairness: 'Équité',
  payment: 'Paiements à temps',
  care: 'Soin du logement',
  quality: 'Qualité du travail',
  punctuality: 'Ponctualité',
};

export default function CreateReviewModal({
  open,
  onOpenChange,
  propertyId,
  revieweeId,
  reviewType,
  onSuccess,
}: CreateReviewModalProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalRating, setGlobalRating] = useState(0);
  const [criteriaRatings, setCriteriaRatings] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [hoverRating, setHoverRating] = useState(0);

  const criteria = CRITERIA[reviewType] || [];

  const handleCriteriaRating = (criterion: string, rating: number) => {
    setCriteriaRatings((prev) => ({ ...prev, [criterion]: rating }));
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    if (globalRating === 0) {
      toast.error('Veuillez donner une note globale');
      return;
    }

    if (comment.length < 50) {
      toast.error('Le commentaire doit contenir au moins 50 caractères');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('reviews').insert({
        reviewer_id: user.id,
        reviewee_id: revieweeId || null,
        property_id: propertyId || null,
        review_type: reviewType,
        rating: globalRating,
        comment,
        criteria_ratings: criteriaRatings,
        moderation_status: 'pending',
      });

      if (error) throw error;

      toast.success('Avis soumis avec succès ! Il sera visible après modération.');
      onOpenChange(false);
      onSuccess?.();

      // Reset form
      setGlobalRating(0);
      setCriteriaRatings({});
      setComment('');
    } catch (error) {
      console.error('Erreur:', error);
      toast.error("Erreur lors de l'envoi de l'avis");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setComment(e.target.value);
  };

  const renderStars = (
    rating: number,
    onRate: (r: number) => void,
    hover?: number,
    onHover?: (r: number) => void,
    size: 'sm' | 'md' | 'lg' = 'md'
  ) => {
    const sizeClasses = {
      sm: 'w-5 h-5',
      md: 'w-7 h-7',
      lg: 'w-9 h-9',
    };

    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRate(star)}
            onMouseEnter={() => onHover?.(star)}
            onMouseLeave={() => onHover?.(0)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`${sizeClasses[size]} ${
                star <= (hover || rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Laisser un avis</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Global Rating */}
          <div className="text-center">
            <Label className="text-base mb-3 block">Note globale</Label>
            <div className="flex justify-center">
              {renderStars(globalRating, setGlobalRating, hoverRating, setHoverRating, 'lg')}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {globalRating === 0 ? 'Sélectionnez une note' : `${globalRating}/5 étoiles`}
            </p>
          </div>

          {/* Criteria Ratings */}
          {criteria.length > 0 && (
            <div className="space-y-4">
              <Label className="text-base">Évaluation détaillée</Label>
              <div className="space-y-3">
                {criteria.map((criterion) => (
                  <div key={criterion} className="flex items-center justify-between">
                    <span className="text-sm text-[#2C1810]">
                      {CRITERIA_LABELS[criterion] || criterion}
                    </span>
                    {renderStars(
                      criteriaRatings[criterion] || 0,
                      (r) => handleCriteriaRating(criterion, r),
                      undefined,
                      undefined,
                      'sm'
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">Votre commentaire</Label>
            <Textarea
              id="comment"
              placeholder="Partagez votre expérience en détail..."
              value={comment}
              onChange={handleCommentChange}
              rows={4}
              className="resize-none"
            />
            <p
              className={`text-xs text-right ${
                comment.length < 50 ? 'text-destructive' : 'text-muted-foreground'
              }`}
            >
              {comment.length}/50 minimum
            </p>
          </div>

          {/* Preview */}
          {globalRating > 0 && comment.length >= 50 && (
            <div className="p-4 bg-[#FAF7F4] rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">Aperçu</p>
              <div className="flex gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= globalRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-[#2C1810] line-clamp-2">{comment}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || globalRating === 0 || comment.length < 50}
            className="bg-[#F16522] hover:bg-[#F16522]/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Envoi...
              </>
            ) : (
              "Publier l'avis"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
