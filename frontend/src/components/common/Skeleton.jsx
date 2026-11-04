import React from 'react';
import { cn } from '../../utils/cn';

/**
 * Enterprise Loading Skeleton Component
 * Soft subtle pulsing placeholder.
 */
export function Skeleton({ className = '', ...props }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-200/80',
        className
      )}
      {...props}
    />
  );
}

export default Skeleton;

