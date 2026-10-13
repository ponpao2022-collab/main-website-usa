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
  city: string;
  flag: string;
  device: "Mobile" | "Desktop" | "Tablet";
  os: "Android" | "Apple" | "Windows" | "Linux";
  referrer: "facebook" | "google" | "direct" | "telegram" | "other";
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

function detectOS(userAgent: string): "Android" | "Apple" | "Windows" | "Linux" {
  const ua = (userAgent || "").toLowerCase();
  if (ua.includes("android")) return "Android";
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("mac os") || ua.includes("macintosh")) return "Apple";
  if (ua.includes("windows") || ua.includes("win32") || ua.includes("win64")) return "Windows";
  return "Linux";
}

function detectReferrer(ref: string): "facebook" | "google" | "direct" | "telegram" | "other" {
  const r = (ref || "").toLowerCase();
  if (r.includes("facebook.com") || r.includes("fb.me") || r.includes("fbclid") || r.includes("m.facebook.com")) return "facebook";
  if (r.includes("google.") || r.includes("google.com")) return "google";
  if (r.includes("t.me") || r.includes("telegram")) return "telegram";
  if (!r) return "direct";
  return "other";
}

// Purge sessions inactive for more than 2 minutes (120,000 ms, authentic whos.amung.us)
function cleanExpired() {
  const cutoff = Date.now() - 2 * 60 * 1000;
  for (const [id, session] of activeSessions.entries()) {
    if (session.lastSeen < cutoff) {
      activeSessions.delete(id);
    }
  }
}

export function removeVisitorSession(sessionId: string) {
  if (sessionId) {
    activeSessions.delete(sessionId);
  }
}

export function recordVisitorPing(
  sessionId: string,
  path: string,
  title?: string,
  ip?: string,
  country = "US",
  userAgent = "",
  referrer = "",
  city = ""
) {
  if (!sessionId) return;
  cleanExpired();
  const cCode = (country || "US").toUpperCase();
  const flag = getFlagEmoji(cCode);
  const countryName = COUNTRY_NAMES[cCode] || cCode;
  const device = detectDevice(userAgent);
  const os = detectOS(userAgent);
  const refType = detectReferrer(referrer);

  activeSessions.set(sessionId, {
    sessionId,
    path: path || "/",
    title: title || "USA NEWS STORY",
    lastSeen: Date.now(),
    ip: ip || "",
    country: cCode,
    countryName,
    city: city || "",
    flag,
    device,
    os,
    referrer: refType
  });
}

export function getLiveStats() {
  cleanExpired();
  const total = activeSessions.size;

  const countryMap = new Map<string, { code: string; name: string; flag: string; count: number }>();
  const pagesMap = new Map<string, { path: string; title: string; count: number }>();
  const devices = { mobile: 0, desktop: 0, tablet: 0 };
  const osMap = { android: 0, apple: 0, windows: 0, linux: 0 };
  const referrers = { facebook: 0, google: 0, direct: 0, other: 0 };
  const recentVisitors: Array<{
    flag: string;
    country: string;
    city: string;
    device: string;
    os: string;
    referrer: string;
    path: string;
    title: string;
    agoSec: number;
    formattedTime: string;
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

    // OS
    if (session.os === "Android") osMap.android++;
    else if (session.os === "Apple") osMap.apple++;
    else if (session.os === "Windows") osMap.windows++;
    else osMap.linux++;

    // Referrers
    if (session.referrer === "facebook") referrers.facebook++;
    else if (session.referrer === "google") referrers.google++;
    else if (session.referrer === "direct") referrers.direct++;
    else referrers.other++;

    // Formatted time ago (e.g. 0:05, 0:45, 1:12)
    const diffSec = Math.max(1, Math.round((now - session.lastSeen) / 1000));
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    const formattedTime = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

    // Recent Visitors list
    recentVisitors.push({
      flag: session.flag || getFlagEmoji(cCode),
      country: session.countryName || COUNTRY_NAMES[cCode] || cCode,
      city: session.city,
      device: session.device,
      os: session.os,
      referrer: session.referrer,
      path: session.path,
      title: session.title,
      agoSec: diffSec,
      formattedTime
    });
  }

  const countries = Array.from(countryMap.values())
    .map(c => ({
      ...c,
      percent: total > 0 ? Number(((c.count / total) * 100).toFixed(1)) : 0
    }))
    .sort((a, b) => b.count - a.count);

  const activePages = Array.from(pagesMap.values())
    .map(p => ({
      ...p,
      percent: total > 0 ? Number(((p.count / total) * 100).toFixed(1)) : 0
    }))
    .sort((a, b) => b.count - a.count);

  recentVisitors.sort((a, b) => a.agoSec - b.agoSec);

  return {
    totalOnline: total,
    countries,
    devices,
    osMap,
    referrers,
    activePages,
    recentVisitors: recentVisitors.slice(0, 35),
    timestamp: now
  };
}
