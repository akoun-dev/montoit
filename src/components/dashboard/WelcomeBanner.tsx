import { useAuth } from "@/hooks/useAuth";
import { LazyIllustration } from "@/components/illustrations/LazyIllustration";
import { getIllustrationPath } from "@/lib/utils";
import { type IllustrationKey } from "@/assets/illustrations/ivorian/illustrationPaths";

export const WelcomeBanner = () => {
  const { profile } = useAuth();

  if (!profile) return null;

  const roleConfig: Record<string, { illustration: IllustrationKey; message: string }> = {
    locataire: {
      illustration: "apartment-visit",
      message: "Trouvez votre logement idéal en Côte d'Ivoire"
    },
    proprietaire: {
      illustration: "ivorian-family-house",
      message: "Gérez vos biens en toute simplicité"
    },
    agence: {
      illustration: "real-estate-agent",
      message: "Développez votre activité immobilière"
    }
  };

  const config = roleConfig[profile.user_type || "locataire"];
  const illustrationPath = getIllustrationPath(config.illustration);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/5 to-background border border-border/50 shadow-sm">
      <div className="grid md:grid-cols-[1fr,300px] gap-6 p-6 md:p-8">
        <div className="space-y-3">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Bienvenue, {profile.full_name?.split(' ')[0]} 👋
          </h1>
          <p className="text-lg text-muted-foreground">
            {config.message}
          </p>
        </div>
        
        <LazyIllustration
          src={illustrationPath}
          alt="Illustration dashboard"
          className="hidden md:block w-full h-[200px] rounded-xl"
          animate={true}
        />
      </div>
    </div>
  );
};
