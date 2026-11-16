// Import React core library
import React from 'react';
// Import ChevronLeft and ChevronRight icons from Lucide
import { ChevronLeft, ChevronRight } from 'lucide-react';
// Import Button component for pagination navigation controls
import { Button } from './Button';
// Import class name combination helper
import { cn } from '../../utils/cn';

/**
 * Enterprise Pagination Component
 * Displays item count range and controls for paginated tables and queues.
 */
export function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalItems,
  pageSize = 10,
  onPageChange,
  className = '',
}) {
  // Calculate 1-based start index of current page slice
  const startItem = (currentPage - 1) * pageSize + 1;
  // Calculate 1-based end index of current page slice bounded by totalItems
  const endItem = Math.min(currentPage * pageSize, totalItems || currentPage * pageSize);

  // Render pagination controls
  return (
    // Flexbox wrapper dividing summary count and page navigation buttons
    <div
      className={cn(
        'flex items-center justify-between px-2 py-3.5 select-none',
        className
      )}
    >
      {/* Summary label */}
      <div className="text-xs text-gray-500">
        {totalItems ? (
          <span>
            Showing <strong className="font-semibold text-gray-800">{startItem}</strong> to{' '}
            <strong className="font-semibold text-gray-800">{endItem}</strong> of{' '}
            <strong className="font-semibold text-gray-800">{totalItems}</strong> entries
          </span>
        ) : (
          <span>Page {currentPage} of {totalPages}</span>
        )}
      </div>

      {/* Navigation action buttons */}
      <div className="flex items-center space-x-1.5">
        {/* Previous page button */}
        <Button
          variant="secondary"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          leftIcon={ChevronLeft}
        >
          Previous
        </Button>

        {/* Current page indicator */}
        <span className="px-2.5 text-xs font-semibold text-gray-700">
          {currentPage} / {totalPages}
        </span>

        {/* Next page button */}
        <Button
          variant="secondary"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          rightIcon={ChevronRight}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

// Export Pagination as default export
export default Pagination;
