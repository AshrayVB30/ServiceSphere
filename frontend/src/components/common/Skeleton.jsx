// Import React core library
import React from 'react';
// Import class name combination helper
import { cn } from '../../utils/cn';

/**
 * Enterprise Loading Skeleton Component
 * Soft subtle pulsing placeholder for content blocks during asynchronous operations.
 */
// Skeleton placeholder component
export function Skeleton({ className = '', ...props }) {
  // Render pulsing placeholder div
  return (
    <div
      // Base styling applying CSS pulse animation and neutral background tone
      className={cn(
        'animate-pulse rounded-md bg-gray-200/80',
        className
      )}
      // Forward any extra DOM attributes
      {...props}
    />
  );
}

// Export Skeleton as default export
export default Skeleton;
