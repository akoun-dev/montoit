import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Eye, Edit, FileText, Users, Wrench, DollarSign, ArrowLeft, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';

export default function MandatesHelp() {
  const navigate = useNavigate();

  return (
    <div className="container max-w-5xl py-8 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>
        <div>
          <h1 className="text-4xl font-bold mb-2">Guide des Mandats d'Agence</h1>
          <p className="text-lg text-muted-foreground">
            Tout savoir sur le système de mandats entre propriétaires et agences immobilières
          </p>
        </div>
      </div>

      {/* Introduction */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Qu'est-ce qu'un mandat d'agence ?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Un <strong>mandat d'agence</strong> est un contrat par lequel un propriétaire autorise une agence immobilière 
            à gérer un ou plusieurs de ses biens. Ce mandat définit les permissions, la rémunération et la durée de la collaboration.
          </p>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Les mandats sont sécurisés et traçables. Chaque action effectuée dans le cadre d'un mandat est enregistrée.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Types de mandats */}
      <Card>
        <CardHeader>
          <CardTitle>Types de mandats</CardTitle>
          <CardDescription>Trois types de mandats sont disponibles selon vos besoins</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="border rounded-lg p-4 space-y-2">
              <Badge variant="default">Location</Badge>
              <h4 className="font-semibold">Mandat de location</h4>
              <p className="text-sm text-muted-foreground">
                L'agence gère la recherche de locataires et la signature des baux pour vos biens en location.
              </p>
            </div>
            <div className="border rounded-lg p-4 space-y-2">
              <Badge variant="default">Gestion complète</Badge>
              <h4 className="font-semibold">Mandat de gestion complète</h4>
              <p className="text-sm text-muted-foreground">
                L'agence gère l'intégralité de vos biens : location, maintenance, finances, relations locataires.
              </p>
            </div>
            <div className="border rounded-lg p-4 space-y-2">
              <Badge variant="default">Vente</Badge>
              <h4 className="font-semibold">Mandat de vente</h4>
              <p className="text-sm text-muted-foreground">
                L'agence est chargée de vendre votre bien aux meilleures conditions du marché.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Portée du mandat */}
      <Card>
        <CardHeader>
          <CardTitle>Portée du mandat</CardTitle>
          <CardDescription>Mandat spécifique vs mandat global</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border rounded-lg p-4 space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Mandat spécifique
              </h4>
              <p className="text-sm text-muted-foreground">
                Le mandat concerne <strong>un bien précis</strong>. L'agence ne peut gérer que ce bien.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                ✓ Idéal pour tester une collaboration<br/>
                ✓ Contrôle fin par bien
              </p>
            </div>
            <div className="border rounded-lg p-4 space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Mandat global
              </h4>
              <p className="text-sm text-muted-foreground">
                Le mandat couvre <strong>tous vos biens actuels et futurs</strong>. L'agence gère l'ensemble de votre portefeuille.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                ✓ Gestion centralisée<br/>
                ✓ Gain de temps pour les grands propriétaires
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permissions détaillées */}
      <Card>
        <CardHeader>
          <CardTitle>Permissions disponibles</CardTitle>
          <CardDescription>Choisissez précisément ce que l'agence peut faire</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Propriétés */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Gestion des propriétés
              </h4>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex items-start gap-3 p-3 border rounded">
                  <Eye className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Voir les propriétés</p>
                    <p className="text-xs text-muted-foreground">Accès en lecture seule aux fiches des biens</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 border rounded">
                  <Edit className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Modifier les propriétés</p>
                    <p className="text-xs text-muted-foreground">Mettre à jour prix, description, photos, etc.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 border rounded">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Créer des propriétés</p>
                    <p className="text-xs text-muted-foreground">Ajouter de nouveaux biens à votre portefeuille</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Candidatures */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Gestion des candidatures
              </h4>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex items-start gap-3 p-3 border rounded">
                  <Eye className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Voir les candidatures</p>
                    <p className="text-xs text-muted-foreground">Consulter les dossiers des candidats locataires</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 border rounded">
                  <Edit className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Gérer les candidatures</p>
                    <p className="text-xs text-muted-foreground">Accepter, refuser ou mettre en attente des candidats</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Autres permissions */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Autres permissions
              </h4>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex items-start gap-3 p-3 border rounded">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Créer des baux</p>
                    <p className="text-xs text-muted-foreground">Générer et signer des contrats de location</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 border rounded">
                  <DollarSign className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Voir les finances</p>
                    <p className="text-xs text-muted-foreground">Accès aux paiements et statistiques financières</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 border rounded">
                  <Wrench className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Gérer la maintenance</p>
                    <p className="text-xs text-muted-foreground">Traiter les demandes de réparation et travaux</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 border rounded">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Gérer les documents</p>
                    <p className="text-xs text-muted-foreground">Uploader et organiser les documents des biens</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cycle de vie */}
      <Card>
        <CardHeader>
          <CardTitle>Cycle de vie d'un mandat</CardTitle>
          <CardDescription>Les différentes étapes d'un mandat</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-secondary-foreground font-bold shrink-0">1</div>
              <div>
                <h4 className="font-semibold">Invitation <Badge variant="secondary">En attente</Badge></h4>
                <p className="text-sm text-muted-foreground">
                  Le propriétaire crée un mandat et invite l'agence. L'agence reçoit une notification.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-secondary-foreground font-bold shrink-0">2</div>
              <div>
                <h4 className="font-semibold">Acceptation <Badge variant="default">Actif</Badge></h4>
                <p className="text-sm text-muted-foreground">
                  L'agence accepte le mandat. Les permissions sont activées et l'agence peut commencer la gestion.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-secondary-foreground font-bold shrink-0">3</div>
              <div>
                <h4 className="font-semibold">Gestion active</h4>
                <p className="text-sm text-muted-foreground">
                  L'agence gère les biens selon les permissions accordées. Le propriétaire garde le contrôle et peut ajuster les permissions.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-secondary-foreground font-bold shrink-0">4</div>
              <div>
                <h4 className="font-semibold">Fin du mandat <Badge variant="destructive">Résilié</Badge> ou <Badge variant="outline">Expiré</Badge></h4>
                <p className="text-sm text-muted-foreground">
                  Le mandat prend fin soit par résiliation (propriétaire ou agence), soit automatiquement à la date de fin prévue.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>Questions fréquentes (FAQ)</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>Comment inviter une agence ?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Depuis votre page "Mes Mandats", cliquez sur "Inviter une agence". Sélectionnez l'agence, 
                le type de mandat, les permissions souhaitées et les conditions financières. L'agence recevra 
                une notification et pourra accepter ou refuser.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>Puis-je modifier les permissions après acceptation ?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Oui ! En tant que propriétaire, vous pouvez à tout moment modifier les permissions accordées 
                à une agence. Depuis la page "Mes Mandats", cliquez sur "Modifier les permissions" sur le mandat concerné.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>Comment résilier un mandat ?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Le propriétaire et l'agence peuvent tous deux résilier un mandat. Cliquez sur "Résilier" 
                sur la carte du mandat, indiquez un motif, et confirmez. La résiliation est immédiate 
                et l'agence perd toutes les permissions associées.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger>Quelle est la différence entre commission et frais fixes ?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <strong>Commission</strong> : Pourcentage sur les loyers collectés (ex: 10% du loyer mensuel).<br/>
                <strong>Frais fixes</strong> : Montant fixe par période (ex: 50 000 FCFA/mois).<br/>
                Vous pouvez choisir l'un ou l'autre, ou combiner les deux selon votre accord avec l'agence.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-5">
              <AccordionTrigger>Que se passe-t-il si je supprime un bien sous mandat ?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Si vous supprimez un bien couvert par un mandat spécifique, le mandat reste actif mais sans bien associé. 
                Pour un mandat global, seul ce bien est retiré, les autres restent gérés par l'agence.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-6">
              <AccordionTrigger>Puis-je avoir plusieurs mandats avec différentes agences ?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Oui, mais attention : évitez d'avoir plusieurs mandats actifs pour le même bien. 
                Le système vous alertera si vous tentez de créer un mandat en doublon.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* CTA */}
      <div className="flex justify-center">
        <Button onClick={() => navigate(-1)} size="lg">
          Retour à mes mandats
        </Button>
      </div>
    </div>
  );
}