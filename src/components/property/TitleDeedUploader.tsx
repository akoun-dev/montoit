import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Upload, FileText, X, Loader2, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { logger } from "@/services/logger";

interface TitleDeedUploaderProps {
  propertyId: string;
  onUploadSuccess?: (url: string) => void;
  existingUrl?: string | null;
}

export const TitleDeedUploader = ({
  propertyId,
  onUploadSuccess,
  existingUrl,
}: TitleDeedUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(existingUrl || null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation
    const maxSize = 10 * 1024 * 1024; // 10 MB
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];

    if (file.size > maxSize) {
      toast({
        title: "❌ Fichier trop volumineux",
        description: "La taille maximale est de 10 MB",
        variant: "destructive",
      });
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "❌ Format non accepté",
        description: "Formats acceptés : PDF, JPEG, PNG",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      // Structure: /property-documents/{propertyId}/title_deed.{ext}
      const fileExt = file.name.split('.').pop();
      const filePath = `${propertyId}/title_deed.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('property-documents')
        .upload(filePath, file, {
          upsert: true, // Remplacer si existe
          cacheControl: '3600',
        });

      if (error) throw error;

      const fullPath = `property-documents/${data.path}`;
      setUploadedUrl(fullPath);
      onUploadSuccess?.(fullPath);

      toast({
        title: "✅ Titre de propriété ajouté",
        description: "Le document a été uploadé avec succès",
      });
    } catch (error: any) {
      logger.logError(error, { context: 'TitleDeedUploader', action: 'upload', propertyId });
      toast({
        title: "❌ Erreur d'upload",
        description: error.message || "Impossible d'uploader le fichier",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!uploadedUrl) return;

    try {
      const pathParts = uploadedUrl.split('property-documents/')[1];
      const { error } = await supabase.storage
        .from('property-documents')
        .remove([pathParts]);

      if (error) throw error;

      setUploadedUrl(null);
      onUploadSuccess?.("");

      toast({
        title: "✅ Document supprimé",
        description: "Le titre de propriété a été retiré",
      });
    } catch (error: any) {
      logger.logError(error, { context: 'TitleDeedUploader', action: 'remove', propertyId });
      toast({
        title: "❌ Erreur",
        description: "Impossible de supprimer le fichier",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          <strong>Document officiel :</strong> Le titre de propriété sera accessible uniquement
          au propriétaire, aux locataires avec un bail actif, et aux administrateurs.
        </AlertDescription>
      </Alert>

      {uploadedUrl ? (
        <Card className="border-success">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-success" />
                <div>
                  <p className="font-medium">Titre de propriété ajouté</p>
                  <p className="text-sm text-muted-foreground">Document sécurisé</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <input
            type="file"
            id="title-deed-input"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            disabled={uploading}
          />
          <label htmlFor="title-deed-input" className="cursor-pointer">
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Upload en cours...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload className="h-12 w-12 text-muted-foreground" />
                <div>
                  <p className="font-medium">Cliquez pour ajouter le titre de propriété</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    PDF, JPEG ou PNG (max 10 MB)
                  </p>
                </div>
              </div>
            )}
          </label>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        🔒 Ce document sera stocké de manière sécurisée et soumis à des contrôles d'accès stricts.
      </p>
    </div>
  );
};
