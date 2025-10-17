import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CertifiedBadge from "@/components/ui/certified-badge";
import { Shield, Lock, FileCheck, Users } from "lucide-react";
import { LazyIllustration } from "@/components/illustrations/LazyIllustration";
import { getIllustrationPath } from "@/lib/utils";
import { BogolanPattern } from "@/components/ui/african-patterns";

const Certification = () => {
  const features = [
    {
      icon: Shield,
      title: "Vérification d'identité",
      description: "Tous les utilisateurs sont vérifiés via Smile ID pour garantir l'authenticité des profils.",
    },
    {
      icon: Lock,
      title: "Transactions sécurisées",
      description: "Paiements cryptés (AES-256) et conformes aux normes bancaires ivoiriennes.",
    },
    {
      icon: FileCheck,
      title: "Validation des annonces",
      description: "Chaque bien est vérifié par l'équipe ANSUT avant publication.",
    },
    {
      icon: Users,
      title: "Conformité légale",
      description: "Respect de la loi ivoirienne 2013-450 sur la protection des données.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24">
        {/* Hero with illustration */}
        <section className="relative h-96 overflow-hidden mb-12">
          <LazyIllustration 
            src={getIllustrationPath('certification-ansut-illustration')!}
            alt="Certification officielle ANSUT"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-secondary/80 flex items-center justify-center">
            <div className="container mx-auto px-4 text-center text-white">
              <div className="flex justify-center mb-6">
                <CertifiedBadge clickable={false} />
              </div>
              <h1 className="text-h1 mb-4">
                <span className="text-gradient-animated">Certification ANSUT</span>
              </h1>
              <p className="text-lg max-w-2xl mx-auto opacity-95">
                Mon Toit est propulsé par l'Agence Nationale de Soutien à l'Urbanisme et au Territoire (ANSUT), 
                garantissant sécurité, fiabilité et conformité pour tous vos projets immobiliers.
              </p>
            </div>
          </div>
        </section>

        <section className="py-6 md:py-10">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="bg-gradient-primary/10 border-2 border-primary/20 rounded-xl p-8 mb-12">
              <h2 className="text-2xl font-bold mb-4">Qu'est-ce que la certification ANSUT ?</h2>
              <p className="text-muted-foreground mb-4">
                La certification ANSUT est un label de confiance délivré aux plateformes immobilières 
                qui respectent les standards les plus élevés en matière de sécurité, transparence et 
                conformité réglementaire en Côte d'Ivoire.
              </p>
              <p className="text-muted-foreground">
                Mon Toit s'engage à protéger vos données personnelles, vérifier l'authenticité de chaque 
                annonce et garantir la sécurité de vos transactions financières.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="bg-card border border-border rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-gradient-primary shrink-0">
                        <Icon className="h-6 w-6 text-primary-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-muted/50 rounded-xl p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">Une plateforme 100% ivoirienne</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Développée en Côte d'Ivoire, pour les Ivoiriens. Mon Toit s'adapte aux réalités 
                locales et propose des solutions de paiement compatibles avec Mobile Money 
                (Orange Money, MTN Money, Moov Money).
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Certification;
