/**
 * Combines class names conditionally.
 * Reusable utility for clean component class styling.
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

