import { supabase } from '@/integrations/supabase/client';

export interface RentPayment {
  id: string;
  contract_id: string;
  tenant_id: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  status: 'pending' | 'paid' | 'late' | 'partial';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentStats {
  totalPaid: number;
  totalDue: number;
  pendingPayments: number;
  latePayments: number;
  onTimeRate: number;
}

/**
 * Récupère tous les paiements de loyer pour un contrat
 */
export async function getContractPayments(contractId: string): Promise<RentPayment[]> {
  const { data, error } = await supabase
    .from('rent_payments')
    .select('*')
    .eq('contract_id', contractId)
    .order('payment_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Récupère les statistiques de paiement pour un contrat
 */
export async function getPaymentStats(contractId: string): Promise<PaymentStats> {
  const payments = await getContractPayments(contractId);
  
  const totalPaid = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);
  
  const pendingPayments = payments.filter(p => p.status === 'pending' || p.status === 'late').length;
  const latePayments = payments.filter(p => p.status === 'late').length;
  
  // Calculer le taux de ponctualité (paiements à temps / total des paiements)
  const totalPayments = payments.length;
  const onTimePayments = payments.filter(p => p.status === 'paid').length;
  const onTimeRate = totalPayments > 0 ? (onTimePayments / totalPayments) * 100 : 0;
  
  return {
    totalPaid,
    totalDue: 0, // À calculer en fonction du loyer mensuel et du nombre de mois
    pendingPayments,
    latePayments,
    onTimeRate,
  };
}

/**
 * Crée un nouveau paiement de loyer
 */
export async function createRentPayment(payment: Omit<RentPayment, 'id' | 'created_at' | 'updated_at'>): Promise<RentPayment> {
  const { data, error } = await supabase
    .from('rent_payments')
    .insert({
      ...payment,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Met à jour le statut d'un paiement
 */
export async function updatePaymentStatus(
  paymentId: string,
  status: RentPayment['status'],
  notes?: string
): Promise<void> {
  const { error } = await supabase
    .from('rent_payments')
    .update({
      status,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', paymentId);

  if (error) throw error;
}

/**
 * Supprime un paiement de loyer
 */
export async function deleteRentPayment(paymentId: string): Promise<void> {
  const { error } = await supabase
    .from('rent_payments')
    .delete()
    .eq('id', paymentId);

  if (error) throw error;
}

/**
 * Récupère les paiements en retard pour tous les contrats d'un propriétaire
 */
export async function getLatePaymentsByOwner(ownerId: string): Promise<RentPayment[]> {
  const { data, error } = await supabase
    .from('rent_payments')
    .select(`
      *,
      lease_contracts!inner (
        owner_id
      )
    `)
    .eq('lease_contracts.owner_id', ownerId)
    .in('status', ['late', 'pending'])
    .order('payment_date', { ascending: true });

  if (error) throw error;
  return data || [];
}
