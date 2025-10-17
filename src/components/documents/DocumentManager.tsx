import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { logger } from '@/services/logger';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, Download, Trash2, Upload, CheckCircle2, 
  Clock, XCircle, AlertCircle, Eye 
} from 'lucide-react';
import { DocumentUpload } from './DocumentUpload';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface LeaseDocument {
  id: string;
  document_type: string;
  name: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  uploaded_by: string;
  uploader?: {
    full_name: string;
  };
}

interface DocumentManagerProps {
  leaseId: string;
  landlordId: string;
  tenantId: string;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  lease_contract: 'Contrat de bail',
  inventory_in: "État des lieux d'entrée",
  inventory_out: 'État des lieux de sortie',
  rent_receipt: 'Quittance de loyer',
  deposit_receipt: 'Reçu de dépôt de garantie',
  insurance: "Attestation d'assurance",
  identity_document: "Pièce d'identité",
  income_proof: 'Justificatif de revenus',
  employment_contract: 'Contrat de travail',
  other: 'Autre',
};

const REQUIRED_DOCUMENTS = [
  'lease_contract',
  'inventory_in',
  'insurance',
  'identity_document',
];

export const DocumentManager = ({ leaseId, landlordId, tenantId }: DocumentManagerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<LeaseDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [leaseId]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('lease_documents')
        .select(`
          *,
          uploader:uploaded_by (full_name)
        `)
        .eq('lease_id', leaseId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data
      const transformedData = data?.map((doc: any) => ({
        ...doc,
        uploader: Array.isArray(doc.uploader) ? doc.uploader[0] : doc.uploader,
      })) || [];

      setDocuments(transformedData);
    } catch (error) {
      logger.logError(error, { context: 'DocumentManager', action: 'fetch' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de télécharger le fichier',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (documentId: string, fileUrl: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;

    try {
      // Extraire le chemin du fichier depuis l'URL
      const urlParts = fileUrl.split('/lease-documents/');
      const filePath = urlParts[1];

      // Supprimer du storage
      if (filePath) {
        await supabase.storage.from('lease-documents').remove([filePath]);
      }

      // Supprimer de la base de données
      const { error } = await supabase
        .from('lease_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      toast({
        title: 'Document supprimé',
        description: 'Le document a été supprimé avec succès',
      });

      fetchDocuments();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le document',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Approuvé</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejeté</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
    }
  };

  const getMissingDocuments = () => {
    const uploadedTypes = documents.map(d => d.document_type);
    return REQUIRED_DOCUMENTS.filter(type => !uploadedTypes.includes(type));
  };

  const missingDocs = getMissingDocuments();
  const completionRate = ((REQUIRED_DOCUMENTS.length - missingDocs.length) / REQUIRED_DOCUMENTS.length) * 100;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Checklist des documents obligatoires */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Documents obligatoires
          </CardTitle>
          <CardDescription>
            Complétude: {completionRate.toFixed(0)}% ({REQUIRED_DOCUMENTS.length - missingDocs.length}/{REQUIRED_DOCUMENTS.length})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {REQUIRED_DOCUMENTS.map(type => {
              const isUploaded = documents.some(d => d.document_type === type);
              return (
                <div key={type} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {isUploaded ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className={isUploaded ? 'font-medium' : 'text-muted-foreground'}>
                      {DOCUMENT_TYPE_LABELS[type]}
                    </span>
                  </div>
                  {isUploaded && (
                    <Badge variant="outline" className="bg-green-50">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Uploadé
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Liste des documents */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Documents du bail</CardTitle>
              <CardDescription>
                {documents.length} document{documents.length > 1 ? 's' : ''} uploadé{documents.length > 1 ? 's' : ''}
              </CardDescription>
            </div>
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Ajouter un document
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Uploader un document</DialogTitle>
                  <DialogDescription>
                    Ajoutez un document à ce bail
                  </DialogDescription>
                </DialogHeader>
                <DocumentUpload
                  leaseId={leaseId}
                  onUploadSuccess={() => {
                    fetchDocuments();
                    setUploadDialogOpen(false);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Aucun document uploadé</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-3 flex-1">
                      <FileText className="h-5 w-5 mt-0.5 text-primary" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{doc.name}</p>
                          {getStatusBadge(doc.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {DOCUMENT_TYPE_LABELS[doc.document_type]}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>Par {doc.uploader?.full_name || 'Inconnu'}</span>
                          <span>•</span>
                          <span>
                            {formatDistanceToNow(new Date(doc.created_at), {
                              addSuffix: true,
                              locale: fr,
                            })}
                          </span>
                          {doc.file_size && (
                            <>
                              <span>•</span>
                              <span>{(doc.file_size / 1024 / 1024).toFixed(2)} MB</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(doc.file_url, '_blank')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(doc.file_url, doc.name)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {user?.id === doc.uploaded_by && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(doc.id, doc.file_url)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
