import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileCheck, FileX, Check, X, AlertCircle, FileText } from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/badge';
import { Textarea } from '@/shared/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/shared/useSafeToast';
import type { Json } from '@/integrations/supabase/types';

interface DocumentItem {
  id: string;
  name: string;
  type: string;
  required: boolean;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  url?: string;
}

const defaultDocuments: DocumentItem[] = [
  { id: '1', name: 'Titre de propriété', type: 'titre', required: true, status: 'pending' },
  {
    id: '2',
    name: "Pièce d'identité propriétaire",
    type: 'identite',
    required: true,
    status: 'pending',
  },
  { id: '3', name: 'Plan cadastral', type: 'cadastre', required: true, status: 'pending' },
  {
    id: '4',
    name: 'Certificat de conformité',
    type: 'conformite',
    required: false,
    status: 'pending',
  },
  {
    id: '5',
    name: "Attestation d'assurance",
    type: 'assurance',
    required: false,
    status: 'pending',
  },
  {
    id: '6',
    name: 'Dernière quittance de charges',
    type: 'quittance',
    required: false,
    status: 'pending',
  },
];

export default function DocumentValidationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState<DocumentItem[]>(defaultDocuments);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [missionId, setMissionId] = useState<string>('');

  useEffect(() => {
    if (id) {
      setMissionId(id);
      loadMissionDocuments(id);
    }
  }, [id]);

  const loadMissionDocuments = async (missionIdParam: string) => {
    try {
      const { data, error } = await supabase
        .from('cev_missions')
        .select('documents')
        .eq('id', missionIdParam)
        .single();

      if (error) throw error;

      if (data?.documents && Array.isArray(data.documents) && data.documents.length > 0) {
        setDocuments(data.documents as unknown as DocumentItem[]);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateDocumentStatus = (
    docId: string,
    status: 'approved' | 'rejected',
    reason?: string
  ) => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === docId ? { ...doc, status, rejectionReason: reason } : doc))
    );
  };

  const handleApprove = (doc: DocumentItem) => {
    updateDocumentStatus(doc.id, 'approved');
    toast.success(`${doc.name} approuvé`);
  };

  const handleRejectClick = (doc: DocumentItem) => {
    setSelectedDoc(doc);
    setRejectionReason('');
    setShowRejectDialog(true);
  };

  const handleRejectConfirm = () => {
    if (selectedDoc && rejectionReason.trim()) {
      updateDocumentStatus(selectedDoc.id, 'rejected', rejectionReason);
      toast.error(`${selectedDoc.name} rejeté`);
      setShowRejectDialog(false);
      setSelectedDoc(null);
      setRejectionReason('');
    }
  };

  const saveDocuments = async () => {
    try {
      const { error } = await supabase
        .from('cev_missions')
        .update({
          documents: documents as unknown as Json,
          updated_at: new Date().toISOString(),
        })
        .eq('id', missionId);

      if (error) throw error;
      toast.success('Validation sauvegardée');
    } catch (error) {
      console.error('Error saving documents:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const stats = {
    total: documents.length,
    pending: documents.filter((d) => d.status === 'pending').length,
    approved: documents.filter((d) => d.status === 'approved').length,
    rejected: documents.filter((d) => d.status === 'rejected').length,
  };

  const allRequiredApproved = documents
    .filter((d) => d.required)
    .every((d) => d.status === 'approved');

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="small"
                className="p-2 h-auto w-auto"
                onClick={() => navigate(`/trust-agent/mission/${missionId}`)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="font-semibold">Validation Documents</h1>
                <p className="text-sm text-muted-foreground">
                  {stats.approved}/{stats.total} validés
                </p>
              </div>
            </div>
            <Button onClick={saveDocuments}>
              <Check className="h-4 w-4 mr-2" />
              Sauvegarder
            </Button>
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">En attente</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              <p className="text-sm text-muted-foreground">Approuvés</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-destructive">{stats.rejected}</p>
              <p className="text-sm text-muted-foreground">Rejetés</p>
            </CardContent>
          </Card>
        </div>

        {/* Status Banner */}
        <Card className={`mb-6 ${allRequiredApproved ? 'border-green-500' : 'border-amber-500'}`}>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              {allRequiredApproved ? (
                <>
                  <FileCheck className="h-5 w-5 text-green-600" />
                  <span>Tous les documents requis sont validés</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <span>Des documents requis sont en attente de validation</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Documents List */}
        <div className="space-y-4">
          {documents.map((doc) => (
            <Card
              key={doc.id}
              className={
                doc.status === 'approved'
                  ? 'border-green-200 bg-green-50/50'
                  : doc.status === 'rejected'
                    ? 'border-red-200 bg-red-50/50'
                    : ''
              }
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-2 rounded-lg ${
                        doc.status === 'approved'
                          ? 'bg-green-100'
                          : doc.status === 'rejected'
                            ? 'bg-red-100'
                            : 'bg-muted'
                      }`}
                    >
                      {doc.status === 'approved' ? (
                        <FileCheck className="h-5 w-5 text-green-600" />
                      ) : doc.status === 'rejected' ? (
                        <FileX className="h-5 w-5 text-destructive" />
                      ) : (
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{doc.name}</h3>
                        {doc.required && (
                          <Badge variant="outline" className="text-xs">
                            Requis
                          </Badge>
                        )}
                      </div>
                      {doc.status === 'rejected' && doc.rejectionReason && (
                        <p className="text-sm text-destructive mt-1">
                          Motif : {doc.rejectionReason}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {doc.status === 'pending' ? (
                      <>
                        <Button size="small" variant="outline" onClick={() => handleApprove(doc)}>
                          <Check className="h-4 w-4 mr-1" />
                          Approuver
                        </Button>
                        <Button
                          size="small"
                          variant="danger"
                          onClick={() => handleRejectClick(doc)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Rejeter
                        </Button>
                      </>
                    ) : (
                      <Badge variant={doc.status === 'approved' ? 'default' : 'destructive'}>
                        {doc.status === 'approved' ? 'Approuvé' : 'Rejeté'}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter le document</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Veuillez indiquer le motif du rejet pour "{selectedDoc?.name}"
            </p>
            <Textarea
              placeholder="Motif du rejet..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={handleRejectConfirm}
              disabled={!rejectionReason.trim()}
            >
              Confirmer le rejet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
