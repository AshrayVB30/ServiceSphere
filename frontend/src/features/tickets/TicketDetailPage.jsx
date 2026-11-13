import React, { useState, useEffect, useCallback } from 'react';
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
  AlertCircle,
  RotateCw,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Textarea } from '../../components/common/Textarea';
import { Select } from '../../components/common/Select';
import { Checkbox } from '../../components/common/Checkbox';
import { StatusBadge } from '../../components/feedback/StatusBadge';
import { PriorityBadge } from '../../components/feedback/PriorityBadge';
import { Skeleton } from '../../components/common/Skeleton';
import { MarkdownRenderer } from '../../components/common/MarkdownRenderer';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { ticketService } from '../../services/ticketService';
import { TICKET_STATUSES, ROUTES } from '../../constants';

const STATUS_OPTIONS = [
  { value: TICKET_STATUSES.OPEN, label: 'Open' },
  { value: TICKET_STATUSES.IN_PROGRESS, label: 'In Progress' },
  { value: TICKET_STATUSES.AWAITING_CUSTOMER, label: 'Awaiting Customer' },
  { value: TICKET_STATUSES.RESOLVED, label: 'Resolved' },
  { value: TICKET_STATUSES.CLOSED, label: 'Closed' },
];

/**
 * Ticket Detail & Resolution Workspace Component
 * Loads full incident details, conversation feed, internal notes, and SLA status from the backend.
 */
export function TicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, isAgent } = useAuth();
  const toast = useToast();

  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [slaData, setSlaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('comments'); // 'comments' | 'history'

  // New comment state
  const [commentText, setCommentText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  const fetchTicketDetails = useCallback(async () => {
    if (!id || id === 'new') {
      navigate('/tickets', { replace: true });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [ticketRes, commentsRes, slaRes] = await Promise.all([
        ticketService.getTicket(id),
        ticketService.getComments(id).catch(() => []),
        ticketService.getSLA(id).catch(() => null),
      ]);
      setTicket(ticketRes);
      setComments(Array.isArray(commentsRes) ? commentsRes : commentsRes?.results || []);
      setSlaData(slaRes);
    } catch (err) {
      setError(err.message || 'Ticket not found.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTicketDetails();
  }, [fetchTicketDetails]);

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
      const updated = await ticketService.assignTicket(ticket.id, user.id);
      setTicket(updated);
      toast.success('Ticket Assigned', 'Ticket assigned to you.');
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
        message: commentText,
        is_internal: isInternal,
      });

      setComments((prev) => [...prev, newComment]);
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

  if (error || !ticket) {
    return (
      <div className="p-6 rounded-xl border border-rose-200 bg-rose-50/70 text-rose-900 space-y-3">
        <div className="flex items-center space-x-2 font-semibold text-sm">
          <AlertCircle className="h-4 w-4 text-rose-600" />
          <span>Ticket Not Found</span>
        </div>
        <p className="text-xs text-rose-700">{error || 'Requested ticket ID does not exist.'}</p>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={fetchTicketDetails} leftIcon={RotateCw}>
            Retry
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.TICKETS)}>
            Back to Queue
          </Button>
        </div>
      </div>
    );
  }

  // Filter comments: Client users do not see internal staff notes
  const visibleComments = comments.filter((c) => {
    if (!c.is_internal) return true;
    return isAdmin || isAgent;
  });

  const creatorName =
    ticket.created_by_username ||
    ticket.created_by?.first_name ||
    ticket.created_by?.username ||
    'Customer';
  const clientName = ticket.client_name || ticket.client?.name || 'Client Organization';
  const assigneeName =
    ticket.assigned_to_username ||
    (ticket.assigned_to?.first_name
      ? `${ticket.assigned_to.first_name} ${ticket.assigned_to.last_name || ''}`
      : ticket.assigned_to?.username);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          to={ROUTES.TICKETS}
          className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
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
              Filed by <strong className="text-slate-800 font-semibold">{creatorName}</strong> ({clientName}) on {new Date(ticket.created_at).toLocaleString()}
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

      {/* Main Grid: Details + Timeline (Left 2 cols) & Metadata Inspector (Right 1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Issue Description Card */}
          <Card title="Incident Scope & Description">
            <MarkdownRenderer content={ticket.description} />
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
                    visibleComments.map((c) => {
                      const author = c.author_username || c.author?.username || 'Staff Specialist';
                      const message = c.message || c.comment || '';
                      return (
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
                                {author[0]}
                              </div>
                              <span className="text-xs font-semibold text-slate-900">
                                {author}
                              </span>
                              {c.author_role && (
                                <span className="text-[10px] text-slate-500 uppercase font-mono px-1.5 py-0.2 bg-slate-200/60 rounded">
                                  {c.author_role}
                                </span>
                              )}
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
                            {message}
                          </p>
                        </div>
                      );
                    })
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
                  {(ticket.history || []).length === 0 ? (
                    <p className="text-xs text-slate-400 py-3">No audit history entries recorded.</p>
                  ) : (
                    ticket.history.map((h) => (
                      <div key={h.id} className="relative pl-6">
                        <div className="absolute -left-1.5 top-1 h-3 w-3 rounded-full border-2 border-white bg-blue-600 shadow-2xs" />
                        <p className="text-xs font-semibold text-slate-900">{h.details || h.action}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          By {h.performed_by_username || h.performed_by} • {new Date(h.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Unified Metadata Inspector */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] divide-y divide-slate-100">
          {/* Section: SLA Tracking */}
          <div className="p-4.5 space-y-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              SLA Governance
            </span>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Policy Tier:</span>
              <span className="font-semibold text-slate-900">
                {slaData?.policy_name || `${ticket.priority} SLA Policy`}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Target Deadline:</span>
              <span className="font-mono text-slate-900 font-medium flex items-center gap-1">
                <Clock className="h-3 w-3 text-blue-600" />
                {slaData?.resolution_deadline
                  ? new Date(slaData.resolution_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'Active'}
              </span>
            </div>
            <div className="pt-1 flex items-center justify-between">
              <span className="text-xs text-slate-500">Compliance State:</span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                  slaData?.is_resolution_breached
                    ? 'text-rose-700 bg-rose-50 border-rose-200/80'
                    : 'text-emerald-700 bg-emerald-50 border border-emerald-200/80'
                }`}
              >
                {slaData?.is_resolution_breached ? 'Breached' : 'Compliant'}
              </span>
            </div>
          </div>

          {/* Section: Assigned Specialist */}
          <div className="p-4.5 space-y-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Assigned Ownership
            </span>
            {assigneeName ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-center uppercase">
                    {assigneeName[0]}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{assigneeName}</p>
                    <p className="text-xs text-slate-500">Assigned Support Specialist</p>
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
                <p className="text-xs font-semibold text-slate-900">{clientName}</p>
                <p className="text-xs text-slate-500">Tenant Account</p>
              </div>
            </div>
          </div>

          {/* Section: Linked Knowledge Base Articles */}
          <div className="p-4.5 space-y-2.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Recommended Knowledge
            </span>
            <Link
              to={ROUTES.KNOWLEDGE_BASE}
              className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 hover:bg-slate-100/70 hover:border-slate-200 transition-colors block text-left"
            >
              <p className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 shrink-0" />
                Runbooks & Documentation
              </p>
              <p className="text-xs text-slate-500 mt-1">Verified diagnostic procedures</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TicketDetailPage;
