import { useState, useEffect, ChangeEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import {
  Button,
  Input,
  Card,
  CardContent,
  Badge,
  Textarea,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui';
import { toast } from 'sonner';
import {
  UserPlus,
  Search,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  Briefcase,
  FileText,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Json } from '@/integrations/supabase/types';

interface RegistrationRequest {
  id: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  years_experience: number | null;
  specialties: string[];
  certifications: string[];
  motivation: string | null;
  cv_url: string | null;
  status: string | null;
  rejection_reason: string | null;
  created_at: string | null;
}

function parseJsonArray(data: Json | null): string[] {
  if (Array.isArray(data)) {
    return data.filter((item): item is string => typeof item === 'string');
  }
  return [];
}

export default function RegistrationRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadAgency();
  }, [user]);

  const loadAgency = async () => {
    if (!user) return;

    const { data: agency } = await supabase
      .from('agencies')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (agency) {
      setAgencyId(agency.id);
      loadRequests(agency.id);
    } else {
      setLoading(false);
    }
  };

  const loadRequests = async (agencyIdParam: string) => {
    try {
      const { data, error } = await supabase
        .from('agent_registration_requests')
        .select('*')
        .eq('agency_id', agencyIdParam)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const requestsData = (data || []).map((req) => ({
        ...req,
        specialties: parseJsonArray(req.specialties),
        certifications: parseJsonArray(req.certifications),
      }));

      setRequests(requestsData);
    } catch (error) {
      console.error('Error loading requests:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: RegistrationRequest) => {
    setProcessing(true);
    try {
      const response = await supabase.functions.invoke('process-agent-registration', {
        body: {
          request_id: request.id,
          action: 'approve',
          reviewer_id: user?.id,
        },
      });

      if (response.error) throw response.error;

      toast.success('Candidature approuvée ! Agent créé.');
      if (agencyId) loadRequests(agencyId);
      setShowDetailModal(false);
    } catch (error) {
      console.error('Error approving:', error);
      toast.error("Erreur lors de l'approbation");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    setProcessing(true);
    try {
      const response = await supabase.functions.invoke('process-agent-registration', {
        body: {
          request_id: selectedRequest.id,
          action: 'reject',
          rejection_reason: rejectionReason,
          reviewer_id: user?.id,
        },
      });

      if (response.error) throw response.error;

      toast.success('Candidature rejetée');
      if (agencyId) loadRequests(agencyId);
      setShowRejectModal(false);
      setShowDetailModal(false);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting:', error);
      toast.error('Erreur lors du rejet');
    } finally {
      setProcessing(false);
    }
  };

  const filteredRequests = requests.filter((req) => {
    const matchesSearch =
      req.applicant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.applicant_email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  const getStatusBadge = (status: string | null) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = {
      pending: 'En attente',
      approved: 'Approuvée',
      rejected: 'Rejetée',
    };
    const s = status || 'pending';
    return <Badge className={styles[s] || styles['pending']}>{labels[s] || s}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F4] py-8">
      <div className="w-full mx-auto px-4 w-fullxl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#2C1810]">Demandes d'inscription</h1>
            <p className="text-[#2C1810]/60 mt-1">
              {pendingCount} demande{pendingCount > 1 ? 's' : ''} en attente de traitement
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2C1810]/40" />
            <Input
              placeholder="Rechercher un candidat..."
              value={searchQuery}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="pl-10 border-[#EFEBE9]"
            />
          </div>
          <div className="flex gap-2">
            {['pending', 'approved', 'rejected', 'all'].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'primary' : 'outline'}
                onClick={() => setStatusFilter(status)}
                className={statusFilter === status ? 'bg-[#F16522] hover:bg-[#D14E12]' : ''}
              >
                {status === 'pending' && 'En attente'}
                {status === 'approved' && 'Approuvées'}
                {status === 'rejected' && 'Rejetées'}
                {status === 'all' && 'Toutes'}
              </Button>
            ))}
          </div>
        </div>

        {/* Requests List */}
        {filteredRequests.length === 0 ? (
          <Card className="bg-white border-[#EFEBE9]">
            <CardContent className="p-12 text-center">
              <UserPlus className="w-12 h-12 mx-auto text-[#2C1810]/20 mb-4" />
              <h3 className="text-lg font-semibold text-[#2C1810] mb-2">Aucune demande</h3>
              <p className="text-[#2C1810]/60">Les demandes d'inscription apparaîtront ici</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <Card key={request.id} className="bg-white border-[#EFEBE9]">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#F16522]/10 flex items-center justify-center flex-shrink-0">
                        <UserPlus className="w-6 h-6 text-[#F16522]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-[#2C1810]">{request.applicant_name}</h3>
                          {getStatusBadge(request.status)}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-[#2C1810]/60">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {request.applicant_email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {request.applicant_phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-3 h-3" />
                            {request.years_experience ?? 0} ans d'expérience
                          </span>
                        </div>
                        <p className="text-sm text-[#2C1810]/60 mt-2">
                          Reçue le{' '}
                          {request.created_at
                            ? format(new Date(request.created_at), 'dd MMMM yyyy à HH:mm', {
                                locale: fr,
                              })
                            : '-'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-16 md:ml-0">
                      <Button
                        variant="outline"
                        size="small"
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowDetailModal(true);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Voir
                      </Button>
                      {request.status === 'pending' && (
                        <>
                          <Button
                            size="small"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApprove(request)}
                            disabled={processing}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approuver
                          </Button>
                          <Button
                            size="small"
                            variant="danger"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowRejectModal(true);
                            }}
                            disabled={processing}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Rejeter
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Detail Modal */}
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="sm:w-fullg">
            <DialogHeader>
              <DialogTitle>Détails de la candidature</DialogTitle>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-[#F16522]/10 flex items-center justify-center">
                    <UserPlus className="w-8 h-8 text-[#F16522]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-[#2C1810]">
                      {selectedRequest.applicant_name}
                    </h3>
                    {getStatusBadge(selectedRequest.status)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-[#2C1810]/60">Email</p>
                    <p className="text-[#2C1810]">{selectedRequest.applicant_email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#2C1810]/60">Téléphone</p>
                    <p className="text-[#2C1810]">{selectedRequest.applicant_phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#2C1810]/60">Expérience</p>
                    <p className="text-[#2C1810]">{selectedRequest.years_experience ?? 0} ans</p>
                  </div>
                </div>

                {selectedRequest.specialties.length > 0 && (
                  <div>
                    <p className="text-sm text-[#2C1810]/60 mb-2">Spécialités</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedRequest.specialties.map((spec, i) => (
                        <Badge key={i} variant="outline">
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedRequest.motivation && (
                  <div>
                    <p className="text-sm text-[#2C1810]/60 mb-1">Motivation</p>
                    <p className="text-[#2C1810] bg-[#FAF7F4] p-3 rounded-lg">
                      {selectedRequest.motivation}
                    </p>
                  </div>
                )}

                {selectedRequest.cv_url && (
                  <a
                    href={selectedRequest.cv_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-4 py-2 border border-[#EFEBE9] rounded-md text-[#2C1810] hover:bg-[#FAF7F4] transition-colors"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Voir le CV
                  </a>
                )}

                {selectedRequest.status === 'rejected' && selectedRequest.rejection_reason && (
                  <div className="bg-red-50 p-3 rounded-lg">
                    <p className="text-sm text-red-600 font-medium">Raison du rejet :</p>
                    <p className="text-red-700">{selectedRequest.rejection_reason}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              {selectedRequest?.status === 'pending' && (
                <>
                  <Button
                    variant="danger"
                    onClick={() => setShowRejectModal(true)}
                    disabled={processing}
                  >
                    Rejeter
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleApprove(selectedRequest)}
                    disabled={processing}
                  >
                    Approuver
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Modal */}
        <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rejeter la candidature</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-[#2C1810]/70">
                Veuillez indiquer la raison du rejet. Cette information sera conservée pour
                référence.
              </p>
              <Textarea
                placeholder="Raison du rejet..."
                value={rejectionReason}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                  setRejectionReason(e.target.value)
                }
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectModal(false)}>
                Annuler
              </Button>
              <Button
                variant="danger"
                onClick={handleReject}
                disabled={processing || !rejectionReason.trim()}
              >
                Confirmer le rejet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
