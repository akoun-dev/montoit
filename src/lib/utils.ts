import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { type IllustrationKey, illustrationPaths } from "@/assets/illustrations/ivorian/illustrationPaths";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get the path of an illustration by key
 * @param name - The illustration key
 * @returns The illustration path or undefined if not found
 */
export function getIllustrationPath(name: IllustrationKey): string | undefined {
  return illustrationPaths[name];
}
