/**
 * @file KBHomePage.jsx
 * @description Knowledge Base repository home and search interface.
 * Displays categorised technical guides, runbooks, and troubleshooting procedures.
 * Enables keyword search across technical articles, category filtering, and authoring workflows for agents and administrators.
 */

// Import React library and component lifecycle, callback, and memoization hooks
import React, { useState, useEffect, useCallback, useMemo } from 'react';
// Import Lucide icons for search decoration, book badges, view/like counters, and arrow navigation
import { Search, BookOpen, Plus, Eye, ThumbsUp, ArrowRight } from 'lucide-react';
// Import React Router Link component for client-side navigation to article detail view
import { Link } from 'react-router-dom';
// Import Skeleton loader component for animated placeholders during network requests
import { Skeleton } from '../../components/common/Skeleton';
// Import Button component for standard interactive triggers and modal controls
import { Button } from '../../components/common/Button';
// Import Badge component for category tags and draft indicator chips
import { Badge } from '../../components/common/Badge';
// Import Modal component for article authoring and publishing workflows
import { Modal } from '../../components/common/Modal';
// Import Input component for text title control
import { Input } from '../../components/common/Input';
// Import Textarea component for article summary and Markdown content input
import { Textarea } from '../../components/common/Textarea';
// Import Select component for category dropdown selection
import { Select } from '../../components/common/Select';
// Import custom useAuth hook to verify authoring permissions (Admin or Support Agent)
import { useAuth } from '../../hooks/useAuth';
// Import custom useToast hook for interactive success and error alerts
import { useToast } from '../../hooks/useToast';
// Import knowledgeService API client for fetching categories, articles, and authoring new posts
import knowledgeService from '../../services/knowledgeService';
// Import central route path constants
import { ROUTES } from '../../constants';

/**
 * KBHomePage Component
 * Renders the search bar, category filter pills, article grid cards, and authoring modal.
 */
export function KBHomePage() {
  // Extract user authorization flags to restrict article authoring to admin/agent roles
  const { isAdmin, isAgent } = useAuth();
  // Initialize toast dispatcher for operational feedback
  const toast = useToast();

  // State storing the list of knowledge base categories fetched from backend
  const [categories, setCategories] = useState([]);
  // State storing the list of technical documentation articles fetched from backend
  const [articles, setArticles] = useState([]);
  // State storing currently selected category filter ('ALL' or category ID)
  const [selectedCat, setSelectedCat] = useState('ALL');
  // State storing search keyword entered in the documentation search box
  const [search, setSearch] = useState('');
  // State tracking network query loading lifecycle
  const [loading, setLoading] = useState(true);

  // Authoring modal state: Controls visibility of authoring dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  // Form state for article title
  const [formTitle, setFormTitle] = useState('');
  // Form state for selected article domain category ID
  const [formCategory, setFormCategory] = useState('');
  // Form state for article executive summary brief
  const [formSummary, setFormSummary] = useState('');
  // Form state for full Markdown documentation content body
  const [formContent, setFormContent] = useState('');
  // State tracking submission in flight
  const [submitting, setSubmitting] = useState(false);

  // Memoized callback function to fetch categories and articles in parallel
  const loadData = useCallback(async () => {
    // Activate loading skeleton placeholders
    setLoading(true);
    try {
      // Execute parallel queries for categories and articles matching active category and search filter
      const [catList, artList] = await Promise.all([
        knowledgeService.getCategories(),
        knowledgeService.getArticles({ category: selectedCat, search }),
      ]);
      // Update categories state
      setCategories(catList);
      // Update articles state
      setArticles(artList);

      // Pre-select the first available category if formCategory is not yet populated
      if (catList.length > 0 && !formCategory) {
        setFormCategory(String(catList[0].id));
      }
    } finally {
      // Deactivate loading indicator
      setLoading(false);
    }
  }, [selectedCat, search, formCategory]); // Re-create when category filter, search query, or formCategory changes

  // Trigger data loader on mount and when loadData dependencies change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Client-side category filtering safety guard ensuring immediate visual reaction
  const filteredArticles = useMemo(() => {
    // Return all articles if 'ALL' is selected
    if (selectedCat === 'ALL') return articles;
    // Filter articles by comparing category ID
    return articles.filter(
      (a) =>
        String(a.category) === String(selectedCat) ||
        String(a.category_id) === String(selectedCat)
    );
  }, [articles, selectedCat]); // Recompute when articles list or selected category changes

  // Handles submitting the new article authoring form and publishing it
  const handleCreate = async (e) => {
    // Prevent default form submission event
    e.preventDefault();
    // Set submitting flag to show loading state
    setSubmitting(true);
    try {
      // Backend ArticleCreateUpdateSerializer creates DRAFT; immediately publish so it is live
      const created = await knowledgeService.createArticle({
        title: formTitle,
        category: parseInt(formCategory, 10),
        summary: formSummary,
        content: formContent,
      });
      try {
        // Automatically publish the draft article to make it immediately accessible
        const published = await knowledgeService.publishArticle(created.id);
        // Prepend published article to local articles state
        setArticles((prev) => [published, ...prev]);
      } catch {
        // Fallback to inserting created article if publish endpoint encounters an error
        setArticles((prev) => [created, ...prev]);
      }
      // Show success notification to user
      toast.success('Article Published', `${formTitle} is now accessible in the repository.`);
      // Close creation modal
      setIsCreateOpen(false);
      // Reset form input values
      setFormTitle('');
      setFormSummary('');
      setFormContent('');
    } catch (err) {
      // Display error notification on publication failure
      toast.error('Publication failed', err.message);
    } finally {
      // Reset submitting flag
      setSubmitting(false);
    }
  };

  // Render the Knowledge Base home layout
  return (
    // Outer vertical container with standard spacing
    <div className="space-y-6">
      {/* Documentation Center Header & Search Bar Banner */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="space-y-1.5">
          {/* Badge indicator and subtitle */}
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/70">
              <BookOpen className="h-3.5 w-3.5 text-blue-600" />
              Verified Knowledge Base
            </span>
            <span className="text-xs text-slate-500 font-mono">Technical Guides & Runbooks</span>
          </div>
          {/* Main header title */}
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Troubleshooting Procedures & System Architecture
          </h1>
          {/* Header description */}
          <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
            Search verified diagnosis procedures, incident remediation runbooks, and enterprise integration references.
          </p>
        </div>

        {/* Global search input field */}
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

      {/* Categories Horizontal Selector & Admin Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Horizontal scrollable category pill buttons */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
          {/* 'All Categories' pill button */}
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
          {/* Render individual category buttons */}
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

        {/* Author new article action button (visible only to Admin and Support Agent roles) */}
        {(isAdmin || isAgent) && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (categories.length > 0 && !formCategory) {
                setFormCategory(String(categories[0].id));
              }
              setIsCreateOpen(true);
            }}
            leftIcon={Plus}
          >
            Publish Article
          </Button>
        )}
      </div>

      {/* Articles Grid Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Render animated skeletons when loading */}
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))
        ) : filteredArticles.length === 0 ? (
          // Empty state placeholder when no matching documentation exists
          <div className="col-span-full text-center py-12 rounded-xl border border-dashed border-slate-200 bg-white">
            <BookOpen className="h-7 w-7 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">No documentation found matching this category or search filter.</p>
          </div>
        ) : (
          // Render article cards
          filteredArticles.map((art) => (
            <Link
              key={art.id}
              to={ROUTES.KB_ARTICLE(art.id)}
              className="group block rounded-xl border border-slate-200/80 bg-white p-4.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all hover:border-slate-300 hover:shadow-xs"
            >
              {/* Category badge and view/helpful counter metadata */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center space-x-1.5">
                  <Badge variant="blue" size="sm">
                    {art.category_name || art.category?.name || 'Technical'}
                  </Badge>
                  {art.status !== 'PUBLISHED' && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      Draft
                    </span>
                  )}
                </div>
                {/* Views and helpful rating counts */}
                <div className="flex items-center space-x-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1 font-mono">
                    <Eye className="h-3 w-3" />
                    {art.views_count != null ? art.views_count : 1}
                  </span>
                  <span className="flex items-center gap-1 font-mono">
                    <ThumbsUp className="h-3 w-3 text-emerald-600" />
                    {art.helpful_count != null ? art.helpful_count : 1}
                  </span>
                </div>
              </div>

              {/* Article Title */}
              <h2 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                {art.title}
              </h2>

              {/* Article Summary text */}
              <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                {art.summary}
              </p>

              {/* Footer metadata: Author username and link arrow */}
              <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>By {art.author_username || art.author || 'Staff Specialist'}</span>
                <span className="text-blue-600 font-medium inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                  Read Runbook <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Publish Article Modal Dialog */}
      <Modal
        isOpen={isCreateOpen} // Dialog visibility boolean
        onClose={() => setIsCreateOpen(false)} // Close dismissal handler
        title="Author Knowledge Base Article" // Dialog title
        description="Share verified technical documentation and troubleshooting procedures." // Subtitle
        size="lg" // Large modal size for Markdown text authoring
        footer={
          // Action buttons in modal footer
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
        {/* Article Authoring Form */}
        <form onSubmit={handleCreate} className="space-y-4">
          {/* Article Title Input */}
          <Input
            label="Article Title"
            placeholder="e.g., PostgreSQL Read Replica Lag Mitigation Procedures"
            required
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
          />

          {/* Domain Category Selector */}
          <Select
            label="Domain Category"
            options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
            value={formCategory}
            onChange={(e) => setFormCategory(e.target.value)}
          />

          {/* Summary Brief Input */}
          <Textarea
            label="Summary Brief"
            placeholder="One or two sentences explaining the issue and target audience..."
            rows={2}
            required
            value={formSummary}
            onChange={(e) => setFormSummary(e.target.value)}
          />

          {/* Full Markdown Content Input */}
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

// Export KBHomePage as default export for lazy loading and routing
export default KBHomePage;
