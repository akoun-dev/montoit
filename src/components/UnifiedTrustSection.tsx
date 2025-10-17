import { Users, Zap, Building2, TrendingUp, ShieldCheck, FileSignature, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Données des métriques (4 principales)
const trustMetrics = [
  { icon: Users, value: "15,000+", label: "dossiers créés", bgColor: "bg-primary" },
  { icon: Zap, value: "48h", label: "vérification moyenne", bgColor: "bg-secondary" },
  { icon: Building2, value: "3,500+", label: "logements vérifiés", bgColor: "bg-warning" },
  { icon: TrendingUp, value: "98%", label: "satisfaction", bgColor: "bg-primary" },
];

// Données des features (3 principales)
const coreFeatures = [
  {
    icon: ShieldCheck,
    title: "Dossier Certifié",
    description: "Vérification ANSUT en 48h avec certification d'État reconnue par tous les propriétaires",
    bgColor: "bg-blue-600"
  },
  {
    icon: Users,
    title: "Candidats Vérifiés",
    description: "Dossiers complets pré-vérifiés par l'État avec score de fiabilité de 0 à 100",
    bgColor: "bg-primary"
  },
  {
    icon: FileSignature,
    title: "Signature Numérique",
    description: "Bail électronique conforme à la loi ivoirienne avec paiements Mobile Money intégrés",
    bgColor: "bg-secondary"
  },
];

// Données des témoignages (2 meilleurs)
const featuredTestimonials = [
  {
    name: "Aminata K.",
    profession: "Comptable",
    photo: "https://ui-avatars.com/api/?name=Aminata+Kone&size=100&background=E67E22&color=fff",
    quote: "J'ai trouvé mon appartement à Cocody en seulement 2 jours. Tout était vérifié !",
    rating: 5
  },
  {
    name: "Konan M.",
    profession: "Ingénieur",
    photo: "https://ui-avatars.com/api/?name=Konan+Mensah&size=100&background=2C5F7F&color=fff",
    quote: "La certification ANSUT m'a vraiment rassuré. Fini les arnaques !",
    rating: 5
  },
];

const UnifiedTrustSection = () => {
  return (
    <section className="py-16 bg-gray-50" aria-labelledby="unified-trust-section">
      <div className="container mx-auto px-4 max-w-7xl">
        <h2 id="unified-trust-section" className="sr-only">
          Confiance, fonctionnalités et témoignages
        </h2>

        {/* 1. Métriques */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold text-foreground mb-2">
              Votre confiance, notre priorité
            </h3>
            <div className="h-1 w-20 bg-gradient-to-r from-primary to-secondary rounded-full mx-auto" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {trustMetrics.map((metric, index) => {
              const Icon = metric.icon;
              return (
                <div
                  key={index}
                  className="flex flex-col items-center gap-3 p-4 bg-white rounded-2xl border border-primary/10 shadow-sm hover:shadow-lg transition-all duration-300 animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={`p-3 rounded-full ${metric.bgColor} shadow-lg`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-center">
                    <div className="text-2xl md:text-3xl font-black text-foreground mb-1">
                      {metric.value}
                    </div>
                    <div className="text-sm font-medium text-muted-foreground">{metric.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Features */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold text-foreground mb-2">
              Pourquoi choisir Mon Toit
            </h3>
            <p className="text-lg text-muted-foreground">
              Un service public au service de votre tranquillité
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {coreFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className="p-6 bg-white shadow-md hover:shadow-xl hover:scale-[1.02] transition-all duration-300 flex flex-col h-full"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className={`${feature.bgColor} p-4 rounded-full mb-4`}>
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <Badge variant="secondary" className="mb-3 text-xs">
                      Service Public
                    </Badge>
                    <h4 className="text-xl font-bold text-foreground mb-3">
                      {feature.title}
                    </h4>
                    <p className="text-muted-foreground leading-relaxed flex-1">
                      {feature.description}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* 3. Témoignages */}
        <div>
          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold text-foreground mb-2">
              Ils nous font confiance
            </h3>
            <p className="text-lg text-muted-foreground">
              Rejoignez des milliers d'Ivoiriens satisfaits
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {featuredTestimonials.map((testimonial, index) => (
              <Card
                key={index}
                className="p-6 bg-white shadow-md hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-start gap-4 mb-4">
                  <img
                    src={testimonial.photo}
                    alt={`Photo de ${testimonial.name}`}
                    className="w-16 h-16 rounded-full flex-shrink-0"
                    loading="lazy"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-bold text-foreground">{testimonial.name}</p>
                        <p className="text-sm text-muted-foreground">{testimonial.profession}</p>
                      </div>
                      <div className="flex gap-0.5">
                        {Array.from({ length: testimonial.rating }).map((_, i) => (
                          <Star
                            key={i}
                            className="h-4 w-4 text-yellow-400 fill-yellow-400"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-muted-foreground italic">
                  "{testimonial.quote}"
                </p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default UnifiedTrustSection;
