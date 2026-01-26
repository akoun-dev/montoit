import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Home,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  Download,
  Filter,
  MoreVertical,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

import { AdminPageHeader } from '@/shared/ui/admin/AdminPageHeader';
import { AdminTable } from '@/shared/ui/admin/AdminTable';
import Modal from '@/shared/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useUserRoles } from '@/hooks/shared/useUserRoles';
import {
  getAdminProperties,
  certifyPropertyANSUT,
  updateProperty,
  deleteProperty,
} from '@/features/admin/services/adminExtended.api';
import {
  AdminProperty,
  PropertyFilters,
  PropertyStatus,
  PaginatedResult,
  ColumnConfig,
} from '@/types/admin';

// Fonction utilitaire pour formater la monnaie
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function PropertiesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin, loading: rolesLoading } = useUserRoles();

  // États
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<PropertyFilters>({});
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [certifyModal, setCertifyModal] = useState<{ open: boolean; propertyId?: string; title?: string }>({
    open: false,
  });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; propertyId?: string; title?: string }>({
    open: false,
  });

  // Requête pour les propriétés
  const {
    data: propertiesData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['admin-properties', page, limit, filters, search],
    queryFn: () => getAdminProperties({ page, limit }, { ...filters, search }),
    enabled: isAdmin,
  });

  // Mutation pour certifier une propriété ANSUT
  const certifyMutation = useMutation({
    mutationFn: (propertyId: string) => certifyPropertyANSUT(propertyId),
    onSuccess: () => {
      toast.success('Propriété certifiée ANSUT avec succès');
      queryClient.invalidateQueries({ queryKey: ['admin-properties'] });
      setCertifyModal({ open: false });
    },
    onError: (error: Error) => {
      toast.error(`Erreur lors de la certification: ${error.message}`);
    },
  });

  // Mutation pour supprimer une propriété
  const deleteMutation = useMutation({
    mutationFn: (propertyId: string) => deleteProperty(propertyId),
    onSuccess: () => {
      toast.success('Propriété supprimée avec succès');
      queryClient.invalidateQueries({ queryKey: ['admin-properties'] });
      setDeleteModal({ open: false });
      setSelectedProperties([]);
    },
    onError: (error: Error) => {
      toast.error(`Erreur lors de la suppression: ${error.message}`);
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

  const handleFilterChange = (key: keyof PropertyFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearch('');
    setPage(1);
  };

  const handleExport = () => {
    if (!propertiesData?.data) return;

    const headers = [
      'ID',
      'Titre',
      'Type',
      'Ville',
      'Prix',
      'Surface',
      'Statut',
      'Certifié ANSUT',
      'Date création',
    ];
    const rows = propertiesData.data.map((p: AdminProperty) => [
      p.id,
      p.title,
      p.property_type,
      p.city,
      formatCurrency(p.price),
      `${p.surface_area} m²`,
      p.status,
      p.ansut_verified ? 'Oui' : 'Non',
      p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR') : '-',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row: any[]) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `proprietes_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Export CSV généré avec succès');
  };

  const handleViewProperty = (property: AdminProperty) => {
    navigate(`/propriete/${property.id}`);
  };

  const handleEditProperty = (property: AdminProperty) => {
    navigate(`/admin/properties/edit/${property.id}`);
  };

  const handleCertifyProperty = (property: AdminProperty) => {
    setCertifyModal({ open: true, propertyId: property.id, title: property.title });
  };

  const handleDeleteProperty = (property: AdminProperty) => {
    setDeleteModal({ open: true, propertyId: property.id, title: property.title });
  };

  const confirmCertify = () => {
    if (certifyModal.propertyId) {
      certifyMutation.mutate(certifyModal.propertyId);
    }
  };

  // Colonnes du tableau
  const columns: ColumnConfig[] = [
    {
      key: 'title',
      title: 'Titre',
      dataIndex: 'title',
      width: '25%',
      sortable: true,
      render: (value: string, record: AdminProperty) => (
        <div className="flex flex-col">
          <span className="font-medium text-[#2C1810]">{value}</span>
          <span className="text-xs text-[#6B5A4E]">{record.address}</span>
        </div>
      ),
    },
    {
      key: 'type',
      title: 'Type',
      dataIndex: 'property_type',
      width: '10%',
      sortable: true,
      render: (value: string) => <span className="capitalize">{value}</span>,
    },
    {
      key: 'city',
      title: 'Ville',
      dataIndex: 'city',
      width: '10%',
      sortable: true,
    },
    {
      key: 'price',
      title: 'Prix',
      dataIndex: 'price',
      width: '12%',
      sortable: true,
      align: 'right',
      render: (value: number) => <span className="font-medium">{formatCurrency(value)}</span>,
    },
    {
      key: 'surface',
      title: 'Surface',
      dataIndex: 'surface_area',
      width: '8%',
      sortable: true,
      align: 'right',
      render: (value: number) => `${value} m²`,
    },
    {
      key: 'status',
      title: 'Statut',
      dataIndex: 'status',
      width: '10%',
      sortable: true,
      render: (value: PropertyStatus) => {
        const statusConfig: Record<PropertyStatus, { label: string; color: string }> = {
          available: { label: 'Disponible', color: 'bg-green-100 text-green-800' },
          rented: { label: 'Loué', color: 'bg-blue-100 text-blue-800' },
          unavailable: { label: 'Indisponible', color: 'bg-gray-100 text-gray-800' },
          pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
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
      key: 'ansut',
      title: 'ANSUT',
      dataIndex: 'ansut_verified',
      width: '8%',
      sortable: true,
      align: 'center',
      render: (value: boolean) =>
        value ? (
          <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
        ) : (
          <XCircle className="w-5 h-5 text-gray-400 mx-auto" />
        ),
    },
    {
      key: 'created',
      title: 'Créé le',
      dataIndex: 'created_at',
      width: '12%',
      sortable: true,
      render: (value: string | null) => (value ? new Date(value).toLocaleDateString('fr-FR') : '-'),
    },
  ];

  // Actions par ligne
  const rowActions = [
    {
      label: 'Voir',
      icon: Eye,
      onClick: handleViewProperty,
    },
    {
      label: 'Éditer',
      icon: Edit,
      onClick: handleEditProperty,
    },
    {
      label: 'Certifier ANSUT',
      icon: CheckCircle,
      onClick: (property: AdminProperty) => handleCertifyProperty(property),
      disabled: (property: AdminProperty) => property.ansut_verified,
    },
    {
      label: 'Supprimer',
      icon: Trash2,
      onClick: (property: AdminProperty) => handleDeleteProperty(property),
      danger: true,
    },
  ];

  // Statistiques
  const stats = {
    total: propertiesData?.total || 0,
    available:
      propertiesData?.data?.filter((p: AdminProperty) => p.status === 'available').length || 0,
    ansutCertified:
      propertiesData?.data?.filter((p: AdminProperty) => p.ansut_verified).length || 0,
    averagePrice:
      (propertiesData?.data?.reduce((sum: number, p: AdminProperty) => sum + p.price, 0) || 0) /
      (propertiesData?.data?.length || 1),
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
          title="Gestion des propriétés"
          description="Administrez toutes les propriétés de la plateforme MonToit"
          icon={Home}
          onRefresh={() => refetch()}
          refreshing={isLoading}
          showExport={true}
          onExport={handleExport}
          breadcrumbs={[
            { label: 'Administration', href: '/admin/tableau-de-bord' },
            { label: 'Propriétés' },
          ]}
        />

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">Total propriétés</p>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.total}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">Disponibles</p>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.available}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">Certifiées ANSUT</p>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.ansutCertified}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">Prix moyen</p>
            <p className="text-2xl font-bold text-[#2C1810]">
              {formatCurrency(stats.averagePrice)}
            </p>
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
                  <option value="available">Disponible</option>
                  <option value="rented">Loué</option>
                  <option value="unavailable">Indisponible</option>
                  <option value="pending">En attente</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#2C1810] mb-2">Ville</label>
                <Input
                  type="text"
                  placeholder="Abidjan, Yamoussoukro..."
                  value={filters.city || ''}
                  onChange={(e) => handleFilterChange('city', e.target.value || undefined)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#2C1810] mb-2">Prix min</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={filters.price_min || ''}
                  onChange={(e) =>
                    handleFilterChange(
                      'price_min',
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#2C1810] mb-2">Prix max</label>
                <Input
                  type="number"
                  placeholder="1000000"
                  value={filters.price_max || ''}
                  onChange={(e) =>
                    handleFilterChange(
                      'price_max',
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
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
          data={propertiesData?.data || []}
          loading={isLoading}
          emptyMessage={
            isError ? 'Erreur lors du chargement des propriétés' : 'Aucune propriété trouvée'
          }
          pagination={
            propertiesData
              ? {
                  data: propertiesData.data,
                  total: propertiesData.total,
                  page: propertiesData.page,
                  limit: propertiesData.limit,
                  totalPages: propertiesData.totalPages,
                  hasNextPage: propertiesData.hasNextPage,
                  hasPreviousPage: propertiesData.hasPreviousPage,
                }
              : undefined
          }
          onPageChange={setPage}
          rowActions={rowActions}
          selectable={true}
          selectedKeys={selectedProperties}
          onSelectionChange={setSelectedProperties}
          showHeaderActions={true}
          onSearch={handleSearch}
          searchPlaceholder="Rechercher par titre, ville, adresse..."
        />

        {/* Actions en masse */}
        {selectedProperties.length > 0 && (
          <div className="mt-4 bg-white rounded-2xl border border-[#EFEBE9] p-4 flex items-center justify-between">
            <p className="text-[#2C1810]">
              {selectedProperties.length} propriété{selectedProperties.length > 1 ? 's' : ''}{' '}
              sélectionnée
              {selectedProperties.length > 1 ? 's' : ''}
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => setSelectedProperties([])}
                className="border-[#EFEBE9] text-[#6B5A4E] hover:border-[#F16522] hover:text-[#F16522] bg-white"
              >
                Annuler
              </Button>
              <Button
                onClick={() => {
                  toast.info('Fonctionnalité à implémenter');
                }}
                className="bg-[#F16522] hover:bg-[#d9571d] text-white"
              >
                Exporter sélection
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de certification ANSUT */}
      <Modal
        isOpen={certifyModal.open}
        onClose={() => setCertifyModal({ open: false })}
        title="Certifier ANSUT"
      >
        <div className="space-y-4">
          <p className="text-[#6B5A4E]">
            Êtes-vous sûr de vouloir certifier cette propriété conforme aux normes ANSUT ?
          </p>
          {certifyModal.title && (
            <p className="font-medium text-[#2C1810]">« {certifyModal.title} »</p>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={() => setCertifyModal({ open: false })}
              className="px-4 py-2 border border-[#EFEBE9] rounded-xl hover:bg-[#FAF7F4]"
            >
              Annuler
            </button>
            <button
              onClick={confirmCertify}
              disabled={certifyMutation.isPending}
              className="px-4 py-2 bg-[#F16522] text-white rounded-xl hover:bg-[#d9571d] disabled:opacity-50"
            >
              {certifyMutation.isPending ? 'Certification...' : 'Certifier'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de suppression */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false })}
        title="Supprimer la propriété"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[#6B5A4E]">
                Êtes-vous sûr de vouloir supprimer cette propriété ?
              </p>
              <p className="text-sm text-red-600 mt-2">
                Cette action est irréversible. Toutes les données associées seront perdues.
              </p>
            </div>
          </div>
          {deleteModal.title && (
            <p className="font-medium text-[#2C1810]">« {deleteModal.title} »</p>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={() => setDeleteModal({ open: false })}
              className="px-4 py-2 border border-[#EFEBE9] rounded-xl hover:bg-[#FAF7F4]"
            >
              Annuler
            </button>
            <button
              onClick={() => deleteModal.propertyId && deleteMutation.mutate(deleteModal.propertyId)}
              disabled={deleteMutation.isPending}
              className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50"
            >
              {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
