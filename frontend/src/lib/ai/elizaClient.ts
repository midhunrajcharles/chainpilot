// lib/ai/elizaClient.ts
// ─────────────────────────────────────────────────────────────────────────────
// Client for the ElizaOS v1.7 agent using the session-based HTTP transport.
//
// The `http` transport makes the POST /sessions/:id/messages call synchronous:
//   POST body : { content: string, transport: "http" }
//   Response  : { success, userMessage, agentResponse: { text, ... } }
// No polling needed – the agent response is returned directly in the 201 body.
// ─────────────────────────────────────────────────────────────────────────────

const ELIZA_BASE_URL =
  process.env.ELIZA_AGENT_URL ||
  process.env.NEXT_PUBLIC_ELIZA_AGENT_URL ||
  "http://localhost:3003";

// ─── Session cache (in-process, per userId) ──────────────────────────────────
interface SessionEntry {
  sessionId: string;
  channelId: string;
  agentId: string;
  expiresAt: number; // epoch ms
}
const sessionCache = new Map<string, SessionEntry>();
let cachedAgentId: string | null = null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Fetch ChainPilot AI's agent ID from ElizaOS; cached after first call. */
async function getAgentId(): Promise<string> {
  if (cachedAgentId) return cachedAgentId;

  const res = await fetch(`${ELIZA_BASE_URL}/api/agents`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`ElizaOS /api/agents → ${res.status}`);

  const data = await res.json();
  const agents: any[] =
    data?.data?.agents ?? data?.agents ?? (Array.isArray(data) ? data : []);
  if (!agents.length) throw new Error("No agents found on ElizaOS server");

  // Prefer the active ChainPilot AI agent; fall back to any active agent, then first agent
  const activeAgents = agents.filter((a: any) => a.status === "active");
  const preferred =
    activeAgents.find((a: any) =>
      (a.name ?? a.characterName ?? "").toLowerCase().includes("chainpilot")
    ) ??
    activeAgents.find((a: any) =>
      (a.name ?? a.characterName ?? "").toLowerCase().includes("kyro")
    ) ??
    activeAgents[0] ??
    agents[0];

  cachedAgentId = (preferred.id) as string;
  return cachedAgentId!;
}

/**
 * Convert a wallet address to a valid UUID-format string.
 * ElizaOS requires userId to be a UUID.
 */
function walletToUuid(wallet: string): string {
  const hex = wallet.toLowerCase().replace(/^0x/, "").padEnd(32, "0").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/** Get or create an ElizaOS session for this user. */
async function getOrCreateSession(userId: string): Promise<SessionEntry> {
  const existing = sessionCache.get(userId);
  // Reuse if not expiring within the next 2 minutes
  if (existing && existing.expiresAt - Date.now() > 2 * 60 * 1000) {
    return existing;
  }

  const agentId = await getAgentId();
  const stableUserId = walletToUuid(userId);

  const res = await fetch(`${ELIZA_BASE_URL}/api/messaging/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentId, userId: stableUserId }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`ElizaOS create session → ${res.status}: ${err}`);
  }

  const data = await res.json();
  const entry: SessionEntry = {
    sessionId: data.sessionId,
    channelId: data.channelId,
    agentId,
    expiresAt: data.expiresAt
      ? new Date(data.expiresAt).getTime()
      : Date.now() + 30 * 60 * 1000,
  };
  sessionCache.set(userId, entry);
  return entry;
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Poll GET /sessions/:id/messages waiting for the agent's reply after a given timestamp.
 * ElizaOS v1.6.x processes messages asynchronously – the POST returns the user
 * message object; the agent response must be fetched by polling.
 */
async function pollForAgentReply(
  sessionId: string,
  afterMs: number,
  timeoutMs = 20_000,
  intervalMs = 600
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, intervalMs));
    const r = await fetch(
      `${ELIZA_BASE_URL}/api/messaging/sessions/${sessionId}/messages`,
      { headers: { "Content-Type": "application/json" } }
    );
    if (!r.ok) continue;
    const data = await r.json();
    const msgs: any[] = data?.messages ?? [];
    // Find the latest agent message created after the user sent the message
    const agentMsg = msgs
      .filter(m => m.isAgent === true && new Date(m.createdAt).getTime() > afterMs)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    if (agentMsg?.content?.trim()) return agentMsg.content.trim();
  }
  throw new Error("ElizaOS agent did not respond within timeout");
}

/**
 * Send a message to ChainPilot AI and return the agent's text response.
 * Uses ElizaOS v1.6.x session API with async polling for the agent reply.
 *
 * @param message  User message text
 * @param userId   Stable identifier (wallet address)
 */
export async function sendToElizaAgent(
  message: string,
  userId: string
): Promise<string> {
  const session = await getOrCreateSession(userId);
  const sentAt = Date.now();

  const res = await fetch(
    `${ELIZA_BASE_URL}/api/messaging/sessions/${session.sessionId}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: `[wallet:${userId}]\n${message}` }),
    }
  );

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    // Session expired or not found – evict cache and retry once with a new session
    if (res.status === 404 || res.status === 410) {
      sessionCache.delete(userId);
      const newSession = await getOrCreateSession(userId);
      const retrySentAt = Date.now();
      const retryRes = await fetch(
        `${ELIZA_BASE_URL}/api/messaging/sessions/${newSession.sessionId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: `[wallet:${userId}]\n${message}` }),
        }
      );
      if (!retryRes.ok) {
        const retryErr = await retryRes.text().catch(() => retryRes.statusText);
        throw new Error(`ElizaOS session message retry → ${retryRes.status}: ${retryErr}`);
      }
      return pollForAgentReply(newSession.sessionId, retrySentAt);
    }
    throw new Error(`ElizaOS session message → ${res.status}: ${err}`);
  }

  return pollForAgentReply(session.sessionId, sentAt);
}

/** Invalidate a user's session (call on chat reset or sign-out). */
export function resetElizaSession(userId: string): void {
  sessionCache.delete(userId);
}

/** Reset the cached agent ID (call if the agent is restarted). */
export function resetElizaAgentCache(): void {
  cachedAgentId = null;
  sessionCache.clear();
}