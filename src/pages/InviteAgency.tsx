import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { DynamicBreadcrumb } from '@/components/navigation/DynamicBreadcrumb';
import { InviteAgencyDialog } from '@/components/mandates/InviteAgencyDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Users, FileText, ArrowRight, Handshake } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

const InviteAgency = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleInviteSuccess = () => {
    toast({
      title: 'Invitation envoyée',
      description: 'L\'agence a été invitée avec succès',
    });
    setIsDialogOpen(false);
    navigate('/my-mandates');
  };

  const handleInviteError = (error: Error) => {
    toast({
      title: 'Erreur',
      description: 'Impossible d\'envoyer l\'invitation',
      variant: 'destructive',
    });
  };

  if (!profile || (profile.user_type !== 'proprietaire' && profile.user_type !== 'agence')) {
    navigate('/dashboard');
    return null;
  }

  return (
    <MainLayout>
      <main className="container mx-auto px-4 py-8">
        <DynamicBreadcrumb />

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Handshake className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold">
              Inviter une agence immobilière
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Confiez la gestion de vos biens à des professionnels agréés et développez votre portefeuille immobilier
            </p>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg">Gestion professionnelle</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Des experts gèrent vos biens, de la recherche de locataires à l'entretien
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Building2 className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle className="text-lg">Plus de visibilité</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Accédez à un réseau plus large de locataires potentiels grâce à l'agence
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle className="text-lg">Administratif simplifié</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  L'agence s'occupe des contrats, des états des lieux et des encaissements
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          {/* CTA */}
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <h2 className="text-2xl font-semibold">
                  Prêt à collaborer avec une agence ?
                </h2>
                <p className="text-muted-foreground">
                  Invitez une agence immobilière dès aujourd'hui et profitez d'une gestion sereine de vos biens
                </p>
                <Button
                  size="lg"
                  onClick={() => setIsDialogOpen(true)}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Handshake className="h-5 w-5 mr-2" />
                  Inviter une agence
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* How it works */}
          <Card>
            <CardHeader>
              <CardTitle>Comment ça marche ?</CardTitle>
              <CardDescription>
                Le processus d'invitation d'agence en 3 étapes simples
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center space-y-2">
                  <div className="mx-auto w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                    1
                  </div>
                  <h3 className="font-semibold">Invitez l'agence</h3>
                  <p className="text-sm text-muted-foreground">
                    Remplissez le formulaire d'invitation avec les informations de l'agence
                  </p>
                </div>
                <div className="text-center space-y-2">
                  <div className="mx-auto w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                    2
                  </div>
                  <h3 className="font-semibold">Agence accepte</h3>
                  <p className="text-sm text-muted-foreground">
                    L'agence reçoit l'invitation et peut l'accepter pour commencer la collaboration
                  </p>
                </div>
                <div className="text-center space-y-2">
                  <div className="mx-auto w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                    3
                  </div>
                  <h3 className="font-semibold">Mandat signé</h3>
                  <p className="text-sm text-muted-foreground">
                    Un mandat de gestion est établi et l'agence commence à gérer vos biens
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-center gap-4 pt-4">
            <Button variant="outline" onClick={() => navigate('/my-mandates')}>
              Voir mes mandats
            </Button>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Retour au tableau de bord
            </Button>
          </div>
        </div>
      </main>

      {/* Invite Agency Dialog */}
      <InviteAgencyDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={handleInviteSuccess}
        onError={handleInviteError}
      />
    </MainLayout>
  );
};

export default InviteAgency;