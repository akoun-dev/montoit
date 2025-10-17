import { Users, Building2, Zap, TrendingUp, Star } from "lucide-react";

const stats = [
  {
    icon: Users,
    value: "15,000+",
    label: "dossiers créés",
  },
  {
    icon: Zap,
    value: "48h",
    label: "vérification moyenne",
  },
  {
    icon: Building2,
    value: "3,500+",
    label: "logements vérifiés",
  },
  {
    icon: TrendingUp,
    value: "98%",
    label: "satisfaction",
  },
  {
    icon: Star,
    value: "4.8/5",
    label: "basé sur 1 234 avis vérifiés",
  },
];

const KeyStats = () => {
  return (
    <div className="bg-gradient-to-br from-primary/5 via-white to-secondary/5">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-8 animate-fade-in">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Votre confiance, notre priorité
          </h2>
          <div className="h-1 w-20 bg-gradient-to-r from-primary to-secondary rounded-full mx-auto" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 md:gap-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            const iconBgColor =
              index === 0 ? "bg-primary" :
              index === 1 ? "bg-secondary" :
              index === 2 ? "bg-primary" :
              index === 3 ? "bg-warning" :
              "bg-secondary";
            
            return (
              <div 
                key={index} 
                className="flex flex-col items-center gap-3 p-4 bg-white rounded-2xl border border-primary/10 shadow-sm hover:shadow-lg transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`p-3 rounded-full ${iconBgColor} shadow-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-black text-foreground mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm font-medium text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default KeyStats;
