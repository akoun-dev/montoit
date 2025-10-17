import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useRecommendations } from '@/hooks/useRecommendations';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/services/logger';

interface PreferencesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PreferencesModal = ({ open, onOpenChange }: PreferencesModalProps) => {
  const { user } = useAuth();
  const { updatePreferences } = useRecommendations({ type: 'properties', autoFetch: false });

  const [preferences, setPreferences] = useState({
    preferred_cities: [] as string[],
    preferred_property_types: [] as string[],
    min_budget: 0,
    max_budget: 0,
    min_bedrooms: 0,
    min_bathrooms: 0,
    requires_furnished: false,
    requires_ac: false,
    requires_parking: false,
    requires_garden: false,
  });

  const [cityInput, setCityInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && user) {
      loadPreferences();
    }
  }, [open, user]);

  const loadPreferences = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data && !error) {
      setPreferences({
        preferred_cities: data.preferred_cities || [],
        preferred_property_types: data.preferred_property_types || [],
        min_budget: data.min_budget || 0,
        max_budget: data.max_budget || 0,
        min_bedrooms: data.min_bedrooms || 0,
        min_bathrooms: data.min_bathrooms || 0,
        requires_furnished: data.requires_furnished || false,
        requires_ac: data.requires_ac || false,
        requires_parking: data.requires_parking || false,
        requires_garden: data.requires_garden || false,
      });
    }
  };

  const handleSave = async () => {
    // Validation
    if (preferences.min_budget > 0 && preferences.max_budget > 0 && preferences.min_budget > preferences.max_budget) {
      toast({
        title: "Critères invalides",
        description: "Le budget minimum ne peut pas être supérieur au budget maximum",
        variant: "destructive",
      });
      return;
    }

    if (preferences.preferred_cities.length > 0) {
      const invalidCities = preferences.preferred_cities.filter(city => city.length < 2);
      if (invalidCities.length > 0) {
        toast({
          title: "Villes invalides",
          description: "Certaines villes saisies sont trop courtes (minimum 2 caractères)",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    try {
      await updatePreferences(preferences);
      onOpenChange(false);
      toast({
        title: "Préférences sauvegardées",
        description: "Vos recommandations ont été mises à jour",
      });
    } catch (error) {
      logger.logError(error, { context: 'PreferencesModal', action: 'save' });
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les préférences",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addCity = () => {
    const trimmedCity = cityInput.trim();
    if (!trimmedCity) return;
    
    if (trimmedCity.length < 2) {
      toast({
        title: "Ville invalide",
        description: "Le nom de la ville doit contenir au moins 2 caractères",
        variant: "destructive",
      });
      return;
    }

    if (preferences.preferred_cities.includes(trimmedCity)) {
      toast({
        title: "Ville déjà ajoutée",
        description: "Cette ville est déjà dans votre liste",
        variant: "destructive",
      });
      return;
    }

    setPreferences({
      ...preferences,
      preferred_cities: [...preferences.preferred_cities, trimmedCity],
    });
    setCityInput('');
  };

  const removeCity = (city: string) => {
    setPreferences({
      ...preferences,
      preferred_cities: preferences.preferred_cities.filter(c => c !== city),
    });
  };

  const togglePropertyType = (type: string) => {
    const types = preferences.preferred_property_types;
    setPreferences({
      ...preferences,
      preferred_property_types: types.includes(type)
        ? types.filter(t => t !== type)
        : [...types, type],
    });
  };

  const propertyTypes = ['Appartement', 'Studio', 'Villa', 'Chambre', 'Bureau'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurer mes préférences de recherche</DialogTitle>
          <DialogDescription>
            Personnalisez vos critères pour recevoir des recommandations adaptées
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Villes préférées */}
          <div className="space-y-2">
            <Label>Villes préférées</Label>
            <div className="flex gap-2">
              <Input
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addCity()}
                placeholder="Ajouter une ville"
              />
              <Button onClick={addCity} type="button">Ajouter</Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {preferences.preferred_cities.map((city) => (
                <div key={city} className="bg-secondary px-3 py-1 rounded-full flex items-center gap-2">
                  <span>{city}</span>
                  <button onClick={() => removeCity(city)} className="text-destructive">×</button>
                </div>
              ))}
            </div>
          </div>

          {/* Types de biens */}
          <div className="space-y-2">
            <Label>Types de biens</Label>
            <div className="flex flex-wrap gap-2">
              {propertyTypes.map((type) => (
                <Button
                  key={type}
                  variant={preferences.preferred_property_types.includes(type) ? 'default' : 'outline'}
                  onClick={() => togglePropertyType(type)}
                  type="button"
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Budget minimum (FCFA/mois)</Label>
              <Input
                type="number"
                value={preferences.min_budget || ''}
                onChange={(e) => setPreferences({ ...preferences, min_budget: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Budget maximum (FCFA/mois)</Label>
              <Input
                type="number"
                value={preferences.max_budget || ''}
                onChange={(e) => setPreferences({ ...preferences, max_budget: Number(e.target.value) })}
              />
            </div>
          </div>

          {/* Chambres et Salles de bain */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Chambres minimum</Label>
              <Input
                type="number"
                min="0"
                value={preferences.min_bedrooms || ''}
                onChange={(e) => setPreferences({ ...preferences, min_bedrooms: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Salles de bain minimum</Label>
              <Input
                type="number"
                min="0"
                value={preferences.min_bathrooms || ''}
                onChange={(e) => setPreferences({ ...preferences, min_bathrooms: Number(e.target.value) })}
              />
            </div>
          </div>

          {/* Équipements */}
          <div className="space-y-3">
            <Label>Équipements souhaités</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="furnished">Meublé</Label>
                <Switch
                  id="furnished"
                  checked={preferences.requires_furnished}
                  onCheckedChange={(checked) => setPreferences({ ...preferences, requires_furnished: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="ac">Climatisation</Label>
                <Switch
                  id="ac"
                  checked={preferences.requires_ac}
                  onCheckedChange={(checked) => setPreferences({ ...preferences, requires_ac: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="parking">Parking</Label>
                <Switch
                  id="parking"
                  checked={preferences.requires_parking}
                  onCheckedChange={(checked) => setPreferences({ ...preferences, requires_parking: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="garden">Jardin</Label>
                <Switch
                  id="garden"
                  checked={preferences.requires_garden}
                  onCheckedChange={(checked) => setPreferences({ ...preferences, requires_garden: checked })}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
