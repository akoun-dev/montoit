import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Features from "@/components/Features";
import Testimonials from "@/components/Testimonials";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Users, Award, TrendingUp } from "lucide-react";
import { AkanPattern } from "@/components/ui/african-patterns";
import { GradientButton } from "@/components/ui/gradient-button";

const APropos = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24">
        <div className="container mx-auto px-4 py-10">
          <div className="max-w-4xl mx-auto">
            {/* Hero avec pattern culturel */}
            <div className="relative mb-12">
              <AkanPattern />
              <div className="relative z-10">
                <h1 className="text-h1 text-center mb-4">
                  <span className="text-gradient-primary">À propos</span> de Mon Toit
                </h1>
                <p className="text-xl text-muted-foreground text-center">
                  La plateforme de confiance pour l'immobilier en Côte d'Ivoire
                </p>
              </div>
            </div>

            <div className="prose prose-lg max-w-none mb-12">
              <p>
                <strong>Mon Toit</strong> est une plateforme innovante propulsée par <strong>ANSUT</strong> 
                (Agence Nationale du Service Universel des Télécommunications/TIC), 
                dédiée à révolutionner le marché immobilier ivoirien.
              </p>
              <p>
                Notre mission est de créer un environnement sécurisé, transparent et efficace 
                pour tous les acteurs de l'immobilier : locataires, propriétaires et agences.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-12">
              <Card>
                <CardHeader>
                  <Shield className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Sécurité garantie</CardTitle>
                </CardHeader>
                <CardContent>
                  Vérification d'identité (ONECI, CNAM), certification ANSUT des baux, 
                  et paiements sécurisés via Mobile Money.
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Users className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Confiance mutuelle</CardTitle>
                </CardHeader>
                <CardContent>
                  Système de notation et d'avis vérifiés pour locataires et propriétaires.
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Award className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Conformité légale</CardTitle>
                </CardHeader>
                <CardContent>
                  Conforme à la loi ivoirienne 2013-450 sur la protection des données 
                  et aux réglementations immobilières.
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <TrendingUp className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Innovation continue</CardTitle>
                </CardHeader>
                <CardContent>
                  Visites virtuelles 360°, recommandations IA, et outils d'analyse 
                  pour propriétaires.
                </CardContent>
              </Card>
            </div>

            <Card className="bg-primary text-primary-foreground">
              <CardContent className="pt-6">
                <h3 className="text-2xl font-bold mb-4">Nos valeurs</h3>
                <ul className="space-y-2">
                  <li>✓ <strong>Transparence</strong> : Informations claires et vérifiables</li>
                  <li>✓ <strong>Sécurité</strong> : Protection des données et des transactions</li>
                  <li>✓ <strong>Accessibilité</strong> : Plateforme simple et intuitive</li>
                  <li>✓ <strong>Innovation</strong> : Technologies de pointe au service de tous</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Fonctionnalités de la plateforme */}
          <div className="my-20">
            <h2 className="text-h2 text-center mb-12">
              Nos <span className="text-gradient-secondary">fonctionnalités</span>
            </h2>
            <Features />
          </div>

          {/* Témoignages */}
          <div className="my-20">
            <h2 className="text-h2 text-center mb-12">
              Ce que disent nos <span className="text-gradient-secondary">utilisateurs</span>
            </h2>
            <Testimonials />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default APropos;
