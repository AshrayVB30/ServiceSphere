// Import React and hooks for state, effect, and memoized callbacks
import React, { useState, useEffect, useCallback } from 'react';
// Import useNavigate for programatic routing to ticket detail pages
import { useNavigate } from 'react-router-dom';
// Import Plus, Search, and RotateCw icons from Lucide
import { Plus, Search, RotateCw } from 'lucide-react';
// Import common Button component
import { Button } from '../../components/common/Button';
// Import common Table component
import { Table } from '../../components/common/Table';
// Import common Select component
import { Select } from '../../components/common/Select';
// Import feedback StatusBadge component
import { StatusBadge } from '../../components/feedback/StatusBadge';
// Import feedback PriorityBadge component
import { PriorityBadge } from '../../components/feedback/PriorityBadge';
// Import TicketCreateModal dialog component
import { TicketCreateModal } from './TicketCreateModal';
// Import ticketService to execute ticket querying
import ticketService from '../../services/ticketService';
// Import ticket status, priority, and route constants
import { TICKET_STATUSES, TICKET_PRIORITIES, ROUTES } from '../../constants';

// Lifecycle status tabs configuration array defined outside component to avoid re-creation
const STATUS_TABS = [
  { label: 'All Tickets', value: 'ALL' },
  { label: 'Open', value: TICKET_STATUSES.OPEN },
  { label: 'In Progress', value: TICKET_STATUSES.IN_PROGRESS },
  { label: 'Awaiting Customer', value: TICKET_STATUSES.AWAITING_CUSTOMER },
  { label: 'Resolved', value: TICKET_STATUSES.RESOLVED },
  { label: 'Closed', value: TICKET_STATUSES.CLOSED },
];

// Priority filter options array
const PRIORITY_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Priorities' },
  { value: TICKET_PRIORITIES.LOW, label: 'Low Priority' },
  { value: TICKET_PRIORITIES.MEDIUM, label: 'Medium Priority' },
  { value: TICKET_PRIORITIES.HIGH, label: 'High Priority' },
  { value: TICKET_PRIORITIES.URGENT, label: 'Urgent Priority' },
];

/**
 * Enterprise Ticket Queue and Management View
 * Allows browsing, searching, filtering, and assigning support tickets.
 */
export function TicketListPage() {
  // Navigation hook
  const navigate = useNavigate();

  // State storing fetched tickets array
  const [tickets, setTickets] = useState([]);
  // Loading state flag during ticket fetch
  const [loading, setLoading] = useState(true);
  // Active status tab filter ('ALL' or specific status)
  const [activeTab, setActiveTab] = useState('ALL');
  // Free-text search query string
  const [searchQuery, setSearchQuery] = useState('');
  // Selected priority filter ('ALL' or specific priority)
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  // Modal visibility flag for ticket creation
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Memoized ticket fetch handler with query parameters
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      // Query ticket service with active filter criteria
      const data = await ticketService.getTickets({
        status: activeTab,
        priority: priorityFilter,
        search: searchQuery,
      });
      // Store returned tickets array in state
      setTickets(data);
    } finally {
      // Turn off loading indicator
      setLoading(false);
    }
  }, [activeTab, priorityFilter, searchQuery]);

  // Refetch tickets whenever active filters change
  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Data table column schema definitions
  const columns = [
    {
      key: 'ticket_number',
      header: 'Ticket ID',
      render: (val) => (
        <span className="font-mono text-xs font-semibold text-blue-600 hover:underline">
          {val}
        </span>
      ),
    },
    {
      key: 'subject',
      header: 'Subject & Client',
      render: (val, row) => (
        <div className="py-0.5">
          <p className="font-semibold text-gray-900 text-xs hover:text-blue-600 transition-colors">
            {val}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {row.client?.name || row.client}
          </p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (val) => (
        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded font-medium">
          {val || 'General'}
        </span>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (val) => <PriorityBadge priority={val} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: 'assigned_to',
      header: 'Assigned Agent',
      render: (val) => (
        <span className="text-xs text-gray-900 font-medium">
          {val?.first_name ? `${val.first_name} ${val.last_name || ''}` : val?.username || 'Unassigned'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      align: 'right',
      render: (val) => (
        <span className="text-xs text-gray-500">
          {new Date(val).toLocaleDateString()}
        </span>
      ),
    },
  ];

  // Render ticket list workspace layout
  return (
    <div className="space-y-5">
      {/* Top Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Enterprise Ticket Queue
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Browse, filter, assign, and track customer incidents through resolution workflows.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchTickets}
            leftIcon={RotateCw}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            leftIcon={Plus}
          >
            Create Ticket
          </Button>
        </div>
      </div>

      {/* Unified Operations Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-3">
        {/* Status navigation tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 scrollbar-none border-b border-slate-100">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === tab.value
                  ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Priority Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by subject, #ticket, client organization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50/60 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none transition-colors"
            />
          </div>

          <div className="w-full sm:w-48">
            <Select
              options={PRIORITY_FILTER_OPTIONS}
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Ticket Queue Data Table */}
      <Table
        columns={columns}
        data={tickets}
        loading={loading}
        onRowClick={(row) => navigate(ROUTES.TICKET_DETAIL(row.id))}
      />

      {/* Create Ticket Modal Dialog */}
      <TicketCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={(newTicket) => {
          setTickets((prev) => [newTicket, ...prev]);
        }}
      />
    </div>
  );
}

// Export TicketListPage as default export
export default TicketListPage;
