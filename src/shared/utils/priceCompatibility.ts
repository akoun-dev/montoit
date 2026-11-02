/**
 * Utility functions for price field compatibility
 *
 * This module provides helper functions to handle the transition from
 * 'price' to 'monthly_rent' field in the properties table.
 */

interface Property {
  price?: number;
  monthly_rent?: number;
  [key: string]: unknown;
}

/**
 * Gets the price from a property object, handling both old 'price' and new 'monthly_rent' fields
 * @param property - Property object
 * @returns The price value (monthly_rent if available, otherwise price)
 */
export const getPropertyPrice = (property: Property): number => {
  return property.monthly_rent || property.price || 0;
};

/**
 * Gets the formatted price string for display
 * @param property - Property object
 * @returns Formatted price string with currency
 */
export const getFormattedPrice = (property: Property): string => {
  const price = getPropertyPrice(property);
  if (price === 0) return 'Prix sur demande';

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(price);
};

/**
 * Normalizes a property object to have both price fields for compatibility
 * @param property - Property object
 * @returns Property object with both price and monthly_rent fields
 */
export const normalizePropertyPrice = (property: Property): Property => {
  const normalizedProperty = { ...property };

  // If we have monthly_rent but no price, set price
  if (property.monthly_rent && !property.price) {
    normalizedProperty.price = property.monthly_rent;
  }

  // If we have price but no monthly_rent, set monthly_rent
  if (property.price && !property.monthly_rent) {
    normalizedProperty.monthly_rent = property.price;
  }

  return normalizedProperty;
};

/**
 * Prepares property data for API submission
 * @param propertyData - Property data from form
 * @returns Property data ready for submission with correct field names
 */
export const preparePropertyForSubmission = (propertyData: Property): Property => {
  const prepared = { ...propertyData };

  // Always use monthly_rent for submission
  if (prepared.price && !prepared.monthly_rent) {
    prepared.monthly_rent = prepared.price;
  }

  // Remove the old price field to avoid confusion
  delete prepared.price;

  return prepared;
};

/**
 * Type guard to check if property has valid pricing
 * @param property - Property object
 * @returns True if property has valid price information
 */
export const hasValidPrice = (property: Property): boolean => {
  const price = getPropertyPrice(property);
  return !isNaN(price) && price > 0;
};
