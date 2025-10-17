import { useState, useEffect } from "react";
import { Home, Building, Building2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

const OnboardingModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("onboarding_seen");
    if (!hasSeenOnboarding) {
      // Délai de 1 seconde pour laisser la page se charger
      setTimeout(() => {
        setIsOpen(true);
      }, 1000);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem("onboarding_seen", "true");
    setIsOpen(false);
  };

  const handleChoice = () => {
    localStorage.setItem("onboarding_seen", "true");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-full h-full md:h-auto md:max-w-5xl md:w-auto mx-auto">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>

        <DialogHeader>
          <DialogTitle className="text-3xl md:text-4xl font-bold text-center">
            Bienvenue sur Mon Toit ! 👋
          </DialogTitle>
          <DialogDescription className="text-lg text-center mt-2">
            Que souhaitez-vous faire aujourd'hui ?
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {/* Carte 1 - Locataire */}
          <Link to="/explorer" onClick={handleChoice} className="group">
            <Card className="p-6 text-center hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer border-2 hover:border-blue-600">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                  <Home className="h-8 w-8 text-blue-600 group-hover:text-white transition-colors" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">Je cherche un logement</h3>
              <p className="text-muted-foreground">Trouvez votre logement idéal en 48h</p>
            </Card>
          </Link>

          {/* Carte 2 - Propriétaire */}
          <Link to="/publier" onClick={handleChoice} className="group">
            <Card className="p-6 text-center hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer border-2 hover:border-primary">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary transition-colors">
                  <Building className="h-8 w-8 text-primary group-hover:text-white transition-colors" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">Je suis propriétaire</h3>
              <p className="text-muted-foreground">Publiez votre bien gratuitement</p>
            </Card>
          </Link>

          {/* Carte 3 - Agence */}
          <Link to="/agence" onClick={handleChoice} className="group">
            <Card className="p-6 text-center hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer border-2 hover:border-secondary">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center group-hover:bg-secondary transition-colors">
                  <Building2 className="h-8 w-8 text-secondary group-hover:text-white transition-colors" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">Je suis une agence</h3>
              <p className="text-muted-foreground">Gérez vos biens avec notre CRM</p>
            </Card>
          </Link>
        </div>

        <div className="border-t pt-4 mt-6">
          <Button
            variant="ghost"
            className="w-full"
            onClick={handleClose}
          >
            Explorer sans compte
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingModal;
