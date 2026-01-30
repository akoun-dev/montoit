/**
 * Hook React pour la gestion des paiements InTouch
 */

import { useState, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
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

  const checkStatus = useMutation({
    mutationFn: (transactionId: string) => intouchService.checkPaymentStatus(transactionId),
  });

  const { data: balance, refetch: refetchBalance } = useQuery({
    queryKey: ['paymentBalance'],
    queryFn: () => intouchService.getBalance(),
    staleTime: 60000, // 1 minute
    enabled: intouchService.isConfigured(),
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
    const transactionId = `MT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Initier le paiement via InTouch
      const result = await initiatePayment.mutateAsync({
        amount,
        recipient_phone_number: formattedPhone,
        partner_transaction_id: transactionId,
        callback_url: `${window.location.origin}/functions/v1/payment-callback`,
        operator,
      });

      // Enregistrer la transaction dans Supabase
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
          tenant_id: (await supabase.auth.getUser()).data?.user?.id || null,
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
    checkStatus,
    processRentalPayment,
    balance,
    refetchBalance,
    transactionId,
    isProcessing: initiatePayment.isPending,
    error: initiatePayment.error,
  };
};
