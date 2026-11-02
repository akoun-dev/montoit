import { useState } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui';
import Button from '@/shared/ui/Button';
import {
  Calendar,
  RefreshCw,
  Plus,
  Check,
  AlertTriangle,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { format, addYears, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui';

interface LeaseRenewal {
  id: string;
  lease_id: string;
  original_end_date: string;
  proposed_end_date: string;
  proposed_rent: number | null;
  rent_increase_percent: number | null;
  status: string;
  tenant_response_at: string | null;
  owner_response_at: string | null;
  tenant_notes: string | null;
  owner_notes: string | null;
  created_at: string;
  lease_contracts?: {
    contract_number: string;
    monthly_rent: number;
    property_id: string;
    tenant_id: string;
    properties?: {
      title: string;
      address: string;
    };
  };
  tenant_name?: string;
}

interface ExpiringLease {
  id: string;
  contract_number: string;
  end_date: string;
  monthly_rent: number;
  tenant_id: string;
  property_id: string;
  properties?: {
    title: string;
    address: string;
  };
  tenant_name?: string;
}

export default function LeaseRenewalsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedLease, setSelectedLease] = useState<ExpiringLease | null>(null);
  const [renewalForm, setRenewalForm] = useState({
    proposedEndDate: '',
    proposedRent: '',
    rentIncreasePercent: '',
    notes: '',
  });

  // Fetch renewals
  const { data: renewals, isLoading: loadingRenewals } = useQuery({
    queryKey: ['lease-renewals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lease_renewals')
        .select(
          `
          *,
          lease_contracts (
            contract_number,
            monthly_rent,
            property_id,
            tenant_id,
            properties (title, address)
          )
        `
        )
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch tenant names separately
      const tenantIds = [
        ...new Set(data?.map((r) => r.lease_contracts?.tenant_id).filter(Boolean) as string[]),
      ];
      const { data: profiles } = await supabase
        .from('profiles_with_user_id')
        .select('user_id, full_name')
        .in('user_id', tenantIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p.full_name]) || []);

      return data?.map((r) => ({
        ...r,
        tenant_name: r.lease_contracts?.tenant_id
          ? profileMap.get(r.lease_contracts.tenant_id)
          : undefined,
      })) as LeaseRenewal[];
    },
    enabled: !!user?.id,
  });

  // Fetch expiring leases (no renewal yet)
  const { data: expiringLeases } = useQuery({
    queryKey: ['expiring-leases', user?.id],
    queryFn: async () => {
      const in90Days = format(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('lease_contracts')
        .select(
          `
          id,
          contract_number,
          end_date,
          monthly_rent,
          tenant_id,
          property_id,
          properties (title, address)
        `
        )
        .eq('owner_id', user?.id ?? '')
        .eq('status', 'active')
        .lte('end_date', in90Days)
        .order('end_date', { ascending: true });

      if (error) throw error;

      // Fetch tenant names separately
      const tenantIds = [...new Set(data?.map((l) => l.tenant_id).filter(Boolean) as string[])];
      const { data: profiles } = await supabase
        .from('profiles_with_user_id')
        .select('user_id, full_name')
        .in('user_id', tenantIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p.full_name]) || []);

      // Filter out leases that already have pending renewals
      const renewalLeaseIds =
        renewals?.filter((r) => r.status === 'pending').map((r) => r.lease_id) || [];
      return (
        data?.map((l) => ({
          ...l,
          tenant_name: profileMap.get(l.tenant_id),
        })) as ExpiringLease[]
      ).filter((l) => !renewalLeaseIds.includes(l.id));
    },
    enabled: !!user?.id && !!renewals,
  });

  // Create renewal mutation
  const createRenewal = useMutation({
    mutationFn: async () => {
      if (!selectedLease) return;

      const { error } = await supabase.from('lease_renewals').insert({
        lease_id: selectedLease.id,
        original_end_date: selectedLease.end_date,
        proposed_end_date: renewalForm.proposedEndDate,
        proposed_rent: renewalForm.proposedRent ? parseFloat(renewalForm.proposedRent) : null,
        rent_increase_percent: renewalForm.rentIncreasePercent
          ? parseFloat(renewalForm.rentIncreasePercent)
          : null,
        owner_notes: renewalForm.notes,
        status: 'pending',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lease-renewals'] });
      queryClient.invalidateQueries({ queryKey: ['expiring-leases'] });
      setShowCreateModal(false);
      setSelectedLease(null);
      setRenewalForm({ proposedEndDate: '', proposedRent: '', rentIncreasePercent: '', notes: '' });
    },
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'En attente' },
      tenant_accepted: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        label: 'Accepté par locataire',
      },
      tenant_rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Refusé par locataire' },
      finalized: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Finalisé' },
      expired: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Expiré' },
    };
    const style = styles[status] ?? styles['pending'];
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium ${style?.bg ?? ''} ${style?.text ?? ''}`}
      >
        {style?.label ?? status}
      </span>
    );
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-CI', { style: 'currency', currency: 'XOF' }).format(amount);

  const openCreateModal = (lease: ExpiringLease) => {
    setSelectedLease(lease);
    setRenewalForm({
      proposedEndDate: format(addYears(new Date(lease.end_date), 1), 'yyyy-MM-dd'),
      proposedRent: lease.monthly_rent.toString(),
      rentIncreasePercent: '0',
      notes: '',
    });
    setShowCreateModal(true);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F4] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#2C1810]">Renouvellements de baux</h1>
            <p className="text-[#2C1810]/60">
              Gérez les renouvellements de vos contrats de location
            </p>
          </div>
        </div>

        {/* Expiring Leases Alert */}
        {expiringLeases && expiringLeases.length > 0 && (
          <Card className="rounded-[24px] border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="text-amber-800 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Baux expirant prochainement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {expiringLeases.map((lease) => {
                const daysLeft = differenceInDays(new Date(lease.end_date), new Date());
                return (
                  <div
                    key={lease.id}
                    className="flex items-center justify-between p-4 bg-white rounded-xl"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-2 rounded-lg ${daysLeft <= 30 ? 'bg-red-100' : 'bg-amber-100'}`}
                      >
                        <Calendar
                          className={`h-5 w-5 ${daysLeft <= 30 ? 'text-red-600' : 'text-amber-600'}`}
                        />
                      </div>
                      <div>
                        <p className="font-medium text-[#2C1810]">
                          {lease.properties?.title || lease.contract_number}
                        </p>
                        <p className="text-sm text-[#2C1810]/60">
                          {lease.tenant_name} • Expire le{' '}
                          {format(new Date(lease.end_date), 'dd MMMM yyyy', { locale: fr })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-sm font-medium ${daysLeft <= 30 ? 'text-red-600' : 'text-amber-600'}`}
                      >
                        {daysLeft}j restants
                      </span>
                      <Button
                        size="small"
                        className="bg-[#F16522] hover:bg-[#F16522]/90 rounded-lg"
                        onClick={() => openCreateModal(lease)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Proposer renouvellement
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Renewals List */}
        <Card className="rounded-[24px] border-[#EFEBE9]">
          <CardHeader>
            <CardTitle className="text-[#2C1810]">Demandes de renouvellement</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRenewals ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#F16522]" />
              </div>
            ) : renewals && renewals.length > 0 ? (
              <div className="space-y-4">
                {renewals.map((renewal) => (
                  <div
                    key={renewal.id}
                    className="flex items-center justify-between p-4 bg-white border border-[#EFEBE9] rounded-xl hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-50 rounded-xl">
                        <RefreshCw className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-[#2C1810]">
                          {renewal.lease_contracts?.properties?.title ||
                            renewal.lease_contracts?.contract_number}
                        </p>
                        <p className="text-sm text-[#2C1810]/60">{renewal.tenant_name}</p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-[#2C1810]/40">
                          <span>
                            Fin actuelle:{' '}
                            {format(new Date(renewal.original_end_date), 'dd/MM/yyyy')}
                          </span>
                          <ChevronRight className="h-3 w-3" />
                          <span className="text-[#F16522]">
                            Proposé: {format(new Date(renewal.proposed_end_date), 'dd/MM/yyyy')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {renewal.proposed_rent && (
                        <div className="text-right">
                          <p className="text-sm text-[#2C1810]/60">Nouveau loyer</p>
                          <p className="font-semibold text-[#2C1810]">
                            {formatCurrency(renewal.proposed_rent)}
                          </p>
                        </div>
                      )}
                      {getStatusBadge(renewal.status)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <RefreshCw className="h-12 w-12 text-[#2C1810]/20 mx-auto mb-4" />
                <p className="text-[#2C1810]/60">Aucune demande de renouvellement</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Renewal Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="rounded-[24px]">
            <DialogHeader>
              <DialogTitle className="text-[#2C1810]">Proposer un renouvellement</DialogTitle>
            </DialogHeader>

            {selectedLease && (
              <div className="space-y-4">
                <div className="p-4 bg-[#FAF7F4] rounded-xl">
                  <p className="font-medium text-[#2C1810]">{selectedLease.properties?.title}</p>
                  <p className="text-sm text-[#2C1810]/60">{selectedLease.tenant_name}</p>
                  <p className="text-sm text-[#2C1810]/60">
                    Loyer actuel: {formatCurrency(selectedLease.monthly_rent)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#2C1810] mb-2">
                    Nouvelle date de fin
                  </label>
                  <input
                    type="date"
                    value={renewalForm.proposedEndDate}
                    onChange={(e) =>
                      setRenewalForm((prev) => ({ ...prev, proposedEndDate: e.target.value }))
                    }
                    className="w-full p-3 border border-[#EFEBE9] rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#2C1810] mb-2">
                      Nouveau loyer (FCFA)
                    </label>
                    <input
                      type="number"
                      value={renewalForm.proposedRent}
                      onChange={(e) =>
                        setRenewalForm((prev) => ({ ...prev, proposedRent: e.target.value }))
                      }
                      className="w-full p-3 border border-[#EFEBE9] rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#2C1810] mb-2">
                      Augmentation (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={renewalForm.rentIncreasePercent}
                      onChange={(e) => {
                        const percent = parseFloat(e.target.value) || 0;
                        const newRent = selectedLease.monthly_rent * (1 + percent / 100);
                        setRenewalForm((prev) => ({
                          ...prev,
                          rentIncreasePercent: e.target.value,
                          proposedRent: Math.round(newRent).toString(),
                        }));
                      }}
                      className="w-full p-3 border border-[#EFEBE9] rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#2C1810] mb-2">
                    Notes (optionnel)
                  </label>
                  <textarea
                    value={renewalForm.notes}
                    onChange={(e) => setRenewalForm((prev) => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full p-3 border border-[#EFEBE9] rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-transparent resize-none"
                    placeholder="Message pour le locataire..."
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                className="rounded-xl"
              >
                Annuler
              </Button>
              <Button
                className="bg-[#F16522] hover:bg-[#F16522]/90 rounded-xl"
                onClick={() => createRenewal.mutate()}
                disabled={createRenewal.isPending}
              >
                {createRenewal.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Envoyer la proposition
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
