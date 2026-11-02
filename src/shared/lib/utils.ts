import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============= User Type Mapping Utilities =============

export const USER_TYPE_FR_TO_EN = {
  locataire: 'tenant',
  proprietaire: 'owner',
  agence: 'agent',
  tenant: 'tenant',
  owner: 'owner',
  agent: 'agent',
} as const;

export const USER_TYPE_EN_TO_FR = {
  tenant: 'locataire',
  owner: 'proprietaire',
  agent: 'agence',
} as const;

export type UserTypeFr = 'locataire' | 'proprietaire' | 'agence';
export type UserTypeEn = 'tenant' | 'owner' | 'agent';
export type UserTypeAny = UserTypeFr | UserTypeEn;

export function normalizeUserType(userType: string | undefined | null): UserTypeEn {
  if (!userType) return 'tenant';
  const normalized = USER_TYPE_FR_TO_EN[userType as keyof typeof USER_TYPE_FR_TO_EN];
  return normalized || 'tenant';
}

export function translateUserType(userType: string | undefined | null): UserTypeFr {
  if (!userType) return 'locataire';
  if (['locataire', 'proprietaire', 'agence'].includes(userType)) {
    return userType as UserTypeFr;
  }
  const translated = USER_TYPE_EN_TO_FR[userType as keyof typeof USER_TYPE_EN_TO_FR];
  return translated || 'locataire';
}

export function isUserType(userType: string | undefined | null, ...types: UserTypeAny[]): boolean {
  if (!userType) return false;
  const normalized = normalizeUserType(userType);
  return types.some((t) => normalizeUserType(t) === normalized);
}
