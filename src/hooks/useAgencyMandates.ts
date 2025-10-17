import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export interface AgencyMandate {
  id: string;
  agency_id: string;
  owner_id: string;
  property_id: string | null;
  mandate_type: 'location' | 'gestion_complete' | 'vente';
  commission_rate: number | null;
  fixed_fee: number | null;
  billing_frequency: 'mensuel' | 'trimestriel' | 'annuel' | 'par_transaction' | null;
  permissions: {
    can_view_properties: boolean;
    can_edit_properties: boolean;
    can_create_properties: boolean;
    can_delete_properties: boolean;
    can_view_applications: boolean;
    can_manage_applications: boolean;
    can_create_leases: boolean;
    can_view_financials: boolean;
    can_manage_maintenance: boolean;
    can_communicate_tenants: boolean;
    can_manage_documents: boolean;
  };
  start_date: string;
  end_date: string | null;
  status: 'pending' | 'active' | 'suspended' | 'terminated' | 'expired';
  notes: string | null;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  terminated_at: string | null;
  terminated_by: string | null;
  termination_reason: string | null;
}

/**
 * Hook pour gérer les mandats d'agence
 */
export const useAgencyMandates = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Récupérer tous les mandats de l'utilisateur (agence ou propriétaire)
  const { data: mandates = [], isLoading } = useQuery({
    queryKey: ['agency-mandates', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('agency_mandates')
        .select('*')
        .or(`agency_id.eq.${user.id},owner_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AgencyMandate[];
    },
    enabled: !!user,
  });

  // Créer un nouveau mandat (propriétaire invite une agence)
  const createMandate = useMutation({
    mutationFn: async (mandate: {
      agency_id: string;
      property_id?: string | null;
      mandate_type: 'location' | 'gestion_complete' | 'vente';
      commission_rate?: number;
      fixed_fee?: number;
      billing_frequency?: 'mensuel' | 'trimestriel' | 'annuel' | 'par_transaction';
      permissions?: Partial<AgencyMandate['permissions']>;
      start_date: string;
      end_date?: string | null;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('agency_mandates')
        .insert([{ ...mandate, owner_id: user?.id, status: 'pending' }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-mandates'] });
      toast({
        title: "Invitation envoyée",
        description: "L'agence a été invitée à gérer vos biens",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: `Impossible d'envoyer l'invitation: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Accepter un mandat (agence)
  const acceptMandate = useMutation({
    mutationFn: async (mandateId: string) => {
      const { data, error } = await supabase
        .from('agency_mandates')
        .update({ 
          status: 'active', 
          accepted_at: new Date().toISOString() 
        })
        .eq('id', mandateId)
        .eq('agency_id', user?.id)
        .eq('status', 'pending')
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-mandates'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast({
        title: "Mandat accepté",
        description: "Vous pouvez maintenant gérer ces biens",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: `Impossible d'accepter le mandat: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Refuser un mandat (agence)
  const refuseMandate = useMutation({
    mutationFn: async ({ mandateId, reason }: { mandateId: string; reason?: string }) => {
      const { data, error } = await supabase
        .from('agency_mandates')
        .update({ 
          status: 'terminated',
          terminated_at: new Date().toISOString(),
          terminated_by: user?.id,
          termination_reason: reason || 'Refusé par l\'agence'
        })
        .eq('id', mandateId)
        .eq('agency_id', user?.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-mandates'] });
      toast({
        title: "Mandat refusé",
        description: "Le mandat a été refusé",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: `Impossible de refuser le mandat: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Résilier un mandat (propriétaire ou agence)
  const terminateMandate = useMutation({
    mutationFn: async ({ mandateId, reason }: { mandateId: string; reason: string }) => {
      const { data, error } = await supabase
        .from('agency_mandates')
        .update({ 
          status: 'terminated',
          terminated_at: new Date().toISOString(),
          terminated_by: user?.id,
          termination_reason: reason
        })
        .eq('id', mandateId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-mandates'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast({
        title: "Mandat résilié",
        description: "Le mandat a été résilié avec succès",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: `Impossible de résilier le mandat: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Suspendre un mandat (agence)
  const suspendMandate = useMutation({
    mutationFn: async ({ mandateId, reason }: { mandateId: string; reason?: string }) => {
      const { data, error } = await supabase
        .from('agency_mandates')
        .update({ 
          status: 'suspended',
          notes: reason 
        })
        .eq('id', mandateId)
        .eq('agency_id', user?.id)
        .eq('status', 'active')
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-mandates'] });
      toast({
        title: "Mandat suspendu",
        description: "Le mandat a été suspendu temporairement",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: `Impossible de suspendre le mandat: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mettre à jour les permissions d'un mandat (propriétaire)
  const updateMandatePermissions = useMutation({
    mutationFn: async ({ 
      mandateId, 
      permissions 
    }: { 
      mandateId: string; 
      permissions: Partial<AgencyMandate['permissions']> 
    }) => {
      const { data, error } = await supabase
        .from('agency_mandates')
        .update({ permissions })
        .eq('id', mandateId)
        .eq('owner_id', user?.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-mandates'] });
      toast({
        title: "Permissions mises à jour",
        description: "Les permissions du mandat ont été modifiées",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: `Impossible de modifier les permissions: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Filtres utiles
  const activeMandates = mandates.filter(m => m.status === 'active');
  const pendingMandates = mandates.filter(m => m.status === 'pending');
  const asAgency = mandates.filter(m => m.agency_id === user?.id);
  const asOwner = mandates.filter(m => m.owner_id === user?.id);

  return {
    mandates,
    activeMandates,
    pendingMandates,
    asAgency,
    asOwner,
    isLoading,
    createMandate: createMandate.mutate,
    acceptMandate: acceptMandate.mutate,
    refuseMandate: refuseMandate.mutate,
    terminateMandate: terminateMandate.mutate,
    suspendMandate: suspendMandate.mutate,
    updateMandatePermissions: updateMandatePermissions.mutate,
  };
};
