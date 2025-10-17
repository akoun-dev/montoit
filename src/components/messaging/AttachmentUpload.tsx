import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Paperclip, X, FileText, Image as ImageIcon, File } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { logger } from '@/services/logger';

interface Attachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

interface AttachmentUploadProps {
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[]) => void;
}

const AttachmentUpload = ({ attachments, onAttachmentsChange }: AttachmentUploadProps) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length + attachments.length > 5) {
      toast({
        title: 'Limite atteinte',
        description: 'Vous ne pouvez ajouter que 5 pièces jointes maximum',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      const uploadedFiles: Attachment[] = [];

      for (const file of files) {
        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: 'Fichier trop volumineux',
            description: `${file.name} dépasse la limite de 10MB`,
            variant: 'destructive',
          });
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${user!.id}/${Date.now()}_${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('user-documents')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('user-documents')
          .getPublicUrl(fileName);

        uploadedFiles.push({
          name: file.name,
          url: publicUrl,
          type: file.type,
          size: file.size,
        });
      }

      onAttachmentsChange([...attachments, ...uploadedFiles]);
      
      toast({
        title: 'Fichiers ajoutés',
        description: `${uploadedFiles.length} fichier(s) ajouté(s) avec succès`,
      });
    } catch (error) {
      logger.logError(error, { context: 'AttachmentUpload', action: 'upload' });
      toast({
        title: 'Erreur',
        description: 'Impossible de télécharger les fichiers',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (index: number) => {
    onAttachmentsChange(attachments.filter((_, i) => i !== index));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
    if (type.includes('pdf')) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-2">
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((file, index) => (
            <Card key={index} className="p-2">
              <div className="flex items-center gap-2">
                {getFileIcon(file.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeAttachment(index)}
                  className="h-7 w-7"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="file"
          id="file-upload"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,.pdf,.doc,.docx,.txt"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => document.getElementById('file-upload')?.click()}
          disabled={uploading || attachments.length >= 5}
        >
          <Paperclip className="h-4 w-4 mr-1" />
          {uploading ? 'Téléchargement...' : 'Joindre fichier'}
        </Button>
        {attachments.length > 0 && (
          <span className="text-xs text-muted-foreground self-center">
            {attachments.length}/5
          </span>
        )}
      </div>
    </div>
  );
};

export default AttachmentUpload;
