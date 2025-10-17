import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, CheckCircle, Clock, FileText, AlertCircle } from 'lucide-react';

const CertificationFAQ = () => {
  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-secondary/10 rounded-full mb-4">
              <Shield className="h-8 w-8 text-secondary" />
            </div>
            <h1 className="text-4xl font-bold mb-4">FAQ - Certification ANSUT</h1>
            <p className="text-muted-foreground text-lg">
              Tout ce que vous devez savoir sur la certification des baux immobiliers
            </p>
          </div>

          <Card className="mb-8">
            <CardContent className="p-6">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="what-is">
                  <AccordionTrigger className="text-left">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-secondary" />
                      Qu'est-ce que la certification ANSUT ?
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    La certification ANSUT est un label de qualité délivré par l'Agence Nationale de Sécurité 
                    et d'Urbanisme du Territoire. Elle garantit que votre bail immobilier respecte toutes les 
                    normes légales ivoiriennes et que les parties ont été correctement vérifiées. Un bail 
                    certifié ANSUT offre une protection juridique renforcée et facilite les démarches 
                    administratives.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="why-certify">
                  <AccordionTrigger className="text-left">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Pourquoi faire certifier mon bail ?
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    <ul className="list-disc pl-5 space-y-2">
                      <li>Protection juridique maximale en cas de litige</li>
                      <li>Reconnaissance officielle par les autorités</li>
                      <li>Facilite l'accès aux assurances habitation</li>
                      <li>Augmente la confiance entre propriétaire et locataire</li>
                      <li>Simplifie les démarches administratives</li>
                      <li>Badge de qualité visible sur la plateforme</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="duration">
                  <AccordionTrigger className="text-left">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      Combien de temps prend la certification ?
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Le processus de certification prend généralement entre 2 et 5 jours ouvrables. Ce délai 
                    peut varier selon la complexité du dossier et la charge de travail des agents ANSUT. Vous 
                    recevrez une notification par email dès que votre demande sera examinée et traitée.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="requirements">
                  <AccordionTrigger className="text-left">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      Quelles sont les conditions requises ?
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Pour qu'un bail soit éligible à la certification ANSUT, les conditions suivantes doivent 
                    être remplies :
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      <li>Le bail doit être signé par le propriétaire ET le locataire</li>
                      <li>Les deux parties doivent avoir leur identité vérifiée (ONECI)</li>
                      <li>Un document PDF du contrat doit être généré</li>
                      <li>Les dates de début et fin doivent être cohérentes</li>
                      <li>Les montants (loyer, caution) doivent être valides</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="rejection">
                  <AccordionTrigger className="text-left">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-destructive" />
                      Que faire si ma demande est rejetée ?
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Si votre demande de certification est rejetée, vous recevrez un email détaillant les 
                    raisons du rejet. Les motifs courants incluent :
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      <li>Documents incomplets ou non conformes</li>
                      <li>Informations contradictoires dans le bail</li>
                      <li>Vérifications d'identité incomplètes</li>
                      <li>Non-respect des normes légales</li>
                    </ul>
                    <p className="mt-2">
                      Vous pouvez corriger les problèmes mentionnés et soumettre une nouvelle demande sans frais 
                      supplémentaires.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="cost">
                  <AccordionTrigger className="text-left">
                    Combien coûte la certification ?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    La certification ANSUT est actuellement gratuite pour tous les utilisateurs de la plateforme 
                    Mon Toit. C'est un service inclus pour garantir la sécurité et la légalité de toutes les 
                    transactions immobilières sur notre plateforme.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="validity">
                  <AccordionTrigger className="text-left">
                    Quelle est la durée de validité de la certification ?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    La certification ANSUT est valide pour toute la durée du bail. Elle reste active tant que 
                    le contrat de location est en cours. Si le bail est renouvelé ou modifié de manière 
                    substantielle, une nouvelle certification sera nécessaire.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="modifications">
                  <AccordionTrigger className="text-left">
                    Puis-je modifier mon bail après certification ?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Les modifications mineures (coordonnées, date de paiement) peuvent être apportées sans 
                    affecter la certification. Cependant, toute modification substantielle (montant du loyer, 
                    durée du bail, parties impliquées) nécessitera une nouvelle demande de certification. 
                    Contactez notre support pour plus de détails sur votre situation spécifique.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="verification">
                  <AccordionTrigger className="text-left">
                    Comment se passe la vérification d'identité ?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    La vérification d'identité se fait via le système ONECI (Office National d'Identification 
                    Civile et d'État). Vous devrez fournir :
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      <li>Numéro de CNI (Carte Nationale d'Identité)</li>
                      <li>Photo de votre CNI</li>
                      <li>Selfie pour vérification faciale (optionnel mais recommandé)</li>
                    </ul>
                    <p className="mt-2">
                      La vérification est effectuée automatiquement et prend généralement quelques minutes. 
                      En cas de problème, un agent ANSUT examinera manuellement votre dossier.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="benefits">
                  <AccordionTrigger className="text-left">
                    Quels sont les avantages concrets ?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    <div className="space-y-3">
                      <div>
                        <strong className="text-foreground">Pour les propriétaires :</strong>
                        <ul className="list-disc pl-5 mt-1">
                          <li>Sécurité juridique maximale</li>
                          <li>Locataires vérifiés et fiables</li>
                          <li>Badge de qualité attirant plus de candidats</li>
                          <li>Facilite les démarches en cas de litige</li>
                        </ul>
                      </div>
                      <div>
                        <strong className="text-foreground">Pour les locataires :</strong>
                        <ul className="list-disc pl-5 mt-1">
                          <li>Protection contre les arnaques</li>
                          <li>Bail conforme aux normes légales</li>
                          <li>Propriétaire vérifié</li>
                          <li>Facilite l'obtention d'assurances</li>
                        </ul>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="support">
                  <AccordionTrigger className="text-left">
                    Comment obtenir de l'aide supplémentaire ?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Si vous avez d'autres questions ou besoin d'assistance :
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      <li>Consultez notre guide complet dans la section Documentation</li>
                      <li>Contactez notre support via la messagerie interne</li>
                      <li>Envoyez un email à support@montoit.ci</li>
                      <li>Appelez notre hotline : +225 XX XX XX XX XX</li>
                    </ul>
                    <p className="mt-2">
                      Notre équipe est disponible du lundi au vendredi de 8h à 18h.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          <div className="bg-muted p-6 rounded-lg text-center">
            <p className="text-muted-foreground">
              Vous ne trouvez pas la réponse à votre question ?
            </p>
            <p className="text-sm mt-2">
              Contactez notre équipe d'assistance qui se fera un plaisir de vous aider.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default CertificationFAQ;
