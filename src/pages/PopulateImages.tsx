import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { Loader2, Image as ImageIcon, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PopulateImages() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<{
    total: number;
    current: number;
    results: Array<{ id: string; title: string; success: boolean; error?: string }>;
  }>({ total: 0, current: 0, results: [] });
  const navigate = useNavigate();

  const getImagePrompt = (property: any): string => {
    const typeDescriptions: Record<string, string> = {
      'appartement': 'modern apartment building exterior with balconies',
      'villa': 'luxury villa with garden and modern architecture',
      'studio': 'contemporary studio apartment building',
      'duplex': 'elegant duplex residence with two floors',
      'maison': 'beautiful family house with yard'
    };

    const baseDesc = typeDescriptions[property.property_type] || 'residential property';
    
    return `Generate a high-quality, professional real estate photograph of a ${baseDesc} in ${property.city}, Côte d'Ivoire. The image should be bright, welcoming, with blue sky, showing the exterior facade. Style: professional real estate photography, well-lit, attractive, 16:9 aspect ratio. Ultra high resolution.`;
  };

  const generateImagesForProperties = async () => {
    setIsGenerating(true);
    setProgress({ total: 0, current: 0, results: [] });

    try {
      // Récupérer les propriétés sans image
      const { data: properties, error: fetchError } = await supabase
        .from('properties')
        .select('id, title, property_type, city, neighborhood')
        .is('main_image', null)
        .limit(10);

      if (fetchError) throw fetchError;

      if (!properties || properties.length === 0) {
        toast({
          title: 'Aucune propriété à traiter',
          description: 'Toutes les propriétés ont déjà des images.',
        });
        setIsGenerating(false);
        return;
      }

      setProgress(prev => ({ ...prev, total: properties.length }));

      // Accumuler les résultats localement
      const localResults: Array<{ id: string; title: string; success: boolean; error?: string }> = [];

      // Générer les images via l'edge function
      for (const property of properties) {
        try {
          const { data, error } = await supabase.functions.invoke('generate-property-images', {
            body: {
              propertyId: property.id,
              propertyType: property.property_type,
              city: property.city
            }
          });

          if (error) throw error;
          if (!data.success) throw new Error(data.error || 'Failed to generate image');

          localResults.push({ id: property.id, title: property.title, success: true });

        } catch (error: any) {
          localResults.push({ id: property.id, title: property.title, success: false, error: error.message });
        }

        // Mettre à jour le state après chaque image
        setProgress(prev => ({
          ...prev,
          current: prev.current + 1,
          results: [...localResults]
        }));
      }

      // Compter les succès depuis le tableau local
      const successCount = localResults.filter(r => r.success).length;

      toast({
        title: 'Génération terminée !',
        description: `${successCount} images générées avec succès sur ${properties.length}.`,
      });

    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-6 w-6" />
            Générer des images pour les propriétés
          </CardTitle>
          <CardDescription>
            Cette page permet de générer automatiquement des images pour toutes les propriétés qui n'en ont pas encore.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-4">
            <Button
              onClick={generateImagesForProperties}
              disabled={isGenerating}
              className="flex-1"
            >
              {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isGenerating ? 'Génération en cours...' : 'Générer les images'}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/')}
            >
              Retour
            </Button>
          </div>

          {progress.total > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>Progression</span>
                <span className="font-semibold">{progress.current} / {progress.total}</span>
              </div>
              
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>

              {progress.results.length > 0 && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  <h3 className="font-semibold text-sm">Résultats</h3>
                  {progress.results.map((result, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 text-sm"
                    >
                      {result.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{result.title}</p>
                        {result.error && (
                          <p className="text-xs text-muted-foreground">{result.error}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
