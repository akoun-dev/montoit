import { User, Home, Building2, ShieldCheck, FileCheck, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { LazyIllustration } from "@/components/illustrations/LazyIllustration";
import { getIllustrationPath } from "@/lib/utils";

const journeys = [
  {
    icon: User,
    title: "Locataire",
    color: "from-blue-500 to-blue-600",
    illustrationKey: 'apartment-visit' as const,
    steps: [
      {
        number: "1",
        icon: User,
        title: "Créez votre profil",
        description: "Inscrivez-vous et complétez vos informations personnelles"
      },
      {
        number: "2",
        icon: ShieldCheck,
        title: "Faites-vous certifier ANSUT",
        description: "Vérification biométrique et constitution de votre dossier digital"
      },
      {
        number: "3",
        icon: FileCheck,
        title: "Postulez en 1 clic",
        description: "Candidatez aux biens avec votre profil certifié"
      }
    ],
    cta: {
      text: "Créer mon profil locataire",
      link: "/auth?type=tenant"
    }
  },
  {
    icon: Home,
    title: "Propriétaire",
    color: "from-primary to-primary-600",
    illustrationKey: 'modern-living-room' as const,
    steps: [
      {
        number: "1",
        icon: Home,
        title: "Publiez votre bien",
        description: "Ajoutez photos, description et caractéristiques"
      },
      {
        number: "2",
        icon: User,
        title: "Recevez des candidatures certifiées",
        description: "Ne traitez que des dossiers vérifiés avec scoring"
      },
      {
        number: "3",
        icon: Wallet,
        title: "Signez & encaissez en ligne",
        description: "Bail digital + paiements Mobile Money sécurisés"
      }
    ],
    cta: {
      text: "Publier un bien",
      link: "/publier"
    }
  },
  {
    icon: Building2,
    title: "Agence",
    color: "from-secondary to-secondary-600",
    illustrationKey: 'co-ownership-meeting' as const,
    steps: [
      {
        number: "1",
        icon: Building2,
        title: "Créez votre profil d'agence",
        description: "Inscription professionnelle avec documents officiels"
      },
      {
        number: "2",
        icon: Home,
        title: "Gérez plusieurs propriétés",
        description: "Tableau de bord centralisé pour tous vos biens"
      },
      {
        number: "3",
        icon: FileCheck,
        title: "Signez des contrats digitaux",
        description: "Automatisez la gestion locative de A à Z"
      }
    ],
    cta: {
      text: "Créer mon compte agence",
      link: "/auth?type=agency"
    }
  }
];

const HowItWorks = () => {
  return (
    <section id="comment-ca-marche" className="py-12 md:py-14 bg-gradient-to-br from-primary/5 via-background to-secondary/5 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-0" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl -z-0" />
      <div className="container mx-auto px-3 md:px-4 max-w-7xl relative z-10">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 text-foreground">Comment ça marche ?</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Choisissez votre parcours et découvrez comment Mon Toit simplifie vos démarches immobilières
          </p>
        </div>

        {/* 3-Column Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {journeys.map((journey, index) => {
            const JourneyIcon = journey.icon;
            const iconBgColor = 
              index === 0 ? "bg-blue-600" : 
              index === 1 ? "bg-primary" : 
              "bg-secondary";

            return (
              <div key={index} className="bg-white rounded-lg border border-gray-200 shadow-md hover:shadow-xl transition-all duration-300 p-6">
                {/* Header compact */}
                <div className="flex items-center gap-3 mb-6">
                  <div className={`${iconBgColor} p-2.5 rounded-full`}>
                    <JourneyIcon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold">{journey.title}</h3>
                </div>

                {/* Steps compacts */}
                <div className="space-y-4 mb-6">
                  {journey.steps.map((step, stepIndex) => {
                    const StepIcon = step.icon;
                    return (
                      <div key={stepIndex} className="flex gap-3 items-start">
                        <div className={`w-8 h-8 ${iconBgColor} rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                          {step.number}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 mb-1">
                            <StepIcon className="h-4 w-4 text-primary" />
                            <h4 className="font-semibold text-sm">{step.title}</h4>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* CTA compact */}
                <Button asChild size="sm" className="w-full">
                  <Link to={journey.cta.link}>{journey.cta.text}</Link>
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
