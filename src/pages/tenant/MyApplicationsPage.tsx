import { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useNavigate, Link } from 'react-router-dom';
import TenantDashboardLayout from '../../features/tenant/components/TenantDashboardLayout';
import TenantApplicationCard from '../../features/tenant/components/TenantApplicationCard';
import {
  getTenantApplications,
  getTenantApplicationStats,
  cancelApplication,
  type TenantApplicationWithDetails,
  type ApplicationStats,
} from '@/services/applications/applicationService';
import { toast } from 'sonner';

type StatusFilter = 'all' | 'en_attente' | 'en_cours' | 'acceptee' | 'refusee' | 'annulee';

export default function MyApplicationsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [applications, setApplications] = useState<TenantApplicationWithDetails[]>([]);
  const [stats, setStats] = useState<ApplicationStats>({
    total: 0,
    pending: 0,
    inProgress: 0,
    accepted: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate('/connexion');
      return;
    }

    loadData();
  }, [user, authLoading, navigate]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [applicationsData, statsData] = await Promise.all([
        getTenantApplications(user.id),
        getTenantApplicationStats(user.id),
      ]);
      setApplications(applicationsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading applications:', error);
      toast.error('Erreur lors du chargement des candidatures');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelApplication = async (applicationId: string) => {
    try {
      setCancelingId(applicationId);
      await cancelApplication(applicationId);
      toast.success('Candidature annulée avec succès');
      await loadData();
    } catch (error) {
      console.error('Error canceling application:', error);
      toast.error("Erreur lors de l'annulation");
    } finally {
      setCancelingId(null);
    }
  };

  // Filtrage des candidatures
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      // Filtre par statut
      if (statusFilter !== 'all' && app.status !== statusFilter) {
        return false;
      }

      // Filtre par recherche
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          app.property?.title?.toLowerCase().includes(term) ||
          app.property?.city?.toLowerCase().includes(term) ||
          app.owner?.full_name?.toLowerCase().includes(term)
        );
      }

      return true;
    });
  }, [applications, statusFilter, searchTerm]);

  const statusOptions: { value: StatusFilter; label: string; color: string }[] = [
    { value: 'all', label: 'Toutes', color: 'bg-neutral-100 text-neutral-700' },
    { value: 'en_attente', label: 'En attente', color: 'bg-amber-100 text-amber-700' },
    { value: 'en_cours', label: 'En cours', color: 'bg-blue-100 text-blue-700' },
    { value: 'acceptee', label: 'Acceptées', color: 'bg-green-100 text-green-700' },
    { value: 'refusee', label: 'Refusées', color: 'bg-red-100 text-red-700' },
  ];

  if (authLoading || loading) {
    return (
      <TenantDashboardLayout title="Mes Candidatures">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </TenantDashboardLayout>
    );
  }

  return (
    <TenantDashboardLayout title="Mes Candidatures">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-[#2C1810] rounded-[20px] p-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#F16522] flex items-center justify-center">
              <Users className="h-6 w-6 text-white" />
            </div>
            <span>Mes Candidatures</span>
          </h1>
          <p className="text-[#E8D4C5] mt-2 ml-15">Suivez toutes vos demandes de location</p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div
            onClick={() => setStatusFilter('all')}
            className={`bg-white rounded-xl p-4 border cursor-pointer transition-all hover:border-primary-300 ${
              statusFilter === 'all'
                ? 'border-primary-500 ring-2 ring-primary-100'
                : 'border-neutral-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-neutral-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">{stats.total}</p>
                <p className="text-xs text-neutral-500">Total</p>
              </div>
            </div>
          </div>

          <div
            onClick={() => setStatusFilter('en_attente')}
            className={`bg-white rounded-xl p-4 border cursor-pointer transition-all hover:border-amber-300 ${
              statusFilter === 'en_attente'
                ? 'border-amber-500 ring-2 ring-amber-100'
                : 'border-neutral-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                <p className="text-xs text-neutral-500">En attente</p>
              </div>
            </div>
          </div>

          <div
            onClick={() => setStatusFilter('acceptee')}
            className={`bg-white rounded-xl p-4 border cursor-pointer transition-all hover:border-green-300 ${
              statusFilter === 'acceptee'
                ? 'border-green-500 ring-2 ring-green-100'
                : 'border-neutral-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
                <p className="text-xs text-neutral-500">Acceptées</p>
              </div>
            </div>
          </div>

          <div
            onClick={() => setStatusFilter('refusee')}
            className={`bg-white rounded-xl p-4 border cursor-pointer transition-all hover:border-red-300 ${
              statusFilter === 'refusee'
                ? 'border-red-500 ring-2 ring-red-100'
                : 'border-neutral-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                <p className="text-xs text-neutral-500">Refusées</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 border border-neutral-200">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
              <input
                type="text"
                placeholder="Rechercher par propriété, ville ou propriétaire..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <Filter className="h-4 w-4 text-neutral-400 flex-shrink-0" />
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setStatusFilter(option.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    statusFilter === option.value
                      ? option.color + ' ring-2 ring-offset-1 ring-neutral-300'
                      : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Applications List */}
        {filteredApplications.length === 0 ? (
          <div className="bg-white rounded-xl p-12 border border-neutral-200 text-center">
            <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-10 w-10 text-neutral-400" />
            </div>
            {applications.length === 0 ? (
              <>
                <h3 className="text-xl font-bold text-neutral-900 mb-2">Aucune candidature</h3>
                <p className="text-neutral-500 mb-6">
                  Vous n'avez pas encore postulé à un logement. Commencez votre recherche !
                </p>
                <Link
                  to="/recherche"
                  className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                >
                  <Search className="h-5 w-5" />
                  Rechercher un logement
                </Link>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold text-neutral-900 mb-2">Aucun résultat</h3>
                <p className="text-neutral-500">
                  Aucune candidature ne correspond à vos critères de recherche.
                </p>
                <button
                  onClick={() => {
                    setStatusFilter('all');
                    setSearchTerm('');
                  }}
                  className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
                >
                  Réinitialiser les filtres
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map((application) => (
              <TenantApplicationCard
                key={application.id}
                application={application}
                onCancel={handleCancelApplication}
                isCanceling={cancelingId === application.id}
              />
            ))}
          </div>
        )}
      </div>
    </TenantDashboardLayout>
  );
}
