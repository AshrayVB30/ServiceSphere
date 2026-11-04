import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, ThumbsUp, ThumbsDown, Share2, Check } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Skeleton } from '../../components/common/Skeleton';
import { useToast } from '../../hooks/useToast';
import knowledgeService from '../../services/knowledgeService';
import { ROUTES } from '../../constants';

export function KBArticleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [voted, setVoted] = useState(false);
  const [copied, setCopied] = useState(false);

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
          <Badge variant="blue">{article.category?.name}</Badge>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopyLink}
            leftIcon={copied ? Check : Share2}
          >
            {copied ? 'Copied' : 'Share Article'}
          </Button>
        </div>

        <h1 className="text-xl font-semibold tracking-tight text-slate-900 leading-snug">
          {article.title}
        </h1>

        <p className="mt-3 text-xs text-slate-500 leading-relaxed border-l-2 border-slate-900 pl-3">
          {article.summary}
        </p>

        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center space-x-3">
            <span>Author: <strong className="text-slate-900 font-semibold">{article.author}</strong></span>
            <span>•</span>
            <span>Last Updated: <strong className="text-slate-900 font-semibold">{new Date(article.updated_at).toLocaleDateString()}</strong></span>
          </div>

          <div className="flex items-center space-x-3">
            <span className="flex items-center gap-1 font-mono">
              <Eye className="h-3.5 w-3.5 text-slate-400" /> {article.views_count} views
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 font-mono">
              <ThumbsUp className="h-3.5 w-3.5 text-emerald-600" /> {article.helpful_count} found helpful
            </span>
          </div>
        </div>
      </div>

      {/* Article Markdown Body */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="prose prose-sm max-w-none text-xs text-slate-700 leading-relaxed whitespace-pre-line font-sans">
          {article.content}
        </div>

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
