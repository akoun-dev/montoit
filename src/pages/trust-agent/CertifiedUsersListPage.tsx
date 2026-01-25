import { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserCheck,
  Shield,
  CheckCircle2,
  Download,
  Phone,
  MapPin,
  Calendar,
  ChevronRight,
  AlertCircle,
  Building2,
  Home as HomeIcon,
  Briefcase,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/shared/lib/utils';
import { useNavigate } from 'react-router-dom';

// New Trust Agent UI Components
import { KPICard, EmptyState, TrustAgentPageHeader } from '@/shared/ui/trust-agent';
import { Badge } from '@/shared/ui/badge';

interface CertifiedUser {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  oneci_verified: boolean | null;
  trust_score: number | null;
  facial_verification_status: string | null;
  user_type: string | null;
  created_at: string | null;
  updated_at: string | null;
  oneci_number?: string | null;
  oneci_verification_date?: string | null;
  bio?: string | null;
}

type FilterType =
  | 'all'
  | 'verified'
  | 'partial'
  | 'oneci'
  | 'facial'
  | 'locataire'
  | 'proprietaire'
  | 'agence'
  | 'admin_ansut'
  | 'trust_agent';

// Status configurations
const VERIFICATION_STATUS_CONFIG = {
  verified: {
    label: 'Vérifié',
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-200',
    dot: 'bg-green-500',
  },
  partial: {
    label: 'Partiel',
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  unverified: {
    label: 'Non vérifié',
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-200',
    dot: 'bg-gray-400',
  },
};

const USER_TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> =
  {
    locataire: {
      label: 'Locataire',
      icon: HomeIcon,
      color: 'bg-blue-100 text-blue-700 border-blue-200',
    },
    proprietaire: {
      label: 'Propriétaire',
      icon: Building2,
      color: 'bg-purple-100 text-purple-700 border-purple-200',
    },
    agence: {
      label: 'Agence',
      icon: Briefcase,
      color: 'bg-orange-100 text-orange-700 border-orange-200',
    },
    admin_ansut: {
      label: 'Admin ANSUT',
      icon: Shield,
      color: 'bg-red-100 text-red-700 border-red-200',
    },
    trust_agent: {
      label: 'Agent de confiance',
      icon: UserCheck,
      color: 'bg-green-100 text-green-700 border-green-200',
    },
  };

export default function CertifiedUsersListPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<CertifiedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'score'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadCertifiedUsers();
  }, []);

  const loadCertifiedUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users;

    // Apply filter
    switch (activeFilter) {
      case 'verified':
        filtered = users.filter((u) => u.is_verified === true);
        break;
      case 'partial':
        filtered = users.filter(
          (u) =>
            (u.oneci_verified === true || u.facial_verification_status !== 'none') &&
            u.is_verified !== true
        );
        break;
      case 'oneci':
        filtered = users.filter((u) => u.oneci_verified === true);
        break;
      case 'facial':
        filtered = users.filter((u) => u.facial_verification_status !== 'none');
        break;
      case 'locataire':
      case 'proprietaire':
      case 'agence':
      case 'admin_ansut':
      case 'trust_agent':
        filtered = users.filter((u) => u.user_type === activeFilter);
        break;
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.full_name?.toLowerCase().includes(query) ||
          (u.email?.toLowerCase() || '').includes(query) ||
          u.phone?.includes(query) ||
          u.city?.toLowerCase().includes(query)
      );
    }

    // Apply sort
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = (a.full_name || '').localeCompare(b.full_name || '');
      } else if (sortBy === 'date') {
        const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        comparison = dateA - dateB;
      } else if (sortBy === 'score') {
        comparison = getVerificationScore(a) - getVerificationScore(b);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [users, activeFilter, searchQuery, sortBy, sortOrder]);

  const getVerificationStatus = (user: CertifiedUser) => {
    if (user.is_verified) return 'verified';
    if (user.oneci_verified || user.facial_verification_status !== 'none') return 'partial';
    return 'unverified';
  };

  const getVerificationScore = (user: CertifiedUser) => {
    let score = 0;
    if (user.is_verified) score += 45;
    if (user.oneci_verified) score += 35;
    if (user.facial_verification_status === 'verified') score += 20;
    return score;
  };

  const exportUsers = async () => {
    try {
      const csvContent = [
        [
          'Nom',
          'Email',
          'Téléphone',
          'Ville',
          'Type',
          'Statut',
          'ONECI',
          'Facial',
          'Trust Score',
          'Date création',
        ],
        ...filteredAndSortedUsers.map((u) => [
          u.full_name || '',
          u.email || '',
          u.phone || '',
          u.city || '',
          USER_TYPE_CONFIG[u.user_type || '']?.label || u.user_type || '',
          VERIFICATION_STATUS_CONFIG[getVerificationStatus(u)].label,
          u.oneci_verified ? 'Oui' : 'Non',
          u.facial_verification_status !== 'none' ? 'Oui' : 'Non',
          `${getVerificationScore(u)}%`,
          u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '',
        ]),
      ]
        .map((row) => row.join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `certified_users_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      toast.success('Export réussi');
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Erreur lors de l'export");
    }
  };

  // KPI Data
  const kpiData = useMemo(
    () => [
      {
        title: 'Total utilisateurs',
        value: users.length,
        icon: <Users />,
        trend: {
          value: users.filter((u) => {
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            return u.created_at ? new Date(u.created_at) > lastMonth : false;
          }).length,
          label: 'ce mois',
        },
        variant: 'default' as const,
      },
      {
        title: 'Vérifiés',
        value: users.filter((u) => u.is_verified).length,
        icon: <CheckCircle2 />,
        variant: 'success' as const,
      },
      {
        title: 'Vérification ONECI',
        value: users.filter((u) => u.oneci_verified).length,
        icon: <Shield />,
        variant: 'info' as const,
      },
      {
        title: 'Vérification faciale',
        value: users.filter((u) => u.facial_verification_status !== 'none').length,
        icon: <UserCheck />,
        variant: 'warning' as const,
      },
    ],
    [users]
  );

  // Filter options
  const verificationFilters = [
    { id: 'all', label: 'Tous', count: users.length },
    { id: 'verified', label: 'Vérifiés', count: users.filter((u) => u.is_verified).length },
    {
      id: 'partial',
      label: 'Partiels',
      count: users.filter(
        (u) => (u.oneci_verified || u.facial_verification_status !== 'none') && !u.is_verified
      ).length,
    },
    { id: 'oneci', label: 'ONECI', count: users.filter((u) => u.oneci_verified).length },
    {
      id: 'facial',
      label: 'Facial',
      count: users.filter((u) => u.facial_verification_status !== 'none').length,
    },
  ];

  const userTypeFilters = [
    {
      id: 'locataire',
      label: 'Locataires',
      count: users.filter((u) => u.user_type === 'locataire').length,
    },
    {
      id: 'proprietaire',
      label: 'Propriétaires',
      count: users.filter((u) => u.user_type === 'proprietaire').length,
    },
    { id: 'agence', label: 'Agences', count: users.filter((u) => u.user_type === 'agence').length },
    {
      id: 'admin_ansut',
      label: 'Admins',
      count: users.filter((u) => u.user_type === 'admin_ansut').length,
    },
    {
      id: 'trust_agent',
      label: 'Agents',
      count: users.filter((u) => u.user_type === 'trust_agent').length,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TrustAgentPageHeader title="Utilisateurs Certifiés" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <TrustAgentPageHeader
        title="Utilisateurs Certifiés"
        subtitle={`${filteredAndSortedUsers.length} utilisateur${filteredAndSortedUsers.length > 1 ? 's' : ''} trouvé${filteredAndSortedUsers.length > 1 ? 's' : ''}`}
        breadcrumbs={[
          { label: 'Tableau de bord', onClick: () => navigate('/trust-agent/dashboard') },
          { label: 'Certifications' },
          { label: 'Utilisateurs' },
        ]}
        badges={
          activeFilter !== 'all'
            ? [
                {
                  label:
                    verificationFilters.find((f) => f.id === activeFilter)?.label || activeFilter,
                },
              ]
            : []
        }
        actions={[
          {
            label: 'Exporter',
            icon: <Download className="h-4 w-4" />,
            onClick: exportUsers,
            variant: 'outline',
          },
          {
            label: 'Actualiser',
            icon: <UserCheck className="h-4 w-4" />,
            onClick: loadCertifiedUsers,
            variant: 'ghost',
          },
        ]}
        showSearch
        onSearch={setSearchQuery}
        searchPlaceholder="Rechercher par nom, email, téléphone..."
      />

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {kpiData.map((kpi, index) => (
            <KPICard key={index} {...kpi} />
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Statut de vérification</h3>
            <div className="flex flex-wrap gap-2">
              {verificationFilters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id as FilterType)}
                  className={cn(
                    'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    activeFilter === filter.id
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  )}
                >
                  {filter.label}
                  <span
                    className={cn(
                      'text-xs px-1.5 py-0.5 rounded-full',
                      activeFilter === filter.id
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-100 text-gray-500'
                    )}
                  >
                    {filter.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Type d'utilisateur</h3>
            <div className="flex flex-wrap gap-2">
              {userTypeFilters.map((filter) => {
                const config = USER_TYPE_CONFIG[filter.id];
                const Icon = config?.icon;
                return (
                  <button
                    key={filter.id}
                    onClick={() => setActiveFilter(filter.id as FilterType)}
                    className={cn(
                      'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                      activeFilter === filter.id
                        ? 'bg-primary-500 text-white shadow-sm'
                        : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    )}
                  >
                    {Icon && (
                      <span className={activeFilter === filter.id ? 'text-white' : 'text-gray-500'}>
                        <Icon className="h-4 w-4" />
                      </span>
                    )}
                    {filter.label}
                    <span
                      className={cn(
                        'text-xs px-1.5 py-0.5 rounded-full',
                        activeFilter === filter.id
                          ? 'bg-white/20 text-white'
                          : 'bg-gray-100 text-gray-500'
                      )}
                    >
                      {filter.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sort Options */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600">
            {filteredAndSortedUsers.length} résultat{filteredAndSortedUsers.length > 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Trier par:</span>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sort, order] = e.target.value.split('-');
                setSortBy(sort as 'name' | 'date' | 'score');
                setSortOrder(order as 'asc' | 'desc');
              }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="date-desc">Date (récent → ancien)</option>
              <option value="date-asc">Date (ancien → récent)</option>
              <option value="name-asc">Nom (A → Z)</option>
              <option value="name-desc">Nom (Z → A)</option>
              <option value="score-desc">Score (élevé → bas)</option>
              <option value="score-asc">Score (bas → élevé)</option>
            </select>
          </div>
        </div>

        {/* Users List */}
        {filteredAndSortedUsers.length > 0 ? (
          <div className="space-y-3">
            {filteredAndSortedUsers.map((user) => {
              const statusKey = getVerificationStatus(user);
              const statusConfig = VERIFICATION_STATUS_CONFIG[statusKey];
              const userTypeConfig = USER_TYPE_CONFIG[user.user_type || ''] || {
                label: user.user_type || 'Inconnu',
                icon: Users,
                color: 'bg-gray-100 text-gray-700',
              };
              const UserTypeIcon = userTypeConfig.icon;
              const verificationScore = getVerificationScore(user);

              return (
                <div
                  key={user.id}
                  className={cn(
                    'group relative bg-white rounded-xl border border-gray-200 p-5 transition-all duration-200 cursor-pointer',
                    'hover:shadow-lg hover:border-primary-200 hover:-translate-y-0.5',
                    user.is_verified && 'border-l-4 border-l-green-500',
                    activeFilter !== 'verified' &&
                      !user.is_verified &&
                      (user.oneci_verified || user.facial_verification_status !== 'none') &&
                      'border-l-4 border-l-amber-500',
                    'active:scale-[0.99]'
                  )}
                  onClick={() => navigate(`/trust-agent/certification/${user.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/trust-agent/certification/${user.id}`);
                    }
                  }}
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.full_name || ''}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xl font-bold text-primary-600">
                          {((user.full_name || user.email || '?')[0] || '?').toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">
                            {user.full_name || 'Nom non renseigné'}
                          </h3>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>

                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <Badge className={cn(statusConfig.bg, statusConfig.text, 'border-0')}>
                            <span
                              className={cn('w-1.5 h-1.5 rounded-full mr-1.5', statusConfig.dot)}
                            />
                            {statusConfig.label}
                          </Badge>
                          <div className="text-2xl font-bold text-primary-600">
                            {verificationScore}%
                          </div>
                        </div>
                      </div>

                      {/* User Type & Contact Info */}
                      <div className="flex flex-wrap items-center gap-3 mt-3">
                        <Badge className={userTypeConfig.color}>
                          <UserTypeIcon className="h-3 w-3 mr-1" />
                          {userTypeConfig.label}
                        </Badge>

                        {user.phone && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                            <Phone className="h-3 w-3" />
                            {user.phone}
                          </span>
                        )}
                        {user.city && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                            <MapPin className="h-3 w-3" />
                            {user.city}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="h-3 w-3" />
                          {user.created_at
                            ? new Date(user.created_at).toLocaleDateString('fr-FR')
                            : 'Date inconnue'}
                        </span>
                      </div>

                      {/* Verification Badges */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {user.is_verified && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">
                            <CheckCircle2 className="h-3 w-3" />
                            Identité vérifiée
                          </span>
                        )}
                        {user.oneci_verified && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                            <Shield className="h-3 w-3" />
                            ONECI vérifié
                          </span>
                        )}
                        {user.facial_verification_status === 'verified' && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                            <UserCheck className="h-3 w-3" />
                            Facial vérifié
                          </span>
                        )}
                        {!user.is_verified &&
                          !user.oneci_verified &&
                          user.facial_verification_status === 'none' && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                              <AlertCircle className="h-3 w-3" />
                              Aucune vérification
                            </span>
                          )}
                      </div>
                    </div>

                    {/* Chevron */}
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary-500 transition-colors flex-shrink-0 mt-1" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<Users />}
            title="Aucun utilisateur trouvé"
            description={
              searchQuery || activeFilter !== 'all'
                ? 'Essayez de modifier vos critères de recherche ou de filtre'
                : "Aucun utilisateur n'est enregistré pour le moment"
            }
            variant="search"
            actionLabel={activeFilter !== 'all' ? 'Effacer les filtres' : undefined}
            onAction={activeFilter !== 'all' ? () => setActiveFilter('all') : undefined}
          />
        )}
      </main>
    </div>
  );
}
