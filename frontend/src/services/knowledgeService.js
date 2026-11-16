// Import central axios HTTP client configured with CSRF tokens and session credentials
import apiClient from './api';
// Import knowledge base endpoint mapping definitions
import { ENDPOINTS } from './endpoints';

/**
 * ServiceSphere Knowledge Base & Technical Runbooks Service
 * Communicates with Django REST APIs under /api/knowledge/
 */
export const knowledgeService = {
  /**
   * Retrieves all active documentation categories.
   * Endpoint: GET /api/knowledge/categories/
   *
   * @returns {Promise<Array<object>>} List of categories with article counts.
   */
  async getCategories() {
    // Send GET request to categories list endpoint
    const response = await apiClient.get(ENDPOINTS.KNOWLEDGE.CATEGORIES);
    // Return category items array from results or raw response
    return response.data?.results || response.data || [];
  },

  /**
   * Retrieves published articles visible to the authenticated user.
   * Clients see only public articles; internal staff see all visibility tiers.
   * Endpoint: GET /api/knowledge/articles/
   *
   * @param {object} [params] - Query parameters (search, category, ordering).
   * @returns {Promise<Array<object>>} List of article summaries.
   */
  async getArticles(params = {}) {
    // Construct query parameter dictionary
    const query = {};
    // Attach trimmed search query if present
    if (params.search?.trim()) query.search = params.search.trim();

    // Harmonize category filter property
    const cat = params.category || params.categoryId;
    // Attach category filter if specified and not 'ALL'
    if (cat && String(cat).toUpperCase() !== 'ALL') {
      query.category = cat;
    }

    // Send GET request for articles with filters
    const response = await apiClient.get(ENDPOINTS.KNOWLEDGE.ARTICLES, { params: query });
    // Return article summaries array
    return response.data?.results || response.data || [];
  },

  /**
   * Retrieves full content and metadata for a specific knowledge base article.
   * Endpoint: GET /api/knowledge/articles/{id}/
   *
   * @param {number|string} id - Article primary key or slug.
   * @returns {Promise<object>} Full article record with markdown content.
   */
  async getArticle(id) {
    // Send GET request for article detail
    const response = await apiClient.get(ENDPOINTS.KNOWLEDGE.ARTICLE_DETAIL(id));
    // Return full article record
    return response.data;
  },

  /**
   * Authors a new draft knowledge base article.
   * Endpoint: POST /api/knowledge/articles/
   *
   * @param {object} payload - Article payload.
   * @param {string} payload.title - Article title.
   * @param {string} payload.summary - Short summary excerpt.
   * @param {string} payload.content - Full markdown documentation body.
   * @param {number} payload.category - Category ID.
   * @param {string} [payload.visibility] - 'PUBLIC' or 'INTERNAL_ONLY'.
   * @returns {Promise<object>} Created article record.
   */
  async createArticle(payload) {
    // Send POST request to author new documentation article
    const response = await apiClient.post(ENDPOINTS.KNOWLEDGE.ARTICLES, payload);
    // Return created article record
    return response.data;
  },

  /**
   * Updates an existing knowledge base article.
   * Automatically creates an immutable revision snapshot on the server.
   * Endpoint: PATCH /api/knowledge/articles/{id}/
   *
   * @param {number|string} id - Article ID.
   * @param {object} payload - Updated fields.
   * @returns {Promise<object>} Updated article record.
   */
  async updateArticle(id, payload) {
    // Send PATCH request with modified article content
    const response = await apiClient.patch(ENDPOINTS.KNOWLEDGE.ARTICLE_DETAIL(id), payload);
    // Return updated article record
    return response.data;
  },

  /**
   * Publishes a draft article making it live for clients.
   * Endpoint: POST /api/knowledge/articles/{id}/publish/
   */
  async publishArticle(id) {
    // Send POST request to publish article endpoint
    const response = await apiClient.post(`${ENDPOINTS.KNOWLEDGE.ARTICLE_DETAIL(id)}publish/`);
    // Return published article response
    return response.data;
  },

  /**
   * Reverts a published article back to draft.
   * Endpoint: POST /api/knowledge/articles/{id}/unpublish/
   */
  async unpublishArticle(id) {
    // Send POST request to unpublish article endpoint
    const response = await apiClient.post(`${ENDPOINTS.KNOWLEDGE.ARTICLE_DETAIL(id)}unpublish/`);
    // Return unpublished article response
    return response.data;
  },

  /**
   * Retrieves all articles linked to a specific support ticket.
   * Endpoint: GET /api/knowledge/tickets/{ticketId}/articles/
   *
   * @param {number|string} ticketId - Ticket ID.
   * @returns {Promise<Array<object>>} Associated articles.
   */
  async getTicketArticles(ticketId) {
    // Send GET request for articles linked to a ticket
    const response = await apiClient.get(ENDPOINTS.KNOWLEDGE.TICKET_ARTICLES(ticketId));
    // Return linked articles list
    return response.data?.results || response.data || [];
  },
};

// Export knowledgeService as default export
export default knowledgeService;
