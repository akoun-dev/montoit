import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Eye, Filter, AlertTriangle, Info, AlertCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

import { AdminPageHeader } from '@/shared/ui/admin/AdminPageHeader';
import { AdminTable } from '@/shared/ui/admin/AdminTable';
import Input from '@/components/ui/Input';
import { useUserRoles } from '@/hooks/shared/useUserRoles';
import { LogEntry, LogLevel, ColumnConfig, LogFilters } from '@/types/admin';
import { getAdminLogs } from '@/features/admin/services/adminExtended.api';

export default function LogsPage() {
  const navigate = useNavigate();
  const { isAdmin, loading: rolesLoading } = useUserRoles();

  // États
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState('');
  const [selectedLogs, setSelectedLogs] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [levelFilter, setLevelFilter] = useState<LogLevel | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Construire les filtres
  const filters: LogFilters = {};
  if (levelFilter) filters.level = levelFilter;
  if (dateFrom) filters.date_from = dateFrom;
  if (dateTo) filters.date_to = dateTo;

  // Requête pour les logs
  const {
    data: logsData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['admin-logs', page, limit, filters],
    queryFn: () => getAdminLogs({ page, limit }, filters),
    enabled: isAdmin,
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

  const handleClearFilters = () => {
    setLevelFilter('');
    setDateFrom('');
    setDateTo('');
    setSearch('');
    setPage(1);
  };

  const handleExport = () => {
    if (!logsData?.data) return;

    const headers = ['Date', 'Niveau', 'Action', 'Utilisateur', 'Email', 'IP', 'Détails'];
    const rows = logsData.data.map((log) => [
      new Date(log.created_at || '').toLocaleString('fr-FR'),
      log.level,
      log.action,
      log.user_id || 'System',
      log.user_email || '-',
      log.ip_address || '-',
      JSON.stringify(log.details),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `logs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Export CSV généré avec succès');
  };

  const handleViewLogDetails = (log: LogEntry) => {
    toast.info(`Détails du log: ${log.action}`, {
      description: JSON.stringify(log.details, null, 2),
      duration: 10000,
    });
  };

  // Filtrer les données (côté client pour la recherche)
  const filteredData = logsData?.data?.filter((log) => {
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        log.action.toLowerCase().includes(searchLower) ||
        log.user_email?.toLowerCase().includes(searchLower) ||
        log.ip_address?.toLowerCase().includes(searchLower) ||
        JSON.stringify(log.details).toLowerCase().includes(searchLower)
      );
    }
    return true;
  }) || [];

  // Colonnes du tableau
  const columns: ColumnConfig[] = [
    {
      key: 'timestamp',
      title: 'Date/Heure',
      dataIndex: 'created_at',
      width: '15%',
      sortable: true,
      render: (value: string | null) => (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#6B5A4E]" />
          <span className="text-sm">
            {value ? new Date(value).toLocaleString('fr-FR') : '-'}
          </span>
        </div>
      ),
    },
    {
      key: 'level',
      title: 'Niveau',
      dataIndex: 'level',
      width: '10%',
      sortable: true,
      render: (value: LogLevel) => {
        const levelConfig: Record<LogLevel, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
          info: { label: 'Info', color: 'bg-blue-100 text-blue-800', icon: Info },
          warning: { label: 'Avertissement', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
          error: { label: 'Erreur', color: 'bg-red-100 text-red-800', icon: AlertCircle },
          debug: { label: 'Debug', color: 'bg-gray-100 text-gray-800', icon: FileText },
        };
        const config = levelConfig[value] || { label: value, color: 'bg-gray-100 text-gray-800', icon: FileText };
        const Icon = config.icon;
        return (
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4" />
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
              {config.label}
            </span>
          </div>
        );
      },
    },
    {
      key: 'action',
      title: 'Action',
      dataIndex: 'action',
      width: '20%',
      sortable: true,
      render: (value: string) => (
        <div className="font-medium text-[#2C1810]">
          {value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </div>
      ),
    },
    {
      key: 'user',
      title: 'Utilisateur',
      dataIndex: 'user_email',
      width: '20%',
      render: (value: string | null, record: LogEntry) => (
        <div className="flex flex-col">
          <span className="font-medium">{value || 'System'}</span>
          <span className="text-xs text-[#6B5A4E]">{record.ip_address || '-'}</span>
        </div>
      ),
    },
    {
      key: 'entity',
      title: 'Entité',
      dataIndex: 'entity_type',
      width: '15%',
      render: (value: string, record: LogEntry) => (
        <div className="flex flex-col">
          <span className="capitalize">{value}</span>
          <span className="text-xs text-[#6B5A4E]">{record.entity_id || '-'}</span>
        </div>
      ),
    },
    {
      key: 'details',
      title: 'Détails',
      dataIndex: 'details',
      width: '20%',
      render: (value: Record<string, unknown>) => (
        <div className="truncate max-w-xs">
          <code className="text-xs bg-[#FAF7F4] px-2 py-1 rounded">
            {JSON.stringify(value).substring(0, 50)}
            {JSON.stringify(value).length > 50 ? '...' : ''}
          </code>
        </div>
      ),
    },
  ];

  // Actions par ligne
  const rowActions = [
    {
      label: 'Voir détails',
      icon: Eye,
      onClick: handleViewLogDetails,
    },
  ];

  // Statistiques
  const stats = {
    total: logsData?.total || 0,
    info: logsData?.data?.filter(l => l.level === 'info').length || 0,
    warning: logsData?.data?.filter(l => l.level === 'warning').length || 0,
    error: logsData?.data?.filter(l => l.level === 'error').length || 0,
    debug: logsData?.data?.filter(l => l.level === 'debug').length || 0,
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
          title="Journaux système"
          description="Consultez les journaux d'activité et les événements système"
          icon={FileText}
          onRefresh={() => refetch()}
          refreshing={isLoading}
          showExport={true}
          onExport={handleExport}
          breadcrumbs={[
            { label: 'Administration', href: '/admin/tableau-de-bord' },
            { label: 'Journaux' },
          ]}
        />

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">Total logs</p>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.total}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              <p className="text-sm text-[#6B5A4E]">Infos</p>
            </div>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.info}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <p className="text-sm text-[#6B5A4E]">Avertissements</p>
            </div>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.warning}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <p className="text-sm text-[#6B5A4E]">Erreurs</p>
            </div>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.error}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-600" />
              <p className="text-sm text-[#6B5A4E]">Debug</p>
            </div>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.debug}</p>
          </div>
        </div>

        {/* Filtres */}
        <div className="mb-6">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#EFEBE9] rounded-xl text-[#6B5A4E] hover:border-[#F16522] hover:text-[#F16522] transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filtres {showFilters && '(actifs)'}
          </button>

          {showFilters && (
            <div className="mt-4 bg-white rounded-2xl border border-[#EFEBE9] p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#2C1810] mb-2">Niveau</label>
                <select
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value as LogLevel | '')}
                  className="w-full px-3 py-2 border border-[#EFEBE9] rounded-lg text-sm"
                >
                  <option value="">Tous</option>
                  <option value="debug">Debug</option>
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#2C1810] mb-2">Date de début</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#2C1810] mb-2">Date de fin</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleClearFilters}
                  className="w-full px-4 py-2 bg-white border border-[#EFEBE9] rounded-lg text-sm text-[#6B5A4E] hover:border-[#F16522] hover:text-[#F16522] transition-colors"
                >
                  Effacer les filtres
                </button>
              </div>
            </div>
          )}

          {/* Tableau */}
          <AdminTable
            columns={columns}
            data={filteredData}
            loading={isLoading}
            emptyMessage={isError ? 'Erreur lors du chargement des logs' : 'Aucun log trouvé'}
            pagination={logsData ? {
              data: filteredData,
              total: filteredData.length,
              page,
              limit,
              totalPages: Math.ceil(filteredData.length / limit),
              hasNextPage: page * limit < filteredData.length,
              hasPreviousPage: page > 1,
            } : undefined}
            onPageChange={setPage}
            rowActions={rowActions}
            selectable={true}
            selectedKeys={selectedLogs}
            onSelectionChange={setSelectedLogs}
            showHeaderActions={true}
            onSearch={handleSearch}
            searchPlaceholder="Rechercher par action, utilisateur, IP..."
          />
        </div>
      </div>
    </div>
  );
}
