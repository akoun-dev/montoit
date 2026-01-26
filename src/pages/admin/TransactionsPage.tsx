import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Eye, Filter, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { AdminPageHeader } from '@/shared/ui/admin/AdminPageHeader';
import { AdminTable } from '@/shared/ui/admin/AdminTable';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useUserRoles } from '@/hooks/shared/useUserRoles';
import { getAdminTransactions, refundTransaction } from '@/features/admin/services/adminExtended.api';
import { TransactionWithDetails, TransactionFilters, PaymentStatus, ColumnConfig } from '@/types/admin';

// Fonction utilitaire pour formater la monnaie
const formatCurrency = (amount: number, currency: string = 'XOF'): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Fonction pour formater la date
const formatDate = (dateString: string | null): string => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function TransactionsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin, loading: rolesLoading } = useUserRoles();

  // États
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [refundModal, setRefundModal] = useState<{ open: boolean; transactionId?: string }>({ open: false });

  // Requête pour les transactions
  const {
    data: transactionsData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['admin-transactions', page, limit, filters, search],
    queryFn: () => getAdminTransactions({ page, limit }, { ...filters, search }),
    enabled: isAdmin,
  });

  // Mutation pour rembourser une transaction
  const refundMutation = useMutation({
    mutationFn: ({ transactionId, reason }: { transactionId: string; reason?: string }) =>
      refundTransaction(transactionId, reason),
    onSuccess: () => {
      toast.success('Transaction remboursée avec succès');
      queryClient.invalidateQueries({ queryKey: ['admin-transactions'] });
      setRefundModal({ open: false });
    },
    onError: (error: Error) => {
      toast.error(`Erreur lors du remboursement: ${error.message}`);
    },
  });

  // Redirection si non admin
  useEffect(() => {
    if (!rolesLoading && !isAdmin) {
      navigate('/admin/tableau-de-bord');
    }
  }, [isAdmin, rolesLoading, navigate]);

  // Gestionnaires
  const handleSearch = (query: string) => {
    setSearch(query);
    setPage(1);
  };

  const handleFilterChange = (key: keyof TransactionFilters, value: string | number | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearch('');
    setPage(1);
  };

  const handleExport = () => {
    if (!transactionsData?.data) return;

    const headers = ['ID', 'Montant', 'Devise', 'Statut', 'Méthode', 'Locataire', 'Propriété', 'Date création', 'Date complétion'];
    const rows = transactionsData.data.map((t: TransactionWithDetails) => [
      t.id,
      formatCurrency(t.amount, t.currency),
      t.currency,
      t.status,
      t.payment_method || '-',
      t.tenant_name || '-',
      t.property_title || '-',
      formatDate(t.created_at),
      formatDate(t.completed_at),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row: string[]) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Export CSV généré avec succès');
  };

  const handleViewTransaction = (transaction: TransactionWithDetails) => {
    navigate(`/admin/transactions/${transaction.id}`);
  };

  const handleRefundTransaction = (transactionId: string) => {
    setRefundModal({ open: true, transactionId });
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const confirmRefund = () => {
    if (refundModal.transactionId) {
      refundMutation.mutate({ transactionId: refundModal.transactionId, reason: 'Remboursement administrateur' });
    }
  };

  // Colonnes du tableau
  const columns: ColumnConfig[] = [
    {
      key: 'id',
      title: 'ID',
      dataIndex: 'id',
      width: '10%',
      render: (value: string) => <span className="font-mono text-xs">{value.substring(0, 8)}...</span>,
    },
    {
      key: 'amount',
      title: 'Montant',
      dataIndex: 'amount',
      width: '12%',
      sortable: true,
      align: 'right',
      render: (value: number, record: TransactionWithDetails) => (
        <span className="font-medium">{formatCurrency(value, record.currency)}</span>
      ),
    },
    {
      key: 'status',
      title: 'Statut',
      dataIndex: 'status',
      width: '12%',
      sortable: true,
      render: (value: PaymentStatus) => {
        const statusConfig: Record<PaymentStatus, { label: string; color: string }> = {
          pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
          processing: { label: 'En traitement', color: 'bg-blue-100 text-blue-800' },
          completed: { label: 'Complétée', color: 'bg-green-100 text-green-800' },
          failed: { label: 'Échouée', color: 'bg-red-100 text-red-800' },
          refunded: { label: 'Remboursée', color: 'bg-purple-100 text-purple-800' },
          cancelled: { label: 'Annulée', color: 'bg-gray-100 text-gray-800' },
        };
        const config = statusConfig[value] || { label: value, color: 'bg-gray-100 text-gray-800' };
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
            {config.label}
          </span>
        );
      },
    },
    {
      key: 'tenant',
      title: 'Locataire',
      dataIndex: 'tenant_name',
      width: '15%',
      render: (value: string | null, record: TransactionWithDetails) => (
        <div className="flex flex-col">
          <span className="font-medium">{value || 'Inconnu'}</span>
          <span className="text-xs text-[#6B5A4E]">{record.tenant_email || '-'}</span>
        </div>
      ),
    },
    {
      key: 'property',
      title: 'Propriété',
      dataIndex: 'property_title',
      width: '15%',
      render: (value: string | null) => <span>{value || '-'}</span>,
    },
    {
      key: 'method',
      title: 'Méthode',
      dataIndex: 'payment_method',
      width: '10%',
      render: (value: string | null) => <span className="capitalize">{value || '-'}</span>,
    },
    {
      key: 'created',
      title: 'Créée le',
      dataIndex: 'created_at',
      width: '14%',
      sortable: true,
      render: (value: string | null) => <span className="text-sm">{formatDate(value)}</span>,
    },
    {
      key: 'completed',
      title: 'Complétée le',
      dataIndex: 'completed_at',
      width: '14%',
      sortable: true,
      render: (value: string | null) => (
        <span className="text-sm">{value ? formatDate(value) : '-'}</span>
      ),
    },
  ];

  // Actions par ligne
  const rowActions = [
    {
      label: 'Voir détails',
      icon: Eye,
      onClick: handleViewTransaction,
    },
    {
      label: 'Rembourser',
      icon: RefreshCw,
      onClick: (transaction: TransactionWithDetails) => handleRefundTransaction(transaction.id),
      disabled: (transaction: TransactionWithDetails) => 
        transaction.status !== 'completed' || transaction.status === 'refunded',
      danger: true,
    },
  ];

  // Statistiques
  const stats = {
    total: transactionsData?.total || 0,
    totalAmount: transactionsData?.data?.reduce((sum: number, t: TransactionWithDetails) => sum + t.amount, 0) || 0,
    completed: transactionsData?.data?.filter((t: TransactionWithDetails) => t.status === 'completed').length || 0,
    pending: transactionsData?.data?.filter((t: TransactionWithDetails) => t.status === 'pending').length || 0,
  };

  if (rolesLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#F16522] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F4] p-6">
      <div className="w-full">
        {/* En-tête */}
        <AdminPageHeader
          title="Gestion des transactions"
          description="Administrez toutes les transactions financières de la plateforme"
          icon={CreditCard}
          onRefresh={() => refetch()}
          refreshing={isLoading}
          showExport={true}
          onExport={handleExport}
          breadcrumbs={[
            { label: 'Administration', href: '/admin/tableau-de-bord' },
            { label: 'Transactions' },
          ]}
        />

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">Total transactions</p>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.total}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">Montant total</p>
            <p className="text-2xl font-bold text-[#2C1810]">{formatCurrency(stats.totalAmount)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">Complétées</p>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.completed}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">En attente</p>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.pending}</p>
          </div>
        </div>

        {/* Filtres */}
        <div className="mb-6">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#EFEBE9] rounded-xl text-[#6B5A4E] hover:border-[#F16522] hover:text-[#F16522] transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filtres {Object.keys(filters).length > 0 && `(${Object.keys(filters).length})`}
          </button>

          {showFilters && (
            <div className="mt-4 bg-white rounded-2xl border border-[#EFEBE9] p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#2C1810] mb-2">Statut</label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                  className="w-full rounded-lg border border-[#EFEBE9] bg-white px-4 py-3 text-[#2C1810] placeholder:text-[#A69B95] outline-none transition focus:border-[#F16522] focus:ring-2 focus:ring-[#F16522]/20"
                >
                  <option value="">Tous</option>
                  <option value="pending">En attente</option>
                  <option value="processing">En traitement</option>
                  <option value="completed">Complétée</option>
                  <option value="failed">Échouée</option>
                  <option value="refunded">Remboursée</option>
                  <option value="cancelled">Annulée</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#2C1810] mb-2">Date de début</label>
                <Input
                  type="date"
                  value={filters.date_from || ''}
                  onChange={(e) => handleFilterChange('date_from', e.target.value || undefined)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#2C1810] mb-2">Date de fin</label>
                <Input
                  type="date"
                  value={filters.date_to || ''}
                  onChange={(e) => handleFilterChange('date_to', e.target.value || undefined)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#2C1810] mb-2">Montant min</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={filters.amount_min || ''}
                  onChange={(e) => handleFilterChange('amount_min', e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>
              <div className="md:col-span-4 flex justify-end gap-2">
                <Button
                  onClick={handleClearFilters}
                  className="border-[#EFEBE9] text-[#6B5A4E] hover:border-[#F16522] hover:text-[#F16522] bg-white"
                >
                  Réinitialiser
                </Button>
                <Button
                  onClick={() => setShowFilters(false)}
                  className="bg-[#F16522] hover:bg-[#d9571d] text-white"
                >
                  Appliquer
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Tableau */}
        <AdminTable
          columns={columns}
          data={transactionsData?.data || []}
          loading={isLoading}
          emptyMessage={isError ? 'Erreur lors du chargement des transactions' : 'Aucune transaction trouvée'}
          pagination={
            transactionsData
              ? {
                  data: transactionsData.data,
                  total: transactionsData.total,
                  page: transactionsData.page,
                  limit: transactionsData.limit,
                  totalPages: transactionsData.totalPages,
                  hasNextPage: transactionsData.hasNextPage,
                  hasPreviousPage: transactionsData.hasPreviousPage,
                }
              : undefined
          }
          onPageChange={setPage}
          rowActions={rowActions}
          selectable={true}
          selectedKeys={selectedTransactions}
          onSelectionChange={setSelectedTransactions}
          showHeaderActions={true}
          onSearch={handleSearch}
          searchPlaceholder="Rechercher par ID, locataire, propriété..."
        />

        {/* Actions en masse */}
        {selectedTransactions.length > 0 && (
          <div className="mt-4 bg-white rounded-2xl border border-[#EFEBE9] p-4 flex items-center justify-between">
            <p className="text-[#2C1810]">
              {selectedTransactions.length} transaction{selectedTransactions.length > 1 ? 's' : ''} sélectionnée{selectedTransactions.length > 1 ? 's' : ''}
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => setSelectedTransactions([])}
                variant="ghost"
                className="text-[#6B5A4E]"
              >
                Annuler la sélection
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
