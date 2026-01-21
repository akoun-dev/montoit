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
  MoreVertical,
  ChevronRight,
  ChevronDown,
  Filter,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { formatAddress } from '@/shared/utils/address';

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

const STATUS_LABELS: Record<string, string> = {
  en_attente: 'En attente',
  confirmee: 'Confirmée',
  annulee: 'Annulée',
  terminee: 'Terminée',
};

const STATUS_STYLES: Record<string, string> = {
  en_attente: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmee: 'bg-green-50 text-green-700 border-green-200',
  annulee: 'bg-red-50 text-red-700 border-red-200',
  terminee: 'bg-blue-50 text-blue-700 border-blue-200',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  en_attente: <Clock className="h-4 w-4" />,
  confirmee: <Check className="h-4 w-4" />,
  annulee: <X className="h-4 w-4" />,
  terminee: <Calendar className="h-4 w-4" />,
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
      await loadVisits();
    } catch (err) {
      console.error('Erreur lors de la confirmation:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelVisit = async (visitId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette visite ?')) return;

    setActionLoading(visitId);
    try {
      const { error } = await supabase
        .from('visit_requests')
        .update({ status: 'annulee' })
        .eq('id', visitId)
        .eq('owner_id', user?.id);

      if (error) throw error;
      await loadVisits();
    } catch (err) {
      console.error('Erreur lors de l\'annulation:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const isUpcoming = (visit: VisitRow) => {
    const visitDate = new Date(`${visit.visit_date}T${visit.visit_time || '12:00'}`);
    return visitDate >= new Date() && visit.status !== 'annulee' && visit.status !== 'terminee';
  };

  const title = mode === 'agency' ? 'Visites programmées' : 'Mes visites programmées';
  const subtitle =
    mode === 'agency'
      ? 'Consultez les visites prévues pour les biens de votre agence'
      : 'Suivez les visites planifiées pour vos propriétés';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-[#2C1810] dashboard-header-animate rounded-2xl px-4 sm:px-6 lg:px-8 py-6 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#F16522] flex items-center justify-center icon-pulse-premium shadow-md">
              <Calendar className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{title}</h1>
              <p className="text-[#E8D4C5] mt-1">{subtitle}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-xl font-semibold ${
                filter === 'all'
                  ? 'bg-white text-[#F16522]'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Toutes
            </button>
            <button
              onClick={() => setFilter('upcoming')}
              className={`px-4 py-2 rounded-xl font-semibold ${
                filter === 'upcoming'
                  ? 'bg-white text-[#F16522]'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              À venir
            </button>
            <button
              onClick={() => setFilter('past')}
              className={`px-4 py-2 rounded-xl font-semibold ${
                filter === 'past'
                  ? 'bg-white text-[#F16522]'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Passées/annulées
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total" value={stats.total} icon={<Calendar className="h-5 w-5" />} color="gray" />
        <StatCard label="À venir" value={stats.upcoming} icon={<Clock className="h-5 w-5" />} color="orange" />
        <StatCard label="En attente" value={stats.pending} icon={<Clock className="h-5 w-5" />} color="amber" />
        <StatCard label="Confirmées" value={stats.confirmed} icon={<Check className="h-5 w-5" />} color="green" />
        <StatCard label="Annulées" value={stats.cancelled} icon={<X className="h-5 w-5" />} color="red" />
      </div>

      {/* Period Filter */}
      <div className="bg-white rounded-[20px] border border-[#EFEBE9] p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-[#6B5A4E]" />
            <span className="text-sm font-medium text-[#2C1810]">Filtrer par période :</span>
          </div>
          <div className="relative flex-1 sm:flex-none">
            <button
              onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#EFEBE9] rounded-xl hover:bg-[#FBFAF9] transition-colors min-w-[200px] justify-between"
            >
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#6B5A4E]" />
                <span className="text-sm text-[#2C1810]">
                  {periodFilter !== 'all'
                    ? PERIOD_FILTERS.find((f) => f.value === periodFilter)?.label || 'Période'
                    : 'Toutes les périodes'}
                </span>
              </div>
              <ChevronDown className={`h-4 w-4 text-[#6B5A4E] transition-transform ${showPeriodDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showPeriodDropdown && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-[#EFEBE9] rounded-xl shadow-lg z-50">
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
                          ? 'bg-[#FFF5F0] text-[#F16522]'
                          : 'text-[#2C1810] hover:bg-[#FBFAF9]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {/* Custom date range inputs */}
                {periodFilter === 'custom' && (
                  <div className="p-4 border-t border-[#EFEBE9] space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-[#2C1810] mb-1">
                        Date de début
                      </label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-[#EFEBE9] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F16522]/20 focus:border-[#F16522]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#2C1810] mb-1">
                        Date de fin
                      </label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-[#EFEBE9] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F16522]/20 focus:border-[#F16522]"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Active filters display */}
          {periodFilter !== 'all' && (
            <div className="flex items-center gap-2 px-4 py-2 bg-[#FFF5F0] border border-[#F16522]/10 rounded-xl">
              <span className="text-sm font-medium text-[#F16522]">
                {PERIOD_FILTERS.find((f) => f.value === periodFilter)?.label}
              </span>
              <button
                onClick={() => {
                  setPeriodFilter('all');
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
                className="text-[#F16522] hover:text-[#d9571d]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-[20px] border border-[#EFEBE9] overflow-hidden shadow-sm">
        <div className="p-6 border-b border-[#EFEBE9] flex items-center justify-between bg-gradient-to-r from-[#FBFAF9] to-white">
          <div>
            <h2 className="text-xl font-bold text-[#2C1810]">Visites programmées</h2>
            <p className="text-[#6B5A4E] mt-1">
              {displayedVisits.length} visite{displayedVisits.length > 1 ? 's' : ''} affichée{displayedVisits.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F16522]" />
          </div>
        ) : displayedVisits.length === 0 ? (
          <div className="text-center py-16 px-6">
            <div className="w-20 h-20 bg-[#FFF5F0] rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="h-10 w-10 text-[#F16522]" />
            </div>
            <h3 className="text-xl font-semibold text-[#2C1810] mb-3">Aucune visite</h3>
            <p className="text-[#6B5A4E] max-w-md mx-auto">
              {filter !== 'all' || periodFilter !== 'all'
                ? 'Aucune visite ne correspond aux critères de filtration'
                : 'Vous n\'avez aucune visite programmée.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#EFEBE9]">
            {displayedVisits.map((visit) => {
              const statusKey = visit.status || 'en_attente';
              const upcoming = isUpcoming(visit);
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
                  className={`p-6 transition-all ${
                    upcoming ? 'bg-gradient-to-r from-[#FFF8F3] to-white hover:shadow-md' : 'hover:bg-[#FAF7F4]'
                  }`}
                >
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                    {/* Left: Property info */}
                    <div className="flex items-start gap-4 flex-1">
                      {/* Property image or placeholder */}
                      <div className="flex-shrink-0">
                        {visit.property?.main_image ? (
                          <img
                            src={visit.property.main_image}
                            alt={visit.property.title || 'Propriété'}
                            className="w-24 h-24 xl:w-32 xl:h-32 rounded-2xl object-cover shadow-sm"
                          />
                        ) : (
                          <div className="w-24 h-24 xl:w-32 xl:h-32 rounded-2xl bg-gradient-to-br from-[#F16522]/20 to-[#F16522]/5 flex items-center justify-center">
                            <Home className="h-10 w-10 text-[#F16522]/60" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <h3 className="text-lg font-bold text-[#2C1810] mb-1">
                              {visit.property?.title || 'Propriété'}
                            </h3>
                            <p className="text-[#6B5A4E] flex items-center gap-1.5 text-sm">
                              <MapPin className="h-4 w-4 flex-shrink-0" />
                              {visit.property?.address
                                ? formatAddress(visit.property.address)
                                : visit.property?.city || 'Adresse non renseignée'}
                            </p>
                          </div>
                          <span
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border flex-shrink-0 ${STATUS_STYLES[statusKey] || STATUS_STYLES['en_attente']}`}
                          >
                            {STATUS_ICONS[statusKey] || STATUS_ICONS['en_attente']}
                            {STATUS_LABELS[statusKey] || statusKey}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm">
                          <div className="flex items-center gap-2 text-[#2C1810] font-semibold">
                            <Calendar className="h-4 w-4 text-[#F16522]" />
                            <span>{formattedDate}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[#2C1810] font-semibold">
                            <Clock className="h-4 w-4 text-[#F16522]" />
                            <span>{formattedTime}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[#6B5A4E]">
                            <Video
                              className={`h-4 w-4 ${visit.visit_type === 'virtuelle' ? 'text-blue-500' : 'text-gray-400'}`}
                            />
                            <span>
                              {visit.visit_type === 'virtuelle' ? 'Visite virtuelle' : 'Visite physique'}
                            </span>
                          </div>
                        </div>

                        {visit.notes && (
                          <div className="mt-3 p-3 bg-[#FFF5F0] rounded-xl border border-[#F16522]/10">
                            <p className="text-sm text-[#6B5A4E]">{visit.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Tenant info & actions */}
                    <div className="flex xl:flex-col gap-4 justify-between xl:justify-start xl:min-w-[280px]">
                      {/* Tenant card */}
                      <div className="bg-gradient-to-br from-[#FAF7F4] to-white border border-[#EFEBE9] rounded-xl p-4 xl:w-full">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-full bg-[#F16522] flex items-center justify-center">
                            <User className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-sm font-semibold text-[#6B5A4E]">Visiteur</span>
                        </div>
                        <p className="text-[#2C1810] font-semibold mb-2">
                          {visit.tenant?.full_name || 'Candidat inconnu'}
                        </p>
                        <div className="space-y-1.5">
                          {visit.tenant?.email && (
                            <a
                              href={`mailto:${visit.tenant.email}`}
                              className="flex items-center gap-2 text-sm text-[#6B5A4E] hover:text-[#F16522] transition-colors"
                            >
                              <Mail className="h-3.5 w-3.5" />
                              <span className="truncate">{visit.tenant.email}</span>
                            </a>
                          )}
                          {visit.tenant?.phone && (
                            <a
                              href={`tel:${visit.tenant.phone}`}
                              className="flex items-center gap-2 text-sm text-[#6B5A4E] hover:text-[#F16522] transition-colors"
                            >
                              <Phone className="h-3.5 w-3.5" />
                              <span>{visit.tenant.phone}</span>
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      {upcoming && visit.status !== 'annulee' && (
                        <div className="flex xl:flex-col gap-2">
                          {visit.status === 'en_attente' && (
                            <button
                              onClick={() => handleConfirmVisit(visit.id)}
                              disabled={actionLoading === visit.id}
                              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading === visit.id ? (
                                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                              ) : (
                                <>
                                  <Check className="h-4 w-4" />
                                  Confirmer
                                </>
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => handleCancelVisit(visit.id)}
                            disabled={actionLoading === visit.id}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {actionLoading === visit.id ? (
                              <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full" />
                            ) : (
                              <>
                                <X className="h-4 w-4" />
                                Annuler
                              </>
                            )}
                          </button>
                        </div>
                      )}
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

function StatCard({
  label,
  value,
  icon,
  color = 'gray',
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
  color?: 'gray' | 'orange' | 'amber' | 'green' | 'red' | 'blue';
}) {
  const colors = {
    gray: 'bg-gray-50 text-gray-600 border-gray-100',
    orange: 'bg-[#FFF5F0] text-[#F16522] border-[#F16522]/10',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
  };

  return (
    <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9] card-animate-in card-hover-premium hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2.5 rounded-xl border ${colors[color]}`}>{icon}</div>
      </div>
      <p className="text-3xl font-bold text-[#2C1810]">{value}</p>
      <p className="text-sm text-[#6B5A4E] mt-1">{label}</p>
    </div>
  );
}


export default function OwnerVisitsPage() {
  return <VisitsPage mode="owner" />;
}

export function AgencyVisitsPage() {
  return <VisitsPage mode="agency" />;
}
