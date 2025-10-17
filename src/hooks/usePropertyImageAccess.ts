import { useAuth } from './useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { logger } from '@/services/logger';

interface ImageAccessResult {
  maxImages: number;
  showBlur: boolean;
  showHDPhotos: boolean;
  show3DTour: boolean;
  showFloorPlans: boolean;
  hasValidatedDossier: boolean;
}

export const usePropertyImageAccess = (propertyId: string): ImageAccessResult => {
  const { user } = useAuth();

  const { data: hasValidatedDossier = false } = useQuery({
    queryKey: ['validated-dossier', propertyId, user?.id],
    queryFn: async () => {
      if (!user || !propertyId) return false;

      const { data, error } = await supabase
        .from('rental_applications')
        .select('status')
        .eq('property_id', propertyId)
        .eq('applicant_id', user.id)
        .maybeSingle();

      if (error) {
        logger.error('Failed to check dossier status', { userId: user.id, propertyId });
        return false;
      }

      return data?.status === 'approved';
    },
    enabled: !!user && !!propertyId
  });

  // Logique de restriction :
  // - Visiteur non connecté : 4 images max (floues)
  // - Utilisateur connecté sans dossier validé : 6 images
  // - Dossier validé : Toutes images + 3D + plans
  
  return {
    maxImages: !user ? 4 : hasValidatedDossier ? Infinity : 6,
    showBlur: !user,
    showHDPhotos: hasValidatedDossier,
    show3DTour: hasValidatedDossier,
    showFloorPlans: hasValidatedDossier,
    hasValidatedDossier
  };
};
