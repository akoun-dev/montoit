import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, AlertTriangle, Star, Loader2, Filter } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { logger } from '@/services/logger';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  review_type: string;
  moderation_status: string | null;
  moderation_notes: string | null;
  moderated_at: string | null;
  reviewer: {
    full_name: string;
    avatar_url: string | null;
  };
  reviewee: {
    full_name: string;
  };
}

interface ModerationAnalysis {
  inappropriateLanguage: boolean;
  personalInfoDetected: boolean;
  suspiciousContent: boolean;
  confidenceScore: number;
  suggestedAction: string;
  aiReason: string;
}

const ReviewModeration = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [moderationNotes, setModerationNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ModerationAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [reviewTypeFilter, setReviewTypeFilter] = useState<string>('all');
  const { toast } = useToast();

  const fetchReviews = async (status: string) => {
    try {
      setLoading(true);
      let query = supabase
        .from('reviews')
        .select(`
          *,
          reviewer:reviewer_id(full_name, avatar_url),
          reviewee:reviewee_id(full_name)
        `)
        .eq('moderation_status', status)
        .order('created_at', { ascending: false });

      if (reviewTypeFilter !== 'all') {
        query = query.eq('review_type', reviewTypeFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReviews((data || []) as unknown as Review[]);
    } catch (error) {
      logger.error('Error fetching reviews for moderation', { error });
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les avis',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews(activeTab);
  }, [activeTab, reviewTypeFilter]);

  const analyzeReviewContent = async (review: Review) => {
    if (!review.comment) return;
    
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('moderate-review', {
        body: { reviewId: review.id, reviewText: review.comment }
      });

      if (error) throw error;
      
      setAnalysis(data.moderationResult);
    } catch (error) {
      logger.error('Error analyzing review with AI', { error });
      toast({
        title: 'Erreur',
        description: "Impossible d'analyser l'avis",
        variant: 'destructive',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const moderateReview = async (reviewId: string, action: 'approved' | 'rejected') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('reviews')
        .update({
          moderation_status: action,
          moderation_notes: moderationNotes,
          moderated_by: user.id,
          moderated_at: new Date().toISOString(),
        })
        .eq('id', reviewId);

      if (error) throw error;

      toast({
        title: action === 'approved' ? 'Avis approuvé' : 'Avis rejeté',
        description: `L'avis a été ${action === 'approved' ? 'approuvé' : 'rejeté'} avec succès`,
      });

      fetchReviews(activeTab);
      setSelectedReview(null);
      setModerationNotes('');
      setAnalysis(null);
    } catch (error) {
      logger.error('Error moderating review', { error });
      toast({
        title: 'Erreur',
        description: "Impossible de modérer l'avis",
        variant: 'destructive',
      });
    }
  };

  const getToxicityBadge = (score: number) => {
    if (score >= 50) return <Badge variant="destructive">Toxicité élevée ({score}%)</Badge>;
    if (score >= 20) return <Badge className="bg-warning text-warning-foreground">Toxicité modérée ({score}%)</Badge>;
    return <Badge variant="secondary">Toxicité faible ({score}%)</Badge>;
  };

  if (loading && reviews.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Modération des Avis</CardTitle>
              <CardDescription>
                Gérez les avis soumis par les utilisateurs
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={reviewTypeFilter} onValueChange={setReviewTypeFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Type d'avis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="tenant_to_landlord">Locataire → Propriétaire</SelectItem>
                    <SelectItem value="landlord_to_tenant">Propriétaire → Locataire</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending">
                En attente
              </TabsTrigger>
              <TabsTrigger value="approved">Approuvés</TabsTrigger>
              <TabsTrigger value="rejected">Rejetés</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {reviews.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucun avis dans cette catégorie
                </p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <Card key={review.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4 flex-1">
                            <Avatar>
                              <AvatarImage src={review.reviewer.avatar_url || undefined} />
                              <AvatarFallback>
                                {review.reviewer.full_name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="space-y-2 flex-1">
                              <div>
                                <p className="font-medium">{review.reviewer.full_name}</p>
                                <p className="text-sm text-muted-foreground">
                                  À propos de {review.reviewee.full_name}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex items-center gap-1">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`h-4 w-4 ${
                                          i < review.rating
                                            ? 'fill-primary text-primary'
                                            : 'text-muted'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <Badge variant="outline">
                                    {review.review_type === 'tenant_to_landlord' 
                                      ? 'Locataire → Propriétaire' 
                                      : 'Propriétaire → Locataire'}
                                  </Badge>
                                </div>
                              </div>
                              <p className="text-sm">{review.comment}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>
                                  {format(new Date(review.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                                </span>
                              </div>
                              {review.moderation_notes && activeTab !== 'pending' && (
                                <div className="mt-2 p-2 bg-muted rounded-md">
                                  <p className="text-xs font-medium">Notes de modération :</p>
                                  <p className="text-xs text-muted-foreground">{review.moderation_notes}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          {activeTab === 'pending' && (
                            <Button
                              onClick={() => {
                                setSelectedReview(review);
                                setModerationNotes('');
                                setAnalysis(null);
                                analyzeReviewContent(review);
                              }}
                            >
                              Modérer
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={!!selectedReview} onOpenChange={(open) => !open && setSelectedReview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modération de l'avis</DialogTitle>
            <DialogDescription>
              Analysez et modérez cet avis utilisateur
            </DialogDescription>
          </DialogHeader>

          {selectedReview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Auteur</Label>
                  <p className="text-sm mt-1">{selectedReview.reviewer.full_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">À propos de</Label>
                  <p className="text-sm mt-1">{selectedReview.reviewee.full_name}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Note</Label>
                <div className="flex items-center gap-1 mt-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        i < selectedReview.rating
                          ? 'fill-primary text-primary'
                          : 'text-muted'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Commentaire</Label>
                <p className="text-sm mt-1 p-3 bg-muted rounded-md">
                  {selectedReview.comment || 'Aucun commentaire'}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">Analyse automatique</Label>
                {analyzing ? (
                  <div className="flex items-center gap-2 mt-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Analyse en cours...</span>
                  </div>
                ) : analysis ? (
                  <div className="mt-2 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {getToxicityBadge(analysis.confidenceScore)}
                      {analysis.inappropriateLanguage && (
                        <Badge variant="destructive">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Langage inapproprié
                        </Badge>
                      )}
                      {analysis.personalInfoDetected && (
                        <Badge variant="destructive">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Infos personnelles
                        </Badge>
                      )}
                      {analysis.suspiciousContent && (
                        <Badge className="bg-warning text-warning-foreground">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Contenu suspect
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{analysis.aiReason}</p>
                    <p className="text-sm font-medium">
                      Action suggérée : {
                        analysis.suggestedAction === 'approve' ? '✅ Approuver' :
                        analysis.suggestedAction === 'reject' ? '❌ Rejeter' :
                        '🚩 Marquer pour révision'
                      }
                    </p>
                  </div>
                ) : null}
              </div>

              <div>
                <Label htmlFor="notes">Notes de modération (optionnel)</Label>
                <Textarea
                  id="notes"
                  value={moderationNotes}
                  onChange={(e) => setModerationNotes(e.target.value)}
                  placeholder="Ajoutez des notes expliquant votre décision..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedReview(null)}
                >
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => moderateReview(selectedReview.id, 'rejected')}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rejeter
                </Button>
                <Button
                  onClick={() => moderateReview(selectedReview.id, 'approved')}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approuver
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReviewModeration;
