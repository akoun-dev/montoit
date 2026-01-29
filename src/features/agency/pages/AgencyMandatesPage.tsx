/**
 * Page de gestion des mandats pour les agences
 * Design cohérent avec les autres pages agence
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Building2,
  Clock,
  CheckCircle,
  XCircle,
  PauseCircle,
  Search,
  Calendar,
  MapPin,
  User,
  Eye,
  FileSignature,
  Download,
  MoreVertical,
  Filter as FilterIcon,
  Handshake,
  Home,
  TrendingUp,
  Coins,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useAgencyMandates, type AgencyMandate } from '@/hooks/useAgencyMandates';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type StatusFilter = 'all' | 'pending' | 'active' | 'suspended' | 'cancelled';

export default function AgencyMandatesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMandate, setSelectedMandate] = useState<AgencyMandate | null>(null);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);

  const {
    loading,
    agencyMandates,
    acceptMandate,
    refuseMandate,
    terminateMandate,
    suspendMandate,
    reactivateMandate,
    deleteMandate,
    downloadMandate,
  } = useAgencyMandates();

  if (!user) {
    navigate('/connexion');
    return null;
  }

  // Filter mandates
  const filteredMandates = agencyMandates.filter((mandate) => {
    if (statusFilter !== 'all' && mandate.status !== statusFilter) {
      return false;
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesProperty = mandate.property?.title?.toLowerCase().includes(query);
      const matchesCity = mandate.property?.city?.toLowerCase().includes(query);
      const matchesOwner = mandate.owner?.full_name?.toLowerCase().includes(query);

      if (!matchesProperty && !matchesCity && !matchesOwner) {
        return false;
      }
    }

    return true;
  });

  // Stats
  const stats = {
    total: agencyMandates.length,
    pending: agencyMandates.filter((m) => m.status === 'pending').length,
    active: agencyMandates.filter((m) => m.status === 'active').length,
    suspended: agencyMandates.filter((m) => m.status === 'suspended').length,
    cancelled: agencyMandates.filter((m) => m.status === 'cancelled').length,
    totalRevenue: agencyMandates
      .filter((m) => m.status === 'active')
      .reduce((sum, m) => sum + (m.property?.price || 0) * (m.commission_rate / 100), 0),
  };

  const handleStatusChange = async (mandateId: string, action: string) => {
    switch (action) {
      case 'accept':
        await acceptMandate(mandateId);
        break;
      case 'refuse':
        await refuseMandate(mandateId);
        break;
      case 'suspend':
        await suspendMandate(mandateId);
        break;
      case 'reactivate':
        await reactivateMandate(mandateId);
        break;
      case 'terminate':
        await terminateMandate(mandateId);
        break;
      case 'delete':
        await deleteMandate(mandateId);
        break;
    }
    setShowActionMenu(null);
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { label: 'En attente', color: 'bg-amber-100 text-amber-700' },
      active: { label: 'Actif', color: 'bg-green-100 text-green-700' },
      suspended: { label: 'Suspendu', color: 'bg-orange-100 text-orange-700' },
      cancelled: { label: 'Annulé', color: 'bg-red-100 text-red-700' },
      expired: { label: 'Expiré', color: 'bg-gray-100 text-gray-700' },
    };
    const badge = badges[status as keyof typeof badges] || badges.pending;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="bg-[#FAF7F4] min-h-screen">
      {/* Header */}
      <div className="bg-[#2C1810] rounded-2xl lg:rounded-[28px] px-4 sm:px-6 lg:px-8 py-6 shadow-lg">
        <div className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#F16522] flex items-center justify-center shadow-md">
                <Handshake className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Mandats de Gestion</h1>
                <p className="text-[#E8D4C5] mt-1">Gérez tous vos mandats immobiliers</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9]">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-[#FFF5F0] p-2 rounded-xl">
                <FileText className="h-5 w-5 text-[#F16522]" />
              </div>
              <span className="text-sm text-[#6B5A4E]">Total</span>
            </div>
            <p className="text-3xl font-bold text-[#2C1810]">{stats.total}</p>
            <p className="text-xs text-[#6B5A4E] mt-1">Mandats</p>
          </div>

          <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9]">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-amber-100 p-2 rounded-xl">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <span className="text-sm text-[#6B5A4E]">En attente</span>
            </div>
            <p className="text-3xl font-bold text-[#2C1810]">{stats.pending}</p>
            <p className="text-xs text-[#6B5A4E] mt-1">À traiter</p>
          </div>

          <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9]">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-green-100 p-2 rounded-xl">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-sm text-[#6B5A4E]">Actifs</span>
            </div>
            <p className="text-3xl font-bold text-[#2C1810]">{stats.active}</p>
            <p className="text-xs text-[#6B5A4E] mt-1">En cours</p>
          </div>

          <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9]">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-orange-100 p-2 rounded-xl">
                <PauseCircle className="h-5 w-5 text-orange-600" />
              </div>
              <span className="text-sm text-[#6B5A4E]">Suspendus</span>
            </div>
            <p className="text-3xl font-bold text-[#2C1810]">{stats.suspended}</p>
            <p className="text-xs text-[#6B5A4E] mt-1">En pause</p>
          </div>

          <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9]">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-[#FFF5F0] p-2 rounded-xl">
                <Coins className="h-5 w-5 text-[#F16522]" />
              </div>
              <span className="text-sm text-[#6B5A4E]">Revenus</span>
            </div>
            <p className="text-2xl font-bold text-[#F16522]">
              {stats.totalRevenue.toLocaleString('fr-FR')}
            </p>
            <p className="text-xs text-[#6B5A4E] mt-1">FCFA / mois</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9]">
          {/* Header with filters */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold text-[#2C1810] flex items-center gap-2">
              <FileText className="h-6 w-6 text-[#F16522]" />
              <span>Mes Mandats</span>
            </h2>

            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6B5A4E]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher..."
                  className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-[#FAF7F4] border border-[#EFEBE9] rounded-xl text-sm focus:ring-2 focus:ring-[#F16522] focus:border-transparent"
                />
              </div>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="px-4 py-2.5 bg-[#FAF7F4] border border-[#EFEBE9] rounded-xl text-sm focus:ring-2 focus:ring-[#F16522] focus:border-transparent"
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="active">Actifs</option>
                <option value="suspended">Suspendus</option>
                <option value="cancelled">Annulés</option>
              </select>
            </div>
          </div>

          {/* Loading */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F16522]"></div>
            </div>
          ) : filteredMandates.length === 0 ? (
            /* Empty state */
            <div className="text-center py-16 bg-[#FAF7F4] border border-[#EFEBE9] rounded-xl">
              <FileText className="h-12 w-12 text-[#6B5A4E] mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-[#2C1810] mb-2">
                {searchQuery || statusFilter !== 'all' ? 'Aucun mandat trouvé' : 'Aucun mandat'}
              </h3>
              <p className="text-[#6B5A4E]">
                {searchQuery || statusFilter !== 'all'
                  ? 'Essayez de modifier vos critères de recherche'
                  : 'Les propriétaires peuvent vous confier la gestion de leurs biens'}
              </p>
            </div>
          ) : (
            /* Mandates List */
            <div className="space-y-4">
              {filteredMandates.map((mandate) => (
                <div
                  key={mandate.id}
                  className="bg-[#FAF7F4] border border-[#EFEBE9] rounded-xl p-5 hover:border-[#F16522] transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Property Image or Icon */}
                    <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-[#EFEBE9]">
                      {mandate.property?.main_image ? (
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

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusBadge(mandate.status)}
                            {mandate.mandate_scope === 'all_properties' && (
                              <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-semibold">
                                Tous biens
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-[#2C1810] text-lg">
                            {mandate.property?.title || 'Tous les biens'}
                          </h3>
                          <div className="flex items-center gap-4 mt-1 text-sm text-[#6B5A4E]">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {mandate.property?.city || 'Multi-locations'}
                              {mandate.property?.neighborhood && ` • ${mandate.property.neighborhood}`}
                            </span>
                          </div>
                        </div>

                        {/* Commission */}
                        <div className="flex-shrink-0 text-right">
                          <p className="text-2xl font-bold text-[#F16522]">{mandate.commission_rate}%</p>
                          <p className="text-xs text-[#6B5A4E]">Commission</p>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-[#6B5A4E]">Propriétaire</span>
                          <p className="font-medium text-[#2C1810] truncate">
                            {mandate.owner?.full_name || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <span className="text-[#6B5A4E]">Début</span>
                          <p className="font-medium text-[#2C1810]">
                            {format(new Date(mandate.start_date), 'dd MMM yyyy', { locale: fr })}
                          </p>
                        </div>
                        {mandate.end_date && (
                          <div>
                            <span className="text-[#6B5A4E]">Fin</span>
                            <p className="font-medium text-[#2C1810]">
                              {format(new Date(mandate.end_date), 'dd MMM yyyy', { locale: fr })}
                            </p>
                          </div>
                        )}
                        <div>
                          <span className="text-[#6B5A4E]">Signatures</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-xs ${mandate.owner_signed_at ? 'text-green-600' : 'text-[#6B5A4E]'}`}>
                              {mandate.owner_signed_at ? '✓ Propriétaire' : '○ Propriétaire'}
                            </span>
                            <span className={`text-xs ${mandate.agency_signed_at ? 'text-green-600' : 'text-[#6B5A4E]'}`}>
                              {mandate.agency_signed_at ? '✓ Agence' : '○ Agence'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => navigate(`/agences/mandats/${mandate.id}`)}
                        className="p-2.5 hover:bg-[#EFEBE9] rounded-xl transition-colors"
                        title="Voir détails"
                      >
                        <Eye className="h-5 w-5 text-[#6B5A4E]" />
                      </button>
                      <button
                        onClick={() => navigate(`/mandat/signer/${mandate.id}`)}
                        className="p-2.5 hover:bg-[#EFEBE9] rounded-xl transition-colors"
                        title="Signer"
                      >
                        <FileSignature className="h-5 w-5 text-[#F16522]" />
                      </button>
                      <button
                        onClick={() => downloadMandate(mandate.id)}
                        className="p-2.5 hover:bg-[#EFEBE9] rounded-xl transition-colors"
                        title="Télécharger PDF"
                      >
                        <Download className="h-5 w-5 text-[#6B5A4E]" />
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => setShowActionMenu(showActionMenu === mandate.id ? null : mandate.id)}
                          className="p-2.5 hover:bg-[#EFEBE9] rounded-xl transition-colors"
                        >
                          <MoreVertical className="h-5 w-5 text-[#6B5A4E]" />
                        </button>
                        {showActionMenu === mandate.id && (
                          <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-[#EFEBE9] rounded-xl shadow-lg z-10">
                            {mandate.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleStatusChange(mandate.id, 'accept')}
                                  className="w-full px-4 py-3 text-left hover:bg-[#FAF7F4] flex items-center gap-3 text-sm text-green-600"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                  Accepter
                                </button>
                                <button
                                  onClick={() => handleStatusChange(mandate.id, 'refuse')}
                                  className="w-full px-4 py-3 text-left hover:bg-[#FAF7F4] flex items-center gap-3 text-sm text-red-600"
                                >
                                  <XCircle className="h-4 w-4" />
                                  Refuser
                                </button>
                              </>
                            )}
                            {mandate.status === 'active' && (
                              <>
                                <button
                                  onClick={() => handleStatusChange(mandate.id, 'suspend')}
                                  className="w-full px-4 py-3 text-left hover:bg-[#FAF7F4] flex items-center gap-3 text-sm text-orange-600"
                                >
                                  <PauseCircle className="h-4 w-4" />
                                  Suspendre
                                </button>
                                <button
                                  onClick={() => handleStatusChange(mandate.id, 'terminate')}
                                  className="w-full px-4 py-3 text-left hover:bg-[#FAF7F4] flex items-center gap-3 text-sm text-red-600"
                                >
                                  <XCircle className="h-4 w-4" />
                                  Résilier
                                </button>
                              </>
                            )}
                            {mandate.status === 'suspended' && (
                              <button
                                onClick={() => handleStatusChange(mandate.id, 'reactivate')}
                                className="w-full px-4 py-3 text-left hover:bg-[#FAF7F4] flex items-center gap-3 text-sm text-green-600"
                              >
                                <CheckCircle className="h-4 w-4" />
                                Réactiver
                              </button>
                            )}
                            {mandate.status === 'pending' && (
                              <button
                                onClick={() => handleStatusChange(mandate.id, 'delete')}
                                className="w-full px-4 py-3 text-left hover:bg-[#FAF7F4] flex items-center gap-3 text-sm text-red-600 border-t border-[#EFEBE9]"
                              >
                                <XCircle className="h-4 w-4" />
                                Supprimer
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
