/**
 * Hook React pour la gestion des paiements InTouch
 */

import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { intouchService, type PaymentRequest, type MobileMoneyOperator } from '@/services/payments/intouchPaymentService';
import { supabase } from '@/integrations/supabase/client';

export const usePayment = () => {
  const [transactionId, setTransactionId] = useState<string | null>(null);

  const initiatePayment = useMutation({
    mutationFn: (data: PaymentRequest) => intouchService.initiatePayment(data),
    onSuccess: (response) => {
      setTransactionId(response.transaction_id);
    },
  });

  const processRentalPayment = useCallback(async (
    amount: number,
    phoneNumber: string,
    operator: MobileMoneyOperator,
    description: string = 'Paiement de loyer',
    leaseId?: string
  ) => {
    // Valider et formater le numéro de téléphone
    const validation = intouchService.validatePhoneNumber(phoneNumber);
    if (!validation.valid) {
      throw new Error(validation.error || 'Numéro de téléphone invalide');
    }

    const formattedPhone = validation.formatted;
    const txnId = `MT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Initier le paiement via InTouch
      const result = await initiatePayment.mutateAsync({
        amount,
        recipient_phone_number: formattedPhone,
        partner_transaction_id: txnId,
        operator,
      });

      // Enregistrer la transaction dans Supabase
      const { data: { user } } = await supabase.auth.getUser();

      const { error: insertError } = await supabase
        .from('transactions')
        .insert({
          transaction_id: result.transaction_id,
          amount,
          phone_number: formattedPhone,
          operator,
          status: result.status === 'PENDING' ? 'pending' : result.status.toLowerCase(),
          description,
          type: 'rental_payment',
          lease_id: leaseId || null,
          tenant_id: user?.id || null,
        });

      if (insertError) {
        console.error('Failed to record transaction:', insertError);
      }

      return result;
    } catch (error) {
      console.error('Payment failed:', error);
      throw error;
    }
  }, [initiatePayment]);

  return {
    initiatePayment,
    processRentalPayment,
    transactionId,
    isProcessing: initiatePayment.isPending,
    error: initiatePayment.error,
  };
};
