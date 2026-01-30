import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import {
  Smartphone,
  Building,
  AlertCircle,
  CheckCircle,
  Clock,
  Shield,
  Zap,
} from 'lucide-react';
import { AddressValue, formatAddress } from '@/shared/utils/address';
import TenantDashboardLayout from '@/features/tenant/components/TenantDashboardLayout';
import { PaymentModal } from '@/components/payment/PaymentModal';

interface Contract {
  id: string;
  lease_id: string | null;
  property_id: string;
  monthly_rent: number;
  deposit_amount: number | null;
  owner_id: string;
  property_title: string;
  property_address: AddressValue;
  property_city: string;
  property_main_image: string | null;
  owner_name: string;
  owner_phone: null; // Fetched separately from owner profile
  next_payment_due?: string;
  days_until_due?: number;
}

interface PendingPayment {
  contractId: string;
  paymentType: 'loyer' | 'depot_garantie' | 'charges';
  amount: number;
  leaseId: string | null;
}

export default function MakePaymentPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);

  const loadUserContracts = async () => {
    if (!user) return;

    try {
      // Get contracts where user is the tenant
      const { data: tenantContracts, error: tenantError } = await supabase
        .from('lease_contracts')
        .select('id, lease_id, property_id, deposit_amount, owner_id, tenant_id, start_date, monthly_rent, status')
        .eq('tenant_id', user.id)
        .order('created_at', { ascending: false });

      console.log('🔍 MakePaymentPage - Tenant contracts:', {
        userId: user.id,
        userEmail: user.email,
        tenantContracts,
        tenantError,
        count: tenantContracts?.length || 0,
      });

      // Filter for active contracts
      const activeContracts = (tenantContracts || []).filter(
        c => c.status === 'actif'
      );

      console.log('🔍 MakePaymentPage - Active contracts:', activeContracts);

      if (tenantError) throw tenantError;

      const formattedContracts: Contract[] = [];

      for (const contract of activeContracts) {
        const { data: propertyData, error: propertyError } = await supabase
          .from('properties')
          .select('title, address, city, main_image, price')
          .eq('id', contract.property_id)
          .single();

        console.log('MakePaymentPage - Property data for contract:', contract.property_id, {
          propertyData,
          propertyError: propertyError ? JSON.stringify(propertyError) : null,
          contractMonthlyRent: contract.monthly_rent,
        });

        // Even if propertyData is null, create contract with available info
        const rent = contract.monthly_rent || propertyData?.price || 0;

        const nextDue = new Date(contract.start_date);
        const today = new Date();
        while (nextDue < today) {
          nextDue.setMonth(nextDue.getMonth() + 1);
        }
        const daysUntilDue = Math.ceil((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        formattedContracts.push({
          id: contract.id,
          lease_id: contract.lease_id,
          property_id: contract.property_id,
          monthly_rent: rent,
          deposit_amount: contract.deposit_amount,
          owner_id: contract.owner_id,
          property_title: propertyData?.title || 'Propriété',
          property_address: propertyData?.address || null,
          property_city: propertyData?.city || '',
          property_main_image: propertyData?.main_image || null,
          owner_name: 'Propriétaire',
          owner_phone: null, // Will be fetched from owner profile if needed
          next_payment_due: nextDue.toISOString(),
          days_until_due: daysUntilDue,
        });
      }

      console.log('MakePaymentPage - Final formatted contracts:', formattedContracts);

      setContracts(formattedContracts);
    } catch (err: unknown) {
      console.error('Error loading contracts:', err);
      setError('Erreur lors du chargement des contrats');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = (
    contractId: string,
    paymentType: 'loyer' | 'depot_garantie' | 'charges',
    amount: number
  ) => {
    const contract = contracts.find((c) => c.id === contractId);
    if (!contract) return;

    setPendingPayment({
      contractId,
      paymentType,
      amount,
      leaseId: contract.lease_id,
    });
    setModalOpen(true);
    setError('');
  };

  const handlePaymentSuccess = () => {
    setSuccess(true);
    setModalOpen(false);
    setPendingPayment(null);
    // Refresh contracts to update payment status
    loadUserContracts();
  };

  useEffect(() => {
    if (user) {
      loadUserContracts();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-CI').format(amount);

  if (loading) {
    return (
      <TenantDashboardLayout title="Effectuer un paiement">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F16522]"></div>
        </div>
      </TenantDashboardLayout>
    );
  }

  if (success) {
    return (
      <TenantDashboardLayout title="Paiement effectué">
        <div className="max-w-2xl mx-auto py-12">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Paiement effectué avec succès !
            </h2>

            <p className="text-gray-600 mb-8">
              Votre paiement a été initié avec succès. Vous recevrez une confirmation sur votre téléphone.
            </p>

            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-8">
              <Smartphone className="h-4 w-4" />
              <span>Accepte: Orange Money, MTN MoMo, Wave, Moov Money</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => {
                  setSuccess(false);
                  loadUserContracts();
                }}
                className="px-8 py-3 bg-[#F16522] hover:bg-[#d9571d] text-white rounded-xl font-medium transition-colors"
              >
                Effectuer un autre paiement
              </button>
              <button
                onClick={() => navigate('/locataire/paiements')}
                className="px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
              >
                Voir l'historique
              </button>
            </div>

            <div className="mt-8 text-sm text-gray-400">
              Vous pouvez suivre l'état de votre paiement dans l'historique des paiements.
            </div>
          </div>
        </div>
      </TenantDashboardLayout>
    );
  }

  return (
    <TenantDashboardLayout title="Effectuer un paiement">
      <div className="w-full space-y-6">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {contracts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Aucun contrat actif</h3>
            <p className="text-gray-500">
              Vous n'avez pas de contrat de location actif pour effectuer un paiement
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {contracts.map((contract) => (
              <div
                key={contract.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Property Header */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                      {contract.property_main_image ? (
                        <img
                          src={contract.property_main_image}
                          alt={contract.property_title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Building className="h-8 w-8 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {contract.property_title}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {formatAddress(contract.property_address, contract.property_city)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment Options */}
                <div className="p-6 space-y-6">
                  {/* Loyer Mensuel - Default Option */}
                  <div className="bg-gray-50 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Building className="h-5 w-5 text-blue-600" />
                      <h4 className="font-semibold text-gray-900">Loyer mensuel</h4>
                      <span className="ml-auto text-2xl font-bold text-[#F16522]">
                        {formatCurrency(contract.monthly_rent)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Mobile Money Button */}
                      <button
                        onClick={() =>
                          handlePayment(contract.id, 'loyer', contract.monthly_rent)
                        }
                        className="w-full p-3 bg-gradient-to-r from-[#F16522] to-[#d9571d] hover:from-[#d9571d] hover:to-[#F16522] text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                      >
                        <Smartphone className="h-4 w-4" />
                        <span>Payer mon loyer</span>
                      </button>
                    </div>
                  </div>

                  {/* Autres paiements */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-[#F16522]/50 hover:bg-gray-50 transition-all">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <Shield className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Dépôt de garantie</p>
                        <p className="text-sm text-gray-500">
                          {contract.deposit_amount ? formatCurrency(contract.deposit_amount) : 'Non défini'}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          handlePayment(contract.id, 'depot_garantie', contract.deposit_amount || 0)
                        }
                        disabled={!contract.deposit_amount}
                        className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        Payer
                      </button>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-[#F16522]/50 hover:bg-gray-50 transition-all">
                      <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <Zap className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Charges</p>
                        <p className="text-sm text-gray-500">Montant variable</p>
                      </div>
                      <button
                        disabled
                        className="px-4 py-2 bg-gray-100 text-gray-400 rounded-lg font-medium text-sm cursor-not-allowed"
                      >
                        Prochainement
                      </button>
                    </div>
                  </div>

                  {/* Next Payment Info */}
                  {contract.days_until_due !== undefined && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 pt-2">
                      <Clock className="h-4 w-4" />
                      <span>
                        Échéance dans {contract.days_until_due} jour{contract.days_until_due > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PaymentModal pour InTouch */}
      {pendingPayment && (
        <PaymentModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          amount={pendingPayment.amount}
          description={
            pendingPayment.paymentType === 'loyer'
              ? 'Paiement de loyer mensuel'
              : pendingPayment.paymentType === 'depot_garantie'
              ? 'Paiement du dépôt de garantie'
              : 'Paiement de charges'
          }
          leaseId={pendingPayment.leaseId ?? undefined}
          onSuccess={handlePaymentSuccess}
          ownerName={contracts.find(c => c.id === pendingPayment.contractId)?.owner_name}
          ownerPhone={null} // owner_phone not available in properties table
        />
      )}
    </TenantDashboardLayout>
  );
}
