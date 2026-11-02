import { supabase } from '@/integrations/supabase/client';

export interface CertificationUser {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  oneci_verified: boolean;
  cnam_verified: boolean;
  trust_score: number;
  facial_verification_status: string;
  created_at: string;
  updated_at: string;
  oneci_number?: string | null;
  oneci_verification_date?: string | null;
  cnam_number?: string | null;
  bio?: string | null;
  user_type?: string;
  agency_name?: string | null;
}

export interface CertificationFilters {
  search?: string;
  verification_status?: 'all' | 'verified' | 'partial' | 'none';
  verification_types?: ('identity' | 'oneci' | 'cnam' | 'facial')[];
  user_type?: string;
  city?: string;
  date_range?: {
    start: string;
    end: string;
  };
}

export class CertificationService {
  /**
   * Get all certified users with their verification details
   */
  static async getCertifiedUsers(filters?: CertificationFilters): Promise<CertificationUser[]> {
    try {
      let query = supabase.from('profiles').select('*').order('updated_at', { ascending: false });

      // Apply filters
      if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        query = query.or(`
          full_name.ilike.${searchTerm},
          email.ilike.${searchTerm},
          phone.ilike.${searchTerm},
          city.ilike.${searchTerm}
        `);
      }

      if (filters?.verification_status && filters.verification_status !== 'all') {
        switch (filters.verification_status) {
          case 'verified':
            query = query.eq('is_verified', true);
            break;
          case 'partial':
            query = query
              .and('is_verified.eq.false')
              .or(
                'oneci_verified.eq.true,cnam_verified.eq.true,facial_verification_status.neq.none'
              );
            break;
          case 'none':
            query = query
              .eq('is_verified', false)
              .eq('oneci_verified', false)
              .eq('cnam_verified', false)
              .eq('facial_verification_status', 'none');
            break;
        }
      }

      if (filters?.user_type) {
        query = query.eq('user_type', filters.user_type);
      }

      if (filters?.city) {
        query = query.ilike('city', `%${filters.city}%`);
      }

      if (filters?.date_range) {
        query = query
          .gte('updated_at', filters.date_range.start)
          .lte('updated_at', filters.date_range.end);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching certified users:', error);
        throw error;
      }

      // Apply client-side filters for verification types
      let filteredData = data || [];

      if (filters?.verification_types && filters.verification_types.length > 0) {
        filteredData = filteredData.filter((user) => {
          const hasIdentity = user.is_verified;
          const hasONECI = user.oneci_verified;
          const hasCNAM = user.cnam_verified;
          const hasFacial = user.facial_verification_status !== 'none';

          return filters.verification_types!.some((type) => {
            switch (type) {
              case 'identity':
                return hasIdentity;
              case 'oneci':
                return hasONECI;
              case 'cnam':
                return hasCNAM;
              case 'facial':
                return hasFacial;
              default:
                return false;
            }
          });
        });
      }

      return filteredData;
    } catch (error) {
      console.error('Error in getCertifiedUsers:', error);
      throw error;
    }
  }

  /**
   * Get certification statistics
   */
  static async getCertificationStats() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'is_verified, oneci_verified, cnam_verified, facial_verification_status, user_type, city'
        );

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        verified: data?.filter((u) => u.is_verified).length || 0,
        partial:
          data?.filter(
            (u) =>
              (u.oneci_verified || u.cnam_verified || u.facial_verification_status !== 'none') &&
              !u.is_verified
          ).length || 0,
        oneci: data?.filter((u) => u.oneci_verified).length || 0,
        cnam: data?.filter((u) => u.cnam_verified).length || 0,
        facial: data?.filter((u) => u.facial_verification_status !== 'none').length || 0,
        by_user_type: {} as Record<string, number>,
        by_city: {} as Record<string, number>,
      };

      // Group by user type
      data?.forEach((user) => {
        const userType = user.user_type || 'unknown';
        stats.by_user_type[userType] = (stats.by_user_type[userType] || 0) + 1;

        const city = user.city || 'Non spécifiée';
        stats.by_city[city] = (stats.by_city[city] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error fetching certification stats:', error);
      throw error;
    }
  }

  /**
   * Get user by ID with certification details
   */
  static async getUserCertificationDetails(userId: string): Promise<CertificationUser | null> {
    try {
      // First get profile details
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        if (profileError.code === 'PGRST116') return null; // User not found
        throw profileError;
      }

      // Then get verification history separately
      const { data: verifications, error: verificationError } = await supabase
        .from('user_verifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (verificationError) {
        console.warn('Could not fetch verification history:', verificationError);
      }

      return {
        ...profile,
        user_verifications: verifications || [],
      } as CertificationUser;
    } catch (error) {
      console.error('Error fetching user certification details:', error);
      throw error;
    }
  }

  /**
   * Update user certification status
   */
  static async updateCertification(
    userId: string,
    certificationData: {
      is_verified?: boolean;
      oneci_verified?: boolean;
      oneci_number?: string | null;
      cnam_verified?: boolean;
      cnam_number?: string | null;
      trust_score?: number;
      notes?: string;
    },
    certifiedBy: string
  ): Promise<void> {
    try {
      const updateData = {
        ...certificationData,
        updated_at: new Date().toISOString(),
        oneci_verification_date: certificationData.oneci_verified ? new Date().toISOString() : null,
      };

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (updateError) throw updateError;

      // Log the certification action
      await supabase.rpc('log_admin_action', {
        p_action: 'USER_CERTIFIED',
        p_entity_type: 'profiles',
        p_entity_id: userId,
        p_details: {
          certified_by: certifiedBy,
          certification_data: certificationData,
          timestamp: new Date().toISOString(),
        },
      });

      // Add verification record if needed
      if (
        certificationData.is_verified &&
        !certificationData.oneci_verified &&
        !certificationData.cnam_verified
      ) {
        await supabase.from('user_verifications').insert({
          user_id: userId,
          verification_type: 'identity',
          status: 'verifie',
          metadata: {
            certified_by: certifiedBy,
            notes: certificationData.notes,
          },
        });
      }
    } catch (error) {
      console.error('Error updating certification:', error);
      throw error;
    }
  }

  /**
   * Export certified users data
   */
  static async exportCertifiedUsers(
    format: 'csv' | 'json' = 'csv',
    filters?: CertificationFilters
  ): Promise<Blob> {
    try {
      const users = await this.getCertifiedUsers(filters);

      if (format === 'json') {
        return new Blob([JSON.stringify(users, null, 2)], {
          type: 'application/json',
        });
      }

      // CSV format
      const headers = [
        'ID',
        'Nom complet',
        'Email',
        'Téléphone',
        'Ville',
        'Type utilisateur',
        'Statut vérification',
        'ONECI vérifié',
        'CNAM vérifié',
        'Facial vérifié',
        'Trust Score',
        'Date de création',
        'Dernière mise à jour',
      ];

      const rows = users.map((user) => [
        user.id,
        user.full_name || '',
        user.email,
        user.phone || '',
        user.city || '',
        user.user_type || '',
        user.is_verified ? 'Vérifié' : 'Non vérifié',
        user.oneci_verified ? 'Oui' : 'Non',
        user.cnam_verified ? 'Oui' : 'Non',
        user.facial_verification_status !== 'none' ? 'Oui' : 'Non',
        `${user.trust_score}`,
        new Date(user.created_at).toLocaleDateString('fr-FR'),
        new Date(user.updated_at).toLocaleDateString('fr-FR'),
      ]);

      const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => `"${cell}"`).join(','))
        .join('\n');

      return new Blob([csvContent], {
        type: 'text/csv;charset=utf-8;',
      });
    } catch (error) {
      console.error('Error exporting certified users:', error);
      throw error;
    }
  }

  /**
   * Get verification history for a user
   */
  static async getVerificationHistory(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_verifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching verification history:', error);
      throw error;
    }
  }
}
