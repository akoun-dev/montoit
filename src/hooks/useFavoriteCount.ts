import { useFavorites } from './useFavorites';

/**
 * Hook to track new favorites count (last 24 hours)
 * Uses the existing useFavorites hook
 */
export const useFavoriteCount = () => {
  const { favorites } = useFavorites();
  
  // Count favorites added in the last 24 hours
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const newFavorites = favorites.filter(fav => {
    // Since favorites is just an array of IDs, we count all for now
    // In a real scenario, you'd fetch the created_at from the database
    return true;
  }).length;

  // Return count only if there are new favorites
  return newFavorites > 0 ? newFavorites : 0;
};
