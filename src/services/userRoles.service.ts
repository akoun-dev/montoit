import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'tenant' | 'owner' | 'agency' | 'admin' | 'moderator' | 'trust_agent';

/**
 * Service pour gérer les rôles multiples des utilisateurs
 */
export const userRolesService = {
  /**
   * Récupère tous les rôles actifs d'un utilisateur
   */
  async getUserRoles(userId: string): Promise<UserRole[]> {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) throw error;
    return (data?.map((d) => d.role) as UserRole[]) || [];
  },

  /**
   * Ajoute un rôle à un utilisateur
   */
  async addRole(userId: string, role: UserRole): Promise<void> {
    const { error } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role,
        is_active: true,
      });

    if (error) {
      // Gérer le cas où le rôle existe déjà
      if (error.code === '23505') {
        // Violation de contrainte unique
        throw new Error(`L'utilisateur a déjà le rôle "${role}"`);
      }
      throw error;
    }
  },

  /**
   * Supprime un rôle d'un utilisateur (désactive)
   */
  async removeRole(userId: string, role: UserRole): Promise<void> {
    const { error } = await supabase
      .from('user_roles')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('role', role);

    if (error) throw error;
  },

  /**
   * Active un rôle pour un utilisateur
   */
  async activateRole(userId: string, role: UserRole): Promise<void> {
    const { error } = await supabase
      .from('user_roles')
      .update({ is_active: true })
      .eq('user_id', userId)
      .eq('role', role);

    if (error) throw error;
  },

  /**
   * Définit le rôle actif (rôle principal utilisé pour le dashboard)
   */
  async setActiveRole(userId: string, role: UserRole): Promise<void> {
    // Vérifier que l'utilisateur a bien ce rôle
    const userRoles = await this.getUserRoles(userId);
    if (!userRoles.includes(role)) {
      throw new Error(`L'utilisateur n'a pas le rôle "${role}"`);
    }

    // Mettre à jour le user_type dans profiles
    const { error } = await supabase
      .from('profiles')
      .update({
        user_type: role,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) throw error;
  },

  /**
   * Basculer vers un autre rôle (si l'utilisateur a plusieurs rôles)
   */
  async switchRole(userId: string, newRole: UserRole): Promise<void> {
    await this.setActiveRole(userId, newRole);
  },

  /**
   * Vérifie si un utilisateur a un rôle spécifique
   */
  async hasRole(userId: string, role: UserRole): Promise<boolean> {
    const userRoles = await this.getUserRoles(userId);
    return userRoles.includes(role);
  },

  /**
   * Initialise les rôles pour un nouvel utilisateur
   * (à appeler lors de la première inscription)
   */
  async initializeUserRoles(
    userId: string,
    initialRole: UserRole
  ): Promise<void> {
    // Récupérer le rôle depuis profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', userId)
      .single();

    if (profile?.user_type) {
      // Ajouter le rôle actuel comme rôle actif
      await this.addRole(userId, initialRole);
    }
  },

  /**
   * Récupère le rôle actif (depuis profiles)
   */
  async getActiveRole(userId: string): Promise<UserRole | null> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', userId)
      .single();

    return profile?.user_type as UserRole | null;
  },
};

export default userRolesService;
