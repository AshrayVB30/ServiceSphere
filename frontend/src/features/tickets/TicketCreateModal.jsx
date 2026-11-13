import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Textarea } from '../../components/common/Textarea';
import { Select } from '../../components/common/Select';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import ticketService from '../../services/ticketService';
import clientService from '../../services/clientService';
import { TICKET_PRIORITIES } from '../../constants';

const CATEGORY_OPTIONS = [
  { value: 'Technical Support', label: 'Technical Support' },
  { value: 'Billing', label: 'Billing & Invoicing' },
  { value: 'Bug', label: 'Software Defect / Bug' },
  { value: 'Feature Request', label: 'Feature Request' },
  { value: 'Account Access', label: 'Account Access & Permissions' },
  { value: 'Network', label: 'Network & Infrastructure' },
];

const PRIORITY_OPTIONS = [
  { value: TICKET_PRIORITIES.LOW, label: 'Low — Standard inquiry' },
  { value: TICKET_PRIORITIES.MEDIUM, label: 'Medium — Moderate impact' },
  { value: TICKET_PRIORITIES.HIGH, label: 'High — Significant impairment' },
  { value: TICKET_PRIORITIES.URGENT, label: 'Urgent — Production outage / Blocker' },
];

export function TicketCreateModal({ isOpen, onClose, onCreated }) {
  const { user } = useAuth();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');

  const isStaff = user?.role === 'ADMIN' || user?.role === 'SUPPORT_AGENT' || user?.is_superuser;

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

  useEffect(() => {
    if (isStaff && isOpen) {
      clientService
        .getClients()
        .then((res) => {
          const list = res || [];
          setClients(list);
          if (list.length > 0 && !selectedClient) {
            setSelectedClient(String(list[0].id));
          }
        })
        .catch(() => {});
    }
  }, [isStaff, isOpen, selectedClient]);

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const payload = {
        subject: data.subject.trim(),
        description: data.description.trim(),
        category: data.category,
        priority: data.priority,
      };

      if (selectedClient) {
        payload.client = parseInt(selectedClient, 10);
      } else if (user?.client) {
        payload.client = user.client.id || user.client;
      }

      const created = await ticketService.createTicket(payload);

      toast.success(
        'Ticket Created Successfully',
        `Ticket ${created.ticket_number || `#${created.id}`} is now assigned to the triage queue.`
      );

      reset();
      onClose();
      if (onCreated) onCreated(created);
    } catch (err) {
      toast.error('Failed to create ticket', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Support Ticket"
      description="Submit a service request or technical incident to the ServiceSphere help desk."
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

        <Input
          label="Subject / Summary"
          placeholder="Brief summary of the issue..."
          required
          error={errors.subject?.message}
          {...register('subject', { required: 'Subject is required' })}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Category"
            options={CATEGORY_OPTIONS}
            required
            error={errors.category?.message}
            {...register('category', { required: 'Category is required' })}
          />

          <Select
            label="Priority Level"
            options={PRIORITY_OPTIONS}
            required
            error={errors.priority?.message}
            {...register('priority', { required: 'Priority is required' })}
          />
        </div>

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

export default TicketCreateModal;

