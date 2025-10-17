import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Search } from 'lucide-react';
import { useSavedSearches } from '@/hooks/useSavedSearches';
import { triggerHapticFeedback } from '@/utils/haptics';
import { Skeleton } from '@/components/ui/skeleton';

interface SavedSearchesProps {
  onApply: (filters: any) => void;
}

const SavedSearches = ({ onApply }: SavedSearchesProps) => {
  const { savedSearches, isLoading, deleteSearch } = useSavedSearches();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recherches sauvegardées</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (savedSearches.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Recherches sauvegardées
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {savedSearches.map((search) => (
          <div 
            key={search.id} 
            className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <button
              className="flex-1 text-left min-h-[44px] flex flex-col justify-center"
              onClick={() => {
                onApply(search.filters);
                triggerHapticFeedback('light');
              }}
              aria-label={`Appliquer la recherche ${search.name}`}
            >
              <p className="font-medium">{search.name}</p>
              <p className="text-sm text-muted-foreground">
                {Object.keys(search.filters).length} filtre{Object.keys(search.filters).length > 1 ? 's' : ''} actif{Object.keys(search.filters).length > 1 ? 's' : ''}
              </p>
            </button>
            
            <Button
              size="icon"
              variant="ghost"
              className="min-h-[44px] min-w-[44px]"
              onClick={() => {
                deleteSearch(search.id);
                triggerHapticFeedback('light');
              }}
              aria-label={`Supprimer la recherche ${search.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default SavedSearches;
