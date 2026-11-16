// Import React core library
import React from 'react';
// Import AlertTriangle icon from Lucide for warning cue
import { AlertTriangle } from 'lucide-react';
// Import base Modal component
import { Modal } from './Modal';
// Import Button component for confirmation and cancellation actions
import { Button } from './Button';

/**
 * Enterprise Confirmation Dialog Component
 * Used for irreversible operations (deleting, rejecting, deactivating).
 */
// ConfirmDialog component presenting a destructive or critical warning prompt
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone. Please confirm to proceed.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = true,
  loading = false,
}) {
  // Render modal dialog
  return (
    // Base Modal with compact size preset
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      {/* Alert header with icon and message */}
      <div className="flex items-start space-x-4">
        {/* Warning or danger icon container */}
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            danger ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
          }`}
        >
          {/* Alert triangle icon */}
          <AlertTriangle className="h-5 w-5" />
        </div>
        {/* Message container */}
        <div className="flex-1">
          {/* Confirmation dialog title */}
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          {/* Detailed explanatory warning message */}
          <p className="mt-1 text-xs text-gray-500 leading-relaxed">{message}</p>
        </div>
      </div>

      {/* Action buttons footer */}
      <div className="mt-6 flex items-center justify-end space-x-2.5">
        {/* Cancel button */}
        <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        {/* Confirm action button (defaults to red danger variant for destructive actions) */}
        <Button
          variant={danger ? 'danger' : 'primary'}
          size="sm"
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

// Export ConfirmDialog as default export
export default ConfirmDialog;
