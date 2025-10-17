import { UserPlus, Building2, TrendingUp, Clock } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Link } from "react-router-dom";

const PreFooterCTA = () => {
  return (
    <section className="relative py-12 bg-gradient-to-b from-background to-muted/30 overflow-hidden">
      <div className="container mx-auto px-4 max-w-7xl relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-h2 mb-4">
            Prêt à <span className="text-primary">commencer</span> ?
          </h2>
          <p className="text-body-lg text-muted-foreground max-w-2xl mx-auto">
            Rejoignez des milliers d'Ivoiriens qui font confiance à Mon Toit
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Locataires Card */}
          <Card className="p-8 bg-gradient-to-br from-primary/5 via-background to-background border-2 border-primary/20 hover:border-primary/40 transition-all duration-300 hover:shadow-[0_0_30px_rgba(34,86,163,0.15)]">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 rounded-xl bg-primary/10">
                <UserPlus className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-bold">Locataires</h3>
                  <span className="px-2 py-0.5 text-xs font-semibold bg-success text-success-foreground rounded-full">
                    100% GRATUIT
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Créez votre dossier de location en 5 minutes
                </p>
              </div>
            </div>

            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Dossier vérifié par l'ANSUT
              </li>
              <li className="flex items-center gap-2 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Accès illimité aux annonces
              </li>
              <li className="flex items-center gap-2 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Messagerie sécurisée
              </li>
              <li className="flex items-center gap-2 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Signature électronique incluse
              </li>
            </ul>

            <Button asChild className="w-full" size="lg">
              <Link to="/auth?mode=signup">
                <UserPlus className="mr-2 h-5 w-5" />
                Créer mon dossier gratuit
              </Link>
            </Button>
          </Card>

          {/* Propriétaires/Agences Card */}
          <Card className="p-8 bg-gradient-to-br from-secondary/5 via-background to-background border-2 border-secondary/20 hover:border-secondary/40 transition-all duration-300 hover:shadow-[0_0_30px_rgba(240,130,36,0.15)]">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 rounded-xl bg-secondary/10">
                <Building2 className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">
                  Propriétaires & Agences
                </h3>
                <p className="text-sm text-muted-foreground">
                  Trouvez des locataires fiables rapidement
                </p>
              </div>
            </div>

            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-secondary" />
                Publication d'annonces illimitée
              </li>
              <li className="flex items-center gap-2 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-secondary" />
                Dossiers de locataires vérifiés
              </li>
              <li className="flex items-center gap-2 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-secondary" />
                Gestion des candidatures
              </li>
              <li className="flex items-center gap-2 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-secondary" />
                Commission uniquement à la signature
              </li>
            </ul>

            <Button asChild className="w-full bg-secondary hover:bg-secondary/90" size="lg">
              <Link to="/publier">
                <TrendingUp className="mr-2 h-5 w-5" />
                Publier une annonce
              </Link>
            </Button>
          </Card>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-4 rounded-lg bg-background/50 backdrop-blur-sm border border-border/50">
            <div className="text-2xl font-bold text-primary mb-1">15,000+</div>
            <div className="text-xs text-muted-foreground">Dossiers créés</div>
          </div>
          <div className="p-4 rounded-lg bg-background/50 backdrop-blur-sm border border-border/50">
            <div className="text-2xl font-bold text-primary mb-1">48h</div>
            <div className="text-xs text-muted-foreground">Vérification moyenne</div>
          </div>
          <div className="p-4 rounded-lg bg-background/50 backdrop-blur-sm border border-border/50">
            <div className="text-2xl font-bold text-primary mb-1">3,500+</div>
            <div className="text-xs text-muted-foreground">Propriétaires actifs</div>
          </div>
          <div className="p-4 rounded-lg bg-background/50 backdrop-blur-sm border border-border/50">
            <div className="text-2xl font-bold text-primary mb-1">98%</div>
            <div className="text-xs text-muted-foreground">Satisfaction</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PreFooterCTA;
