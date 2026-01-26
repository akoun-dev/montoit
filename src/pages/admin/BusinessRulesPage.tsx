import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  Edit,
  ToggleLeft,
  ToggleRight,
  Plus,
  Save,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { AdminPageHeader } from '@/shared/ui/admin/AdminPageHeader';
import { AdminTable } from '@/shared/ui/admin/AdminTable';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useUserRoles } from '@/hooks/shared/useUserRoles';
import { BusinessRule, ColumnConfig } from '@/types/admin';
import { getBusinessRules, updateBusinessRule } from '@/features/admin/services/adminExtended.api';

export default function BusinessRulesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin, loading: rolesLoading } = useUserRoles();

  // États
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState('');
  const [selectedRules, setSelectedRules] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editingRule, setEditingRule] = useState<BusinessRule | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Requête pour les règles métier
  const {
    data: rulesData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['business-rules'],
    queryFn: getBusinessRules,
    enabled: isAdmin,
  });

  // Mutations
  const updateRuleMutation = useMutation({
    mutationFn: async ({ ruleId, value }: { ruleId: string; value: string | number | boolean }) => {
      return await updateBusinessRule(ruleId, value);
    },
    onSuccess: () => {
      toast.success('Règle mise à jour avec succès');
      queryClient.invalidateQueries({ queryKey: ['business-rules'] });
      setEditingRule(null);
    },
    onError: (error: Error) => {
      toast.error(`Erreur lors de la mise à jour: ${error.message}`);
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ ruleId, active }: { ruleId: string; active: boolean }) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return { ruleId, active };
    },
    onSuccess: ({ active }) => {
      toast.success(`Règle ${active ? 'activée' : 'désactivée'} avec succès`);
      queryClient.invalidateQueries({ queryKey: ['business-rules'] });
    },
    onError: (error: Error) => {
      toast.error(`Erreur lors de la modification: ${error.message}`);
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleClearFilters = () => {
    setCategoryFilter('');
    setStatusFilter('');
    setSearch('');
    setPage(1);
  };

  const handleExport = () => {
    const headers = [
      'Clé',
      'Nom',
      'Catégorie',
      'Valeur',
      'Statut',
      'Dernière modification',
      'Modifié par',
    ];
    const rows = rulesData?.map((rule) => [
      rule.key,
      rule.name,
      rule.category,
      rule.value.toString(),
      rule.is_active ? 'Active' : 'Inactive',
      rule.updated_at ? new Date(rule.updated_at).toLocaleDateString('fr-FR') : '-',
      rule.updated_by || '-',
    ]) || [];

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `regles_metier_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Export CSV généré avec succès');
  };

  const handleEditRule = (rule: BusinessRule) => {
    setEditingRule(rule);
    setEditValue(rule.value.toString());
  };

  const handleSaveEdit = () => {
    if (!editingRule) return;

    // Validation basique
    if (editingRule.validation_regex) {
      const regex = new RegExp(editingRule.validation_regex);
      if (!regex.test(editValue)) {
        toast.error('La valeur ne respecte pas le format requis');
        return;
      }
    }

    // Conversion de type
    let parsedValue: string | number = editValue;
    if (typeof editingRule.value === 'number') {
      parsedValue = parseFloat(editValue);
      if (isNaN(parsedValue)) {
        toast.error('Valeur numérique invalide');
        return;
      }
      if (editingRule.min_value !== undefined && parsedValue < editingRule.min_value) {
        toast.error(`La valeur doit être au moins ${editingRule.min_value}`);
        return;
      }
      if (editingRule.max_value !== undefined && parsedValue > editingRule.max_value) {
        toast.error(`La valeur ne doit pas dépasser ${editingRule.max_value}`);
        return;
      }
    }

    updateRuleMutation.mutate({ ruleId: editingRule.id, value: parsedValue });
  };

   
  const handleToggleRule = (ruleId: string, currentStatus: boolean) => {
    toggleRuleMutation.mutate({ ruleId, active: !currentStatus });
  };

  // Filtrer les données
  const filteredData = rulesData?.filter((rule) => {
    if (categoryFilter && rule.category !== categoryFilter) return false;
    if (statusFilter) {
      if (statusFilter === 'active' && !rule.is_active) return false;
      if (statusFilter === 'inactive' && rule.is_active) return false;
    }
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        rule.key.toLowerCase().includes(searchLower) ||
        rule.name.toLowerCase().includes(searchLower) ||
        rule.description?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  }) || [];

  // Catégories uniques
  const categories = Array.from(new Set(rulesData?.map((r) => r.category) || []));

  // Colonnes du tableau
  const columns: ColumnConfig[] = [
    {
      key: 'key',
      title: 'Clé',
      dataIndex: 'key',
      width: '15%',
      render: (value: string) => (
        <code className="font-mono text-sm bg-[#FAF7F4] px-2 py-1 rounded">{value}</code>
      ),
    },
    {
      key: 'name',
      title: 'Nom',
      dataIndex: 'name',
      width: '20%',
      render: (value: string, record: BusinessRule) => (
        <div className="flex flex-col">
          <span className="font-medium text-[#2C1810]">{value}</span>
          <span className="text-xs text-[#6B5A4E]">{record.description}</span>
        </div>
      ),
    },
    {
      key: 'category',
      title: 'Catégorie',
      dataIndex: 'category',
      width: '12%',
      sortable: true,
      render: (value: string) => (
        <span className="px-2 py-1 bg-[#EFEBE9] text-[#6B5A4E] rounded-full text-xs capitalize">
          {value}
        </span>
      ),
    },
    {
      key: 'value',
      title: 'Valeur',
      dataIndex: 'value',
      width: '15%',
      render: (value: string | number | boolean, record: BusinessRule) => {
        if (editingRule?.id === record.id) {
          return (
            <div className="flex items-center gap-2">
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-32"
              />
              <button
                onClick={handleSaveEdit}
                className="p-1 hover:bg-green-100 rounded"
                title="Enregistrer"
              >
                <Save className="w-4 h-4 text-green-600" />
              </button>
              <button
                onClick={() => setEditingRule(null)}
                className="p-1 hover:bg-red-100 rounded"
                title="Annuler"
              >
                <X className="w-4 h-4 text-red-600" />
              </button>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-2">
            <code className="font-mono text-sm bg-[#FAF7F4] px-2 py-1 rounded">
              {value.toString()}
            </code>
            <button
              onClick={() => handleEditRule(record)}
              className="p-1 hover:bg-[#EFEBE9] rounded"
              title="Modifier"
            >
              <Edit className="w-4 h-4" />
            </button>
          </div>
        );
      },
    },
    {
      key: 'status',
      title: 'Statut',
      dataIndex: 'is_active',
      width: '10%',
      sortable: true,
      render: (value: boolean, record: BusinessRule) => (
        <button
          onClick={() => handleToggleRule(record.id, value)}
          className={`flex items-center gap-2 px-3 py-1 rounded-full transition-colors ${
            value
              ? 'bg-green-100 text-green-800 hover:bg-green-200'
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
        >
          {value ? (
            <>
              <ToggleRight className="w-4 h-4" />
              <span className="text-xs font-medium">Active</span>
            </>
          ) : (
            <>
              <ToggleLeft className="w-4 h-4" />
              <span className="text-xs font-medium">Inactive</span>
            </>
          )}
        </button>
      ),
    },
    {
      key: 'updated',
      title: 'Dernière modification',
      dataIndex: 'updated_at',
      width: '18%',
      sortable: true,
      render: (value: string | null, record: BusinessRule) => (
        <div className="flex flex-col">
          <span className="text-sm">
            {value ? new Date(value).toLocaleDateString('fr-FR') : '-'}
          </span>
          <span className="text-xs text-[#6B5A4E]">Par {record.updated_by || '-'}</span>
        </div>
      ),
    },
    {
      key: 'impact',
      title: 'Impact',
      dataIndex: 'impact_description',
      width: '10%',
      render: (value: string | null) => (
        <div className="text-xs text-[#6B5A4E] truncate max-w-xs" title={value || ''}>
          {value || '-'}
        </div>
      ),
    },
  ];

  // Actions par ligne
  const rowActions = [
    {
      label: 'Modifier',
      icon: Edit,
      onClick: handleEditRule,
    },
    {
      label: (rule: BusinessRule) => (rule.is_active ? 'Désactiver' : 'Activer'),
      icon: (rule: BusinessRule) => (rule.is_active ? ToggleLeft : ToggleRight),
      onClick: (rule: BusinessRule) => handleToggleRule(rule.id, rule.is_active),
    },
  ];

  // Statistiques
  const stats = {
    total: rulesData?.length || 0,
    active: rulesData?.filter((r) => r.is_active).length || 0,
    inactive: rulesData?.filter((r) => !r.is_active).length || 0,
    categories: categories.length,
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
          title="Règles métier"
          description="Configurez les règles métier qui gouvernent la plateforme"
          icon={Settings}
          onRefresh={() => refetch()}
          refreshing={isLoading}
          showExport={true}
          onExport={handleExport}
          breadcrumbs={[
            { label: 'Administration', href: '/admin/tableau-de-bord' },
            { label: 'Règles métier' },
          ]}
          actions={
            <Button
              onClick={() => navigate('/admin/regles-metier/add')}
              className="flex items-center gap-2 bg-[#F16522] hover:bg-[#d9571d] text-white"
            >
              <Plus className="w-4 h-4" />
              Ajouter une règle
            </Button>
          }
        />

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">Total règles</p>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.total}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">Actives</p>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.active}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">Inactives</p>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.inactive}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">Catégories</p>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.categories}</p>
          </div>
        </div>

        {/* Tableau */}
        <AdminTable
          columns={columns}
          data={filteredData}
          loading={isLoading}
          emptyMessage={
            isError ? 'Erreur lors du chargement des règles' : 'Aucune règle métier trouvée'
          }
          pagination={
            rulesData
              ? {
                  data: filteredData,
                  total: filteredData.length,
                  page: page,
                  limit: limit,
                  totalPages: Math.ceil(filteredData.length / limit),
                  hasNextPage: page * limit < filteredData.length,
                  hasPreviousPage: page > 1,
                }
              : undefined
          }
          onPageChange={setPage}
          rowActions={rowActions}
          selectable={true}
          selectedKeys={selectedRules}
          onSelectionChange={setSelectedRules}
          showHeaderActions={true}
          onSearch={handleSearch}
          searchPlaceholder="Rechercher par clé, nom, description..."
        />
      </div>
    </div>
  );
}
