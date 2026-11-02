/**
 * Service API pour la gestion des contrats avec validation de sécurité
 *
 * Ce service centralise toutes les opérations sur les contrats avec validation stricte
 * des permissions et de la propriété.
 */

import { supabase } from '@/services/supabase/client';
import {
  requirePermission,
  requireOwnership,
  hasRole,
} from '@/shared/services/roleValidation.service';
import type { Database } from '@/shared/lib/database.types';

type ContractInsert = Database['public']['Tables']['lease_contracts']['Insert'];
type ContractUpdate = Database['public']['Tables']['lease_contracts']['Update'];

export interface ContractWithDetails {
  id: string;
  contract_number: string;
  property_id: string;
  owner_id: string;
  tenant_id: string;
  monthly_rent: number;
  deposit_amount: number | null;
  charges_amount: number | null;
  start_date: string;
  end_date: string;
  payment_day: number | null;
  custom_clauses: string | null;
  status: string;
  owner_signature?: string;
  tenant_signature?: string;
  created_at: string;
  updated_at: string;
  properties?: {
    title: string;
    address: string | null;
    city: string;
  };
  owner_profile?: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  };
  tenant_profile?: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  };
}

export interface ContractFilters {
  status?: string;
  property_id?: string;
  owner_id?: string;
  tenant_id?: string;
  search?: string;
}

/**
 * API de gestion des contrats sécurisée
 */
export const contractApi = {
  /**
   * Récupère tous les contrats accessibles par l'utilisateur
   */
  getAll: async (filters?: ContractFilters): Promise<ContractWithDetails[]> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non authentifié');

    let query = supabase.from('lease_contracts').select(`
        *,
        properties!lease_contracts_property_id_fkey (
          title,
          address,
          city
        ),
        owner_profile:profiles!lease_contracts_owner_id_fkey (
          full_name,
          email,
          phone
        ),
        tenant_profile:profiles!lease_contracts_tenant_id_fkey (
          full_name,
          email,
          phone
        )
      `);

    // Appliquer les filtres
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.property_id) {
      query = query.eq('property_id', filters.property_id);
    }
    if (filters?.owner_id) {
      query = query.eq('owner_id', filters.owner_id);
    }
    if (filters?.tenant_id) {
      query = query.eq('tenant_id', filters.tenant_id);
    }
    if (filters?.search) {
      query = query.or(`
        contract_number.ilike.%${filters.search}%,
        properties.title.ilike.%${filters.search}%,
        owner_profile.full_name.ilike.%${filters.search}%,
        tenant_profile.full_name.ilike.%${filters.search}%
      `);
    }

    // Si pas admin, limiter aux contrats de l'utilisateur
    const isAdmin = await hasRole(['admin', 'trust_agent']);
    if (!isAdmin) {
      // Récupérer le profil de l'utilisateur
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single();

      if (profile?.user_type === 'owner') {
        query = query.eq('owner_id', user.id);
      } else if (profile?.user_type === 'tenant') {
        query = query.eq('tenant_id', user.id);
      } else if (profile?.user_type === 'agency') {
        // Pour les agences, vérifier qu'elles gèrent la propriété
        query = query.in(
          'property_id',
          supabase.from('properties').select('id').eq('agency_id', user.id)
        );
      } else {
        return []; // Pas de contrats accessibles
      }
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data as ContractWithDetails[];
  },

  /**
   * Récupère un contrat spécifique avec validation d'accès
   */
  getById: async (id: string): Promise<ContractWithDetails> => {
    await requireOwnership('contract')(id);

    const { data, error } = await supabase
      .from('lease_contracts')
      .select(
        `
        *,
        properties!lease_contracts_property_id_fkey (
          title,
          address,
          city
        ),
        owner_profile:profiles!lease_contracts_owner_id_fkey (
          full_name,
          email,
          phone
        ),
        tenant_profile:profiles!lease_contracts_tenant_id_fkey (
          full_name,
          email,
          phone
        )
      `
      )
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as ContractWithDetails;
  },

  /**
   * Crée un nouveau contrat
   */
  create: async (contract: ContractInsert): Promise<ContractWithDetails> => {
    await requirePermission('canManageContracts')();

    // Vérifier que l'utilisateur a le droit de créer un contrat pour cette propriété
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non authentifié');

    // Si ce n'est pas un admin, vérifier que c'est le propriétaire ou l'agence
    const isAdmin = await hasRole(['admin']);
    if (!isAdmin && contract.owner_id !== user.id) {
      // Vérifier si l'utilisateur est une agence gérant cette propriété
      const { data: property } = await supabase
        .from('properties')
        .select('agency_id')
        .eq('id', contract.property_id)
        .single();

      if (property?.agency_id !== user.id) {
        throw new Error('Non autorisé à créer un contrat pour cette propriété');
      }
    }

    // Générer un numéro de contrat unique
    const contractNumber = `CTR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Empêcher la création de doublons pour le même locataire et la même propriété
    const { count: existingContracts, error: existingError } = await supabase
      .from('lease_contracts')
      .select('id', { count: 'exact', head: true })
      .eq('property_id', contract.property_id)
      .eq('tenant_id', contract.tenant_id)
      .in('status', ['brouillon', 'en_attente_signature', 'actif']);

    if (existingError) throw existingError;
    if ((existingContracts ?? 0) > 0) {
      throw new Error(
        'Un contrat existe déjà pour ce locataire sur ce bien (brouillon/en attente/actif).'
      );
    }

    const { data, error } = await supabase
      .from('lease_contracts')
      .insert({
        ...contract,
        contract_number: contractNumber,
        status: 'brouillon',
        created_at: new Date().toISOString(),
      })
      .select(
        `
        *,
        properties!lease_contracts_property_id_fkey (
          title,
          address,
          city
        ),
        owner_profile:profiles!lease_contracts_owner_id_fkey (
          full_name,
          email,
          phone
        ),
        tenant_profile:profiles!lease_contracts_tenant_id_fkey (
          full_name,
          email,
          phone
        )
      `
      )
      .single();

    if (error) throw error;
    return data as ContractWithDetails;
  },

  /**
   * Met à jour un contrat
   */
  update: async (id: string, updates: ContractUpdate): Promise<ContractWithDetails> => {
    await requireOwnership('contract')(id);

    // Vérifier que le contrat peut être modifié (seuls les brouillons peuvent être modifiés)
    const { data: contract } = await supabase
      .from('lease_contracts')
      .select('status')
      .eq('id', id)
      .single();

    if (!contract) throw new Error('Contrat non trouvé');

    if (contract.status !== 'brouillon' && contract.status !== 'en_attente_signature') {
      throw new Error('Ce contrat ne peut plus être modifié');
    }

    const { data, error } = await supabase
      .from('lease_contracts')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(
        `
        *,
        properties!lease_contracts_property_id_fkey (
          title,
          address,
          city
        ),
        owner_profile:profiles!lease_contracts_owner_id_fkey (
          full_name,
          email,
          phone
        ),
        tenant_profile:profiles!lease_contracts_tenant_id_fkey (
          full_name,
          email,
          phone
        )
      `
      )
      .single();

    if (error) throw error;
    return data as ContractWithDetails;
  },

  /**
   * Supprime un contrat (uniquement les brouillons)
   */
  delete: async (id: string): Promise<void> => {
    await requireOwnership('contract')(id);

    // Vérifier que le contrat est un brouillon
    const { data: contract } = await supabase
      .from('lease_contracts')
      .select('status, document_url')
      .eq('id', id)
      .single();

    if (!contract) throw new Error('Contrat non trouvé');

    if (contract.status !== 'brouillon') {
      throw new Error('Seuls les brouillons peuvent être supprimés');
    }

    // Supprimer le document si existant
    if (contract.document_url) {
      // Extraire le chemin du fichier de l'URL
      const urlParts = contract.document_url.split('/');
      const filePath = urlParts.slice(-2).join('/');

      await supabase.storage.from('lease-documents').remove([filePath]);
    }

    // Supprimer le contrat
    const { error } = await supabase.from('lease_contracts').delete().eq('id', id);

    if (error) throw error;
  },

  /**
   * Signe un contrat (pour le propriétaire ou le locataire)
   */
  signContract: async (
    id: string,
    signatureType: 'owner' | 'tenant'
  ): Promise<ContractWithDetails> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non authentifié');

    const contract = await this.getById(id);

    // Vérifier que l'utilisateur a le droit de signer
    if (signatureType === 'owner' && contract.owner_id !== user.id) {
      throw new Error('Non autorisé à signer ce contrat en tant que propriétaire');
    }
    if (signatureType === 'tenant' && contract.tenant_id !== user.id) {
      throw new Error('Non autorisé à signer ce contrat en tant que locataire');
    }

    // Vérifier que le contrat est en attente de signature
    if (contract.status !== 'en_attente_signature') {
      throw new Error("Ce contrat n'est pas en attente de signature");
    }

    // Mettre à jour la signature
    const updateData: ContractUpdate = {
      [`${signatureType}_signature`]: user.id,
      [`${signatureType}_signed_at`]: new Date().toISOString(),
    };

    // Si les deux parties ont signé, activer le contrat
    if (
      (signatureType === 'owner' && contract.tenant_signature) ||
      (signatureType === 'tenant' && contract.owner_signature)
    ) {
      updateData.status = 'actif';
      updateData.activated_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('lease_contracts')
      .update(updateData)
      .eq('id', id)
      .select(
        `
        *,
        properties!lease_contracts_property_id_fkey (
          title,
          address,
          city
        ),
        owner_profile:profiles!lease_contracts_owner_id_fkey (
          full_name,
          email,
          phone
        ),
        tenant_profile:profiles!lease_contracts_tenant_id_fkey (
          full_name,
          email,
          phone
        )
      `
      )
      .single();

    if (error) throw error;

    // Si le contrat est activé, mettre à jour le statut de la propriété
    if (updateData.status === 'actif') {
      await supabase.from('properties').update({ status: 'loue' }).eq('id', contract.property_id);
    }

    return data as ContractWithDetails;
  },

  /**
   * Résilie un contrat
   */
  terminate: async (id: string, reason: string): Promise<ContractWithDetails> => {
    await requireOwnership('contract')(id);

    const contract = await this.getById(id);

    if (contract.status !== 'actif') {
      throw new Error('Seuls les contrats actifs peuvent être résiliés');
    }

    const { data, error } = await supabase
      .from('lease_contracts')
      .update({
        status: 'resilie',
        termination_reason: reason,
        terminated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(
        `
        *,
        properties!lease_contracts_property_id_fkey (
          title,
          address,
          city
        ),
        owner_profile:profiles!lease_contracts_owner_id_fkey (
          full_name,
          email,
          phone
        ),
        tenant_profile:profiles!lease_contracts_tenant_id_fkey (
          full_name,
          email,
          phone
        )
      `
      )
      .single();

    if (error) throw error;

    // Remettre la propriété comme disponible
    await supabase
      .from('properties')
      .update({ status: 'disponible' })
      .eq('id', contract.property_id);

    return data as ContractWithDetails;
  },

  /**
   * Récupère les statistiques des contrats
   */
  getStats: async (): Promise<{
    total: number;
    actifs: number;
    brouillons: number;
    en_attente: number;
    resilies: number;
  }> => {
    const hasAccess = await hasRole(['admin', 'trust_agent']);
    if (!hasAccess) {
      throw new Error('Accès non autorisé');
    }

    const { data, error } = await supabase
      .from('lease_contracts')
      .select('status')
      .neq('status', 'supprime');

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      actifs: data?.filter((c) => c.status === 'actif').length || 0,
      brouillons: data?.filter((c) => c.status === 'brouillon').length || 0,
      en_attente: data?.filter((c) => c.status === 'en_attente_signature').length || 0,
      resilies: data?.filter((c) => c.status === 'resilie').length || 0,
    };

    return stats;
  },
};
