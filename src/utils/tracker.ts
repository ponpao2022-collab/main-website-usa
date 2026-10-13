// In-Memory Real-Time Visitor Tracking Engine (Whos.amung.us Style)
// Ultra-fast, zero database lock, operates entirely in server RAM (<0.001ms latency)

interface VisitorSession {
  sessionId: string;
  path: string;
  title: string;
  lastSeen: number;
  ip?: string;
}

const activeSessions = new Map<string, VisitorSession>();

// Purge sessions inactive for more than 3 minutes (180,000 ms)
function cleanExpired() {
  const cutoff = Date.now() - 3 * 60 * 1000;
  for (const [id, session] of activeSessions.entries()) {
    if (session.lastSeen < cutoff) {
      activeSessions.delete(id);
    }
  }
}

export function recordVisitorPing(sessionId: string, path: string, title?: string, ip?: string) {
  if (!sessionId) return;
  cleanExpired();
  activeSessions.set(sessionId, {
    sessionId,
    path: path || "/",
    title: title || "USA NEWS STORY",
    lastSeen: Date.now(),
    ip: ip || ""
  });
}

export function getLiveStats() {
  cleanExpired();
  const total = activeSessions.size;

  // Group readers by page path
  const pagesMap = new Map<string, { count: number; title: string }>();
  for (const session of activeSessions.values()) {
    const existing = pagesMap.get(session.path);
    if (existing) {
      existing.count += 1;
    } else {
      pagesMap.set(session.path, { count: 1, title: session.title || session.path });
    }
  }

  const activePages = Array.from(pagesMap.entries())
    .map(([path, data]) => ({ path, count: data.count, title: data.title }))
    .sort((a, b) => b.count - a.count);

  return {
    totalOnline: total,
    activePages,
    timestamp: Date.now()
  };
}
