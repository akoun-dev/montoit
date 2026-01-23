/**
 * Page de détail d'un mandat
 */

import { useState, type ElementType } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Home,
  MapPin,
  Banknote,
  Building2,
  Calendar,
  Percent,
  FileText,
  Download,
  Check,
  X,
  Pause,
  Play,
  Trash2,
  Settings,
  Phone,
  Mail,
  Globe,
  Clock,
  Shield,
  Eye,
  Edit,
  PlusCircle,
  UserCheck,
  MessageSquare,
  FolderOpen,
  Wrench,
  FileSignature,
  User,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAgencyMandates, type MandatePermissions } from '@/hooks/useAgencyMandates';
import { useAuth } from '@/app/providers/AuthProvider';
import MandateStatusBadge from '../../features/agency/components/MandateStatusBadge';
import MandatePermissionsForm from '../../features/agency/components/MandatePermissionsForm';
import { AGENCY_ROLES } from '@/shared/constants/roles';

// Permission configuration for display
const PERMISSIONS_CONFIG: {
  key: keyof MandatePermissions;
  label: string;
  icon: ElementType;
  group: string;
}[] = [
  // Gestion des biens
  { key: 'can_view_properties', label: 'Voir les biens', icon: Eye, group: 'Gestion des biens' },
  {
    key: 'can_edit_properties',
    label: 'Modifier les biens',
    icon: Edit,
    group: 'Gestion des biens',
  },
  {
    key: 'can_create_properties',
    label: 'Créer des biens',
    icon: PlusCircle,
    group: 'Gestion des biens',
  },
  {
    key: 'can_delete_properties',
    label: 'Supprimer des biens',
    icon: Trash2,
    group: 'Gestion des biens',
  },
  // Candidatures & Baux
  {
    key: 'can_view_applications',
    label: 'Voir les candidatures',
    icon: Eye,
    group: 'Candidatures & Baux',
  },
  {
    key: 'can_manage_applications',
    label: 'Gérer les candidatures',
    icon: UserCheck,
    group: 'Candidatures & Baux',
  },
  {
    key: 'can_create_leases',
    label: 'Créer des baux',
    icon: FileSignature,
    group: 'Candidatures & Baux',
  },
  // Finances & Maintenance
  {
    key: 'can_view_financials',
    label: 'Voir les finances',
    icon: Banknote,
    group: 'Finances & Maintenance',
  },
  {
    key: 'can_manage_maintenance',
    label: 'Gérer la maintenance',
    icon: Wrench,
    group: 'Finances & Maintenance',
  },
  // Communication & Documents
  {
    key: 'can_communicate_tenants',
    label: 'Contacter les locataires',
    icon: MessageSquare,
    group: 'Communication & Documents',
  },
  {
    key: 'can_manage_documents',
    label: 'Gérer les documents',
    icon: FolderOpen,
    group: 'Communication & Documents',
  },
];

export default function MandateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const {
    mandates,
    loading,
    acceptMandate,
    refuseMandate,
    terminateMandate,
    suspendMandate,
    reactivateMandate,
    updateMandatePermissions,
  } = useAgencyMandates();

  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const mandate = mandates.find((m) => m.id === id);
  const viewAs = mandate?.owner_id === user?.id ? 'owner' : 'agency';

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Non définie';
    return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
  };

  const handleAction = async (action: () => Promise<boolean>) => {
    setActionLoading(true);
    await action();
    setActionLoading(false);
  };

  const handleSavePermissions = async (
    permissions: Partial<MandatePermissions>
  ): Promise<boolean> => {
    if (!mandate) return false;
    const result = await updateMandatePermissions(mandate.id, permissions);
    if (result) setShowPermissionsModal(false);
    return result;
  };

  // Group permissions by category
  const groupedPermissions = PERMISSIONS_CONFIG.reduce<Record<string, typeof PERMISSIONS_CONFIG>>(
    (acc, perm) => {
      if (!acc[perm.group]) acc[perm.group] = [];
      acc[perm.group]?.push(perm);
      return acc;
    },
    {}
  );

  const isAgencyUser = profile?.user_type
    ? (AGENCY_ROLES as readonly string[]).includes(profile.user_type)
    : false;

  if (loading) {
    return (
      <div>
        <div className="bg-neutral-50 p-6">
          <div className="w-full">
            <div className="animate-pulse space-y-6">
              <div className="h-8 w-32 bg-neutral-200 rounded" />
              <div className="h-64 bg-neutral-200 rounded-2xl" />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 h-96 bg-neutral-200 rounded-2xl" />
                <div className="h-96 bg-neutral-200 rounded-2xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!mandate) {
    return (
      <div>
        <div className="bg-neutral-50 p-6 flex items-center justify-center">
          <div className="text-center">
            <Shield className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-neutral-900 mb-2">Mandat non trouvé</h1>
            <p className="text-neutral-500 mb-6">
              Ce mandat n'existe pas ou vous n'y avez pas accès.
            </p>
            <Link
              to="/mes-mandats"
              className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour aux mandats
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const commissionAmount = mandate.property?.monthly_rent
    ? Math.round((mandate.property.monthly_rent * mandate.commission_rate) / 100)
    : 0;

  return (
    <div>
      <div className="bg-neutral-50">
        {/* Header with Property Image */}
        <div className="relative h-48 md:h-64 bg-neutral-200">
          {mandate.property?.main_image ? (
            <img
              src={mandate.property.main_image}
              alt={mandate.property?.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-neutral-100">
              <Home className="h-20 w-20 text-neutral-300" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

          {/* Back button & Status */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-xl hover:bg-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">Retour</span>
            </button>
            <MandateStatusBadge status={mandate.status} />
          </div>

          {/* Property Title */}
          <div className="absolute bottom-4 left-4 right-4">
            <h1 className="text-xl md:text-2xl font-bold text-white mb-1">
              {mandate.property?.title || 'Propriété'}
            </h1>
            <div className="flex items-center gap-1 text-white/90">
              <MapPin className="h-4 w-4" />
              <span>
                {mandate.property?.city}
                {mandate.property?.neighborhood && ` • ${mandate.property.neighborhood}`}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="w-full px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Property Card */}
              <div className="bg-white rounded-2xl border border-neutral-200 p-6">
                <h2 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                  <Home className="h-5 w-5 text-primary" />
                  Bien géré
                </h2>
                <div className="flex gap-4">
                  <div className="w-24 h-24 rounded-xl overflow-hidden bg-neutral-100 flex-shrink-0">
                    {mandate.property?.main_image ? (
                      <img
                        src={mandate.property.main_image}
                        alt={mandate.property?.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Home className="h-8 w-8 text-neutral-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-neutral-900 mb-1">{mandate.property?.title}</h3>
                    <p className="text-sm text-neutral-500 flex items-center gap-1 mb-2">
                      <MapPin className="h-3.5 w-3.5" />
                      {mandate.property?.city}
                      {mandate.property?.neighborhood && `, ${mandate.property.neighborhood}`}
                    </p>
                    <p className="text-lg font-semibold text-primary flex items-center gap-1">
                      <Banknote className="h-4 w-4" />
                      {mandate.property?.monthly_rent?.toLocaleString()} FCFA/mois
                    </p>
                  </div>
                  <Link
                    to={`/propriete/${mandate.property_id}`}
                    className="self-start flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <Eye className="h-4 w-4" />
                    Voir
                  </Link>
                </div>
              </div>

              {/* Permissions Card */}
              <div className="bg-white rounded-2xl border border-neutral-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Permissions accordées
                  </h2>
                  {viewAs === 'owner' && mandate.status === 'active' && (
                    <button
                      onClick={() => setShowPermissionsModal(true)}
                      className="flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <Settings className="h-4 w-4" />
                      Modifier
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {Object.entries(groupedPermissions).map(([group, permissions]) => (
                    <div key={group}>
                      <h3 className="text-sm font-medium text-neutral-500 mb-2">{group}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {permissions.map((perm) => {
                          const isEnabled = mandate[perm.key];
                          const Icon = perm.icon;
                          return (
                            <div
                              key={perm.key}
                              className={`flex items-center gap-2 p-2 rounded-lg ${
                                isEnabled
                                  ? 'bg-green-50 text-green-700'
                                  : 'bg-neutral-50 text-neutral-400'
                              }`}
                            >
                              {isEnabled ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <X className="h-4 w-4 text-neutral-400" />
                              )}
                              <Icon className="h-4 w-4" />
                              <span className="text-sm">{perm.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes Card */}
              {mandate.notes && (
                <div className="bg-white rounded-2xl border border-neutral-200 p-6">
                  <h2 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Notes
                  </h2>
                  <p className="text-neutral-600 whitespace-pre-wrap">{mandate.notes}</p>
                </div>
              )}
            </div>

            {/* Right Column - Side Info */}
            <div className="space-y-6">
              {/* Agency/Owner Card */}
              <div className="bg-white rounded-2xl border border-neutral-200 p-6">
                <h2 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  {viewAs === 'owner' ? 'Agence mandatée' : 'Propriétaire'}
                </h2>

                {viewAs === 'owner' && mandate.agency ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      {mandate.agency.logo_url ? (
                        <img
                          src={mandate.agency.logo_url}
                          alt={mandate.agency.agency_name}
                          className="w-12 h-12 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-primary" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-neutral-900">{mandate.agency.agency_name}</p>
                        {mandate.agency.is_verified && (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600">
                            <Check className="h-3 w-3" />
                            Vérifiée
                          </span>
                        )}
                      </div>
                    </div>

                    {mandate.agency.phone && (
                      <div className="flex items-center gap-2 text-sm text-neutral-600">
                        <Phone className="h-4 w-4 text-neutral-400" />
                        <a href={`tel:${mandate.agency.phone}`} className="hover:text-primary">
                          {mandate.agency.phone}
                        </a>
                      </div>
                    )}

                    {mandate.agency.email && (
                      <div className="flex items-center gap-2 text-sm text-neutral-600">
                        <Mail className="h-4 w-4 text-neutral-400" />
                        <a href={`mailto:${mandate.agency.email}`} className="hover:text-primary">
                          {mandate.agency.email}
                        </a>
                      </div>
                    )}

                    {mandate.agency.website && (
                      <div className="flex items-center gap-2 text-sm text-neutral-600">
                        <Globe className="h-4 w-4 text-neutral-400" />
                        <a
                          href={mandate.agency.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary"
                        >
                          Site web
                        </a>
                      </div>
                    )}

                    {mandate.agency.city && (
                      <div className="flex items-center gap-2 text-sm text-neutral-600">
                        <MapPin className="h-4 w-4 text-neutral-400" />
                        <p>{mandate.agency.city}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900">Propriétaire</p>
                      <p className="text-sm text-neutral-500">
                        ID: {mandate.owner_id.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Financial Card */}
              <div className="bg-white rounded-2xl border border-neutral-200 p-6">
                <h2 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-primary" />
                  Conditions financières
                </h2>
                <div className="space-y-3 text-sm text-neutral-600">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Percent className="h-4 w-4 text-neutral-400" />
                      Commission
                    </span>
                    <span className="font-semibold text-neutral-900">
                      {mandate.commission_rate}% ({commissionAmount.toLocaleString()} FCFA)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-neutral-400" />
                      Date de début
                    </span>
                    <span className="font-semibold text-neutral-900">
                      {formatDate(mandate.start_date)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-neutral-400" />
                      Durée
                    </span>
                    <span className="font-semibold text-neutral-900">
                      {mandate.duration_months} mois
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions Card */}
              <div className="bg-white rounded-2xl border border-neutral-200 p-6">
                <h2 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Actions
                </h2>

                <div className="space-y-3">
                  {mandate.status === 'pending' && viewAs === 'agency' && (
                    <div className="flex gap-3">
                      <button
                        disabled={actionLoading}
                        onClick={() => handleAction(() => acceptMandate(mandate.id))}
                        className="flex-1 inline-flex items-center justify-center gap-2 bg-green-50 text-green-700 px-4 py-3 rounded-xl hover:bg-green-100 transition-colors border border-green-100"
                      >
                        <Check className="h-4 w-4" />
                        Accepter le mandat
                      </button>
                      <button
                        disabled={actionLoading}
                        onClick={() => handleAction(() => refuseMandate(mandate.id))}
                        className="flex-1 inline-flex items-center justify-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-xl hover:bg-red-100 transition-colors border border-red-100"
                      >
                        <X className="h-4 w-4" />
                        Refuser
                      </button>
                    </div>
                  )}

                  {mandate.status === 'active' && viewAs === 'agency' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        disabled={actionLoading}
                        onClick={() => handleAction(() => terminateMandate(mandate.id))}
                        className="inline-flex items-center justify-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-xl hover:bg-red-100 transition-colors border border-red-100"
                      >
                        <Trash2 className="h-4 w-4" />
                        Terminer le mandat
                      </button>
                      <button
                        disabled={actionLoading}
                        onClick={() => handleAction(() => suspendMandate(mandate.id))}
                        className="inline-flex items-center justify-center gap-2 bg-amber-50 text-amber-700 px-4 py-3 rounded-xl hover:bg-amber-100 transition-colors border border-amber-100"
                      >
                        <Pause className="h-4 w-4" />
                        Suspendre
                      </button>
                    </div>
                  )}

                  {mandate.status === 'suspended' && viewAs === 'agency' && (
                    <button
                      disabled={actionLoading}
                      onClick={() => handleAction(() => reactivateMandate(mandate.id))}
                      className="w-full inline-flex items-center justify-center gap-2 bg-green-50 text-green-700 px-4 py-3 rounded-xl hover:bg-green-100 transition-colors border border-green-100"
                    >
                      <Play className="h-4 w-4" />
                      Réactiver le mandat
                    </button>
                  )}

                  {viewAs === 'owner' && (
                    <button
                      onClick={() => setShowPermissionsModal(true)}
                      className="w-full inline-flex items-center justify-center gap-2 bg-primary/10 text-primary-700 px-4 py-3 rounded-xl hover:bg-primary/20 transition-colors border border-primary/10"
                    >
                      <Settings className="h-4 w-4" />
                      Modifier les permissions
                    </button>
                  )}
                </div>
              </div>

              {/* Signature Status */}
              <div className="bg-white rounded-2xl border border-neutral-200 p-6">
                <h2 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                  <FileSignature className="h-5 w-5 text-primary" />
                  Signature
                </h2>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-neutral-400" />
                      <span className="text-sm text-neutral-600">Propriétaire</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {mandate.owner_signed_at ? (
                        <span className="inline-flex items-center gap-1 text-sm text-green-600">
                          <Check className="h-4 w-4" />
                          Signé le {formatDate(mandate.owner_signed_at)}
                        </span>
                      ) : (
                        <span className="text-sm text-amber-600">En attente</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-neutral-400" />
                      <span className="text-sm text-neutral-600">Agence</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {mandate.agency_signed_at ? (
                        <span className="inline-flex items-center gap-1 text-sm text-green-600">
                          <Check className="h-4 w-4" />
                          Signé le {formatDate(mandate.agency_signed_at)}
                        </span>
                      ) : (
                        <span className="text-sm text-amber-600">En attente</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="bg-white rounded-2xl border border-neutral-200 p-6">
                <h2 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Documents
                </h2>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-neutral-400" />
                      <span>Mandat signé</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href="#" className="text-primary hover:underline text-sm">
                        Télécharger
                      </a>
                      <Download className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-neutral-400" />
                      <span>Justificatifs agence</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href="#" className="text-primary hover:underline text-sm">
                        Télécharger
                      </a>
                      <Download className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <MandatePermissionsForm
          isOpen={showPermissionsModal}
          onClose={() => setShowPermissionsModal(false)}
          mandate={mandate}
          onSave={handleSavePermissions}
        />
      </div>
    </div>
  );
}
