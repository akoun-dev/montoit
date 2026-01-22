import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  Video,
  Home,
  Check,
  X,
  ChevronDown,
  Filter,
  Loader2,
  Building2,
  Video as VideoIcon,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { formatAddress } from '@/shared/utils/address';
import { toast } from 'sonner';

type VisitsMode = 'owner' | 'agency';
type Filter = 'all' | 'upcoming' | 'past';

// Period filter for visits
type PeriodFilter = 'all' | 'last_7_days' | 'last_30_days' | 'last_3_months' | 'last_6_months' | 'last_year' | 'custom';

interface PeriodFilterOption {
  value: PeriodFilter;
  label: string;
}

const PERIOD_FILTERS: PeriodFilterOption[] = [
  { value: 'all', label: 'Toutes les périodes' },
  { value: 'last_7_days', label: '7 derniers jours' },
  { value: 'last_30_days', label: '30 derniers jours' },
  { value: 'last_3_months', label: '3 derniers mois' },
  { value: 'last_6_months', label: '6 derniers mois' },
  { value: 'last_year', label: 'Dernière année' },
  { value: 'custom', label: 'Personnalisé' },
];

interface VisitRow {
  id: string;
  visit_date: string;
  visit_time: string | null;
  visit_type: string | null;
  status: string | null;
  notes: string | null;
  tenant_id?: string | null;
  confirmed_date?: string | null;
  property: {
    id: string;
    title: string | null;
    city: string | null;
    address: any;
    main_image: string | null;
  } | null;
  tenant?: {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

interface TenantProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
}

// Status configuration
const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: any }
> = {
  en_attente: {
    label: 'En attente',
    color: 'text-amber-700',
    bg: 'bg-amber-100',
    icon: Clock,
  },
  confirmee: {
    label: 'Confirmée',
    color: 'text-green-700',
    bg: 'bg-green-100',
    icon: Check,
  },
  annulee: {
    label: 'Annulée',
    color: 'text-red-700',
    bg: 'bg-red-100',
    icon: X,
  },
  terminee: {
    label: 'Terminée',
    color: 'text-blue-700',
    bg: 'bg-blue-100',
    icon: Calendar,
  },
};

// Helper components
const StatCard = ({
  icon: Icon,
  label,
  value,
  color = 'gray',
}: {
  icon: any;
  label: string;
  value: number;
  color?: 'gray' | 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'amber';
}) => {
  const colors = {
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
  };

  return (
    <div className={`p-5 rounded-xl border ${colors[color]}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${color === 'gray' ? 'bg-gray-200' : 'bg-white'}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.en_attente;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${config.bg} ${config.color}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
};

function VisitsPage({ mode }: { mode: VisitsMode }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [visits, setVisits] = useState<VisitRow[]>([]);

  // Period filter states
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadVisits();
  }, [user]);

  const loadVisits = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('visit_requests')
        .select(
          `
          id,
          confirmed_date,
          visit_type,
          status,
          notes,
          tenant_id,
          property:properties (
            id,
            title,
            city,
            address,
            main_image
          )
        `
        )
        .eq('owner_id', user.id)
        .order('confirmed_date', { ascending: true });

      if (error) throw error;

      const rows = ((data as VisitRow[]) || []).map((row) => {
        const confirmed = (row as any).confirmed_date || '';
        const [d, t] = confirmed ? confirmed.split('T') : ['', ''];
        const date = d || '';
        const time = t ? t.replace('Z', '') : null;
        return {
          ...row,
          visit_date: date,
          visit_time: time,
        };
      });

      // Récupérer les profils des locataires si besoin
      const tenantIds = Array.from(
        new Set(rows.map((row) => row.tenant_id).filter((id): id is string => !!id))
      );
      let tenantsMap = new Map<string, TenantProfile>();
      if (tenantIds.length > 0) {
        const { data: tenantsData, error: tenantsError } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone')
          .in('id', tenantIds);
        if (!tenantsError && tenantsData) {
          tenantsMap = new Map(tenantsData.map((t) => [t.id, t]));
        }
      }

      const enriched = rows.map((row) => ({
        ...row,
        tenant: row.tenant_id ? tenantsMap.get(row.tenant_id) || null : null,
      }));

      setVisits(enriched);
    } catch (err) {
      console.error('Erreur lors du chargement des visites', err);
      toast.error('Erreur lors du chargement des visites');
      setVisits([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredVisits = useMemo(() => {
    if (filter === 'all') return visits;

    const now = new Date();
    return visits.filter((visit) => {
      const visitDate = new Date(`${visit.visit_date}T${visit.visit_time || '12:00'}`);
      if (filter === 'upcoming') {
        return (
          visitDate >= now &&
          (visit.status === 'en_attente' || visit.status === 'confirmee' || !visit.status)
        );
      }
      return visitDate < now || visit.status === 'terminee' || visit.status === 'annulee';
    });
  }, [filter, visits]);

  // Filter visits by period
  const filteredByPeriod = useMemo(() => {
    if (periodFilter === 'all') return filteredVisits;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return filteredVisits.filter((visit) => {
      const visitDate = new Date(`${visit.visit_date}T${visit.visit_time || '12:00'}`);

      switch (periodFilter) {
        case 'last_7_days':
          return visitDate >= new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) &&
                 visitDate <= now;
        case 'last_30_days':
          return visitDate >= new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000) &&
                 visitDate <= now;
        case 'last_3_months':
          return visitDate >= new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000) &&
                 visitDate <= now;
        case 'last_6_months':
          return visitDate >= new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000) &&
                 visitDate <= now;
        case 'last_year':
          return visitDate >= new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000) &&
                 visitDate <= now;
        case 'custom':
          if (!customStartDate || !customEndDate) return true;
          const start = new Date(customStartDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          return visitDate >= start && visitDate <= end;
        default:
          return true;
      }
    });
  }, [filteredVisits, periodFilter, customStartDate, customEndDate]);

  // Final displayed visits combining all filters
  const displayedVisits = filteredByPeriod;

  const stats = useMemo(() => {
    const upcoming = visits.filter((v) => {
      const date = new Date(`${v.visit_date}T${v.visit_time || '12:00'}`);
      return date >= new Date() && v.status !== 'annulee';
    }).length;
    const pending = visits.filter((v) => v.status === 'en_attente').length;
    const confirmed = visits.filter((v) => v.status === 'confirmee').length;
    const past = visits.length - upcoming;
    const cancelled = visits.filter((v) => v.status === 'annulee').length;
    return { total: visits.length, upcoming, pending, confirmed, past, cancelled };
  }, [visits]);

  const handleConfirmVisit = async (visitId: string) => {
    setActionLoading(visitId);
    try {
      const { error } = await supabase
        .from('visit_requests')
        .update({ status: 'confirmee' })
        .eq('id', visitId)
        .eq('owner_id', user?.id);

      if (error) throw error;
      toast.success('Visite confirmée avec succès');
      await loadVisits();
    } catch (err) {
      console.error('Erreur lors de la confirmation:', err);
      toast.error('Erreur lors de la confirmation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelVisit = async (visitId: string) => {
    setActionLoading(visitId);
    try {
      const { error } = await supabase
        .from('visit_requests')
        .update({ status: 'annulee' })
        .eq('id', visitId)
        .eq('owner_id', user?.id);

      if (error) throw error;
      toast.success('Visite annulée');
      await loadVisits();
    } catch (err) {
      console.error('Erreur lors de l\'annulation:', err);
      toast.error('Erreur lors de l\'annulation');
    } finally {
      setActionLoading(null);
    }
  };

  const isUpcoming = (visit: VisitRow) => {
    const visitDate = new Date(`${visit.visit_date}T${visit.visit_time || '12:00'}`);
    return visitDate >= new Date() && visit.status !== 'annulee' && visit.status !== 'terminee';
  };

  const title = mode === 'agency' ? 'Visites programmées' : 'Mes visites';
  const subtitle =
    mode === 'agency'
      ? 'Consultez les visites prévues pour les biens de votre agence'
      : 'Suivez les visites planifiées pour vos propriétés';

  if (!user) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Veuillez vous connecter</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#2C1810] rounded-2xl shadow-sm mb-8">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#F16522] flex items-center justify-center">
              <Calendar className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{title}</h1>
              <p className="text-[#E8D4C5]">{subtitle}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard
            icon={Calendar}
            label="Total"
            value={stats.total}
          />
          <StatCard
            icon={Clock}
            label="À venir"
            value={stats.upcoming}
            color="orange"
          />
          <StatCard
            icon={Clock}
            label="En attente"
            value={stats.pending}
            color="amber"
          />
          <StatCard
            icon={Check}
            label="Confirmées"
            value={stats.confirmed}
            color="green"
          />
          <StatCard
            icon={Calendar}
            label="Passées"
            value={stats.past}
            color="blue"
          />
          <StatCard
            icon={X}
            label="Annulées"
            value={stats.cancelled}
            color="red"
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Status filters */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === 'all'
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Toutes
              </button>
              <button
                onClick={() => setFilter('upcoming')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === 'upcoming'
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                À venir
              </button>
              <button
                onClick={() => setFilter('past')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === 'past'
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Passées
              </button>
            </div>

            {/* Period filter dropdown */}
            <div className="relative lg:ml-auto">
              <button
                onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Calendar className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">
                  {periodFilter !== 'all'
                    ? PERIOD_FILTERS.find((f) => f.value === periodFilter)?.label || 'Période'
                    : 'Toutes les périodes'}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${showPeriodDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showPeriodDropdown && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
                  <div className="p-2 space-y-1">
                    {PERIOD_FILTERS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setPeriodFilter(option.value);
                          setShowPeriodDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          periodFilter === option.value
                            ? 'bg-orange-50 text-orange-600'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  {/* Custom date range inputs */}
                  {periodFilter === 'custom' && (
                    <div className="p-4 border-t border-gray-200 space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Date de début
                        </label>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Date de fin
                        </label>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Visits List */}
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 flex items-center justify-center shadow-sm">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          </div>
        ) : displayedVisits.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center shadow-sm">
            <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Aucune visite</h3>
            <p className="text-gray-500">
              {filter !== 'all' || periodFilter !== 'all'
                ? 'Aucune visite ne correspond aux critères de filtration'
                : 'Vous n\'avez aucune visite programmée.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedVisits.map((visit) => {
              const statusKey = visit.status || 'en_attente';
              const upcoming = isUpcoming(visit);
              const isLoading = actionLoading === visit.id;

              const formattedDate = new Date(
                `${visit.visit_date}T${visit.visit_time || '12:00'}`
              ).toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              });
              const formattedTime = new Date(
                `${visit.visit_date}T${visit.visit_time || '12:00'}`
              ).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={visit.id}
                  className={`bg-white rounded-xl shadow-sm border transition-all overflow-hidden ${
                    upcoming ? 'border-orange-200 hover:shadow-md' : 'border-gray-100 hover:shadow-md'
                  }`}
                >
                  <div className="p-5">
                    <div className="flex flex-col lg:flex-row gap-5">
                      {/* Property Image */}
                      <div className="lg:w-44 h-36 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                        {visit.property?.main_image ? (
                          <img
                            src={visit.property.main_image}
                            alt={visit.property.title || 'Propriété'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Building2 className="h-10 w-10 text-gray-300" />
                          </div>
                        )}
                      </div>

                      {/* Visit Info */}
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Building2 className="w-4 h-4 text-orange-500 flex-shrink-0" />
                              <span className="font-semibold text-gray-900">
                                {visit.property?.title || 'Propriété'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <MapPin className="w-3.5 h-3.5" />
                              <span className="truncate">
                                {visit.property?.address
                                  ? formatAddress(visit.property.address)
                                  : visit.property?.city || 'Adresse non renseignée'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <StatusBadge status={statusKey} />
                            {visit.visit_type === 'virtuelle' && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                <VideoIcon className="w-3.5 h-3.5" />
                                Virtuelle
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Date & Time */}
                        <div className="flex flex-wrap gap-4 mb-3">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-orange-500" />
                            <span className="font-medium text-gray-900">{formattedDate}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-orange-500" />
                            <span className="font-medium text-gray-900">{formattedTime}</span>
                          </div>
                        </div>

                        {/* Notes */}
                        {visit.notes && (
                          <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <p className="text-sm text-gray-600">{visit.notes}</p>
                          </div>
                        )}

                        {/* Tenant Info */}
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-3">
                          <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900">
                              {visit.tenant?.full_name || 'Candidat inconnu'}
                            </p>
                            <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                              {visit.tenant?.email && (
                                <a
                                  href={`mailto:${visit.tenant.email}`}
                                  className="flex items-center gap-1 hover:text-orange-500 transition-colors"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                  <span className="truncate">{visit.tenant.email}</span>
                                </a>
                              )}
                              {visit.tenant?.phone && (
                                <a
                                  href={`tel:${visit.tenant.phone}`}
                                  className="flex items-center gap-1 hover:text-orange-500 transition-colors"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                  <span>{visit.tenant.phone}</span>
                                </a>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        {upcoming && visit.status !== 'annulee' && (
                          <div className="flex gap-2">
                            {visit.status === 'en_attente' && (
                              <button
                                onClick={() => handleConfirmVisit(visit.id)}
                                disabled={isLoading}
                                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                              >
                                {isLoading ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <Check className="w-4 h-4" />
                                    Confirmer
                                  </>
                                )}
                              </button>
                            )}
                            <button
                              onClick={() => handleCancelVisit(visit.id)}
                              disabled={isLoading}
                              className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                              {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <X className="w-4 h-4" />
                                  Annuler
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
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


export default function OwnerVisitsPage() {
  return <VisitsPage mode="owner" />;
}

export function AgencyVisitsPage() {
  return <VisitsPage mode="agency" />;
}
