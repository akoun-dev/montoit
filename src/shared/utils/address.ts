export type AddressValue =
  | string
  | {
      street?: string;
      city?: string;
      country?: string;
      neighborhood?: string;
      [key: string]: unknown;
    }
  | null
  | undefined;

export function formatAddress(address: AddressValue, fallbackCity?: string): string {
  if (!address) return fallbackCity ?? '';
  if (typeof address === 'string') return address;

  if (typeof address === 'object') {
    const addr = address as Record<string, unknown>;
    const parts = [
      typeof addr['street'] === 'string' ? addr['street'] : null,
      typeof addr['neighborhood'] === 'string' ? addr['neighborhood'] : null,
      typeof addr['city'] === 'string' ? addr['city'] : fallbackCity,
      typeof addr['country'] === 'string' ? addr['country'] : null,
    ].filter((part): part is string => !!part && part.trim().length > 0);

    if (parts.length > 0) {
      return parts.join(', ');
    }
  }

  return fallbackCity ?? '';
}
