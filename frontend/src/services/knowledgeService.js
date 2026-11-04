import apiClient from './api';
import { ENDPOINTS } from './endpoints';

const STORAGE_KEY_ARTICLES = 'servicesphere_mock_kb_articles';

const INITIAL_CATEGORIES = [
  { id: 1, name: 'Authentication & SSO', slug: 'auth-sso', description: 'Okta SAML, Google Workspace SSO, and MFA configuration' },
  { id: 2, name: 'Billing & Subscriptions', slug: 'billing', description: 'Invoicing, credit adjustments, and tier renewals' },
  { id: 3, name: 'Database Operations', slug: 'database', description: 'PostgreSQL replication, backup recovery, and connection pooling' },
  { id: 4, name: 'API & Integrations', slug: 'api', description: 'REST webhooks, HMAC signing, and rate limits' },
  { id: 5, name: 'Network & Infrastructure', slug: 'network', description: 'VPC peering, firewall rules, and SSL certificate management' },
];

const INITIAL_ARTICLES = [
  {
    id: 1,
    title: 'SAML SSO Latency & Cluster Troubleshooting Guide',
    slug: 'saml-sso-latency-troubleshooting',
    category: { id: 1, name: 'Authentication & SSO' },
    summary: 'Step-by-step diagnostic procedures for high response latency during morning authentication peaks with SAML IdPs.',
    content: `## Overview
When multiple enterprise clients initiate concurrent SAML 2.0 assertions during morning start hours, session token validation may experience latency spikes if Redis connection pools are exhausted.

### Diagnostic Steps
1. Verify Redis cluster connection latency in the primary region using \`redis-cli ping\`.
2. Inspect the Django session pool max connections setting in \`settings.py\`.
3. Check for clock skew between the client identity provider (IdP) and ServiceSphere backend servers.

### Resolution
- Scale read replicas for the session store.
- Enable token response caching for valid assertions.`,
    author: 'Alex Vance',
    views_count: 248,
    helpful_count: 32,
    is_published: true,
    created_at: '2026-02-10T10:00:00.000Z',
    updated_at: '2026-10-15T14:30:00.000Z',
  },
  {
    id: 2,
    title: 'Configuring Webhook Deliveries with HMAC-SHA256 Signatures',
    slug: 'configuring-webhooks-hmac',
    category: { id: 4, name: 'API & Integrations' },
    summary: 'How to securely verify incoming ServiceSphere ticket event webhooks using shared secret signature headers.',
    content: `## Security Verification
Every webhook dispatched by ServiceSphere contains an \`X-ServiceSphere-Signature\` HTTP header computed via HMAC-SHA256.

### Implementation Example (Python)
\`\`\`python
import hmac, hashlib

def verify_signature(payload, signature, secret):
    expected = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)
\`\`\`

Always verify the signature before processing asynchronous payload jobs.`,
    author: 'Sarah Connor',
    views_count: 184,
    helpful_count: 21,
    is_published: true,
    created_at: '2026-03-01T12:00:00.000Z',
    updated_at: '2026-09-20T11:15:00.000Z',
  },
  {
    id: 3,
    title: 'PostgreSQL Read Replica Lag Mitigation Procedures',
    slug: 'postgres-read-replica-lag',
    category: { id: 3, name: 'Database Operations' },
    summary: 'Techniques for resolving replication delay on analytics query endpoints.',
    content: `## Common Causes of Replication Lag
1. Long-running analytical reporting queries blocking WAL application.
2. Network saturation between the primary database and read replicas.
3. Suboptimal \`max_standby_streaming_delay\` configuration.

### Remediation
- Terminate queries exceeding 300 seconds on read replicas.
- Increase replication worker buffer allocation.`,
    author: 'Alex Vance',
    views_count: 142,
    helpful_count: 18,
    is_published: true,
    created_at: '2026-04-12T09:00:00.000Z',
    updated_at: '2026-10-01T16:45:00.000Z',
  },
];

function getStoredArticles() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ARTICLES);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  localStorage.setItem(STORAGE_KEY_ARTICLES, JSON.stringify(INITIAL_ARTICLES));
  return INITIAL_ARTICLES;
}

function saveStoredArticles(list) {
  try {
    localStorage.setItem(STORAGE_KEY_ARTICLES, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export const knowledgeService = {
  async getCategories() {
    try {
      const response = await apiClient.get(ENDPOINTS.KNOWLEDGE.CATEGORIES);
      return response.data.results || response.data;
    } catch {
      return INITIAL_CATEGORIES;
    }
  },

  async getArticles(params = {}) {
    try {
      const response = await apiClient.get(ENDPOINTS.KNOWLEDGE.ARTICLES, { params });
      return response.data.results || response.data;
    } catch {
      let list = [...getStoredArticles()];
      if (params.categoryId && params.categoryId !== 'ALL') {
        list = list.filter((a) => String(a.category?.id) === String(params.categoryId));
      }
      if (params.search) {
        const query = params.search.toLowerCase();
        list = list.filter(
          (a) =>
            a.title.toLowerCase().includes(query) ||
            a.summary.toLowerCase().includes(query) ||
            a.content.toLowerCase().includes(query)
        );
      }
      return list;
    }
  },

  async getArticle(id) {
    try {
      const response = await apiClient.get(ENDPOINTS.KNOWLEDGE.ARTICLE_DETAIL(id));
      return response.data;
    } catch {
      const list = getStoredArticles();
      const item = list.find((a) => String(a.id) === String(id) || a.slug === id);
      if (!item) throw new Error('Article not found');
      return item;
    }
  },

  async createArticle(data, user) {
    try {
      const response = await apiClient.post(ENDPOINTS.KNOWLEDGE.ARTICLES, data);
      return response.data;
    } catch {
      const list = getStoredArticles();
      const nextId = Math.max(...list.map((a) => a.id), 0) + 1;
      const newArticle = {
        id: nextId,
        title: data.title,
        slug: data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        category: INITIAL_CATEGORIES.find((c) => String(c.id) === String(data.category_id)) || INITIAL_CATEGORIES[0],
        summary: data.summary,
        content: data.content,
        author: user?.first_name ? `${user.first_name} ${user.last_name || ''}` : 'Author',
        views_count: 1,
        helpful_count: 0,
        is_published: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const updated = [newArticle, ...list];
      saveStoredArticles(updated);
      return newArticle;
    }
  },
};

export default knowledgeService;
