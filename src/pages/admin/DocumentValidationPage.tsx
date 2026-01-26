/**
 * DocumentValidationPage - Page de validation des documents pour les admins
 *
 * Permet aux administrateurs de valider les documents envoyés par les utilisateurs
 * - Queue de documents en attente
 * - Visualisation des documents (PDF/image)
 * - Actions: Approuver, Rejeter, Demander correction
 * - Statistiques de validation
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  RefreshCw,
  Clock,
  User,
  FileCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/shared/lib/utils';

import { AdminPageHeader } from '@/shared/ui/admin/AdminPageHeader';
import { useUserRoles } from '@/hooks/shared/useUserRoles';
import { useAuth } from '@/app/providers/AuthProvider';
import Button from '@/shared/ui/Button';
import { FormatService } from '@/services/format/formatService';

// Types
type VerificationStatus = 'en_attente' | 'en_cours' | 'approuve' | 'rejete' | 'expire';
type DocumentType = 'piece_identite' | 'justificatif_domicile' | 'revenus' | 'caution' | 'autre';

interface VerificationDocument {
  id: string;
  application_id: string;
  document_type: DocumentType;
  document_url: string;
  status: VerificationStatus;
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  rejection_reason?: string;
  notes?: string;
  applicant: {
    id: string;
    full_name: string;
    email: string;
    user_type: string;
  };
}

interface ValidationStats {
  pending: number;
  approved_today: number;
  rejected_today: number;
  avg_processing_time: number;
}

export default function DocumentValidationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin, loading: rolesLoading } = useUserRoles();
  const { user: currentUser } = useAuth();

  // États
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [status, setStatus] = useState<VerificationStatus | 'all'>('all');
  const [documentType, setDocumentType] = useState<DocumentType | 'all'>('all');
  const [selectedDoc, setSelectedDoc] = useState<VerificationDocument | null>(null);
  const [showViewer, setShowViewer] = useState(false);

  // Redirection si non admin (après le chargement)
  useEffect(() => {
    if (!rolesLoading && !isAdmin) {
      navigate('/admin/tableau-de-bord');
    }
  }, [isAdmin, rolesLoading, navigate]);

  // Récupérer les documents en attente
  const {
    data: documentsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'documents', page, limit, status, documentType],
    queryFn: async () => {
      const { supabase } = await import('@/integrations/supabase/client');

      let query = supabase
        .from('verification_documents')
        .select(`
          *,
          applicant:profiles!inner(id, full_name, email, user_type)
        `)
        .in('status', status === 'all' ? ['en_attente', 'en_cours'] : [status])
        .order('submitted_at', { ascending: false });

      if (documentType !== 'all') {
        query = query.eq('document_type', documentType);
      }

      const from = (page - 1) * limit;
      const to = page * limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        documents: data as VerificationDocument[],
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      };
    },
    enabled: isAdmin,
    refetchInterval: 30000, // Rafraîchir toutes les 30 secondes
  });

  // Récupérer les statistiques
  const { data: stats } = useQuery({
    queryKey: ['admin', 'documents', 'stats'],
    queryFn: async (): Promise<ValidationStats> => {
      const { supabase } = await import('@/integrations/supabase/client');

      // Documents en attente
      const { count: pending } = await supabase
        .from('verification_documents')
        .select('*', { count: 'exact', head: true })
        .in('status', ['en_attente', 'en_cours']);

      // Approuvés aujourd'hui
      const today = new Date().toISOString().split('T')[0];
      const { count: approved_today } = await supabase
        .from('verification_documents')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approuve')
        .gte('reviewed_at', today);

      // Rejetés aujourd'hui
      const { count: rejected_today } = await supabase
        .from('verification_documents')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'rejete')
        .gte('reviewed_at', today);

      return {
        pending: pending || 0,
        approved_today: approved_today || 0,
        rejected_today: rejected_today || 0,
        avg_processing_time: 0, // À calculer avec une vraie requête
      };
    },
    enabled: isAdmin,
  });

  // Mutation pour valider un document
  const approveMutation = useMutation({
    mutationFn: async ({ docId, notes }: { docId: string; notes?: string }) => {
      const { supabase } = await import('@/integrations/supabase/client');

      const { error } = await supabase
        .from('verification_documents')
        .update({
          status: 'approuve',
          reviewed_at: new Date().toISOString(),
          reviewed_by: currentUser?.id,
          notes,
        })
        .eq('id', docId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Document approuvé avec succès');
      queryClient.invalidateQueries({ queryKey: ['admin', 'documents'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'documents', 'stats'] });
      setShowViewer(false);
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Mutation pour rejeter un document
  const rejectMutation = useMutation({
    mutationFn: async ({ docId, reason }: { docId: string; reason: string }) => {
      const { supabase } = await import('@/integrations/supabase/client');

      const { error } = await supabase
        .from('verification_documents')
        .update({
          status: 'rejete',
          reviewed_at: new Date().toISOString(),
          reviewed_by: currentUser?.id,
          rejection_reason: reason,
        })
        .eq('id', docId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Document rejeté');
      queryClient.invalidateQueries({ queryKey: ['admin', 'documents'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'documents', 'stats'] });
      setShowViewer(false);
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const getStatusColor = (status: VerificationStatus) => {
    switch (status) {
      case 'en_attente':
        return 'bg-yellow-100 text-yellow-700';
      case 'en_cours':
        return 'bg-blue-100 text-blue-700';
      case 'approuve':
        return 'bg-green-100 text-green-700';
      case 'rejete':
        return 'bg-red-100 text-red-700';
      case 'expire':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: VerificationStatus) => {
    switch (status) {
      case 'en_attente':
        return 'En attente';
      case 'en_cours':
        return 'En cours';
      case 'approuve':
        return 'Approuvé';
      case 'rejete':
        return 'Rejeté';
      case 'expire':
        return 'Expiré';
      default:
        return status;
    }
  };

  const getDocTypeLabel = (type: DocumentType) => {
    const labels: Record<DocumentType, string> = {
      piece_identite: "Pièce d'identité",
      justificatif_domicile: 'Justificatif de domicile',
      revenus: 'Revenus',
      caution: 'Caution',
      autre: 'Autre',
    };
    return labels[type] || type;
  };

  const handleViewDocument = (doc: VerificationDocument) => {
    setSelectedDoc(doc);
    setShowViewer(true);
  };

  // Afficher un spinner pendant le chargement des rôles
  if (rolesLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#F16522] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F4] p-6">
      <div className="w-full">
        {/* Header */}
        <AdminPageHeader
          title="Validation des Documents"
          description="Revoyez et validez les documents des utilisateurs"
          icon={FileCheck}
          onRefresh={() => refetch()}
          refreshing={isLoading}
          breadcrumbs={[
            { label: 'Administration', href: '/admin/tableau-de-bord' },
            { label: 'Documents' },
          ]}
        />

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-[#6B5A4E]">En attente</p>
                  <p className="text-2xl font-bold text-[#2C1810]">{stats.pending}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-[#6B5A4E]">Approuvés (auj.)</p>
                  <p className="text-2xl font-bold text-[#2C1810]">{stats.approved_today}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-[#6B5A4E]">Rejetés (auj.)</p>
                  <p className="text-2xl font-bold text-[#2C1810]">{stats.rejected_today}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <RefreshCw className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-[#6B5A4E]">Temps moyen</p>
                  <p className="text-2xl font-bold text-[#2C1810]">
                    {stats.avg_processing_time}h
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#6B5A4E]" />
              <span className="text-sm font-medium text-[#2C1810]">Filtres:</span>
            </div>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as VerificationStatus | 'all');
                setPage(1);
              }}
              className="px-3 py-2 border border-[#EFEBE9] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F16522]"
            >
              <option value="all">Tous les statuts</option>
              <option value="en_attente">En attente</option>
              <option value="en_cours">En cours</option>
              <option value="approuve">Approuvés</option>
              <option value="rejete">Rejetés</option>
            </select>
            <select
              value={documentType}
              onChange={(e) => {
                setDocumentType(e.target.value as DocumentType | 'all');
                setPage(1);
              }}
              className="px-3 py-2 border border-[#EFEBE9] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F16522]"
            >
              <option value="all">Tous les types</option>
              <option value="piece_identite">Pièce d'identité</option>
              <option value="justificatif_domicile">Justificatif de domicile</option>
              <option value="revenus">Revenus</option>
              <option value="caution">Caution</option>
              <option value="autre">Autre</option>
            </select>
          </div>
        </div>

        {/* Documents List */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-12 text-center">
            <div className="w-12 h-12 border-4 border-[#F16522] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#6B5A4E]">Chargement des documents...</p>
          </div>
        ) : !documentsData || documentsData.documents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-12 text-center">
            <FileCheck className="w-16 h-16 text-[#EFEBE9] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#2C1810] mb-2">
              Aucun document à valider
            </h3>
            <p className="text-[#6B5A4E]">
              {status === 'all'
                ? 'Tous les documents ont été traités'
                : 'Aucun document avec ce statut'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {documentsData.documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-2xl border border-[#EFEBE9] p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  {/* Document Icon */}
                  <div className="p-3 bg-[#FAF7F4] rounded-xl">
                    <FileText className="w-6 h-6 text-[#F16522]" />
                  </div>

                  {/* Document Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-[#2C1810]">
                          {getDocTypeLabel(doc.document_type)}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', getStatusColor(doc.status))}>
                            {getStatusLabel(doc.status)}
                          </span>
                          <span className="text-xs text-[#6B5A4E]">
                            Soumis le {FormatService.formatDate(doc.submitted_at)}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleViewDocument(doc)}
                          variant="outline"
                          className="flex items-center gap-2 px-3 py-1.5 text-sm"
                        >
                          <Eye className="w-4 h-4" />
                          Voir
                        </Button>
                        <a
                          href={doc.document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-[#FAF7F4] rounded-lg"
                        >
                          <Download className="w-4 h-4 text-[#6B5A4E]" />
                        </a>
                      </div>
                    </div>

                    {/* Applicant Info */}
                    <div className="mt-3 pt-3 border-t border-[#EFEBE9]">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-[#6B5A4E]" />
                          <span className="font-medium text-[#2C1810]">{doc.applicant.full_name}</span>
                        </div>
                        <span className="text-[#6B5A4E]">({doc.applicant.email})</span>
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-medium',
                          doc.applicant.user_type === 'locataire' ? 'bg-blue-100 text-blue-700' :
                          doc.applicant.user_type === 'proprietaire' ? 'bg-green-100 text-green-700' :
                          doc.applicant.user_type === 'agence' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-700'
                        )}>
                          {doc.applicant.user_type}
                        </span>
                      </div>
                    </div>

                    {/* Review Info */}
                    {doc.reviewed_at && (
                      <div className="mt-2 text-xs text-[#6B5A4E]">
                        Revu le {FormatService.formatDateTime(doc.reviewed_at)}
                        {doc.rejection_reason && (
                          <span className="ml-2 text-red-600">
                            Raison: {doc.rejection_reason}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {documentsData && documentsData.totalPages > 1 && (
          <div className="mt-6 flex justify-center items-center gap-2">
            <Button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              variant="outline"
              className="px-4 py-2"
            >
              Précédent
            </Button>
            <span className="text-sm text-[#6B5A4E]">
              Page {page} / {documentsData.totalPages}
            </span>
            <Button
              onClick={() => setPage((p) => Math.min(documentsData.totalPages, p + 1))}
              disabled={page === documentsData.totalPages}
              variant="outline"
              className="px-4 py-2"
            >
              Suivant
            </Button>
          </div>
        )}

        {/* Document Viewer Modal */}
        {showViewer && selectedDoc && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-xl max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#EFEBE9]">
                <h2 className="text-xl font-bold text-[#2C1810]">
                  {getDocTypeLabel(selectedDoc.document_type)}
                </h2>
                <button
                  onClick={() => setShowViewer(false)}
                  className="p-2 hover:bg-[#FAF7F4] rounded-lg"
                >
                  <XCircle className="w-5 h-5 text-[#6B5A4E]" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                {/* Document Viewer */}
                <div className="mb-6">
                  <div className="bg-[#FAF7F4] rounded-xl p-4 flex items-center justify-center min-h-[400px]">
                    {selectedDoc.document_url.endsWith('.pdf') ? (
                      <embed
                        src={selectedDoc.document_url}
                        type="application/pdf"
                        className="w-full h-[500px]"
                      />
                    ) : (
                      <img
                        src={selectedDoc.document_url}
                        alt="Document"
                        className="max-w-full max-h-[500px] rounded-lg"
                      />
                    )}
                  </div>
                  <div className="mt-4 flex justify-center">
                    <a
                      href={selectedDoc.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#F16522] hover:underline text-sm flex items-center gap-1"
                    >
                      <Download className="w-4 h-4" />
                      Télécharger le document
                    </a>
                  </div>
                </div>

                {/* Applicant Details */}
                <div className="mb-6 p-4 bg-[#FAF7F4] rounded-xl">
                  <h3 className="font-semibold text-[#2C1810] mb-2">Demandeur</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-[#6B5A4E]">Nom:</span>
                      <span className="ml-2 font-medium text-[#2C1810]">{selectedDoc.applicant.full_name}</span>
                    </div>
                    <div>
                      <span className="text-[#6B5A4E]">Email:</span>
                      <span className="ml-2 font-medium text-[#2C1810]">{selectedDoc.applicant.email}</span>
                    </div>
                    <div>
                      <span className="text-[#6B5A4E]">Type:</span>
                      <span className="ml-2 font-medium text-[#2C1810]">{selectedDoc.applicant.user_type}</span>
                    </div>
                    <div>
                      <span className="text-[#6B5A4E]">Soumis le:</span>
                      <span className="ml-2 font-medium text-[#2C1810]">
                        {FormatService.formatDateTime(selectedDoc.submitted_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-[#2C1810] mb-2">
                    Notes (optionnel)
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 border border-[#EFEBE9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F16522]"
                    placeholder="Ajoutez des notes sur ce document..."
                  />
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#EFEBE9] bg-[#FAF7F4]">
                <Button
                  onClick={() => {
                    const notes = (document.querySelector('textarea') as HTMLTextAreaElement)?.value;
                    rejectMutation.mutate({ docId: selectedDoc.id, reason: notes || 'Document non conforme' });
                  }}
                  disabled={rejectMutation.isPending}
                  variant="outline"
                  className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4" />
                  Rejeter
                </Button>
                <Button
                  onClick={() => {
                    const notes = (document.querySelector('textarea') as HTMLTextAreaElement)?.value;
                    approveMutation.mutate({ docId: selectedDoc.id, notes: notes || undefined });
                  }}
                  disabled={approveMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-[#F16522] hover:bg-[#d9571d] text-white"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approuver
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
