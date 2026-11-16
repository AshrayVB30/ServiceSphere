/**
 * Combines class names conditionally.
 * Reusable utility for clean component class styling.
 *
 * WHY: Components often need to merge static base classes with conditional or dynamic classes.
 * This utility eliminates falsy values (false, null, undefined, '') so they don't appear
 * as empty strings in the DOM className attribute, keeping the HTML output clean.
 *
 * Usage example:
 *   cn('btn', isActive && 'btn-active', isDisabled && 'btn-disabled')
 *   // => 'btn btn-active'  (when isActive=true, isDisabled=false)
 *
 * @param {...(string|boolean|null|undefined)} classes - Any number of class name values to merge
 * @returns {string} A single space-separated string of truthy class names
 */
export function cn(...classes) {
  // filter(Boolean) removes all falsy entries (false, null, undefined, 0, '') from the classes array
  // .join(' ') then concatenates the remaining truthy class name strings with a single space separator
  return classes.filter(Boolean).join(' ');
}
