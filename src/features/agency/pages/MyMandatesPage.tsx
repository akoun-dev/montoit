/**
 * Page de gestion des mandats
 * Accessible aux propriétaires et aux agences
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
  Filter,
  Search,
  Home,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useAgencyMandates, type AgencyMandate } from '@/shared/hooks/useAgencyMandates';
import MandateCard from '../components/MandateCard';
import InviteAgencyDialog from '../components/InviteAgencyDialog';
import MandatePermissionsForm from '../components/MandatePermissionsForm';

type ViewMode = 'owner' | 'agency';
type StatusFilter = 'all' | 'pending' | 'active' | 'expired' | 'cancelled';

interface Property {
  id: string;
  title: string;
  city: string;
  monthly_rent: number;
}

export default function MyMandatesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('owner');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [selectedMandate, setSelectedMandate] = useState<AgencyMandate | null>(null);
  const [myProperties, setMyProperties] = useState<Property[]>([]);

  const {
    agencies,
    myAgency,
    loading,
    ownerMandates,
    agencyMandates,
    createMandate,
    acceptMandate,
    refuseMandate,
    terminateMandate,
    suspendMandate,
    reactivateMandate,
    updateMandatePermissions,
  } = useAgencyMandates();

  // Detect if user is an agency
  useEffect(() => {
    if (myAgency) {
      setViewMode('agency');
    }
  }, [myAgency]);

  // Load user's properties if owner
  useEffect(() => {
    const loadProperties = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('properties')
        .select('id, title, city, monthly_rent')
        .eq('owner_id', user.id);

      setMyProperties((data || []) as Property[]);
    };

    loadProperties();
  }, [user]);

  if (!user) {
    navigate('/connexion');
    return null;
  }

  // Filter mandates based on view mode and filters
  const baseMandates = viewMode === 'owner' ? ownerMandates : agencyMandates;

  const filteredMandates = baseMandates.filter((mandate) => {
    // Status filter
    if (statusFilter !== 'all' && mandate.status !== statusFilter) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesProperty = mandate.property?.title?.toLowerCase().includes(query);
      const matchesAgency = mandate.agency?.agency_name?.toLowerCase().includes(query);
      const matchesCity = mandate.property?.city?.toLowerCase().includes(query);

      if (!matchesProperty && !matchesAgency && !matchesCity) {
        return false;
      }
    }

    return true;
  });

  // Stats
  const stats = {
    total: baseMandates.length,
    pending: baseMandates.filter((m) => m.status === 'pending').length,
    active: baseMandates.filter((m) => m.status === 'active').length,
    expired: baseMandates.filter((m) => m.status === 'expired' || m.status === 'cancelled').length,
  };

  const handleInvite = async (params: Parameters<typeof createMandate>[0]) => {
    return await createMandate(params);
  };

  const handleManagePermissions = (mandate: AgencyMandate) => {
    setSelectedMandate(mandate);
    setShowPermissionsDialog(true);
  };

  const handleSign = (mandate: AgencyMandate) => {
    navigate(`/mandat/signer/${mandate.id}`);
  };

  const handleSavePermissions = async (
    permissions: Parameters<typeof updateMandatePermissions>[1]
  ) => {
    if (!selectedMandate) return false;
    return await updateMandatePermissions(selectedMandate.id, permissions);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <FileText className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Mes Mandats</h1>
                <p className="text-muted-foreground">
                  {viewMode === 'owner'
                    ? 'Gérez vos mandats de gestion locative'
                    : 'Mandats de gestion qui vous sont confiés'}
                </p>
              </div>
            </div>

            {viewMode === 'owner' && myProperties.length > 0 && (
              <button
                onClick={() => setShowInviteDialog(true)}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl font-medium transition-colors"
              >
                <Plus className="h-5 w-5" />
                Inviter une agence
              </button>
            )}
          </div>

          {/* View Toggle (if user is both owner and agency) */}
          {myAgency && myProperties.length > 0 && (
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setViewMode('owner')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'owner'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Home className="h-4 w-4 inline mr-2" />
                Mes biens
              </button>
              <button
                onClick={() => setViewMode('agency')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'agency'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Building2 className="h-4 w-4 inline mr-2" />
                Mon agence
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FileText className="h-4 w-4" />
              <span className="text-sm">Total</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </div>
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-sm">En attente</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
          </div>
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Actifs</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.active}</p>
          </div>
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div className="flex items-center gap-2 text-neutral-500 mb-1">
              <XCircle className="h-4 w-4" />
              <span className="text-sm">Terminés</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.expired}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par bien, agence ou ville..."
              className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-4 py-3 bg-card border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="active">Actifs</option>
              <option value="expired">Expirés</option>
              <option value="cancelled">Annulés</option>
            </select>
          </div>
        </div>

        {/* Mandates Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredMandates.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-border">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <FileText className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">
              {searchQuery || statusFilter !== 'all' ? 'Aucun mandat trouvé' : 'Aucun mandat'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {viewMode === 'owner'
                ? 'Invitez une agence pour gérer vos biens'
                : 'Les propriétaires peuvent vous confier la gestion de leurs biens'}
            </p>
            {viewMode === 'owner' && myProperties.length > 0 && (
              <button
                onClick={() => setShowInviteDialog(true)}
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl font-medium transition-colors"
              >
                <Plus className="h-5 w-5" />
                Inviter une agence
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMandates.map((mandate) => (
              <MandateCard
                key={mandate.id}
                mandate={mandate}
                viewAs={viewMode}
                onAccept={acceptMandate}
                onRefuse={refuseMandate}
                onTerminate={terminateMandate}
                onSuspend={suspendMandate}
                onReactivate={reactivateMandate}
                onManagePermissions={handleManagePermissions}
                onSign={handleSign}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <InviteAgencyDialog
        isOpen={showInviteDialog}
        onClose={() => setShowInviteDialog(false)}
        onInvite={handleInvite}
        properties={myProperties}
        agencies={agencies}
      />

      {selectedMandate && (
        <MandatePermissionsForm
          isOpen={showPermissionsDialog}
          onClose={() => {
            setShowPermissionsDialog(false);
            setSelectedMandate(null);
          }}
          mandate={selectedMandate}
          onSave={handleSavePermissions}
        />
      )}
    </div>
  );
}
