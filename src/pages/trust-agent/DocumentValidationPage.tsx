import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileCheck,
  FileX,
  Check,
  X,
  AlertCircle,
  FileText,
  Eye,
  Download,
  XCircle,
} from 'lucide-react';
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
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

  const getSignedDocumentUrl = async (documentUrl: string): Promise<string | null> => {
    try {
      if (!documentUrl) {
        console.warn('[getSignedDocumentUrl] No document URL provided');
        return null;
      }

      // Si ce n'est pas une URL Supabase Storage, retourner l'URL telle quelle
      if (!documentUrl.includes('/storage/v1/object')) {
        return documentUrl;
      }

      const url = new URL(documentUrl);
      const pathParts = url.pathname.split('/').filter(Boolean);

      // Format attendu: /storage/v1/object/public/bucket/path/to/file
      // ou: /storage/v1/object/sign/bucket/path/to/file/token
      const objectIndex = pathParts.indexOf('object');
      if (objectIndex === -1) {
        console.warn('[getSignedDocumentUrl] Not a valid Supabase Storage URL:', documentUrl);
        return documentUrl;
      }

      const mode = pathParts[objectIndex + 1];
      const bucketIndex = mode === 'public' || mode === 'sign' ? objectIndex + 2 : objectIndex + 1;
      const bucket = pathParts[bucketIndex];

      if (!bucket) {
        console.warn('[getSignedDocumentUrl] Could not extract bucket from URL:', documentUrl);
        return null;
      }

      // Extraire le chemin du fichier
      const fileStart = mode === 'public' || mode === 'sign' ? objectIndex + 3 : objectIndex + 2;
      const filePath = pathParts.slice(fileStart).join('/');

      if (!filePath) {
        console.warn('[getSignedDocumentUrl] Could not extract file path from URL:', documentUrl);
        return null;
      }

      console.log('[getSignedDocumentUrl] Extracted bucket:', bucket, 'path:', filePath);

      // Créer une URL signée valide pour 1 heure
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(filePath, 3600);

      if (error) {
        console.error('[getSignedDocumentUrl] Error creating signed URL:', error);

        if (error.message?.includes('not found') || error.message?.includes('Bucket not found')) {
          const { data: buckets } = await supabase.storage.listBuckets();
          const availableBuckets = buckets?.map((b) => b.name).join(', ') || 'aucun';
          console.error('[getSignedDocumentUrl] Available buckets:', availableBuckets);
          toast.error(`Le bucket "${bucket}" n'existe pas. Disponibles: ${availableBuckets}`);
        }

        return null;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('[getSignedDocumentUrl] Exception:', error);
      return null;
    }
  };

  const handlePreviewDoc = async (doc: DocumentItem) => {
    if (!doc.url) {
      toast.error('Aucun fichier disponible pour ce document');
      return;
    }

    const signedUrl = await getSignedDocumentUrl(doc.url);
    if (signedUrl) {
      setPreviewUrl(signedUrl);
      setPreviewDoc(doc);
    } else {
      toast.error('Impossible de charger le document');
    }
  };

  const handleDownloadDoc = async (doc: DocumentItem) => {
    if (!doc.url) {
      toast.error('Aucun fichier disponible pour ce document');
      return;
    }

    const signedUrl = await getSignedDocumentUrl(doc.url);
    if (signedUrl) {
      const link = document.createElement('a');
      link.href = signedUrl;
      link.download = doc.name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Téléchargement lancé');
    } else {
      toast.error('Erreur lors du téléchargement');
    }
  };

  const closePreview = () => {
    setPreviewDoc(null);
    setPreviewUrl(null);
  };

  const isImageFile = (url: string) => {
    if (!url) return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    return imageExtensions.some((ext) => url.toLowerCase().endsWith(ext));
  };

  const isPdfFile = (url: string) => {
    if (!url) return false;
    return url.toLowerCase().endsWith('.pdf');
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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
                    {doc.url ? (
                      <>
                        <Button
                          size="small"
                          variant="ghost"
                          onClick={() => handlePreviewDoc(doc)}
                          title="Voir le document"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="small"
                          variant="ghost"
                          onClick={() => handleDownloadDoc(doc)}
                          title="Télécharger"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </>
                    ) : null}
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

      {/* Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={closePreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{previewDoc?.name}</DialogTitle>
              <Button
                variant="ghost"
                size="small"
                className="p-2 h-auto w-auto"
                onClick={closePreview}
              >
                <XCircle className="h-5 w-5" />
              </Button>
            </div>
          </DialogHeader>
          <div className="py-4 flex items-center justify-center min-h-[400px]">
            {previewUrl ? (
              isImageFile(previewUrl) ? (
                <img
                  src={previewUrl}
                  alt={previewDoc?.name}
                  className="max-w-full max-h-[70vh] object-contain rounded"
                />
              ) : isPdfFile(previewUrl) ? (
                <iframe
                  src={previewUrl}
                  title={previewDoc?.name}
                  className="w-full h-[70vh] rounded"
                />
              ) : (
                <div className="text-center">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    Aperçu non disponible pour ce type de fichier
                  </p>
                  <Button onClick={() => previewUrl && window.open(previewUrl, '_blank')}>
                    <Download className="h-4 w-4 mr-2" />
                    Ouvrir dans un nouvel onglet
                  </Button>
                </div>
              )
            ) : (
              <div className="text-center">
                <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Chargement du document...</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closePreview}>
              Fermer
            </Button>
            {previewUrl && (
              <Button onClick={() => window.open(previewUrl, '_blank')}>
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
