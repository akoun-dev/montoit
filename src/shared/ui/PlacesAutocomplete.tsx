import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Search, Loader2, X } from 'lucide-react';
import { usePlacesAutocomplete, PlaceSuggestion } from '@/shared/hooks/usePlacesAutocomplete';
import { cn } from '@/shared/lib/utils';

export interface PlaceResult {
  description: string;
  placeId: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  neighborhood?: string;
}

interface PlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (place: PlaceResult) => void;
  placeholder?: string;
  country?: string;
  className?: string;
  disabled?: boolean;
  label?: string;
}

export default function PlacesAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Rechercher une adresse...',
  country = 'ci',
  className,
  disabled = false,
  label,
}: PlacesAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selectingDetails, setSelectingDetails] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { setQuery, suggestions, isLoading, getDetails, clearSuggestions } = usePlacesAutocomplete({
    country,
  });

  // Handle input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange(newValue);
      setQuery(newValue);
      setIsOpen(true);
      setHighlightedIndex(-1);
    },
    [onChange, setQuery]
  );

  // Handle suggestion selection
  const handleSelect = useCallback(
    async (suggestion: PlaceSuggestion) => {
      setSelectingDetails(true);
      onChange(suggestion.description);
      setIsOpen(false);
      clearSuggestions();

      // Fetch coordinates
      const details = await getDetails(suggestion.placeId);

      const result: PlaceResult = {
        description: suggestion.description,
        placeId: suggestion.placeId,
        latitude: details?.latitude,
        longitude: details?.longitude,
        city: details?.city,
        neighborhood: details?.neighborhood,
      };

      onSelect(result);
      setSelectingDetails(false);
    },
    [onChange, getDetails, onSelect, clearSuggestions]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || suggestions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
            const selected = suggestions[highlightedIndex];
            if (selected) {
              handleSelect(selected);
            }
          }
          break;
        case 'Escape':
          setIsOpen(false);
          clearSuggestions();
          break;
      }
    },
    [isOpen, suggestions, highlightedIndex, handleSelect, clearSuggestions]
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear input
  const handleClear = useCallback(() => {
    onChange('');
    clearSuggestions();
    inputRef.current?.focus();
  }, [onChange, clearSuggestions]);

  return (
    <div className="relative">
      {label && (
        <label
          className="block text-xs font-bold uppercase tracking-wide mb-2"
          style={{ color: 'var(--color-gris-neutre)' }}
        >
          {label}
        </label>
      )}

      <div className="relative">
        {/* Search icon */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {isLoading || selectingDetails ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          ) : (
            <Search className="w-4 h-4 text-gray-400" />
          )}
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'input-premium w-full pl-10 pr-10',
            disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
        />

        {/* Clear button */}
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50 max-h-64 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.placeId}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className={cn(
                'w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start gap-3 border-b border-gray-100 last:border-0 transition-colors',
                highlightedIndex === index && 'bg-orange-50'
              )}
            >
              <MapPin className="w-4 h-4 mt-0.5 text-orange-500 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-gray-900 truncate">{suggestion.mainText}</div>
                {suggestion.secondaryText && (
                  <div className="text-sm text-gray-500 truncate">{suggestion.secondaryText}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Empty state when typing but no results */}
      {isOpen && value.length >= 2 && !isLoading && suggestions.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-50">
          <div className="text-center text-gray-500 text-sm">
            <MapPin className="w-5 h-5 mx-auto mb-2 text-gray-300" />
            Aucun résultat trouvé
          </div>
        </div>
      )}
    </div>
  );
}
