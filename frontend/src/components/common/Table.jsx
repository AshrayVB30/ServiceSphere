// Import React core library
import React from 'react';
// Import class name combination helper
import { cn } from '../../utils/cn';
// Import Skeleton component for loading rows placeholder
import { Skeleton } from './Skeleton';

/**
 * Enterprise Data Table Component (Stripe / Linear Precision Aesthetic)
 * Crisp hairline borders, optimal density, consistent tabular alignment.
 */
// Reusable Table component supporting dynamic columns, loading skeletons, and row click handlers
export function Table({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No records found in this view',
  onRowClick,
  className = '',
}) {
  // Render table structure
  return (
    // Outer scrollable card frame
    <div className={cn('w-full overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]', className)}>
      {/* HTML table element */}
      <table className="w-full text-left border-collapse text-xs">
        {/* Table header row */}
        <thead>
          <tr className="border-b border-slate-200/80 bg-slate-50/75">
            {/* Map column definitions into header cells */}
            {columns.map((col, idx) => (
              <th
                key={col.key || idx}
                scope="col"
                className={cn(
                  'px-4.5 py-3 text-[11px] font-semibold text-slate-500 tracking-wider uppercase select-none',
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        {/* Table body content */}
        <tbody className="divide-y divide-slate-100 bg-white">
          {/* 1. Loading state: render 5 skeleton placeholder rows */}
          {loading ? (
            Array.from({ length: 5 }).map((_, rIdx) => (
              <tr key={rIdx}>
                {columns.map((col, cIdx) => (
                  <td key={cIdx} className="px-4.5 py-3">
                    <Skeleton className="h-4 w-3/4 rounded-md" />
                  </td>
                ))}
              </tr>
            ))
          // 2. Empty state: render full-width message cell when data array is empty
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4.5 py-12 text-center text-xs text-slate-500 font-normal"
              >
                <div className="flex flex-col items-center justify-center space-y-1">
                  <span className="text-slate-600 font-medium">{emptyMessage}</span>
                  <span className="text-[11px] text-slate-400">Try adjusting your active filters or search terms.</span>
                </div>
              </td>
            </tr>
          // 3. Data state: render active records
          ) : (
            data.map((row, rowIdx) => (
              <tr
                key={row.id || rowIdx}
                onClick={() => onRowClick && onRowClick(row)}
                className={cn(
                  'transition-colors duration-100 hover:bg-slate-50/70',
                  onRowClick ? 'cursor-pointer' : ''
                )}
              >
                {columns.map((col, colIdx) => (
                  <td
                    key={col.key || colIdx}
                    className={cn(
                      'px-4.5 py-3 text-slate-900 text-xs align-middle leading-normal',
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                      col.cellClassName
                    )}
                  >
                    {/* Execute custom render function if provided; otherwise render raw property value */}
                    {col.render ? col.render(row[col.key], row, rowIdx) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// Export Table as default export
export default Table;
