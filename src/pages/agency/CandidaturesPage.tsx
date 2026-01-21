import { useState, useEffect } from 'react';
import {
  Users,
  FileText,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { Link } from 'react-router-dom';
import {
  ApplicationWithDetails,
  getOwnerApplications,
} from '@/services/applications/applicationService';

export default function CandidaturesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    loadApplications();
  }, [user, filter, search]);

  const loadApplications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getOwnerApplications(user.id, {
        status: filter !== 'all' ? filter : undefined,
        searchTerm: search || undefined,
      });
      setApplications(data);
    } catch (error) {
      console.error('Erreur lors du chargement des candidatures:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredApplications =
    filter === 'all' ? applications : applications.filter((app) => app.status === filter);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'acceptee':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'refusee':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'en_cours':
        return <Clock className="h-5 w-5 text-amber-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'acceptee':
        return 'bg-green-100 text-green-700';
      case 'refusee':
        return 'bg-red-100 text-red-700';
      case 'en_cours':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'en_attente':
        return 'En attente';
      case 'acceptee':
        return 'Acceptée';
      case 'refusee':
        return 'Refusée';
      case 'en_cours':
        return 'En cours';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] bg-[#FAF7F4]">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F16522]" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FAF7F4]">
      {/* Header */}
      <div className="bg-[#2C1810] dashboard-header-animate rounded-2xl lg:rounded-[28px] px-4 sm:px-6 lg:px-8 py-6 shadow-lg mb-8">
        <div className="w-full">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#F16522] flex items-center justify-center icon-pulse-premium shadow-md">
                <Users className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Candidatures</h1>
                <p className="text-[#E8D4C5] mt-1">Gérez les demandes de location pour vos biens</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#6B5A4E]" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un candidat..."
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
      </div>

      {/* Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9] card-animate-in card-hover-premium">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-[#FFF5F0] p-2 rounded-xl">
                <FileText className="h-5 w-5 text-[#F16522]" />
              </div>
              <span className="text-sm text-[#6B5A4E]">Total candidatures</span>
            </div>
            <p className="text-3xl font-bold text-[#2C1810]">{applications.length}</p>
          </div>

          <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9] card-animate-in card-hover-premium">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-green-100 p-2 rounded-xl">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-sm text-[#6B5A4E]">Acceptées</span>
            </div>
            <p className="text-3xl font-bold text-[#2C1810]">
              {applications.filter((a) => a.status === 'acceptee').length}
            </p>
          </div>

          <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9] card-animate-in card-hover-premium">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-amber-100 p-2 rounded-xl">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <span className="text-sm text-[#6B5A4E]">En attente</span>
            </div>
            <p className="text-3xl font-bold text-[#2C1810]">
              {applications.filter((a) => a.status === 'en_attente').length}
            </p>
          </div>

          <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9] card-animate-in card-hover-premium">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-red-100 p-2 rounded-xl">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <span className="text-sm text-[#6B5A4E]">Refusées</span>
            </div>
            <p className="text-3xl font-bold text-[#2C1810]">
              {applications.filter((a) => a.status === 'refusee').length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl font-medium ${filter === 'all' ? 'bg-[#F16522] text-white' : 'bg-white text-[#6B5A4E] border border-[#EFEBE9]'}`}
          >
            Toutes
          </button>
          <button
            onClick={() => setFilter('en_attente')}
            className={`px-4 py-2 rounded-xl font-medium ${filter === 'en_attente' ? 'bg-[#F16522] text-white' : 'bg-white text-[#6B5A4E] border border-[#EFEBE9]'}`}
          >
            En attente
          </button>
          <button
            onClick={() => setFilter('acceptee')}
            className={`px-4 py-2 rounded-xl font-medium ${filter === 'acceptee' ? 'bg-[#F16522] text-white' : 'bg-white text-[#6B5A4E] border border-[#EFEBE9]'}`}
          >
            Acceptées
          </button>
          <button
            onClick={() => setFilter('refusee')}
            className={`px-4 py-2 rounded-xl font-medium ${filter === 'refusee' ? 'bg-[#F16522] text-white' : 'bg-white text-[#6B5A4E] border border-[#EFEBE9]'}`}
          >
            Refusées
          </button>
          <button
            onClick={() => setFilter('en_cours')}
            className={`px-4 py-2 rounded-xl font-medium ${filter === 'en_cours' ? 'bg-[#F16522] text-white' : 'bg-white text-[#6B5A4E] border border-[#EFEBE9]'}`}
          >
            En cours
          </button>
        </div>

        {/* Applications List */}
        <div className="bg-white rounded-[20px] border border-[#EFEBE9] overflow-hidden">
          <div className="p-6 border-b border-[#EFEBE9]">
            <h2 className="text-xl font-bold text-[#2C1810]">Liste des candidatures</h2>
            <p className="text-[#6B5A4E] mt-1">
              {filteredApplications.length} candidature
              {filteredApplications.length !== 1 ? 's' : ''} trouvée
              {filteredApplications.length !== 1 ? 's' : ''}
            </p>
          </div>

          {filteredApplications.length > 0 ? (
            <div className="divide-y divide-[#EFEBE9]">
              {filteredApplications.map((app) => (
                <div key={app.id} className="p-6 hover:bg-[#FAF7F4] transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-[#F16522]/10 flex items-center justify-center">
                          <Users className="h-5 w-5 text-[#F16522]" />
                        </div>
                        <div>
                          <h3 className="font-bold text-[#2C1810]">
                            {app.applicant?.full_name || 'Candidat inconnu'}
                          </h3>
                          <p className="text-sm text-[#6B5A4E]">{app.applicant?.email || '—'}</p>
                        </div>
                      </div>
                      <div className="ml-13">
                        <p className="text-[#6B5A4E]">
                          <span className="font-medium">Propriété :</span>{' '}
                          {app.property?.title || '—'} • {app.property?.city || '—'}
                        </p>
                        <p className="text-[#6B5A4E]">
                          <span className="font-medium">Loyer proposé :</span>{' '}
                          {(app.property?.monthly_rent || 0).toLocaleString()} FCFA/mois
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-sm text-[#6B5A4E] flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Soumis le {new Date(app.applied_at).toLocaleDateString('fr-FR')}
                          </span>
                          {app.applicant?.phone && (
                            <span className="text-sm text-[#6B5A4E]">
                              Tél: {app.applicant.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div
                        className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(app.status)} flex items-center gap-2`}
                      >
                        {getStatusIcon(app.status)}
                        {getStatusLabel(app.status)}
                      </div>
                      <div className="flex gap-2">
                        <Link
                          to={`/agences/candidatures/${app.id}`}
                          className="px-4 py-2 bg-[#F16522] text-white rounded-xl font-medium hover:bg-[#d9571d] transition-colors"
                        >
                          Voir dossier
                        </Link>
                        <button className="px-4 py-2 bg-white border border-[#EFEBE9] text-[#6B5A4E] rounded-xl font-medium hover:bg-[#FAF7F4]">
                          Actions
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-[#6B5A4E] mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-[#2C1810] mb-2">
                Aucune candidature trouvée
              </h3>
              <p className="text-[#6B5A4E] max-w-md mx-auto">
                {filter === 'all'
                  ? "Vous n'avez encore reçu aucune candidature pour vos biens."
                  : `Aucune candidature avec le statut "${getStatusLabel(filter)}".`}
              </p>
              <Link
                to="/agences/biens"
                className="inline-flex items-center gap-2 text-[#F16522] hover:underline font-semibold mt-4"
              >
                Voir mes biens
              </Link>
            </div>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-8 p-6 bg-[#FFF5F0] border border-[#F16522]/20 rounded-[20px]">
          <h3 className="font-bold text-[#2C1810] mb-2">Comment gérer les candidatures ?</h3>
          <p className="text-[#6B5A4E]">
            Examinez chaque dossier, contactez les candidats si nécessaire, puis acceptez ou refusez
            la demande. Une fois acceptée, vous pouvez passer à la création du contrat de location.
          </p>
        </div>
      </div>
    </div>
  );
}
