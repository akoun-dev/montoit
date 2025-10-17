import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AkanPattern } from "@/components/ui/african-patterns";
import { 
  Search, Home, Shield, FileText, MessageSquare, CreditCard, 
  CheckCircle, AlertCircle, Clock, Users, Mail, Phone, 
  Building2, UserCheck, HelpCircle, ExternalLink
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { Input } from "@/components/ui/input";

const Guide = () => {
  const [faqSearch, setFaqSearch] = useState('');

  const filterFAQItems = (items: Array<{id: string, question: string, answer: string}>) => {
    if (!faqSearch.trim()) return items;
    const searchLower = faqSearch.toLowerCase();
    return items.filter(item => 
      item.question.toLowerCase().includes(searchLower) ||
      item.answer.toLowerCase().includes(searchLower)
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <Navbar />
      <main className="flex-1 pt-24">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 py-10 mb-12 relative">
          <AkanPattern />
          <div className="container mx-auto px-4 text-center relative z-10">
            <Badge variant="secondary" className="mb-4">Centre d'aide</Badge>
            <h1 className="text-h1 mb-4">
              Comment pouvons-nous <span className="text-gradient-secondary">vous aider</span> ?
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Guides détaillés, FAQ et support pour profiter pleinement de Mon Toit
            </p>
          </div>
        </section>

        <div className="container mx-auto px-4 pb-16">
          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
            <Link to="/recherche">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full border-primary/20 hover:border-primary/40">
                <CardHeader className="text-center">
                  <Search className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <CardTitle className="text-sm">Rechercher un bien</CardTitle>
                </CardHeader>
              </Card>
            </Link>
            <Link to="/publier">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full border-primary/20 hover:border-primary/40">
                <CardHeader className="text-center">
                  <Home className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <CardTitle className="text-sm">Publier une annonce</CardTitle>
                </CardHeader>
              </Card>
            </Link>
            <Link to="/verification">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full border-primary/20 hover:border-primary/40">
                <CardHeader className="text-center">
                  <Shield className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <CardTitle className="text-sm">Se faire certifier</CardTitle>
                </CardHeader>
              </Card>
            </Link>
            <Link to="/messages">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full border-primary/20 hover:border-primary/40">
                <CardHeader className="text-center">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <CardTitle className="text-sm">Contacter le support</CardTitle>
                </CardHeader>
              </Card>
            </Link>
          </div>

          {/* Guides par rôle */}
          <Tabs defaultValue="locataire" className="w-full mb-16">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="locataire" className="gap-2">
                <Users className="h-4 w-4" />
                Locataire
              </TabsTrigger>
              <TabsTrigger value="proprietaire" className="gap-2">
                <Home className="h-4 w-4" />
                Propriétaire
              </TabsTrigger>
              <TabsTrigger value="agence" className="gap-2">
                <Building2 className="h-4 w-4" />
                Agence
              </TabsTrigger>
            </TabsList>

            {/* Locataire Guide */}
            <TabsContent value="locataire" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-primary" />
                    Démarrer en tant que locataire
                  </CardTitle>
                  <CardDescription>
                    Gratuit à 100% - Trouvez votre logement idéal
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <h3 className="font-semibold">Étape 1 : Créer votre compte</h3>
                    <p className="text-sm text-muted-foreground">
                      Inscrivez-vous gratuitement avec votre email. Sélectionnez "Locataire" comme type de compte.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-semibold">Étape 2 : Rechercher un logement</h3>
                    <p className="text-sm text-muted-foreground">
                      Utilisez la barre de recherche ou naviguez sur la carte interactive. Filtrez par prix, quartier, type de bien.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-semibold">Étape 3 : Contacter le propriétaire</h3>
                    <p className="text-sm text-muted-foreground">
                      Cliquez sur "Contacter" pour envoyer un message. Le propriétaire recevra une notification.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-semibold">Étape 4 : Vérification ANSUT (Recommandé)</h3>
                    <p className="text-sm text-muted-foreground">
                      Complétez votre vérification d'identité (ONECI/CNI) et obtenez votre badge certifié ANSUT pour augmenter vos chances.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Propriétaire Guide */}
            <TabsContent value="proprietaire" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Publier votre bien
                  </CardTitle>
                  <CardDescription>
                    Louez en toute sécurité avec ANSUT
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <h3 className="font-semibold">Étape 1 : Créer votre compte propriétaire</h3>
                    <p className="text-sm text-muted-foreground">
                      Inscrivez-vous et sélectionnez "Propriétaire" ou "Agence immobilière".
                    </p>
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-semibold">Étape 2 : Publier votre annonce</h3>
                    <p className="text-sm text-muted-foreground">
                      Remplissez les informations du bien : adresse, prix, photos, caractéristiques. Ajoutez des photos de qualité et des vidéos si possible.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-semibold">Étape 3 : Validation de l'annonce</h3>
                    <p className="text-sm text-muted-foreground">
                      Votre annonce sera vérifiée par ANSUT sous 24-48h. Vous recevrez une notification.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-semibold">Étape 4 : Gérer les candidatures</h3>
                    <p className="text-sm text-muted-foreground">
                      Consultez les profils des candidats certifiés ANSUT et leurs dossiers. Communiquez via la messagerie sécurisée.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Agence Guide */}
            <TabsContent value="agence" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Gérer vos mandats
                  </CardTitle>
                  <CardDescription>
                    Solution professionnelle pour agences immobilières
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <h3 className="font-semibold">Compte agence certifié</h3>
                    <p className="text-sm text-muted-foreground">
                      Créez un compte agence et complétez la vérification professionnelle ANSUT.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-semibold">Gestion multi-propriétaires</h3>
                    <p className="text-sm text-muted-foreground">
                      Gérez les biens de plusieurs propriétaires depuis un seul tableau de bord.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-semibold">Outils professionnels</h3>
                    <p className="text-sm text-muted-foreground">
                      Accédez aux statistiques avancées, reporting, et gestion des commissions.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* FAQ Section */}
          <div className="mb-16">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">Questions fréquentes</h2>
              <p className="text-muted-foreground">Tout ce que vous devez savoir sur Mon Toit</p>
            </div>
            
            {/* Barre de recherche FAQ */}
            <div className="max-w-2xl mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Rechercher dans la FAQ (ex: certification, paiement, compte...)"
                  value={faqSearch}
                  onChange={(e) => setFaqSearch(e.target.value)}
                  className="pl-10 h-12 text-base"
                />
              </div>
              {faqSearch && (
                <div className="flex items-center gap-2 mt-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setFaqSearch('')}
                    className="h-7 text-xs"
                  >
                    Effacer la recherche
                  </Button>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Catégorie: Compte & Inscription */}
              {(() => {
                const compteItems = [
                  { id: 'q1', question: 'Comment créer un compte ?', answer: 'Cliquez sur "Se connecter / S\'inscrire" en haut à droite, choisissez votre type de profil (Locataire, Propriétaire ou Agence), puis remplissez le formulaire. L\'inscription est gratuite et ne prend que 2 minutes.' },
                  { id: 'q2', question: 'Puis-je avoir plusieurs rôles ?', answer: 'Oui ! Vous pouvez basculer entre plusieurs rôles depuis votre profil. Par exemple, être à la fois locataire et propriétaire. Allez dans "Mon profil" puis "Gestion des rôles".' },
                  { id: 'q3', question: 'Comment réinitialiser mon mot de passe ?', answer: 'Sur la page de connexion, cliquez sur "Mot de passe oublié ?" et suivez les instructions envoyées par email. Assurez-vous de vérifier vos spams.' }
                ];
                const filteredCompteItems = filterFAQItems(compteItems);
                
                return filteredCompteItems.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-5 w-5 text-primary" />
                        <CardTitle>Compte & Inscription</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Accordion type="single" collapsible>
                        {filteredCompteItems.map(item => (
                          <AccordionItem key={item.id} value={item.id}>
                            <AccordionTrigger>{item.question}</AccordionTrigger>
                            <AccordionContent>{item.answer}</AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </CardContent>
                  </Card>
                ) : null;
              })()}

              {/* Catégorie: Certification ANSUT */}
              {(() => {
                const certifItems = [
                  { id: 'c1', question: 'Qu\'est-ce que la certification ANSUT ?', answer: 'C\'est une vérification officielle de votre identité par l\'ANSUT (Agence Nationale des Systèmes d\'Urgence et de Télécommunications). Elle garantit votre sécurité et augmente votre crédibilité sur la plateforme.' },
                  { id: 'c2', question: 'La certification est-elle obligatoire ?', answer: 'Non, mais elle est fortement recommandée ! Les profils certifiés ont accès à plus de fonctionnalités et inspirent davantage confiance. Pour les propriétaires, c\'est indispensable pour publier des annonces.' },
                  { id: 'c3', question: 'Combien coûte la certification ?', answer: 'La certification ANSUT est totalement GRATUITE pour tous les utilisateurs. C\'est un service public financé par l\'État ivoirien.' },
                  { id: 'c4', question: 'Combien de temps prend la vérification ?', answer: 'En moyenne 24-48 heures ouvrées. Vous recevrez un email dès que votre dossier sera traité. Assurez-vous que vos documents sont clairs et lisibles pour accélérer le processus.' }
                ];
                const filteredCertifItems = filterFAQItems(certifItems);
                
                return filteredCertifItems.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-5 w-5 text-primary" />
                        <CardTitle>Certification ANSUT</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Accordion type="single" collapsible>
                        {filteredCertifItems.map(item => (
                          <AccordionItem key={item.id} value={item.id}>
                            <AccordionTrigger>{item.question}</AccordionTrigger>
                            <AccordionContent>{item.answer}</AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </CardContent>
                  </Card>
                ) : null;
              })()}

              {/* Catégorie: Recherche & Location */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Search className="h-5 w-5 text-primary" />
                    <CardTitle>Recherche & Location</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible>
                    <AccordionItem value="r1">
                      <AccordionTrigger>Comment rechercher un bien ?</AccordionTrigger>
                      <AccordionContent>
                        Utilisez la barre de recherche en haut de la page ou allez sur "/recherche". Vous pouvez filtrer par ville, quartier, type de bien, budget, nombre de pièces, etc. Utilisez la carte interactive pour explorer visuellement.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="r2">
                      <AccordionTrigger>Comment postuler à une annonce ?</AccordionTrigger>
                      <AccordionContent>
                        Sur la page du bien, cliquez sur "Postuler". Remplissez le formulaire avec vos informations et téléchargez vos justificatifs (pièce d'identité, bulletin de salaire, etc.). Le propriétaire sera notifié.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="r3">
                      <AccordionTrigger>Puis-je visiter un bien avant de postuler ?</AccordionTrigger>
                      <AccordionContent>
                        Oui ! Contactez directement le propriétaire via la messagerie intégrée pour planifier une visite. Vous pouvez aussi poser toutes vos questions avant de postuler.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>

              {/* Catégorie: Paiements & Tarifs */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <CardTitle>Paiements & Tarifs</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible>
                    <AccordionItem value="p1">
                      <AccordionTrigger>La plateforme est-elle payante ?</AccordionTrigger>
                      <AccordionContent>
                        <strong>Pour les locataires :</strong> 100% GRATUIT, aucun frais.<br/>
                        <strong>Pour les propriétaires/agences :</strong> Commission de 10% uniquement en cas de location réussie. Aucun frais pour publier ou gérer vos annonces.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="p2">
                      <AccordionTrigger>Quels moyens de paiement acceptez-vous ?</AccordionTrigger>
                      <AccordionContent>
                        Nous acceptons Orange Money, MTN Mobile Money, Wave et Moov Money. Les paiements sont 100% sécurisés et chiffrés.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="p3">
                      <AccordionTrigger>Quand la commission est-elle prélevée ?</AccordionTrigger>
                      <AccordionContent>
                        La commission de 10% n'est facturée qu'après signature officielle du bail et confirmation de la location. Si le locataire se rétracte, aucun frais n'est appliqué.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>

              {/* Catégorie: Sécurité & Confidentialité */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <CardTitle>Sécurité & Confidentialité</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible>
                    <AccordionItem value="s1">
                      <AccordionTrigger>Mes données sont-elles protégées ?</AccordionTrigger>
                      <AccordionContent>
                        Absolument. Nous respectons la loi ivoirienne 2013-450 sur la protection des données. Vos informations personnelles sont chiffrées et jamais partagées sans votre consentement. Voir notre <Link to="/confidentialite" className="text-primary underline">Politique de confidentialité</Link>.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="s2">
                      <AccordionTrigger>Comment signaler une annonce frauduleuse ?</AccordionTrigger>
                      <AccordionContent>
                        Sur chaque annonce, cliquez sur &quot;Signaler&quot; et indiquez la raison. Notre équipe de modération vérifiera dans les 24h. En cas d&apos;urgence, contactez-nous à contact@montoit.ci.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="s3">
                      <AccordionTrigger>Puis-je supprimer mon compte ?</AccordionTrigger>
                      <AccordionContent>
                        Oui, allez dans &quot;Mon profil&quot; &gt; &quot;Paramètres&quot; &gt; &quot;Supprimer mon compte&quot;. Attention : cette action est irréversible et supprimera toutes vos données.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>

              {/* Catégorie: Problèmes techniques */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-primary" />
                    <CardTitle>Problèmes techniques</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible>
                    <AccordionItem value="t1">
                      <AccordionTrigger>Je ne reçois pas d&apos;emails de notification</AccordionTrigger>
                      <AccordionContent>
                        Vérifiez d&apos;abord vos spams/courriers indésirables. Ajoutez contact@montoit.ci à vos contacts. Si le problème persiste, vérifiez vos préférences de notification dans &quot;Mon profil&quot; &gt; &quot;Notifications&quot;.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="t2">
                      <AccordionTrigger>L&apos;upload de photos ne fonctionne pas</AccordionTrigger>
                      <AccordionContent>
                        Assurez-vous que vos photos sont au format JPG ou PNG et font moins de 5 Mo chacune. Essayez de compresser vos images ou d&apos;utiliser un autre navigateur (Chrome ou Firefox recommandés).
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="t3">
                      <AccordionTrigger>La carte ne s&apos;affiche pas correctement</AccordionTrigger>
                      <AccordionContent>
                        Autorisez l&apos;accès à votre position dans votre navigateur. Effacez le cache de votre navigateur et rechargez la page. Si le problème persiste, contactez le support.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Ressources supplémentaires */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <FileText className="h-12 w-12 mx-auto mb-3 text-primary" />
                <CardTitle>Documentation complète</CardTitle>
                <CardDescription>Guides détaillés pour chaque fonctionnalité</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild className="w-full">
                  <Link to="/comment-ca-marche">
                    Voir la documentation
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <Shield className="h-12 w-12 mx-auto mb-3 text-primary" />
                <CardTitle>FAQ Certification</CardTitle>
                <CardDescription>Tout savoir sur la certification ANSUT</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild className="w-full">
                  <Link to="/certification-faq">
                    Consulter la FAQ
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <Clock className="h-12 w-12 mx-auto mb-3 text-primary" />
                <CardTitle>Statut du service</CardTitle>
                <CardDescription>Incidents et maintenance planifiée</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <span className="text-sm font-medium text-success">Tous les services opérationnels</span>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Contact Section */}
          <Card className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-primary/30">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl mb-3">Vous ne trouvez pas de réponse ?</CardTitle>
              <CardDescription className="text-base">Notre équipe support est disponible pour vous aider</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-6">
                <div className="flex items-start gap-4 p-4 bg-background rounded-lg">
                  <Mail className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold mb-1">Email Support</p>
                    <a href="mailto:contact@montoit.ci" className="text-primary hover:underline">
                      contact@montoit.ci
                    </a>
                    <p className="text-sm text-muted-foreground mt-1">Réponse sous 24h</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-4 bg-background rounded-lg">
                  <Phone className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold mb-1">Téléphone</p>
                    <p className="text-foreground">+225 27 XX XX XX XX</p>
                    <p className="text-sm text-muted-foreground mt-1">Lun-Ven : 8h - 18h</p>
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <Button size="lg" asChild>
                  <Link to="/messages">
                    <MessageSquare className="mr-2 h-5 w-5" />
                    Ouvrir une conversation
                  </Link>
                </Button>
                <p className="text-sm text-muted-foreground mt-3">
                  Temps de réponse moyen : <strong>2 heures</strong>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Guide;
