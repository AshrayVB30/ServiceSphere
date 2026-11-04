import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Building2,
  Send,
  Lock,
  History,
  MessageSquare,
  FileText,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Textarea } from '../../components/common/Textarea';
import { Select } from '../../components/common/Select';
import { Checkbox } from '../../components/common/Checkbox';
import { StatusBadge } from '../../components/feedback/StatusBadge';
import { PriorityBadge } from '../../components/feedback/PriorityBadge';
import { Skeleton } from '../../components/common/Skeleton';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import ticketService from '../../services/ticketService';
import { TICKET_STATUSES, ROUTES } from '../../constants';

const STATUS_OPTIONS = [
  { value: TICKET_STATUSES.OPEN, label: 'Open' },
  { value: TICKET_STATUSES.IN_PROGRESS, label: 'In Progress' },
  { value: TICKET_STATUSES.AWAITING_CUSTOMER, label: 'Awaiting Customer' },
  { value: TICKET_STATUSES.RESOLVED, label: 'Resolved' },
  { value: TICKET_STATUSES.CLOSED, label: 'Closed' },
];

export function TicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, isAgent } = useAuth();
  const toast = useToast();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('comments'); // 'comments' | 'history'

  // New comment state
  const [commentText, setCommentText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    async function fetchTicket() {
      setLoading(true);
      try {
        const data = await ticketService.getTicket(id);
        setTicket(data);
      } catch (err) {
        toast.error('Ticket not found', err.message);
        navigate(ROUTES.TICKETS);
      } finally {
        setLoading(false);
      }
    }
    fetchTicket();
  }, [id, navigate, toast]);

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    try {
      const updated = await ticketService.changeStatus(ticket.id, newStatus);
      setTicket(updated);
      toast.success('Status Updated', `Ticket marked as ${newStatus.replace('_', ' ')}.`);
    } catch (err) {
      toast.error('Failed to update status', err.message);
    }
  };

  const handleAssignToMe = async () => {
    try {
      const updated = await ticketService.assignTicket(ticket.id, user);
      setTicket(updated);
      toast.success('Ticket Assigned', `Ticket assigned to you.`);
    } catch (err) {
      toast.error('Failed to assign ticket', err.message);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setSubmittingComment(true);
    try {
      const newComment = await ticketService.addComment(ticket.id, {
        comment: commentText,
        is_internal: isInternal,
        author: user,
      });

      setTicket((prev) => ({
        ...prev,
        comments: [...prev.comments, newComment],
      }));

      setCommentText('');
      setIsInternal(false);
      toast.success(
        isInternal ? 'Internal Note Logged' : 'Reply Dispatched',
        isInternal
          ? 'Only support staff and administrators can view this note.'
          : 'Customer notified of ticket update.'
      );
    } catch (err) {
      toast.error('Failed to add comment', err.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-32 rounded-lg" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!ticket) return null;

  // Filter comments: Client users do not see internal notes
  const visibleComments = ticket.comments?.filter((c) => {
    if (!c.is_internal) return true;
    return isAdmin || isAgent;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          to={ROUTES.TICKETS}
          className="inline-flex items-center text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          Back to Ticket Queue
        </Link>
      </div>

      {/* Ticket Header Banner */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2.5">
              <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                {ticket.ticket_number}
              </span>
              <PriorityBadge priority={ticket.priority} />
              <StatusBadge status={ticket.status} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {ticket.subject}
            </h1>
            <p className="text-xs text-slate-500">
              Filed by <strong className="text-slate-800 font-semibold">{ticket.created_by?.first_name} {ticket.created_by?.last_name || ticket.created_by?.username}</strong> ({ticket.client?.name}) on {new Date(ticket.created_at).toLocaleString()}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {(isAdmin || isAgent) && (
              <div className="w-48">
                <Select
                  options={STATUS_OPTIONS}
                  value={ticket.status}
                  onChange={handleStatusChange}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Details + Timeline (Left 2 cols) & Unified Metadata Inspector (Right 1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Issue Description Card */}
          <Card title="Incident Scope & Description">
            <div className="prose prose-sm max-w-none text-xs text-slate-800 leading-relaxed whitespace-pre-line font-sans">
              {ticket.description}
            </div>
          </Card>

          {/* Activity / Conversation Tabs */}
          <div className="rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
            <div className="flex items-center border-b border-slate-100 px-5 pt-3">
              <button
                type="button"
                onClick={() => setActiveTab('comments')}
                className={`pb-3 text-xs font-semibold border-b-2 mr-6 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'comments'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                Conversation & Updates ({visibleComments.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`pb-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'history'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <History className="h-4 w-4" />
                Audit Trail ({ticket.history?.length || 0})
              </button>
            </div>

            {/* Conversation Tab Content */}
            {activeTab === 'comments' ? (
              <div className="p-5 space-y-5">
                {/* Comments feed */}
                <div className="space-y-3.5">
                  {visibleComments.length === 0 ? (
                    <p className="text-center py-6 text-xs text-slate-400">
                      No replies logged yet. Start the conversation below.
                    </p>
                  ) : (
                    visibleComments.map((c) => (
                      <div
                        key={c.id}
                        className={`rounded-xl p-3.5 border transition-colors ${
                          c.is_internal
                            ? 'bg-amber-50/70 border-amber-200/80 text-amber-950'
                            : 'bg-slate-50/70 border-slate-200/80 text-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div className="h-6 w-6 rounded-full bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center uppercase">
                              {c.author?.first_name?.[0] || c.author?.username?.[0] || 'U'}
                            </div>
                            <span className="text-xs font-semibold text-slate-900">
                              {c.author?.first_name ? `${c.author.first_name} ${c.author.last_name || ''}` : c.author?.username}
                            </span>
                            {c.is_internal && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded">
                                <Lock className="h-3 w-3" />
                                Internal Staff Note
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-500">
                            {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line pl-8">
                          {c.comment}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Comment Input Form */}
                <form onSubmit={handleAddComment} className="pt-4 border-t border-slate-100 space-y-3">
                  <Textarea
                    placeholder="Type your reply to the customer or log internal investigation notes..."
                    rows={3}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  />

                  <div className="flex items-center justify-between">
                    {(isAdmin || isAgent) ? (
                      <Checkbox
                        label="Log as Internal Staff Note"
                        description="Hidden from client; visible only to support staff and administrators"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                      />
                    ) : (
                      <div />
                    )}

                    <Button
                      type="submit"
                      variant={isInternal ? 'warning' : 'primary'}
                      size="sm"
                      loading={submittingComment}
                      leftIcon={isInternal ? Lock : Send}
                    >
                      {isInternal ? 'Add Internal Note' : 'Send Public Reply'}
                    </Button>
                  </div>
                </form>
              </div>
            ) : (
              /* Audit History Tab Content */
              <div className="p-5">
                <div className="relative border-l-2 border-slate-200 ml-3 space-y-5">
                  {ticket.history?.map((h) => (
                    <div key={h.id} className="relative pl-6">
                      <div className="absolute -left-1.5 top-1 h-3 w-3 rounded-full border-2 border-white bg-blue-600 shadow-2xs" />
                      <p className="text-xs font-semibold text-slate-900">{h.details}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        By {h.performed_by} • {new Date(h.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Unified Metadata Inspector (Replaces 4 disjointed small cards) */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] divide-y divide-slate-100">
          {/* Section: SLA Tracking */}
          <div className="p-4.5 space-y-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              SLA Governance
            </span>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Policy Tier:</span>
              <span className="font-semibold text-slate-900">{ticket.sla?.policy_name || 'Standard SLA'}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Target Deadline:</span>
              <span className="font-mono text-slate-900 font-medium flex items-center gap-1">
                <Clock className="h-3 w-3 text-blue-600" />
                {new Date(ticket.sla?.resolution_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="pt-1 flex items-center justify-between">
              <span className="text-xs text-slate-500">Compliance State:</span>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80">
                Compliant
              </span>
            </div>
          </div>

          {/* Section: Assigned Specialist */}
          <div className="p-4.5 space-y-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Assigned Ownership
            </span>
            {ticket.assigned_to ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-center uppercase">
                    {ticket.assigned_to.first_name?.[0] || 'A'}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900">
                      {ticket.assigned_to.first_name} {ticket.assigned_to.last_name}
                    </p>
                    <p className="text-xs text-slate-500">Tier 1 Support Specialist</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200/70 font-medium">
                  Ticket currently in unassigned triage queue
                </p>
                {(isAdmin || isAgent) && (
                  <Button variant="secondary" size="sm" onClick={handleAssignToMe} className="w-full">
                    Assign to Me
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Section: Client Organization */}
          <div className="p-4.5 space-y-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Client Tenant Info
            </span>
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">{ticket.client?.name}</p>
                <p className="text-xs text-slate-500">Enterprise Tenant Account</p>
              </div>
            </div>
          </div>

          {/* Section: Linked Knowledge Base Articles */}
          <div className="p-4.5 space-y-2.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Recommended Knowledge Article
            </span>
            <Link
              to={ROUTES.KNOWLEDGE_BASE}
              className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 hover:bg-slate-100/70 hover:border-slate-200 transition-colors block text-left"
            >
              <p className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 shrink-0" />
                SAML SSO Latency & Cluster Troubleshooting
              </p>
              <p className="text-xs text-slate-500 mt-1">Verified diagnostic documentation</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TicketDetailPage;

