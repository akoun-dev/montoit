/**
 * Feature: property
 *
 * Exports publics de la feature property
 */

// Pages
export { default as HomePage } from './pages/HomePage';

// Components
export { default as QuickSearch } from './components/QuickSearch';
export { default as HeroSlideshow } from './components/HeroSlideshow';
export { default as HeroSpectacular } from './components/HeroSpectacular';
export { default as HeroSimplified } from './components/HeroSimplified';

// Hooks
export {
  useProperties,
  useProperty,
  useOwnerProperties,
  useFeaturedProperties,
  useCreateProperty,
  useUpdateProperty,
  useDeleteProperty,
} from './hooks/useProperties';

// Services
export { propertyApi } from './services/property.api';

// Types
export type {
  Property,
  PropertyInsert,
  PropertyUpdate,
  PropertyWithOwner,
  PropertyFilters,
  PropertyStats,
  PropertyFormData,
  PropertyStatus,
  PropertyType,
  PropertyAmenity,
  PropertyLocation,
} from './types';
