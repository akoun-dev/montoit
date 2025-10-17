import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MapPin, Home, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Hero optimisé pour mobile
 * - Plus compact (300px vs 600px)
 * - Recherche en 1 colonne
 * - Boutons plus gros (48px min)
 * - Statistiques en 2x2
 */
export const MobileHero = () => {
  const [city, setCity] = useState('all');
  const [propertyType, setPropertyType] = useState('all');
  const navigate = useNavigate();

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (city !== 'all') params.append('city', city);
    if (propertyType !== 'all') params.append('type', propertyType);
    
    const queryString = params.toString();
    navigate(`/explorer${queryString ? '?' + queryString : ''}`);
  };

  return (
    <section className="relative min-h-[400px] flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-secondary">
      {/* Pattern culturel subtil */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            rgba(255, 255, 255, 0.1) 10px,
            rgba(255, 255, 255, 0.1) 20px
          )`
        }}
      />

      {/* Contenu */}
      <div className="relative z-10 w-full px-4 py-8">
        <motion.div 
          className="flex flex-col gap-6 items-center text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-sm font-semibold shadow-lg">
            <Sparkles className="h-3 w-3" />
            N°1 en Côte d'Ivoire
          </div>

          {/* Titre */}
          <h1 className="text-3xl font-bold text-white leading-tight">
            Trouvez votre{' '}
            <span className="bg-gradient-to-r from-yellow-300 via-orange-400 to-yellow-300 bg-clip-text text-transparent">
              Toit Idéal
            </span>
          </h1>

          {/* Sous-titre */}
          <p className="text-sm text-white/90 max-w-sm">
            Location certifiée ANSUT • Baux sécurisés
          </p>

          {/* Recherche Rapide */}
          <div className="w-full max-w-md bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-4">
            <div className="flex flex-col gap-3">
              {/* Ville */}
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger className="h-12 border-2 focus:border-primary bg-white">
                  <MapPin className="h-4 w-4 mr-2 text-primary" />
                  <SelectValue placeholder="Ville" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-border z-50">
                  <SelectItem value="all">Toutes les villes</SelectItem>
                  <SelectItem value="Abidjan">Abidjan</SelectItem>
                  <SelectItem value="Cocody">Cocody</SelectItem>
                  <SelectItem value="Marcory">Marcory</SelectItem>
                  <SelectItem value="Yopougon">Yopougon</SelectItem>
                  <SelectItem value="Plateau">Plateau</SelectItem>
                </SelectContent>
              </Select>

              {/* Type */}
              <Select value={propertyType} onValueChange={setPropertyType}>
                <SelectTrigger className="h-12 border-2 focus:border-primary bg-white">
                  <Home className="h-4 w-4 mr-2 text-primary" />
                  <SelectValue placeholder="Type de bien" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-border z-50">
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="Appartement">Appartement</SelectItem>
                  <SelectItem value="Villa">Villa</SelectItem>
                  <SelectItem value="Studio">Studio</SelectItem>
                  <SelectItem value="Bureau">Bureau</SelectItem>
                </SelectContent>
              </Select>

              {/* Bouton Recherche */}
              <Button
                onClick={handleSearch}
                size="lg"
                className="h-12 text-base font-bold shadow-lg"
              >
                <Search className="h-5 w-5 mr-2" />
                Rechercher
              </Button>
            </div>
          </div>

          {/* Statistiques Compactes */}
          <div className="grid grid-cols-2 gap-3 w-full max-w-md text-white">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <div className="text-2xl font-bold">3500+</div>
              <div className="text-xs opacity-90">Biens</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <div className="text-2xl font-bold">10000+</div>
              <div className="text-xs opacity-90">Utilisateurs</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <div className="text-2xl font-bold">98%</div>
              <div className="text-xs opacity-90">Satisfaction</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <div className="text-2xl font-bold">24h</div>
              <div className="text-xs opacity-90">Support</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

