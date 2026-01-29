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
  X,
  Share2,
  MessageCircle,
  Phone,
  Mail,
  User,
  FileCheck,
  Hash,
  Globe,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import { formatAddress } from '@/shared/utils/address';

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
  price?: number | null;
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
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [expandedPayments, setExpandedPayments] = useState<Set<string>>(new Set());
  const [cancelingPayment, setCancelingPayment] = useState<string | null>(null);
  const [sharingPayment, setSharingPayment] = useState<string | null>(null);

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
            owner_id,
            price
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
        property_title: payment.properties?.title || 'Paiement',
        property_city: payment.properties?.city,
        property_address: payment.properties?.address,
        owner_id: payment.properties?.owner_id,
        lease_id: payment.lease_id,
        price: payment.properties?.price,
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

  // View payment details - open modal
  const handleViewDetails = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowDetailsModal(true);
  };

  // Toggle expand payment card
  const handleToggleExpand = (paymentId: string) => {
    const newExpanded = new Set(expandedPayments);
    if (newExpanded.has(paymentId)) {
      newExpanded.delete(paymentId);
    } else {
      newExpanded.add(paymentId);
    }
    setExpandedPayments(newExpanded);
  };

  // Cancel pending payment
  const handleCancelPayment = async (payment: Payment) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler ce paiement ?')) return;

    setCancelingPayment(payment.id);
    try {
      const { error } = await supabase
        .from('payments')
        .update({ status: 'annule' })
        .eq('id', payment.id);

      if (error) throw error;

      toast.success('Paiement annulé avec succès');
      loadPayments();
    } catch (error) {
      console.error('Error canceling payment:', error);
      toast.error('Erreur lors de l\'annulation du paiement');
    } finally {
      setCancelingPayment(null);
    }
  };

  // Share payment receipt
  const handleSharePayment = async (payment: Payment, method: 'email' | 'whatsapp' | 'copy') => {
    setSharingPayment(payment.id);
    try {
      const receiptText = `🧾 *Reçu de paiement - MonToit*\n\n` +
        `📅 Date: ${payment.created_at ? new Date(payment.created_at).toLocaleDateString('fr-FR') : 'N/A'}\n` +
        `🏠 Bien: ${payment.property_title || 'N/A'}\n` +
        `💰 Montant: ${payment.amount.toLocaleString()} FCFA\n` +
        `📋 Type: ${PAYMENT_TYPE_CONFIG[payment.payment_type as keyof typeof PAYMENT_TYPE_CONFIG]?.label || payment.payment_type}\n` +
        `💳 Méthode: ${PAYMENT_METHOD_CONFIG[payment.payment_method as keyof typeof PAYMENT_METHOD_CONFIG]?.label || payment.payment_method || 'N/A'}\n` +
        `📊 Statut: ${STATUS_CONFIG[payment.status as keyof typeof STATUS_CONFIG]?.label || payment.status}\n` +
        `${payment.transaction_id ? `🔖 Réf: ${payment.transaction_id}\n` : ''}`;

      if (method === 'email') {
        const subject = `Reçu de paiement - ${payment.property_title || 'MonToit'}`;
        const body = encodeURIComponent(receiptText);
        window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${body}`, '_blank');
        toast.success('Email ouvert');
      } else if (method === 'whatsapp') {
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(receiptText)}`;
        window.open(whatsappUrl, '_blank');
        toast.success('WhatsApp ouvert');
      } else if (method === 'copy') {
        await navigator.clipboard.writeText(receiptText);
        toast.success('Reçu copié dans le presse-papier');
      }
    } catch (error) {
      console.error('Error sharing payment:', error);
      toast.error('Erreur lors du partage');
    } finally {
      setSharingPayment(null);
    }
  };

  // Contact support for failed payment
  const handleContactSupport = (payment: Payment) => {
    const subject = `Problème de paiement #${payment.transaction_id || payment.id}`;
    const body = `Bonjour,\n\nJe rencontre un problème avec le paiement suivant:\n\n` +
      `ID: ${payment.id}\n` +
      `Montant: ${payment.amount.toLocaleString()} FCFA\n` +
      `Date: ${payment.created_at ? new Date(payment.created_at).toLocaleDateString('fr-FR') : 'N/A'}\n` +
      `Statut: ${payment.status}\n\n` +
      `Pouvez-vous m'aider à résoudre ce problème ?\n\nMerci.`;

    window.location.href = `mailto:support@montoit.ci?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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
              const isExpanded = expandedPayments.has(payment.id);

              return (
                <div
                  key={payment.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 hover:border-orange-300 hover:shadow-md transition-all overflow-hidden"
                >
                  {/* Main Card */}
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

                        {/* Primary Actions */}
                        <div className="flex items-center gap-2 mt-3 justify-end">
                          {/* Expand/Collapse */}
                          <button
                            onClick={() => handleToggleExpand(payment.id)}
                            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            title={isExpanded ? "Masquer les détails" : "Voir les détails"}
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>

                          {/* View Details Modal */}
                          <button
                            onClick={() => handleViewDetails(payment)}
                            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Voir les détails complets"
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

                    {/* Expanded Section */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        {/* Detailed Information Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          {/* Transaction Details */}
                          <div className="bg-gray-50 rounded-lg p-3">
                            <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                              <Hash className="h-3 w-3" />
                              Transaction
                            </h4>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-500">ID:</span>
                                <span className="text-gray-900 font-mono text-xs">{payment.id.slice(0, 12)}...</span>
                              </div>
                              {payment.transaction_id && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Réf:</span>
                                  <span className="text-gray-900 font-mono text-xs">{payment.transaction_id}</span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span className="text-gray-500">Date:</span>
                                <span className="text-gray-900">
                                  {payment.created_at
                                    ? new Date(payment.created_at).toLocaleDateString('fr-FR', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                    : 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Payment Method Details */}
                          <div className="bg-gray-50 rounded-lg p-3">
                            <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                              <CreditCard className="h-3 w-3" />
                              Moyen de paiement
                            </h4>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-500">Méthode:</span>
                                <span className="text-gray-900">{methodConfig?.label || payment.payment_method || 'N/A'}</span>
                              </div>
                              {payment.provider && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Fournisseur:</span>
                                  <span className="text-gray-900 capitalize">{payment.provider.replace('_', ' ')}</span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span className="text-gray-500">Type:</span>
                                <span className="text-gray-900">{typeConfig.label}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Property Details */}
                        {payment.property_title && (
                          <div className="bg-blue-50 rounded-lg p-3 mb-4">
                            <h4 className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              Bien concerné
                            </h4>
                            <p className="text-sm font-medium text-blue-900">{payment.property_title}</p>
                            {payment.property_city && (
                              <p className="text-xs text-blue-700 mt-1">
                                {payment.property_address
                                  ? formatAddress(payment.property_address, payment.property_city)
                                  : payment.property_city}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Additional Actions */}
                        <div className="flex flex-wrap gap-2">
                          {/* Share Receipt */}
                          <div className="relative group">
                            <button
                              disabled={sharingPayment === payment.id}
                              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <Share2 className="h-4 w-4" />
                              Partager
                            </button>
                            {/* Share Dropdown */}
                            <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible z-10 min-w-[150px]">
                              <button
                                onClick={() => handleSharePayment(payment, 'whatsapp')}
                                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 first:rounded-t-lg"
                              >
                                <MessageCircle className="h-4 w-4 text-green-600" />
                                WhatsApp
                              </button>
                              <button
                                onClick={() => handleSharePayment(payment, 'email')}
                                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Mail className="h-4 w-4 text-blue-600" />
                                Email
                              </button>
                              <button
                                onClick={() => handleSharePayment(payment, 'copy')}
                                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 last:rounded-b-lg"
                              >
                                <FileText className="h-4 w-4 text-gray-600" />
                                Copier
                              </button>
                            </div>
                          </div>

                          {/* View Property */}
                          {payment.property_id && (
                            <Link
                              to={`/propriete/${payment.property_id}`}
                              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                              <Building className="h-4 w-4" />
                              Voir le bien
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}

                          {/* Cancel Payment (for pending) */}
                          {(payment.status === 'en_attente' || payment.status === 'pending') && (
                            <button
                              onClick={() => handleCancelPayment(payment)}
                              disabled={cancelingPayment === payment.id}
                              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <XCircle className="h-4 w-4" />
                              Annuler
                            </button>
                          )}

                          {/* Contact Support (for failed) */}
                          {payment.status === 'echoue' && (
                            <button
                              onClick={() => handleContactSupport(payment)}
                              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
                            >
                              <Phone className="h-4 w-4" />
                              Contacter le support
                            </button>
                          )}
                        </div>
                      </div>
                    )}

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

      {/* Payment Details Modal */}
      {showDetailsModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#F16522] rounded-xl flex items-center justify-center">
                    <Receipt className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Détails du paiement</h2>
                    <p className="text-sm text-gray-500">Référence: {selectedPayment.transaction_id || selectedPayment.id.slice(0, 12)}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedPayment(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Status Banner */}
              <div
                className={`p-4 rounded-xl border ${
                  selectedPayment.status === 'complete'
                    ? 'bg-green-50 border-green-200'
                    : selectedPayment.status === 'echoue'
                    ? 'bg-red-50 border-red-200'
                    : selectedPayment.status === 'annule'
                    ? 'bg-gray-50 border-gray-200'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  {(() => {
                    const StatusIcon = STATUS_CONFIG[selectedPayment.status as keyof typeof STATUS_CONFIG]?.icon || Clock;
                    return <StatusIcon className={`h-6 w-6 ${
                      selectedPayment.status === 'complete'
                        ? 'text-green-600'
                        : selectedPayment.status === 'echoue'
                        ? 'text-red-600'
                        : selectedPayment.status === 'annule'
                        ? 'text-gray-600'
                        : 'text-blue-600'
                    }`} />;
                  })()}
                  <div>
                    <p className="font-semibold text-gray-900">
                      {STATUS_CONFIG[selectedPayment.status as keyof typeof STATUS_CONFIG]?.label || selectedPayment.status}
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedPayment.status === 'complete'
                        ? 'Paiement effectué avec succès'
                        : selectedPayment.status === 'echoue'
                        ? 'Le paiement a échoué'
                        : selectedPayment.status === 'annule'
                        ? 'Paiement annulé'
                        : 'Paiement en cours de traitement'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Amount */}
              <div className="text-center py-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
                <p className="text-sm text-gray-600 mb-1">Montant du paiement</p>
                <p className="text-4xl font-bold text-gray-900">
                  {selectedPayment.amount.toLocaleString()} FCFA
                </p>
              </div>

              {/* Payment Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Type de paiement */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileCheck className="h-4 w-4 text-gray-500" />
                    <p className="text-xs font-medium text-gray-500">Type de paiement</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {PAYMENT_TYPE_CONFIG[selectedPayment.payment_type as keyof typeof PAYMENT_TYPE_CONFIG]?.label || selectedPayment.payment_type}
                  </p>
                </div>

                {/* Méthode de paiement */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-4 w-4 text-gray-500" />
                    <p className="text-xs font-medium text-gray-500">Méthode</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {PAYMENT_METHOD_CONFIG[selectedPayment.payment_method as keyof typeof PAYMENT_METHOD_CONFIG]?.label || selectedPayment.payment_method || 'N/A'}
                  </p>
                  {selectedPayment.provider && (
                    <p className="text-xs text-gray-600 capitalize mt-1">
                      {selectedPayment.provider.replace('_', ' ')}
                    </p>
                  )}
                </div>

                {/* Date */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <p className="text-xs font-medium text-gray-500">Date du paiement</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedPayment.created_at
                      ? new Date(selectedPayment.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : 'N/A'}
                  </p>
                  {selectedPayment.created_at && (
                    <p className="text-xs text-gray-600 mt-1">
                      {new Date(selectedPayment.created_at).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>

                {/* ID Transaction */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="h-4 w-4 text-gray-500" />
                    <p className="text-xs font-medium text-gray-500">ID Transaction</p>
                  </div>
                  <p className="text-sm font-mono font-semibold text-gray-900 break-all">
                    {selectedPayment.transaction_id || selectedPayment.id}
                  </p>
                </div>
              </div>

              {/* Property Info */}
              {selectedPayment.property_title && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Building className="h-4 w-4 text-blue-600" />
                    <p className="text-xs font-medium text-blue-700">Bien concerné</p>
                  </div>
                  <p className="text-sm font-semibold text-blue-900 mb-1">
                    {selectedPayment.property_title}
                  </p>
                  {selectedPayment.property_city && (
                    <p className="text-xs text-blue-700">
                      {selectedPayment.property_address
                        ? formatAddress(selectedPayment.property_address, selectedPayment.property_city)
                        : selectedPayment.property_city}
                    </p>
                  )}
                  {selectedPayment.property_id && (
                    <Link
                      to={`/propriete/${selectedPayment.property_id}`}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium mt-2"
                    >
                      Voir le bien
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              )}

              {/* Timeline / Status History */}
              <div className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <p className="text-xs font-medium text-gray-500">Historique du statut</p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Clock className="h-3 w-3 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Paiement initié</p>
                      <p className="text-xs text-gray-600">
                        {selectedPayment.created_at
                          ? new Date(selectedPayment.created_at).toLocaleString('fr-FR')
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                  {selectedPayment.status === 'complete' && (
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Paiement confirmé</p>
                        <p className="text-xs text-gray-600">Le paiement a été traité avec succès</p>
                      </div>
                    </div>
                  )}
                  {selectedPayment.status === 'echoue' && (
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <XCircle className="h-3 w-3 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Paiement échoué</p>
                        <p className="text-xs text-gray-600">Le paiement n'a pas pu être finalisé</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 rounded-b-2xl">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Close */}
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedPayment(null);
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  Fermer
                </button>

                {/* Download Receipt */}
                {selectedPayment.status === 'complete' && (
                  <button
                    onClick={() => handleDownloadReceipt(selectedPayment)}
                    className="flex-1 px-4 py-3 bg-[#F16522] hover:bg-[#d9571d] text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="h-5 w-5" />
                    Télécharger le reçu
                  </button>
                )}

                {/* Retry for pending/failed */}
                {(selectedPayment.status === 'en_attente' || selectedPayment.status === 'echoue' || selectedPayment.status === 'pending') && (
                  <button
                    onClick={() => {
                      handleRetryPayment(selectedPayment);
                      setShowDetailsModal(false);
                    }}
                    disabled={retrying === selectedPayment.id}
                    className="flex-1 px-4 py-3 bg-[#F16522] hover:bg-[#d9571d] text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {retrying === selectedPayment.id ? (
                      <>
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        Traitement...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-5 w-5" />
                        Relancer le paiement
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
