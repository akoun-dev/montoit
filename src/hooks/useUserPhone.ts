import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/services/logger';

/**
 * Hook pour récupérer le numéro de téléphone d'un utilisateur de manière sécurisée.
 * 
 * Le numéro de téléphone est protégé et n'est accessible que dans les cas légitimes :
 * - L'utilisateur demande son propre téléphone
 * - Propriétaire voit le téléphone de ses candidats
 * - Candidat voit le téléphone du propriétaire qu'il a contacté
 * - Parties d'un bail actif
 * - Administrateurs
 * 
 * @param userId - ID de l'utilisateur dont on veut récupérer le téléphone
 * @returns { phone, loading } - Le numéro de téléphone (ou null) et l'état de chargement
 */
export const useUserPhone = (userId: string | null) => {
  const [phone, setPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setPhone(null);
      return;
    }

    const fetchPhone = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_user_phone', {
          target_user_id: userId
        });
        
        if (error) {
          logger.error('Error fetching user phone', { error, userId });
          setPhone(null);
        } else {
          setPhone(data);
        }
      } catch (error) {
        logger.error('Exception fetching user phone', { error, userId });
        setPhone(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPhone();
  }, [userId]);

  return { phone, loading };
};
