import { supabase } from '@/services/supabase/client';

export interface RecurringPayment {
  id: string;
  contract_id: string;
  tenant_id: string;
  amount: number;
  payment_day: number;
  frequency: 'monthly' | 'quarterly';
  provider: 'orange_money' | 'mtn_money' | 'moov_money' | 'wave';
  phone_number: string;
  is_active: boolean;
  start_date: string;
  end_date?: string;
  next_payment_date: string;
  last_payment_date?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Récupère tous les paiements récurrents d'un utilisateur
 */
export async function getRecurringPayments(tenantId: string): Promise<RecurringPayment[]> {
  const { data, error } = await supabase
    .from('recurring_payments')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Crée un nouveau paiement récurrent automatique
 */
export async function createRecurringPayment(
  payment: Omit<RecurringPayment, 'id' | 'next_payment_date' | 'created_at' | 'updated_at'>
): Promise<RecurringPayment> {
  // Calculer la prochaine date de paiement
  const nextPaymentDate = calculateNextPaymentDate(
    payment.payment_day,
    payment.start_date
  );

  const { data, error } = await supabase
    .from('recurring_payments')
    .insert({
      ...payment,
      next_payment_date: nextPaymentDate,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Met à jour un paiement récurrent
 */
export async function updateRecurringPayment(
  paymentId: string,
  updates: Partial<RecurringPayment>
): Promise<void> {
  const { error } = await supabase
    .from('recurring_payments')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', paymentId);

  if (error) throw error;
}

/**
 * Désactive un paiement récurrent
 */
export async function deactivateRecurringPayment(paymentId: string): Promise<void> {
  const { error } = await supabase
    .from('recurring_payments')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', paymentId);

  if (error) throw error;
}

/**
 * Traite les paiements récurrents dus (à appeler via un cron job)
 * Cette fonction est destinée à être appelée par une tâche planifiée
 */
export async function processDueRecurringPayments(): Promise<{
  processed: number;
  failed: number;
  errors: string[];
}> {
  const now = new Date();
  const today = now.getDate();
  const errors: string[] = [];
  let processed = 0;
  let failed = 0;

  try {
    // Récupérer tous les paiements récurrents actifs dus
    const { data: duePayments, error } = await supabase
      .from('recurring_payments')
      .select('*')
      .eq('is_active', true)
      .lte('next_payment_date', now.toISOString());

    if (error) throw error;

    for (const payment of (duePayments || []) as RecurringPayment[]) {
      try {
        // Créer le paiement via le système de paiement existant
        const paymentReference = `REC-${payment.id}-${Date.now()}`;

        const { error: paymentError } = await supabase.from('payments').insert({
          lease_id: payment.contract_id,
          tenant_id: payment.tenant_id,
          amount: payment.amount,
          status: 'pending',
          payment_method: payment.provider,
          transaction_reference: paymentReference,
          metadata: {
            recurring_payment_id: payment.id,
            auto_payment: true,
          },
        });

        if (paymentError) throw paymentError;

        // Mettre à jour la prochaine date de paiement
        const nextPaymentDate = calculateNextPaymentDate(
          payment.payment_day,
          payment.next_payment_date
        );

        await supabase
          .from('recurring_payments')
          .update({
            last_payment_date: now.toISOString(),
            next_payment_date: nextPaymentDate,
            updated_at: now.toISOString(),
          })
          .eq('id', payment.id);

        processed++;
      } catch (err) {
        failed++;
        errors.push(`Payment ${payment.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  } catch (error) {
    errors.push(`Global error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return { processed, failed, errors };
}

/**
 * Calcule la prochaine date de paiement
 */
function calculateNextPaymentDate(paymentDay: number, fromDate: string): string {
  const date = new Date(fromDate);
  const currentDay = date.getDate();

  // Calculer le prochain mois
  date.setMonth(date.getMonth() + 1);

  // Ajuster au jour de paiement
  date.setDate(paymentDay);

  // Si le jour de paiement est dans le passé (ce mois), aller au mois prochain
  const today = new Date();
  if (date <= today) {
    date.setMonth(date.getMonth() + 1);
  }

  return date.toISOString();
}

/**
 * Vérifie si un paiement récurrent existe pour un contrat
 */
export async function hasRecurringPayment(contractId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('recurring_payments')
    .select('id')
    .eq('contract_id', contractId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) return false;
  return !!data;
}

/**
 * Récupère le paiement récurrent d'un contrat
 */
export async function getContractRecurringPayment(
  contractId: string
): Promise<RecurringPayment | null> {
  const { data, error } = await supabase
    .from('recurring_payments')
    .select('*')
    .eq('contract_id', contractId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) return null;
  return data;
}
