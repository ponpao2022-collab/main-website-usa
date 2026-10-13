// In-Memory Real-Time Visitor Tracking Engine (Whos.amung.us Style)
// Ultra-fast, zero database lock, operates entirely in server RAM (<0.001ms latency)

interface VisitorSession {
  sessionId: string;
  path: string;
  title: string;
  lastSeen: number;
  ip?: string;
  country: string;
  countryName: string;
  flag: string;
  device: "Mobile" | "Desktop" | "Tablet";
}

const activeSessions = new Map<string, VisitorSession>();

function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return "🌐";
  const upper = countryCode.toUpperCase();
  if (upper === "XX" || upper === "T1") return "🌐";
  try {
    const codePoints = upper.split("").map(c => 127397 + c.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch (e) {
    return "🌐";
  }
}

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States",
  KH: "Cambodia",
  CA: "Canada",
  GB: "United Kingdom",
  AU: "Australia",
  DE: "Germany",
  FR: "France",
  IN: "India",
  SG: "Singapore",
  TH: "Thailand",
  VN: "Vietnam",
  JP: "Japan",
  KR: "South Korea",
  PH: "Philippines",
  MY: "Malaysia",
  ID: "Indonesia",
  BR: "Brazil",
  MX: "Mexico",
  ES: "Spain",
  IT: "Italy",
  NL: "Netherlands",
  CH: "Switzerland",
  SE: "Sweden",
  NO: "Norway",
  NZ: "New Zealand",
  IE: "Ireland",
  ZA: "South Africa",
  AE: "United Arab Emirates",
  SA: "Saudi Arabia",
};

function detectDevice(userAgent: string): "Mobile" | "Desktop" | "Tablet" {
  const ua = (userAgent || "").toLowerCase();
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return "Tablet";
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return "Mobile";
  return "Desktop";
}

// Purge sessions inactive for more than 3 minutes (180,000 ms)
function cleanExpired() {
  const cutoff = Date.now() - 3 * 60 * 1000;
  for (const [id, session] of activeSessions.entries()) {
    if (session.lastSeen < cutoff) {
      activeSessions.delete(id);
    }
  }
}

export function recordVisitorPing(
  sessionId: string,
  path: string,
  title?: string,
  ip?: string,
  country = "US",
  userAgent = ""
) {
  if (!sessionId) return;
  cleanExpired();
  const cCode = (country || "US").toUpperCase();
  const flag = getFlagEmoji(cCode);
  const countryName = COUNTRY_NAMES[cCode] || cCode;
  const device = detectDevice(userAgent);

  activeSessions.set(sessionId, {
    sessionId,
    path: path || "/",
    title: title || "USA NEWS STORY",
    lastSeen: Date.now(),
    ip: ip || "",
    country: cCode,
    countryName,
    flag,
    device
  });
}

export function getLiveStats() {
  cleanExpired();
  const total = activeSessions.size;

  const countryMap = new Map<string, { code: string; name: string; flag: string; count: number }>();
  const pagesMap = new Map<string, { path: string; title: string; count: number }>();
  const devices = { mobile: 0, desktop: 0, tablet: 0 };
  const recentVisitors: Array<{
    flag: string;
    country: string;
    device: string;
    path: string;
    title: string;
    agoSec: number;
  }> = [];

  const now = Date.now();
  for (const session of activeSessions.values()) {
    // Country aggregation
    const cCode = session.country || "US";
    const existingC = countryMap.get(cCode);
    if (existingC) {
      existingC.count += 1;
    } else {
      countryMap.set(cCode, {
        code: cCode,
        name: session.countryName || COUNTRY_NAMES[cCode] || cCode,
        flag: session.flag || getFlagEmoji(cCode),
        count: 1
      });
    }

    // Page aggregation
    const existingP = pagesMap.get(session.path);
    if (existingP) {
      existingP.count += 1;
    } else {
      pagesMap.set(session.path, {
        path: session.path,
        title: session.title || session.path,
        count: 1
      });
    }

    // Device
    if (session.device === "Mobile") devices.mobile++;
    else if (session.device === "Tablet") devices.tablet++;
    else devices.desktop++;

    // Recent Visitors list
    recentVisitors.push({
      flag: session.flag || getFlagEmoji(cCode),
      country: session.countryName || COUNTRY_NAMES[cCode] || cCode,
      device: session.device,
      path: session.path,
      title: session.title,
      agoSec: Math.max(1, Math.round((now - session.lastSeen) / 1000))
    });
  }

  const countries = Array.from(countryMap.values())
    .map(c => ({
      ...c,
      percent: total > 0 ? Math.round((c.count / total) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count);

  const activePages = Array.from(pagesMap.values())
    .sort((a, b) => b.count - a.count);

  recentVisitors.sort((a, b) => a.agoSec - b.agoSec);

  return {
    totalOnline: total,
    countries,
    devices,
    activePages,
    recentVisitors: recentVisitors.slice(0, 20),
    timestamp: now
  };
}
