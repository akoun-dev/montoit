import { lazy, Suspense } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, FileCheck, Home, UserCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { BogolanPattern } from "@/components/ui/african-patterns";

// Lazy load des sections
const HowItWorks = lazy(() => import("@/components/HowItWorks"));
const Features = lazy(() => import("@/components/Features"));
const Testimonials = lazy(() => import("@/components/Testimonials"));

const CommentCaMarche = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="text-center mb-16 animate-fade-in relative">
              <BogolanPattern />
              <div className="relative z-10">
                <h1 className="text-h1 mb-4">
                  <span className="text-gradient-animated">Comment ça marche ?</span>
                </h1>
                <p className="text-body-lg text-muted-foreground max-w-2xl mx-auto">
                  Découvrez le processus simple et sécurisé de Mon Toit
                </p>
              </div>
            </div>

            {/* Processus détaillé */}
            <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg mb-20" />}>
              <div className="animate-fade-in">
                <HowItWorks />
              </div>
            </Suspense>

            {/* Fonctionnalités clés */}
            <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg my-20" />}>
              <div className="my-20 animate-fade-in">
                <Features />
              </div>
            </Suspense>

            {/* Témoignages */}
            <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg my-20" />}>
              <div className="my-20 animate-fade-in">
                <Testimonials />
              </div>
            </Suspense>

            {/* FAQ Section */}
            <section className="py-10">
              <div className="text-center mb-12">
                <h2 className="text-h2 mb-4">
                  Questions <span className="text-gradient-secondary">fréquentes</span>
                </h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Shield className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Est-ce vraiment gratuit pour les locataires ?</h3>
                        <p className="text-sm text-muted-foreground">
                          Oui, 100% gratuit ! Créez votre dossier, cherchez un logement et signez votre bail sans frais.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FileCheck className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Comment se fait la vérification ANSUT ?</h3>
                        <p className="text-sm text-muted-foreground">
                          Vérification d'identité via ONECI ou CNAM en 48h maximum. Totalement sécurisé et confidentiel.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Home className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Comment publier une annonce ?</h3>
                        <p className="text-sm text-muted-foreground">
                          Créez un compte propriétaire, ajoutez votre bien en 5 minutes. Commission uniquement à la signature.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <UserCheck className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Les baux sont-ils légalement valides ?</h3>
                        <p className="text-sm text-muted-foreground">
                          Oui, certifiés ANSUT avec signature électronique légalement reconnue en Côte d'Ivoire.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CommentCaMarche;
