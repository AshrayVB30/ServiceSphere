import React from 'react'; // Import React core — required for JSX transformation and component creation
import { Loader2 } from 'lucide-react'; // Import the Loader2 spinner icon from lucide-react — used to visually indicate loading state inside the button
import { cn } from '../../utils/cn'; // Import the `cn` utility (clsx/tailwind-merge wrapper) — merges Tailwind class names safely, resolving conflicts

/**
 * Enterprise Button Component (Apple / Linear Aesthetic)
 * Minimalist, restrained shadows, tactile active press state.
 */
export const Button = React.forwardRef(function Button( // Export Button using React.forwardRef so parent components can attach a DOM ref to the underlying <button> element (needed for focus management, tooltips, or third-party libraries)
  {
    children, // The button's inner content — text, icons, or any React node rendered inside the button
    type = 'button', // HTML button type attribute; defaults to 'button' to prevent accidental form submission when used outside a form
    variant = 'primary', // Visual style variant key — controls color, border, and shadow via variantStyles map; defaults to 'primary' (blue filled)
    size = 'md', // Size key — controls height, padding, text size, and border-radius via sizeStyles map; defaults to 'md'
    loading = false, // When true, replaces icons with a spinner and dims label text — signals async operation in progress
    disabled = false, // When true, prevents interaction; combined with `loading` to derive the final disabled state
    leftIcon: LeftIcon, // Optional icon component rendered to the left of the label — aliased so it can be used as JSX element directly
    rightIcon: RightIcon, // Optional icon component rendered to the right of the label — hidden when loading to avoid layout shift
    className = '', // Additional Tailwind classes passed by the consumer — merged via `cn` to allow overrides without breaking base styles
    onClick, // Click handler forwarded directly to the native <button> element
    ...props // All other native button attributes (aria-*, data-*, etc.) spread onto the <button> element for full HTML compatibility
  },
  ref // Forwarded ref from React.forwardRef — attached to the <button> DOM node for parent-controlled focus or measurement
) {
  const baseStyles = // Base Tailwind classes applied to every button regardless of variant or size
    'relative inline-flex items-center justify-center font-medium transition-all duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed select-none active:scale-[0.985] cursor-pointer';
    // `relative` — establishes stacking context for any absolutely-positioned children
    // `inline-flex items-center justify-center` — horizontally and vertically centres icon + label
    // `font-medium` — consistent medium weight across all variants
    // `transition-all duration-150 ease-out` — smooth 150 ms transition on colour, shadow, and transform changes
    // `focus:outline-none` — removes browser default blue outline
    // `focus-visible:ring-2 focus-visible:ring-offset-2` — shows keyboard-only focus ring (accessibility)
    // `disabled:cursor-not-allowed` — visual cue that the button is non-interactive when disabled
    // `select-none` — prevents accidental text selection on rapid clicks
    // `active:scale-[0.985]` — subtle press-down scale effect for tactile feedback
    // `cursor-pointer` — explicit pointer cursor so it feels clickable even without hover styles

  const variantStyles = { // Map of variant keys to their Tailwind class strings — each variant defines background, text, border, shadow, focus ring, and disabled colours
    primary: // Filled blue button — primary call-to-action; most visually prominent variant
      'bg-blue-600 hover:bg-blue-700 text-white shadow-xs focus-visible:ring-blue-600 disabled:bg-blue-400 disabled:opacity-60 border border-blue-600',
    secondary: // White button with gray border — secondary action; pairs alongside primary
      'bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 shadow-2xs focus-visible:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-400',
    outline: // Transparent button with a light gray border — tertiary action, blends with page background
      'bg-transparent hover:bg-gray-100/70 text-gray-700 border border-gray-200 focus-visible:ring-gray-400 disabled:text-gray-400 disabled:border-gray-200',
    ghost: // No border or background — used for icon buttons or low-emphasis inline actions
      'bg-transparent hover:bg-gray-100 text-gray-600 hover:text-gray-900 focus-visible:ring-gray-300 disabled:text-gray-300',
    danger: // Filled red button — signals irreversible destructive actions (delete, remove)
      'bg-red-600 hover:bg-red-700 text-white shadow-xs focus-visible:ring-red-600 disabled:bg-red-300 border border-red-600',
    dangerOutline: // White button with red border — softer destructive action; less alarming than filled danger
      'bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 focus-visible:ring-red-500 disabled:opacity-50',
    subtle: // Light blue tinted button — used for soft confirmations or selected filter states
      'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100 focus-visible:ring-blue-400 disabled:opacity-50',
  };

  const sizeStyles = { // Map of size keys to Tailwind classes — controls fixed height, horizontal padding, font size, border radius, and icon gap
    sm: 'h-8 px-3 text-xs rounded-lg gap-1.5', // Small: 32px tall — compact tables, dense toolbars
    md: 'h-10 px-4 text-sm rounded-xl gap-2', // Medium (default): 40px tall — standard form actions
    lg: 'h-11 px-5 text-base rounded-xl gap-2.5', // Large: 44px tall — prominent hero or modal CTAs
    iconSm: 'h-8 w-8 rounded-lg p-0', // Small icon-only: 32×32 square, no padding — icon-only action buttons
    iconMd: 'h-10 w-10 rounded-xl p-0', // Medium icon-only: 40×40 square, no padding — standard icon action buttons
  };

  const isDisabled = disabled || loading; // Derive the final disabled flag — either the consumer explicitly disabled the button OR it is currently loading; both states should block interaction

  return (
    <button // Native HTML button element — the interactive control
      ref={ref} // Attaches the forwarded ref to the DOM button node so parents can focus or measure it
      type={type} // Sets the HTML type (button/submit/reset) — prevents accidental form submissions when type is omitted
      disabled={isDisabled} // Passes combined disabled state; browsers automatically block click events and apply :disabled styles
      onClick={onClick} // Forwards the click handler to the native button event
      className={cn( // Merges all class name layers, resolving Tailwind conflicts via tailwind-merge
        baseStyles, // Apply layout, interaction, and transition base styles common to all variants
        variantStyles[variant] || variantStyles.primary, // Apply the selected colour/border variant, falling back to 'primary' if key is unknown
        sizeStyles[size] || sizeStyles.md, // Apply the selected size classes, falling back to 'md' if key is unknown
        className // Append any consumer-provided extra classes, allowing targeted overrides
      )}
      {...props} // Spread remaining props (e.g. aria-label, data-testid) onto the button element for full native attribute support
    >
      {loading ? ( // When loading is true, show the spinning icon instead of the left icon — the spinner communicates async progress
        <Loader2 className="h-4 w-4 animate-spin text-current shrink-0" /> // Loader2 icon: 16×16, Tailwind spin animation, inherits text colour, shrink-0 prevents it from squishing in flex layout
      ) : LeftIcon ? ( // When not loading and a LeftIcon component was provided, render it
        <LeftIcon className="h-4 w-4 shrink-0" /> // Left icon: 16×16, shrink-0 prevents flex shrinkage, positioned before the label text
      ) : null} {/* No icon slot when neither loading nor LeftIcon is present */}

      <span className={loading ? 'opacity-80' : ''}>{children}</span> {/* Wraps button label; dims to 80% opacity during loading to visually indicate the pending state while keeping the text readable */}

      {!loading && RightIcon && ( // Only render RightIcon when NOT loading (spinner already occupies the icon space) AND a RightIcon component was supplied
        <RightIcon className="h-4 w-4 shrink-0" /> // Right icon: 16×16, shrink-0, positioned after the label — commonly used for chevron/arrow indicators
      )}
    </button>
  );
});

export default Button; // Default export for convenience — allows importing as `import Button from './Button'` in addition to named import
