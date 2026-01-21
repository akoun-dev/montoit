import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Coins, Download, Eye, Filter, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import TenantDashboardLayout from '../../features/tenant/components/TenantDashboardLayout';

interface Payment {
  id: string;
  amount: number;
  payment_type: string;
  payment_method: string | null;
  status: string | null;
  created_at: string | null;
  property_title?: string;
  property_city?: string;
  receiver_name?: string;
  payer_name?: string;
}

export default function PaymentHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'sent' | 'received'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'en_attente' | 'complete' | 'echoue'>(
    'all'
  );

  interface PaymentRow {
    id: string;
    amount: number;
    payment_type: string;
    payment_method: string | null;
    status: string | null;
    created_at: string | null;
    properties?: {
      title?: string;
      city?: string;
    } | null;
  }

  const loadPayments = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('payments')
        .select('*, properties:property_id(title, city)')
        .eq('tenant_id', user.id)
        .order('created_at', { ascending: false });

      // Filter is kept for UI compatibility but tenant sees only own payments
      void filter;

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedPayments: Payment[] = (data || []).map((payment: PaymentRow) => ({
        id: payment.id,
        amount: payment.amount,
        payment_type: payment.payment_type,
        payment_method: payment.payment_method,
        status: payment.status,
        created_at: payment.created_at,
        property_title: payment.properties?.title,
        property_city: payment.properties?.city,
      }));

      setPayments(formattedPayments);
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'echoue':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'en_attente':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string | null) => {
    const styles: Record<string, string> = {
      en_attente: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      complete: 'bg-green-100 text-green-800 border-green-300',
      echoue: 'bg-red-100 text-red-800 border-red-300',
      annule: 'bg-gray-100 text-gray-800 border-gray-300',
    };

    const labels: Record<string, string> = {
      en_attente: 'En attente',
      complete: 'Complété',
      echoue: 'Échoué',
      annule: 'Annulé',
    };

    const statusKey = status || 'en_attente';

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[statusKey] || styles['en_attente']}`}
      >
        {labels[statusKey] || statusKey}
      </span>
    );
  };

  const getPaymentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      loyer: 'Loyer',
      depot_garantie: 'Dépôt de garantie',
      charges: 'Charges',
      frais_agence: "Frais d'agence",
    };
    return labels[type] || type;
  };

  const getPaymentMethodLabel = (method: string | null) => {
    if (!method) return 'Non spécifié';
    const labels: Record<string, string> = {
      mobile_money: 'Mobile Money',
      carte_bancaire: 'Carte bancaire',
      virement: 'Virement',
      especes: 'Espèces',
    };
    return labels[method] || method;
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Date inconnue';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateTotal = () => {
    return payments
      .filter((p) => p.status === 'complete')
      .reduce((sum, payment) => sum + payment.amount, 0);
  };

  useEffect(() => {
    if (user) {
      loadPayments();
    }
  }, [user, filter, statusFilter, loadPayments]);

  if (!user) {
    return (
      <TenantDashboardLayout title="Mes Paiements">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Coins className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-neutral-900 mb-2">Connexion requise</h2>
            <p className="text-neutral-600">
              Veuillez vous connecter pour voir votre historique de paiements
            </p>
          </div>
        </div>
      </TenantDashboardLayout>
    );
  }

  return (
    <TenantDashboardLayout title="Mes Paiements">
      <div className="w-full">
        {/* Header Banner */}
        <div className="bg-[#2C1810] rounded-[20px] p-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#F16522] flex items-center justify-center flex-shrink-0">
              <Coins className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Historique des paiements</h1>
              <p className="text-[#E8D4C5] mt-1">Gérez et consultez tous vos paiements</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 font-medium">Total payé</span>
              <Coins className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gradient">
              {calculateTotal().toLocaleString()} FCFA
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 font-medium">Paiements</span>
              <CheckCircle className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gradient">
              {payments.filter((p) => p.status === 'complete').length}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 font-medium">En attente</span>
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <p className="text-3xl font-bold text-gradient">
              {payments.filter((p) => p.status === 'en_attente').length}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-600" />
              <span className="font-bold text-gray-900">Filtres:</span>
            </div>

            <div className="flex flex-wrap gap-3">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'sent' | 'received')}
                className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-terracotta-200 focus:border-terracotta-500 font-medium"
              >
                <option value="all">Tous les paiements</option>
                <option value="sent">Envoyés</option>
                <option value="received">Reçus</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as 'all' | 'en_attente' | 'complete' | 'echoue')
                }
                className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-terracotta-200 focus:border-terracotta-500 font-medium"
              >
                <option value="all">Tous les statuts</option>
                <option value="en_attente">En attente</option>
                <option value="complete">Complété</option>
                <option value="echoue">Échoué</option>
              </select>
            </div>

            <Link
              to="/locataire/effectuer-paiement"
              className="btn-primary px-6 py-2 flex items-center space-x-2"
            >
              <Coins className="w-5 h-5" />
              <span>Nouveau paiement</span>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-terracotta-500 mx-auto"></div>
          </div>
        ) : payments.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <Coins className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun paiement</h3>
            <p className="text-gray-600 mb-6">Vous n'avez pas encore effectué de paiement</p>
            <Link to="/locataire/effectuer-paiement" className="btn-primary">
              Effectuer un paiement
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div className="flex-1 mb-4 md:mb-0">
                    <div className="flex items-center space-x-3 mb-3">
                      {getStatusIcon(payment.status)}
                      <h3 className="text-lg font-bold text-gray-900">
                        {payment.property_title || 'Paiement'}
                      </h3>
                      {getStatusBadge(payment.status)}
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2 text-gray-600">
                        <span className="font-medium">Type:</span>
                        <span>{getPaymentTypeLabel(payment.payment_type)}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-600">
                        <span className="font-medium">Méthode:</span>
                        <span>{getPaymentMethodLabel(payment.payment_method)}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(payment.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:flex-col md:items-end md:justify-start space-y-3">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gradient">
                        {payment.amount.toLocaleString()} FCFA
                      </p>
                      <p className="text-xs text-gray-500">
                        {filter === 'sent' || !filter
                          ? 'À ' + payment.receiver_name
                          : 'De ' + payment.payer_name}
                      </p>
                    </div>

                    <div className="flex space-x-2">
                      {/* TODO: Create payment detail page and enable this button */}
                      {/* <button
                        onClick={() => navigate(`/locataire/paiement/${payment.id}`)}
                        className="p-2 text-terracotta-600 hover:bg-terracotta-50 rounded-lg transition"
                        title="Voir les détails"
                      >
                        <Eye className="w-5 h-5" />
                      </button> */}
                      <button
                        className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition"
                        title="Télécharger le reçu"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </TenantDashboardLayout>
  );
}
