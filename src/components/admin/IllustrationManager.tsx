import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, CheckCircle, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface GeneratedIllustration {
  filename: string;
  imageUrl: string;
  downloaded: boolean;
}

export const IllustrationManager = () => {
  const [illustrations, setIllustrations] = useState<GeneratedIllustration[]>([]);
  const [downloading, setDownloading] = useState(false);

  const downloadAllIllustrations = async () => {
    if (illustrations.length === 0) {
      toast.error("Aucune illustration générée à télécharger");
      return;
    }

    setDownloading(true);
    
    try {
      for (const illustration of illustrations) {
        if (!illustration.downloaded) {
          await downloadIllustration(illustration);
        }
      }
      
      toast.success("Toutes les illustrations ont été téléchargées avec succès!");
    } catch (error) {
      toast.error("Erreur lors du téléchargement des illustrations");
    } finally {
      setDownloading(false);
    }
  };

  const downloadIllustration = async (illustration: GeneratedIllustration) => {
    const link = document.createElement('a');
    link.href = illustration.imageUrl;
    link.download = illustration.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setIllustrations(prev => 
      prev.map(ill => 
        ill.filename === illustration.filename 
          ? { ...ill, downloaded: true }
          : ill
      )
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Gestionnaire d'Illustrations
        </CardTitle>
        <CardDescription>
          Téléchargez les illustrations générées dans votre projet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {illustrations.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {illustrations.map((illustration) => (
                <div 
                  key={illustration.filename}
                  className="relative border rounded-lg overflow-hidden group"
                >
                  <img 
                    src={illustration.imageUrl}
                    alt={illustration.filename}
                    className="w-full h-32 object-cover"
                  />
                  {illustration.downloaded && (
                    <div className="absolute top-2 right-2 bg-green-600 text-white p-1 rounded-full">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => downloadIllustration(illustration)}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Télécharger
                  </Button>
                </div>
              ))}
            </div>
            
            <Button 
              onClick={downloadAllIllustrations}
              disabled={downloading || illustrations.every(i => i.downloaded)}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              {downloading ? "Téléchargement..." : "Télécharger tout"}
            </Button>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Aucune illustration générée pour le moment</p>
            <p className="text-sm mt-1">Générez d'abord les illustrations via l'onglet "Illustrations"</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
