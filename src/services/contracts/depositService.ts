import { supabase } from '@/integrations/supabase/client';

export interface Deposit {
  id: string;
  contract_id: string;
  tenant_id: string;
  amount: number;
  status: 'held' | 'released' | 'partial' | 'deducted';
  release_date: string | null;
  deduction_amount: number | null;
  deduction_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DepositStats {
  totalHeld: number;
  totalReleased: number;
  totalDeducted: number;
  pendingRelease: number;
}

/**
 * Récupère le dépôt de garantie d'un contrat
 */
export async function getContractDeposit(contractId: string): Promise<Deposit | null> {
  const { data, error } = await supabase
    .from('lease_contracts')
    .select('deposit_amount, deposit_status, deposit_release_date, deposit_deduction_amount, deposit_deduction_reason')
    .eq('id', contractId)
    .single();

  if (error || !data) return null;

  return {
    id: contractId,
    contract_id: contractId,
    tenant_id: data.tenant_id || '',
    amount: data.deposit_amount || 0,
    status: data.deposit_status as Deposit['status'] || 'held',
    release_date: data.deposit_release_date,
    deduction_amount: data.deposit_deduction_amount,
    deduction_reason: data.deposit_deduction_reason,
    notes: null,
    created_at: data.created_at || '',
    updated_at: data.updated_at || '',
  };
}

/**
 * Récupère les statistiques des dépôts de garantie pour un propriétaire
 */
export async function getDepositStatsByOwner(ownerId: string): Promise<DepositStats> {
  const { data, error } = await supabase
    .from('lease_contracts')
    .select('deposit_amount, deposit_status')
    .eq('owner_id', ownerId);

  if (error || !data) {
    return {
      totalHeld: 0,
      totalReleased: 0,
      totalDeducted: 0,
      pendingRelease: 0,
    };
  }

  const totalHeld = data
    .filter(c => c.deposit_status === 'held')
    .reduce((sum, c) => sum + (c.deposit_amount || 0), 0);

  const totalReleased = data
    .filter(c => c.deposit_status === 'released')
    .reduce((sum, c) => sum + (c.deposit_amount || 0), 0);

  const totalDeducted = data
    .filter(c => c.deposit_status === 'deducted')
    .reduce((sum, c) => sum + (c.deposit_deduction_amount || 0), 0);

  const pendingRelease = data.filter(c => c.deposit_status === 'held').length;

  return {
    totalHeld,
    totalReleased,
    totalDeducted,
    pendingRelease,
  };
}

/**
 * Libère le dépôt de garantie
 */
export async function releaseDeposit(
  contractId: string,
  deductionAmount?: number,
  deductionReason?: string,
  notes?: string
): Promise<void> {
  const { error } = await supabase
    .from('lease_contracts')
    .update({
      deposit_status: 'released',
      deposit_release_date: new Date().toISOString(),
      deposit_deduction_amount: deductionAmount || null,
      deposit_deduction_reason: deductionReason || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', contractId);

  if (error) throw error;
}

/**
 * Met à jour le statut du dépôt de garantie
 */
export async function updateDepositStatus(
  contractId: string,
  status: Deposit['status'],
  notes?: string
): Promise<void> {
  const { error } = await supabase
    .from('lease_contracts')
    .update({
      deposit_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', contractId);

  if (error) throw error;
}

/**
 * Crée un déblocage partiel du dépôt de garantie
 */
export async function partialDepositRelease(
  contractId: string,
  releaseAmount: number,
  reason: string,
  notes?: string
): Promise<void> {
  const { error } = await supabase
    .from('lease_contracts')
    .update({
      deposit_status: 'partial',
      deposit_release_date: new Date().toISOString(),
      deposit_deduction_amount: releaseAmount,
      deposit_deduction_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', contractId);

  if (error) throw error;
}

/**
 * Récupère les dépôts en attente de libération
 */
export async function getPendingDeposits(ownerId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('lease_contracts')
    .select(`
      id,
      contract_number,
      deposit_amount,
      tenant_id,
      end_date
    `)
    .eq('owner_id', ownerId)
    .eq('deposit_status', 'held')
    .gt('end_date', new Date().toISOString())
    .order('end_date', { ascending: true });

  if (error) throw error;
  return data || [];
}
