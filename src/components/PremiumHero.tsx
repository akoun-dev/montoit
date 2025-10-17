import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, PlusCircle, Users, ShieldCheck, FileSignature, MapPin, Home, DollarSign, Sparkles } from 'lucide-react';
import { RippleButton } from '@/components/animations/RippleButton';
import { CountUp } from '@/components/animations/CountUp';
import { motion } from 'framer-motion';
import { GradientButton } from '@/components/ui/gradient-button';
import { GradientText } from '@/components/ui/gradient-text';

export const PremiumHero = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [city, setCity] = useState('all');
  const [propertyType, setPropertyType] = useState('all');
  const [budget, setBudget] = useState('');
  const navigate = useNavigate();

  const handleSearch = () => {
    const params = new URLSearchParams();
    
    if (searchQuery.trim()) params.append('q', searchQuery.trim());
    if (city !== 'all') params.append('city', city);
    if (propertyType !== 'all') params.append('type', propertyType);
    if (budget) params.append('budget', budget);
    
    const queryString = params.toString();
    navigate(`/explorer${queryString ? '?' + queryString : ''}`);
  };

  return (
    <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden">
      {/* Image de fond avec overlay */}
      <div className="absolute inset-0 z-0">
        {/* Image d'Abidjan (Unsplash placeholder) */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920&q=80')`,
          }}
        />
        
        {/* Overlay gradient pour lisibilité */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/70 to-secondary/80" />
        
        {/* Pattern culturel Kente en overlay subtil */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 10px,
              rgba(255, 255, 255, 0.1) 10px,
              rgba(255, 255, 255, 0.1) 20px
            ),
            repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 10px,
              rgba(255, 255, 255, 0.05) 10px,
              rgba(255, 255, 255, 0.05) 20px
            )`
          }}
        />
      </div>

      {/* Contenu */}
      <div className="relative z-10 container mx-auto px-4 py-16 max-w-5xl">
        <motion.div 
          className="flex flex-col gap-8 items-center justify-center text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Badge Premium */}
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-semibold shadow-lg"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Sparkles className="h-4 w-4" />
            Plateforme N°1 en Côte d'Ivoire
          </motion.div>

          {/* Titre Principal avec Gradient */}
          <motion.h1 
            className="text-5xl md:text-7xl font-bold text-white leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            Trouvez votre{' '}
            <GradientText variant="primary" className="text-5xl md:text-7xl font-bold">
              Toit Idéal
            </GradientText>
          </motion.h1>

          {/* Sous-titre */}
          <motion.p 
            className="text-xl md:text-2xl text-white/90 max-w-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            Location immobilière certifiée ANSUT • Baux sécurisés • Paiement en ligne
          </motion.p>

          {/* Formulaire de Recherche */}
          <motion.div 
            className="w-full max-w-4xl bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 md:p-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <div className="flex flex-col gap-4">
              {/* Ligne de filtres */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Ville */}
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger className="h-14 border-2 focus:border-primary bg-white">
                    <MapPin className="h-5 w-5 mr-2 text-primary" />
                    <SelectValue placeholder="Ville" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-border z-50">
                    <SelectItem value="all">Toutes les villes</SelectItem>
                    <SelectItem value="Abidjan">Abidjan</SelectItem>
                    <SelectItem value="Yopougon">Yopougon</SelectItem>
                    <SelectItem value="Cocody">Cocody</SelectItem>
                    <SelectItem value="Marcory">Marcory</SelectItem>
                    <SelectItem value="Koumassi">Koumassi</SelectItem>
                    <SelectItem value="Plateau">Plateau</SelectItem>
                  </SelectContent>
                </Select>

                {/* Type de bien */}
                <Select value={propertyType} onValueChange={setPropertyType}>
                  <SelectTrigger className="h-14 border-2 focus:border-primary bg-white">
                    <Home className="h-5 w-5 mr-2 text-primary" />
                    <SelectValue placeholder="Type de bien" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-border z-50">
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="Appartement">Appartement</SelectItem>
                    <SelectItem value="Villa">Villa</SelectItem>
                    <SelectItem value="Studio">Studio</SelectItem>
                    <SelectItem value="Bureau">Bureau</SelectItem>
                    <SelectItem value="Magasin">Magasin</SelectItem>
                  </SelectContent>
                </Select>

                {/* Budget */}
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Budget max (FCFA)"
                    value={budget}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setBudget(value);
                    }}
                    className="pl-12 h-14 border-2 focus:border-primary bg-white"
                  />
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex gap-3">
                <RippleButton
                  onClick={handleSearch}
                  size="lg"
                  className="flex-1 h-14 text-lg font-bold shadow-lg hover:shadow-xl transition-shadow"
                >
                  <Search className="h-5 w-5 mr-2" />
                  Rechercher
                </RippleButton>
                <GradientButton
                  variant="secondary"
                  size="lg"
                  onClick={() => navigate('/publier')}
                  className="h-14 px-6 font-bold shadow-lg hover:shadow-xl"
                >
                  <PlusCircle className="h-5 w-5 mr-2" />
                  Publier
                </GradientButton>
              </div>
            </div>
          </motion.div>

          {/* Trust Signals */}
          <motion.div 
            className="w-full max-w-4xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.6 }}
          >
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 text-white">
              {/* Étoiles */}
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-yellow-300 text-xl">⭐</span>
                  ))}
                </div>
                <span className="font-bold text-lg">4.8/5</span>
              </div>
              
              {/* Utilisateurs */}
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <span className="text-lg">
                  <strong className="font-bold"><CountUp value={10000} suffix="+" /></strong> Ivoiriens
                </span>
              </div>
              
              {/* Gratuit */}
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-lg"><strong className="font-bold">100%</strong> Gratuit</span>
              </div>
              
              {/* ANSUT */}
              <div className="flex items-center gap-2">
                <FileSignature className="h-5 w-5 text-yellow-300" />
                <span className="text-lg font-semibold">Certifié ANSUT</span>
              </div>
            </div>
            
            {/* Lien vers À propos */}
            <p className="text-center text-white/80 mt-4 text-sm">
              <Link to="/a-propos" className="underline hover:text-yellow-300 transition-colors">
                Pourquoi nous faire confiance ?
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* Vague décorative en bas */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
          <path 
            d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,58.7C960,64,1056,64,1152,58.7C1248,53,1344,43,1392,37.3L1440,32L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z" 
            fill="currentColor"
            className="text-background"
          />
        </svg>
      </div>
    </section>
  );
};

