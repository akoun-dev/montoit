import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Home, Key, Building2, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";

const UnifiedRoleSelection = () => {
  const roles = [
    {
      type: "locataire",
      icon: Home,
      title: "Locataire",
      description: "Créez votre dossier de location en 5 minutes",
      benefits: [
        "Dossier vérifié par l'ANSUT",
        "Accès illimité aux annonces",
        "Messagerie sécurisée",
        "Signature électronique incluse"
      ],
      badge: "100% GRATUIT",
      ctaText: "Créer mon dossier gratuit",
      ctaLink: "/auth?mode=signup",
      color: "from-primary/20 to-primary/5",
      iconColor: "text-primary",
      hoverColor: "hover:border-primary/50",
      bgGradient: "from-primary/10 via-primary/5 to-transparent",
      bulletColor: "bg-primary",
    },
    {
      type: "proprietaire",
      icon: Key,
      title: "Propriétaire",
      description: "Gérez et louez votre bien facilement",
      benefits: [
        "Publication d'annonces illimitée",
        "Dossiers de locataires vérifiés",
        "Gestion des candidatures",
        "Commission uniquement à la signature"
      ],
      ctaText: "Publier une annonce",
      ctaLink: "/publier",
      color: "from-secondary/20 to-secondary/5",
      iconColor: "text-secondary",
      hoverColor: "hover:border-secondary/50",
      bgGradient: "from-secondary/10 via-secondary/5 to-transparent",
      bulletColor: "bg-secondary",
    },
    {
      type: "agence",
      icon: Building2,
      title: "Agence Immobilière",
      description: "Solution complète pour professionnels",
      benefits: [
        "Dashboard avancé",
        "Multi-propriétés",
        "Reporting détaillé",
        "Outils de gestion pro"
      ],
      ctaText: "Accéder au dashboard pro",
      ctaLink: "/auth?type=agence",
      color: "from-accent/20 to-accent/5",
      iconColor: "text-accent-foreground",
      hoverColor: "hover:border-accent/50",
      bgGradient: "from-accent/10 via-accent/5 to-transparent",
      bulletColor: "bg-accent",
    },
  ];

  return (
    <section className="py-10 bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8 space-y-3">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Prêt à vous lancer ?
          </h2>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
            Choisissez votre profil et commencez votre parcours immobilier
          </p>
        </div>
        
        {/* Role Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-8">
          {roles.map((role, index) => {
            const Icon = role.icon;
            return (
              <div
                key={role.type}
                className="group focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 rounded-xl animate-fade-in"
                style={{ 
                  animationDelay: `${index * 150}ms`,
                }}
              >
                <Card className={`h-full transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 border-2 ${role.hoverColor} relative overflow-hidden`}>
                  {/* Animated background gradient on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${role.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  
                  <CardContent className="p-6 relative z-10">
                    {/* Icon with animation */}
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${role.color} flex items-center justify-center mb-5 mx-auto group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg`}>
                      <Icon className={`h-8 w-8 ${role.iconColor} group-hover:scale-110 transition-transform duration-300`} />
                    </div>
                    
                    {/* Title with badge */}
                    <div className="space-y-3 text-center mb-5">
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <h3 className="text-xl font-bold tracking-tight">
                          {role.title}
                        </h3>
                        {role.badge && (
                          <span className="px-2 py-0.5 text-xs font-semibold bg-success text-success-foreground rounded-full">
                            {role.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground font-medium">
                        {role.description}
                      </p>
                    </div>

                    {/* Benefits list */}
                    <ul className="space-y-2 mb-5 text-left">
                      {role.benefits.map((benefit, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <div className={`h-1.5 w-1.5 rounded-full ${role.bulletColor}`} />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                    
                    {/* CTA Button */}
                    <Button asChild className="w-full" size="lg">
                      <Link to={role.ctaLink}>
                        {role.ctaText}
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Help Section */}
        <div className="text-center mt-8 animate-fade-in" style={{ animationDelay: '600ms' }}>
          <p className="text-sm text-muted-foreground">
            Vous ne savez pas quel profil choisir ?{" "}
            <Link 
              to="/a-propos" 
              className="text-primary font-medium hover:underline transition-all"
            >
              Consultez notre guide
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
};

export default UnifiedRoleSelection;
