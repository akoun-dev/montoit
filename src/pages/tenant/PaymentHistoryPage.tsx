import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Coins,
  Download,
  Eye,
  Filter,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Receipt,
  Building,
  CreditCard,
  Smartphone,
  FileText,
  AlertTriangle,
  ChevronRight,
  Info,
  Shield,
} from 'lucide-react';

interface Payment {
  id: string;
  amount: number;
  payment_type: string;
  payment_method: string | null;
  status: string | null;
  created_at: string | null;
  property_id?: string | null;
  property_title?: string;
  property_city?: string;
  property_address?: any;
  owner_id?: string | null;
  lease_id?: string | null;
  monthly_rent?: number | null;
  transaction_id?: string | null;
  payment_url?: string | null;
  provider?: 'orange_money' | 'mtn_money' | 'wave' | 'moov_money' | null;
}

// Status configuration
const STATUS_CONFIG = {
  en_attente: {
    label: 'En attente',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: Clock,
  },
  complete: {
    label: 'Payé',
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: CheckCircle,
  },
  echoue: {
    label: 'Échoué',
    color: 'bg-red-100 text-red-700 border-red-200',
    icon: XCircle,
  },
  annule: {
    label: 'Annulé',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: XCircle,
  },
  pending: {
    label: 'En cours',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: Clock,
  },
};

// Payment type configuration
const PAYMENT_TYPE_CONFIG = {
  loyer: {
    label: 'Loyer mensuel',
    icon: Building,
    color: 'text-blue-600 bg-blue-50',
  },
  depot_garantie: {
    label: 'Dépôt de garantie',
    icon: Shield,
    color: 'text-purple-600 bg-purple-50',
  },
  charges: {
    label: 'Charges',
    icon: FileText,
    color: 'text-orange-600 bg-orange-50',
  },
  frais_agence: {
    label: "Frais d'agence",
    icon: CreditCard,
    color: 'text-pink-600 bg-pink-50',
  },
  caution: {
    label: 'Caution',
    icon: Shield,
    color: 'text-indigo-600 bg-indigo-50',
  },
  avance: {
    label: 'Avance',
    icon: Coins,
    color: 'text-cyan-600 bg-cyan-50',
  },
};

// Payment method configuration
const PAYMENT_METHOD_CONFIG = {
  mobile_money: {
    label: 'Mobile Money',
    icon: Smartphone,
  },
  carte_bancaire: {
    label: 'Carte bancaire',
    icon: CreditCard,
  },
  virement: {
    label: 'Virement bancaire',
    icon: Building,
  },
  especes: {
    label: 'Espèces',
    icon: Coins,
  },
  cheque: {
    label: 'Chèque',
    icon: FileText,
  },
};

export default function PaymentHistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'en_attente' | 'complete' | 'echoue' | 'pending'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Load payments with additional details
  const loadPayments = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          properties:property_id (
            title,
            city,
            address,
            owner_id
          ),
          lease_contracts:lease_id (
            id,
            property_id,
            monthly_rent,
            owner_id
          )
        `)
        .eq('tenant_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedPayments: Payment[] = (data || []).map((payment: any) => ({
        id: payment.id,
        amount: payment.amount || 0,
        payment_type: payment.payment_type || 'loyer',
        payment_method: payment.payment_method,
        status: payment.status,
        created_at: payment.created_at,
        property_id: payment.property_id,
        property_title: payment.properties?.title || payment.lease_contracts?.property_id || 'Paiement',
        property_city: payment.properties?.city,
        property_address: payment.properties?.address,
        owner_id: payment.properties?.owner_id || payment.lease_contracts?.owner_id,
        lease_id: payment.lease_id,
        monthly_rent: payment.lease_contracts?.monthly_rent,
        transaction_id: payment.transaction_id,
        payment_url: payment.payment_url,
        provider: payment.provider,
      }));

      setPayments(formattedPayments);
    } catch (error) {
      console.error('Error loading payments:', error);
      toast.error('Erreur lors du chargement des paiements');
    } finally {
      setLoading(false);
    }
  };

  // Retry payment
  const handleRetryPayment = async (payment: Payment) => {
    setRetrying(payment.id);

    try {
      // Check if payment has a payment URL (for mobile money or card)
      if (payment.payment_url) {
        // Redirect to payment URL
        window.location.href = payment.payment_url;
        return;
      }

      // For mobile money, initiate a new payment
      if (payment.payment_method === 'mobile_money' && payment.provider && payment.lease_id) {
        const { data: existingPayment } = await supabase
          .from('payments')
          .select('*')
          .eq('id', payment.id)
          .single();

        if (!existingPayment) {
          throw new Error('Paiement non trouvé');
        }

        // Create a new pending payment with same details
        const { data: newPayment, error: paymentError } = await supabase
          .from('payments')
          .insert({
            tenant_id: user.id,
            owner_id: payment.owner_id,
            lease_id: payment.lease_id,
            property_id: payment.property_id,
            amount: payment.amount,
            payment_type: payment.payment_type,
            payment_method: 'mobile_money',
            provider: payment.provider,
            status: 'pending',
            description: `${PAYMENT_TYPE_CONFIG[payment.payment_type as keyof typeof PAYMENT_TYPE_CONFIG]?.label || 'Paiement'} - ${payment.property_title || ''}`,
          })
          .select()
          .single();

        if (paymentError) throw paymentError;

        // TODO: Initiate mobile money payment flow here
        // This would typically call a payment gateway API
        toast.info('Redirection vers la plateforme de paiement...');

        // Simulate payment URL generation (replace with actual payment gateway)
        setTimeout(() => {
          toast.success('Redirection vers le paiement...');
          // In real implementation, redirect to actual payment gateway
          // window.location.href = newPayment.payment_url;
        }, 1000);
      } else {
        toast.error('Ce type de paiement ne peut pas être relancé automatiquement. Contactez le propriétaire.');
      }
    } catch (error) {
      console.error('Error retrying payment:', error);
      toast.error('Erreur lors de la relance du paiement');
    } finally {
      setRetrying(null);
    }
  };

  // Download receipt
  const handleDownloadReceipt = async (payment: Payment) => {
    try {
      toast.info('Génération du reçu en cours...');

      // TODO: Generate PDF receipt
      // For now, show a message
      toast.success('Le reçu sera téléchargé (fonctionnalité bientôt disponible)');

      // In a real implementation, you would:
      // 1. Call an API to generate the receipt PDF
      // 2. Download the file
      // Example:
      // const { data, error } = await supabase.functions.invoke('generate-receipt', {
      //   paymentId: payment.id
      // });
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toast.error('Erreur lors du téléchargement du reçu');
    }
  };

  // View payment details
  const handleViewDetails = (payment: Payment) => {
    // For now, show details in a toast or modal
    // In the future, navigate to a detail page
    toast.info(`Détails du paiement: ${payment.amount.toLocaleString()} FCFA`);
  };

  // Navigate to payment page
  const handleMakePayment = () => {
    navigate('/locataire/effectuer-paiement');
  };

  // Filter payments
  const filteredPayments = payments.filter((payment) => {
    const statusMatch = statusFilter === 'all' || payment.status === statusFilter;
    const typeMatch = typeFilter === 'all' || payment.payment_type === typeFilter;
    return statusMatch && typeMatch;
  });

  // Calculate stats
  const stats = {
    totalPaid: payments.filter((p) => p.status === 'complete').reduce((sum, p) => sum + (p.amount || 0), 0),
    totalPending: payments.filter((p) => p.status === 'en_attente' || p.status === 'pending').reduce((sum, p) => sum + (p.amount || 0), 0),
    paidCount: payments.filter((p) => p.status === 'complete').length,
    pendingCount: payments.filter((p) => p.status === 'en_attente' || p.status === 'pending').length,
    failedCount: payments.filter((p) => p.status === 'echoue').length,
  };

  useEffect(() => {
    if (user) {
      loadPayments();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Coins className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connexion requise</h2>
          <p className="text-gray-600">
            Veuillez vous connecter pour voir vos paiements
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#2C1810] rounded-2xl shadow-sm mb-8">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#F16522] flex items-center justify-center">
                <Coins className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Mes Paiements</h1>
                <p className="text-[#E8D4C5]">Gérez et suivez tous vos paiements</p>
              </div>
            </div>

            <button
              onClick={handleMakePayment}
              className="flex items-center gap-2 bg-[#F16522] hover:bg-[#d9571d] text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              <Coins className="h-5 w-5" />
              <span>Effectuer un paiement</span>
            </button>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Paid */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <span className="text-sm text-gray-500 font-medium">Payé</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.totalPaid.toLocaleString()} <span className="text-sm text-gray-500 font-normal"> FCFA</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">{stats.paidCount} paiement{stats.paidCount > 1 ? 's' : ''}</p>
          </div>

          {/* Pending */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <span className="text-sm text-gray-500 font-medium">En attente</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.totalPending.toLocaleString()} <span className="text-sm text-gray-500 font-normal"> FCFA</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">{stats.pendingCount} paiement{stats.pendingCount > 1 ? 's' : ''}</p>
          </div>

          {/* Failed */}
          {stats.failedCount > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <span className="text-sm text-gray-500 font-medium">Échoué</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.failedCount}</p>
              <p className="text-xs text-gray-500 mt-1">paiement{stats.failedCount > 1 ? 's' : ''}</p>
            </div>
          )}

          {/* Total Count */}
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 shadow-lg text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <Receipt className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold">{payments.length}</p>
            <p className="text-sm text-white/80 mt-1">Total paiements</p>
          </div>
        </div>

        {/* Alert for pending payments */}
        {stats.pendingCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-amber-900">
                  Vous avez {stats.pendingCount} paiement{stats.pendingCount > 1 ? 's' : ''} en attente
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  Certains paiements peuvent nécessiter votre attention. Relancez-les si nécessaire.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-600" />
              <span className="font-bold text-gray-900">Filtres:</span>
            </div>

            <div className="flex flex-wrap gap-3">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              >
                <option value="all">Tous les statuts</option>
                <option value="en_attente">En attente</option>
                <option value="pending">En cours</option>
                <option value="complete">Payés</option>
                <option value="echoue">Échoués</option>
              </select>

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              >
                <option value="all">Tous les types</option>
                <option value="loyer">Loyer</option>
                <option value="depot_garantie">Dépôt de garantie</option>
                <option value="charges">Charges</option>
                <option value="frais_agence">Frais d'agence</option>
                <option value="caution">Caution</option>
                <option value="avance">Avance</option>
              </select>
            </div>
          </div>
        </div>

        {/* Payments List */}
        {filteredPayments.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Coins className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Aucun paiement</h3>
            <p className="text-gray-500 mb-6">
              {statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Aucun paiement ne correspond aux critères de filtration'
                : "Vous n'avez pas encore effectué de paiement"}
            </p>
            <button
              onClick={handleMakePayment}
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              <Coins className="h-5 w-5" />
              Effectuer un paiement
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPayments.map((payment) => {
              const statusConfig = STATUS_CONFIG[payment.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.en_attente;
              const StatusIcon = statusConfig.icon;
              const typeConfig = PAYMENT_TYPE_CONFIG[payment.payment_type as keyof typeof PAYMENT_TYPE_CONFIG] || PAYMENT_TYPE_CONFIG.loyer;
              const TypeIcon = typeConfig.icon;
              const methodConfig = PAYMENT_METHOD_CONFIG[payment.payment_method as keyof typeof PAYMENT_METHOD_CONFIG];

              return (
                <div
                  key={payment.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 hover:border-orange-300 hover:shadow-md transition-all overflow-hidden"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left side - Icon and Info */}
                      <div className="flex items-start gap-4 flex-1">
                        {/* Type Icon */}
                        <div className={`w-14 h-14 rounded-xl ${typeConfig.color} flex items-center justify-center flex-shrink-0`}>
                          <TypeIcon className="h-7 w-7" />
                        </div>

                        {/* Payment Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <h3 className="font-semibold text-lg text-gray-900">
                                {payment.property_title || 'Paiement'}
                              </h3>
                              <p className="text-sm text-gray-500">
                                {typeConfig.label}
                              </p>
                            </div>

                            {/* Status Badge */}
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border flex-shrink-0 ${statusConfig.color}`}>
                              <StatusIcon className="h-3.5 w-3.5" />
                              {statusConfig.label}
                            </div>
                          </div>

                          {/* Additional Info */}
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                            {payment.property_city && (
                              <span className="flex items-center gap-1">
                                <Building className="h-4 w-4" />
                                {payment.property_city}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {payment.created_at
                                ? new Date(payment.created_at).toLocaleDateString('fr-FR', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : 'N/A'}
                            </span>
                            {payment.payment_method && methodConfig && (
                              <span className="flex items-center gap-1">
                                <methodConfig.icon className="h-4 w-4" />
                                {methodConfig.label}
                              </span>
                            )}
                            {payment.provider && (
                              <span className="flex items-center gap-1 capitalize">
                                <Smartphone className="h-4 w-4" />
                                {payment.provider.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right side - Amount and Actions */}
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">
                          {payment.amount.toLocaleString()} FCFA
                        </p>

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-3 justify-end">
                          {/* View Details */}
                          <button
                            onClick={() => handleViewDetails(payment)}
                            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Voir les détails"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Download Receipt (only for completed payments) */}
                          {payment.status === 'complete' && (
                            <button
                              onClick={() => handleDownloadReceipt(payment)}
                              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Télécharger le reçu"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          )}

                          {/* Retry Payment (for pending/failed payments) */}
                          {(payment.status === 'en_attente' || payment.status === 'echoue' || payment.status === 'pending') && (
                            <button
                              onClick={() => handleRetryPayment(payment)}
                              disabled={retrying === payment.id}
                              className="p-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Relancer le paiement"
                            >
                              {retrying === payment.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </div>

                        {/* Transaction ID (if exists) */}
                        {payment.transaction_id && (
                          <p className="text-xs text-gray-400 mt-2">
                            Ref: {payment.transaction_id}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Warning message for failed payments */}
                    {payment.status === 'echoue' && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-red-900">Paiement échoué</p>
                            <p className="text-xs text-red-700 mt-1">
                              Ce paiement n'a pas pu être traité. Vérifiez vos coordonnées bancaires ou réessayez.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Info for pending payments */}
                    {(payment.status === 'en_attente' || payment.status === 'pending') && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-blue-900">Paiement en cours de traitement</p>
                            <p className="text-xs text-blue-700 mt-1">
                              Le paiement est en attente de confirmation. Vous recevrez une notification une fois traité.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
