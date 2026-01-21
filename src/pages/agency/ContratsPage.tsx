import { useEffect, useMemo, useState } from 'react';
import {
  FileText,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Home,
  User,
  Search,
  Filter,
  Download,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/shared/config/routes.config';

interface Contract {
  id: string;
  contract_number: string;
  tenant_name: string;
  tenant_email: string | null;
  tenant_phone: string | null;
  property_title: string;
  property_city: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  status: string;
  signed_at: string | null;
  deposit_amount: number | null;
  charges_amount: number | null;
}

const STATUS_FILTERS = [
  { id: 'all', label: 'Tous' },
  { id: 'actif', label: 'Actifs' },
  { id: 'en_attente_signature', label: 'En attente signature' },
  { id: 'expire', label: 'Expirés' },
  { id: 'resilie', label: 'Résiliés' },
  { id: 'brouillon', label: 'Brouillons' },
];

export default function ContratsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (user) {
      loadContracts();
    }
  }, [user]);

  const loadContracts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const selectVariants = [
        `
        id,
        contract_number,
        monthly_rent,
        deposit_amount,
        charges_amount,
        start_date,
        end_at,
        status,
        properties ( title, city ),
        tenant:profiles!lease_contracts_tenant_id_fkey ( full_name, email, phone )
      `,
        `
        id,
        contract_number,
        monthly_rent,
        deposit_amount,
        charges_amount,
        start_date,
        end_at,
        status,
        properties ( title, city ),
        tenant:profiles!lease_contracts_tenant_id_fkey ( full_name, email, phone )
      `,
        `
        id,
        contract_number,
        monthly_rent,
        deposit_amount,
        charges_amount,
        status,
        created_at,
        properties ( title, city ),
        tenant:profiles!lease_contracts_tenant_id_fkey ( full_name, email, phone )
      `,
      ];

      let contractsData: any[] | null = null;
      let lastError: any = null;

      for (const columns of selectVariants) {
        const { data, error } = await supabase
          .from('lease_contracts')
          .select(columns)
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });

        if (!error) {
          contractsData = data || [];
          lastError = null;
          break;
        }

        lastError = error;
        if ((error as any).code !== '42703') {
          break; // autre erreur: on sort
        }
      }

      if (lastError && !contractsData) {
        console.warn('Contrats agences: schéma incompatible, aucune donnée chargée', lastError);
        setContracts([]);
        return;
      }

      const formatted: Contract[] = (contractsData || []).map((c: any) => {
        const start = c.start_date || c.created_at || '';
        const end = c.end_at || c.created_at || '';
        return {
          id: c.id,
          contract_number: c.contract_number || '—',
          tenant_name: c.tenant?.full_name || 'Locataire inconnu',
          tenant_email: c.tenant?.email || null,
          tenant_phone: c.tenant?.phone || null,
          property_title: c.properties?.title || 'Propriété inconnue',
          property_city: c.properties?.city || '',
          start_date: start,
          end_date: end,
          monthly_rent: c.monthly_rent || 0,
          status: c.status || 'inconnu',
          signed_at: c.signed_at || null,
          deposit_amount: c.deposit_amount,
          charges_amount: c.charges_amount,
        };
      });

      setContracts(formatted);
    } catch (err) {
      console.error('Erreur lors du chargement des contrats:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredContracts = useMemo(() => {
    const base = filter === 'all' ? contracts : contracts.filter((c) => c.status === filter);
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter(
      (c) =>
        c.contract_number.toLowerCase().includes(q) ||
        c.tenant_name.toLowerCase().includes(q) ||
        c.property_title.toLowerCase().includes(q) ||
        c.property_city.toLowerCase().includes(q)
    );
  }, [contracts, filter, search]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'actif':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'expire':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'en_attente_signature':
        return <Clock className="h-5 w-5 text-amber-600" />;
      case 'resilie':
        return <XCircle className="h-5 w-5 text-gray-500" />;
      case 'brouillon':
        return <Clock className="h-5 w-5 text-gray-400" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'actif':
        return 'bg-green-100 text-green-700';
      case 'expire':
        return 'bg-red-100 text-red-700';
      case 'en_attente_signature':
        return 'bg-amber-100 text-amber-700';
      case 'resilie':
        return 'bg-gray-100 text-gray-700';
      case 'brouillon':
        return 'bg-gray-100 text-gray-500';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'actif':
        return 'Actif';
      case 'expire':
        return 'Expiré';
      case 'en_attente_signature':
        return 'En attente de signature';
      case 'resilie':
        return 'Résilié';
      case 'brouillon':
        return 'Brouillon';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-[#2C1810] dashboard-header-animate rounded-2xl px-4 sm:px-6 lg:px-8 py-6 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#F16522] flex items-center justify-center icon-pulse-premium shadow-md">
              <FileText className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Contrats de location</h1>
              <p className="text-[#E8D4C5] mt-1">Gérez les contrats de vos biens en gestion</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#6B5A4E]" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un contrat..."
                className="pl-10 pr-4 py-2 rounded-xl border border-[#EFEBE9] bg-white focus:outline-none focus:ring-2 focus:ring-[#F16522]"
              />
            </div>
            <button className="bg-white text-[#F16522] hover:bg-[#F16522] hover:text-white font-semibold py-2 px-4 rounded-xl transition-colors flex items-center gap-2 shadow-sm">
              <Filter className="h-4 w-4" />
              Filtrer
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total contrats" value={contracts.length} icon={FileText} />
        <StatCard
          label="Contrats actifs"
          value={contracts.filter((c) => c.status === 'actif').length}
          icon={CheckCircle}
          accent="green"
        />
        <StatCard
          label="En attente signature"
          value={contracts.filter((c) => c.status === 'en_attente_signature').length}
          icon={Clock}
          accent="amber"
        />
        <StatCard
          label="Contrats expirés"
          value={contracts.filter((c) => c.status === 'expire').length}
          icon={XCircle}
          accent="red"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((item) => (
          <button
            key={item.id}
            onClick={() => setFilter(item.id)}
            className={`px-4 py-2 rounded-xl font-medium ${
              filter === item.id
                ? 'bg-[#F16522] text-white'
                : 'bg-white text-[#6B5A4E] border border-[#EFEBE9]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Contracts List */}
      <div className="bg-white rounded-[20px] border border-[#EFEBE9] overflow-hidden">
        <div className="p-6 border-b border-[#EFEBE9] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#2C1810]">Liste des contrats</h2>
            <p className="text-[#6B5A4E] mt-1">
              {filteredContracts.length} contrat{filteredContracts.length !== 1 ? 's' : ''} trouvé
              {filteredContracts.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-[#F16522] text-white rounded-xl font-medium hover:bg-[#d9571d] transition-colors flex items-center gap-2">
              <Download className="h-4 w-4" />
              Exporter
            </button>
            <Link
              to={ROUTES.AGENCY_CONTRACTS.CREATE.split(':')[0]}
              className="px-4 py-2 bg-white border border-[#F16522] text-[#F16522] rounded-xl font-medium hover:bg-[#FFF5F0] transition-colors"
            >
              + Nouveau contrat
            </Link>
          </div>
        </div>

        {filteredContracts.length > 0 ? (
          <div className="divide-y divide-[#EFEBE9]">
            {filteredContracts.map((contract) => (
              <div key={contract.id} className="p-6 hover:bg-[#FAF7F4] transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-[#F16522]/10 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-[#F16522]" />
                      </div>
                      <div>
                        <h3 className="font-bold text-[#2C1810] text-lg">
                          {contract.contract_number}
                        </h3>
                        <p className="text-[#6B5A4E]">
                          {contract.property_title} • {contract.property_city}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <InfoRow
                        icon={<User className="h-4 w-4 text-[#6B5A4E]" />}
                        label="Locataire"
                        value={contract.tenant_name}
                      />
                      <InfoRow
                        icon={<Calendar className="h-4 w-4 text-[#6B5A4E]" />}
                        label="Période"
                        value={`${new Date(contract.start_date).toLocaleDateString('fr-FR')} - ${new Date(contract.end_date).toLocaleDateString('fr-FR')}`}
                      />
                      <InfoRow
                        icon={<DollarSign className="h-4 w-4 text-[#6B5A4E]" />}
                        label="Loyer"
                        value={`${contract.monthly_rent.toLocaleString()} FCFA/mois`}
                      />
                      <InfoRow
                        icon={<Home className="h-4 w-4 text-[#6B5A4E]" />}
                        label="Dépôt"
                        value={
                          contract.deposit_amount
                            ? `${contract.deposit_amount.toLocaleString()} FCFA`
                            : 'Non défini'
                        }
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div
                      className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(contract.status)} flex items-center gap-2`}
                    >
                      {getStatusIcon(contract.status)}
                      {getStatusLabel(contract.status)}
                    </div>
                    <div className="flex gap-2">
                      <Link
                        to={`/agences/contrats/${contract.id}`}
                        className="px-4 py-2 bg-white border border-[#F16522] text-[#F16522] rounded-xl font-medium hover:bg-[#FFF5F0] transition-colors"
                      >
                        Détails
                      </Link>
                      <button className="px-4 py-2 bg-[#F16522] text-white rounded-xl font-medium hover:bg-[#d9571d] transition-colors">
                        Télécharger
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center text-[#6B5A4E]">
            <p className="font-semibold text-[#2C1810] mb-2">Aucun contrat trouvé</p>
            <p className="text-sm">Ajoutez un contrat ou ajustez vos filtres.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent = 'orange',
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: 'orange' | 'green' | 'amber' | 'red';
}) {
  const bg =
    accent === 'green'
      ? 'bg-green-100 text-green-700'
      : accent === 'amber'
        ? 'bg-amber-100 text-amber-700'
        : accent === 'red'
          ? 'bg-red-100 text-red-700'
          : 'bg-[#FFF5F0] text-[#F16522]';

  return (
    <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9] card-animate-in card-hover-premium">
      <div className="flex items-center gap-3 mb-2">
        <div className={`${bg} p-2 rounded-xl`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-sm text-[#6B5A4E]">{label}</span>
      </div>
      <p className="text-3xl font-bold text-[#2C1810]">{value}</p>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-sm text-[#6B5A4E]">
        <span className="font-medium">{label} :</span> {value}
      </span>
    </div>
  );
}
