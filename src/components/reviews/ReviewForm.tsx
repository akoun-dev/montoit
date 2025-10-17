import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Star } from 'lucide-react';
import { z } from 'zod';

const reviewSchema = z.object({
  rating: z.number().min(1, 'Veuillez sélectionner une note').max(5),
  comment: z.string()
    .trim()
    .min(10, 'Le commentaire doit contenir au moins 10 caractères')
    .max(1000, 'Le commentaire ne peut pas dépasser 1000 caractères')
    .optional()
    .or(z.literal('')),
});

interface ReviewFormProps {
  revieweeId: string;
  revieweeName: string;
  leaseId?: string;
  reviewType: 'tenant_to_landlord' | 'landlord_to_tenant';
  onSuccess?: () => void;
}

export const ReviewForm = ({
  revieweeId,
  revieweeName,
  leaseId,
  reviewType,
  onSuccess,
}: ReviewFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: 'Erreur',
        description: 'Vous devez être connecté pour laisser un avis',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Validation avec Zod
      const validatedData = reviewSchema.parse({ rating, comment });

      setLoading(true);

      const { error } = await supabase.from('reviews').insert({
        reviewer_id: user.id,
        reviewee_id: revieweeId,
        lease_id: leaseId || null,
        rating: validatedData.rating,
        comment: validatedData.comment || null,
        review_type: reviewType,
      });

      if (error) throw error;

      toast({
        title: 'Avis publié',
        description: 'Votre avis a été publié avec succès',
      });

      // Reset form
      setRating(0);
      setComment('');
      onSuccess?.();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Erreur de validation',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else if (error instanceof Error) {
        if (error.message.includes('unique_review_per_lease')) {
          toast({
            title: 'Avis déjà existant',
            description: 'Vous avez déjà laissé un avis pour cette location',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Erreur',
            description: error.message,
            variant: 'destructive',
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Laisser un avis</CardTitle>
        <CardDescription>
          Partagez votre expérience avec {revieweeName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Note</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm text-muted-foreground">
                {rating === 5 && 'Excellent'}
                {rating === 4 && 'Très bien'}
                {rating === 3 && 'Bien'}
                {rating === 2 && 'Passable'}
                {rating === 1 && 'Décevant'}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">
              Commentaire <span className="text-muted-foreground">(optionnel)</span>
            </Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Décrivez votre expérience..."
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground">
              {comment.length}/1000 caractères
            </p>
          </div>

          <Button type="submit" disabled={loading || rating === 0}>
            {loading ? 'Publication...' : 'Publier l\'avis'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
