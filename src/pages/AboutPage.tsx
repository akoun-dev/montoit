import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import UnifiedTrustSection from "@/components/UnifiedTrustSection";

const AboutPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-20">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold mb-4">À propos de Mon Toit</h1>
          <p className="text-lg text-muted-foreground mb-8">
            La plateforme immobilière certifiée par l'État ivoirien pour des locations sécurisées
          </p>
        </div>
        <UnifiedTrustSection />
      </main>
      <Footer />
    </div>
  );
};

export default AboutPage;
