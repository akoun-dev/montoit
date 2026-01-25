import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Building,
  Briefcase,
  Clock,
  Eye,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Filter as FilterIcon,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Badge } from '@/shared/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/shared/useSafeToast';

// New Trust Agent UI Components
import {
  KPICard,
  EmptyState,
  FilterBar,
  TrustAgentPageHeader,
} from '@/shared/ui/trust-agent';

type DossierType = 'tenant' | 'owner' | 'agency';
type DossierStatus = 'pending' | 'in_review' | 'approved' | 'rejected';

interface Dossier {
  id: string;
  type: DossierType;
  full_name: string;
  email: string;
  phone: string | null;
  verification_status: DossierStatus;
  submitted_at: string;
  reviewed_at: string | null;
}

const STATUS_CONFIG = {
  pending: { label: 'En attente', variant: 'secondary' as const, bg: 'bg-gray-100', text: 'text-gray-700', icon: Clock },
  in_review: { label: 'En cours', variant: 'default' as const, bg: 'bg-blue-100', text: 'text-blue-700', icon: Eye },
  approved: { label: 'Approuvé', variant: 'secondary' as const, bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2 },
  rejected: { label: 'Rejeté', variant: 'destructive' as const, bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
};

const TYPE_CONFIG = {
  tenant: { label: 'Locataires', icon: User, color: 'bg-blue-100 text-blue-700' },
  owner: { label: 'Propriétaires', icon: Building, color: 'bg-orange-100 text-orange-700' },
  agency: { label: 'Agences', icon: Briefcase, color: 'bg-purple-100 text-purple-700' },
};

export default function DossiersListPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DossierType>('tenant');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DossierStatus | 'all'>('all');

  const [dossiers, setDossiers] = useState<Record<DossierType, Dossier[]>>({
    tenant: [],
    owner: [],
    agency: [],
  });

  useEffect(() => {
    loadDossiers();
  }, []);

  const loadDossiers = async () => {
    try {
      setLoading(true);

      const { data: tenantData, error: tenantError } = await supabase
        .from('tenant_applications')
        .select('id, full_name, email, phone, verification_status, submitted_at, reviewed_at')
        .order('submitted_at', { ascending: false });

      if (tenantError && tenantError.code !== 'PGRST116') {
        console.error('Error loading tenant dossiers:', tenantError);
      }

      setDossiers({
        tenant: (tenantData || []) as Dossier[],
        owner: [],
        agency: [],
      });
    } catch (error) {
      console.error('Error loading dossiers:', error);
      toast.error('Erreur lors du chargement des dossiers');
    } finally {
      setLoading(false);
    }
  };

  const filteredDossiers = useMemo(() => {
    return dossiers[activeTab]?.filter((dossier) => {
      if (statusFilter !== 'all' && dossier.verification_status !== statusFilter) {
        return false;
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          dossier.full_name.toLowerCase().includes(query) ||
          dossier.email.toLowerCase().includes(query) ||
          dossier.phone?.includes(query)
        );
      }

      return true;
    }) || [];
  }, [dossiers, activeTab, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const currentStats = {
      total: dossiers[activeTab].length,
      pending: dossiers[activeTab].filter((d) => d.verification_status === 'pending').length,
      in_review: dossiers[activeTab].filter((d) => d.verification_status === 'in_review').length,
      approved: dossiers[activeTab].filter((d) => d.verification_status === 'approved').length,
      rejected: dossiers[activeTab].filter((d) => d.verification_status === 'rejected').length,
    };
    return currentStats;
  }, [dossiers, activeTab]);

  const handleDossierClick = (dossier: Dossier) => {
    navigate(`/trust-agent/dossiers/${activeTab}/${dossier.id}`);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
  };

  const activeFiltersCount = (statusFilter !== 'all' ? 1 : 0) + (searchQuery ? 1 : 0);

  // KPI Cards Data
  const kpiData = [
    {
      title: 'Total',
      value: stats.total,
      icon: <User />,
      variant: 'default' as const,
    },
    {
      title: 'En attente',
      value: stats.pending,
      icon: <Clock />,
      variant: 'warning' as const,
    },
    {
      title: 'En cours',
      value: stats.in_review,
      icon: <Eye />,
      variant: 'info' as const,
    },
    {
      title: 'Approuvés',
      value: stats.approved,
      icon: <CheckCircle2 />,
      variant: 'success' as const,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <TrustAgentPageHeader
        title="Validation des Dossiers"
        subtitle="Gérez les dossiers de vérification des locataires, propriétaires et agences"
        badges={[
          { label: `${stats.pending} en attente`, variant: stats.pending > 0 ? 'warning' : 'secondary' },
          { label: `${stats.approved} approuvés`, variant: 'success' },
        ]}
        showSearch
        onSearch={setSearchQuery}
        searchPlaceholder="Rechercher par nom, email ou téléphone..."
      />

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DossierType)} className="space-y-6">
          {/* Tabs */}
          <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-white border border-gray-200 rounded-xl">
            <TabsTrigger
              value="tenant"
              className="flex items-center gap-2 py-3 data-[state=active]:bg-primary-500 data-[state=active]:text-white"
            >
              <User className="h-4 w-4" />
              Locataires
              <Badge variant="secondary" className="data-[state=active]:bg-white/20 data-[state=active]:text-white">
                {stats.total}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="owner"
              className="flex items-center gap-2 py-3 data-[state=active]:bg-primary-500 data-[state=active]:text-white"
            >
              <Building className="h-4 w-4" />
              Propriétaires
              <Badge variant="secondary" className="data-[state=active]:bg-white/20 data-[state=active]:text-white">
                0
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="agency"
              className="flex items-center gap-2 py-3 data-[state=active]:bg-primary-500 data-[state=active]:text-white"
            >
              <Briefcase className="h-4 w-4" />
              Agences
              <Badge variant="secondary" className="data-[state=active]:bg-white/20 data-[state=active]:text-white">
                0
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {kpiData.map((kpi, index) => (
                <KPICard key={index} {...kpi} />
              ))}
            </div>

            {/* Filter Bar */}
            <FilterBar
              searchPlaceholder="Rechercher par nom, email ou téléphone..."
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              groups={[
                {
                  id: 'status',
                  label: 'Statut',
                  type: 'radio',
                  options: [
                    { value: 'all', label: 'Tous', count: stats.total },
                    { value: 'pending', label: 'En attente', count: stats.pending, icon: <Clock className="h-3 w-3" /> },
                    { value: 'in_review', label: 'En cours', count: stats.in_review, icon: <Eye className="h-3 w-3" /> },
                    { value: 'approved', label: 'Approuvés', count: stats.approved, icon: <CheckCircle2 className="h-3 w-3" /> },
                    { value: 'rejected', label: 'Rejetés', count: stats.rejected, icon: <XCircle className="h-3 w-3" /> },
                  ],
                  selected: statusFilter === 'all' ? [] : [statusFilter],
                  onChange: (values) => setStatusFilter((values[0] || 'all') as DossierStatus | 'all'),
                },
              ]}
              activeFiltersCount={activeFiltersCount}
              onClearFilters={handleClearFilters}
            />

            {/* Dossiers List */}
            {loading ? (
              <div className="grid gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredDossiers.length === 0 ? (
              <EmptyState
                icon={<FilterIcon />}
                title={activeFiltersCount > 0 ? 'Aucun dossier trouvé' : 'Aucun dossier'}
                description={
                  activeFiltersCount > 0
                    ? 'Essayez d\'ajuster vos critères de recherche'
                    : 'Aucun dossier de vérification pour le moment'
                }
                actionLabel={activeFiltersCount > 0 ? 'Effacer les filtres' : undefined}
                onAction={activeFiltersCount > 0 ? handleClearFilters : undefined}
                variant={activeFiltersCount > 0 ? 'filter' : 'default'}
              />
            ) : (
              <div className="space-y-3">
                {filteredDossiers.map((dossier) => {
                  const statusConfig = STATUS_CONFIG[dossier.verification_status];
                  const StatusIcon = statusConfig.icon;
                  const typeConfig = TYPE_CONFIG[activeTab];
                  const TypeIcon = typeConfig.icon;

                  return (
                    <Card
                      key={dossier.id}
                      className="cursor-pointer hover:shadow-lg transition-all duration-200 border-gray-200 hover:border-primary-200"
                      onClick={() => handleDossierClick(dossier)}
                    >
                      <div className="p-5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${typeConfig.color}`}>
                              <TypeIcon className="h-6 w-6" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-900">{dossier.full_name}</h3>
                                <Badge className={statusConfig.bg + ' ' + statusConfig.text + ' border-0'}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {statusConfig.label}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-500 mt-0.5">{dossier.email}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                Soumis le {new Date(dossier.submitted_at).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                          </div>

                          <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
