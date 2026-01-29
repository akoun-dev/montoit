/**
 * Page de détails d'un mandat avec UX améliorée
 * Utilisable par les propriétaires et les agences
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Building2,
  User,
  MapPin,
  Calendar,
  Percent,
  CheckCircle,
  XCircle,
  Clock,
  PauseCircle,
  FileSignature,
  Download,
  Edit,
  Trash2,
  MoreVertical,
  Shield,
  Settings,
  Home,
  Key,
  Eye,
  FileCheck,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useAgencyMandates } from '@/hooks/useAgencyMandates';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MandateDetails {
  id: string;
  property_id: string | null;
  agency_id: string;
  owner_id: string;
  status: 'pending' | 'active' | 'expired' | 'cancelled' | 'suspended';
  mandate_scope: 'single_property' | 'all_properties';
  start_date: string;
  end_date: string | null;
  commission_rate: number;
  mandate_document_url: string | null;
  signed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  cryptoneo_signature_status: string | null;
  signed_mandate_url: string | null;
  owner_signed_at: string | null;
  agency_signed_at: string | null;
  // Permissions
  can_view_properties: boolean;
  can_edit_properties: boolean;
  can_create_properties: boolean;
  can_delete_properties: boolean;
  can_view_applications: boolean;
  can_manage_applications: boolean;
  can_create_leases: boolean;
  can_view_financials: boolean;
  can_manage_maintenance: boolean;
  can_communicate_tenants: boolean;
  can_manage_documents: boolean;
  // Relations
  property?: {
    id: string;
    title: string;
    city: string;
    neighborhood: string | null;
    monthly_rent: number;
    main_image: string | null;
  };
  agency?: {
    id: string;
    user_id: string;
    agency_name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    logo_url: string | null;
  };
  owner?: {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
  };
}

type ViewMode = 'owner' | 'agency';

export default function MandateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mandate, setMandate] = useState<MandateDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('owner');
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const {
    acceptMandate,
    refuseMandate,
    terminateMandate,
    suspendMandate,
    reactivateMandate,
    deleteMandate,
    downloadMandate,
  } = useAgencyMandates();

  useEffect(() => {
    if (!id) return;
    fetchMandate();
  }, [id]);

  const fetchMandate = async () => {
    if (!id) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('agency_mandates')
        .select(`
          *,
          property:properties(id, title, city, neighborhood, monthly_rent, main_image),
          agency:agencies(id, user_id, agency_name, email, phone, address, city, logo_url),
          owner:profiles(id, full_name, email, phone, city)
        `)
        .eq('id', id)
        .single();

      if (error || !data) {
        toast.error('Mandat introuvable');
        navigate(-1);
        return;
      }

      setMandate(data as MandateDetails);

      // Determine view mode
      if (user) {
        if (data.owner_id === user.id) {
          setViewMode('owner');
        } else if (data.agency?.user_id === user.id || data.agency?.id === user.id) {
          setViewMode('agency');
        }
      }
    } catch (err) {
      console.error('Error fetching mandate:', err);
      toast.error('Erreur lors du chargement du mandat');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string) => {
    if (!id) return;

    switch (action) {
      case 'accept':
        await acceptMandate(id);
        break;
      case 'refuse':
        await refuseMandate(id);
        break;
      case 'suspend':
        await suspendMandate(id);
        break;
      case 'reactivate':
        await reactivateMandate(id);
        break;
      case 'terminate':
        await terminateMandate(id);
        break;
      case 'delete':
        const deleted = await deleteMandate(id);
        if (deleted) {
          setShowDeleteDialog(false);
          navigate(viewMode === 'owner' ? '/proprietaire/mes-mandats' : '/agences/mandats');
        }
        break;
    }
    setShowActionMenu(false);
    fetchMandate();
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: {
        label: 'En attente',
        color: 'bg-amber-100 text-amber-700 border-amber-200',
        icon: Clock,
      },
      active: {
        label: 'Actif',
        color: 'bg-green-100 text-green-700 border-green-200',
        icon: CheckCircle,
      },
      suspended: {
        label: 'Suspendu',
        color: 'bg-orange-100 text-orange-700 border-orange-200',
        icon: PauseCircle,
      },
      cancelled: {
        label: 'Annulé',
        color: 'bg-red-100 text-red-700 border-red-200',
        icon: XCircle,
      },
      expired: {
        label: 'Expiré',
        color: 'bg-gray-100 text-gray-700 border-gray-200',
        icon: Clock,
      },
    };
    const badge = badges[status as keyof typeof badges] || badges.pending;
    const Icon = badge.icon;
    return (
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${badge.color}`}>
        <Icon className="h-4 w-4" />
        {badge.label}
      </div>
    );
  };

  const getPermissionLabel = (key: string) => {
    const labels: Record<string, string> = {
      can_view_properties: 'Voir les propriétés',
      can_edit_properties: 'Modifier les propriétés',
      can_create_properties: 'Créer des propriétés',
      can_delete_properties: 'Supprimer les propriétés',
      can_view_applications: 'Voir les candidatures',
      can_manage_applications: 'Gérer les candidatures',
      can_create_leases: 'Créer des baux',
      can_view_financials: 'Accès financier',
      can_manage_maintenance: 'Gérer la maintenance',
      can_communicate_tenants: 'Communiquer avec locataires',
      can_manage_documents: 'Gérer les documents',
    };
    return labels[key] || key;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F16522]"></div>
      </div>
    );
  }

  if (!mandate) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center p-4">
        <div className="bg-white rounded-[20px] p-8 border border-[#EFEBE9] text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-[#F16522] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#2C1810] mb-2">Mandat introuvable</h2>
          <p className="text-[#6B5A4E] mb-6">Ce mandat n'existe pas ou a été supprimé.</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-[#F16522] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#d1571e] transition-colors"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  const permissions = [
    { key: 'can_view_properties', label: 'Voir les propriétés', icon: Eye },
    { key: 'can_edit_properties', label: 'Modifier les propriétés', icon: Edit },
    { key: 'can_create_properties', label: 'Créer des propriétés', icon: Home },
    { key: 'can_delete_properties', label: 'Supprimer les propriétés', icon: Trash2 },
    { key: 'can_view_applications', label: 'Voir les candidatures', icon: FileText },
    { key: 'can_manage_applications', label: 'Gérer les candidatures', icon: Settings },
    { key: 'can_create_leases', label: 'Créer des baux', icon: FileCheck },
    { key: 'can_view_financials', label: 'Accès financier', icon: Shield },
    { key: 'can_manage_maintenance', label: 'Gérer la maintenance', icon: Settings },
    { key: 'can_communicate_tenants', label: 'Communiquer avec locataires', icon: User },
    { key: 'can_manage_documents', label: 'Gérer les documents', icon: FileText },
  ];

  return (
    <div className="bg-[#FAF7F4] min-h-screen">
      {/* Header */}
      <div className="bg-[#2C1810] rounded-2xl lg:rounded-[28px] px-4 sm:px-6 lg:px-8 py-6 shadow-lg">
        <div className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <ArrowLeft className="h-6 w-6 text-white" />
              </button>
              <div className="w-14 h-14 rounded-xl bg-[#F16522] flex items-center justify-center shadow-md">
                <FileText className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Détails du Mandat</h1>
                <p className="text-[#E8D4C5] mt-1">
                  {viewMode === 'owner' ? 'Votre mandat de gestion' : 'Mandat de gestion'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(mandate.status)}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Property Info */}
            {mandate.property && (
              <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9]">
                <h2 className="text-lg font-bold text-[#2C1810] mb-4 flex items-center gap-2">
                  <Home className="h-5 w-5 text-[#F16522]" />
                  Bien concerné
                </h2>
                <div className="flex items-start gap-4">
                  <div className="w-32 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-[#EFEBE9]">
                    {mandate.property.main_image ? (
                      <img
                        src={mandate.property.main_image}
                        alt={mandate.property.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Home className="h-8 w-8 text-[#6B5A4E]" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-[#2C1810] text-lg mb-2">
                      {mandate.property.title}
                    </h3>
                    <div className="space-y-1 text-sm text-[#6B5A4E]">
                      <p className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {mandate.property.city}
                        {mandate.property.neighborhood && ` • ${mandate.property.neighborhood}`}
                      </p>
                      <p className="flex items-center gap-2">
                        <Percent className="h-4 w-4" />
                        Loyé: {mandate.property.monthly_rent?.toLocaleString()} FCFA/mois
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Parties */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Owner */}
              <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9]">
                <h3 className="text-lg font-bold text-[#2C1810] mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-[#F16522]" />
                  Propriétaire
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-[#6B5A4E]">Nom</p>
                    <p className="font-semibold text-[#2C1810]">
                      {mandate.owner?.full_name || 'Non renseigné'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B5A4E]">Email</p>
                    <p className="font-medium text-[#2C1810]">
                      {mandate.owner?.email || 'Non renseigné'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B5A4E]">Téléphone</p>
                    <p className="font-medium text-[#2C1810]">
                      {mandate.owner?.phone || 'Non renseigné'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B5A4E]">Signature</p>
                    {mandate.owner_signed_at ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm">
                          {format(new Date(mandate.owner_signed_at), 'dd MMM yyyy à HH:mm', {
                            locale: fr,
                          })}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-[#6B5A4E]">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm">En attente</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Agency */}
              <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9]">
                <h3 className="text-lg font-bold text-[#2C1810] mb-4 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-[#F16522]" />
                  Agence
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    {mandate.agency?.logo_url ? (
                      <img
                        src={mandate.agency.logo_url}
                        alt={mandate.agency.agency_name}
                        className="w-12 h-12 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-[#EFEBE9] flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-[#6B5A4E]" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-[#2C1810]">
                        {mandate.agency?.agency_name || 'Non renseigné'}
                      </p>
                      {mandate.agency?.city && (
                        <p className="text-sm text-[#6B5A4E]">{mandate.agency.city}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B5A4E]">Email</p>
                    <p className="font-medium text-[#2C1810]">
                      {mandate.agency?.email || 'Non renseigné'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B5A4E]">Téléphone</p>
                    <p className="font-medium text-[#2C1810]">
                      {mandate.agency?.phone || 'Non renseigné'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B5A4E]">Signature</p>
                    {mandate.agency_signed_at ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm">
                          {format(new Date(mandate.agency_signed_at), 'dd MMM yyyy à HH:mm', {
                            locale: fr,
                          })}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-[#6B5A4E]">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm">En attente</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Permissions */}
            <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9]">
              <h2 className="text-lg font-bold text-[#2C1810] mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-[#F16522]" />
                Permissions accordées
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {permissions.map((perm) => (
                  <div
                    key={perm.key}
                    className={`p-3 rounded-xl border ${
                      mandate[perm.key as keyof MandateDetails]
                        ? 'bg-green-50 border-green-200'
                        : 'bg-[#FAF7F4] border-[#EFEBE9]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {mandate[perm.key as keyof MandateDetails] ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-[#6B5A4E]" />
                      )}
                      <span
                        className={`text-sm ${
                          mandate[perm.key as keyof MandateDetails]
                            ? 'text-green-700 font-medium'
                            : 'text-[#6B5A4E]'
                        }`}
                      >
                        {perm.label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            {mandate.notes && (
              <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9]">
                <h2 className="text-lg font-bold text-[#2C1810] mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#F16522]" />
                  Notes
                </h2>
                <p className="text-[#2C1810] bg-[#FAF7F4] p-4 rounded-xl">{mandate.notes}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Mandate Info */}
            <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9]">
              <h2 className="text-lg font-bold text-[#2C1810] mb-4">Informations du mandat</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-[#6B5A4E] mb-1">Statut</p>
                  {getStatusBadge(mandate.status)}
                </div>

                <div>
                  <p className="text-sm text-[#6B5A4E] mb-1">Portée</p>
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#FAF7F4] rounded-lg text-sm font-medium text-[#2C1810]">
                    {mandate.mandate_scope === 'all_properties' ? (
                      <>
                        <Home className="h-4 w-4" />
                        Tous les biens
                      </>
                    ) : (
                      <>
                        <Home className="h-4 w-4" />
                        Bien unique
                      </>
                    )}
                  </span>
                </div>

                <div>
                  <p className="text-sm text-[#6B5A4E] mb-1">Commission</p>
                  <p className="text-3xl font-bold text-[#F16522]">{mandate.commission_rate}%</p>
                </div>

                <div className="pt-4 border-t border-[#EFEBE9]">
                  <div className="flex items-center gap-2 text-[#6B5A4E] mb-1">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">Date de début</span>
                  </div>
                  <p className="font-semibold text-[#2C1810]">
                    {format(new Date(mandate.start_date), 'dd MMMM yyyy', { locale: fr })}
                  </p>
                </div>

                {mandate.end_date && (
                  <div>
                    <div className="flex items-center gap-2 text-[#6B5A4E] mb-1">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">Date de fin</span>
                    </div>
                    <p className="font-semibold text-[#2C1810]">
                      {format(new Date(mandate.end_date), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t border-[#EFEBE9]">
                  <div className="flex items-center gap-2 text-[#6B5A4E] mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">Créé le</span>
                  </div>
                  <p className="text-sm text-[#2C1810]">
                    {format(new Date(mandate.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9]">
              <h2 className="text-lg font-bold text-[#2C1810] mb-4">Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={() => navigate(`/mandat/signer/${mandate.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-[#F16522] text-white rounded-xl font-semibold hover:bg-[#d1571e] transition-colors"
                >
                  <FileSignature className="h-5 w-5" />
                  Signer le mandat
                </button>

                <button
                  onClick={() => downloadMandate(mandate.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-[#FAF7F4] text-[#2C1810] rounded-xl font-semibold hover:bg-[#EFEBE9] transition-colors border border-[#EFEBE9]"
                >
                  <Download className="h-5 w-5" />
                  Télécharger PDF
                </button>

                {mandate.status === 'pending' && viewMode === 'agency' && (
                  <>
                    <button
                      onClick={() => handleAction('accept')}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-green-100 text-green-700 rounded-xl font-semibold hover:bg-green-200 transition-colors"
                    >
                      <CheckCircle className="h-5 w-5" />
                      Accepter le mandat
                    </button>

                    <button
                      onClick={() => handleAction('refuse')}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-red-100 text-red-700 rounded-xl font-semibold hover:bg-red-200 transition-colors"
                    >
                      <XCircle className="h-5 w-5" />
                      Refuser le mandat
                    </button>
                  </>
                )}

                {mandate.status === 'active' && (
                  <>
                    {viewMode === 'agency' && (
                      <button
                        onClick={() => handleAction('suspend')}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-orange-100 text-orange-700 rounded-xl font-semibold hover:bg-orange-200 transition-colors"
                      >
                        <PauseCircle className="h-5 w-5" />
                        Suspendre
                      </button>
                    )}

                    <button
                      onClick={() => handleAction('terminate')}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-red-100 text-red-700 rounded-xl font-semibold hover:bg-red-200 transition-colors"
                    >
                      <XCircle className="h-5 w-5" />
                      Résilier le mandat
                    </button>
                  </>
                )}

                {mandate.status === 'suspended' && (
                  <button
                    onClick={() => handleAction('reactivate')}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-green-100 text-green-700 rounded-xl font-semibold hover:bg-green-200 transition-colors"
                  >
                    <CheckCircle className="h-5 w-5" />
                    Réactiver
                  </button>
                )}

                {mandate.status === 'pending' && viewMode === 'owner' && (
                  <button
                    onClick={() => setShowDeleteDialog(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-red-50 text-red-700 rounded-xl font-semibold hover:bg-red-100 transition-colors border border-red-200"
                  >
                    <Trash2 className="h-5 w-5" />
                    Supprimer le mandat
                  </button>
                )}
              </div>
            </div>

            {/* Document */}
            {mandate.signed_mandate_url && (
              <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9]">
                <h2 className="text-lg font-bold text-[#2C1810] mb-4">Document signé</h2>
                <a
                  href={mandate.signed_mandate_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 bg-[#FAF7F4] text-[#2C1810] rounded-xl font-medium hover:bg-[#EFEBE9] transition-colors border border-[#EFEBE9]"
                >
                  <FileText className="h-5 w-5" />
                  Voir le document
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[20px] p-6 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-[#2C1810] mb-2">Supprimer le mandat ?</h3>
              <p className="text-[#6B5A4E]">
                Cette action est irréversible. Voulez-vous vraiment supprimer ce mandat ?
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="flex-1 px-4 py-3 bg-[#FAF7F4] text-[#2C1810] rounded-xl font-semibold hover:bg-[#EFEBE9] transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleAction('delete')}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
