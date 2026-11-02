import { useState } from 'react';
import { Clock, X, Search, TrendingUp } from 'lucide-react';
import { useLocalStorage } from '@/hooks/shared/useLocalStorage';

interface SearchHistoryItem {
  id: string;
  query: string;
  filters: {
    city?: string;
    propertyType?: string;
    minPrice?: string;
    maxPrice?: string;
    bedrooms?: string;
  };
  timestamp: number;
  resultsCount?: number;
}

interface SearchHistoryProps {
  onApplySearch: (item: SearchHistoryItem) => void;
  className?: string;
}

export default function SearchHistory({ onApplySearch, className = '' }: SearchHistoryProps) {
  const [history, setHistory] = useLocalStorage<SearchHistoryItem[]>('search_history', []);
  const [showAll, setShowAll] = useState(false);

  const displayedHistory = showAll ? history : history.slice(0, 5);

  const removeItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(history.filter((item) => item.id !== id));
  };

  const clearAll = () => {
    setHistory([]);
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "À l'instant";
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    return new Date(timestamp).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const getQueryDescription = (item: SearchHistoryItem) => {
    const parts: string[] = [];
    if (item.filters.propertyType) parts.push(item.filters.propertyType);
    if (item.filters.bedrooms) parts.push(`${item.filters.bedrooms} ch`);
    if (item.filters.city) parts.push(item.filters.city);
    if (item.filters.minPrice || item.filters.maxPrice) {
      if (item.filters.maxPrice) {
        parts.push(`≤ ${parseInt(item.filters.maxPrice).toLocaleString()} FCFA`);
      }
    }
    return parts.join(' • ') || 'Recherche sans filtre';
  };

  if (history.length === 0) {
    return (
      <div className={`p-6 text-center ${className}`}>
        <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400">Aucun historique de recherche</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Vos recherches apparaîtront ici
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="font-bold text-gray-900 dark:text-white">Historique de recherche</h3>
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-semibold rounded-full">
            {history.length}
          </span>
        </div>
        {history.length > 0 && (
          <button
            onClick={clearAll}
            className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 font-medium"
          >
            Tout effacer
          </button>
        )}
      </div>

      {/* History Items */}
      <div className="space-y-2">
        {displayedHistory.map((item) => (
          <button
            key={item.id}
            onClick={() => onApplySearch(item)}
            className="w-full group bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all duration-200 text-left"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0 mr-3">
                {/* Query */}
                <div className="flex items-center space-x-2 mb-2">
                  <Search className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {getQueryDescription(item)}
                  </p>
                </div>

                {/* Meta */}
                <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatTimestamp(item.timestamp)}</span>
                  </span>
                  {item.resultsCount !== undefined && (
                    <span className="flex items-center space-x-1">
                      <TrendingUp className="h-3 w-3" />
                      <span>
                        {item.resultsCount} résultat{item.resultsCount > 1 ? 's' : ''}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {/* Delete Button */}
              <button
                onClick={(e) => removeItem(item.id, e)}
                className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                aria-label="Supprimer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </button>
        ))}
      </div>

      {/* Show More */}
      {history.length > 5 && (
        <div className="text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
          >
            {showAll ? 'Voir moins' : `Voir ${history.length - 5} de plus`}
          </button>
        </div>
      )}
    </div>
  );
}

// Hook pour gérer l'historique
export function useSearchHistory() {
  const [history, setHistory] = useLocalStorage<SearchHistoryItem[]>('search_history', []);

  const addToHistory = (filters: SearchHistoryItem['filters'], resultsCount?: number) => {
    const newItem: SearchHistoryItem = {
      id: Date.now().toString(),
      query: '', // Peut être calculé depuis les filtres
      filters,
      timestamp: Date.now(),
      resultsCount,
    };

    // Éviter les doublons récents (même filtres dans les 5 minutes)
    const recentDuplicate = history.find(
      (item) =>
        Date.now() - item.timestamp < 300000 && // 5 minutes
        JSON.stringify(item.filters) === JSON.stringify(filters)
    );

    if (!recentDuplicate) {
      const updatedHistory = [newItem, ...history].slice(0, 50); // Max 50 items
      setHistory(updatedHistory);
    }
  };

  const clearHistory = () => {
    setHistory([]);
  };

  return {
    history,
    addToHistory,
    clearHistory,
  };
}
