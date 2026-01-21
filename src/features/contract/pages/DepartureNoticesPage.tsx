import { useState } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui';
import Button from '@/shared/ui/Button';
import { LogOut, Calendar, Check, Loader2, AlertTriangle, FileText } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui';

interface DepartureNotice {
  id: string;
  lease_id: string;
  initiated_by: 'tenant' | 'owner';
  notice_date: string;
  departure_date: string;
  reason: string | null;
  reason_details: string | null;
  status: string;
  deposit_return_amount: number | null;
  deposit_deductions: unknown[];
  created_at: string;
  lease_contracts?: {
    contract_number: string;
    monthly_rent: number;
    deposit_amount: number;
    property_id: string;
    tenant_id: string;
    properties?: {
      title: string;
      address: string;
    };
  };
  tenant_name?: string;
}

interface ActiveLease {
  id: string;
  contract_number: string;
  monthly_rent: number;
  deposit_amount: number;
  tenant_id: string;
  property_id: string;
  properties?: {
    title: string;
    address: string;
  };
  tenant_name?: string;
}

const DEPARTURE_REASONS = [
  { value: 'end_of_lease', label: 'Fin de bail' },
  { value: 'mutual_agreement', label: 'Accord mutuel' },
  { value: 'non_payment', label: 'Non-paiement du loyer' },
  { value: 'breach_of_contract', label: 'Violation du contrat' },
  { value: 'property_sale', label: 'Vente du bien' },
  { value: 'personal_use', label: 'Reprise pour usage personnel' },
  { value: 'other', label: 'Autre' },
];

export default function DepartureNoticesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedLease, setSelectedLease] = useState<ActiveLease | null>(null);
  const [noticeForm, setNoticeForm] = useState({
    departureDate: '',
    reason: '',
    reasonDetails: '',
  });

  // Fetch notices
  const { data: notices, isLoading } = useQuery({
    queryKey: ['departure-notices', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departure_notices')
        .select(
          `
          *,
          lease_contracts (
            contract_number,
            monthly_rent,
            deposit_amount,
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
        ...new Set(data?.map((n) => n.lease_contracts?.tenant_id).filter(Boolean) as string[]),
      ];
      const { data: profiles } = await supabase
        .from('profiles_with_user_id')
        .select('user_id, full_name')
        .in('user_id', tenantIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p.full_name]) || []);

      return data?.map((n) => ({
        ...n,
        tenant_name: n.lease_contracts?.tenant_id
          ? profileMap.get(n.lease_contracts.tenant_id)
          : undefined,
      })) as DepartureNotice[];
    },
    enabled: !!user?.id,
  });

  // Fetch active leases for creating new notice
  const { data: activeLeases } = useQuery({
    queryKey: ['active-leases-for-notice', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lease_contracts')
        .select(
          `
          id,
          contract_number,
          monthly_rent,
          deposit_amount,
          tenant_id,
          property_id,
          properties (title, address)
        `
        )
        .eq('owner_id', user?.id ?? '')
        .eq('status', 'active');

      if (error) throw error;

      // Fetch tenant names separately
      const tenantIds = [...new Set(data?.map((l) => l.tenant_id).filter(Boolean) as string[])];
      const { data: profiles } = await supabase
        .from('profiles_with_user_id')
        .select('user_id, full_name')
        .in('user_id', tenantIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p.full_name]) || []);

      return data?.map((l) => ({
        ...l,
        tenant_name: profileMap.get(l.tenant_id),
      })) as ActiveLease[];
    },
    enabled: !!user?.id,
  });

  // Create notice mutation
  const createNotice = useMutation({
    mutationFn: async () => {
      if (!selectedLease) return;

      const { error } = await supabase.from('departure_notices').insert({
        lease_id: selectedLease.id,
        initiated_by: 'owner',
        notice_date: format(new Date(), 'yyyy-MM-dd'),
        departure_date: noticeForm.departureDate,
        reason: noticeForm.reason,
        reason_details: noticeForm.reasonDetails || null,
        status: 'pending',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departure-notices'] });
      setShowCreateModal(false);
      setSelectedLease(null);
      setNoticeForm({ departureDate: '', reason: '', reasonDetails: '' });
    },
  });

  // Acknowledge notice mutation
  const acknowledgeNotice = useMutation({
    mutationFn: async (noticeId: string) => {
      const { error } = await supabase
        .from('departure_notices')
        .update({
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: user?.id,
          status: 'acknowledged',
        })
        .eq('id', noticeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departure-notices'] });
    },
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'En attente' },
      acknowledged: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Accusé réception' },
      inventory_scheduled: {
        bg: 'bg-purple-100',
        text: 'text-purple-700',
        label: 'État des lieux prévu',
      },
      completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Terminé' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Annulé' },
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

  const openCreateModal = (lease: ActiveLease) => {
    setSelectedLease(lease);
    // Default departure date is 3 months from now (typical notice period)
    const defaultDate = new Date();
    defaultDate.setMonth(defaultDate.getMonth() + 3);
    setNoticeForm({
      departureDate: format(defaultDate, 'yyyy-MM-dd'),
      reason: '',
      reasonDetails: '',
    });
    setShowCreateModal(true);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F4] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#2C1810]">Préavis de départ</h1>
            <p className="text-[#2C1810]/60">Gérez les fins de bail et les préavis</p>
          </div>
        </div>

        {/* Active Leases for Quick Action */}
        {activeLeases && activeLeases.length > 0 && (
          <Card className="rounded-[24px] border-[#EFEBE9]">
            <CardHeader>
              <CardTitle className="text-[#2C1810]">Baux actifs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeLeases.map((lease) => (
                  <div key={lease.id} className="p-4 bg-white border border-[#EFEBE9] rounded-xl">
                    <p className="font-medium text-[#2C1810] truncate">{lease.properties?.title}</p>
                    <p className="text-sm text-[#2C1810]/60">{lease.tenant_name}</p>
                    <p className="text-xs text-[#2C1810]/40 mt-1">
                      Loyer: {formatCurrency(lease.monthly_rent)}
                    </p>
                    <Button
                      variant="outline"
                      size="small"
                      className="mt-3 w-full rounded-lg"
                      onClick={() => openCreateModal(lease)}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Donner préavis
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notices List */}
        <Card className="rounded-[24px] border-[#EFEBE9]">
          <CardHeader>
            <CardTitle className="text-[#2C1810]">Préavis en cours</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#F16522]" />
              </div>
            ) : notices && notices.length > 0 ? (
              <div className="space-y-4">
                {notices.map((notice) => {
                  const daysUntilDeparture = differenceInDays(
                    new Date(notice.departure_date),
                    new Date()
                  );

                  return (
                    <div
                      key={notice.id}
                      className="p-4 bg-white border border-[#EFEBE9] rounded-xl"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className={`p-3 rounded-xl ${
                              notice.initiated_by === 'tenant' ? 'bg-blue-50' : 'bg-amber-50'
                            }`}
                          >
                            <LogOut
                              className={`h-6 w-6 ${
                                notice.initiated_by === 'tenant'
                                  ? 'text-blue-600'
                                  : 'text-amber-600'
                              }`}
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              {getStatusBadge(notice.status)}
                              <span
                                className={`text-xs px-2 py-0.5 rounded ${
                                  notice.initiated_by === 'tenant'
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'bg-amber-50 text-amber-600'
                                }`}
                              >
                                {notice.initiated_by === 'tenant'
                                  ? 'Par le locataire'
                                  : 'Par le propriétaire'}
                              </span>
                            </div>
                            <p className="font-medium text-[#2C1810]">
                              {notice.lease_contracts?.properties?.title}
                            </p>
                            <p className="text-sm text-[#2C1810]/60">
                              {notice.tenant_name} • {notice.lease_contracts?.contract_number}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-[#2C1810]/40">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Préavis: {format(new Date(notice.notice_date), 'dd/MM/yyyy')}
                              </span>
                              <span
                                className={`flex items-center gap-1 ${
                                  daysUntilDeparture <= 30 ? 'text-red-600' : ''
                                }`}
                              >
                                <LogOut className="h-3 w-3" />
                                Départ: {format(new Date(notice.departure_date), 'dd/MM/yyyy')}
                                {daysUntilDeparture > 0 && ` (${daysUntilDeparture}j)`}
                              </span>
                            </div>
                            {notice.reason && (
                              <p className="text-sm text-[#2C1810]/60 mt-2">
                                Motif:{' '}
                                {DEPARTURE_REASONS.find((r) => r.value === notice.reason)?.label ||
                                  notice.reason}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          {notice.lease_contracts?.deposit_amount && (
                            <div className="text-right">
                              <p className="text-xs text-[#2C1810]/40">Caution</p>
                              <p className="font-semibold text-[#2C1810]">
                                {formatCurrency(notice.lease_contracts.deposit_amount)}
                              </p>
                            </div>
                          )}

                          {notice.status === 'pending' && notice.initiated_by === 'tenant' && (
                            <Button
                              size="small"
                              className="bg-[#F16522] hover:bg-[#F16522]/90 rounded-lg"
                              onClick={() => acknowledgeNotice.mutate(notice.id)}
                              disabled={acknowledgeNotice.isPending}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Accuser réception
                            </Button>
                          )}

                          {notice.status === 'acknowledged' && (
                            <Button variant="outline" size="small" className="rounded-lg">
                              <FileText className="h-4 w-4 mr-1" />
                              Planifier état des lieux
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <LogOut className="h-12 w-12 text-[#2C1810]/20 mx-auto mb-4" />
                <p className="text-[#2C1810]/60">Aucun préavis en cours</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Notice Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="rounded-[24px]">
            <DialogHeader>
              <DialogTitle className="text-[#2C1810]">Donner un préavis de départ</DialogTitle>
            </DialogHeader>

            {selectedLease && (
              <div className="space-y-4">
                <div className="p-4 bg-[#FAF7F4] rounded-xl">
                  <p className="font-medium text-[#2C1810]">{selectedLease.properties?.title}</p>
                  <p className="text-sm text-[#2C1810]/60">{selectedLease.tenant_name}</p>
                  <p className="text-sm text-[#2C1810]/60">
                    Caution: {formatCurrency(selectedLease.deposit_amount || 0)}
                  </p>
                </div>

                <div className="p-4 bg-amber-50 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    En Côte d'Ivoire, le délai de préavis légal est généralement de 3 mois pour les
                    baux d'habitation.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#2C1810] mb-2">
                    Date de départ souhaitée
                  </label>
                  <input
                    type="date"
                    value={noticeForm.departureDate}
                    onChange={(e) =>
                      setNoticeForm((prev) => ({ ...prev, departureDate: e.target.value }))
                    }
                    className="w-full p-3 border border-[#EFEBE9] rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#2C1810] mb-2">
                    Motif du préavis
                  </label>
                  <select
                    value={noticeForm.reason}
                    onChange={(e) => setNoticeForm((prev) => ({ ...prev, reason: e.target.value }))}
                    className="w-full p-3 border border-[#EFEBE9] rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-transparent"
                  >
                    <option value="">Sélectionnez un motif</option>
                    {DEPARTURE_REASONS.map((reason) => (
                      <option key={reason.value} value={reason.value}>
                        {reason.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#2C1810] mb-2">
                    Détails (optionnel)
                  </label>
                  <textarea
                    value={noticeForm.reasonDetails}
                    onChange={(e) =>
                      setNoticeForm((prev) => ({ ...prev, reasonDetails: e.target.value }))
                    }
                    rows={3}
                    className="w-full p-3 border border-[#EFEBE9] rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-transparent resize-none"
                    placeholder="Informations supplémentaires..."
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
                onClick={() => createNotice.mutate()}
                disabled={createNotice.isPending}
              >
                {createNotice.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Envoyer le préavis
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
