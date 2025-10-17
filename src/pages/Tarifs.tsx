import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { Link } from "react-router-dom";
import { KentePattern } from "@/components/ui/african-patterns";
import { GradientButton } from "@/components/ui/gradient-button";

const pricingPlans = [
  {
    name: "Locataire",
    price: "Gratuit",
    description: "Pour trouver votre logement idéal",
    features: [
      "Recherche illimitée de biens",
      "Candidatures en 1 clic",
      "Certification ANSUT incluse",
      "Messagerie avec propriétaires",
      "Notifications en temps réel",
      "Tableau de bord personnel"
    ],
    notIncluded: [],
    cta: "Créer mon profil",
    ctaLink: "/auth?type=tenant",
    highlighted: false
  },
  {
    name: "Propriétaire",
    price: "5%",
    priceDetail: "de commission sur loyer",
    description: "Pour louer vos biens en toute sécurité",
    features: [
      "Publication illimitée de biens",
      "Réception candidatures certifiées",
      "Contrats digitaux sécurisés",
      "Paiements Mobile Money",
      "Tableau de bord analytique",
      "Support prioritaire",
      "Signature électronique"
    ],
    notIncluded: [],
    cta: "Publier un bien",
    ctaLink: "/publier",
    highlighted: true
  },
  {
    name: "Agence",
    price: "Sur devis",
    description: "Pour gérer plusieurs propriétés",
    features: [
      "Toutes les fonctionnalités Propriétaire",
      "Gestion multi-propriétés",
      "Rapports avancés en temps réel",
      "API d'intégration",
      "Branding personnalisé",
      "Support dédié 24/7",
      "Formation des équipes"
    ],
    notIncluded: [],
    cta: "Nous contacter",
    ctaLink: "/auth?type=agency",
    highlighted: false
  }
];

const Tarifs = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24">
        {/* Hero Section */}
        <section className="py-12 md:py-18 bg-white relative">
          <KentePattern />
          <div className="container mx-auto px-4 max-w-7xl text-center relative z-10">
            <h1 className="text-h1 mb-6">
              Des tarifs <span className="text-gradient-primary">simples et transparents</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              Choisissez la formule adaptée à votre besoin. Aucun frais caché, annulation à tout moment.
            </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-8 md:py-12 bg-gray-50">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {pricingPlans.map((plan, index) => {
                const borderColor = 
                  index === 0 ? "border-l-blue-600" : 
                  index === 1 ? "border-l-primary" : 
                  "border-l-secondary";

                return (
                  <div
                    key={index}
                    className={`bg-white rounded-lg border-l-4 ${borderColor} ${
                      plan.highlighted ? "shadow-lg scale-105 md:scale-110" : index === 0 ? "shadow-lg md:scale-105" : "shadow-md"
                    } p-8 relative transition-all duration-200 hover:shadow-xl`}
                  >
                    {/* Badge Toujours Gratuit pour Locataire */}
                    {index === 0 && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-secondary text-white px-4 py-1 rounded-full text-sm font-semibold">
                        TOUJOURS GRATUIT
                      </div>
                    )}


                    <div className="mb-6">
                      <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
                      <p className="text-muted-foreground text-sm">{plan.description}</p>
                    </div>

                    <div className="mb-6">
                      <div className="text-4xl font-bold text-foreground">{plan.price}</div>
                      {plan.priceDetail && (
                        <div className="text-sm text-muted-foreground mt-1">{plan.priceDetail}</div>
                      )}
                    </div>

                    <ul className="space-y-4 mb-8">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start gap-3">
                          <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-foreground">{feature}</span>
                        </li>
                      ))}
                      {plan.notIncluded.map((feature, featureIndex) => (
                        <li key={`not-${featureIndex}`} className="flex items-start gap-3">
                          <X className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <span className="text-muted-foreground line-through">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button 
                      asChild 
                      className="w-full" 
                      size="lg"
                      variant={plan.highlighted ? "default" : "outline"}
                    >
                      <Link to={plan.ctaLink}>{plan.cta}</Link>
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* FAQ Section */}
            <div className="mt-20 max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center text-foreground">
                Questions fréquentes
              </h2>
              <div className="space-y-6">
                <div className="bg-white rounded-lg p-6 shadow-md">
                  <h3 className="font-bold text-lg mb-2 text-foreground">
                    Comment fonctionne la commission de 5% ?
                  </h3>
                  <p className="text-muted-foreground">
                    La commission est prélevée uniquement lorsqu'un contrat de location est signé via la plateforme. 
                    Elle couvre tous nos services : vérification des locataires, contrat digital, paiements sécurisés et support.
                  </p>
                </div>

                <div className="bg-white rounded-lg p-6 shadow-md">
                  <h3 className="font-bold text-lg mb-2 text-foreground">
                    Pourquoi c'est gratuit pour les locataires ?
                  </h3>
                  <p className="text-muted-foreground">
                    La certification ANSUT (vérification d'identité biométrique + constitution du dossier digital) 
                    est 100% gratuite pour tous les locataires car financée par l'ANSUT dans le cadre du service universel. 
                    Mon Toit se rémunère uniquement via les commissions sur les baux signés par les propriétaires.
                  </p>
                </div>

                <div className="bg-white rounded-lg p-6 shadow-md">
                  <h3 className="font-bold text-lg mb-2 text-foreground">
                    Comment Mon Toit finance son fonctionnement ?
                  </h3>
                  <p className="text-muted-foreground">
                    Mon Toit opère selon un modèle freemium transparent : l'ANSUT finance l'infrastructure (CAPEX) 
                    et Mon Toit assure les opérations (OPEX) via des commissions sur les transactions, 
                    de la publicité ciblée et des services premium pour les agences. Les locataires ne paient jamais.
                  </p>
                </div>

                <div className="bg-white rounded-lg p-6 shadow-md">
                  <h3 className="font-bold text-lg mb-2 text-foreground">
                    Quels sont les tarifs pour les agences ?
                  </h3>
                  <p className="text-muted-foreground">
                    Nos tarifs agences sont personnalisés selon le nombre de propriétés gérées et les fonctionnalités souhaitées 
                    (API, branding, formations). Contactez-nous pour un devis sur mesure.
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="mt-20 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
                Prêt à commencer ?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Rejoignez des milliers d'utilisateurs qui font confiance à Mon Toit pour leurs démarches immobilières
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="px-8">
                  <Link to="/auth?type=tenant">Je suis locataire</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="px-8">
                  <Link to="/publier">Je suis propriétaire</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Tarifs;
