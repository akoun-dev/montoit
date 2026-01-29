import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/services/supabase/client';
import {
  CreditCard,
  Smartphone,
  Building,
  Coins,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  ChevronRight,
  Clock,
  Shield,
  FileText,
  Zap,
  Info,
  ExternalLink,
} from 'lucide-react';
import { AddressValue, formatAddress } from '@/shared/utils/address';
import TenantDashboardLayout from '@/features/tenant/components/TenantDashboardLayout';
import { intouchPaymentService } from '@/services/payments/intouchPaymentService';

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
  next_payment_due?: string;
  days_until_due?: number;
}

interface PaymentLinkInfo {
  link: string;
  amount: number;
  paymentType: string;
  contractId: string;
}

export default function MakePaymentPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [paymentLink, setPaymentLink] = useState<PaymentLinkInfo | null>(null);

  const loadUserContracts = async () => {
    if (!user) return;

    try {
      const { data: contractsData, error: contractsError } = await supabase
        .from('lease_contracts')
        .select('id, lease_id, property_id, deposit_amount, owner_id, start_date')
        .eq('tenant_id', user.id)
        .eq('status', 'actif')
        .order('created_at', { ascending: false });

      console.log('MakePaymentPage - Contracts data:', {
        contractsData,
        contractsError,
        userId: user.id,
      });

      if (contractsError) throw contractsError;

      const formattedContracts: Contract[] = [];

      for (const contract of (contractsData || [])) {
        const { data: propertyData, error: propertyError } = await supabase
          .from('properties')
          .select('title, address, city, main_image, price')
          .eq('id', contract.property_id)
          .single();

        console.log('MakePaymentPage - Property data for contract:', contract.property_id, {
          propertyData,
          propertyError,
        });

        if (propertyData) {
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
            monthly_rent: propertyData.price || 0,
            deposit_amount: contract.deposit_amount,
            owner_id: contract.owner_id,
            property_title: propertyData.title,
            property_address: propertyData.address,
            property_city: propertyData.city,
            property_main_image: propertyData.main_image,
            owner_name: 'Propriétaire',
            next_payment_due: nextDue.toISOString(),
            days_until_due: daysUntilDue,
          });
        }
      }

      setContracts(formattedContracts);
    } catch (err: unknown) {
      console.error('Error loading contracts:', err);
      setError('Erreur lors du chargement des contrats');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (
    contractId: string,
    paymentType: 'loyer' | 'depot_garantie' | 'charges',
    amount: number
  ) => {
    if (!user) return;

    const contract = contracts.find((c) => c.id === contractId);
    if (!contract) return;

    // Vérifier si le service InTouch est configuré
    if (!intouchPaymentService.isConfigured()) {
      setError('Service de paiement non disponible. Veuillez contacter l\'administrateur.');
      return;
    }

    // Vérifier si l'utilisateur a un numéro de téléphone
    // Le numéro peut être dans: profile.phone (base de données), user.user_metadata.phone (auth), ou user.phone
    const phoneNumber = profile?.phone || user.user_metadata?.phone || user.phone || '';

    // Logging pour débogage
    console.log('MakePaymentPage - Phone number check:', {
      userId: user.id,
      'profile.phone': profile?.phone,
      'user.user_metadata.phone': user.user_metadata?.phone,
      'user.phone': user.phone,
      phoneNumber,
      'user.email': user.email,
    });

    if (!phoneNumber || phoneNumber.trim() === '') {
      setError('Numéro de téléphone manquant. Veuillez compléter votre profil avant d\'effectuer un paiement.');
      return;
    }

    setSubmitting({ ...submitting, [`${contractId}-${paymentType}`]: true });
    setError('');

    try {
      // 1. Créer d'abord le paiement dans la base de données
      const partnerTransactionId = `RENT_${Date.now()}_${user.id.substring(0, 8)}`;
      const paymentDescription = `Loyer - ${contract.property_title}`;

      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          tenant_id: user.id,
          property_id: contract.property_id,
          lease_id: contract.lease_id,
          amount,
          payment_type: paymentType,
          payment_method: 'mobile_money',
          status: 'en_attente',
          transaction_id: partnerTransactionId,
          provider: 'intouch',
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // 2. Envoyer le Payment Link InTouch
      const result = await intouchPaymentService.sendPaymentLink({
        email: user.email || '',
        destinataire: phoneNumber,
        motif: paymentDescription,
        montant: amount,
        langue: 'fr',
      });

      if (!result.success || !result.data) {
        // En cas d'erreur avec InTouch, supprimer le paiement créé
        await supabase.from('payments').delete().eq('id', payment.id);
        throw new Error(result.error || 'Erreur lors de l\'envoi du lien de paiement');
      }

      // 3. Mettre à jour le paiement avec le lien reçu
      await supabase
        .from('payments')
        .update({
          payment_url: result.data.link,
          status: 'en_attente',
        })
        .eq('id', payment.id);

      // 4. Afficher le succès avec le lien de paiement
      setPaymentLink({
        link: result.data.link,
        amount,
        paymentType,
        contractId,
      });
    } catch (err: unknown) {
      console.error('Error processing payment:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du paiement');
    } finally {
      setSubmitting((prev) => ({ ...prev, [`${contractId}-${paymentType}`]: false }));
    }
  };

  useEffect(() => {
    if (user) {
      loadUserContracts();
    }
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

  if (success || paymentLink) {
    return (
      <TenantDashboardLayout title="Paiement initié">
        <div className="max-w-2xl mx-auto py-12">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Smartphone className="w-10 h-10 text-green-600" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Lien de paiement envoyé !
            </h2>

            <p className="text-gray-600 mb-6">
              Un lien de paiement a été envoyé à votre numéro de téléphone. Vous pouvez
              également cliquer sur le bouton ci-dessous pour accéder directement à la page de paiement.
            </p>

            {paymentLink && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Info className="h-5 w-5 text-blue-600" />
                  <p className="font-semibold text-blue-900">Montant à payer</p>
                </div>
                <p className="text-3xl font-bold text-blue-600">
                  {formatCurrency(paymentLink.amount)}
                </p>
                <p className="text-sm text-blue-700">
                  {paymentLink.paymentType === 'loyer' ? 'Loyer mensuel' : 'Dépôt de garantie'}
                </p>
              </div>
            )}

            <a
              href={paymentLink?.link || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#F16522] hover:bg-[#d9571d] text-white px-8 py-4 rounded-xl font-medium transition-colors mb-4"
            >
              <ExternalLink className="h-5 w-5" />
              Accéder au paiement
            </a>

            <p className="text-sm text-gray-500 mb-6">
              Vous serez redirigé vers la plateforme de paiement sécurisée InTouch
            </p>

            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <Smartphone className="h-4 w-4" />
              <span>Accepte: Orange Money, MTN Money, Wave, Moov Money</span>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setPaymentLink(null);
                  setSuccess(false);
                }}
                className="text-[#F16522] hover:text-[#d9571d] font-medium"
              >
                Effectuer un autre paiement
              </button>
            </div>

            <div className="mt-4 text-sm text-gray-400">
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
                      <div className="space-y-2">
                        <button
                          onClick={() =>
                            handlePayment(contract.id, 'loyer', contract.monthly_rent)
                          }
                          disabled={submitting[`${contract.id}-loyer`]}
                          className="w-full p-3 bg-gradient-to-r from-[#F16522] to-[#d9571d] hover:from-[#d9571d] hover:to-[#F16522] text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allow shadow-md hover:shadow-lg"
                        >
                          {submitting[`${contract.id}-loyer`] ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            <>
                              <Smartphone className="h-4 w-4" />
                              <span>Payer mon loyer</span>
                            </>
                          )}
                        </button>

                          {/* Dropdown Menu - REMOVED for InTouch */}
                          {/* InTouch Payment Link sends SMS with all provider options */}
                      </div>

                      {/* InTouch gère tous les moyens de paiement via le lien SMS */}
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
                        disabled={submitting[`${contract.id}-depot_garantie`] || !contract.deposit_amount}
                        className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allow text-sm"
                      >
                        {submitting[`${contract.id}-depot_garantie`] ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-700 inline-block"></div>
                        ) : (
                          'Payer'
                        )}
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
    </TenantDashboardLayout>
  );
}
