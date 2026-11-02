import { supabase } from '@/services/supabase/client';

export interface Review {
  id: string;
  contract_id: string;
  reviewer_id: string;
  reviewee_id: string;
  type: 'tenant_to_owner' | 'owner_to_tenant';
  rating: number; // 1-5
  communication: number; // 1-5
  cleanliness: number; // 1-5
  respect_of_property: number; // 1-5
  payment_punctuality: number; // 1-5
  comment: string;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReviewStats {
  average_rating: number;
  total_reviews: number;
  distribution: Record<number, number>; // nombre d'avis par étoile
  category_averages: {
    communication: number;
    cleanliness: number;
    respect_of_property: number;
    payment_punctuality: number;
  };
}

/**
 * Récupère les avis d'un utilisateur
 */
export async function getUserReviews(userId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('reviewee_id', userId)
    .eq('is_visible', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Récupère les avis d'un contrat
 */
export async function getContractReviews(contractId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('contract_id', contractId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Crée un nouvel avis
 */
export async function createReview(review: Omit<Review, 'id' | 'is_visible' | 'created_at' | 'updated_at'>): Promise<Review> {
  const { data, error } = await supabase
    .from('reviews')
    .insert({
      ...review,
      is_visible: true, // Les avis sont visibles par défaut
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  // Mettre à jour la note moyenne du profil
  await updateUserRating(review.reviewee_id);

  return data;
}

/**
 * Met à jour un avis
 */
export async function updateReview(
  reviewId: string,
  updates: Partial<Review>
): Promise<void> {
  const { error } = await supabase
    .from('reviews')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reviewId);

  if (error) throw error;

  // Récupérer l'avis mis à jour pour mettre à jour la note
  const { data: review } = await supabase
    .from('reviews')
    .select('reviewee_id')
    .eq('id', reviewId)
    .single();

  if (review) {
    await updateUserRating(review.reviewee_id);
  }
}

/**
 * Supprime un avis (soft delete)
 */
export async function deleteReview(reviewId: string): Promise<void> {
  const { error } = await supabase
    .from('reviews')
    .update({ is_visible: false })
    .eq('id', reviewId);

  if (error) throw error;
}

/**
 * Récupère les statistiques d'avis d'un utilisateur
 */
export async function getUserReviewStats(userId: string): Promise<ReviewStats> {
  const reviews = await getUserReviews(userId);

  if (reviews.length === 0) {
    return {
      average_rating: 0,
      total_reviews: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      category_averages: {
        communication: 0,
        cleanliness: 0,
        respect_of_property: 0,
        payment_punctuality: 0,
      },
    };
  }

  const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
  const averageRating = totalRating / reviews.length;

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach((r) => {
    distribution[r.rating]++;
  });

  const categoryAverages = {
    communication: reviews.reduce((sum, r) => sum + r.communication, 0) / reviews.length,
    cleanliness: reviews.reduce((sum, r) => sum + r.cleanliness, 0) / reviews.length,
    respect_of_property: reviews.reduce((sum, r) => sum + r.respect_of_property, 0) / reviews.length,
    payment_punctuality: reviews.reduce((sum, r) => sum + r.payment_punctuality, 0) / reviews.length,
  };

  return {
    average_rating: Math.round(averageRating * 10) / 10,
    total_reviews: reviews.length,
    distribution,
    category_averages: {
      communication: Math.round(categoryAverages.communication * 10) / 10,
      cleanliness: Math.round(categoryAverages.cleanliness * 10) / 10,
      respect_of_property: Math.round(categoryAverages.respect_of_property * 10) / 10,
      payment_punctuality: Math.round(categoryAverages.payment_punctuality * 10) / 10,
    },
  };
}

/**
 * Met à jour la note moyenne d'un utilisateur
 */
async function updateUserRating(userId: string): Promise<void> {
  const stats = await getUserReviewStats(userId);

  await supabase
    .from('profiles')
    .update({
      average_rating: stats.average_rating,
      total_reviews: stats.total_reviews,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
}

/**
 * Vérifie si l'utilisateur peut laisser un avis pour un contrat
 */
export async function canLeaveReview(contractId: string, userId: string): Promise<boolean> {
  const { data: contract } = await supabase
    .from('lease_contracts')
    .select('owner_id', 'tenant_id', 'status', 'end_date')
    .eq('id', contractId)
    .single();

  if (!contract || contract.status !== 'actif') {
    return false;
  }

  // Vérifier que l'utilisateur fait partie du contrat
  if (contract.owner_id !== userId && contract.tenant_id !== userId) {
    return false;
  }

  // Vérifier qu'un avis n'existe pas déjà pour ce contrat
  const { data: existingReview } = await supabase
    .from('reviews')
    .select('id')
    .eq('contract_id', contractId)
    .eq('reviewer_id', userId)
    .maybeSingle();

  if (existingReview) {
    return false;
  }

  // Optionnel : Vérifier que le contrat a duré au moins X mois
  // const contractStart = new Date(contract.start_date);
  // const minDuration = new Date(contractStart);
  // minDuration.setMonth(minDuration.getMonth() + 3);
  // if (new Date() < minDuration) {
  //   return false;
  // }

  return true;
}

/**
 * Vérifie si un avis existe déjà pour un contrat
 */
export async function hasReview(contractId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('reviews')
    .select('id')
    .eq('contract_id', contractId)
    .eq('reviewer_id', userId)
    .maybeSingle();

  return !!data;
}

/**
 * Récupère l'avis de l'utilisateur pour un contrat
 */
export async function getUserReviewForContract(
  contractId: string,
  userId: string
): Promise<Review | null> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('contract_id', contractId)
    .eq('reviewer_id', userId)
    .maybeSingle();

  if (error) return null;
  return data;
}
