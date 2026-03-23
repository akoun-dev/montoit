import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Calendar,
  X,
  ChevronDown,
  Building2,
  FileText,
  Grid3x3,
  List,
  User,
  MapPin,
  Mail,
  Phone,
  Star,
  Eye,
  CalendarCheck,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
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
} from '@/services/notifications/applicationNotificationService';

interface VisitFormData {
  date: string;
  time: string;
  type: 'in_person' | 'virtual';
  notes: string;
}

interface VerificationDocument {
  id: string;
  document_type: string;
  document_url: string;
  verification_status: string | null;
  file_name: string | null;
  uploaded_at: string | null;
}

interface ApplicantVerificationState {
  loading: boolean;
  oneciVerified: boolean;
  neofaceVerified: boolean;
  dossierStatus: string | null;
  dossierRejectionReason: string | null;
  documents: VerificationDocument[];
  dossierAccessError: boolean;
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

// Status filter options
const STATUS_FILTERS = [
  { value: 'all', label: 'Toutes' },
  { value: 'pending', label: 'En attente' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'accepted', label: 'Acceptées' },
  { value: 'rejected', label: 'Refusées' },
];

// Status configuration
const STATUS_CONFIG = {
  pending: {
    label: 'En attente',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: Clock,
  },
  in_progress: {
    label: 'En cours',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: Loader2,
  },
  accepted: {
    label: 'Acceptée',
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: CheckCircle,
  },
  rejected: {
    label: 'Refusée',
    color: 'bg-red-100 text-red-700 border-red-200',
    icon: XCircle,
  },
};

const DOSSIER_DOCUMENT_LABELS: Record<string, string> = {
  id_card: "Carte d'identité",
  proof_of_income: 'Justificatif de revenus',
  proof_of_residence: 'Justificatif de domicile',
  bank_statement: 'Relevé bancaire',
};

const DOSSIER_STATUS_LABELS: Record<string, string> = {
  draft: 'Préparation',
  pending: 'En attente',
  in_review: 'En vérification',
  approved: 'Validé',
  rejected: 'Refusé',
  more_info_requested: 'Infos demandées',
};

const DOSSIER_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  in_review: 'bg-blue-100 text-blue-700 border-blue-200',
  approved: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  more_info_requested: 'bg-purple-100 text-purple-700 border-purple-200',
};

const DOCUMENT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  approved: 'Approuvé',
  rejected: 'Refusé',
};

const DOSSIER_TYPE_ALIASES = ['tenant', 'locataire'];
const matchesDossierType = (value?: string | null) => {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return DOSSIER_TYPE_ALIASES.some((alias) => normalized.includes(alias));
};

// Helper function to get proper download URL from Supabase storage
const getDownloadUrl = (documentUrl: string): string => {
  if (!documentUrl) return documentUrl;
  // Add download parameter to Supabase storage URLs
  try {
    const url = new URL(documentUrl);
    url.searchParams.set('download', 'true');
    return url.toString();
  } catch {
    // If URL parsing fails, return as-is
    return documentUrl;
  }
};

// Helper component
const StatCard = ({
  icon: Icon,
  label,
  value,
  color = 'gray',
  onClick,
}: {
  icon: unknown;
  label: string;
  value: number;
  color?: 'gray' | 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'amber';
  onClick?: () => void;
}) => {
  const colors = {
    gray: 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100',
    green: 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100',
    red: 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100',
  };

  return (
    <div
      onClick={onClick}
      className={`p-5 rounded-xl border transition-all cursor-pointer ${colors[color]}`}
    >
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

// Application Row Component for List View
const ApplicationRow = ({
  application,
  onAccept,
  onReject,
  onScheduleVisit,
  onViewDetails,
  loading,
}: {
  application: ApplicationWithDetails;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onScheduleVisit: (id: string) => void;
  onViewDetails: (app: ApplicationWithDetails) => void;
  loading: boolean;
}) => {
  const navigate = useNavigate();
  const statusConfig = STATUS_CONFIG[application.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-orange-300 hover:shadow-md transition-all overflow-hidden">
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Applicant Avatar */}
          <div className="flex-shrink-0">
            <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden border-2 border-orange-200">
              {application.applicant?.avatar_url ? (
                <img
                  src={application.applicant.avatar_url}
                  alt={application.applicant.full_name || ''}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="h-7 w-7 text-orange-500" />
              )}
            </div>
          </div>

          {/* Applicant Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-gray-900 truncate">
                  {application.applicant?.full_name || 'Candidat'}
                </h3>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
                  {application.applicant?.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {application.applicant.email}
                    </span>
                  )}
                  {application.applicant?.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {application.applicant.phone}
                    </span>
                  )}
                </div>
              </div>

              {/* Status Badge */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                <StatusIcon className="h-3.5 w-3.5" />
                {statusConfig.label}
              </div>
            </div>

            {/* Property Info */}
            <div className="mt-3 bg-gray-50 rounded-lg p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-1">Propriété</p>
                  <p className="font-medium text-gray-900 truncate">
                    {application.property?.title}
                  </p>
                  <p className="text-sm text-gray-600 flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" />
                    {application.property?.city}
                    {application.property?.neighborhood && ` • ${application.property.neighborhood}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 mb-1">Loyer</p>
                  <p className="font-bold text-orange-600">
                    {application.property?.monthly_rent?.toLocaleString()} FCFA
                  </p>
                </div>
              </div>
            </div>

            {/* Score & Additional Info */}
            <div className="mt-3 flex items-center gap-6">
              {/* Trust Score */}
              {(application.applicant?.trust_score || application.application_score) && (
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">
                    Score: {application.applicant?.trust_score ?? application.application_score}/100
                  </span>
                </div>
              )}

              {/* Application Date */}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="h-4 w-4" />
                <span>
                  {application.created_at
                    ? new Date(application.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'N/A'}
                </span>
              </div>

              {/* Cover Letter Preview */}
              {application.cover_letter && (
                <div className="flex items-center gap-1 text-sm text-gray-500 truncate flex-1">
                  <MessageSquare className="h-4 w-4 flex-shrink-0" />
                  <span className="italic truncate">"{application.cover_letter.substring(0, 50)}..."</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onViewDetails(application)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Eye className="h-4 w-4" />
              Voir détails
            </button>
            {(application.status === 'pending' || application.status === 'in_progress') && (
              <button
                onClick={() => onScheduleVisit(application.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <CalendarCheck className="h-4 w-4" />
                Visite
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {application.status === 'pending' && (
              <>
                <button
                  onClick={() => onAccept(application.id)}
                  disabled={loading}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Accepter
                </button>
                <button
                  onClick={() => onReject(application.id)}
                  disabled={loading}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                  Refuser
                </button>
              </>
            )}
            {application.status === 'rejected' && (
              <button
                onClick={() => onAccept(application.id)}
                disabled={loading}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Loader2 className="h-4 w-4" />}
                Rouvrir
              </button>
            )}
            {application.status === 'accepted' && (
              application.contract_id ? (
                <button
                  onClick={() => navigate(`/proprietaire/contrats/${application.contract_id}`)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-medium rounded-lg transition-all flex items-center gap-1.5 shadow-md hover:shadow-lg"
                >
                  <FileText className="h-4 w-4" />
                  Voir le contrat
                </button>
              ) : (
                <button
                  onClick={() => navigate(`/proprietaire/contrats/nouveau?applicationId=${application.id}`)}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-sm font-medium rounded-lg transition-all flex items-center gap-1.5 shadow-md hover:shadow-lg"
                >
                  <FileText className="h-4 w-4" />
                  Créer le contrat
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

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

  // View mode: grid or list
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

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
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithDetails | null>(null);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [visitApplicationId, setVisitApplicationId] = useState<string | null>(null);
  const [verificationState, setVerificationState] = useState<ApplicantVerificationState>({
    loading: false,
    oneciVerified: false,
    neofaceVerified: false,
    dossierStatus: null,
    dossierRejectionReason: null,
    documents: [],
    dossierAccessError: false,
  });
  const [visitForm, setVisitForm] = useState<VisitFormData>({
    date: '',
    time: '10:00',
    type: 'in_person',
    notes: '',
  });

  const loadData = useCallback(async () => {
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
  }, [user, statusFilter, propertyFilter, searchTerm]);

  useEffect(() => {
    if (!user) {
      navigate('/connexion');
      return;
    }

    if (profile && profile.user_type !== 'owner' && profile.user_type !== 'owner') {
      navigate('/dashboard');
      return;
    }

    loadData();
  }, [user, profile, navigate, statusFilter, propertyFilter, searchTerm, loadData]);

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
        case 'custom': {
          if (!customStartDate || !customEndDate) return true;
          const start = new Date(customStartDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          return submittedDate >= start && submittedDate <= end;
        }
        default:
          return true;
      }
    });
  }, [applications, periodFilter, customStartDate, customEndDate]);

  // Combine all filters for the final displayed applications
  const displayedApplications = filteredByPeriod;

  const loadVerificationDetails = async (tenantId: string) => {
    setVerificationState((prev) => ({ ...prev, loading: true }));

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('oneci_verified, facial_verification_status')
        .eq('id', tenantId)
        .maybeSingle();

      if (profileError) {
        console.warn('Failed to load applicant profile verification', profileError);
      }

      const { data: dossierData, error: dossierError } = await supabase
        .from('verification_applications')
        .select('id, status, rejection_reason, submitted_at, created_at, dossier_type')
        .eq('user_id', tenantId)
        .order('submitted_at', { ascending: false })
        .limit(5);

      if (dossierError) {
        console.warn('Failed to load applicant dossier', dossierError);
      }

      const dossierApp =
        dossierData?.find((app) => matchesDossierType(app.dossier_type)) ||
        dossierData?.[0] ||
        null;
      const isDraft =
        !!dossierApp?.submitted_at &&
        !!dossierApp?.created_at &&
        Math.abs(
          new Date(dossierApp.submitted_at).getTime() -
            new Date(dossierApp.created_at).getTime()
        ) < 1500;
      let documents: VerificationDocument[] = [];
      let documentsError = false;

      if (dossierApp) {
        const { data: docsData, error: docsError } = await supabase
          .from('verification_documents')
          .select('id, document_type, document_url, verification_status, file_name, uploaded_at')
          .eq('application_id', dossierApp.id)
          .order('uploaded_at', { ascending: false });

        if (docsError) {
          console.warn('Failed to load dossier documents', docsError);
          documentsError = true;
        }

        documents = (docsData as VerificationDocument[]) || [];
      }

      setVerificationState({
        loading: false,
        oneciVerified: !!profileData?.oneci_verified,
        neofaceVerified: profileData?.facial_verification_status === 'verified',
        dossierStatus: dossierApp ? (isDraft ? 'draft' : dossierApp.status) : null,
        dossierRejectionReason: dossierApp?.rejection_reason ?? null,
        documents,
        dossierAccessError: !!dossierError || documentsError,
      });
    } catch (error) {
      console.error('Error loading verification details:', error);
      setVerificationState((prev) => ({ ...prev, loading: false, dossierAccessError: true }));
    }
  };

  useEffect(() => {
    if (!selectedApplication) {
      setVerificationState({
        loading: false,
        oneciVerified: false,
        neofaceVerified: false,
        dossierStatus: null,
        dossierRejectionReason: null,
        documents: [],
        dossierAccessError: false,
      });
      return;
    }

    loadVerificationDetails(selectedApplication.tenant_id);
  }, [selectedApplication]);

  // Close period dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const periodDropdown = document.querySelector('[data-period-dropdown]');
      const periodButton = document.querySelector('[data-period-button]');

      if (
        showPeriodDropdown &&
        periodDropdown &&
        !periodDropdown.contains(target) &&
        periodButton &&
        !periodButton.contains(target)
      ) {
        setShowPeriodDropdown(false);
      }
    };

    if (showPeriodDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showPeriodDropdown]);

  const handleAccept = async (applicationId: string) => {
    const application = applications.find((a) => a.id === applicationId);
    if (application?.status === 'rejected') {
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
      toast.success('Visite planifiée avec succès');
      setShowVisitModal(false);
      setVisitApplicationId(null);
      setVisitForm({ date: '', time: '10:00', type: 'in_person', notes: '' });
      loadData();
    } catch {
      toast.error('Erreur lors de la planification');
    } finally {
      setActionLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Veuillez vous connecter</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#2C1810] rounded-2xl shadow-sm mb-8">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#F16522] flex items-center justify-center">
                <Users className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Candidatures</h1>
                <p className="text-[#E8D4C5]">Gérez les candidatures pour vos biens</p>
              </div>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-2 bg-white/10 rounded-xl p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-[#2C1810]'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
                title="Vue liste"
              >
                <List className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white text-[#2C1810]'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
                title="Vue grille"
              >
                <Grid3x3 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <StatCard
            icon={Users}
            label="Total"
            value={stats.total}
            onClick={() => setStatusFilter('all')}
          />
          <StatCard
            icon={Clock}
            label="En attente"
            value={stats.pending}
            color="amber"
            onClick={() => setStatusFilter('pending')}
          />
          <StatCard
            icon={Loader2}
            label="En cours"
            value={stats.inProgress}
            color="blue"
            onClick={() => setStatusFilter('in_progress')}
          />
          <StatCard
            icon={CheckCircle}
            label="Acceptées"
            value={stats.accepted}
            color="green"
            onClick={() => setStatusFilter('accepted')}
          />
          <StatCard
            icon={XCircle}
            label="Refusées"
            value={stats.rejected}
            color="red"
            onClick={() => setStatusFilter('rejected')}
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Status filters */}
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    statusFilter === filter.value
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Search and property filter */}
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              {properties.length > 0 && (
                <select
                  value={propertyFilter}
                  onChange={(e) => setPropertyFilter(e.target.value)}
                  className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 cursor-pointer"
                >
                  <option value="all">Toutes les propriétés</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              )}

              {/* Period filter dropdown */}
              <div className="relative" data-period-dropdown-container>
                <button
                  data-period-button
                  onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-700">
                    {periodFilter !== 'all'
                      ? PERIOD_FILTERS.find((f) => f.value === periodFilter)?.label || 'Période'
                      : 'Période'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${showPeriodDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showPeriodDropdown && (
                  <div
                    data-period-dropdown
                    className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50"
                  >
                    <div className="p-2 space-y-1">
                      {PERIOD_FILTERS.map((option) => (
                        <button
                          key={option.value}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (option.value === 'custom') {
                              setPeriodFilter('custom');
                              // Don't close dropdown for custom option
                            } else {
                              setPeriodFilter(option.value);
                              setShowPeriodDropdown(false);
                            }
                          }}
                          className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
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
                            onClick={(e) => e.stopPropagation()}
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
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                          />
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowPeriodDropdown(false);
                          }}
                          className="w-full py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-medium rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all"
                        >
                          Appliquer
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Active Filters Display */}
        {(statusFilter !== 'all' || propertyFilter !== 'all' || searchTerm !== '' || periodFilter !== 'all') && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-6 flex flex-wrap items-center gap-2">
            <span className="text-sm text-orange-700 font-medium">Filtres actifs :</span>
            {statusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-orange-300 rounded-full text-sm text-orange-700">
                <Clock className="h-3 w-3" />
                {STATUS_FILTERS.find((f) => f.value === statusFilter)?.label}
                <button
                  onClick={() => setStatusFilter('all')}
                  className="ml-1 text-orange-400 hover:text-orange-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {propertyFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-orange-300 rounded-full text-sm text-orange-700">
                <Building2 className="h-3 w-3" />
                {properties.find((p) => p.id === propertyFilter)?.title || 'Propriété'}
                <button
                  onClick={() => setPropertyFilter('all')}
                  className="ml-1 text-orange-400 hover:text-orange-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {searchTerm !== '' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-orange-300 rounded-full text-sm text-orange-700">
                <Search className="h-3 w-3" />
                "{searchTerm}"
                <button
                  onClick={() => setSearchTerm('')}
                  className="ml-1 text-orange-400 hover:text-orange-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {periodFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-orange-300 rounded-full text-sm text-orange-700">
                <Calendar className="h-3 w-3" />
                {PERIOD_FILTERS.find((f) => f.value === periodFilter)?.label}
                <button
                  onClick={() => {
                    setPeriodFilter('all');
                    setCustomStartDate('');
                    setCustomEndDate('');
                  }}
                  className="ml-1 text-orange-400 hover:text-orange-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Applications */}
        {displayedApplications.length > 0 ? (
          <div className={viewMode === 'list' ? 'space-y-4' : 'grid grid-cols-1 lg:grid-cols-2 gap-6'}>
            {displayedApplications.map((application) => (
              viewMode === 'list' ? (
                <ApplicationRow
                  key={application.id}
                  application={application}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  onScheduleVisit={handleScheduleVisit}
                  onViewDetails={setSelectedApplication}
                  loading={actionLoading}
                />
              ) : (
                <div
                  key={application.id}
                  className="bg-white rounded-xl border border-gray-200 hover:border-orange-300 hover:shadow-md transition-all overflow-hidden"
                >
                  <div className="p-5">
                    {/* Grid View Card Content */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden border-2 border-orange-200 flex-shrink-0">
                        {application.applicant?.avatar_url ? (
                          <img
                            src={application.applicant.avatar_url}
                            alt={application.applicant.full_name || ''}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="h-7 w-7 text-orange-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {application.applicant?.full_name || 'Candidat'}
                            </h3>
                            <p className="text-sm text-gray-500">{application.applicant?.email}</p>
                          </div>
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                            STATUS_CONFIG[application.status as keyof typeof STATUS_CONFIG]?.color ||
                            STATUS_CONFIG.pending.color
                          }`}>
                            {STATUS_CONFIG[application.status as keyof typeof STATUS_CONFIG]?.label ||
                              'En attente'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4 bg-gray-50 rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-900">
                        {application.property?.title}
                      </p>
                      <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {application.property?.city}
                      </p>
                      <p className="text-orange-600 font-bold mt-2">
                        {application.property?.monthly_rent?.toLocaleString()} FCFA/mois
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setSelectedApplication(application)}
                        className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                      >
                        Voir détails →
                      </button>
                      <div className="flex items-center gap-2">
                        {application.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleAccept(application.id)}
                              disabled={actionLoading}
                              className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                              Accepter
                            </button>
                            <button
                              onClick={() => handleReject(application.id)}
                              disabled={actionLoading}
                              className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                              Refuser
                            </button>
                          </>
                        )}
                        {application.status === 'in_progress' && (
                          <button
                            onClick={() => handleScheduleVisit(application.id)}
                            className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            Visite
                          </button>
                        )}
                        {application.status === 'accepted' && (
                          application.contract_id ? (
                            <button
                              onClick={() => navigate(`/proprietaire/contrats/${application.contract_id}`)}
                              className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-medium rounded-lg transition-all flex items-center gap-1.5"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Voir le contrat
                            </button>
                          ) : (
                            <button
                              onClick={() => navigate(`/proprietaire/contrats/nouveau?applicationId=${application.id}`)}
                              className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-sm font-medium rounded-lg transition-all flex items-center gap-1.5"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Créer le contrat
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center shadow-sm">
            <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Aucune candidature</h3>
            <p className="text-gray-500">
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
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-orange-500" />
                Planifier une visite
              </h3>
              <button
                onClick={() => setShowVisitModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de visite *
                </label>
                <input
                  type="date"
                  value={visitForm.date}
                  onChange={(e) => setVisitForm({ ...visitForm, date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Heure *</label>
                <select
                  value={visitForm.time}
                  onChange={(e) => setVisitForm({ ...visitForm, time: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de visite
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="visitType"
                      value="in_person"
                      checked={visitForm.type === 'in_person'}
                      onChange={() => setVisitForm({ ...visitForm, type: 'in_person' })}
                      className="text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-sm">Physique</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="visitType"
                      value="virtual"
                      checked={visitForm.type === 'virtual'}
                      onChange={() => setVisitForm({ ...visitForm, type: 'virtual' })}
                      className="text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-sm">Virtuelle</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optionnel)
                </label>
                <textarea
                  value={visitForm.notes}
                  onChange={(e) => setVisitForm({ ...visitForm, notes: e.target.value })}
                  placeholder="Instructions particulières..."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowVisitModal(false)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={submitVisit}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-medium hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
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
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Détails de la candidature</h3>
                <button
                  onClick={() => setSelectedApplication(null)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
                <div className="space-y-6">
                  {/* Applicant info */}
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden">
                      {selectedApplication.applicant?.avatar_url ? (
                        <img
                          src={selectedApplication.applicant.avatar_url}
                          alt={selectedApplication.applicant.full_name || ''}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Users className="h-8 w-8 text-orange-500" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">
                        {selectedApplication.applicant?.full_name || 'Candidat'}
                      </h4>
                      <p className="text-gray-500">{selectedApplication.applicant?.email}</p>
                      {selectedApplication.applicant?.phone && (
                        <p className="text-gray-500">{selectedApplication.applicant.phone}</p>
                      )}
                    </div>
                  </div>

                  {/* Property */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">Propriété</p>
                    <p className="font-semibold">{selectedApplication.property?.title}</p>
                    <p className="text-sm text-gray-600">{selectedApplication.property?.city}</p>
                    <p className="text-orange-600 font-bold mt-1">
                      {selectedApplication.property?.monthly_rent?.toLocaleString()} FCFA/mois
                    </p>
                  </div>

                  {/* Score */}
                  {(selectedApplication.applicant?.trust_score ||
                    selectedApplication.application_score) && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-2">Score de confiance</p>
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-gray-200 rounded-full h-3">
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
                      <p className="text-sm text-gray-500 mb-2">Lettre de motivation</p>
                      <p className="text-gray-700 bg-gray-50 rounded-xl p-4 italic">
                        "{selectedApplication.cover_letter}"
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  {/* Verifications */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-3">Vérifications</p>
                    {verificationState.loading ? (
                      <div className="text-sm text-gray-500">Chargement...</div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div
                          className={`rounded-lg border p-3 ${
                            verificationState.oneciVerified
                              ? 'bg-green-50 border-green-200'
                              : 'bg-amber-50 border-amber-200'
                          }`}
                        >
                          <p className="text-xs text-gray-500">ONECI</p>
                          <p className="font-semibold text-gray-900">
                            {verificationState.oneciVerified ? 'Vérifiée' : 'Non vérifiée'}
                          </p>
                        </div>
                        <div
                          className={`rounded-lg border p-3 ${
                            verificationState.neofaceVerified
                              ? 'bg-green-50 border-green-200'
                              : 'bg-amber-50 border-amber-200'
                          }`}
                        >
                          <p className="text-xs text-gray-500">Neoface</p>
                          <p className="font-semibold text-gray-900">
                            {verificationState.neofaceVerified ? 'Vérifiée' : 'Non vérifiée'}
                          </p>
                        </div>
                        <div
                          className={`rounded-lg border p-3 sm:col-span-2 ${
                            verificationState.dossierAccessError
                              ? 'bg-gray-100 border-gray-200'
                              : verificationState.dossierStatus === 'approved'
                                ? 'bg-green-50 border-green-200'
                                : verificationState.dossierStatus &&
                                    verificationState.dossierStatus !== 'draft'
                                  ? 'bg-amber-50 border-amber-200'
                                  : 'bg-gray-100 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-gray-500">Dossier locataire</p>
                              <p className="font-semibold text-gray-900">
                                {verificationState.dossierAccessError
                                  ? 'Statut indisponible'
                                  : verificationState.dossierStatus
                                    ? DOSSIER_STATUS_LABELS[verificationState.dossierStatus] ||
                                      verificationState.dossierStatus
                                    : 'Non soumis'}
                              </p>
                              {verificationState.dossierAccessError && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Accès restreint aux informations du dossier.
                                </p>
                              )}
                              {verificationState.dossierRejectionReason && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {verificationState.dossierRejectionReason}
                                </p>
                              )}
                            </div>
                            {verificationState.dossierStatus && !verificationState.dossierAccessError && (
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                                  DOSSIER_STATUS_COLORS[verificationState.dossierStatus] ||
                                  'bg-gray-100 text-gray-600 border-gray-200'
                                }`}
                              >
                                {DOSSIER_STATUS_LABELS[verificationState.dossierStatus] ||
                                  verificationState.dossierStatus}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dossier documents */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-3">Documents du dossier</p>
                    {verificationState.loading ? (
                      <div className="text-sm text-gray-500">Chargement des documents...</div>
                    ) : verificationState.dossierAccessError ? (
                      <div className="text-sm text-gray-500">
                        Accès restreint aux documents du dossier.
                      </div>
                    ) : verificationState.documents.length === 0 ? (
                      <div className="text-sm text-gray-500">Aucun document soumis.</div>
                    ) : (
                      <div className="space-y-2">
                        {verificationState.documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {DOSSIER_DOCUMENT_LABELS[doc.document_type] ||
                                  doc.document_type}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {doc.file_name || doc.document_url}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  DOCUMENT_STATUS_COLORS[doc.verification_status || 'pending'] ||
                                  'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {DOCUMENT_STATUS_LABELS[doc.verification_status || 'pending'] ||
                                  doc.verification_status ||
                                  'En attente'}
                              </span>
                              <a
                                href={getDownloadUrl(doc.document_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-semibold text-orange-600 hover:underline"
                                title="Télécharger le document"
                              >
                                Voir
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedApplication(null)}
                className="w-full mt-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
