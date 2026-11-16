/**
 * @file KBArticleDetailPage.jsx
 * @description Knowledge Base article full reader and feedback page.
 * Renders rich Markdown technical documentation, category/author metadata, view counters,
 * interactive feedback voting ("Did this resolve your problem?"), link sharing, and instant publishing for staff.
 */

// Import React library and state/lifecycle hooks
import React, { useState, useEffect } from 'react';
// Import routing hooks and components to extract URL params and navigate between views
import { useParams, Link, useNavigate } from 'react-router-dom';
// Import Lucide icons for breadcrumb back link, feedback votes, counters, and share actions
import { ArrowLeft, Eye, ThumbsUp, ThumbsDown, Share2, Check, Globe } from 'lucide-react';
// Import Button component for standard interactive triggers and action buttons
import { Button } from '../../components/common/Button';
// Import Badge component for category tags and status indicators
import { Badge } from '../../components/common/Badge';
// Import Skeleton loader component for rendering placeholder states while loading
import { Skeleton } from '../../components/common/Skeleton';
// Import MarkdownRenderer component for rendering sanitized, syntax-highlighted Markdown bodies
import { MarkdownRenderer } from '../../components/common/MarkdownRenderer';
// Import custom useAuth hook to inspect permissions (isAdmin, isAgent)
import { useAuth } from '../../hooks/useAuth';
// Import custom useToast hook for interactive feedback alerts
import { useToast } from '../../hooks/useToast';
// Import knowledgeService API client for fetching article details and publishing drafts
import knowledgeService from '../../services/knowledgeService';
// Import centralized route constants
import { ROUTES } from '../../constants';

/**
 * KBArticleDetailPage Component
 * Displays the complete article content, authoring attribution, interactive feedback voting, and share actions.
 */
export function KBArticleDetailPage() {
  // Extract article ID parameter from the active route URL
  const { id } = useParams();
  // Initialize programmatic router navigation function
  const navigate = useNavigate();
  // Initialize toast dispatcher for user feedback
  const toast = useToast();
  // Extract administrative and support agent role flags from auth context
  const { isAdmin, isAgent } = useAuth();

  // State storing the detailed article object retrieved from the backend
  const [article, setArticle] = useState(null);
  // State tracking article fetching lifecycle
  const [loading, setLoading] = useState(true);
  // State tracking whether the current user has already cast a helpful/unhelpful vote
  const [voted, setVoted] = useState(false);
  // State tracking whether the article link has just been copied to the clipboard
  const [copied, setCopied] = useState(false);
  // State tracking whether an article publication request is actively processing
  const [publishing, setPublishing] = useState(false);

  // Load article details whenever the URL route id parameter changes
  useEffect(() => {
    // Asynchronous loader function querying backend for article by ID
    async function load() {
      // Set loading state to true
      setLoading(true);
      try {
        // Query backend for full article data
        const data = await knowledgeService.getArticle(id);
        // Set article state with returned object
        setArticle(data);
      } catch (err) {
        // Display error notification if article lookup fails
        toast.error('Article not found', err.message);
        // Navigate back to the knowledge base index on error
        navigate(ROUTES.KNOWLEDGE_BASE);
      } finally {
        // Deactivate loading state
        setLoading(false);
      }
    }
    // Invoke loader routine
    load();
  }, [id, navigate, toast]); // Dependency array re-runs if article ID or navigation changes

  // Handles publishing a draft article so that it becomes visible in the client portal
  const handlePublish = async () => {
    // Enable publishing spinner
    setPublishing(true);
    try {
      // Call service method to transition article to PUBLISHED
      const updated = await knowledgeService.publishArticle(article.id);
      // Merge updated fields and force status to 'PUBLISHED' in local state
      setArticle((prev) => ({ ...prev, ...updated, status: 'PUBLISHED' }));
      // Notify user with success toast
      toast.success('Article Published', 'This article is now live and accessible to all client users.');
    } catch (err) {
      // Display error notification on publication failure
      toast.error('Failed to publish article', err.message);
    } finally {
      // Clear publishing state
      setPublishing(false);
    }
  };

  // Handles recording user feedback vote (helpful vs unhelpful)
  const handleVote = (isPositive) => {
    // Prevent multiple votes in the same viewing session
    if (voted) return;
    // Mark as voted to disable buttons
    setVoted(true);
    if (isPositive) {
      // Optimistically increment helpful count in local state
      setArticle((prev) => ({ ...prev, helpful_count: (prev.helpful_count || 0) + 1 }));
      // Display thank-you success toast
      toast.success('Feedback Recorded', 'Thank you for helping us improve our documentation.');
    } else {
      // Display informational toast for negative feedback
      toast.info('Feedback Recorded', 'We will review this article for further clarification.');
    }
  };

  // Copies the full canonical article URL to the operating system clipboard
  const handleCopyLink = () => {
    // Write current window location URL to clipboard
    navigator.clipboard.writeText(window.location.href);
    // Set copied state to true to swap icon and label
    setCopied(true);
    // Display confirmation toast
    toast.success('Link Copied', 'Article URL copied to clipboard.');
    // Revert copied state back to false after 2 seconds
    setTimeout(() => setCopied(false), 2000);
  };

  // Render skeleton placeholder cards while fetching article content
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back link skeleton */}
        <Skeleton className="h-6 w-32 rounded-lg" />
        {/* Header card skeleton */}
        <Skeleton className="h-48 rounded-2xl" />
        {/* Markdown body card skeleton */}
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  // Return null if article failed to load and was redirected
  if (!article) return null;

  // Render the full article detail view
  return (
    // Centered content container with max-width layout
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb Navigation Link back to repository index */}
      <div>
        <Link
          to={ROUTES.KNOWLEDGE_BASE}
          className="inline-flex items-center text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          Back to Knowledge Repository
        </Link>
      </div>

      {/* Article Header Card: Title, category, status pill, publish button, share button, and metadata */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between gap-4 mb-3">
          {/* Category badge and live/draft status pill */}
          <div className="flex items-center space-x-2">
            <Badge variant="blue">
              {article.category_name || article.category?.name || 'Technical Documentation'}
            </Badge>
            {/* Conditional status pill rendering live client visibility or draft status */}
            {article.status === 'PUBLISHED' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Globe className="h-3 w-3" /> Live for Clients
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                Draft (Internal Only)
              </span>
            )}
          </div>

          {/* Action buttons: Publish (if draft & staff) and Share Article */}
          <div className="flex items-center space-x-2">
            {(isAdmin || isAgent) && article.status !== 'PUBLISHED' && (
              <Button
                variant="primary"
                size="sm"
                loading={publishing}
                onClick={handlePublish}
                leftIcon={Globe}
              >
                Publish to Client Portal
              </Button>
            )}
            {/* Share Article URL Button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyLink}
              leftIcon={copied ? Check : Share2}
            >
              {copied ? 'Copied' : 'Share Article'}
            </Button>
          </div>
        </div>

        {/* Article Primary Title */}
        <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-snug">
          {article.title}
        </h1>

        {/* Executive summary quote callout */}
        <p className="mt-3 text-xs text-slate-600 leading-relaxed border-l-2 border-blue-600 pl-3 bg-slate-50/50 py-1 rounded-r">
          {article.summary}
        </p>

        {/* Attribution & statistics metadata strip */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          {/* Author and last updated date */}
          <div className="flex items-center space-x-3">
            <span>
              Author:{' '}
              <strong className="text-slate-900 font-semibold">
                {article.author_username || article.author || 'System Staff'}
              </strong>
            </span>
            <span>•</span>
            <span>
              Last Updated:{' '}
              <strong className="text-slate-900 font-semibold">
                {article.updated_at ? new Date(article.updated_at).toLocaleDateString() : 'Recent'}
              </strong>
            </span>
          </div>

          {/* Views count and helpful rating tally */}
          <div className="flex items-center space-x-3">
            <span className="flex items-center gap-1 font-mono text-slate-600">
              <Eye className="h-3.5 w-3.5 text-slate-400" /> {article.views_count != null ? article.views_count : 1} views
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 font-mono text-emerald-700">
              <ThumbsUp className="h-3.5 w-3.5 text-emerald-600" />{' '}
              {article.helpful_count != null ? article.helpful_count : 1} found helpful
            </span>
          </div>
        </div>
      </div>

      {/* Article Markdown Body Card */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        {/* Render sanitized Markdown content with syntax highlighting */}
        <MarkdownRenderer content={article.content} />

        {/* Interactive Helpful Feedback Box */}
        <div className="mt-12 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/60 p-4 rounded-xl">
          <div>
            <p className="text-xs font-semibold text-gray-900">Did this article resolve your problem?</p>
            <p className="text-xs text-gray-500 mt-0.5">Your feedback helps our support engineering team optimize technical content.</p>
          </div>

          {/* Yes / No feedback voting buttons */}
          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={voted}
              leftIcon={ThumbsUp}
              onClick={() => handleVote(true)}
            >
              Yes, it helped
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={voted}
              leftIcon={ThumbsDown}
              onClick={() => handleVote(false)}
            >
              No, need more details
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export KBArticleDetailPage as default export for lazy loading and routing
export default KBArticleDetailPage;
