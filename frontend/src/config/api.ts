/**
 * Central API configuration for ChainPilot AI frontend.
 * All service URLs are sourced from environment variables with sensible defaults.
 */

export const API_CONFIG = {
  /** Express backend API base URL */
  BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000",
  /** Express backend /api prefix */
  API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
  /** ElizaOS agent URL */
  ELIZA_URL:
    process.env.ELIZA_AGENT_URL ||
    process.env.NEXT_PUBLIC_ELIZA_AGENT_URL ||
    "http://localhost:3003",
  /** Next.js app URL */
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
} as const;

/** Convenience endpoint builders */
export const endpoints = {
  // ── Auth / User ──────────────────────────────────────────────────────
  user: (path = "") => `${API_CONFIG.API_URL}/user${path}`,
  // ── Transactions ─────────────────────────────────────────────────────
  transactions: (path = "") => `${API_CONFIG.API_URL}/transactions${path}`,
  // ── Contacts ────────────────────────────────────────────────────────
  contacts: (path = "") => `${API_CONFIG.API_URL}/contacts${path}`,
  // ── Teams ────────────────────────────────────────────────────────────
  teams: (path = "") => `${API_CONFIG.API_URL}/teams${path}`,
  // ── Chat (Gemini) ───────────────────────────────────────────────────
  chat: (path = "") => `${API_CONFIG.API_URL}/chat${path}`,
  // ── Analytics ───────────────────────────────────────────────────────
  analytics: (path = "") => `${API_CONFIG.API_URL}/analytics${path}`,
  // ── Security ────────────────────────────────────────────────────────
  security: (path = "") => `${API_CONFIG.API_URL}/security${path}`,
  // ── Contract Analysis ───────────────────────────────────────────────
  contracts: (path = "") => `${API_CONFIG.API_URL}/contracts${path}`,
  // ── Monitoring ──────────────────────────────────────────────────────
  monitors: (path = "") => `${API_CONFIG.API_URL}/monitors${path}`,
  // ── Audit Logs ──────────────────────────────────────────────────────
  audits: (path = "") => `${API_CONFIG.API_URL}/audits${path}`,
  // ── Notifications ───────────────────────────────────────────────────
  notifications: (path = "") => `${API_CONFIG.API_URL}/notifications${path}`,
  // ── Sharing ─────────────────────────────────────────────────────────
  sharing: (path = "") => `${API_CONFIG.API_URL}/sharing${path}`,
  // ── Health ───────────────────────────────────────────────────────────
  health: () => `${API_CONFIG.API_URL}/health`,
  // ── ElizaOS Agent ───────────────────────────────────────────────────
  elizaAgents: () => `${API_CONFIG.ELIZA_URL}/api/agents`,
  elizaSessions: () => `${API_CONFIG.ELIZA_URL}/api/messaging/sessions`,
  elizaSessionMessages: (sessionId: string) =>
    `${API_CONFIG.ELIZA_URL}/api/messaging/sessions/${sessionId}/messages`,
} as const;

export default API_CONFIG;
