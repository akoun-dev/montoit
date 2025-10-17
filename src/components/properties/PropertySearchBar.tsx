import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Mic } from 'lucide-react';
import { useVoiceSearch } from '@/hooks/useVoiceSearch';
import { useSearchSuggestions } from '@/hooks/useSearchSuggestions';
import { triggerHapticFeedback } from '@/utils/haptics';
import { cn } from '@/lib/utils';

interface PropertySearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const PropertySearchBar = ({ searchQuery, onSearchChange }: PropertySearchBarProps) => {
  const [query, setQuery] = useState(searchQuery);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { isListening, transcript, isSupported, startListening, stopListening } = useVoiceSearch();
  const { suggestions } = useSearchSuggestions(query);

  useEffect(() => {
    if (transcript) {
      setQuery(transcript);
      onSearchChange(transcript);
    }
  }, [transcript, onSearchChange]);

  useEffect(() => {
    setQuery(searchQuery);
  }, [searchQuery]);

  const handleInputChange = (value: string) => {
    setQuery(value);
    onSearchChange(value);
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    onSearchChange(suggestion);
    setShowSuggestions(false);
    triggerHapticFeedback('light');
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Rechercher par ville, quartier..."
            className="pl-10"
            aria-label="Rechercher des propriétés"
            aria-autocomplete="list"
            aria-expanded={showSuggestions && suggestions.length > 0}
          />
        </div>
        
        {isSupported && (
          <Button
            size="icon"
            variant={isListening ? "default" : "outline"}
            onClick={() => {
              triggerHapticFeedback('medium');
              if (isListening) {
                stopListening();
              } else {
                startListening();
              }
            }}
            aria-label={isListening ? "Arrêter l'écoute" : "Recherche vocale"}
            className="min-h-[44px] min-w-[44px]"
          >
            <Mic className={cn("h-4 w-4", isListening && "animate-pulse")} />
          </Button>
        )}
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 shadow-lg">
          <CardContent className="p-0">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b last:border-0 min-h-[44px] flex items-center gap-2"
                onClick={() => handleSuggestionClick(suggestion)}
                onMouseDown={(e) => e.preventDefault()}
              >
                <Search className="h-4 w-4 text-muted-foreground" />
                <span>{suggestion}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PropertySearchBar;
