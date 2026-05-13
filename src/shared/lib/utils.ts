import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============= User Type Utilities =============

export type UserTypeEn = 'tenant' | 'owner' | 'agency' | 'trust_agent' | 'admin';
export type UserTypeAny = UserTypeEn;

export function normalizeUserType(userType: string | undefined | null): UserTypeEn {
  if (!userType) return 'tenant';
  const normalized = userType.toLowerCase();
  if (
    normalized === 'tenant' ||
    normalized === 'owner' ||
    normalized === 'agency' ||
    normalized === 'trust_agent' ||
    normalized === 'admin'
  ) {
    return normalized as UserTypeEn;
  }
  return 'tenant';
}

export function translateUserType(userType: string | undefined | null): UserTypeEn {
  return normalizeUserType(userType);
}

export function isUserType(userType: string | undefined | null, ...types: UserTypeAny[]): boolean {
  if (!userType) return false;
  const normalized = normalizeUserType(userType);
  return types.some((t) => normalizeUserType(t) === normalized);
}
