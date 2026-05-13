import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Eye, Edit, X, CheckCircle, Pen, Ban, Loader2 } from 'lucide-react';
import TenantDashboardLayout from '../../features/tenant/components/TenantDashboardLayout';
import { AddressValue, formatAddress } from '@/shared/utils/address';
import TerminateLeaseModal from './TerminateLeaseModal';

interface Contract {
  id: string;
  contract_number: string;
  property_id: string;
  status: string;
  start_date: string;
  end_at: string | null;
  monthly_rent: number;
  deposit_amount: number;
  charges_amount: number;
  owner_signed_at: string | null;
  tenant_signed_at: string | null;
  created_at: string;
  property: {
    title: string;
    address: AddressValue;
    city: string;
    main_image: string | null;
  };
  owner: {
    id: string;
    full_name: string;
    email: string;
    phone: string;
  };
  tenant: {
    id: string;
    full_name: string;
    email: string;
    phone: string;
  };
}

export default function MyContracts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'expired'>('all');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [terminateModalOpen, setTerminateModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  useEffect(() => {
    if (user) {
      loadContracts();
    }
  }, [user, filter]);

  const loadContracts = useCallback(async () => {
    try {
      let query = supabase
        .from('lease_contracts')
        .select(
          `
          id,
          contract_number,
          property_id,
          status,
          start_date,
          end_at,
          monthly_rent,
          deposit_amount,
          charges_amount,
          owner_signed_at,
          tenant_signed_at,
          created_at,
          properties!inner(title, address, city, main_image),
          owner:profiles!lease_contracts_owner_id_fkey(id, full_name, email, phone),
          tenant:profiles!lease_contracts_tenant_id_fkey(id, full_name, email, phone)
        `
        )
        .or(`owner_id.eq.${user?.id},tenant_id.eq.${user?.id}`)
        .order('created_at', { ascending: false });

      if (filter === 'active') {
        query = query.eq('status', 'active');
      } else if (filter === 'pending') {
        query = query.in('status', ['draft', 'pending_signature']);
      } else if (filter === 'expired') {
        query = query.in('status', ['expired', 'terminated', 'cancelled']);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedContracts = (data || []).map((contract: Contract) => ({
        id: contract.id,
        contract_number: contract.contract_number,
        property_id: contract.property_id,
        status: contract.status,
        start_date: contract.start_date,
        end_at: contract.end_at,
        monthly_rent: contract.monthly_rent,
        deposit_amount: contract.deposit_amount,
        charges_amount: contract.charges_amount,
        owner_signed_at: contract.owner_signed_at,
        tenant_signed_at: contract.tenant_signed_at,
        created_at: contract.created_at,
        property: contract.properties,
        owner: contract.owner,
        tenant: contract.tenant,
      }));

      setContracts(formattedContracts);
    } catch (error) {
      console.error('Error loading contracts:', error);
    } finally {
      setLoading(false);
    }
  }, [user, filter, setLoading, setContracts]);

  useEffect(() => {
    if (user) {
      loadContracts();
    }
  }, [user, loadContracts]);

  const canCancelContract = (contract: Contract) => {
    // Can cancel if contract is in draft, pending_signature, or even active (with conditions)
    const cancellableStatuses = ['draft', 'pending_signature'];
    return cancellableStatuses.includes(contract.status);
  };

  const canTerminateContract = (contract: Contract) => {
    // Tenants can terminate active contracts
    return contract.status === 'active' && contract.tenant_id === user?.id;
  };

  const handleTerminateContract = (contract: Contract) => {
    setSelectedContract(contract);
    setTerminateModalOpen(true);
  };

  const handleTerminationSuccess = () => {
    loadContracts();
  };

  const handleCancelContract = async (contractId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler ce contrat ? Cette action est irréversible.')) {
      return;
    }

    try {
      setCancellingId(contractId);

      const { error } = await supabase
        .from('lease_contracts')
        .update({ status: 'cancelled' })
        .eq('id', contractId);

      if (error) throw error;

      // Reload contracts after cancellation
      await loadContracts();
    } catch (error) {
      console.error('Error cancelling contract:', error);
      alert('Erreur lors de l\'annulation du contrat');
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      pending_signature: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
      terminated: 'bg-red-100 text-red-800',
      cancelled: 'bg-red-100 text-red-800',
    };

    const labels = {
      draft: 'Brouillon',
      pending_signature: 'En attente',
      active: 'Actif',
      expired: 'Expiré',
      terminated: 'Résilié',
      cancelled: 'Annulé',
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status as keyof typeof styles]}`}
      >
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getContractTypeLabel = (contract: Contract) => 'Bail';

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const isOwner = (contract: Contract) => {
    return contract.owner.id === user?.id;
  };

  if (!user) {
    return (
      <TenantDashboardLayout title="Mes Contrats" icon={<FileText className="h-5 w-5" />} description="Gérez vos contrats de bail">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <FileText className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-neutral-900 mb-2">Connexion requise</h2>
            <p className="text-neutral-600">Veuillez vous connecter pour voir vos contrats</p>
          </div>
        </div>
      </TenantDashboardLayout>
    );
  }

  return (
    <TenantDashboardLayout title="Mes Contrats" icon={<FileText className="h-5 w-5" />} description="Gérez vos contrats de bail">
      <div className="w-full">
        {/* Header Banner */}
        <div className="bg-[#2C1810] rounded-[20px] p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="hidden lg:flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#F16522] flex items-center justify-center flex-shrink-0">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Mes Contrats</h1>
                <p className="text-[#E8D4C5] mt-1">Gérez vos contrats de bail</p>
              </div>
            </div>

            <div className="flex gap-1.5 sm:gap-2 flex-wrap">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-xl font-semibold transition ${
                  filter === 'all'
                    ? 'bg-white text-[#F16522]'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setFilter('active')}
                className={`px-4 py-2 rounded-xl font-semibold transition ${
                  filter === 'active'
                    ? 'bg-white text-[#F16522]'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                Actifs
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-4 py-2 rounded-xl font-semibold transition ${
                  filter === 'pending'
                    ? 'bg-white text-[#F16522]'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                En attente
              </button>
              <button
                onClick={() => setFilter('expired')}
                className={`px-4 py-2 rounded-xl font-semibold transition ${
                  filter === 'expired'
                    ? 'bg-white text-[#F16522]'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                Expirés
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          </div>
        ) : contracts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun contrat</h3>
            <p className="text-gray-600">Vous n'avez pas encore de contrat de bail</p>
          </div>
        ) : (
          <div className="space-y-6">
            {contracts.map((contract) => (
              <div key={contract.id} className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-1/4">
                    <img
                      src={contract.property.main_image || 'https://via.placeholder.com/400x300'}
                      alt={contract.property.title}
                      className="w-full h-36 sm:h-48 md:h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 p-4 sm:p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-900">
                            {contract.contract_number}
                          </h3>
                          {getStatusBadge(contract.status)}
                        </div>
                        <p className="text-gray-600 font-semibold mb-1">
                          {contract.property.title}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatAddress(contract.property.address, contract.property.city)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Type</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {getContractTypeLabel(contract)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Date de début</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatDate(contract.start_date)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Loyer mensuel</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {contract.monthly_rent.toLocaleString()} FCFA
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Caution</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {contract.deposit_amount.toLocaleString()} FCFA
                        </p>
                      </div>
                    </div>

                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            {isOwner(contract) ? 'Locataire' : 'Propriétaire'}
                          </p>
                          <p className="text-sm font-semibold text-gray-900">
                            {isOwner(contract)
                              ? contract.tenant.full_name
                              : contract.owner.full_name}
                          </p>
                          <p className="text-xs text-gray-600">
                            {isOwner(contract) ? contract.tenant.email : contract.owner.email}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Signatures</p>
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-1">
                              {contract.owner_signed_at ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : (
                                <X className="w-4 h-4 text-red-600" />
                              )}
                              <span className="text-xs text-gray-600">Propriétaire</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              {contract.tenant_signed_at ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : (
                                <X className="w-4 h-4 text-red-600" />
                              )}
                              <span className="text-xs text-gray-600">Locataire</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      <button
                        onClick={() => navigate(`/locataire/contrat/${contract.id}`)}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition flex items-center space-x-2"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Voir le contrat</span>
                      </button>

                      {/* Bouton Signer le contrat si pas encore signé par l'utilisateur */}
                      {(() => {
                        const needsToSign =
                          (isOwner(contract) && !contract.owner_signed_at) ||
                          (!isOwner(contract) && !contract.tenant_signed_at);

                        return needsToSign ? (
                          <button
                            onClick={() => navigate(
                              isOwner(contract)
                                ? `/proprietaire/contrats/${contract.id}`
                                : `/locataire/contrat/${contract.id}`
                            )}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center space-x-2"
                          >
                            <Pen className="w-4 h-4" />
                            <span>Signer le contrat</span>
                          </button>
                        ) : null;
                      })()}

                      {contract.status === 'draft' && isOwner(contract) && (
                        <button
                          onClick={() => navigate(`/locataire/contrat/${contract.id}/editer`)}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center space-x-2"
                        >
                          <Edit className="w-4 h-4" />
                          <span>Modifier</span>
                        </button>
                      )}

                      {canCancelContract(contract) && (
                        <button
                          onClick={() => handleCancelContract(contract.id)}
                          disabled={cancellingId === contract.id}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {cancellingId === contract.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Annulation...</span>
                            </>
                          ) : (
                            <>
                              <Ban className="w-4 h-4" />
                              <span>Annuler</span>
                            </>
                          )}
                        </button>
                      )}

                      {canTerminateContract(contract) && (
                        <button
                          onClick={() => handleTerminateContract(contract)}
                          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition flex items-center space-x-2"
                        >
                          <Ban className="w-4 h-4" />
                          <span>Résilier le bail</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Terminate Lease Modal */}
      {selectedContract && (
        <TerminateLeaseModal
          isOpen={terminateModalOpen}
          onClose={() => {
            setTerminateModalOpen(false);
            setSelectedContract(null);
          }}
          onSubmit={handleTerminationSuccess}
          contractId={selectedContract.id}
          propertyTitle={selectedContract.property.title}
          contractNumber={selectedContract.contract_number}
          startDate={selectedContract.start_date}
          endDate={selectedContract.end_at}
        />
      )}
    </TenantDashboardLayout>
  );
}
