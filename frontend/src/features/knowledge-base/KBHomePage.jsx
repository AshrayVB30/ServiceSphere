import React, { useState, useEffect, useCallback } from 'react';
import { Search, BookOpen, Plus, Eye, ThumbsUp, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '../../components/common/Skeleton';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Textarea } from '../../components/common/Textarea';
import { Select } from '../../components/common/Select';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import knowledgeService from '../../services/knowledgeService';
import { ROUTES } from '../../constants';

export function KBHomePage() {
  const { user, isAdmin, isAgent } = useAuth();
  const toast = useToast();

  const [categories, setCategories] = useState([]);
  const [articles, setArticles] = useState([]);
  const [selectedCat, setSelectedCat] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Authoring modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('1');
  const [formSummary, setFormSummary] = useState('');
  const [formContent, setFormContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [catList, artList] = await Promise.all([
        knowledgeService.getCategories(),
        knowledgeService.getArticles({ categoryId: selectedCat, search }),
      ]);
      setCategories(catList);
      setArticles(artList);
    } finally {
      setLoading(false);
    }
  }, [selectedCat, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await knowledgeService.createArticle(
        {
          title: formTitle,
          category_id: formCategory,
          summary: formSummary,
          content: formContent,
        },
        user
      );
      setArticles((prev) => [created, ...prev]);
      toast.success('Article Published', `${formTitle} is now accessible in the repository.`);
      setIsCreateOpen(false);
      setFormTitle('');
      setFormSummary('');
      setFormContent('');
    } catch (err) {
      toast.error('Publication failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Documentation Center Header & Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/70">
              <BookOpen className="h-3.5 w-3.5 text-blue-600" />
              Verified Knowledge Base
            </span>
            <span className="text-xs text-slate-500 font-mono">Technical Guides & Runbooks</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Troubleshooting Procedures & System Architecture
          </h1>
          <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
            Search verified diagnosis procedures, incident remediation runbooks, and enterprise integration references.
          </p>
        </div>

        <div className="w-full md:w-80">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search SAML, Redis, Webhooks, SSL..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Categories Horizontal Selector & Admin Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCat('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              selectedCat === 'ALL'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Categories
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCat(String(c.id))}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                selectedCat === String(c.id)
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {(isAdmin || isAgent) && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            leftIcon={Plus}
          >
            Publish Article
          </Button>
        )}
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))
        ) : articles.length === 0 ? (
          <div className="col-span-full text-center py-12 rounded-xl border border-dashed border-slate-200 bg-white">
            <BookOpen className="h-7 w-7 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">No documentation found matching your search query.</p>
          </div>
        ) : (
          articles.map((art) => (
            <Link
              key={art.id}
              to={ROUTES.KB_ARTICLE(art.id)}
              className="group block rounded-xl border border-slate-200/80 bg-white p-4.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all hover:border-slate-300 hover:shadow-xs"
            >
              <div className="flex items-center justify-between mb-2.5">
                <Badge variant="blue" size="sm">
                  {art.category?.name}
                </Badge>
                <div className="flex items-center space-x-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1 font-mono">
                    <Eye className="h-3 w-3" />
                    {art.views_count}
                  </span>
                  <span className="flex items-center gap-1 font-mono">
                    <ThumbsUp className="h-3 w-3 text-emerald-600" />
                    {art.helpful_count}
                  </span>
                </div>
              </div>

              <h2 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                {art.title}
              </h2>

              <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                {art.summary}
              </p>

              <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>By {art.author}</span>
                <span className="text-blue-600 font-medium inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                  Read Runbook <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Publish Article Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Author Knowledge Base Article"
        description="Share verified technical documentation and troubleshooting procedures."
        size="lg"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" loading={submitting} onClick={handleCreate}>
              Publish Article
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Article Title"
            placeholder="e.g., PostgreSQL Read Replica Lag Mitigation Procedures"
            required
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
          />

          <Select
            label="Domain Category"
            options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
            value={formCategory}
            onChange={(e) => setFormCategory(e.target.value)}
          />

          <Textarea
            label="Summary Brief"
            placeholder="One or two sentences explaining the issue and target audience..."
            rows={2}
            required
            value={formSummary}
            onChange={(e) => setFormSummary(e.target.value)}
          />

          <Textarea
            label="Markdown Documentation Content"
            placeholder="Write clear Markdown instructions, diagnostic code snippets, and remediation steps..."
            rows={8}
            required
            value={formContent}
            onChange={(e) => setFormContent(e.target.value)}
          />
        </form>
      </Modal>
    </div>
  );
}

export default KBHomePage;
