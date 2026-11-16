// Import React and hooks for state management and effect triggers
import React, { useState, useEffect } from 'react';
// Import useForm from React Hook Form for form state validation and registration
import { useForm } from 'react-hook-form';
// Import Modal container component
import { Modal } from '../../components/common/Modal';
// Import Button component for submission and cancel actions
import { Button } from '../../components/common/Button';
// Import Input component for subject line
import { Input } from '../../components/common/Input';
// Import Textarea component for issue description
import { Textarea } from '../../components/common/Textarea';
// Import Select component for dropdown options (category, priority, client)
import { Select } from '../../components/common/Select';
// Import useAuth hook to inspect current user role and organization
import { useAuth } from '../../hooks/useAuth';
// Import useToast hook to display success and error notifications
import { useToast } from '../../hooks/useToast';
// Import ticketService to execute ticket creation API request
import ticketService from '../../services/ticketService';
// Import clientService to load client organizations list for staff
import clientService from '../../services/clientService';
// Import priority constants for ticket classification
import { TICKET_PRIORITIES } from '../../constants';

// Help desk category options aligned with common support domains
const CATEGORY_OPTIONS = [
  { value: 'Technical Support', label: 'Technical Support' },
  { value: 'Billing', label: 'Billing & Invoicing' },
  { value: 'Bug', label: 'Software Defect / Bug' },
  { value: 'Feature Request', label: 'Feature Request' },
  { value: 'Account Access', label: 'Account Access & Permissions' },
  { value: 'Network', label: 'Network & Infrastructure' },
];

// Priority selection options mapped to backend SLA thresholds
const PRIORITY_OPTIONS = [
  { value: TICKET_PRIORITIES.LOW, label: 'Low — Standard inquiry' },
  { value: TICKET_PRIORITIES.MEDIUM, label: 'Medium — Moderate impact' },
  { value: TICKET_PRIORITIES.HIGH, label: 'High — Significant impairment' },
  { value: TICKET_PRIORITIES.URGENT, label: 'Urgent — Production outage / Blocker' },
];

/**
 * Enterprise Ticket Creation Modal Component
 * Enables customers and internal staff to create support tickets with SLA categorization.
 */
export function TicketCreateModal({ isOpen, onClose, onCreated }) {
  // Extract user identity and role from authentication context
  const { user } = useAuth();
  // Toast notifications dispatcher
  const toast = useToast();
  // Submission loading state flag
  const [submitting, setSubmitting] = useState(false);
  // List of client organizations available for staff ticket assignment
  const [clients, setClients] = useState([]);
  // Currently selected client ID string
  const [selectedClient, setSelectedClient] = useState('');

  // Flag determining if user has staff privileges to select tenant organization
  const isStaff = user?.role === 'ADMIN' || user?.role === 'SUPPORT_AGENT' || user?.is_superuser;

  // React Hook Form initialization with default values
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      subject: '',
      description: '',
      category: 'Technical Support',
      priority: TICKET_PRIORITIES.MEDIUM,
    },
  });

  // Load client organizations list when staff opens modal
  useEffect(() => {
    // Only fetch clients if user is staff and modal is visibly open
    if (isStaff && isOpen) {
      clientService
        .getClients()
        .then((res) => {
          const list = res || [];
          setClients(list);
          // Set initial default client selection if not already chosen
          if (list.length > 0 && !selectedClient) {
            setSelectedClient(String(list[0].id));
          }
        })
        .catch(() => {});
    }
  }, [isStaff, isOpen, selectedClient]);

  // Form submission handler creating ticket on backend
  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      // Build sanitized ticket creation payload
      const payload = {
        subject: data.subject.trim(),
        description: data.description.trim(),
        category: data.category,
        priority: data.priority,
      };

      // Assign client organization from staff selector or user's bound client account
      if (selectedClient) {
        payload.client = parseInt(selectedClient, 10);
      } else if (user?.client) {
        payload.client = user.client.id || user.client;
      }

      // Submit ticket to backend API
      const created = await ticketService.createTicket(payload);

      // Display success notification
      toast.success(
        'Ticket Created Successfully',
        `Ticket ${created.ticket_number || `#${created.id}`} is now assigned to the triage queue.`
      );

      // Reset form fields
      reset();
      // Close modal dialog
      onClose();
      // Notify parent component with newly created ticket record
      if (onCreated) onCreated(created);
    } catch (err) {
      // Display error notification on submission failure
      toast.error('Failed to create ticket', err.message);
    } finally {
      // Reset loading flag
      setSubmitting(false);
    }
  };

  // Render modal dialog
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Support Ticket"
      description="Submit a service request or technical incident to the ServiceSphere help desk."
      size="lg"
      footer={
        <>
          {/* Cancel button */}
          <Button variant="secondary" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          {/* Submit button triggering form submission */}
          <Button
            variant="primary"
            size="sm"
            loading={submitting}
            onClick={handleSubmit(onSubmit)}
          >
            Submit Ticket
          </Button>
        </>
      }
    >
      {/* Ticket creation form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Organization selector visible only to staff users */}
        {isStaff && clients.length > 0 && (
          <Select
            label="Client Organization"
            options={clients.map((c) => ({
              value: String(c.id),
              label: `${c.name} (${c.code || c.tier || 'Client'})`,
            }))}
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
          />
        )}

        {/* Issue Subject line input */}
        <Input
          label="Subject / Summary"
          placeholder="Brief summary of the issue..."
          required
          error={errors.subject?.message}
          {...register('subject', { required: 'Subject is required' })}
        />

        {/* Category and Priority selectors in 2-column layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Category dropdown */}
          <Select
            label="Category"
            options={CATEGORY_OPTIONS}
            required
            error={errors.category?.message}
            {...register('category', { required: 'Category is required' })}
          />

          {/* Priority dropdown */}
          <Select
            label="Priority Level"
            options={PRIORITY_OPTIONS}
            required
            error={errors.priority?.message}
            {...register('priority', { required: 'Priority is required' })}
          />
        </div>

        {/* Detailed markdown-supported description textarea */}
        <Textarea
          label="Detailed Description"
          placeholder="Provide step-by-step reproduction details, error messages, and expected outcome..."
          rows={5}
          required
          error={errors.description?.message}
          {...register('description', {
            required: 'Detailed description is required',
            minLength: { value: 10, message: 'Please provide at least 10 characters of detail' },
          })}
        />
      </form>
    </Modal>
  );
}

// Export TicketCreateModal as default export
export default TicketCreateModal;
