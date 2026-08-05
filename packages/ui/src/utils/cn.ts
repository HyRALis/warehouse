import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind classes safely, handling conflicts and conditional classes.
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
