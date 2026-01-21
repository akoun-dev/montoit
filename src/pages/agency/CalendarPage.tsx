import { useEffect, useMemo, useState } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, User, Home, Plus } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { formatAddress } from '@/shared/utils/address';

interface VisitRow {
  id: string;
  confirmed_date: string | null;
  visit_type: string | null;
  status: string | null;
  notes: string | null;
  tenant_id?: string | null;
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

const STATUS_COLORS: Record<string, string> = {
  en_attente: 'border-amber-500 bg-amber-50 text-amber-700',
  confirmee: 'border-green-600 bg-green-50 text-green-700',
  annulee: 'border-red-500 bg-red-50 text-red-700',
  terminee: 'border-blue-500 bg-blue-50 text-blue-700',
};

export default function AgencyCalendarPage() {
  const { user } = useAuth();
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadVisits();
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

      const rows = ((data as VisitRow[]) || []).map((row) => ({
        ...row,
        confirmed_date: row.confirmed_date || null,
      }));

      // fetch tenant profiles if needed
      const tenantIds = Array.from(
        new Set(rows.map((r) => r.tenant_id).filter((id): id is string => !!id))
      );
      let tenantsMap = new Map<string, any>();
      if (tenantIds.length > 0) {
        const { data: tenantsData } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone')
          .in('id', tenantIds);
        tenantsMap = new Map((tenantsData || []).map((t: any) => [t.id, t]));
      }

      setVisits(
        rows.map((row) => ({
          ...row,
          tenant: row.tenant_id ? tenantsMap.get(row.tenant_id) || null : null,
        }))
      );
    } catch (err) {
      console.error('Erreur chargement visites agence', err);
      setVisits([]);
    } finally {
      setLoading(false);
    }
  };

  const upcomingVisits = useMemo(() => {
    const now = new Date();
    return visits
      .filter((v) => {
        const date = v.confirmed_date ? new Date(v.confirmed_date) : null;
        return (
          date &&
          date >= now &&
          (v.status === 'en_attente' || v.status === 'confirmee' || !v.status)
        );
      })
      .slice(0, 6);
  }, [visits]);

  const stats = useMemo(() => {
    return {
      total: visits.length,
      confirmed: visits.filter((v) => v.status === 'confirmee').length,
      pending: visits.filter((v) => v.status === 'en_attente').length,
      cancelled: visits.filter((v) => v.status === 'annulee').length,
    };
  }, [visits]);

  return (
    <div className="space-y-8">
      <div className="bg-[#2C1810] dashboard-header-animate rounded-2xl px-4 sm:px-6 lg:px-8 py-6 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#F16522] flex items-center justify-center icon-pulse-premium shadow-md">
              <CalendarIcon className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Calendrier des visites</h1>
              <p className="text-[#E8D4C5] mt-1">
                Suivez vos visites programmées et leurs statuts en un coup d'oeil
              </p>
            </div>
          </div>
          <button className="bg-white text-[#F16522] hover:bg-[#F16522] hover:text-white font-semibold py-2 px-4 rounded-xl transition-colors flex items-center gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            Ajouter une visite
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total" value={stats.total} accent="orange" />
        <StatCard label="Confirmées" value={stats.confirmed} accent="green" />
        <StatCard label="En attente" value={stats.pending} accent="amber" />
        <StatCard label="Annulées" value={stats.cancelled} accent="red" />
      </div>

      <div className="bg-white rounded-[20px] border border-[#EFEBE9] overflow-hidden">
        <div className="p-6 border-b border-[#EFEBE9] flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#2C1810]">Visites à venir</h2>
            <p className="text-[#6B5A4E] mt-1">
              {upcomingVisits.length} visite{upcomingVisits.length > 1 ? 's' : ''} planifiée
            </p>
          </div>
          <span className="text-sm text-[#6B5A4E]">
            {visits.length} au total • {stats.confirmed} confirmées
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F16522]" />
          </div>
        ) : upcomingVisits.length === 0 ? (
          <div className="p-10 text-center text-[#6B5A4E]">
            <p className="font-semibold text-[#2C1810] mb-2">Aucune visite programmée</p>
            <p className="text-sm">Planifiez une visite ou vérifiez vos filtres.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#EFEBE9]">
            {upcomingVisits.map((visit) => {
              const date = visit.confirmed_date ? new Date(visit.confirmed_date) : null;
              const formattedDate = date
                ? date.toLocaleDateString('fr-FR', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Date à confirmer';
              const statusClass =
                STATUS_COLORS[visit.status || 'en_attente'] || STATUS_COLORS.en_attente;
              return (
                <div key={visit.id} className="p-6 hover:bg-[#FAF7F4] transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${statusClass}`}
                      >
                        <CalendarIcon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-[#2C1810]">
                          {visit.property?.title || 'Propriété'}
                        </h3>
                        <p className="text-sm text-[#6B5A4E] flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {visit.property?.address
                            ? formatAddress(visit.property.address)
                            : visit.property?.city || 'Adresse non renseignée'}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-3 text-[#6B5A4E] text-sm">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formattedDate}
                          </span>
                          <span className="flex items-center gap-1">
                            <Home className="h-4 w-4" />
                            {visit.visit_type === 'virtuelle' ? 'Visite virtuelle' : 'En physique'}
                          </span>
                          {visit.tenant && (
                            <span className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              {visit.tenant.full_name || 'Candidat'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border ${statusClass}`}
                    >
                      {visit.status ? visit.status : 'En attente'}
                    </span>
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
  accent,
}: {
  label: string;
  value: number;
  accent: 'orange' | 'green' | 'amber' | 'red';
}) {
  const classes =
    accent === 'green'
      ? 'bg-green-100 text-green-700'
      : accent === 'amber'
        ? 'bg-amber-100 text-amber-700'
        : accent === 'red'
          ? 'bg-red-100 text-red-700'
          : 'bg-[#FFF5F0] text-[#F16522]';
  return (
    <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9] card-animate-in card-hover-premium">
      <div
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${classes}`}
      >
        {label}
      </div>
      <p className="text-3xl font-bold text-[#2C1810] mt-2">{value}</p>
    </div>
  );
}
