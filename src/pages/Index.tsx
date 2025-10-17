import { MainLayout } from "@/components/layout/MainLayout";
import { PremiumHero } from "@/components/PremiumHero";
import { MobileHero } from "@/components/MobileHero";
import { useIsMobile } from "@/hooks/useIsMobile";
import { PropertyGrid } from "@/components/PropertyGrid";
import OnboardingModal from "@/components/OnboardingModal";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Search, ShieldCheck } from "lucide-react";

const Index = () => {
  console.log('[Index] Rendering Index page');
  return (
    <MainLayout>
      <Helmet>
        <title>Mon Toit - Location Immobilière Certifiée ANSUT en Côte d'Ivoire</title>
        <meta 
          name="description" 
          content="Trouvez votre logement idéal en Côte d'Ivoire. Baux certifiés ANSUT, dossiers vérifiés, signature électronique. Plus de 3,500 logements à Abidjan, Yopougon, Cocody." 
        />
        <link rel="canonical" href="https://montoit.ci" />
      </Helmet>

      <main role="main">
        {/* Hero adaptatif : Mobile ou Desktop */}
        {useIsMobile() ? <MobileHero /> : <PremiumHero />}
        
        {/* Main Property Grid - Dynamic height */}
        <PropertyGrid
          limit={16}
          showFilters={true}
        />

        {/* Mini CTA - Subtle, non-intrusive */}
        <section className="py-8 bg-gradient-to-b from-primary/5 to-background border-t border-primary/10">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2 text-foreground">
                Pas encore trouvé votre toit idéal ?
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Explorez plus de biens ou découvrez pourquoi 10 000+ Ivoiriens nous font confiance
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                <Button asChild size="lg" className="shadow-md min-w-[200px]">
                  <Link to="/explorer">
                    <Search className="h-4 w-4 mr-2" />
                    Explorer plus de biens
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="shadow-sm min-w-[200px]">
                  <Link to="/a-propos">
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Pourquoi Mon Toit ?
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <OnboardingModal />
    </MainLayout>
  );
};

export default Index;
