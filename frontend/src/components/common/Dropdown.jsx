// Import React and hooks for state, ref references, and effect lifecycle
import React, { useState, useRef, useEffect } from 'react';
// Import class name combination helper
import { cn } from '../../utils/cn';

/**
 * Enterprise Dropdown Menu Component
 * Supports trigger element and children items with outside click detection.
 */
// Dropdown menu wrapper component
export function Dropdown({
  trigger,
  children,
  align = 'right',
  width = 'w-56',
  className = '',
}) {
  // Local state tracking whether the dropdown menu popover is currently expanded
  const [isOpen, setIsOpen] = useState(false);
  // DOM ref to container element to detect clicks outside the dropdown boundary
  const containerRef = useRef(null);

  // Attach global click listener to automatically close dropdown when clicking outside
  useEffect(() => {
    // Handler determining if click target was outside container element
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    // Only register listener when dropdown is open
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    // Cleanup callback removing event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Alignment positioning classes for dropdown popover
  const alignStyles = {
    // Left-aligned with trigger
    left: 'left-0',
    // Right-aligned with trigger (standard for user profile and action menus)
    right: 'right-0',
    // Centered with trigger
    center: 'left-1/2 -translate-x-1/2',
  };

  // Render dropdown trigger and conditional popover panel
  return (
    // Relative container capturing clicks and positioning popover
    <div ref={containerRef} className="relative inline-block text-left">
      {/* Clickable trigger element wrapper */}
      <div onClick={() => setIsOpen((prev) => !prev)} className="cursor-pointer">
        {trigger}
      </div>

      {/* Popover menu card rendered only when isOpen is true */}
      {isOpen && (
        <div
          className={cn(
            'absolute z-40 mt-2 rounded-xl bg-white shadow-lg border border-gray-200/90 py-1.5 focus:outline-none animate-in fade-in zoom-in-95 duration-100',
            alignStyles[align] || alignStyles.right,
            width,
            className
          )}
          // Automatically close dropdown when an item inside is selected
          onClick={() => setIsOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// Individual clickable item row inside a dropdown menu
export function DropdownItem({
  children,
  icon: Icon,
  danger = false,
  onClick,
  className = '',
  disabled = false,
}) {
  // Render item button
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'w-full flex items-center px-3.5 py-2 text-xs font-medium text-left transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
        danger
          ? 'text-red-600 hover:bg-red-50 hover:text-red-700'
          : 'text-gray-700 hover:bg-gray-100/80 hover:text-gray-900',
        className
      )}
    >
      {/* Optional leading icon */}
      {Icon && <Icon className="h-4 w-4 mr-2.5 shrink-0 opacity-70" />}
      {/* Item label content */}
      <span>{children}</span>
    </button>
  );
}

// Visual divider line separating groups of dropdown menu items
export function DropdownDivider() {
  // 1px horizontal hairline separator
  return <div className="my-1 border-t border-gray-100" />;
}

// Export Dropdown as default export
export default Dropdown;
