import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Filter, X, Mic, Home, Building, Calendar, DollarSign, TrendingUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useVoiceSearch } from '@/hooks/useVoiceSearch';
import { useSearchSuggestions } from '@/hooks/useSearchSuggestions';
import { MotionDiv, MotionLi } from '@/components/ui/motion';

interface SearchFilters {
  location?: string;
  propertyType?: string;
  priceMin?: number;
  priceMax?: number;
  bedrooms?: number;
  furnished?: boolean;
  availableNow?: boolean;
  neighborhoods?: string[];
}

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'location' | 'propertyType' | 'feature';
  icon: React.ReactNode;
  highlight?: string;
}

interface EnhancedSearchInterfaceProps {
  onSearch: (query: string, filters: SearchFilters) => void;
  placeholder?: string;
  className?: string;
  compact?: boolean;
  showFilters?: boolean;
}

export const EnhancedSearchInterface: React.FC<EnhancedSearchInterfaceProps> = ({
  onSearch,
  placeholder = "Rechercher un bien à Abidjan...",
  className,
  compact = false,
  showFilters = true
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<string[]>([]);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    isListening,
    startListening,
    stopListening,
    supported: voiceSupported
  } = useVoiceSearch({
    onResult: (transcript) => {
      setQuery(transcript);
      handleSearch(transcript);
    },
    onError: (error) => {
      console.error('Voice search error:', error);
    }
  });

  const {
    suggestions,
    loading: suggestionsLoading,
    getSuggestions
  } = useSearchSuggestions();

  // Load recent searches on mount
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }

    // Load trending searches (mock data for now)
    setTrendingSearches([
      'Appartements Cocody',
      'Villas Riviera',
      'Bureaux Plateau',
      'Studios Marcory',
      'Maisons Angre'
    ]);
  }, []);

  // Handle input changes
  const handleInputChange = (value: string) => {
    setQuery(value);
    setShowSuggestions(value.length > 0);

    if (value.length > 2) {
      getSuggestions(value);
    }
  };

  // Handle search
  const handleSearch = (searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    if (!finalQuery.trim()) return;

    // Add to recent searches
    const newRecentSearches = [
      finalQuery,
      ...recentSearches.filter(s => s !== finalQuery)
    ].slice(0, 5);

    setRecentSearches(newRecentSearches);
    localStorage.setItem('recentSearches', JSON.stringify(newRecentSearches));

    // Perform search
    onSearch(finalQuery, filters);
    setShowSuggestions(false);

    // Navigate to search results
    navigate(`/search?q=${encodeURIComponent(finalQuery)}`);
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    handleSearch(suggestion.text);
  };

  // Clear search
  const clearSearch = () => {
    setQuery('');
    setFilters({});
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  // Popular search suggestions
  const popularSuggestions: SearchSuggestion[] = [
    {
      id: '1',
      text: 'Appartements à Cocody',
      type: 'location',
      icon: <MapPin className="h-4 w-4" />,
      highlight: 'Cocody'
    },
    {
      id: '2',
      text: 'Villas 4 chambres',
      type: 'feature',
      icon: <Home className="h-4 w-4" />,
      highlight: '4 chambres'
    },
    {
      id: '3',
      text: 'Bureaux au Plateau',
      type: 'propertyType',
      icon: <Building className="h-4 w-4" />,
      highlight: 'Plateau'
    },
    {
      id: '4',
      text: 'Moins de 200 000 FCFA',
      type: 'feature',
      icon: <DollarSign className="h-4 w-4" />,
      highlight: '200 000 FCFA'
    }
  ];

  return (
    <div ref={searchRef} className={cn("relative", className)}>
      {/* Search Input */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-4 h-5 w-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => setShowSuggestions(query.length > 0)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              } else if (e.key === 'Escape') {
                setShowSuggestions(false);
              }
            }}
            placeholder={placeholder}
            className={cn(
              "pl-12 pr-20 h-14 text-lg border-2 transition-all duration-200",
              "focus:border-primary focus:ring-4 focus:ring-primary/10",
              compact && "h-12 text-base pr-16"
            )}
          />

          {/* Action Buttons */}
          <div className="absolute right-2 flex items-center gap-1">
            {query && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="h-8 w-8 p-0 hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </Button>
            )}

            {voiceSupported && !compact && (
              <Button
                variant="ghost"
                size="sm"
                onClick={isListening ? stopListening : startListening}
                className={cn(
                  "h-8 w-8 p-0 hover:bg-muted",
                  isListening && "text-destructive animate-pulse"
                )}
              >
                <Mic className="h-4 w-4" />
              </Button>
            )}

            {showFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilterDialog(true)}
                className="h-8 w-8 p-0 hover:bg-muted"
              >
                <Filter className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Active Filters Badges */}
        {Object.keys(filters).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {filters.propertyType && (
              <Badge variant="secondary" className="gap-1">
                {filters.propertyType}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleFilterChange({ propertyType: undefined })}
                />
              </Badge>
            )}
            {filters.priceMax && (
              <Badge variant="secondary" className="gap-1">
                Max: {filters.priceMax.toLocaleString()} FCFA
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleFilterChange({ priceMax: undefined })}
                />
              </Badge>
            )}
            {filters.bedrooms && (
              <Badge variant="secondary" className="gap-1">
                {filters.bedrooms}+ chambres
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleFilterChange({ bedrooms: undefined })}
                />
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Search Suggestions Dropdown */}
      {showSuggestions && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 shadow-elevation-4">
          <CardContent className="p-0">
            {/* Voice Search Indicator */}
            {isListening && (
              <div className="p-4 border-b bg-destructive/5">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 bg-destructive rounded-full animate-pulse" />
                  <span className="text-sm text-destructive">Écoute en cours...</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={stopListening}
                    className="ml-auto"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Suggestions List */}
            <div className="max-h-96 overflow-y-auto">
              {/* Popular Suggestions */}
              {query.length === 0 && (
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Recherches populaires</span>
                  </div>
                  <ul className="space-y-1">
                    {popularSuggestions.map((suggestion, index) => (
                      <MotionLi
                        key={suggestion.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <button
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                        >
                          <div className="text-primary">{suggestion.icon}</div>
                          <span className="text-sm">{suggestion.text}</span>
                          {suggestion.highlight && (
                            <Badge variant="outline" className="ml-auto text-xs">
                              {suggestion.highlight}
                            </Badge>
                          )}
                        </button>
                      </MotionLi>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recent Searches */}
              {query.length === 0 && recentSearches.length > 0 && (
                <div className="p-4 border-t">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Recherches récentes</span>
                  </div>
                  <ul className="space-y-1">
                    {recentSearches.map((search, index) => (
                      <MotionLi
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <button
                          onClick={() => handleSearch(search)}
                          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                        >
                          <Search className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{search}</span>
                        </button>
                      </MotionLi>
                    ))}
                  </ul>
                </div>
              )}

              {/* Dynamic Suggestions */}
              {query.length > 0 && suggestions.length > 0 && (
                <div className="p-2">
                  {suggestionsLoading ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Recherche de suggestions...
                    </div>
                  ) : (
                    <ul className="space-y-1">
                      {suggestions.slice(0, 8).map((suggestion, index) => (
                        <MotionLi
                          key={`${suggestion.text}-${index}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <button
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                          >
                            <div className="text-primary">{suggestion.icon}</div>
                            <span className="text-sm">{suggestion.text}</span>
                            <Sparkles className="h-3 w-3 text-primary ml-auto" />
                          </button>
                        </MotionLi>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* No Results */}
              {query.length > 0 && !suggestionsLoading && suggestions.length === 0 && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Aucune suggestion trouvée pour "{query}"
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Dialog */}
      <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Filtres de recherche</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Property Type */}
            <div>
              <label className="text-sm font-medium mb-2 block">Type de bien</label>
              <div className="grid grid-cols-2 gap-2">
                {['Appartement', 'Villa', 'Studio', 'Bureau', 'Magasin', 'Terrain'].map(type => (
                  <Button
                    key={type}
                    variant={filters.propertyType === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleFilterChange({
                      propertyType: filters.propertyType === type ? undefined : type
                    })}
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div>
              <label className="text-sm font-medium mb-2 block">Budget maximum</label>
              <div className="grid grid-cols-2 gap-2">
                {[100000, 200000, 500000, 1000000].map(price => (
                  <Button
                    key={price}
                    variant={filters.priceMax === price ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleFilterChange({
                      priceMax: filters.priceMax === price ? undefined : price
                    })}
                  >
                    {(price / 1000).toFixed(0)}k FCFA
                  </Button>
                ))}
              </div>
            </div>

            {/* Bedrooms */}
            <div>
              <label className="text-sm font-medium mb-2 block">Nombre de chambres</label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map(rooms => (
                  <Button
                    key={rooms}
                    variant={filters.bedrooms === rooms ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleFilterChange({
                      bedrooms: filters.bedrooms === rooms ? undefined : rooms
                    })}
                  >
                    {rooms}+
                  </Button>
                ))}
              </div>
            </div>

            {/* Additional Options */}
            <div>
              <label className="text-sm font-medium mb-2 block">Options</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.furnished || false}
                    onChange={(e) => handleFilterChange({ furnished: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Meublé</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.availableNow || false}
                    onChange={(e) => handleFilterChange({ availableNow: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Disponible immédiatement</span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setFilters({})}
                className="flex-1"
              >
                Réinitialiser
              </Button>
              <Button
                onClick={() => setShowFilterDialog(false)}
                className="flex-1"
              >
                Appliquer les filtres
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedSearchInterface;