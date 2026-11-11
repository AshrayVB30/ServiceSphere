import apiClient from './api';
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
    const response = await apiClient.get(ENDPOINTS.KNOWLEDGE.CATEGORIES);
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
    const response = await apiClient.get(ENDPOINTS.KNOWLEDGE.ARTICLES, { params });
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
    const response = await apiClient.get(ENDPOINTS.KNOWLEDGE.ARTICLE_DETAIL(id));
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
    const response = await apiClient.post(ENDPOINTS.KNOWLEDGE.ARTICLES, payload);
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
    const response = await apiClient.patch(ENDPOINTS.KNOWLEDGE.ARTICLE_DETAIL(id), payload);
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
    const response = await apiClient.get(ENDPOINTS.KNOWLEDGE.TICKET_ARTICLES(ticketId));
    return response.data?.results || response.data || [];
  },
};

export default knowledgeService;
