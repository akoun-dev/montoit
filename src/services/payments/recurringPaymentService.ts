/**
 * Service de gestion des paiements récurrents via InTouch
 * Permet de planifier et traiter automatiquement les paiements mensuels
 */

import { intouchService, type MobileMoneyOperator } from './intouchPaymentService';
import { supabase } from '@/integrations/supabase/client';

export interface RecurringPaymentConfig {
  leaseId: string;
  amount: number;
  phoneNumber: string;
  operator: MobileMoneyOperator;
  startDate: Date;
  frequency?: 'weekly' | 'biweekly' | 'monthly';
}

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

/**
 * Service de paiements récurrents via InTouch Direct API
 * Ajoute les méthodes spécifiées dans intouch.txt
 */
export class RecurringPaymentService {
  /**
   * Planifier un paiement récurrent mensuel
   */
  static async scheduleMonthlyPayment(config: RecurringPaymentConfig) {
    const { leaseId, amount, phoneNumber, operator, startDate, frequency = 'monthly' } = config;

    // Valider le numéro de téléphone
    const validation = intouchService.validatePhoneNumber(phoneNumber);
    if (!validation.valid) {
      throw new Error(validation.error || 'Numéro de téléphone invalide');
    }

    const formattedPhone = validation.formatted;

    // Créer une entrée dans la table recurring_payments
    const { data, error } = await supabase
      .from('recurring_payments')
      .insert({
        lease_id: leaseId,
        amount,
        phone_number: formattedPhone,
        provider: operator.toLowerCase(),
        start_date: startDate.toISOString(),
        frequency: frequency === 'monthly' ? 'monthly' : 'quarterly',
        status: 'active',
        next_payment_date: startDate.toISOString(),
        is_active: true,
        payment_day: startDate.getDate(),
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  /**
   * Processus automatisé (à exécuter via cron job ou edge function)
   */
  static async processDuePayments() {
    const today = new Date().toISOString().split('T')[0];

    // Récupérer tous les paiements dus aujourd'hui
    const { data: payments, error } = await supabase
      .from('recurring_payments')
      .select(`
        *,
        leases (
          tenant_id,
          property_id,
          property_owner_id
        )
      `)
      .eq('next_payment_date', today)
      .eq('status', 'active');

    if (error) throw error;

    // Traiter chaque paiement
    for (const payment of payments) {
      try {
        // Initier le paiement
        const result = await intouchService.initiatePayment({
          amount: payment.amount,
          recipient_phone_number: payment.phone_number,
          partner_transaction_id: `REC_${payment.id}_${Date.now()}`,
          callback_url: `${window.location.origin}/functions/v1/payment-callback`,
          operator: payment.provider.toUpperCase() as MobileMoneyOperator,
        });

        // Enregistrer le paiement ponctuel
        await supabase.from('rent_payments').insert({
          lease_id: payment.lease_id,
          recurring_payment_id: payment.id,
          transaction_id: result.transaction_id,
          amount: payment.amount,
          payment_date: new Date().toISOString(),
          status: 'pending',
        });

        // Mettre à jour la prochaine date de paiement
        const nextDate = new Date(payment.next_payment_date);

        if (payment.frequency === 'weekly') {
          nextDate.setDate(nextDate.getDate() + 7);
        } else if (payment.frequency === 'biweekly') {
          nextDate.setDate(nextDate.getDate() + 14);
        } else {
          // monthly (default)
          nextDate.setMonth(nextDate.getMonth() + 1);
        }

        await supabase
          .from('recurring_payments')
          .update({ next_payment_date: nextDate.toISOString() })
          .eq('id', payment.id);

        console.log(`[RecurringPayment] Processed payment ${payment.id} successfully`);

      } catch (error) {
        console.error(`[RecurringPayment] Failed to process payment ${payment.id}:`, error);

        // Enregistrer l'échec
        await supabase.from('failed_payments').insert({
          recurring_payment_id: payment.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          attempted_at: new Date().toISOString(),
        });

        // Gérer les échecs répétés (3 tentatives max)
        const { data: failedAttempts } = await supabase
          .from('failed_payments')
          .select('count')
          .eq('recurring_payment_id', payment.id);

        if (failedAttempts && failedAttempts.length >= 3) {
          await supabase
            .from('recurring_payments')
            .update({ status: 'suspended' })
            .eq('id', payment.id);

          console.warn(`[RecurringPayment] Suspended payment ${payment.id} after 3 failed attempts`);
        }
      }
    }
  }

  /**
   * Suspendre un paiement récurrent
   */
  static async suspendRecurringPayment(recurringPaymentId: string) {
    const { error } = await supabase
      .from('recurring_payments')
      .update({ status: 'suspended' })
      .eq('id', recurringPaymentId);

    if (error) throw error;
  }

  /**
   * Réactiver un paiement récurrent suspendu
   */
  static async reactivateRecurringPayment(recurringPaymentId: string) {
    // Reset failed attempts
    await supabase
      .from('failed_payments')
      .delete()
      .eq('recurring_payment_id', recurringPaymentId);

    const { error } = await supabase
      .from('recurring_payments')
      .update({ status: 'active' })
      .eq('id', recurringPaymentId);

    if (error) throw error;
  }

  /**
   * Annuler un paiement récurrent
   */
  static async cancelRecurringPayment(recurringPaymentId: string) {
    const { error } = await supabase
      .from('recurring_payments')
      .update({ status: 'cancelled', is_active: false })
      .eq('id', recurringPaymentId);

    if (error) throw error;
  }

  /**
   * Récupère tous les paiements récurrents pour un bail
   */
  static async getRecurringPayments(leaseId: string) {
    const { data, error } = await supabase
      .from('recurring_payments')
      .select('*')
      .eq('lease_id', leaseId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}

export const recurringPaymentService = new RecurringPaymentService();
