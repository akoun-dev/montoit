import { ShieldCheck, Users, FileSignature, TrendingUp, CheckCircle, X, Award, Shield, Zap, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { memo } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import monToitLogo from "@/assets/logo/mon-toit-logo.png";
import { LazyIllustration } from "@/components/illustrations/LazyIllustration";
import { getIllustrationPath } from "@/lib/utils";

// Configuration - ANSUT (organisme public porteur)
const ANSUT_FULL_NAME = "Agence Nationale du Service Universel des Télécommunications/TIC";
const ANSUT_SHORT_NAME = "ANSUT";
const ANSUT_MINISTRY = "Ministère de la Transition Numérique et de la Digitalisation";

// Configuration - Mon Toit (le produit/service)
const PRODUCT_NAME = "Mon Toit";
const PRODUCT_TAGLINE = "Dossier de location numérique certifié par l'État";

// Types
interface KPI {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface Feature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  microKpi: string;
  target: "locataire" | "proprietaire" | "agence" | "all";
  targetLabel: string;
  ctaText: string;
  ctaLink: string;
}

interface ComparisonItem {
  text: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Configuration des couleurs par cible
const TARGET_STYLES = {
  locataire: {
    border: "border-l-blue-600",
    iconBg: "bg-blue-600",
  },
  proprietaire: {
    border: "border-l-primary",
    iconBg: "bg-primary",
  },
  agence: {
    border: "border-l-secondary",
    iconBg: "bg-secondary",
  },
  all: {
    border: "border-l-secondary",
    iconBg: "bg-secondary",
  },
} as const;

// Data
const kpis: KPI[] = [
  {
    value: "15,000+",
    label: "Dossiers créés",
    icon: Users,
  },
  {
    value: "0 FCFA",
    label: "Gratuit pour locataires",
    icon: Award,
  },
  {
    value: "48h",
    label: "Vérification moyenne",
    icon: Zap,
  },
];

const features: Feature[] = [
  {
    icon: ShieldCheck,
    title: "Dossier de Location Certifié",
    description: "Créez votre dossier en ligne avec vérification biométrique et obtenez une certification d'État reconnue par tous les propriétaires",
    microKpi: "Certification en 48h",
    target: "locataire",
    targetLabel: "Pour les locataires",
    ctaText: "Créer mon dossier",
    ctaLink: "/certification",
  },
  {
    icon: Users,
    title: "Dossiers Pré-Vérifiés par l'État",
    description: "Recevez uniquement des candidatures avec dossiers complets vérifiés par le service public et score de fiabilité",
    microKpi: "Score de confiance 0-100",
    target: "proprietaire",
    targetLabel: "Pour les propriétaires",
    ctaText: "Publier une annonce",
    ctaLink: "/publier",
  },
  {
    icon: FileSignature,
    title: "Signature Électronique Sécurisée",
    description: "Bail numérique conforme à la loi ivoirienne avec signature électronique certifiée et paiements Mobile Money intégrés",
    microKpi: "Signature en 5 min",
    target: "all",
    targetLabel: "Pour tous",
    ctaText: "Voir l'exemple",
    ctaLink: "/legal",
  },
  {
    icon: TrendingUp,
    title: "Tableau de Bord Professionnel",
    description: "Gérez votre portefeuille immobilier, suivez les loyers en temps réel et générez des rapports automatisés",
    microKpi: "Rapports instantanés",
    target: "agence",
    targetLabel: "Pour les agences",
    ctaText: "Découvrir",
    ctaLink: "/admin",
  },
];

const withoutMonToit: ComparisonItem[] = [
  { text: "Dossiers papier incomplets", icon: X },
  { text: "Pas de vérification d'identité", icon: X },
  { text: "Espèces et chèques non sécurisés", icon: X },
  { text: "Litiges sans médiation", icon: X },
  { text: "Risque de fraude documentaire", icon: X },
];

const withMonToit: ComparisonItem[] = [
  { text: "Dossier numérique certifié par l'État", icon: CheckCircle },
  { text: "Vérification biométrique et KYC", icon: CheckCircle },
  { text: "Paiements Mobile Money tracés", icon: CheckCircle },
  { text: "Médiation par service public", icon: CheckCircle },
  { text: "Documents authentifiés par l'ANSUT", icon: CheckCircle },
];

// Sous-composants
const KPICard = memo(({ kpi, index }: { kpi: KPI; index: number }) => {
  const Icon = kpi.icon;
  return (
    <div
      className="bg-white rounded-lg border-l-4 border-l-primary shadow-md p-6 flex items-center gap-4 hover:shadow-lg transition-all duration-300"
      role="article"
      aria-label={`${kpi.label}: ${kpi.value}`}
    >
      <div className="bg-primary/10 p-3 rounded-full" aria-hidden="true">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <div>
        <p className="text-3xl font-bold text-foreground">{kpi.value}</p>
        <p className="text-sm text-muted-foreground">{kpi.label}</p>
      </div>
    </div>
  );
});
KPICard.displayName = "KPICard";

const FeatureCard = memo(({ feature, index }: { feature: Feature; index: number }) => {
  const Icon = feature.icon;
  const styles = TARGET_STYLES[feature.target];
  
  // Map illustrations to features
  const illustrationKeys = ['apartment-visit', 'real-estate-agent', 'key-handover', 'co-ownership-meeting'];
  const illustrationKey = illustrationKeys[index] as any;

  return (
    <article
      style={{ animationDelay: `${index * 100}ms` }}
      className={`bg-white rounded-lg border-l-4 ${styles.border} shadow-md hover:shadow-2xl hover:scale-[1.02] hover:border-l-primary transition-all duration-300 p-8 flex flex-col animate-fade-in relative overflow-hidden group`}
    >
      {/* Illustration background on hover */}
      <div className="absolute top-0 left-0 right-0 h-32 overflow-hidden rounded-t-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <LazyIllustration 
          src={getIllustrationPath(illustrationKey)!}
          alt={feature.title}
          className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-transform duration-500"
          animate={false}
        />
      </div>
      
      <div className="relative z-10 group-hover:pt-8 transition-all duration-300">
        <Badge variant="secondary" className="mb-4 self-start text-xs">
          {feature.targetLabel}
        </Badge>
        
        <div className={`${styles.iconBg} p-3 rounded-full w-fit mb-4 group-hover:scale-110 transition-transform duration-300`} aria-hidden="true">
          <Icon className="h-8 w-8 text-white" />
        </div>
        
        <h3 className="text-xl font-bold mb-3 text-foreground">{feature.title}</h3>
        
        <div className="mb-4">
          <Badge variant="outline" className="text-xs text-primary border-primary/30 bg-primary/5">
            ⚡ {feature.microKpi}
          </Badge>
        </div>
        
        <p className="text-muted-foreground mb-6 flex-1 leading-relaxed">{feature.description}</p>
        
        <div className="space-y-3">
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link to={feature.ctaLink}>{feature.ctaText}</Link>
          </Button>
          
          <div className="flex items-center gap-2 justify-center">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            <span className="text-xs text-primary font-semibold">Service public</span>
          </div>
        </div>
      </div>
    </article>
  );
});
FeatureCard.displayName = "FeatureCard";

const ComparisonList = memo(({ items, positive = false }: { items: ComparisonItem[]; positive?: boolean }) => (
  <ul className="space-y-4" role="list">
    {items.map((item, index) => {
      const Icon = item.icon;
      const iconColor = positive ? "text-green-600" : "text-destructive";
      const textStyle = positive ? "text-foreground font-medium" : "text-muted-foreground";
      
      return (
        <li key={index} className="flex items-start gap-3">
          <Icon className={`h-5 w-5 ${iconColor} mt-0.5 flex-shrink-0`} aria-hidden="true" />
          <span className={textStyle}>{item.text}</span>
        </li>
      );
    })}
  </ul>
));
ComparisonList.displayName = "ComparisonList";

// Composant principal
const Features = () => {
  return (
    <section 
      className="py-12 md:py-18 bg-gradient-to-b from-muted/30 to-background relative overflow-hidden"
      aria-labelledby="features-heading"
    >
      <div className="container mx-auto px-4 max-w-7xl relative z-10">
        {/* Header - Mon Toit en avant */}
        <header className="text-center mb-16">
          <div className="flex flex-col items-center justify-center gap-3 mb-6">
            {/* Logo Mon Toit - PRINCIPAL */}
            <img 
              src={monToitLogo} 
              alt="Mon Toit - Dossier de location numérique certifié" 
              className="h-14 md:h-16" 
            />
            
            {/* Badges service public */}
            <div className="flex flex-wrap gap-2 justify-center">
              <Badge variant="default" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 text-sm font-semibold">
                🇨🇮 Service Public
              </Badge>
              <Badge variant="outline" className="border-primary text-primary px-4 py-1.5 text-sm font-semibold">
                Gratuit pour locataires
              </Badge>
            </div>
          </div>
          
          <h2 
            id="features-heading" 
            className="text-4xl md:text-5xl font-bold mb-4 text-foreground tracking-tight"
          >
            Le dossier de location numérique certifié
          </h2>
          
          <p className="text-muted-foreground text-xl max-w-2xl mx-auto mb-3 leading-relaxed">
            Créez votre dossier en ligne, obtenez une certification d'État et trouvez votre logement en toute confiance
          </p>
          
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm text-primary font-semibold">
              Un service de l'ANSUT
            </p>
            <p className="text-xs text-muted-foreground max-w-md">
              Inspiré de DossierFacile (France) • Adapté au contexte ivoirien
            </p>
          </div>
        </header>

        {/* KPIs du service */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-16" role="region" aria-label="Indicateurs du service">
          {kpis.map((kpi, index) => (
            <KPICard key={index} kpi={kpi} index={index} />
          ))}
        </div>

        {/* Features Cards enrichies */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} />
          ))}
        </div>

        {/* Section comparative */}
        <div className="max-w-5xl mx-auto mb-16">
          <h3 className="text-3xl font-bold text-center mb-10 text-foreground">
            Pourquoi choisir {PRODUCT_NAME} ?
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Sans Mon Toit */}
            <div className="bg-gray-100 rounded-lg p-8 shadow-sm">
              <h4 className="text-xl font-bold mb-6 text-foreground flex items-center gap-2">
                <X className="h-6 w-6 text-destructive" aria-hidden="true" />
                Location traditionnelle
              </h4>
              <ComparisonList items={withoutMonToit} />
            </div>

            {/* Avec Mon Toit */}
            <div className="bg-white rounded-lg p-8 shadow-lg border-2 border-primary/20 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <CheckCircle className="h-6 w-6 text-green-600" aria-hidden="true" />
                    Avec {PRODUCT_NAME}
                  </h4>
                  <Badge className="bg-blue-600 text-white border-0">
                    <Shield className="h-3 w-3 mr-1" aria-hidden="true" />
                    Service Public
                  </Badge>
                </div>
                <ComparisonList items={withMonToit} positive />
              </div>
            </div>
          </div>
        </div>

        {/* Section Transparence - Service Public */}
        <div className="max-w-4xl mx-auto mb-16 bg-blue-50 border border-blue-200 rounded-xl p-8">
          <div className="flex items-start gap-4">
            <Shield className="h-8 w-8 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-xl font-bold mb-3 text-foreground">
                Un vrai service public
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Gratuit pour tous les locataires</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Aucune revente de données</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Hébergement en Côte d'Ivoire</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Conformité RGPD et loi ivoirienne</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section Tarification Transparente */}
        <div className="max-w-5xl mx-auto mb-16">
          <h3 className="text-3xl font-bold text-center mb-10 text-foreground">
            Tarification transparente
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Locataires - Gratuit */}
            <div className="relative bg-gradient-to-br from-blue-50 to-white rounded-lg p-8 shadow-md border-2 border-blue-200 md:scale-105">
              {/* Badge Recommandé */}
              <div className="absolute -top-3 -right-3">
                <Badge className="bg-secondary text-white border-0 px-3 py-1 text-xs font-bold">
                  ⭐ RECOMMANDÉ
                </Badge>
              </div>

              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 p-3 rounded-full">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="text-2xl font-bold text-foreground">Locataires</h4>
                </div>
                <Badge className="bg-green-600 text-white border-0 text-lg px-4 py-1">
                  0 FCFA
                </Badge>
              </div>
              
              <p className="text-muted-foreground mb-6">
                Toutes les fonctionnalités pour trouver votre logement
              </p>
              
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">Création de dossier gratuite</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">Vérification ANSUT gratuite</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">Candidatures illimitées</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">Support client gratuit</span>
                </li>
              </ul>

              {/* CTA Locataire */}
              <Button asChild className="w-full bg-secondary hover:bg-secondary/90 text-white font-bold mb-4">
                <Link to="/verification">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Créer mon dossier gratuit
                </Link>
              </Button>
              
              <div className="pt-4 border-t border-blue-200">
                <p className="text-xs text-muted-foreground">
                  💡 Financé par l'ANSUT dans le cadre du service universel
                </p>
              </div>
            </div>

            {/* Propriétaires/Agences - Commission */}
            <div className="bg-white rounded-lg p-8 shadow-lg border-2 border-primary/20">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-primary p-3 rounded-full">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="text-2xl font-bold text-foreground">Propriétaires</h4>
                </div>
                <Badge variant="outline" className="border-primary text-primary text-lg px-4 py-1 font-bold">
                  5%
                </Badge>
              </div>
              
              <p className="text-muted-foreground mb-6">
                Commission uniquement sur signature de bail réussie
              </p>
              
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">Publication illimitée de biens</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">Dossiers pré-vérifiés par l'État</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">Signature électronique + Mobile Money</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">Médiation en cas de litige</span>
                </li>
              </ul>
              
              <div className="pt-4 border-t border-muted">
                <p className="text-xs text-muted-foreground mb-2">
                  💰 Commission prélevée uniquement à la signature du bail
                </p>
                <p className="text-xs text-muted-foreground">
                  📊 Agences : tarifs dégressifs sur devis
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <Button asChild variant="outline" size="lg">
              <Link to="/tarifs">Voir tous les détails tarifaires</Link>
            </Button>
          </div>
        </div>

        {/* CTA final */}
        <div className="text-center mt-16 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl p-10 border border-primary/10">
          <h3 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
            Créez votre dossier de location en ligne
          </h3>
          
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Création de dossier gratuite pour les locataires. Propriétaires : commission uniquement sur signature de bail réussie.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6 max-w-md mx-auto">
            <Button asChild size="lg" className="flex-1">
              <Link to="/verification">Créer mon dossier</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="flex-1">
              <Link to="/certification">Comment ça marche ?</Link>
            </Button>
          </div>
          
          <div className="space-y-2 pt-4 border-t border-muted">
            <p className="text-sm text-muted-foreground">
              Un service de l'<span className="font-semibold">{ANSUT_SHORT_NAME}</span> • Conforme à la loi ivoirienne 2013-450
            </p>
            <p className="text-xs text-muted-foreground">
              {ANSUT_FULL_NAME} • Sous tutelle du {ANSUT_MINISTRY}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
