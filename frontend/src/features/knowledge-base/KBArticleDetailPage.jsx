import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, ThumbsUp, ThumbsDown, Share2, Check, Globe } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Skeleton } from '../../components/common/Skeleton';
import { MarkdownRenderer } from '../../components/common/MarkdownRenderer';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import knowledgeService from '../../services/knowledgeService';
import { ROUTES } from '../../constants';

export function KBArticleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { isAdmin, isAgent } = useAuth();

  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [voted, setVoted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await knowledgeService.getArticle(id);
        setArticle(data);
      } catch (err) {
        toast.error('Article not found', err.message);
        navigate(ROUTES.KNOWLEDGE_BASE);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, navigate, toast]);

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const updated = await knowledgeService.publishArticle(article.id);
      setArticle((prev) => ({ ...prev, ...updated, status: 'PUBLISHED' }));
      toast.success('Article Published', 'This article is now live and accessible to all client users.');
    } catch (err) {
      toast.error('Failed to publish article', err.message);
    } finally {
      setPublishing(false);
    }
  };

  const handleVote = (isPositive) => {
    if (voted) return;
    setVoted(true);
    if (isPositive) {
      setArticle((prev) => ({ ...prev, helpful_count: (prev.helpful_count || 0) + 1 }));
      toast.success('Feedback Recorded', 'Thank you for helping us improve our documentation.');
    } else {
      toast.info('Feedback Recorded', 'We will review this article for further clarification.');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success('Link Copied', 'Article URL copied to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-6 w-32 rounded-lg" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (!article) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          to={ROUTES.KNOWLEDGE_BASE}
          className="inline-flex items-center text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          Back to Knowledge Repository
        </Link>
      </div>

      {/* Article Header Card */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center space-x-2">
            <Badge variant="blue">
              {article.category_name || article.category?.name || 'Technical Documentation'}
            </Badge>
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

        <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-snug">
          {article.title}
        </h1>

        <p className="mt-3 text-xs text-slate-600 leading-relaxed border-l-2 border-blue-600 pl-3 bg-slate-50/50 py-1 rounded-r">
          {article.summary}
        </p>

        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
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

      {/* Article Markdown Body */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <MarkdownRenderer content={article.content} />

        {/* Helpful Feedback Box */}
        <div className="mt-12 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/60 p-4 rounded-xl">
          <div>
            <p className="text-xs font-semibold text-gray-900">Did this article resolve your problem?</p>
            <p className="text-xs text-gray-500 mt-0.5">Your feedback helps our support engineering team optimize technical content.</p>
          </div>

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

export default KBArticleDetailPage;
