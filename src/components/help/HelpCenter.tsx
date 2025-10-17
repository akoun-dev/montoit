import { useState } from 'react';
import { Search, BookOpen, Video, FileText, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface HelpCenterProps {
  open: boolean;
  onClose: () => void;
  searchQuery?: string;
}

const FAQ_CATEGORIES = {
  locataire: [
    {
      question: 'Comment chercher un bien ?',
      answer: 'Utilisez la barre de recherche en haut ou allez sur la page Explorer pour voir tous les biens disponibles. Vous pouvez filtrer par ville, prix, nombre de chambres, etc.',
      videoUrl: '#',
    },
    {
      question: 'Comment candidater à un bien ?',
      answer: 'Sur la page du bien, cliquez sur "Candidater". Remplissez le formulaire avec vos informations et uploadez les documents requis (CNI, justificatifs de revenus, etc.).',
      videoUrl: '#',
    },
    {
      question: 'Qu\'est-ce que la vérification ONECI/CNAM ?',
      answer: 'C\'est une vérification de votre identité et situation professionnelle qui augmente vos chances d\'être accepté par les propriétaires.',
      videoUrl: '#',
    },
  ],
  proprietaire: [
    {
      question: 'Comment publier un bien ?',
      answer: 'Cliquez sur "Publier un bien" dans le menu. Remplissez toutes les informations demandées, ajoutez des photos de qualité et soumettez pour modération.',
      videoUrl: '#',
    },
    {
      question: 'Comment gérer les candidatures ?',
      answer: 'Allez dans "Mes candidatures" pour voir toutes les demandes. Vous pouvez approuver, refuser ou demander plus d\'informations aux candidats.',
      videoUrl: '#',
    },
    {
      question: 'Comment signer un bail électroniquement ?',
      answer: 'Une fois qu\'un candidat est accepté, un bail est généré automatiquement. Vous et le locataire pouvez le signer électroniquement via CryptoNeo.',
      videoUrl: '#',
    },
  ],
};

export const HelpCenter = ({ open, onClose, searchQuery = '' }: HelpCenterProps) => {
  const [search, setSearch] = useState(searchQuery);

  const userType = 'locataire'; // TODO: Get from context

  const faqs = FAQ_CATEGORIES[userType as keyof typeof FAQ_CATEGORIES] || FAQ_CATEGORIES.locataire;

  const filteredFaqs = search
    ? faqs.filter(faq =>
        faq.question.toLowerCase().includes(search.toLowerCase()) ||
        faq.answer.toLowerCase().includes(search.toLowerCase())
      )
    : faqs;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Centre d'aide
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher dans l'aide..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Tabs defaultValue="faq" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="faq">
              <FileText className="h-4 w-4 mr-2" />
              FAQ
            </TabsTrigger>
            <TabsTrigger value="videos">
              <Video className="h-4 w-4 mr-2" />
              Tutoriels vidéo
            </TabsTrigger>
            <TabsTrigger value="docs">
              <BookOpen className="h-4 w-4 mr-2" />
              Documentation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="faq">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {filteredFaqs.map((faq, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-base">{faq.question}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm">
                        {faq.answer}
                      </CardDescription>
                      {faq.videoUrl && (
                        <a
                          href={faq.videoUrl}
                          className="text-xs text-primary hover:underline inline-block mt-2"
                        >
                          Voir la vidéo explicative →
                        </a>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="videos">
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Guides vidéo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Les tutoriels vidéo seront disponibles prochainement.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="docs">
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Documentation complète</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      La documentation détaillée sera disponible prochainement.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
