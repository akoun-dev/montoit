import { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Calendar,
  X,
  ChevronDown,
  Building2,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/shared/useSafeToast';
import ApplicationCard from '../../features/owner/components/ApplicationCard';
import {
  getOwnerApplications,
  getApplicationStats,
  getOwnerProperties,
  acceptApplication,
  rejectApplication,
  scheduleVisitFromApplication,
  reopenApplication,
  ApplicationWithDetails,
  ApplicationStats,
} from '@/services/applications/applicationService';
import {
  notifyApplicationAccepted,
  notifyApplicationRejected,
  notifyVisitScheduled,
} from '@/services/notifications/applicationNotificationService';

interface VisitFormData {
  date: string;
  time: string;
  type: 'physique' | 'virtuelle';
  notes: string;
}

// Period filter type
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

export default function OwnerApplicationsPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([]);
  const [stats, setStats] = useState<ApplicationStats>({
    total: 0,
    pending: 0,
    inProgress: 0,
    accepted: 0,
    rejected: 0,
  });
  const [properties, setProperties] = useState<{ id: string; title: string }[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Period filter states
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  // Modals
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithDetails | null>(
    null
  );
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [visitApplicationId, setVisitApplicationId] = useState<string | null>(null);
  const [visitForm, setVisitForm] = useState<VisitFormData>({
    date: '',
    time: '10:00',
    type: 'physique',
    notes: '',
  });

  useEffect(() => {
    if (!user) {
      navigate('/connexion');
      return;
    }

    if (profile && profile.user_type !== 'owner' && profile.user_type !== 'proprietaire') {
      navigate('/dashboard');
      return;
    }

    loadData();
  }, [user, profile, navigate, statusFilter, propertyFilter, searchTerm]);

  // Filter applications by period
  const filteredByPeriod = useMemo(() => {
    if (periodFilter === 'all') return applications;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return applications.filter((app) => {
      const submittedDate = app.created_at ? new Date(app.created_at) : null;
      if (!submittedDate) return false;

      switch (periodFilter) {
        case 'last_7_days':
          return submittedDate >= new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        case 'last_30_days':
          return submittedDate >= new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        case 'last_3_months':
          return submittedDate >= new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
        case 'last_6_months':
          return submittedDate >= new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000);
        case 'last_year':
          return submittedDate >= new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
        case 'custom':
          if (!customStartDate || !customEndDate) return true;
          const start = new Date(customStartDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          return submittedDate >= start && submittedDate <= end;
        default:
          return true;
      }
    });
  }, [applications, periodFilter, customStartDate, customEndDate]);

  // Combine all filters for the final displayed applications
  const displayedApplications = filteredByPeriod;

  const loadData = async () => {
    if (!user) return;

    try {
      const [applicationsData, statsData, propertiesData] = await Promise.all([
        getOwnerApplications(user.id, {
          status: statusFilter !== 'all' ? statusFilter : undefined,
          propertyId: propertyFilter !== 'all' ? propertyFilter : undefined,
          searchTerm: searchTerm || undefined,
        }),
        getApplicationStats(user.id),
        getOwnerProperties(user.id),
      ]);

      setApplications(applicationsData);
      setStats(statsData);
      setProperties(propertiesData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (applicationId: string) => {
    const application = applications.find((a) => a.id === applicationId);
    if (application?.status === 'refusee') {
      // Rouvrir la candidature
      setActionLoading(true);
      try {
        await reopenApplication(applicationId);
        toast.success('Candidature rouverte');
        loadData();
      } catch {
        toast.error('Erreur lors de la réouverture');
      } finally {
        setActionLoading(false);
      }
      return;
    }

    setActionLoading(true);
    try {
      await acceptApplication(applicationId);
      // Send notification to applicant
      try {
        await notifyApplicationAccepted(applicationId);
      } catch (notifError) {
        console.error('Failed to send acceptance notification:', notifError);
      }
      toast.success('Candidature acceptée ! Vous pouvez maintenant créer un contrat.');
      loadData();
    } catch {
      toast.error("Erreur lors de l'acceptation");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (applicationId: string) => {
    setActionLoading(true);
    try {
      await rejectApplication(applicationId);
      // Send notification to applicant
      try {
        await notifyApplicationRejected(applicationId);
      } catch (notifError) {
        console.error('Failed to send rejection notification:', notifError);
      }
      toast.success('Candidature refusée');
      loadData();
    } catch {
      toast.error('Erreur lors du refus');
    } finally {
      setActionLoading(false);
    }
  };

  const handleScheduleVisit = (applicationId: string) => {
    setVisitApplicationId(applicationId);
    setShowVisitModal(true);
  };

  const submitVisit = async () => {
    if (!visitApplicationId || !visitForm.date || !visitForm.time) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setActionLoading(true);
    try {
      await scheduleVisitFromApplication(visitApplicationId, visitForm);
      // Send notification to applicant with visit date
      try {
        const visitDateTime = `${new Date(visitForm.date).toLocaleDateString('fr-FR')} à ${visitForm.time}`;
        await notifyVisitScheduled(visitApplicationId, visitDateTime);
      } catch (notifError) {
        console.error('Failed to send visit notification:', notifError);
      }
      toast.success('Visite planifiée avec succès');
      setShowVisitModal(false);
      setVisitApplicationId(null);
      setVisitForm({ date: '', time: '10:00', type: 'physique', notes: '' });
      loadData();
    } catch {
      toast.error('Erreur lors de la planification');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] bg-neutral-50 flex items-center justify-center rounded-2xl">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="bg-[#2C1810]">
        <div className="w-full px-2 sm:px-4 lg:px-6 xl:px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#F16522] flex items-center justify-center">
              <Users className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Candidatures</h1>
              <p className="text-[#E8D4C5] mt-1">Gérez les candidatures pour vos biens</p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-2 sm:px-4 lg:px-6 xl:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
          <button
            onClick={() => setStatusFilter('all')}
            className={`bg-white rounded-2xl p-4 border-2 transition-all ${statusFilter === 'all' ? 'border-primary-500 shadow-md' : 'border-transparent hover:border-neutral-200'}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-primary-500" />
              <span className="text-xs text-neutral-500">Total</span>
            </div>
            <p className="text-2xl font-bold text-neutral-900">{stats.total}</p>
          </button>

          <button
            onClick={() => setStatusFilter('en_attente')}
            className={`bg-white rounded-2xl p-4 border-2 transition-all ${statusFilter === 'en_attente' ? 'border-amber-500 shadow-md' : 'border-transparent hover:border-neutral-200'}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-neutral-500">En attente</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
          </button>

          <button
            onClick={() => setStatusFilter('en_cours')}
            className={`bg-white rounded-2xl p-4 border-2 transition-all ${statusFilter === 'en_cours' ? 'border-blue-500 shadow-md' : 'border-transparent hover:border-neutral-200'}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Loader2 className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-neutral-500">En cours</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
          </button>

          <button
            onClick={() => setStatusFilter('acceptee')}
            className={`bg-white rounded-2xl p-4 border-2 transition-all ${statusFilter === 'acceptee' ? 'border-green-500 shadow-md' : 'border-transparent hover:border-neutral-200'}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-xs text-neutral-500">Acceptées</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
          </button>

          <button
            onClick={() => setStatusFilter('refusee')}
            className={`bg-white rounded-2xl p-4 border-2 transition-all ${statusFilter === 'refusee' ? 'border-red-500 shadow-md' : 'border-transparent hover:border-neutral-200'}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-xs text-neutral-500">Refusées</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-neutral-400" />
            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="border border-neutral-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Toutes les propriétés</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
              className="flex items-center gap-2 px-4 py-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 hover:bg-neutral-50 transition-colors min-w-[200px] justify-between"
            >
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-neutral-400" />
                <span className="text-sm text-neutral-700">
                  {periodFilter !== 'all'
                    ? PERIOD_FILTERS.find((f) => f.value === periodFilter)?.label || 'Période'
                    : 'Période'}
                </span>
              </div>
              <ChevronDown className={`h-4 w-4 text-neutral-400 transition-transform ${showPeriodDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showPeriodDropdown && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-neutral-200 rounded-xl shadow-lg z-50">
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
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {/* Custom date range inputs */}
                {periodFilter === 'custom' && (
                  <div className="p-4 border-t border-neutral-100 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-1">
                        Date de début
                      </label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-1">
                        Date de fin
                      </label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Active Filters Display */}
        {(statusFilter !== 'all' || propertyFilter !== 'all' || searchTerm !== '' || periodFilter !== 'all') && (
          <div className="bg-primary-50 border border-primary-200 rounded-xl p-3 mb-6 flex flex-wrap items-center gap-2">
            <span className="text-sm text-primary-700 font-medium">Filtres actifs :</span>
            {statusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-primary-300 rounded-full text-sm text-primary-700">
                <Clock className="h-3 w-3" />
                {statusFilter === 'en_attente'
                  ? 'En attente'
                  : statusFilter === 'en_cours'
                    ? 'En cours'
                    : statusFilter === 'acceptee'
                      ? 'Acceptées'
                      : statusFilter === 'refusee'
                        ? 'Refusées'
                        : statusFilter}
                <button
                  onClick={() => setStatusFilter('all')}
                  className="ml-1 text-primary-400 hover:text-primary-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {propertyFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-primary-300 rounded-full text-sm text-primary-700">
                <Building2 className="h-3 w-3" />
                {properties.find((p) => p.id === propertyFilter)?.title || 'Propriété'}
                <button
                  onClick={() => setPropertyFilter('all')}
                  className="ml-1 text-primary-400 hover:text-primary-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {searchTerm !== '' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-primary-300 rounded-full text-sm text-primary-700">
                <Search className="h-3 w-3" />
                "{searchTerm}"
                <button
                  onClick={() => setSearchTerm('')}
                  className="ml-1 text-primary-400 hover:text-primary-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {periodFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-primary-300 rounded-full text-sm text-primary-700">
                <Calendar className="h-3 w-3" />
                {PERIOD_FILTERS.find((f) => f.value === periodFilter)?.label || 'Période'}
                <button
                  onClick={() => {
                    setPeriodFilter('all');
                    setCustomStartDate('');
                    setCustomEndDate('');
                  }}
                  className="ml-1 text-primary-400 hover:text-primary-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Applications List */}
        {displayedApplications.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {displayedApplications.map((application) => (
              <ApplicationCard
                key={application.id}
                application={application}
                onAccept={handleAccept}
                onReject={handleReject}
                onScheduleVisit={handleScheduleVisit}
                onViewDetails={setSelectedApplication}
                loading={actionLoading}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center">
            <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-10 w-10 text-neutral-400" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Aucune candidature</h3>
            <p className="text-neutral-500">
              {statusFilter !== 'all' || propertyFilter !== 'all' || searchTerm !== '' || periodFilter !== 'all'
                ? 'Aucune candidature ne correspond aux critères de filtration'
                : "Vous n'avez pas encore reçu de candidatures pour vos biens."}
            </p>
          </div>
        )}
      </div>

      {/* Visit Scheduling Modal */}
      {showVisitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary-500" />
                Planifier une visite
              </h3>
              <button
                onClick={() => setShowVisitModal(false)}
                className="p-1 hover:bg-neutral-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Date de visite *
                </label>
                <input
                  type="date"
                  value={visitForm.date}
                  onChange={(e) => setVisitForm({ ...visitForm, date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Heure *</label>
                <select
                  value={visitForm.time}
                  onChange={(e) => setVisitForm({ ...visitForm, time: e.target.value })}
                  className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {[
                    '08:00',
                    '09:00',
                    '10:00',
                    '11:00',
                    '14:00',
                    '15:00',
                    '16:00',
                    '17:00',
                    '18:00',
                  ].map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Type de visite
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="visitType"
                      value="physique"
                      checked={visitForm.type === 'physique'}
                      onChange={() => setVisitForm({ ...visitForm, type: 'physique' })}
                      className="text-primary-500 focus:ring-primary-500"
                    />
                    <span className="text-sm">Physique</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="visitType"
                      value="virtuelle"
                      checked={visitForm.type === 'virtuelle'}
                      onChange={() => setVisitForm({ ...visitForm, type: 'virtuelle' })}
                      className="text-primary-500 focus:ring-primary-500"
                    />
                    <span className="text-sm">Virtuelle</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Notes (optionnel)
                </label>
                <textarea
                  value={visitForm.notes}
                  onChange={(e) => setVisitForm({ ...visitForm, notes: e.target.value })}
                  placeholder="Instructions particulières..."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowVisitModal(false)}
                className="flex-1 py-2.5 border border-neutral-200 text-neutral-700 rounded-xl font-medium hover:bg-neutral-50"
              >
                Annuler
              </button>
              <button
                onClick={submitVisit}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Application Details Modal */}
      {selectedApplication && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-neutral-900">Détails de la candidature</h3>
                <button
                  onClick={() => setSelectedApplication(null)}
                  className="p-1 hover:bg-neutral-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Applicant info */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden">
                    {selectedApplication.applicant?.avatar_url ? (
                      <img
                        src={selectedApplication.applicant.avatar_url}
                        alt={selectedApplication.applicant.full_name || ''}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users className="h-8 w-8 text-primary-500" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">
                      {selectedApplication.applicant?.full_name || 'Candidat'}
                    </h4>
                    <p className="text-neutral-500">{selectedApplication.applicant?.email}</p>
                    {selectedApplication.applicant?.phone && (
                      <p className="text-neutral-500">{selectedApplication.applicant.phone}</p>
                    )}
                  </div>
                </div>

                {/* Property */}
                <div className="bg-neutral-50 rounded-xl p-4">
                  <p className="text-sm text-neutral-500 mb-1">Propriété</p>
                  <p className="font-semibold">{selectedApplication.property?.title}</p>
                  <p className="text-sm text-neutral-600">{selectedApplication.property?.city}</p>
                  <p className="text-primary-600 font-bold mt-1">
                    {selectedApplication.property?.monthly_rent?.toLocaleString()} FCFA/mois
                  </p>
                </div>

                {/* Score */}
                {(selectedApplication.applicant?.trust_score ||
                  selectedApplication.application_score) && (
                  <div className="bg-neutral-50 rounded-xl p-4">
                    <p className="text-sm text-neutral-500 mb-2">Score de confiance</p>
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-neutral-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full ${
                            (selectedApplication.applicant?.trust_score ??
                              selectedApplication.application_score ??
                              0) >= 70
                              ? 'bg-green-500'
                              : (selectedApplication.applicant?.trust_score ??
                                    selectedApplication.application_score ??
                                    0) >= 50
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                          }`}
                          style={{
                            width: `${selectedApplication.applicant?.trust_score ?? selectedApplication.application_score ?? 0}%`,
                          }}
                        />
                      </div>
                      <span className="font-bold text-lg">
                        {selectedApplication.applicant?.trust_score ??
                          selectedApplication.application_score}
                        /100
                      </span>
                    </div>
                  </div>
                )}

                {/* Cover letter */}
                {selectedApplication.cover_letter && (
                  <div>
                    <p className="text-sm text-neutral-500 mb-2">Lettre de motivation</p>
                    <p className="text-neutral-700 bg-neutral-50 rounded-xl p-4 italic">
                      "{selectedApplication.cover_letter}"
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedApplication(null)}
                className="w-full mt-6 py-2.5 bg-neutral-100 text-neutral-700 rounded-xl font-medium hover:bg-neutral-200"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
