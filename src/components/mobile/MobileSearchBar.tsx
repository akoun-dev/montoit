import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Mic, MapPin, Filter, Clock, TrendingUp, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { triggerHapticFeedback } from '@/utils/haptics';
import { cn } from '@/lib/utils';

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'recent' | 'popular' | 'location';
  icon?: any;
  count?: number;
}

interface MobileSearchBarProps {
  onSearch: (query: string) => void;
  onVoiceSearch?: () => void;
  onLocationClick?: () => void;
  placeholder?: string;
  suggestions?: SearchSuggestion[];
  recentSearches?: string[];
}

export const MobileSearchBar = ({
  onSearch,
  onVoiceSearch,
  onLocationClick,
  placeholder = "Rechercher une ville, quartier, bien...",
  suggestions = [],
  recentSearches = []
}: MobileSearchBarProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Default suggestions
  const defaultSuggestions: SearchSuggestion[] = [
    { id: '1', text: 'Abidjan - Cocody', type: 'location', icon: MapPin },
    { id: '2', text: 'Appartements meublés', type: 'popular', icon: Sparkles, count: 234 },
    { id: '3', text: 'Yopougon', type: 'location', icon: MapPin },
    { id: '4', text: 'Studios -100k', type: 'popular', icon: TrendingUp, count: 156 },
    { id: '5', text: 'Plateau', type: 'location', icon: MapPin },
  ];

  const allSuggestions = [
    ...recentSearches.map((search, index) => ({
      id: `recent-${index}`,
      text: search,
      type: 'recent' as const,
      icon: Clock
    })),
    ...suggestions,
    ...defaultSuggestions
  ].slice(0, 8);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      triggerHapticFeedback('light');
      onSearch(query.trim());
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    triggerHapticFeedback('selection');
    setQuery(suggestion.text);
    onSearch(suggestion.text);
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setQuery('');
    triggerHapticFeedback('light');
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    setIsFocused(true);
    setShowSuggestions(true);
    triggerHapticFeedback('light');
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Delay hiding suggestions to allow click on suggestions
    setTimeout(() => setShowSuggestions(false), 150);
  };

  const handleVoiceSearch = () => {
    triggerHapticFeedback('selection');
    if (onVoiceSearch) onVoiceSearch();
  };

  // Close suggestions on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Search Input */}
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={cn(
            "relative flex items-center bg-white border-2 rounded-2xl transition-all duration-200",
            isFocused
              ? "border-primary shadow-lg shadow-primary/10"
              : "border-gray-200"
          )}
        >
          {/* Search Icon */}
          <div className="absolute left-4 z-10">
            <Search className="h-5 w-5 text-gray-400" />
          </div>

          {/* Input Field */}
          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            className="pl-12 pr-24 h-12 border-0 bg-transparent text-base placeholder:text-gray-400 focus-visible:ring-0"
          />

          {/* Action Buttons */}
          <div className="absolute right-2 flex items-center gap-1">
            {query && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={handleClear}
                className="h-8 w-8 rounded-full hover:bg-gray-100"
              >
                <X className="h-4 w-4 text-gray-400" />
              </Button>
            )}

            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={handleVoiceSearch}
              className="h-8 w-8 rounded-full hover:bg-gray-100"
            >
              <Mic className="h-4 w-4 text-gray-400" />
            </Button>

            {onLocationClick && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={onLocationClick}
                className="h-8 w-8 rounded-full hover:bg-gray-100"
              >
                <MapPin className="h-4 w-4 text-gray-400" />
              </Button>
            )}
          </div>
        </div>
      </form>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && allSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 z-50 mt-2"
          >
            <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
              <div className="p-2 max-h-80 overflow-y-auto">
                {/* Section Headers */}
                {recentSearches.length > 0 && (
                  <div className="px-3 py-2">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Recherches récentes
                    </h4>
                  </div>
                )}

                {/* Suggestion Items */}
                {allSuggestions.map((suggestion, index) => {
                  const Icon = suggestion.icon;
                  const isRecentSection = recentSearches.length > 0 && index < recentSearches.length;
                  const isPopularSection = !isRecentSection && suggestion.type === 'popular';

                  return (
                    <motion.button
                      key={suggestion.id}
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors",
                        "hover:bg-gray-50 active:bg-gray-100"
                      )}
                    >
                      <div
                        className={cn(
                          "flex items-center justify-center w-8 h-8 rounded-full",
                          isRecentSection
                            ? "bg-gray-100"
                            : isPopularSection
                            ? "bg-orange-100"
                            : "bg-primary/10"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4",
                            isRecentSection
                              ? "text-gray-500"
                              : isPopularSection
                              ? "text-orange-600"
                              : "text-primary"
                          )}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {suggestion.text}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {suggestion.count && (
                          <Badge
                            variant="secondary"
                            className="text-xs px-2 py-0.5 rounded-full"
                          >
                            {suggestion.count}
                          </Badge>
                        )}
                        {suggestion.type === 'recent' && (
                          <Badge
                            variant="outline"
                            className="text-xs px-2 py-0.5 rounded-full border-gray-200"
                          >
                            Récent
                          </Badge>
                        )}
                        {isPopularSection && (
                          <Badge
                            variant="secondary"
                            className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border-orange-200"
                          >
                            Populaire
                          </Badge>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="border-t border-gray-100 p-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Appuyez sur Entrée pour rechercher
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowSuggestions(false)}
                    className="text-xs h-6 px-2"
                  >
                    Fermer
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay to close suggestions */}
      {showSuggestions && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40"
          onClick={() => setShowSuggestions(false)}
        />
      )}
    </div>
  );
};

export default MobileSearchBar;