import { useFeaturedProperties } from '../../../hooks/property/useProperties';
import FeaturedProperties from './FeaturedProperties';

/**
 * Autonomous wrapper component that fetches and displays featured properties
 * Uses useFeaturedProperties hook with automatic caching
 */
export default function FeaturedPropertiesSection() {
  const { data, isLoading, error } = useFeaturedProperties();

  // Silent fallback on error - don't break the homepage
  if (error) {
    return null;
  }

  return <FeaturedProperties properties={data || []} loading={isLoading} />;
}
