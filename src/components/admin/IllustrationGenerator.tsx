import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Download, Image, Loader2 } from "lucide-react";

interface Illustration {
  filename: string;
  prompt: string;
  description: string;
}

const ILLUSTRATIONS: Illustration[] = [
  {
    filename: "famille-heureuse-cocody",
    description: "Famille ivoirienne heureuse devant leur maison",
    prompt: "Flat design vector illustration of a happy Ivorian family standing in front of their modern house in Cocody, Abidjan. Family of 4 people (parents and 2 children) smiling, contemporary West African home with orange and blue accent colors (#E67E22, #2C5F7F). Warm, welcoming atmosphere, clean composition, professional real estate marketing style. Ultra-realistic details, vibrant colors, 16:9 aspect ratio."
  },
  {
    filename: "couple-visite-appartement",
    description: "Jeune couple visitant un appartement",
    prompt: "Flat design illustration of a young Ivorian couple visiting an apartment with a real estate agent. Modern interior with large windows, natural light, agent showing the property on a tablet. Contemporary style, orange and blue accent colors (#E67E22, #2C5F7F), professional and trustworthy atmosphere. Clean lines, 16:9 aspect ratio."
  },
  {
    filename: "agent-immobilier-presentation",
    description: "Agent présentant un dossier sur tablette",
    prompt: "Flat design illustration of a professional Ivorian real estate agent presenting a property dossier on a digital tablet. Modern office setting, confident posture, orange and blue brand colors (#E67E22, #2C5F7F). Professional, trustworthy, contemporary style. Vector-style, clean composition, 16:9 aspect ratio."
  },
  {
    filename: "quartier-anime-abidjan",
    description: "Rue animée d'Abidjan",
    prompt: "Flat design illustration of a vibrant Abidjan neighborhood street scene. Orange taxis, people in colorful wax fabric, local shops, modern buildings mixed with traditional architecture. Lively atmosphere, warm colors with orange and blue accents (#E67E22, #2C5F7F). West African urban life, dynamic composition, 16:9 aspect ratio."
  },
  {
    filename: "interieur-moderne-salon",
    description: "Salon ivoirien moderne",
    prompt: "Flat design illustration of a modern Ivorian living room interior. Contemporary furniture, large TV, West African decorative elements (wax patterns, local art), warm and welcoming atmosphere. Natural light from large windows, orange and blue accent colors (#E67E22, #2C5F7F). Cozy, professional real estate photography style, 16:9 aspect ratio."
  },
  {
    filename: "vue-aerienne-abidjan",
    description: "Skyline stylisé d'Abidjan",
    prompt: "Minimalist flat design illustration of Abidjan skyline view. Recognizable landmarks including Plateau business district, Henri Konan Bédié Bridge. Stylized, elegant composition with orange and blue color scheme (#E67E22, #2C5F7F). Modern, clean lines, abstract geometric shapes, 16:9 aspect ratio."
  },
  {
    filename: "remise-cles-ceremonie",
    description: "Propriétaire remettant les clés",
    prompt: "Flat design illustration of a property owner handing keys to a new tenant. Both people smiling, handshake gesture, keys prominently featured. Joyful and trustworthy atmosphere, orange and blue accent colors (#E67E22, #2C5F7F). Professional, warm, celebratory moment. Clean composition, 16:9 aspect ratio."
  },
  {
    filename: "famille-emmenagement",
    description: "Famille déballant des cartons",
    prompt: "Flat design illustration of an Ivorian family unpacking moving boxes in their new home. Happy atmosphere, children helping, cardboard boxes, furniture being arranged. Dynamic, joyful scene with orange and blue accents (#E67E22, #2C5F7F). New beginning, fresh start feeling, 16:9 aspect ratio."
  },
  {
    filename: "reunion-copropriete",
    description: "Réunion entre propriétaires",
    prompt: "Flat design illustration of a professional co-ownership meeting. Diverse group of Ivorian property owners and residents sitting around a modern conference table, discussing. Professional, collaborative atmosphere, orange and blue brand colors (#E67E22, #2C5F7F). Contemporary office setting, 16:9 aspect ratio."
  },
  {
    filename: "certification-ansut-illustration",
    description: "Document de certification ANSUT",
    prompt: "Flat design illustration of an official ANSUT certification document with official stamp and seal. Professional, institutional style, green ANSUT color (#2ECC71) combined with orange and blue (#E67E22, #2C5F7F). Official government document aesthetic, trust and security, badge with stars, 16:9 aspect ratio."
  }
];

export const IllustrationGenerator = () => {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentIllustration, setCurrentIllustration] = useState<string>("");
  const [generatedImages, setGeneratedImages] = useState<{ [key: string]: string }>({});

  const generateAllIllustrations = async () => {
    setGenerating(true);
    setProgress(0);
    setGeneratedImages({});
    
    for (let i = 0; i < ILLUSTRATIONS.length; i++) {
      const illustration = ILLUSTRATIONS[i];
      setCurrentIllustration(illustration.description);
      
      try {
        const { data, error } = await supabase.functions.invoke('generate-illustration', {
          body: { 
            prompt: illustration.prompt,
            filename: illustration.filename
          }
        });

        if (error) throw error;

        if (data?.imageUrl) {
          setGeneratedImages(prev => ({
            ...prev,
            [illustration.filename]: data.imageUrl
          }));
          
          toast.success(`Illustration générée : ${illustration.description}`);
        }
      } catch (error) {
        toast.error(`Erreur pour ${illustration.description}`);
      }
      
      setProgress(((i + 1) / ILLUSTRATIONS.length) * 100);
    }
    
    setGenerating(false);
    setCurrentIllustration("");
    toast.success("Toutes les illustrations ont été générées !");
  };

  const downloadImage = (filename: string, imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${filename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAllImages = () => {
    Object.entries(generatedImages).forEach(([filename, imageUrl]) => {
      setTimeout(() => downloadImage(filename, imageUrl), 100);
    });
    toast.success("Téléchargement de toutes les images lancé !");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          Générateur d'Illustrations Ivoiriennes
        </CardTitle>
        <CardDescription>
          Générez automatiquement les 10 illustrations prioritaires avec Lovable AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Actions */}
        <div className="flex gap-3">
          <Button 
            onClick={generateAllIllustrations} 
            disabled={generating}
            className="flex items-center gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Image className="h-4 w-4" />
                Générer les 10 illustrations
              </>
            )}
          </Button>
          
          {Object.keys(generatedImages).length > 0 && (
            <Button 
              onClick={downloadAllImages} 
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Télécharger toutes ({Object.keys(generatedImages).length})
            </Button>
          )}
        </div>

        {/* Progress */}
        {generating && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground">
              {currentIllustration} ({Math.round(progress)}%)
            </p>
          </div>
        )}

        {/* Generated Images Grid */}
        {Object.keys(generatedImages).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(generatedImages).map(([filename, imageUrl]) => (
              <div key={filename} className="relative group border rounded-lg overflow-hidden bg-muted/20">
                <img 
                  src={imageUrl} 
                  alt={filename}
                  className="w-full h-48 object-cover"
                />
                <div className="p-2 space-y-1">
                  <p className="text-xs font-medium truncate">{filename}</p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full"
                    onClick={() => downloadImage(filename, imageUrl)}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Télécharger
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Illustrations List */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Illustrations à générer :</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            {ILLUSTRATIONS.map((ill, idx) => (
              <li key={ill.filename} className="flex items-center gap-2">
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                  {idx + 1}
                </span>
                {ill.description}
                {generatedImages[ill.filename] && (
                  <span className="text-xs text-green-600">✓</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};