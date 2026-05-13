import HeroPremium from '../../features/property/components/HeroPremium';
import FeaturedPropertiesSection from '../../features/property/components/FeaturedPropertiesSection';
import HomeMapSection from '../../features/property/components/HomeMapSection';
import HowItWorksCompact from '../../features/property/components/HowItWorksCompact';
import Testimonials from '../../features/property/components/Testimonials';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero premium avec barre de recherche intégrée */}
      <HeroPremium />

      {/* Propriétés en vedette - chargées dynamiquement (padding connecté via couleur) */}
      <FeaturedPropertiesSection />

      {/* Carte interactive avec biens disponibles */}
      <HomeMapSection />

      {/* Section Comment ça marche (transition fluide via gradient) - Cachée sur mobile */}
      <div className="hidden sm:block">
        <HowItWorksCompact />
      </div>

      {/* Témoignages (fond neutre pour conclure) - Cachés sur mobile */}
      <div className="hidden sm:block">
        <Testimonials />
      </div>
    </div>
  );
}
