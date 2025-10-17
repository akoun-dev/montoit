import React from 'react';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, PlusCircle, Users, ShieldCheck, FileSignature, MapPin, Home, DollarSign } from 'lucide-react';
import { RippleButton } from '@/components/animations/RippleButton';
import { CountUp } from '@/components/animations/CountUp';

export const CompactSearchHero = () => {
  console.log('[CompactSearchHero] Rendering');
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
    <section className="bg-gradient-to-r from-primary/5 via-background to-secondary/5 border-b border-border">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex flex-col gap-4 items-center justify-center">
          {/* Advanced Search Inputs */}
          <div className="flex-1 w-full">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Ville */}
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger className="h-12 w-full md:w-48 border-2 focus:border-primary">
                  <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Ville" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border z-50">
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
                <SelectTrigger className="h-12 w-full md:w-48 border-2 focus:border-primary">
                  <Home className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Type de bien" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border z-50">
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="Appartement">Appartement</SelectItem>
                  <SelectItem value="Villa">Villa</SelectItem>
                  <SelectItem value="Studio">Studio</SelectItem>
                  <SelectItem value="Bureau">Bureau</SelectItem>
                  <SelectItem value="Magasin">Magasin</SelectItem>
                </SelectContent>
              </Select>

              {/* Budget max */}
              <div className="relative flex-1">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Budget max (FCFA)"
                  value={budget}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setBudget(value);
                  }}
                  className="pl-9 h-12 border-2 focus:border-primary"
                  aria-label="Budget maximum"
                />
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-3 w-full md:w-auto">
            <RippleButton
              onClick={handleSearch}
              size="lg"
              className="flex-1 md:flex-none h-12 font-semibold shadow-md"
            >
              <Search className="h-4 w-4 mr-2" />
              Rechercher
            </RippleButton>
            <Button
              variant="secondary"
              size="lg"
              asChild
              className="flex-1 md:flex-none h-12 font-semibold shadow-md"
            >
              <a href="/publier">
                <PlusCircle className="h-4 w-4 mr-2" />
                Publier
              </a>
            </Button>
          </div>

          {/* Trust Signals */}
          <div className="w-full mt-6 pt-6 border-t border-border/50">
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-xs md:text-sm">
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-yellow-500 text-lg">⭐</span>
                  ))}
                </div>
                <span className="font-semibold text-foreground">4.8/5</span>
              </div>
              
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4 text-primary" />
                <span><strong className="text-foreground"><CountUp value={10000} suffix="+" /></strong> Ivoiriens</span>
              </div>
              
              <div className="flex items-center gap-2 text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span><strong className="text-foreground">100%</strong> Gratuit</span>
              </div>
              
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileSignature className="h-4 w-4 text-secondary" />
                <span>Certifié ANSUT</span>
              </div>
            </div>
            
            {/* Subtle link to About page */}
            <p className="text-center text-xs text-muted-foreground mt-3">
              <Link to="/a-propos" className="underline hover:text-primary transition-colors">
                Pourquoi nous faire confiance ?
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
