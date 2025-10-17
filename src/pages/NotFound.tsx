import { useLocation, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Home, Search, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { logger } from '@/services/logger';

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    logger.warn('404 Error: User accessed non-existent route', { 
      pathname: location.pathname,
      referrer: document.referrer 
    });
  }, [location.pathname]);

  // Auto-redirection après 10 secondes
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          navigate("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center bg-gradient-to-br from-background to-muted pt-16">
        <div className="container mx-auto px-4 py-10 text-center max-w-2xl">
          <div className="mb-8">
            <h1 className="text-9xl font-bold text-primary mb-4">404</h1>
            <h2 className="text-3xl font-semibold text-foreground mb-3">
              Oups ! Page introuvable
            </h2>
            <p className="text-lg text-muted-foreground mb-2">
              La page <span className="font-mono text-sm bg-muted px-2 py-1 rounded">{location.pathname}</span> n'existe pas.
            </p>
            <p className="text-sm text-muted-foreground">
              Redirection automatique dans <span className="font-bold text-primary">{countdown}s</span>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button asChild size="lg" className="gap-2">
              <Link to="/">
                <Home className="h-5 w-5" />
                Retour à l'accueil
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2">
              <Link to="/recherche">
                <Search className="h-5 w-5" />
                Rechercher un bien
              </Link>
            </Button>
            <Button 
              variant="ghost" 
              size="lg" 
              className="gap-2"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
              Page précédente
            </Button>
          </div>

          <div className="bg-muted/50 border border-border rounded-lg p-6">
            <h3 className="font-semibold text-foreground mb-3">Pages populaires :</h3>
            <div className="flex flex-wrap gap-2 justify-center">
              <Link to="/" className="text-sm text-primary hover:underline">Accueil</Link>
              <span className="text-muted-foreground">•</span>
              <Link to="/recherche" className="text-sm text-primary hover:underline">Recherche</Link>
              <span className="text-muted-foreground">•</span>
              <Link to="/certification" className="text-sm text-primary hover:underline">Certification</Link>
              <span className="text-muted-foreground">•</span>
              <Link to="/auth" className="text-sm text-primary hover:underline">Connexion</Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
