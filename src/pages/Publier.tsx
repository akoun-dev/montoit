import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

const Publier = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Non connecté → redirection vers auth avec returnUrl et type propriétaire
        navigate("/auth?type=proprietaire&returnUrl=/ajouter-bien");
      } else if (profile?.user_type === 'locataire') {
        // Locataire → pas autorisé
        navigate("/dashboard");
      } else {
        // Propriétaire/Agence → accès direct
        navigate("/ajouter-bien");
      }
    }
  }, [user, profile, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
};

export default Publier;
