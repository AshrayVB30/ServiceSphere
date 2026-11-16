// Import React core library and useEffect hook for Escape key handling
import React, { useEffect } from 'react';
// Import X close icon from Lucide
import { X } from 'lucide-react';
// Import class name combination helper
import { cn } from '../../utils/cn';

/**
 * Enterprise Modal / Dialog Component (Apple / Linear Aesthetic)
 * Smooth backdrop blur, clean border, subtle scale animation.
 */
// Modal dialog overlay component
export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  className = '',
}) {
  // Listen for Escape key press and lock background page scrolling when modal is open
  useEffect(() => {
    // Keyboard event listener for Escape key
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    // Prevent document body scrolling when modal is visible
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    // Clean up scroll lock and remove keydown listener when modal unmounts or closes
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Return null if modal is not open to avoid rendering DOM nodes
  if (!isOpen) return null;

  // Max width presets for dialog cards
  const sizeStyles = {
    // Small dialog (e.g. ConfirmDialog)
    sm: 'max-w-md',
    // Standard medium dialog
    md: 'max-w-lg',
    // Large dialog (e.g. TicketCreateModal)
    lg: 'max-w-2xl',
    // Extra large dialog for complex forms or inspectors
    xl: 'max-w-4xl',
  };

  // Render modal dialog and blurred backdrop
  return (
    // Fixed viewport overlay container
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Blurred dark backdrop capturing clicks to dismiss */}
      <div
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Surface Card */}
      <div
        className={cn(
          'relative w-full rounded-xl bg-white shadow-2xl border border-slate-200/90 z-10 transition-all transform animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]',
          sizeStyles[size] || sizeStyles.md,
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header Bar */}
        <div className="flex items-start justify-between px-6 py-4.5 border-b border-slate-100">
          <div>
            {/* Modal Title */}
            {title && (
              <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                {title}
              </h2>
            )}
            {/* Optional sub-caption */}
            {description && (
              <p className="text-xs text-slate-500 mt-1">{description}</p>
            )}
          </div>
          {/* Close button with X icon */}
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Modal Body content */}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>

        {/* Optional Action Footer */}
        {footer && (
          <div className="px-6 py-3.5 bg-slate-50/80 rounded-b-xl border-t border-slate-100 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// Export Modal as default export
export default Modal;
