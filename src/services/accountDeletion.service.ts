import { supabase } from '@/integrations/supabase/client';

interface DeleteAccountOptions {
  reason?: string;
  feedback?: string;
  confirmDelete: boolean;
}

/**
 * Service pour gérer la suppression de compte utilisateur
 */
export const accountDeletionService = {
  /**
   * Demande la suppression du compte utilisateur
   * Conforme au RGPD (droit à l'oubli)
   */
  async requestAccountDeletion(options: DeleteAccountOptions) {
    if (!options.confirmDelete) {
      throw new Error('La confirmation de suppression est requise');
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Utilisateur non connecté');
    }

    try {
      // 1. Enregistrer la demande de suppression dans la table account_deletion_requests
      const { error: requestError } = await supabase
        .from('account_deletion_requests')
        .insert({
          user_id: user.id,
          email: user.email,
          reason: options.reason,
          feedback: options.feedback,
          status: 'pending',
          requested_at: new Date().toISOString(),
        });

      if (requestError) {
        console.error('Error recording deletion request:', requestError);
        // Continuer quand même si l'enregistrement échoue
      }

      // 2. Supprimer les données personnelles de l'utilisateur
      await this.deleteUserData(user.id, user.email);

      // 3. Déconnecter l'utilisateur
      await supabase.auth.signOut();

      return { success: true };
    } catch (error) {
      console.error('Error deleting account:', error);
      throw new Error('Erreur lors de la suppression du compte');
    }
  },

  /**
   * Supprime toutes les données personnelles de l'utilisateur
   */
  async deleteUserData(userId: string, _email: string) {
    // Suppression anonymisation du profil
    await supabase
      .from('profiles')
      .update({
        full_name: 'Utilisateur supprimé',
        email: `deleted_${Date.now()}@deleted.com`,
        phone: null,
        address: null,
        bio: null,
        avatar_url: null,
        is_verified: false,
        trust_score: 0,
        user_type: 'deleted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    // Suppression des favoris
    await supabase.from('favorites').delete().eq('user_id', userId);

    // Suppression des recherches sauvegardées
    await supabase.from('saved_searches').delete().eq('user_id', userId);

    // Note: Les transactions et contrats sont conservés pour des raisons légales,
    // mais avec les données personnelles anonymisées
  },

  /**
   * Exporte toutes les données de l'utilisateur (GDPR)
   */
  async exportUserData(userId: string) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    const { data: favorites } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', userId);

    const { data: contracts } = await supabase
      .from('lease_contracts')
      .select('*')
      .or(`tenant_id.eq.${userId},owner_id.eq.${userId}`);

    return {
      profile,
      favorites,
      contracts,
      exportDate: new Date().toISOString(),
    };
  },
};

export default accountDeletionService;
