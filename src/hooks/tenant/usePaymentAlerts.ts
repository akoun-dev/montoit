import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/services/supabase/client';
import { logger } from '@/shared/lib/logger';

interface PaymentAlert {
  id: string;
  property_id: string;
  property_title: string;
  amount: number;
  due_date: string;
  daysUntilDue: number;
  isOverdue: boolean;
}

interface PaymentAlertsHookReturn {
  alerts: PaymentAlert[];
  loading: boolean;
  dismissAlert: (alertId: string) => void;
  checkAlerts: () => Promise<void>;
}

const ALERT_THRESHOLDS = [7, 3, 1]; // Jours avant échéance pour alertes

/**
 * Hook pour gérer les alertes proactives de paiements à venir
 * Vérifie automatiquement les échéances à 7, 3 et 1 jours et en retard
 */
export function usePaymentAlerts(): PaymentAlertsHookReturn {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<PaymentAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const checkAlerts = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Récupérer les contrats actifs du locataire
      const { data: contracts, error: contractsError } = await supabase
        .from('lease_contracts')
        .select('id, property_id, monthly_rent, start_date, end_date, status, properties(title)')
        .eq('tenant_id', user.id)
        .eq('status', 'actif')
        .order('start_date', { ascending: false });

      if (contractsError) throw contractsError;
      if (!contracts || contracts.length === 0) {
        setAlerts([]);
        return;
      }

      // Calculer les prochaines échéances pour chaque contrat
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const newAlerts: PaymentAlert[] = [];

      for (const contract of contracts as any[]) {
        const startDate = new Date(contract.start_date);
        const endDate = contract.end_date ? new Date(contract.end_date) : null;

        // Trouver la prochaine échéance de paiement
        const nextDueDate = new Date(startDate);
        while (nextDueDate <= today) {
          nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        }

        // Vérifier si le contrat est toujours valide
        if (endDate && nextDueDate > endDate) continue;

        const daysUntilDue = Math.ceil((nextDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Vérifier si un paiement existe déjà pour cette échéance
        const { data: existingPayment } = await supabase
          .from('payments')
          .select('id, status, created_at')
          .eq('tenant_id', user.id)
          .eq('lease_id', contract.id)
          .gte('created_at', new Date(today.getFullYear(), today.getMonth(), 1).toISOString())
          .order('created_at', { ascending: false })
          .limit(1);

        // Si un paiement existe déjà pour ce mois, passer au contrat suivant
        if (existingPayment && existingPayment.length > 0) {
          const paymentMonth = new Date(existingPayment[0].created_at).getMonth();
          const currentMonth = today.getMonth();
          if (paymentMonth === currentMonth) continue;
        }

        // Générer une alerte si dans les seuils définis
        if (
          ALERT_THRESHOLDS.includes(daysUntilDue) ||
          daysUntilDue < 0 // En retard
        ) {
          const alertId = `${contract.id}-${nextDueDate.toISOString().split('T')[0]}`;

          // Ne pas ajouter si déjà dismissé
          if (dismissedAlerts.has(alertId)) continue;

          newAlerts.push({
            id: alertId,
            property_id: contract.property_id,
            property_title: contract.properties?.title || 'Votre propriété',
            amount: contract.monthly_rent,
            due_date: nextDueDate.toISOString(),
            daysUntilDue,
            isOverdue: daysUntilDue < 0,
          });
        }
      }

      setAlerts(newAlerts);
    } catch (error) {
      logger.error('Error checking payment alerts', error instanceof Error ? error : undefined);
    } finally {
      setLoading(false);
    }
  }, [user, dismissedAlerts]);

  const dismissAlert = useCallback((alertId: string) => {
    setDismissedAlerts((prev) => new Set([...prev, alertId]));
    setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
  }, []);

  // Vérifier les alertes au montage et toutes les heures
  useEffect(() => {
    checkAlerts();

    const interval = setInterval(checkAlerts, 60 * 60 * 1000); // Toutes les heures

    return () => clearInterval(interval);
  }, [checkAlerts]);

  return {
    alerts,
    loading,
    dismissAlert,
    checkAlerts,
  };
}
