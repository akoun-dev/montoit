import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Upload, X, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/services/logger';

type DocumentType = 'id_card' | 'pay_slip' | 'tax_notice' | 'employment_contract' | 'bank_statement' | 'other';

type Document = {
  type: DocumentType;
  url: string;
  name: string;
  uploaded_at: string;
};

interface DocumentUploadProps {
  documents: Document[];
  onDocumentsChange: (documents: Document[]) => void;
  userId: string;
}

const DocumentUpload = ({ documents, onDocumentsChange, userId }: DocumentUploadProps) => {
  const [uploading, setUploading] = useState(false);

  const documentTypes: { value: DocumentType; label: string }[] = [
    { value: 'id_card', label: 'Pièce d\'identité' },
    { value: 'pay_slip', label: 'Bulletin de salaire' },
    { value: 'tax_notice', label: 'Avis d\'imposition' },
    { value: 'employment_contract', label: 'Contrat de travail' },
    { value: 'bank_statement', label: 'Relevé bancaire' },
    { value: 'other', label: 'Autre' },
  ];

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: DocumentType) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validation
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: 'Fichier trop volumineux',
        description: 'La taille maximale est de 5MB',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${type}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('user-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('user-documents')
        .getPublicUrl(fileName);

      const newDocument: Document = {
        type,
        url: publicUrl,
        name: file.name,
        uploaded_at: new Date().toISOString(),
      };

      onDocumentsChange([...documents, newDocument]);

      toast({
        title: 'Document uploadé',
        description: 'Le fichier a été ajouté à votre dossier',
      });
    } catch (error: any) {
      logger.logError(error, { context: 'DocumentUpload', action: 'upload' });
      toast({
        title: 'Erreur d\'upload',
        description: error.message || 'Impossible d\'uploader le fichier',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const removeDocument = (index: number) => {
    const newDocuments = documents.filter((_, i) => i !== index);
    onDocumentsChange(newDocuments);
  };

  const getDocumentLabel = (type: DocumentType) => {
    return documentTypes.find(dt => dt.value === type)?.label || type;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {documentTypes.map((docType) => (
          <div key={docType.value} className="space-y-2">
            <Label htmlFor={`upload-${docType.value}`}>{docType.label}</Label>
            <div className="flex gap-2">
              <Input
                id={`upload-${docType.value}`}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileUpload(e, docType.value)}
                disabled={uploading}
                className="flex-1"
              />
            </div>
          </div>
        ))}
      </div>

      {documents.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium mb-3">Documents ajoutés ({documents.length})</h3>
          <div className="space-y-2">
            {documents.map((doc, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {getDocumentLabel(doc.type)}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {new Date(doc.uploaded_at).toLocaleDateString('fr-FR')}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeDocument(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {uploading && (
        <div className="text-center text-sm text-muted-foreground">
          Upload en cours...
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;
