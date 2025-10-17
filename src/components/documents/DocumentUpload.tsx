import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, FileText, Image, File } from 'lucide-react';
import { z } from 'zod';
import { FILE_LIMITS, ERROR_MESSAGES, VALIDATION_LIMITS } from '@/constants';

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const fileSchema = z.custom<File>((val) => val instanceof File, {
  message: ERROR_MESSAGES.FIELD_REQUIRED,
})
.refine((file) => file.size <= FILE_LIMITS.MAX_DOCUMENT_SIZE, ERROR_MESSAGES.DOCUMENT_TOO_LARGE)
.refine((file) => ALLOWED_FILE_TYPES.includes(file.type), ERROR_MESSAGES.FILE_TYPE_INVALID);

const documentSchema = z.object({
  file: fileSchema,
  documentType: z.string().min(1, ERROR_MESSAGES.FIELD_REQUIRED),
  name: z.string()
    .min(VALIDATION_LIMITS.MIN_NAME_LENGTH, `Le nom doit contenir au moins ${VALIDATION_LIMITS.MIN_NAME_LENGTH} caractères`)
    .max(VALIDATION_LIMITS.MAX_NAME_LENGTH, `Le nom ne peut pas dépasser ${VALIDATION_LIMITS.MAX_NAME_LENGTH} caractères`),
});

interface DocumentUploadProps {
  leaseId: string;
  onUploadSuccess?: () => void;
}

const DOCUMENT_TYPES = [
  { value: 'lease_contract', label: 'Contrat de bail' },
  { value: 'inventory_in', label: "État des lieux d'entrée" },
  { value: 'inventory_out', label: 'État des lieux de sortie' },
  { value: 'rent_receipt', label: 'Quittance de loyer' },
  { value: 'deposit_receipt', label: 'Reçu de dépôt de garantie' },
  { value: 'insurance', label: "Attestation d'assurance" },
  { value: 'identity_document', label: "Pièce d'identité" },
  { value: 'income_proof', label: 'Justificatif de revenus' },
  { value: 'employment_contract', label: 'Contrat de travail' },
  { value: 'other', label: 'Autre' },
];

export const DocumentUpload = ({ leaseId, onUploadSuccess }: DocumentUploadProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return Image;
    if (fileType === 'application/pdf') return FileText;
    return File;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    try {
      fileSchema.parse(selectedFile);
      setFile(selectedFile);
      if (!documentName) {
        setDocumentName(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Fichier invalide',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    try {
      // Validation complète
      const validatedData = documentSchema.parse({
        file,
        documentType,
        name: documentName,
      });

      setUploading(true);
      setUploadProgress(0);

      // Upload vers Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${leaseId}/${Date.now()}_${documentName}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('lease-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setUploadProgress(50);

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('lease-documents')
        .getPublicUrl(fileName);

      // Enregistrer dans la base de données
      const { error: dbError } = await supabase.from('lease_documents').insert({
        lease_id: leaseId,
        document_type: validatedData.documentType,
        name: validatedData.name,
        file_url: publicUrl,
        file_size: file.size,
        file_type: file.type,
        uploaded_by: user.id,
        status: 'pending',
      });

      if (dbError) throw dbError;

      setUploadProgress(100);

      toast({
        title: 'Document uploadé',
        description: 'Le document a été ajouté avec succès',
      });

      // Reset form
      setFile(null);
      setDocumentType('');
      setDocumentName('');
      setUploadProgress(0);
      
      onUploadSuccess?.();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Erreur de validation',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else if (error instanceof Error) {
        toast({
          title: 'Erreur',
          description: error.message,
          variant: 'destructive',
        });
      }
    } finally {
      setUploading(false);
    }
  };

  const FileIcon = file ? getFileIcon(file.type) : Upload;

  return (
    <div className="space-y-4">
      {/* File input */}
      <div className="space-y-2">
        <Label htmlFor="file-upload">Fichier</Label>
        <div className="flex items-center gap-2">
          <Input
            id="file-upload"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => document.getElementById('file-upload')?.click()}
            disabled={uploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {file ? 'Changer de fichier' : 'Sélectionner un fichier'}
          </Button>
        </div>

        {file && (
          <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
            <FileIcon className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setFile(null)}
              disabled={uploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Document type */}
      <div className="space-y-2">
        <Label htmlFor="document-type">Type de document</Label>
        <Select value={documentType} onValueChange={setDocumentType} disabled={uploading}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionnez le type" />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Document name */}
      <div className="space-y-2">
        <Label htmlFor="document-name">Nom du document</Label>
        <Input
          id="document-name"
          value={documentName}
          onChange={(e) => setDocumentName(e.target.value)}
          placeholder="Ex: Contrat de bail 2024"
          maxLength={255}
          disabled={uploading}
        />
      </div>

      {/* Upload progress */}
      {uploading && (
        <div className="space-y-2">
          <Progress value={uploadProgress} />
          <p className="text-sm text-center text-muted-foreground">
            Upload en cours... {uploadProgress}%
          </p>
        </div>
      )}

      {/* Upload button */}
      <Button
        onClick={handleUpload}
        disabled={!file || !documentType || !documentName || uploading}
        className="w-full"
      >
        {uploading ? 'Upload en cours...' : 'Uploader le document'}
      </Button>

      <p className="text-xs text-muted-foreground">
        Formats acceptés: PDF, JPG, PNG, WEBP, DOC, DOCX (max 10MB)
      </p>
    </div>
  );
};
