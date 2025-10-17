import { Shield, Lock, Award, Globe } from "lucide-react";

const TrustBar = () => {
  const trustItems = [
    {
      icon: Globe,
      text: "Service public"
    },
    {
      icon: Lock,
      text: "Données sécurisées"
    },
    {
      icon: Award,
      text: "100% ivoirien"
    },
    {
      icon: Shield,
      text: "Certifié ANSUT"
    }
  ];

  return (
    <div className="bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 border-y border-border/50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12">
          {trustItems.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <item.icon className="h-4 w-4 text-primary" />
              <span className="text-xs md:text-sm font-medium text-foreground/80">
                {item.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TrustBar;
