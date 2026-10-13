import { Hono } from "hono";
import { db } from "../db/index";

export const adminRouter = new Hono();

// Disable caching for admin CMS & Enforce Authentication
adminRouter.use("*", async (c, next) => {
  c.res.headers.set("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
  c.res.headers.set("Pragma", "no-cache");
  c.res.headers.set("Expires", "0");

  const path = c.req.path;
  if (path === "/admin/login" || path === "/admin/logout") {
    await next();
    return;
  }

  const cookieHeader = c.req.header("cookie") || "";
  const tokenMatch = cookieHeader.match(/usa_cms_token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : null;

  if (token !== "usa_news_cms_auth_token_secret_2026") {
    return c.redirect("/admin/login");
  }

  await next();
});

// ADMIN LOGIN PAGE
adminRouter.get("/login", (c) => {
  const cookieHeader = c.req.header("cookie") || "";
  if (cookieHeader.includes("usa_cms_token=usa_news_cms_auth_token_secret_2026")) {
    return c.redirect("/admin");
  }

  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CMS Login | USA NEWS STORY</title>
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <script src="/assets/tailwindcss.min.js"></script>
</head>
<body class="bg-[#FAF9F5] text-[#1C1B18] font-sans antialiased min-h-screen flex items-center justify-center p-4 selection:bg-[#C25E3E] selection:text-white">
  
  <div class="max-w-sm w-full bg-white border border-[#EAE8E1] rounded-3xl p-8 shadow-xl space-y-6">
    <div class="text-center space-y-2">
      <img src="/assets/logo-sm.webp" class="h-14 w-14 rounded-full mx-auto object-contain shadow-sm border border-[#EAE8E1]" alt="USA NEWS STORY">
      <h1 class="text-2xl font-black text-[#1C1B18] tracking-tight">USA NEWS STORY</h1>
      <p class="text-xs text-[#6E6B63]">Newsroom CMS Dashboard Sign In</p>
    </div>

    <form onsubmit="handleLogin(event)" class="space-y-4">
      <div id="loginError" class="hidden p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold"></div>

      <div>
        <label class="block text-xs font-bold text-[#1C1B18] uppercase tracking-wider mb-1.5">Username</label>
        <input type="text" id="usernameInput" required value="admin" class="w-full bg-[#FAF9F5] border border-[#E5E2D9] rounded-xl px-3.5 py-2.5 text-xs text-[#1C1B18] focus:outline-none focus:border-[#C25E3E] focus:bg-white font-medium">
      </div>

      <div>
        <label class="block text-xs font-bold text-[#1C1B18] uppercase tracking-wider mb-1.5">Password</label>
        <input type="password" id="passwordInput" required placeholder="Enter password" class="w-full bg-[#FAF9F5] border border-[#E5E2D9] rounded-xl px-3.5 py-2.5 text-xs text-[#1C1B18] focus:outline-none focus:border-[#C25E3E] focus:bg-white font-medium">
      </div>

      <div class="flex items-center justify-between text-xs pt-1">
        <label class="flex items-center space-x-2 text-[#6E6B63] cursor-pointer">
          <input type="checkbox" id="rememberMeInput" checked class="w-4 h-4 rounded border-[#E5E2D9] text-[#C25E3E] focus:ring-[#C25E3E]">
          <span class="font-medium">Remember on this browser</span>
        </label>
      </div>

      <button type="submit" id="loginBtn" class="w-full py-3 px-4 rounded-xl bg-[#C25E3E] hover:bg-[#B05335] text-white font-bold text-xs transition shadow-md shadow-[#C25E3E]/20 flex items-center justify-center space-x-2 cursor-pointer">
        <span>🔒 Sign In to CMS</span>
      </button>
    </form>

    <div class="text-center pt-2 border-t border-[#EAE8E1]">
      <a href="/" class="text-xs text-[#6E6B63] hover:text-[#C25E3E] transition font-medium">&larr; Return to Live Website</a>
    </div>
  </div>

  <script>
    async function handleLogin(e) {
      e.preventDefault();
      const u = document.getElementById('usernameInput').value.trim();
      const p = document.getElementById('passwordInput').value.trim();
      const remember = document.getElementById('rememberMeInput').checked;
      const errEl = document.getElementById('loginError');
      const btn = document.getElementById('loginBtn');

      errEl.classList.add('hidden');
      btn.innerText = 'Verifying...';

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: u, password: p, remember })
        });
        const data = await res.json();
        if (data.success) {
          window.location.href = '/admin';
        } else {
          errEl.textContent = data.error || 'Username ឬ Password មិនត្រឹមត្រូវ';
          errEl.classList.remove('hidden');
          btn.innerText = '🔒 Sign In to CMS';
        }
      } catch (err) {
        errEl.textContent = 'Network error: ' + err.message;
        errEl.classList.remove('hidden');
        btn.innerText = '🔒 Sign In to CMS';
      }
    }
  </script>
</body>
</html>`);
});

// LOGOUT ROUTE
adminRouter.get("/logout", (c) => {
  c.header("Set-Cookie", "usa_cms_token=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly");
  return c.redirect("/admin/login");
});

// ADMIN DASHBOARD
adminRouter.get("/", (c) => {
  const posts = db.query(`
    SELECT p.*, c.name as category_name 
    FROM posts p 
    LEFT JOIN categories c ON p.category_id = c.id 
    ORDER BY p.id DESC
  `).all() as any[];

  const categories = db.query("SELECT * FROM categories ORDER BY id ASC").all() as any[];
  const activePosts = posts.filter(p => p.status !== 'trash');
  const trashPosts = posts.filter(p => p.status === 'trash');
  const totalViews = activePosts.reduce((acc, p) => acc + (p.views || 0), 0);
  const breakingCount = activePosts.filter(p => p.is_breaking === 1).length;

  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>USA NEWS STORY CMS - Newsroom Dashboard</title>
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/assets/favicon-16x16.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <link rel="preload" href="/assets/tailwindcss.min.js" as="script">
  <script src="/assets/tailwindcss.min.js"></script>
  <style>
    @keyframes pulse-slow { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    .animate-pulse-slow { animation: pulse-slow 2s infinite; }
  </style>
</head>
<body class="bg-[#FAF9F5] text-[#1C1B18] font-sans antialiased min-h-screen flex flex-col selection:bg-[#C25E3E] selection:text-white">

  <!-- Top Header -->
  <header class="h-16 border-b border-[#EAE8E1] bg-white/95 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-50 shadow-xs">
    <div class="flex items-center space-x-3">
      <img src="/assets/logo-sm.webp" class="h-9 w-9 rounded-full object-contain shadow-sm border border-[#EAE8E1]" alt="USA NEWS STORY">
      <div>
        <div class="flex items-center space-x-2">
          <span class="font-bold text-base tracking-wide text-[#1C1B18]">USA NEWS STORY CMS</span>
          <span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F3F1EC] text-[#C25E3E] border border-[#E5E2D9]">Newsroom Panel</span>
        </div>
      </div>
    </div>

    <!-- Right Controls -->
    <div class="flex items-center space-x-3">
      <div class="hidden sm:flex items-center space-x-2 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full text-xs text-emerald-800 font-medium">
        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span class="font-mono text-[11px]">Cloudflare Edge: 100% Operational (24ms)</span>
      </div>

      <button type="button" onclick="openBackupModal()" class="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#F3F1EC] hover:bg-[#EAE8E1] border border-[#E5E2D9] text-[#2B2926] flex items-center space-x-1.5 transition">
        <span>💾 Backup & Restore</span>
      </button>

      <a href="/" target="_blank" class="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#F3F1EC] hover:bg-[#EAE8E1] border border-[#E5E2D9] text-[#2B2926] flex items-center space-x-1.5 transition">
        <span>View Live Site</span>
        <svg class="w-3.5 h-3.5 text-[#6E6B63]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
      </a>

      <a href="/admin/new?open_ai=1" class="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#C25E3E]/10 hover:bg-[#C25E3E]/20 text-[#C25E3E] border border-[#C25E3E]/30 flex items-center space-x-1.5 transition">
        <img src="/assets/tk-mascot.webp" class="w-4 h-4 object-contain" alt="TK" width="16" height="16">
        <span>TK Summary AI</span>
      </a>

      <a href="/admin/new" class="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#C25E3E] hover:bg-[#B05335] text-white shadow-md shadow-[#C25E3E]/20 flex items-center space-x-1.5 transition">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        <span>Write New Story</span>
      </a>

      <a href="/admin/logout" class="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 flex items-center space-x-1 transition cursor-pointer" title="Sign out of CMS">
        <span>🚪 Logout</span>
      </a>
    </div>
  </header>

  <!-- Main Container -->
  <div class="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">

    <!-- Top Navigation Tabs (Articles Feed vs Whos.amung.us Live Readers) -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAE8E1] pb-4">
      <div class="flex items-center space-x-2 bg-[#F3F1EC] p-1.5 rounded-2xl border border-[#E5E2D9]">
        <button type="button" id="mainTabArticlesBtn" onclick="switchMainTab('articles')" class="px-4 py-2 rounded-xl font-bold text-xs bg-white text-[#1C1B18] shadow-sm border border-[#E5E2D9] flex items-center space-x-2 transition cursor-pointer">
          <span>📰</span>
          <span>Articles Feed & Stories (${activePosts.length})</span>
        </button>
        <button type="button" id="mainTabTrackingBtn" onclick="switchMainTab('tracking')" class="px-4 py-2 rounded-xl font-semibold text-xs text-[#6E6B63] hover:text-[#1C1B18] flex items-center space-x-2 transition cursor-pointer">
          <span class="relative flex h-2.5 w-2.5">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span>Whos.amung.us Live Readers</span>
          <span id="mainTrackingPill" class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800">0</span>
        </button>
      </div>

      <div class="flex items-center space-x-2 text-xs text-[#6E6B63]">
        <span class="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span class="font-mono text-[11px]">Realtime Radar Active (3s)</span>
      </div>
    </div>

    <!-- ==================== VIEW 1: ARTICLES FEED ==================== -->
    <div id="mainArticlesView" class="space-y-6">
      <!-- Stats Row (5 Cards in Claude AI Light Mode) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        <!-- Whos.amung.us Realtime Live Readers Card -->
        <div onclick="switchMainTab('tracking')" class="bg-white border-2 border-emerald-400/60 p-5 rounded-2xl relative overflow-hidden shadow-sm cursor-pointer hover:border-emerald-500 transition group">
          <div class="flex items-center justify-between mb-1">
            <div class="text-xs font-bold uppercase tracking-wider text-emerald-800">Live Readers Now</div>
            <span class="relative flex h-2.5 w-2.5">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <div id="liveOnlineCount" class="text-3xl font-extrabold text-emerald-600 font-mono">0</div>
          <div class="text-[11px] text-emerald-700 mt-2 font-mono flex items-center space-x-1 font-medium group-hover:underline">
            <span>📡</span>
            <span>View Live Whos.amung.us Tab &rarr;</span>
          </div>
        </div>

        <div class="bg-white border border-[#EAE8E1] p-5 rounded-2xl shadow-sm">
          <div class="text-xs font-semibold uppercase tracking-wider text-[#6E6B63] mb-1">Total Stories</div>
          <div class="text-3xl font-extrabold text-[#1C1B18]">${activePosts.length}</div>
          <div class="text-[11px] text-emerald-600 mt-2 font-medium">Active (${trashPosts.length} in Trash)</div>
        </div>

        <div class="bg-white border border-[#EAE8E1] p-5 rounded-2xl shadow-sm">
          <div class="text-xs font-semibold uppercase tracking-wider text-[#6E6B63] mb-1">Breaking News Active</div>
          <div class="text-3xl font-extrabold text-rose-600">${breakingCount}</div>
          <div class="text-[11px] text-rose-600/80 mt-2 font-medium">Showing on Top Marquee</div>
        </div>

        <div class="bg-white border border-[#EAE8E1] p-5 rounded-2xl shadow-sm">
          <div class="text-xs font-semibold uppercase tracking-wider text-[#6E6B63] mb-1">Global Pageviews</div>
          <div class="text-3xl font-extrabold text-[#C25E3E]">${totalViews.toLocaleString()}</div>
          <div class="text-[11px] text-[#6E6B63] mt-2 font-medium">Real Visitors Tracked Live</div>
        </div>

        <div class="bg-white border border-[#EAE8E1] p-5 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <div class="text-xs font-semibold uppercase tracking-wider text-[#6E6B63] mb-1">Cloudflare Edge Purge</div>
            <div class="text-xs text-[#6E6B63]">Purge cache across 310+ PoPs</div>
          </div>
          <button onclick="purgeCache(this)" class="w-full mt-3 py-2 px-3 rounded-xl bg-[#F3F1EC] hover:bg-[#EAE8E1] border border-[#E5E2D9] text-xs font-semibold text-[#2B2926] flex items-center justify-center space-x-1.5 transition">
            <svg class="w-3.5 h-3.5 text-[#C25E3E]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            <span>Instant Cache Purge</span>
          </button>
        </div>
      </div>

      <!-- Posts Table with Published and Trash Tabs + Checkboxes -->
      <div class="bg-white border border-[#EAE8E1] rounded-2xl overflow-hidden shadow-sm">
        <div class="p-5 border-b border-[#EAE8E1] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div class="flex items-center space-x-3">
              <h2 class="font-bold text-lg text-[#1C1B18]">Articles & News Feed</h2>
              <div class="flex items-center space-x-1 bg-[#F3F1EC] p-1 rounded-xl border border-[#E5E2D9] text-xs">
                <button type="button" id="tabActivePostsBtn" onclick="switchPostsTab('active')" class="px-3 py-1 rounded-lg font-bold bg-[#C25E3E] text-white shadow-xs transition cursor-pointer">
                  <span>Published (${activePosts.length})</span>
                </button>
                <button type="button" id="tabTrashPostsBtn" onclick="switchPostsTab('trash')" class="px-3 py-1 rounded-lg font-semibold text-[#6E6B63] hover:text-[#1C1B18] transition flex items-center space-x-1 cursor-pointer">
                  <span>🗑️ Trash (${trashPosts.length})</span>
                </button>
              </div>
            </div>
            <p class="text-xs text-[#6E6B63] mt-1" id="tabSubtitle">Manage active stories, tick multiple articles to bulk move to trash or publish</p>
          </div>
          <div class="flex items-center space-x-2.5">
            <div id="trashTabActions" class="hidden flex items-center space-x-2">
              ${trashPosts.length > 0 ? `
                <button type="button" onclick="emptyTrash()" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition flex items-center space-x-1.5 shadow-xs cursor-pointer">
                  <svg class="w-3.5 h-3.5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  <span>Empty Trash (${trashPosts.length})</span>
                </button>
              ` : ''}
            </div>
            <button type="button" onclick="openBackupModal()" class="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#F3F1EC] hover:bg-[#EAE8E1] text-[#2B2926] border border-[#E5E2D9] transition flex items-center space-x-1.5 cursor-pointer">
              <span>💾 Backup</span>
            </button>
            <button type="button" onclick="openCategoriesModal()" class="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#F3F1EC] hover:bg-[#EAE8E1] text-[#2B2926] border border-[#E5E2D9] transition flex items-center space-x-1.5 cursor-pointer">
              <svg class="w-3.5 h-3.5 text-[#C25E3E]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
              <span>📁 Categories (${categories.length})</span>
            </button>
            <a href="/admin/new" class="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#C25E3E] hover:bg-[#B05335] text-white transition flex items-center space-x-1 shadow-sm">
              <span>+ New Article</span>
            </a>
          </div>
        </div>

        <!-- PUBLISHED BULK ACTION BAR -->
        <div id="publishedBulkBar" class="hidden bg-amber-50/90 border-b border-amber-200 px-5 py-2.5 flex items-center justify-between transition-all">
          <div class="flex items-center space-x-2 text-xs font-bold text-amber-900">
            <span class="w-2.5 h-2.5 rounded-full bg-amber-600 animate-pulse"></span>
            <span>បានជ្រើសរើស (Selected): <span id="publishedSelectedCount" class="font-mono text-sm underline font-black">0</span> អត្ថបទ</span>
          </div>
          <div class="flex items-center space-x-2">
            <button type="button" onclick="bulkMoveToTrash()" class="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center space-x-1.5 transition shadow-xs cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              <span>Move Selected to Trash</span>
            </button>
            <button type="button" onclick="deselectAll('published')" class="px-2.5 py-1.5 rounded-lg bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold cursor-pointer">បោះបង់</button>
          </div>
        </div>

        <!-- TRASH BULK ACTION BAR -->
        <div id="trashBulkBar" class="hidden bg-rose-50/90 border-b border-rose-200 px-5 py-2.5 flex items-center justify-between transition-all">
          <div class="flex items-center space-x-2 text-xs font-bold text-rose-900">
            <span class="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></span>
            <span>បានជ្រើសរើស (Selected in Trash): <span id="trashSelectedCount" class="font-mono text-sm underline font-black">0</span> អត្ថបទ</span>
          </div>
          <div class="flex items-center space-x-2">
            <button type="button" onclick="bulkRestore()" class="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 transition shadow-xs cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              <span>♻️ Restore Selected</span>
            </button>
            <button type="button" onclick="bulkDeletePermanent()" class="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center space-x-1.5 transition shadow-xs cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              <span>❌ Delete Permanently</span>
            </button>
            <button type="button" onclick="deselectAll('trash')" class="px-2.5 py-1.5 rounded-lg bg-white hover:bg-rose-100 text-rose-800 border border-rose-300 text-xs font-semibold cursor-pointer">បោះបង់</button>
          </div>
        </div>

        <!-- VIEW 1A: ACTIVE PUBLISHED POSTS -->
        <div id="activePostsView" class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-[#F3F1EC] border-b border-[#EAE8E1] text-[#6E6B63] uppercase font-semibold">
              <tr>
                <th class="py-3 px-4 w-10 text-center">
                  <input type="checkbox" id="selectAllPublished" onchange="toggleSelectAll('published', this.checked)" class="w-4 h-4 rounded border-[#E5E2D9] text-[#C25E3E] focus:ring-[#C25E3E] cursor-pointer" title="Select all published articles">
                </th>
                <th class="py-3 px-4">Headline & Article</th>
                <th class="py-3 px-4">Category</th>
                <th class="py-3 px-4">Author</th>
                <th class="py-3 px-4 text-center">Breaking?</th>
                <th class="py-3 px-4 text-center">Views</th>
                <th class="py-3 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#EAE8E1] text-[#2B2926]">
              ${activePosts.length === 0 ? `
                <tr>
                  <td colspan="7" class="text-center py-12 text-[#8A867E]">
                    <div class="text-sm font-semibold text-[#6E6B63] mb-1">No published articles</div>
                    <div class="text-xs text-[#8A867E] mb-4">Start by writing and publishing your first article!</div>
                    <a href="/admin/new" class="px-4 py-2 rounded-xl bg-[#C25E3E] hover:bg-[#B05335] text-white font-bold text-xs inline-flex items-center space-x-1.5 transition shadow-sm">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                      <span>+ Publish First Story</span>
                    </a>
                  </td>
                </tr>
              ` : activePosts.map(p => `
                <tr class="hover:bg-[#FAF9F5] transition">
                  <td class="py-4 px-4 text-center">
                    <input type="checkbox" class="post-check-published w-4 h-4 rounded border-[#E5E2D9] text-[#C25E3E] focus:ring-[#C25E3E] cursor-pointer" value="${p.id}" onchange="updateBulkBar('published')">
                  </td>
                  <td class="py-4 px-4">
                    <div class="flex items-center space-x-3">
                      ${p.featured_image ? `<img src="${p.featured_image}" class="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-[#EAE8E1]">` : ''}
                      <div>
                        <a href="/admin/edit/${p.id}" class="font-bold text-[#1C1B18] hover:text-[#C25E3E] text-sm line-clamp-1 transition">
                          ${p.title}
                        </a>
                        <div class="text-[11px] text-[#8A867E] mt-0.5">/article/${p.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td class="py-4 px-4">
                    <span class="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#F3F1EC] text-[#2B2926] border border-[#E5E2D9]">
                      ${p.category_name || 'General'}
                    </span>
                  </td>
                  <td class="py-4 px-4 font-medium text-[#2B2926]">${p.author_name}</td>
                  <td class="py-4 px-4 text-center">
                    ${p.is_breaking === 1 ? `
                      <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                        BREAKING
                      </span>` : `
                      <span class="text-[#8A867E] text-[11px]">-</span>`}
                  </td>
                  <td class="py-4 px-4 text-center font-mono">
                    <span class="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-[#F3F1EC] text-[#2B2926] border border-[#E5E2D9] text-xs font-semibold">
                      <svg class="w-3.5 h-3.5 text-[#C25E3E]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                      <span>${p.views.toLocaleString()}</span>
                    </span>
                  </td>
                  <td class="py-4 px-6 text-center whitespace-nowrap">
                    <div class="inline-flex items-center space-x-1.5 bg-[#F3F1EC] p-1.5 rounded-xl border border-[#E5E2D9]">
                      <a href="/article/${p.slug}" target="_blank" class="px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#EAE8E1] text-[#2B2926] text-xs font-semibold flex items-center space-x-1 transition shadow-xs border border-[#E5E2D9]" title="View live article">
                        <svg class="w-3.5 h-3.5 text-[#6E6B63]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                        <span>View</span>
                      </a>
                      <a href="/admin/edit/${p.id}" class="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold flex items-center space-x-1 transition shadow-xs" title="Edit story">
                        <svg class="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        <span>Edit</span>
                      </a>
                      <button type="button" onclick="moveToTrash(${p.id})" class="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold flex items-center space-x-1 transition shadow-xs cursor-pointer" title="Move story to trash (អាចស្តារមកវិញបាន)">
                        <svg class="w-3.5 h-3.5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        <span>Move to Trash</span>
                      </button>
                    </div>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>

        <!-- VIEW 1B: TRASH BIN POSTS -->
        <div id="trashPostsView" class="hidden overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-[#FDF2E9] border-b border-[#EAE8E1] text-[#B45309] uppercase font-semibold">
              <tr>
                <th class="py-3 px-4 w-10 text-center">
                  <input type="checkbox" id="selectAllTrash" onchange="toggleSelectAll('trash', this.checked)" class="w-4 h-4 rounded border-[#E5E2D9] text-rose-600 focus:ring-rose-500 cursor-pointer" title="Select all trash">
                </th>
                <th class="py-3 px-4">Trashed Article</th>
                <th class="py-3 px-4">Category</th>
                <th class="py-3 px-4">Views Recorded</th>
                <th class="py-3 px-4">Status</th>
                <th class="py-3 px-6 text-center">Safety Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#EAE8E1] text-[#2B2926]">
              ${trashPosts.length === 0 ? `
                <tr>
                  <td colspan="6" class="text-center py-12 text-[#8A867E]">
                    <div class="text-base font-bold text-[#1C1B18] mb-1">🎉 Trash bin is clean and empty!</div>
                    <div class="text-xs text-[#8A867E]">No articles in the trash. When you move an article to trash, it safely rests here.</div>
                  </td>
                </tr>
              ` : trashPosts.map(p => `
                <tr class="hover:bg-rose-50/30 transition">
                  <td class="py-4 px-4 text-center">
                    <input type="checkbox" class="post-check-trash w-4 h-4 rounded border-[#E5E2D9] text-rose-600 focus:ring-rose-500 cursor-pointer" value="${p.id}" onchange="updateBulkBar('trash')">
                  </td>
                  <td class="py-4 px-4">
                    <div class="flex items-center space-x-3">
                      ${p.featured_image ? `<img src="${p.featured_image}" class="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-[#EAE8E1] opacity-60">` : ''}
                      <div>
                        <div class="font-bold text-[#1C1B18] text-sm line-clamp-1 line-through opacity-75">
                          ${p.title}
                        </div>
                        <div class="text-[11px] text-[#8A867E] mt-0.5">/article/${p.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td class="py-4 px-4">
                    <span class="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#F3F1EC] text-[#2B2926] border border-[#E5E2D9]">
                      ${p.category_name || 'General'}
                    </span>
                  </td>
                  <td class="py-4 px-4 font-mono text-[#6E6B63]">${p.views.toLocaleString()} views</td>
                  <td class="py-4 px-4">
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      In Trash (Protected)
                    </span>
                  </td>
                  <td class="py-4 px-6 text-center whitespace-nowrap">
                    <div class="inline-flex items-center space-x-2 bg-[#F3F1EC] p-1.5 rounded-xl border border-[#E5E2D9]">
                      <button type="button" onclick="restorePost(${p.id})" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 transition shadow-xs cursor-pointer" title="Restore article back to website">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                        <span>♻️ Restore</span>
                      </button>
                      <button type="button" onclick="deletePermanently(${p.id})" class="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center space-x-1.5 transition shadow-xs cursor-pointer" title="Delete permanently from database">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        <span>❌ Delete Permanently</span>
                      </button>
                    </div>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ==================== VIEW 2: DEDICATED WHOS.AMUNG.US LIVE TRACKER ==================== -->
    <div id="mainTrackingView" class="hidden space-y-5">

      <!-- Whos.amung.us Authentic Brand Navigation Bar -->
      <div class="bg-white border border-[#EAE8E1] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <!-- Logo & Title -->
        <div class="flex items-center space-x-3">
          <div class="flex items-center space-x-1.5 select-none">
            <span class="text-xl sm:text-2xl font-black font-serif italic text-[#1C1B18] tracking-tight">wh<span class="text-[#C25E3E] font-bold">o</span>'s.amung.us</span>
            <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-600 text-white text-xs font-black shadow-xs">🏃</span>
          </div>
          <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Private Edge Tracker
          </span>
        </div>

        <!-- Sub Tabs (Dashboard vs Readers) -->
        <div class="flex items-center bg-[#FAF9F5] border border-[#E5E2D9] p-1 rounded-xl space-x-1">
          <button type="button" onclick="switchWhosSubTab('dashboard')" id="whosSubTabDashboardBtn" class="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white text-[#1C1B18] shadow-xs border border-[#E5E2D9] transition cursor-pointer flex items-center space-x-1.5 underline decoration-[#C25E3E] decoration-2">
            <span>📊 DASHBOARD</span>
          </button>
          <button type="button" onclick="switchWhosSubTab('readers')" id="whosSubTabReadersBtn" class="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#6E6B63] hover:text-[#1C1B18] transition cursor-pointer flex items-center space-x-1.5">
            <span>👥 READERS</span>
            <span id="whosSubTabCount" class="bg-rose-100 text-rose-800 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full">0</span>
          </button>
        </div>
      </div>

      <!-- ================= SUB-VIEW 1: DASHBOARD ================= -->
      <div id="whosSubViewDashboard" class="space-y-6">
        
        <!-- Header row matching screenshot: Speedometer icon + Dashboard (count) -->
        <div class="flex items-center justify-between border-b-2 border-dotted border-[#D5D2C9] pb-3">
          <div class="flex items-center space-x-2.5">
            <span class="text-2xl text-slate-700">🧭</span>
            <h2 class="text-xl sm:text-2xl font-bold text-[#1C1B18] font-sans">
              Dashboard (<span id="whosDashCount" class="font-mono text-[#C25E3E]">0</span>)
            </h2>
          </div>
          <div class="flex items-center space-x-2 text-xs text-[#6E6B63]">
            <span class="relative flex h-2.5 w-2.5">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span class="font-mono">Live auto-sync (3s)</span>
          </div>
        </div>

        <!-- Dashboard Grid: Readers (left) + Countries Proportions (right) -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">

          <!-- Left Column: Top Readers / Stories -->
          <div class="lg:col-span-6 bg-white border border-[#EAE8E1] rounded-2xl p-5 shadow-xs space-y-4">
            <div class="flex items-center justify-between border-b border-[#EAE8E1] pb-2.5">
              <div class="flex items-center space-x-2">
                <span class="text-sm font-bold text-[#6E6B63]">½</span>
                <h3 class="font-bold text-sm text-[#1C1B18]">Readers</h3>
              </div>
              <span class="text-[11px] font-mono text-[#6E6B63]">Active split</span>
            </div>

            <!-- List of Top Stories -->
            <div id="whosTopReadersList" class="space-y-3 max-h-96 overflow-y-auto pr-1">
              <div class="text-xs text-[#8A867E] italic py-8 text-center">កំពុងរង់ចាំអ្នកអាន... (Waiting for active visitors)</div>
            </div>
          </div>

          <!-- Right Column: Countries with Proportional Flag Mosaic -->
          <div class="lg:col-span-6 bg-white border border-[#EAE8E1] rounded-2xl p-5 shadow-xs space-y-4">
            <div class="flex items-center justify-between border-b border-[#EAE8E1] pb-2.5">
              <div class="flex items-center space-x-2">
                <span class="text-sm">🚩</span>
                <h3 class="font-bold text-sm text-[#1C1B18]">Countries</h3>
              </div>
              <span id="whosCountryCountBadge" class="text-xs font-mono font-bold bg-[#FAF9F5] text-[#2B2926] px-2 py-0.5 rounded border border-[#E5E2D9]">
                0 Countries
              </span>
            </div>

            <!-- Proportional Flags Display -->
            <div id="whosFlagsMosaic" class="flex flex-wrap gap-2.5 p-3 bg-[#FAF9F5] rounded-xl border border-[#EAE8E1] min-h-[100px] items-center justify-center">
              <div class="text-xs text-[#8A867E] italic py-6 text-center">No country data yet</div>
            </div>

            <!-- Country Detailed List -->
            <div id="whosCountryList" class="space-y-2 max-h-56 overflow-y-auto pr-1"></div>
          </div>

        </div>

        <!-- 3-Column Bottom Row: Devices + OS + Referrers -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
          <!-- Devices -->
          <div class="bg-white border border-[#EAE8E1] rounded-2xl p-4 shadow-xs space-y-2.5">
            <div class="flex items-center justify-between border-b border-[#EAE8E1] pb-2">
              <h4 class="font-bold text-xs text-[#1C1B18] flex items-center space-x-1.5">
                <span>💻</span>
                <span>Devices</span>
              </h4>
              <span class="text-[10px] font-mono text-[#6E6B63]">Active</span>
            </div>
            <div class="grid grid-cols-3 gap-2 text-center pt-1">
              <div class="p-2 rounded-xl bg-[#FAF9F5] border border-[#EAE8E1]">
                <div class="text-base">📱</div>
                <div class="text-[10px] font-bold text-[#6E6B63]">Mobile</div>
                <div id="deviceMobileCount" class="text-sm font-bold text-[#1C1B18] font-mono mt-0.5">0</div>
              </div>
              <div class="p-2 rounded-xl bg-[#FAF9F5] border border-[#EAE8E1]">
                <div class="text-base">💻</div>
                <div class="text-[10px] font-bold text-[#6E6B63]">Desktop</div>
                <div id="deviceDesktopCount" class="text-sm font-bold text-[#1C1B18] font-mono mt-0.5">0</div>
              </div>
              <div class="p-2 rounded-xl bg-[#FAF9F5] border border-[#EAE8E1]">
                <div class="text-base">📟</div>
                <div class="text-[10px] font-bold text-[#6E6B63]">Tablet</div>
                <div id="deviceTabletCount" class="text-sm font-bold text-[#1C1B18] font-mono mt-0.5">0</div>
              </div>
            </div>
          </div>

          <!-- Operating Systems -->
          <div class="bg-white border border-[#EAE8E1] rounded-2xl p-4 shadow-xs space-y-2.5">
            <div class="flex items-center justify-between border-b border-[#EAE8E1] pb-2">
              <h4 class="font-bold text-xs text-[#1C1B18] flex items-center space-x-1.5">
                <span>🤖</span>
                <span>Operating Systems</span>
              </h4>
              <span class="text-[10px] font-mono text-[#6E6B63]">Active</span>
            </div>
            <div class="grid grid-cols-3 gap-2 text-center pt-1">
              <div class="p-2 rounded-xl bg-[#FAF9F5] border border-[#EAE8E1]">
                <div class="text-base">🤖</div>
                <div class="text-[10px] font-bold text-[#6E6B63]">Android</div>
                <div id="osAndroidCount" class="text-sm font-bold text-[#1C1B18] font-mono mt-0.5">0</div>
              </div>
              <div class="p-2 rounded-xl bg-[#FAF9F5] border border-[#EAE8E1]">
                <div class="text-base">🍏</div>
                <div class="text-[10px] font-bold text-[#6E6B63]">Apple/iOS</div>
                <div id="osAppleCount" class="text-sm font-bold text-[#1C1B18] font-mono mt-0.5">0</div>
              </div>
              <div class="p-2 rounded-xl bg-[#FAF9F5] border border-[#EAE8E1]">
                <div class="text-base">🪟</div>
                <div class="text-[10px] font-bold text-[#6E6B63]">Windows</div>
                <div id="osWindowsCount" class="text-sm font-bold text-[#1C1B18] font-mono mt-0.5">0</div>
              </div>
            </div>
          </div>

          <!-- Referrers (Facebook, Google, Direct) -->
          <div class="bg-white border border-[#EAE8E1] rounded-2xl p-4 shadow-xs space-y-2.5">
            <div class="flex items-center justify-between border-b border-[#EAE8E1] pb-2">
              <h4 class="font-bold text-xs text-[#1C1B18] flex items-center space-x-1.5">
                <span class="text-blue-600 font-black">ⓕ</span>
                <span>Referral Sources</span>
              </h4>
              <span class="text-[10px] font-mono text-[#6E6B63]">Origin</span>
            </div>
            <div class="grid grid-cols-3 gap-2 text-center pt-1">
              <div class="p-2 rounded-xl bg-[#FAF9F5] border border-[#EAE8E1]">
                <div class="w-5 h-5 mx-auto bg-[#1877F2] text-white rounded-full text-[11px] font-black flex items-center justify-center mb-0.5">f</div>
                <div class="text-[10px] font-bold text-[#6E6B63]">Facebook</div>
                <div id="refFacebookCount" class="text-sm font-bold text-[#1C1B18] font-mono mt-0.5">0</div>
              </div>
              <div class="p-2 rounded-xl bg-[#FAF9F5] border border-[#EAE8E1]">
                <div class="w-5 h-5 mx-auto bg-red-500 text-white rounded-full text-[11px] font-black flex items-center justify-center mb-0.5">G</div>
                <div class="text-[10px] font-bold text-[#6E6B63]">Google</div>
                <div id="refGoogleCount" class="text-sm font-bold text-[#1C1B18] font-mono mt-0.5">0</div>
              </div>
              <div class="p-2 rounded-xl bg-[#FAF9F5] border border-[#EAE8E1]">
                <div class="w-5 h-5 mx-auto bg-slate-700 text-white rounded-full text-[11px] font-black flex items-center justify-center mb-0.5">🔗</div>
                <div class="text-[10px] font-bold text-[#6E6B63]">Direct</div>
                <div id="refDirectCount" class="text-sm font-bold text-[#1C1B18] font-mono mt-0.5">0</div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- ================= SUB-VIEW 2: READERS (AUTHENTIC WHOS.AMUNG.US) ================= -->
      <div id="whosSubViewReaders" class="hidden space-y-4">
        
        <!-- Header row matching screenshot: List icon + Readers (count) + 2 Interactive Toggle Buttons -->
        <div class="flex items-center justify-between border-b-2 border-dotted border-[#B0B0B0] pb-3">
          <div class="flex items-center space-x-2.5">
            <span class="text-xl font-black text-[#555] select-none">½ ≡</span>
            <h2 class="text-2xl sm:text-3xl font-extrabold text-[#1C1B18] font-sans tracking-tight">
              Readers (<span id="whosReadersCount" class="font-mono text-[#1C1B18]">0</span>)
            </h2>
          </div>
          <div class="flex items-center space-x-2">
            <!-- Button 1: Stream / Recent Visitors View (List icon) -->
            <button type="button" id="btnReadersModeList" onclick="setReadersMode('visitors')" class="w-8 h-8 rounded-full bg-[#1C1B18] text-white flex items-center justify-center text-xs font-bold shadow-xs transition hover:scale-105 cursor-pointer focus:outline-none" title="Stream View (Recent Visitors)">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
            <!-- Button 2: Page-by-Page Breakdown View (Person head icon in Blue) -->
            <button type="button" id="btnReadersModePages" onclick="setReadersMode('pages')" class="w-8 h-8 rounded-full bg-[#0099FF] text-white flex items-center justify-center text-xs font-bold shadow-xs transition hover:scale-105 cursor-pointer focus:outline-none ring-2 ring-[#0099FF]/30" title="Readers per Page View (Breakdown with %)">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/></svg>
            </button>
          </div>
        </div>

        <!-- Live Readers Feed matching Screenshot -->
        <div class="bg-white border border-[#EAE8E1] rounded-2xl p-4 sm:p-6 shadow-xs">
          <div id="whosReadersTableList" class="divide-y divide-[#F0EDE6]/60 max-h-[700px] overflow-y-auto">
            <div class="text-xs text-[#8A867E] italic py-12 text-center">
              កំពុងរង់ចាំអ្នកអាន... (No active readers online. Open your website in another window or phone to see live updates!)
            </div>
          </div>
        </div>

      </div>

    </div>

  </div>

  <!-- Manage Categories Modal in Claude Light Mode -->
  <div id="catModal" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm hidden flex items-center justify-center p-4">
    <div class="bg-white border border-[#EAE8E1] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-[#1C1B18]">
      <div class="flex items-center justify-between border-b border-[#EAE8E1] pb-3">
        <div class="flex items-center space-x-2">
          <span class="text-base font-bold text-[#1C1B18]">📁 Manage News Categories</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F3F1EC] text-[#2B2926] border border-[#E5E2D9]">${categories.length} active</span>
        </div>
        <button onclick="closeCategoriesModal()" class="text-[#6E6B63] hover:text-[#1C1B18] text-lg font-bold px-2 cursor-pointer">&times;</button>
      </div>

      <!-- Add New Category Form -->
      <form onsubmit="handleCreateCategory(event)" class="bg-[#FAF9F5] p-4 rounded-2xl border border-[#EAE8E1] space-y-3">
        <span class="text-xs font-bold text-[#1C1B18] uppercase tracking-wider block">+ Add New Category</span>
        <div class="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div class="sm:col-span-8">
            <input type="text" id="newCatName" required placeholder="Category Name (e.g. World, Politics, Sports)" class="w-full bg-white border border-[#E5E2D9] rounded-xl px-3 py-2 text-xs text-[#1C1B18] placeholder-slate-400 focus:outline-none focus:border-[#C25E3E]">
          </div>
          <div class="sm:col-span-4 flex items-center space-x-2">
            <input type="color" id="newCatColor" value="#c25e3e" class="w-9 h-9 rounded-xl border border-[#E5E2D9] bg-white cursor-pointer p-0.5 flex-shrink-0" title="Badge Color">
            <button type="submit" id="addCatBtn" class="flex-1 py-2 px-3 bg-[#C25E3E] hover:bg-[#B05335] text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer">Add</button>
          </div>
        </div>
      </form>

      <!-- Existing Categories List -->
      <div class="space-y-2 max-h-60 overflow-y-auto pr-1">
        <span class="text-[11px] font-bold text-[#6E6B63] uppercase tracking-wider block">Current Categories:</span>
        <div class="space-y-1.5" id="categoriesListContainer">
          ${categories.map(cat => `
            <div class="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF9F5] border border-[#EAE8E1]">
              <div class="flex items-center space-x-2.5">
                <span class="w-3.5 h-3.5 rounded-full flex-shrink-0" style="background-color: ${cat.color}"></span>
                <span class="font-bold text-xs text-[#1C1B18]">${cat.name}</span>
                <span class="text-[11px] font-mono text-[#8A867E]">/${cat.slug}</span>
              </div>
              ${categories.length > 1 ? `
                <button type="button" onclick="deleteCategory(${cat.id})" class="text-rose-600 hover:text-rose-700 text-xs px-2 py-0.5 rounded hover:bg-rose-50 transition cursor-pointer">Delete</button>
              ` : `
                <span class="text-[10px] text-[#8A867E]">Default (Protected)</span>
              `}
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  </div>

  <!-- BACKUP & DATA PROTECTION MODAL -->
  <div id="backupModal" class="hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#EAE8E1] space-y-5">
      <div class="flex items-center justify-between border-b border-[#EAE8E1] pb-3">
        <div class="flex items-center space-x-2">
          <span class="text-xl">💾</span>
          <div>
            <h3 class="font-black text-[#1C1B18] text-base">Data Protection & Backup</h3>
            <p class="text-[11px] text-[#6E6B63]">ការពារ និងរក្សាទុកទិន្នន័យអត្ថបទទាំងអស់</p>
          </div>
        </div>
        <button onclick="closeBackupModal()" type="button" class="w-8 h-8 rounded-full bg-[#F3F1EC] hover:bg-[#EAE8E1] text-[#6E6B63] hover:text-[#1C1B18] border border-[#E5E2D9] flex items-center justify-center transition cursor-pointer">✕</button>
      </div>

      <!-- Persistent Storage Security Badge -->
      <div class="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-1">
        <div class="font-bold flex items-center space-x-1.5">
          <span>🛡️</span>
          <span>Persistent Storage Active</span>
          <span class="px-1.5 py-0.5 rounded text-[10px] bg-emerald-200 text-emerald-900 font-mono">100% Protected</span>
        </div>
        <p class="text-[11px] text-emerald-700 leading-relaxed">
          Database ត្រូវបានផ្លាស់ទីទៅកាន់ <code>/var/www/data/news.sqlite</code> ដោយសុវត្ថិភាពក្រៅ Git Directory។ រាល់ពេល deploy កូដថ្មី អត្ថបទនឹងមិនបាត់បង់ទៀតឡើយ!
        </p>
      </div>

      <!-- Backup Actions -->
      <div class="space-y-3 pt-1">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          
          <!-- Action 1: Download SQLite -->
          <a href="/api/system/backup-db" target="_blank" class="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#EAE8E1] hover:border-[#C25E3E] transition space-y-1 block group">
            <div class="font-bold text-xs text-[#1C1B18] group-hover:text-[#C25E3E] flex items-center space-x-1.5">
              <span>📥</span>
              <span>Download Database</span>
            </div>
            <p class="text-[10px] text-[#6E6B63]">Full SQLite file (.sqlite) with all posts and tables</p>
          </a>

          <!-- Action 2: Export JSON -->
          <a href="/api/system/export-posts" target="_blank" class="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#EAE8E1] hover:border-[#C25E3E] transition space-y-1 block group">
            <div class="font-bold text-xs text-[#1C1B18] group-hover:text-[#C25E3E] flex items-center space-x-1.5">
              <span>📄</span>
              <span>Export Articles</span>
            </div>
            <p class="text-[10px] text-[#6E6B63]">Readable JSON format for backup or migration</p>
          </a>

        </div>

        <!-- Action 3: Restore / Import JSON -->
        <div class="p-3.5 rounded-2xl bg-[#F8F7F3] border border-[#EAE8E1] space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-[#1C1B18]">Restore / Import Articles from JSON</span>
            <span class="text-[10px] text-[#6E6B63]">Upload .json</span>
          </div>
          <div class="flex items-center space-x-2">
            <input type="file" id="importJsonFileInput" accept=".json" class="hidden" onchange="handleImportJsonFile(event)">
            <button type="button" onclick="document.getElementById('importJsonFileInput').click()" class="w-full py-2 px-3 rounded-xl bg-white hover:bg-[#FAF9F5] border border-[#E5E2D9] text-[#1C1B18] font-bold text-xs transition flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer">
              <span>📤</span>
              <span>Select & Restore JSON Backup File</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  </div>

  <script>
    // ================= MAIN TABS SWITCHER =================
    function switchMainTab(tab) {
      const artBtn = document.getElementById('mainTabArticlesBtn');
      const trkBtn = document.getElementById('mainTabTrackingBtn');
      const artView = document.getElementById('mainArticlesView');
      const trkView = document.getElementById('mainTrackingView');

      if (tab === 'articles') {
        artBtn.className = 'px-4 py-2 rounded-xl font-bold text-xs bg-white text-[#1C1B18] shadow-sm border border-[#E5E2D9] flex items-center space-x-2 transition cursor-pointer';
        trkBtn.className = 'px-4 py-2 rounded-xl font-semibold text-xs text-[#6E6B63] hover:text-[#1C1B18] flex items-center space-x-2 transition cursor-pointer';
        artView.classList.remove('hidden');
        trkView.classList.add('hidden');
      } else {
        trkBtn.className = 'px-4 py-2 rounded-xl font-bold text-xs bg-emerald-600 text-white shadow-sm flex items-center space-x-2 transition cursor-pointer';
        artBtn.className = 'px-4 py-2 rounded-xl font-semibold text-xs text-[#6E6B63] hover:text-[#1C1B18] flex items-center space-x-2 transition cursor-pointer';
        trkView.classList.remove('hidden');
        artView.classList.add('hidden');
      }
    }

    // ================= WHOS.AMUNG.US SUB-TABS SWITCHER =================
    function switchWhosSubTab(sub) {
      const dashBtn = document.getElementById('whosSubTabDashboardBtn');
      const readBtn = document.getElementById('whosSubTabReadersBtn');
      const dashView = document.getElementById('whosSubViewDashboard');
      const readView = document.getElementById('whosSubViewReaders');

      if (sub === 'dashboard') {
        dashBtn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white text-[#1C1B18] shadow-xs border border-[#E5E2D9] transition cursor-pointer flex items-center space-x-1.5 underline decoration-[#C25E3E] decoration-2';
        readBtn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#6E6B63] hover:text-[#1C1B18] transition cursor-pointer flex items-center space-x-1.5';
        dashView.classList.remove('hidden');
        readView.classList.add('hidden');
      } else {
        readBtn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white text-[#1C1B18] shadow-xs border border-[#E5E2D9] transition cursor-pointer flex items-center space-x-1.5 underline decoration-[#C25E3E] decoration-2';
        dashBtn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#6E6B63] hover:text-[#1C1B18] transition cursor-pointer flex items-center space-x-1.5';
        readView.classList.remove('hidden');
        dashView.classList.add('hidden');
      }
    }

    // ================= POSTS SUB-TABS (PUBLISHED / TRASH) =================
    function switchPostsTab(tab) {
      const activeBtn = document.getElementById('tabActivePostsBtn');
      const trashBtn = document.getElementById('tabTrashPostsBtn');
      const activeBox = document.getElementById('activePostsView');
      const trashBox = document.getElementById('trashPostsView');
      const trashActions = document.getElementById('trashTabActions');
      const subtitle = document.getElementById('tabSubtitle');

      if (tab === 'active') {
        activeBtn.className = 'px-3 py-1 rounded-lg font-bold bg-[#C25E3E] text-white shadow-xs transition cursor-pointer';
        trashBtn.className = 'px-3 py-1 rounded-lg font-semibold text-[#6E6B63] hover:text-[#1C1B18] transition flex items-center space-x-1 cursor-pointer';
        activeBox.classList.remove('hidden');
        trashBox.classList.add('hidden');
        if (trashActions) trashActions.classList.add('hidden');
        if (subtitle) subtitle.textContent = 'Manage active stories, tick multiple articles to bulk move to trash or publish';
      } else {
        trashBtn.className = 'px-3 py-1 rounded-lg font-bold bg-rose-700 text-white shadow-xs transition flex items-center space-x-1 cursor-pointer';
        activeBtn.className = 'px-3 py-1 rounded-lg font-semibold text-[#6E6B63] hover:text-[#1C1B18] transition cursor-pointer';
        trashBox.classList.remove('hidden');
        activeBox.classList.add('hidden');
        if (trashActions) trashActions.classList.remove('hidden');
        if (subtitle) subtitle.textContent = 'Articles in trash bin. You can tick multiple to restore or delete permanently.';
      }
    }

    // ================= BULK ACTIONS ENGINE =================
    function toggleSelectAll(type, checked) {
      const selector = type === 'published' ? '.post-check-published' : '.post-check-trash';
      const checkboxes = document.querySelectorAll(selector);
      checkboxes.forEach(cb => { cb.checked = checked; });
      updateBulkBar(type);
    }

    function deselectAll(type) {
      const master = document.getElementById(type === 'published' ? 'selectAllPublished' : 'selectAllTrash');
      if (master) master.checked = false;
      toggleSelectAll(type, false);
    }

    function getSelectedIds(type) {
      const selector = type === 'published' ? '.post-check-published:checked' : '.post-check-trash:checked';
      const checkboxes = document.querySelectorAll(selector);
      const ids = [];
      checkboxes.forEach(cb => {
        const val = Number(cb.value);
        if (val) ids.push(val);
      });
      return ids;
    }

    function updateBulkBar(type) {
      const ids = getSelectedIds(type);
      const bar = document.getElementById(type === 'published' ? 'publishedBulkBar' : 'trashBulkBar');
      const countEl = document.getElementById(type === 'published' ? 'publishedSelectedCount' : 'trashSelectedCount');
      if (!bar || !countEl) return;

      countEl.textContent = String(ids.length);
      if (ids.length > 0) {
        bar.classList.remove('hidden');
      } else {
        bar.classList.add('hidden');
        const master = document.getElementById(type === 'published' ? 'selectAllPublished' : 'selectAllTrash');
        if (master) master.checked = false;
      }
    }

    async function bulkMoveToTrash() {
      const ids = getSelectedIds('published');
      if (ids.length === 0) return alert('សូមជ្រើសរើសអត្ថបទយ៉ាងតិចមួយ (Please select at least 1 article)');
      if (!confirm('តើអ្នកចង់ Move អត្ថបទដែលបានជ្រើសរើសចំនួន ' + ids.length + ' ទៅកាន់ធុងសម្រាម (Trash)?\\n\\n✓ អត្ថបទនឹងមិនទាន់បាត់បង់ទេ អ្នកអាច Restore មកវិញបានគ្រប់ពេល។')) return;

      try {
        const res = await fetch('/api/posts/bulk/trash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids })
        });
        const data = await res.json();
        if (data.success) {
          alert('✓ បានផ្លាស់ទី ' + data.count + ' អត្ថបទទៅកាន់ធុងសម្រាមដោយជោគជ័យ!');
          window.location.reload();
        } else {
          alert('Error: ' + (data.error || 'Failed to move articles'));
        }
      } catch (err) {
        alert('Network error: ' + err.message);
      }
    }

    async function bulkRestore() {
      const ids = getSelectedIds('trash');
      if (ids.length === 0) return alert('សូមជ្រើសរើសអត្ថបទយ៉ាងតិចមួយ (Please select at least 1 article)');
      if (!confirm('តើអ្នកចង់ Restore អត្ថបទដែលបានជ្រើសរើសចំនួន ' + ids.length + ' ត្រឡប់មក Website វិញមែនទេ?')) return;

      try {
        const res = await fetch('/api/posts/bulk/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids })
        });
        const data = await res.json();
        if (data.success) {
          alert('✓ បានស្តារឡើងវិញ (Restored) ' + data.count + ' អត្ថបទដោយជោគជ័យ!');
          window.location.reload();
        } else {
          alert('Error: ' + (data.error || 'Failed to restore'));
        }
      } catch (err) {
        alert('Network error: ' + err.message);
      }
    }

    async function bulkDeletePermanent() {
      const ids = getSelectedIds('trash');
      if (ids.length === 0) return alert('សូមជ្រើសរើសអត្ថបទយ៉ាងតិចមួយ (Please select at least 1 article)');
      if (!confirm('⚠️ តើអ្នកពិតជាចង់លុបអត្ថបទចំនួន ' + ids.length + ' នេះជាអចិន្ត្រៃយ៍មែនទេ?\\n\\n🚨 ការព្រមាន៖ អត្ថបទទាំងនេះនឹងត្រូវលុបចេញពី Database រហូត មិនអាចយកមកវិញបានឡើយ!')) return;

      try {
        const res = await fetch('/api/posts/bulk/delete-permanent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids })
        });
        const data = await res.json();
        if (data.success) {
          alert('✓ បានលុបជាអចិន្ត្រៃយ៍ ' + data.count + ' អត្ថបទរួចរាល់!');
          window.location.reload();
        } else {
          alert('Error: ' + (data.error || 'Failed to delete'));
        }
      } catch (err) {
        alert('Network error: ' + err.message);
      }
    }

    // ================= SINGLE ITEM ACTIONS =================
    async function moveToTrash(id) {
      if (!confirm('Move this story to Trash?\\n\\n✓ អត្ថបទនឹងមិនទាន់បាត់បង់ទេ អ្នកអាច Restore មកវិញបានគ្រប់ពេល។')) return;
      try {
        const res = await fetch('/api/posts/' + id + '/trash', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          window.location.reload();
        } else {
          alert('Error moving to trash: ' + (data.error || 'Failed'));
        }
      } catch (err) {
        alert('Network error: ' + err.message);
      }
    }

    async function restorePost(id) {
      try {
        const res = await fetch('/api/posts/' + id + '/restore', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          alert('✓ អត្ថបទត្រូវបានស្តារឡើងវិញ (Restored) ដោយជោគជ័យ!');
          window.location.reload();
        } else {
          alert('Error restoring post: ' + (data.error || 'Failed'));
        }
      } catch (err) {
        alert('Network error: ' + err.message);
      }
    }

    async function deletePermanently(id) {
      if (!confirm('⚠️ តើអ្នកពិតជាចង់លុបអត្ថបទនេះជាអចិន្ត្រៃយ៍មែនទេ?\\n\\n🚨 ការព្រមាន៖ អត្ថបទនេះនឹងត្រូវលុបចេញពី Database រហូត មិនអាចយកមកវិញបានឡើយ!')) return;
      try {
        const res = await fetch('/api/posts/' + id + '?permanent=true', { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          alert('✓ អត្ថបទត្រូវបានលុបជាអចិន្ត្រៃយ៍រួចរាល់!');
          window.location.reload();
        } else {
          alert('Error deleting post: ' + (data.error || 'Failed'));
        }
      } catch (err) {
        alert('Network error: ' + err.message);
      }
    }

    async function emptyTrash() {
      if (!confirm('⚠️ តើអ្នកប្រាកដថាចង់សម្អាតធុងសម្រាមទាំងមូល (Empty Trash)?\\n\\n🚨 រាល់អត្ថបទទាំងអស់ក្នុងធុងសម្រាម នឹងត្រូវលុបជាអចិន្ត្រៃយ៍!')) return;
      try {
        const res = await fetch('/api/posts/trash/empty', { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          alert('✓ ធុងសម្រាមត្រូវបានសម្អាតស្អាតជាស្ថាពរ!');
          window.location.reload();
        } else {
          alert('Error emptying trash: ' + (data.error || 'Failed'));
        }
      } catch (err) {
        alert('Network error: ' + err.message);
      }
    }

    // ================= BACKUP & MODALS =================
    function openBackupModal() {
      document.getElementById('backupModal').classList.remove('hidden');
    }
    function closeBackupModal() {
      document.getElementById('backupModal').classList.add('hidden');
    }
    async function handleImportJsonFile(e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (!confirm('Are you sure you want to restore articles from ' + file.name + '? Existing posts will be merged.')) return;
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        const res = await fetch('/api/system/import-posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(json)
        });
        const data = await res.json();
        if (data.success) {
          alert('✓ ' + data.message);
          window.location.reload();
        } else {
          alert('Import failed: ' + (data.error || 'Unknown error'));
        }
      } catch (err) {
        alert('Error parsing or importing file: ' + err.message);
      }
    }
    function openCategoriesModal() {
      document.getElementById('catModal').classList.remove('hidden');
    }
    function closeCategoriesModal() {
      document.getElementById('catModal').classList.add('hidden');
    }
    async function handleCreateCategory(e) {
      e.preventDefault();
      const name = document.getElementById('newCatName').value.trim();
      const color = document.getElementById('newCatColor').value;
      if (!name) return;
      const btn = document.getElementById('addCatBtn');
      btn.textContent = '...';
      try {
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, color })
        });
        const data = await res.json();
        if (data.success) {
          window.location.reload();
        } else {
          alert('Error: ' + (data.error || 'Failed to create category'));
          btn.textContent = 'Add';
        }
      } catch (err) {
        alert('Error creating category: ' + err.message);
        btn.textContent = 'Add';
      }
    }
    async function deleteCategory(id) {
      if (!confirm('Are you sure you want to delete this category? Any posts attached will be safely reassigned.')) return;
      try {
        const res = await fetch('/api/categories/' + id, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          window.location.reload();
        } else {
          alert('Error: ' + (data.error || 'Failed to delete category'));
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }

    async function purgeCache(btn) {
      btn.innerHTML = 'Purging Edge...';
      const res = await fetch('/api/cloudflare/purge', { method: 'POST' });
      const data = await res.json();
      alert('⚡ ' + data.message + ' in ' + data.latency_ms + 'ms across ' + data.edge_nodes_updated + ' global locations!');
      btn.innerHTML = 'Instant Cache Purge';
    }

    // ================= WHOS.AMUNG.US LIVE TRACKER POLLING ENGINE =================
    async function pollLiveVisitors() {
      try {
        const res = await fetch('/api/track/live');
        const data = await res.json();
        const total = data.totalOnline || 0;

        // 1. Update all counters
        const countEl = document.getElementById('liveOnlineCount');
        if (countEl) countEl.innerText = String(total);
        const hugeEl = document.getElementById('whosHugeCount');
        if (hugeEl) hugeEl.innerText = String(total);
        const pillEl = document.getElementById('mainTrackingPill');
        if (pillEl) pillEl.innerText = String(total);
        const subCountEl = document.getElementById('whosSubTabCount');
        if (subCountEl) subCountEl.innerText = String(total);
        const dashCountEl = document.getElementById('whosDashCount');
        if (dashCountEl) dashCountEl.innerText = String(total);
        const readersCountEl = document.getElementById('whosReadersCount');
        if (readersCountEl) readersCountEl.innerText = String(total);

        // 2. Update Top Readers List (Dashboard Left Card)
        const topReadersList = document.getElementById('whosTopReadersList');
        if (topReadersList) {
          if (!data.activePages || data.activePages.length === 0) {
            topReadersList.innerHTML = '<div class="text-xs text-[#8A867E] italic py-8 text-center">កំពុងរង់ចាំអ្នកអាន... (No active readers online)</div>';
          } else {
            topReadersList.innerHTML = data.activePages.map(function(p) {
              return '<div class="flex items-center space-x-3.5 p-2 rounded-xl hover:bg-[#FAF9F5] transition">' +
                '<span class="text-2xl font-black font-mono text-[#1C1B18] w-8 text-right flex-shrink-0">' + p.count + '</span>' +
                '<div class="flex-1 min-w-0">' +
                  '<div class="flex items-center space-x-1.5 truncate">' +
                    '<span class="text-slate-400 text-xs flex-shrink-0">🌐</span>' +
                    '<a href="' + p.path + '" target="_blank" class="text-xs font-semibold text-[#1C1B18] hover:text-[#C25E3E] truncate block">' + (p.title || p.path) + '</a>' +
                  '</div>' +
                  '<div class="flex items-center space-x-1 text-[11px] font-bold text-rose-600 mt-0.5">' +
                    '<span class="text-xs">⭐</span>' +
                    '<span>' + p.percent + '%</span>' +
                  '</div>' +
                '</div>' +
              '</div>';
            }).join('');
          }
        }

        // 3. Update Countries Proportional Flags Mosaic & List (Dashboard Right Card)
        const countryBadge = document.getElementById('whosCountryCountBadge');
        if (countryBadge) countryBadge.innerText = (data.countries || []).length + ' Countries';

        const flagsMosaic = document.getElementById('whosFlagsMosaic');
        if (flagsMosaic) {
          if (!data.countries || data.countries.length === 0) {
            flagsMosaic.innerHTML = '<div class="text-xs text-[#8A867E] italic py-6 text-center">No country data yet</div>';
          } else {
            flagsMosaic.innerHTML = data.countries.map(function(c) {
              const size = c.percent > 40 ? 'text-4xl sm:text-5xl p-3' : c.percent > 20 ? 'text-3xl p-2' : 'text-xl p-1.5';
              return '<div class="inline-flex flex-col items-center justify-center rounded-xl bg-white border border-[#EAE8E1] shadow-xs ' + size + ' hover:scale-105 transition cursor-pointer" title="' + c.name + ': ' + c.count + ' readers (' + c.percent + '%)">' +
                '<span>' + (c.flag || '🌐') + '</span>' +
                '<span class="text-[9px] font-mono font-bold text-slate-600 mt-0.5">' + c.count + ' (' + c.percent + '%)</span>' +
              '</div>';
            }).join('');
          }
        }

        const countryList = document.getElementById('whosCountryList');
        if (countryList) {
          if (!data.countries || data.countries.length === 0) {
            countryList.innerHTML = '<div class="text-xs text-[#8A867E] italic py-3 text-center">No active visitors. Open in another tab to see your country flag!</div>';
          } else {
            countryList.innerHTML = data.countries.map(function(c) {
              return '<div class="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#EAE8E1] space-y-1.5">' +
                '<div class="flex items-center justify-between">' +
                  '<div class="flex items-center space-x-2">' +
                    '<span class="text-xl leading-none">' + (c.flag || '🌐') + '</span>' +
                    '<span class="font-bold text-xs text-[#1C1B18]">' + c.name + '</span>' +
                    '<span class="text-[10px] text-[#8A867E] font-mono">(' + c.code + ')</span>' +
                  '</div>' +
                  '<div class="flex items-center space-x-2">' +
                    '<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono text-[11px] font-bold">' + c.count + '</span>' +
                    '<span class="text-[11px] font-mono text-[#6E6B63]">' + c.percent + '%</span>' +
                  '</div>' +
                '</div>' +
                '<div class="w-full bg-[#EAE8E1] h-1.5 rounded-full overflow-hidden">' +
                  '<div class="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" style="width: ' + Math.max(5, c.percent) + '%"></div>' +
                '</div>' +
              '</div>';
            }).join('');
          }
        }

        // 4. Update Devices, OS & Referrers
        if (data.devices) {
          const mEl = document.getElementById('deviceMobileCount');
          const dEl = document.getElementById('deviceDesktopCount');
          const tEl = document.getElementById('deviceTabletCount');
          if (mEl) mEl.innerText = String(data.devices.mobile || 0);
          if (dEl) dEl.innerText = String(data.devices.desktop || 0);
          if (tEl) tEl.innerText = String(data.devices.tablet || 0);
        }

        if (data.osMap) {
          const aEl = document.getElementById('osAndroidCount');
          const apEl = document.getElementById('osAppleCount');
          const wEl = document.getElementById('osWindowsCount');
          if (aEl) aEl.innerText = String(data.osMap.android || 0);
          if (apEl) apEl.innerText = String(data.osMap.apple || 0);
          if (wEl) wEl.innerText = String(data.osMap.windows || 0);
        }

        if (data.referrers) {
          const fEl = document.getElementById('refFacebookCount');
          const gEl = document.getElementById('refGoogleCount');
          const dirEl = document.getElementById('refDirectCount');
          if (fEl) fEl.innerText = String(data.referrers.facebook || 0);
          if (gEl) gEl.innerText = String(data.referrers.google || 0);
          if (dirEl) dirEl.innerText = String(data.referrers.direct || 0);
        }

        // 5. Update Readers Table Feed (Dual Mode: Pages Breakdown vs Visitors Stream)
        lastPollingData = data;
        renderReadersList(data);

      } catch(e) {}
    }

    let currentReadersMode = 'pages'; // 'pages' (person head icon, default matching screenshot) or 'visitors' (list icon)
    let lastPollingData = null;

    function setReadersMode(mode) {
      currentReadersMode = mode;
      const btnList = document.getElementById('btnReadersModeList');
      const btnPages = document.getElementById('btnReadersModePages');
      if (mode === 'pages') {
        if (btnPages) {
          btnPages.className = 'w-8 h-8 rounded-full bg-[#0099FF] text-white flex items-center justify-center text-xs font-bold shadow-xs transition hover:scale-105 cursor-pointer focus:outline-none ring-2 ring-[#0099FF]/30';
        }
        if (btnList) {
          btnList.className = 'w-8 h-8 rounded-full bg-[#1C1B18] text-white flex items-center justify-center text-xs font-bold shadow-xs transition hover:scale-105 cursor-pointer focus:outline-none';
        }
      } else {
        if (btnList) {
          btnList.className = 'w-8 h-8 rounded-full bg-[#0099FF] text-white flex items-center justify-center text-xs font-bold shadow-xs transition hover:scale-105 cursor-pointer focus:outline-none ring-2 ring-[#0099FF]/30';
        }
        if (btnPages) {
          btnPages.className = 'w-8 h-8 rounded-full bg-[#1C1B18] text-white flex items-center justify-center text-xs font-bold shadow-xs transition hover:scale-105 cursor-pointer focus:outline-none';
        }
      }
      if (lastPollingData) {
        renderReadersList(lastPollingData);
      }
    }

    function getStarsHtml(percent) {
      if (percent >= 30) return '<span class="text-red-600 font-bold mr-0.5">★★</span>';
      if (percent >= 8) return '<span class="text-red-600 font-bold mr-0.5">★</span>';
      if (percent >= 3) return '<span class="text-red-500 font-bold mr-0.5">☆</span>';
      return '<span class="text-transparent mr-0.5 select-none">☆</span>';
    }

    function renderReadersList(data) {
      const readersTable = document.getElementById('whosReadersTableList');
      if (!readersTable) return;

      if (currentReadersMode === 'pages') {
        // Authentic Page-by-Page Breakdown (Whos.amung.us Person Icon View)
        if (!data.activePages || data.activePages.length === 0) {
          readersTable.innerHTML = '<div class="text-xs text-[#8A867E] italic py-12 text-center">កំពុងរង់ចាំអ្នកអាន... (No active readers online. Open your website in another window or phone to see live updates!)</div>';
          return;
        }

        readersTable.innerHTML = data.activePages.map(function(p) {
          const stars = getStarsHtml(p.percent);
          const percentStr = (p.percent || 0).toFixed(1) + '%';
          return '<div class="py-2.5 px-3 flex items-center hover:bg-[#FAF9F5] transition text-xs border-b border-[#F0EDE6]/60 group">' +
            '<div class="w-14 sm:w-16 flex-shrink-0 text-left">' +
              '<span class="text-2xl sm:text-3xl font-extrabold text-[#1C1B18] font-sans leading-none block">' + p.count + '</span>' +
            '</div>' +
            '<div class="flex-1 min-w-0 flex items-center space-x-2 pl-2">' +
              '<div class="w-20 flex-shrink-0 text-left font-mono font-bold text-xs text-red-600 flex items-center space-x-0.5">' +
                stars + '<span>' + percentStr + '</span>' +
              '</div>' +
              '<span class="text-slate-400 text-xs flex-shrink-0">🌐</span>' +
              '<a href="' + p_escape(p.path) + '" target="_blank" class="text-xs sm:text-sm font-medium text-[#222] group-hover:text-[#C25E3E] group-hover:underline truncate block flex-1" title="' + p_escape(p.title) + '">' +
                p_escape(p.title || p.path) +
              '</a>' +
            '</div>' +
          '</div>';
        }).join('');
      } else {
        // Stream of recent individual visitors view (List Icon View)
        if (!data.recentVisitors || data.recentVisitors.length === 0) {
          readersTable.innerHTML = '<div class="text-xs text-[#8A867E] italic py-12 text-center">កំពុងរង់ចាំអ្នកអាន... (No active readers online)</div>';
          return;
        }

        readersTable.innerHTML = data.recentVisitors.map(function(v) {
          const devIcon = v.device === 'Mobile' ?
            '<span title="Mobile" class="w-6 h-6 rounded flex items-center justify-center text-xs bg-pink-100 text-pink-600 font-bold shadow-xs">📱</span>' :
            '<span title="Desktop" class="w-6 h-6 rounded flex items-center justify-center text-xs bg-emerald-100 text-emerald-600 font-bold shadow-xs">💻</span>';

          const osIcon = v.os === 'Android' ?
            '<span title="Android" class="w-6 h-6 rounded flex items-center justify-center text-xs bg-lime-100 text-lime-700 font-bold shadow-xs">🤖</span>' :
            v.os === 'Apple' ?
            '<span title="Apple / iOS" class="w-6 h-6 rounded flex items-center justify-center text-xs bg-slate-200 text-slate-700 font-bold shadow-xs">🍏</span>' :
            '<span title="Windows" class="w-6 h-6 rounded flex items-center justify-center text-xs bg-sky-100 text-sky-600 font-bold shadow-xs">🪟</span>';

          const refIcon = v.referrer === 'facebook' ?
            '<span title="Facebook Referral" class="w-6 h-6 rounded-full flex items-center justify-center text-xs bg-[#1877F2] text-white font-black shadow-xs">f</span>' :
            v.referrer === 'google' ?
            '<span title="Google Search" class="w-6 h-6 rounded-full flex items-center justify-center text-xs bg-red-500 text-white font-black shadow-xs">G</span>' :
            '<span title="Direct Traffic" class="w-6 h-6 rounded-full flex items-center justify-center text-xs bg-slate-600 text-white font-bold shadow-xs">🔗</span>';

          const loc = (v.city ? v.city + ', ' : '') + v.country;

          return '<div class="py-2.5 px-3 flex items-center justify-between hover:bg-[#FAF9F5] transition text-xs border-b border-[#F0EDE6]/60">' +
            '<div class="flex items-center space-x-3.5 min-w-0 mr-3">' +
              '<span class="text-base sm:text-lg font-black font-mono text-[#1C1B18] w-14 flex-shrink-0">' + v.formattedTime + '</span>' +
              '<div class="min-w-0 space-y-0.5">' +
                '<div class="flex items-center space-x-1.5 truncate">' +
                  '<span class="text-slate-400 text-xs flex-shrink-0">🌐</span>' +
                  '<a href="' + p_escape(v.path) + '" target="_blank" class="font-semibold text-[#1C1B18] hover:text-[#C25E3E] truncate block">' + p_escape(v.title || v.path) + '</a>' +
                '</div>' +
                '<div class="flex items-center space-x-1.5 text-[11px] text-[#6E6B63]">' +
                  '<span class="text-sm flex-shrink-0">' + (v.flag || '🌐') + '</span>' +
                  '<span class="truncate">' + p_escape(loc) + '</span>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="flex items-center space-x-2 flex-shrink-0">' +
              devIcon +
              osIcon +
              refIcon +
            '</div>' +
          '</div>';
        }).join('');
      }
    }

    function p_escape(text) {
      if (!text) return '';
      return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    setInterval(pollLiveVisitors, 3000);
    pollLiveVisitors();
  </script>
</body>
</html>`);
});

// ADMIN POST EDITOR (NEW or EDIT)
const renderEditor = (c: any) => {
  const id = c.req.param("id");
  let post: any = null;
  if (id) {
    post = db.query("SELECT * FROM posts WHERE id = ?").get(id);
  }

  const categories = db.query("SELECT * FROM categories ORDER BY id ASC").all() as any[];

  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${post ? 'Edit Story' : 'New Story'} | USA NEWS STORY CMS</title>
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/assets/favicon-16x16.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <link rel="preload" href="/assets/tailwindcss.min.js" as="script">
  <script src="/assets/tailwindcss.min.js"></script>
  <link rel="preload" href="/assets/tk-mascot.webp" as="image" type="image/webp">
  <link rel="preload" href="/assets/tk-mascot-happy.webp" as="image" type="image/webp">
  <style>
    @keyframes pulse-slow { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    .animate-pulse-slow { animation: pulse-slow 2s infinite; }
    .style-card {
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      cursor: pointer;
      user-select: none;
      touch-action: manipulation;
    }
    .style-card:hover {
      border-color: #C25E3E !important;
      transform: translateY(-2px);
    }
    .style-card.selected {
      border: 2px solid #C25E3E !important;
      background-color: #FFF5F0 !important;
      box-shadow: 0 0 0 2px rgba(194, 94, 62, 0.3), 0 6px 16px rgba(194, 94, 62, 0.15) !important;
      transform: scale(1.02);
    }
    .style-card .check-pill {
      display: none;
    }
    .style-card.selected .check-pill {
      display: flex !important;
    }
  </style>
  <script>
    function openAiModal() {
      const modal = document.getElementById('aiModal');
      const backdrop = document.getElementById('aiModalBackdrop');
      if (backdrop) {
        backdrop.style.display = 'block';
        backdrop.classList.remove('hidden');
      }
      if (modal) {
        modal.style.display = 'flex';
        modal.classList.remove('hidden');
      }
      document.body.style.overflow = 'hidden';
    }
    window.openAiModal = openAiModal;

    function closeAiModal() {
      const modal = document.getElementById('aiModal');
      const backdrop = document.getElementById('aiModalBackdrop');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
      }
      if (backdrop) {
        backdrop.style.display = 'none';
        backdrop.classList.add('hidden');
      }
      document.body.style.overflow = '';
    }
    window.closeAiModal = closeAiModal;

    function setViewMode(mode) {
      window.currentViewMode = mode;
      const btnPost = document.getElementById('btnViewPost');
      const btnHtml = document.getElementById('btnViewHtml');
      const btnBoth = document.getElementById('btnViewBoth');

      const wrapperPost = document.getElementById('postViewWrapper');
      const wrapperHtml = document.getElementById('htmlViewWrapper');
      const wrapperBoth = document.getElementById('bothViewWrapper');

      const postVis = document.getElementById('postVisualEditor');
      const htmlEditor = document.getElementById('htmlCodeEditor');
      const splitHtml = document.getElementById('splitHtmlEditor');
      const splitPost = document.getElementById('splitPostEditor');

      const activeBtnClass = 'px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 bg-white text-[#C25E3E] shadow-sm border border-[#E5E2D9] cursor-pointer';
      const inactiveBtnClass = 'px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#6E6B63] hover:text-[#1C1B18] transition flex items-center space-x-1.5 bg-transparent border border-transparent cursor-pointer';

      if (btnPost) btnPost.className = inactiveBtnClass;
      if (btnHtml) btnHtml.className = inactiveBtnClass;
      if (btnBoth) btnBoth.className = inactiveBtnClass;

      if (wrapperPost) {
        wrapperPost.style.display = 'none';
        wrapperPost.classList.add('hidden');
      }
      if (wrapperHtml) {
        wrapperHtml.style.display = 'none';
        wrapperHtml.classList.add('hidden');
      }
      if (wrapperBoth) {
        wrapperBoth.style.display = 'none';
        wrapperBoth.classList.add('hidden');
      }

      if (mode === 'post') {
        if (btnPost) btnPost.className = activeBtnClass;
        if (wrapperPost) {
          wrapperPost.style.display = 'block';
          wrapperPost.classList.remove('hidden');
        }
        if (htmlEditor && postVis && htmlEditor.value) {
          postVis.innerHTML = htmlEditor.value;
        }
      } else if (mode === 'html') {
        if (btnHtml) btnHtml.className = activeBtnClass;
        if (wrapperHtml) {
          wrapperHtml.style.display = 'block';
          wrapperHtml.classList.remove('hidden');
        }
        if (postVis && htmlEditor) {
          htmlEditor.value = postVis.innerHTML;
        }
      } else if (mode === 'both') {
        if (btnBoth) btnBoth.className = activeBtnClass;
        if (wrapperBoth) {
          wrapperBoth.style.display = 'block';
          wrapperBoth.classList.remove('hidden');
        }
        const content = (postVis ? postVis.innerHTML : '') || (htmlEditor ? htmlEditor.value : '');
        if (splitHtml) splitHtml.value = content;
        if (splitPost) splitPost.innerHTML = content;
      }
      if (typeof window.updateWordCount === 'function') {
        window.updateWordCount();
      }
    }
    window.setViewMode = setViewMode;

    function execFormat(cmd, value = null) {
      const editor = document.getElementById('postVisualEditor');
      if (!editor) return;
      editor.focus();
      document.execCommand(cmd, false, value);
      const htmlEditor = document.getElementById('htmlCodeEditor');
      if (htmlEditor) htmlEditor.value = editor.innerHTML;
      if (typeof window.updateWordCount === 'function') window.updateWordCount();
    }
    window.execFormat = execFormat;

    function execFormatBlock(tag) {
      const editor = document.getElementById('postVisualEditor');
      if (!editor) return;
      editor.focus();
      document.execCommand('formatBlock', false, tag);
      const htmlEditor = document.getElementById('htmlCodeEditor');
      if (htmlEditor) htmlEditor.value = editor.innerHTML;
      if (typeof window.updateWordCount === 'function') window.updateWordCount();
    }
    window.execFormatBlock = execFormatBlock;

    function insertEditorLink() {
      const url = prompt('Enter URL (e.g. https://...):');
      if (url && url.trim()) {
        execFormat('createLink', url.trim());
      }
    }
    window.insertEditorLink = insertEditorLink;

    function selectStyle(style) {
      window.currentSelectedStyle = style;
      if (typeof currentSelectedStyle !== 'undefined') currentSelectedStyle = style;

      document.querySelectorAll('.style-card').forEach(el => {
        const isCurrent = el.getAttribute('data-style') === style;
        const checkEl = el.querySelector('.check-pill');
        if (isCurrent) {
          el.classList.add('selected');
          el.style.border = '2px solid #C25E3E';
          el.style.backgroundColor = '#FFF5F0';
          if (checkEl) checkEl.style.display = 'flex';
        } else {
          el.classList.remove('selected');
          el.style.border = '1px solid #EAE8E1';
          el.style.backgroundColor = '#FFFFFF';
          if (checkEl) checkEl.style.display = 'none';
        }
      });

      const styleNames = {
        cnn: 'CNN Digital',
        dailymail: 'Daily Mail',
        foxnews: 'Fox News',
        ap: 'AP Wire',
        people: 'People Magazine',
        tmz: 'TMZ',
        buzzfeed: 'BuzzFeed',
        breaking: 'Breaking Express',
        tabloid: 'Tabloid',
        analysis: 'News Analysis',
        axios: 'Axios Express',
        usaviral: 'USA Viral Hook',
        nytexplainer: 'NYT Explainer',
        newsletter: 'Substack / Brew',
        investigative: 'Investigative'
      };

      const name = styleNames[style] || style.toUpperCase();
      const badge = document.getElementById('selectedStyleBadge');
      if (badge) badge.textContent = name;
      const inlineBadge = document.getElementById('selectedStyleBadgeInline');
      if (inlineBadge) inlineBadge.textContent = name;
      const quickBtn = document.getElementById('quickApplyStyleBtnText');
      if (quickBtn) quickBtn.textContent = '⚡ Apply ' + name + ' Style';
    }
    window.selectStyle = selectStyle;

    function onStyleCardDblClick(style) {
      selectStyle(style);
      if (typeof window.executeAiProcess === 'function') {
        window.executeAiProcess('format');
      }
    }
    window.onStyleCardDblClick = onStyleCardDblClick;

    function switchTkTab(tab) {
      const btnAi = document.getElementById('tabAiStyles');
      const btnFree = document.getElementById('tabFreePresets');
      const contentAi = document.getElementById('tkAiTabContent');
      const contentFree = document.getElementById('tkFreeTabContent');

      if (tab === 'ai') {
        if (btnAi) btnAi.className = 'flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 bg-[#C25E3E] text-white shadow-xs cursor-pointer';
        if (btnFree) btnFree.className = 'flex-1 py-2 px-3 rounded-xl text-xs font-semibold text-[#6E6B63] hover:text-[#1C1B18] transition flex items-center justify-center space-x-2 bg-[#F3F1EC] border border-[#E5E2D9] cursor-pointer';
        if (contentAi) {
          contentAi.style.display = 'block';
          contentAi.classList.remove('hidden');
        }
        if (contentFree) {
          contentFree.style.display = 'none';
          contentFree.classList.add('hidden');
        }
      } else {
        if (btnFree) btnFree.className = 'flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 bg-emerald-700 text-white shadow-xs cursor-pointer';
        if (btnAi) btnAi.className = 'flex-1 py-2 px-3 rounded-xl text-xs font-semibold text-[#6E6B63] hover:text-[#1C1B18] transition flex items-center justify-center space-x-2 bg-[#F3F1EC] border border-[#E5E2D9] cursor-pointer';
        if (contentFree) {
          contentFree.style.display = 'block';
          contentFree.classList.remove('hidden');
        }
        if (contentAi) {
          contentAi.style.display = 'none';
          contentAi.classList.add('hidden');
        }
      }
    }
    window.switchTkTab = switchTkTab;
  </script>
</head>
<body class="bg-[#FAF9F5] text-[#1C1B18] font-sans antialiased min-h-screen selection:bg-[#C25E3E] selection:text-white relative">

  <!-- Top Navigation Bar -->
  <header class="h-14 border-b border-[#EAE8E1] bg-white/95 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-30 shadow-xs">
    <div class="flex items-center space-x-3">
      <a href="/admin" class="text-[#6E6B63] hover:text-[#1C1B18] transition flex items-center space-x-1 text-xs font-semibold">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        <span>Dashboard</span>
      </a>
      <span class="text-[#D3D0C8]">|</span>
      <span class="font-bold text-xs uppercase tracking-wider text-[#1C1B18]">${post ? 'Edit Story #' + post.id : 'Drafting New Story'}</span>
    </div>

    <!-- Active Collaborators & Actions -->
    <div class="flex items-center space-x-3">
      <button onclick="openAiModal()" type="button" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#C25E3E]/10 hover:bg-[#C25E3E]/20 text-[#C25E3E] border border-[#C25E3E]/30 flex items-center space-x-1.5 transition">
        <img src="/assets/tk-mascot.webp" class="w-4 h-4 object-contain" alt="TK" loading="eager" width="16" height="16">
        <span>TK Summary AI</span>
      </button>

      <button onclick="saveAndDeploy('draft')" id="draftBtn" type="button" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#F3F1EC] hover:bg-[#EAE8E1] text-[#2B2926] border border-[#E5E2D9] flex items-center space-x-1.5 transition">
        <span>💾 Save Draft</span>
      </button>

      <button onclick="saveAndDeploy('published')" id="saveBtn" type="button" class="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#C25E3E] hover:bg-[#B05335] text-white shadow-md shadow-[#C25E3E]/20 flex items-center space-x-1.5 transition">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
        <span>🚀 Publish</span>
      </button>
    </div>
  </header>

  <!-- Editor Container -->
  <div class="flex h-[calc(100vh-3.5rem)] overflow-hidden">
    
    <!-- Center Editor Canvas -->
    <main class="flex-1 overflow-y-auto px-6 lg:px-10 py-6 max-w-5xl mx-auto space-y-5">
      
      <!-- Headline & Excerpt -->
      <div>
        <textarea id="titleInput" rows="2" class="w-full bg-transparent text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[#1C1B18] placeholder-slate-400 focus:outline-none resize-none leading-tight font-serif" placeholder="Enter article headline...">${post ? post.title : ''}</textarea>
        <input type="text" id="summaryInput" class="w-full bg-transparent text-base text-[#4A4742] placeholder-slate-400 focus:outline-none mt-2 font-normal" placeholder="Add an executive summary or subtitle..." value="${post ? post.summary : ''}">
      </div>

      <!-- Slug & Autosave status bar -->
      <div class="flex flex-wrap items-center justify-between border-y border-[#EAE8E1] py-2.5 text-xs text-[#6E6B63] gap-2">
        <div class="flex items-center space-x-2">
          <span>Slug:</span>
          <input type="text" id="slugInput" class="bg-white border border-[#E5E2D9] rounded px-2.5 py-0.5 text-[#1C1B18] font-mono text-[11px] focus:outline-none focus:border-[#C25E3E]" placeholder="auto-slug" value="${post ? post.slug : ''}">
        </div>
        <div class="flex items-center space-x-3">
          <span id="wordCountBadge" class="font-mono text-[#C25E3E] font-semibold">0 words</span>
          <span>•</span>
          <div class="flex items-center space-x-1 text-[#6E6B63]">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Autosaved to VPS SQLite</span>
          </div>
        </div>
      </div>

      <!-- VIEW SELECTOR BAR (HTML View, Post View, Both View) -->
      <div class="flex items-center justify-between bg-[#F3F1EC] border border-[#E5E2D9] p-1.5 rounded-2xl shadow-xs">
        <div class="flex items-center space-x-1">
          <button type="button" onclick="setViewMode('post')" id="btnViewPost" class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 bg-white text-[#C25E3E] shadow-sm border border-[#E5E2D9]">
            <span>📝 Post View</span>
          </button>
          <button type="button" onclick="setViewMode('html')" id="btnViewHtml" class="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#6E6B63] hover:text-[#1C1B18] transition flex items-center space-x-1.5">
            <span>&lt;/&gt; HTML View</span>
          </button>
          <button type="button" onclick="setViewMode('both')" id="btnViewBoth" class="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#6E6B63] hover:text-[#1C1B18] transition flex items-center space-x-1.5">
            <span>◫ Both View (Split)</span>
          </button>
        </div>

        <div class="flex items-center space-x-2 text-xs">
          <button type="button" onclick="openAiModal()" style="touch-action: manipulation;" class="px-2.5 py-1 rounded-lg bg-[#C25E3E] hover:bg-[#B05335] text-white shadow-xs transition text-[11px] font-bold flex items-center space-x-1 cursor-pointer">
            <img src="/assets/tk-mascot.webp" class="w-3.5 h-3.5 object-contain" alt="TK">
            <span>TK Summary AI</span>
          </button>
          <button type="button" onclick="aiFormatCurrent('cnn')" class="px-2.5 py-1 rounded-lg bg-white hover:bg-[#FAF9F5] text-[#2B2926] border border-[#E5E2D9] transition text-[11px] font-semibold">
            ⚡ Quick CNN Format
          </button>
          <button type="button" onclick="aiKhmerTranslate()" class="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition text-[11px] font-semibold">
            🇰🇭 បកប្រែខ្មែរ
          </button>
        </div>
      </div>

      <!-- EDITOR WORKSPACES (Post, HTML, Both) -->
      <div id="editorWorkspace" class="space-y-4">
        
        <!-- 1. POST VIEW (WYSIWYG Rich Visual Canvas) -->
        <div id="postViewWrapper" style="display: block;">
          <div class="border border-[#EAE8E1] bg-white rounded-2xl overflow-hidden shadow-sm focus-within:border-[#C25E3E] transition">
            <!-- Rich Text Quick Action Toolbar -->
            <div class="bg-[#F8F7F3] border-b border-[#EAE8E1] px-4 py-2 flex flex-wrap items-center gap-1.5 text-xs text-[#4A4742]">
              <button type="button" onmousedown="event.preventDefault()" onclick="execFormat('bold')" class="p-1.5 px-2.5 rounded-lg hover:bg-[#EAE8E1] font-bold text-[#1C1B18] transition text-[11px] cursor-pointer" title="Bold (Ctrl+B)">B</button>
              <button type="button" onmousedown="event.preventDefault()" onclick="execFormat('italic')" class="p-1.5 px-2.5 rounded-lg hover:bg-[#EAE8E1] italic font-serif text-[#1C1B18] transition text-[11px] cursor-pointer" title="Italic (Ctrl+I)">I</button>
              <button type="button" onmousedown="event.preventDefault()" onclick="execFormat('underline')" class="p-1.5 px-2.5 rounded-lg hover:bg-[#EAE8E1] underline text-[#1C1B18] transition text-[11px] cursor-pointer" title="Underline">U</button>
              <span class="w-[1px] h-4 bg-[#D3D0C8] mx-1"></span>
              <button type="button" onmousedown="event.preventDefault()" onclick="execFormatBlock('h2')" class="p-1.5 px-2.5 rounded-lg hover:bg-[#EAE8E1] font-black text-[#1C1B18] transition text-[11px] cursor-pointer" title="Heading 2">H2</button>
              <button type="button" onmousedown="event.preventDefault()" onclick="execFormatBlock('h3')" class="p-1.5 px-2.5 rounded-lg hover:bg-[#EAE8E1] font-bold text-[#1C1B18] transition text-[11px] cursor-pointer" title="Heading 3">H3</button>
              <button type="button" onmousedown="event.preventDefault()" onclick="execFormatBlock('p')" class="p-1.5 px-2.5 rounded-lg hover:bg-[#EAE8E1] font-medium text-[#1C1B18] transition text-[11px] cursor-pointer" title="Paragraph">¶</button>
              <span class="w-[1px] h-4 bg-[#D3D0C8] mx-1"></span>
              <button type="button" onmousedown="event.preventDefault()" onclick="execFormat('insertUnorderedList')" class="p-1.5 px-2 rounded-lg hover:bg-[#EAE8E1] text-[#1C1B18] transition text-[11px] cursor-pointer" title="Bullet List">• Bullet</button>
              <button type="button" onmousedown="event.preventDefault()" onclick="execFormat('insertOrderedList')" class="p-1.5 px-2 rounded-lg hover:bg-[#EAE8E1] text-[#1C1B18] transition text-[11px] cursor-pointer" title="Numbered List">1. Number</button>
              <button type="button" onmousedown="event.preventDefault()" onclick="execFormatBlock('blockquote')" class="p-1.5 px-2 rounded-lg hover:bg-[#EAE8E1] font-serif text-[#1C1B18] transition text-[11px] cursor-pointer" title="Quote Callout">“ Quote</button>
              <span class="w-[1px] h-4 bg-[#D3D0C8] mx-1"></span>
              <button type="button" onmousedown="event.preventDefault()" onclick="insertEditorLink()" class="p-1.5 px-2 rounded-lg hover:bg-[#EAE8E1] text-[#C25E3E] font-medium transition text-[11px] cursor-pointer" title="Insert Link">🔗 Link</button>
              <button type="button" onmousedown="event.preventDefault()" onclick="execFormat('removeFormat')" class="p-1.5 px-2 rounded-lg hover:bg-[#EAE8E1] text-[#8A867E] transition text-[11px] cursor-pointer" title="Clear Formatting">🧹 Clear</button>
              <span class="w-[1px] h-4 bg-[#D3D0C8] mx-1"></span>
              <button type="button" onmousedown="event.preventDefault()" onclick="openAiModal()" style="touch-action: manipulation;" class="p-1 px-2.5 rounded-lg bg-[#C25E3E]/10 hover:bg-[#C25E3E]/20 text-[#C25E3E] border border-[#C25E3E]/30 font-bold transition text-[11px] flex items-center space-x-1 cursor-pointer" title="Open TK Summary AI Drawer">
                <img src="/assets/tk-mascot.webp" class="w-3.5 h-3.5 object-contain" alt="TK">
                <span>TK Summary AI</span>
              </button>
            </div>

            <!-- Content Canvas -->
            <div class="p-6 min-h-[380px]">
              <div id="postVisualEditor" contenteditable="true" class="prose max-w-none text-[#2B2926] text-base leading-relaxed focus:outline-none min-h-[340px]">
                ${post ? post.content : '<p>Start drafting your news story, or click <strong>AI Importer</strong> to format from any link...</p>'}
              </div>
            </div>
          </div>
        </div>

        <!-- 2. HTML VIEW (Raw Code Editor) -->
        <div id="htmlViewWrapper" style="display: none;">
          <div class="border border-[#EAE8E1] bg-white rounded-2xl p-4 shadow-sm">
            <textarea id="htmlCodeEditor" rows="18" class="w-full bg-[#1C1B18] font-mono text-sm text-emerald-300 rounded-xl p-4 leading-relaxed focus:outline-none resize-y">${post ? post.content : '<p>Start drafting your news story, or click <strong>AI Importer</strong> to format from any link...</p>'}</textarea>
          </div>
        </div>

        <!-- 3. BOTH VIEW (Split-Screen HTML + Post) -->
        <div id="bothViewWrapper" style="display: none;">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Left HTML Code -->
            <div class="border border-[#EAE8E1] bg-white rounded-2xl p-4 flex flex-col shadow-sm">
              <div class="text-[11px] font-mono text-[#6E6B63] mb-2 font-bold flex items-center justify-between">
                <span>&lt;/&gt; HTML SOURCE CODE</span>
                <span class="text-[#C25E3E]">Live Sync</span>
              </div>
              <textarea id="splitHtmlEditor" rows="16" class="w-full flex-1 bg-[#1C1B18] rounded-xl p-3 font-mono text-xs text-emerald-300 leading-relaxed focus:outline-none resize-none"></textarea>
            </div>
            <!-- Right Visual Post -->
            <div class="border border-[#EAE8E1] bg-white rounded-2xl p-5 overflow-y-auto max-h-[500px] shadow-sm">
              <div class="text-[11px] font-mono text-[#6E6B63] mb-2 font-bold flex items-center justify-between">
                <span>📝 LIVE POST PREVIEW</span>
                <span class="text-emerald-600 font-bold">60 FPS</span>
              </div>
              <div id="splitPostEditor" contenteditable="true" class="prose max-w-none text-[#2B2926] text-sm leading-relaxed focus:outline-none"></div>
            </div>
          </div>
        </div>

      </div>

    </main>

    <!-- Right Settings Inspector Panel in Claude Light Mode -->
    <aside class="w-80 border-l border-[#EAE8E1] bg-white p-5 overflow-y-auto space-y-6 shadow-xs">
      
      <!-- Dedicated Publish Action Box -->
      <div class="p-4 rounded-2xl bg-[#F8F7F3] border border-[#EAE8E1] shadow-xs space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-[#6E6B63]">Publishing Status</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${post && post.status === 'draft' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}">
            ${post ? (post.status === 'draft' ? 'Draft' : 'Published') : 'New Article'}
          </span>
        </div>
        
        <button type="button" onclick="saveAndDeploy('published')" class="w-full py-2.5 px-3 rounded-xl bg-[#C25E3E] hover:bg-[#B05335] text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-md shadow-[#C25E3E]/20 transition transform active:scale-95">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          <span>Publish Article Now</span>
        </button>

        <div class="flex items-center space-x-2 pt-1">
          <button type="button" onclick="saveAndDeploy('draft')" class="flex-1 py-1.5 px-2 rounded-lg bg-white hover:bg-[#F3F1EC] text-[#2B2926] border border-[#E5E2D9] text-[11px] font-semibold transition text-center shadow-xs">
            Save as Draft
          </button>
          ${post ? `
            <a href="/article/${post.slug}" target="_blank" class="py-1.5 px-2.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-semibold transition text-center shadow-xs">
              View Live
            </a>
          ` : ''}
        </div>
      </div>

      <!-- Breaking News Switch -->
      <div class="flex items-center justify-between p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200">
        <div>
          <div class="text-xs font-bold text-rose-800">Mark as Breaking News</div>
          <div class="text-[11px] text-[#6E6B63]">Push to top marquee banner</div>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" id="isBreakingInput" ${post && post.is_breaking ? 'checked' : ''} class="sr-only peer">
          <div class="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#C25E3E]"></div>
        </label>
      </div>

      <!-- FEATURED IMAGE DRAG & DROP + WEBP CONVERSION & UNLINK -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="block text-xs font-semibold text-[#1C1B18]">Featured Image (Thumbnail)</label>
          <span class="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">WebP Auto</span>
        </div>

        <!-- Drag & Drop Container -->
        <div id="dropZone" 
             ondragover="handleDragOver(event)" 
             ondragleave="handleDragLeave(event)" 
             ondrop="handleDrop(event)" 
             onclick="document.getElementById('fileInput').click()" 
             class="border-2 border-dashed border-[#D5D2C9] hover:border-[#C25E3E] rounded-2xl p-4 text-center cursor-pointer transition bg-[#FAF9F5] hover:bg-[#F3F1EC] relative group">
          
          <input type="file" id="fileInput" accept="image/*" class="hidden" onchange="handleFileSelect(event)">
          
          <!-- Empty State -->
          <div id="dropZoneEmpty" class="${post && post.featured_image ? 'hidden' : 'block'} py-3">
            <svg class="w-8 h-8 text-[#8A867E] group-hover:text-[#C25E3E] mx-auto mb-2 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            <div class="text-xs font-bold text-[#2B2926]">Drag & Drop Image or Click</div>
            <div class="text-[10px] text-[#6E6B63] mt-1">Converts automatically to clean WebP</div>
          </div>

          <!-- Preview State -->
          <div id="dropZonePreview" class="${post && post.featured_image ? 'block' : 'hidden'} relative rounded-xl overflow-hidden group/img">
            <img id="imagePreviewImg" src="${post ? (post.featured_image || '') : ''}" class="w-full h-36 object-cover rounded-lg border border-[#EAE8E1]">
            <div class="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center space-x-2">
              <button type="button" onclick="event.stopPropagation(); unlinkAndCleanImage();" class="px-2.5 py-1 bg-white hover:bg-slate-100 text-[#1C1B18] rounded-lg text-[11px] font-bold shadow">Unlink Site</button>
              <button type="button" onclick="event.stopPropagation(); removeImage();" class="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[11px] font-bold shadow">Remove</button>
            </div>
            <div class="absolute bottom-1 right-1 bg-white/95 text-emerald-700 text-[9px] font-mono px-1.5 py-0.5 rounded border border-emerald-200">
              WebP Unlinked
            </div>
          </div>
        </div>

        <!-- Raw Image URL / Base64 Storage -->
        <input type="hidden" id="imageInput" value="${post ? (post.featured_image || '') : ''}">
        
        <div class="flex items-center justify-between text-[11px] text-[#6E6B63] pt-1">
          <button type="button" onclick="unlinkAndCleanImage()" class="text-[#C25E3E] hover:underline font-semibold">Unlink original post reference</button>
          <span class="text-emerald-600 font-medium">100% Clean</span>
        </div>
      </div>

      <!-- Category Picker with Quick Add -->
      <div>
        <div class="flex items-center justify-between mb-1.5">
          <label class="block text-xs font-semibold text-[#1C1B18]">Category</label>
          <button type="button" onclick="promptAddNewCategory()" class="text-[11px] text-[#C25E3E] hover:underline font-semibold flex items-center space-x-1">
            <span>+ Add New</span>
          </button>
        </div>
        <select id="categoryInput" class="w-full bg-[#FAF9F5] border border-[#E5E2D9] rounded-xl px-3 py-2 text-xs text-[#1C1B18] focus:outline-none focus:border-[#C25E3E] focus:bg-white">
          ${categories.map(cat => `
            <option value="${cat.id}" ${post && post.category_id === cat.id ? 'selected' : ''}>${cat.name}</option>
          `).join("")}
        </select>
      </div>

      <!-- Author -->
      <div>
        <label class="block text-xs font-semibold text-[#1C1B18] mb-1.5">Author</label>
        <input type="text" id="authorInput" class="w-full bg-[#FAF9F5] border border-[#E5E2D9] rounded-xl px-3 py-2 text-xs text-[#1C1B18] focus:outline-none focus:border-[#C25E3E] focus:bg-white" value="${post ? post.author_name : 'Editorial Staff'}">
      </div>

      <!-- Read Time -->
      <div>
        <label class="block text-xs font-semibold text-[#1C1B18] mb-1.5">Read Time</label>
        <input type="text" id="readTimeInput" class="w-full bg-[#FAF9F5] border border-[#E5E2D9] rounded-xl px-3 py-2 text-xs text-[#1C1B18] focus:outline-none focus:border-[#C25E3E] focus:bg-white" value="${post ? post.read_time : '5 min read'}">
      </div>

      <!-- Tags Management (Optional / Customizable) -->
      <div class="p-3.5 rounded-2xl bg-[#F8F7F3] border border-[#EAE8E1] space-y-2.5">
        <div class="flex items-center justify-between">
          <label for="enableTagsCheck" class="text-xs font-semibold text-[#1C1B18] cursor-pointer flex items-center space-x-2">
            <span>🏷️ Show Tags on Post</span>
          </label>
          <input type="checkbox" id="enableTagsCheck" onchange="toggleTagsSection()" ${post && post.tags && post.tags.trim() ? 'checked' : ''} class="w-4 h-4 rounded text-[#C25E3E] bg-white border-[#E5E2D9] focus:ring-0 cursor-pointer">
        </div>
        
        <div id="tagsInputBox" class="${post && post.tags && post.tags.trim() ? 'block' : 'hidden'} space-y-1.5 pt-1">
          <label class="block text-[11px] font-medium text-[#6E6B63]">Custom Tags (comma separated)</label>
          <input type="text" id="tagsInput" class="w-full bg-white border border-[#E5E2D9] rounded-xl px-3 py-1.5 text-xs text-[#1C1B18] focus:outline-none focus:border-[#C25E3E] font-mono" placeholder="USANews, Politics, Breaking" value="${post && post.tags ? post.tags : ''}">
          <p class="text-[10px] text-[#8A867E] leading-tight">Separate tags with commas. If unticked or empty, no tags will be displayed.</p>
        </div>
      </div>

      <!-- VIRAL SHORT LINKS GENERATOR (៦ ខ្ទង់ - Pretty Links Alternative) -->
      <div class="p-3.5 rounded-2xl bg-[#F8F7F3] border border-[#EAE8E1] space-y-2.5">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-1.5">
            <span class="text-sm">🔗</span>
            <span class="text-xs font-bold text-[#1C1B18]">Viral Short Links (៦ ខ្ទង់)</span>
          </div>
          <span class="text-[10px] font-mono text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">Whos Tracking</span>
        </div>
        <p class="text-[11px] text-[#6E6B63] leading-snug">
          បង្កើត Short Link ៦ ខ្ទង់ (ឧ. <code>https://topusanewsstory.com/asdfef</code>) សម្រាប់ចែករំលែកលើ Facebook & Comments។ ចុចទៅនឹង Redirect ទៅ Post ដើមស្អាតគ្មានកន្ទុយរញេរញៃ!
        </p>

        ${post ? `
          <div class="space-y-2">
            <div class="flex items-center space-x-2">
              <div class="flex-1">
                <label class="block text-[10px] font-bold text-[#6E6B63] mb-1">ចំនួន Link (Quantity)</label>
                <input type="number" id="shortLinkQuantity" min="1" max="100" value="10" class="w-full bg-white border border-[#E5E2D9] rounded-xl px-2.5 py-1 text-xs text-[#1C1B18] font-mono focus:outline-none focus:border-[#C25E3E]">
              </div>
              <button type="button" onclick="generateShortLinks(${post.id})" id="btnGenerateShortLinks" class="mt-4 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition flex items-center space-x-1 cursor-pointer">
                <span>⚡ Generate</span>
              </button>
            </div>

            <!-- Quick Action Bar -->
            <div id="shortLinksActionBox" class="hidden flex items-center justify-between pt-1">
              <span id="shortLinksStats" class="text-[10px] font-mono text-[#6E6B63]">0 links</span>
              <button type="button" onclick="copyAllShortLinks()" class="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center space-x-1 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-lg border border-indigo-200 transition cursor-pointer">
                <span>📋 Copy All Links</span>
              </button>
            </div>

            <!-- Links Container List -->
            <div id="shortLinksList" class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              <div class="text-[11px] text-[#8A867E] italic py-2 text-center">កំពុងទាញយក short links...</div>
            </div>
          </div>
        ` : `
          <div class="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 leading-snug">
            💡 សូមចុច <strong>Publish</strong> ឬ <strong>Save as Draft</strong> អត្ថបទនេះសិន ទើបអាច Generate Short Links បាន!
          </div>
        `}
      </div>

      <!-- Cloudflare Edge Webhook Status -->
      <div class="p-3.5 rounded-2xl bg-[#F8F7F3] border border-[#EAE8E1] text-xs space-y-1">
        <div class="text-[#1C1B18] font-semibold flex items-center justify-between">
          <span>Edge Webhook:</span>
          <span class="text-emerald-700 font-mono text-[11px] font-bold">Enabled</span>
        </div>
        <p class="text-[11px] text-[#6E6B63]">On Save, Cloudflare CDN automatically invalidates the cache worldwide in &lt;30ms.</p>
      </div>

    </aside>
  </div>

  <!-- FLOATING TK SUMMARY MASCOT TRIGGER BUTTON (BOTTOM RIGHT) -->
  <button id="tkSummaryFloatingBtn" onclick="openAiModal()" type="button" aria-label="Open TK Summary AI" style="z-index: 9990; touch-action: manipulation;" class="fixed right-4 bottom-4 sm:right-6 sm:bottom-6 flex items-center group cursor-pointer select-none focus:outline-none bg-transparent border-0 p-0">
    <!-- Tooltip Pill -->
    <div class="mr-2 sm:mr-3 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-2xl bg-white/95 border border-[#EAE8E1] text-xs font-bold text-[#1C1B18] shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0 pointer-events-none flex items-center space-x-2">
      <span class="w-2 h-2 rounded-full bg-[#C25E3E] animate-ping"></span>
      <span>TK Summary AI</span>
    </div>

    <!-- Character Mascot (Transparent PNG, No Background) -->
    <div class="relative w-14 h-14 sm:w-20 sm:h-20 transition-transform duration-300 group-hover:scale-110 active:scale-95 cursor-pointer">
      <img src="/assets/tk-mascot.webp" class="w-full h-full object-contain group-hover:hidden transition-all duration-200 filter drop-shadow-[0_8px_20px_rgba(194,94,62,0.35)]" alt="TK Summary" fetchpriority="high" loading="eager" width="80" height="89">
      <img src="/assets/tk-mascot-happy.webp" class="w-full h-full object-contain hidden group-hover:block transition-all duration-200 filter drop-shadow-[0_12px_28px_rgba(194,94,62,0.5)] animate-bounce" alt="TK Summary Happy" loading="eager" width="80" height="89">
    </div>
  </button>

  <!-- BACKDROP OVERLAY FOR TK SUMMARY MODAL -->
  <div id="aiModalBackdrop" onclick="closeAiModal()" style="display: none; z-index: 9998;" class="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-200"></div>

  <!-- RIGHT-SIDE TK SUMMARY SLIDE-OUT PANEL (POPUP ON EDITOR) -->
  <div id="aiModal" style="display: none; z-index: 9999;" class="fixed top-0 right-0 bottom-0 h-full h-screen h-[100dvh] w-full sm:w-[560px] lg:w-[620px] bg-[#FAF9F5] border-l border-[#EAE8E1] shadow-2xl flex flex-col">
    
    <!-- Drawer Header -->
    <div class="p-3 sm:p-5 border-b border-[#EAE8E1] bg-white flex items-center justify-between flex-shrink-0">
      <div class="flex items-center space-x-2.5 sm:space-x-3">
        <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#C25E3E]/10 border border-[#C25E3E]/20 p-1 flex items-center justify-center text-white shadow-xs">
          <img src="/assets/tk-mascot.webp" class="w-full h-full object-contain" alt="TK Summary" loading="eager" width="40" height="40">
        </div>
        <div>
          <div class="flex items-center space-x-2">
            <h2 class="text-xs sm:text-base font-black text-[#1C1B18] tracking-wide">TK SUMMARY CLASSIC</h2>
            <span class="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-[#C25E3E]/15 text-[#C25E3E] border border-[#C25E3E]/30">v2.5 AI</span>
          </div>
          <p class="text-[10px] sm:text-[11px] text-[#6E6B63] truncate max-w-[220px] sm:max-w-none">15 Newsroom Presets • Rule-Based Formatter • WebP Image Studio</p>
        </div>
      </div>
      <button onclick="closeAiModal()" type="button" class="w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-[#F3F1EC] hover:bg-[#EAE8E1] text-[#6E6B63] hover:text-[#1C1B18] border border-[#E5E2D9] flex items-center justify-center font-bold text-sm transition cursor-pointer" title="Close Panel">✕</button>
    </div>

    <!-- Mode Selector Tabs (AI Styles vs Free Presets) -->
    <div class="px-4 sm:px-6 pt-3 pb-2 bg-[#F8F7F3] border-b border-[#EAE8E1] flex items-center space-x-2 flex-shrink-0">
      <button type="button" id="tabAiStyles" onclick="switchTkTab('ai')" class="flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 bg-[#C25E3E] text-white shadow-sm">
        <span>⚡ AI Style Rewrite (15 Presets)</span>
      </button>
      <button type="button" id="tabFreePresets" onclick="switchTkTab('free')" class="flex-1 py-2 px-3 rounded-xl text-xs font-semibold text-[#6E6B63] hover:text-[#1C1B18] transition flex items-center justify-center space-x-2 bg-[#F3F1EC] border border-[#E5E2D9]">
        <span>🎨 Free Presets (No AI)</span>
      </button>
    </div>

    <!-- Drawer Scrollable Content -->
    <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-[#1C1B18]">

      <!-- Gemini API Key Input Bar -->
      <div class="p-3.5 rounded-2xl bg-[#F8F7F3] border border-[#EAE8E1] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div class="flex-1">
          <label class="block font-bold text-[#1C1B18] mb-1">Google Gemini API Key (Free):</label>
          <div class="flex items-center space-x-2">
            <input type="password" id="geminiApiKey" class="w-full bg-white border border-[#E5E2D9] rounded-lg px-3 py-1.5 text-xs text-[#1C1B18] placeholder-[#8A867E] focus:outline-none focus:border-[#C25E3E]" placeholder="AIzaSy... (Saved in browser)">
            <button type="button" onclick="saveGeminiKey()" class="px-3 py-1.5 rounded-lg bg-[#C25E3E] hover:bg-[#B05335] text-white font-semibold shadow-xs">Save</button>
          </div>
        </div>
        <div class="text-[11px] text-[#6E6B63] sm:text-right">
          <span>Get Free Key:</span>
          <a href="https://aistudio.google.com/app/apikey" target="_blank" class="text-[#C25E3E] hover:underline block font-semibold">aistudio.google.com &rarr;</a>
        </div>
      </div>

      <!-- TAB 1: AI STYLES & LINK SCRAPER -->
      <div id="tkAiTabContent" class="space-y-6">

        <!-- Step 1: Input URL and Fetch Article -->
        <div class="space-y-2">
          <label class="block text-xs font-bold uppercase tracking-wider text-[#6E6B63]">1. Paste Article Post Link:</label>
          <div class="flex items-center space-x-2">
            <input type="url" id="fetchUrlInput" class="flex-1 bg-white border border-[#E5E2D9] rounded-xl px-4 py-2.5 text-xs text-[#1C1B18] placeholder-[#8A867E] focus:outline-none focus:border-[#C25E3E]" placeholder="https://edition.cnn.com/... or https://topstoryusa.info/...">
            <button type="button" id="btnFetchUrl" onclick="fetchArticleFromLink()" class="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#C25E3E] hover:bg-[#B05335] text-white shadow-sm flex items-center space-x-2 transition">
              <span>⚡ Fetch Article & Image</span>
            </button>
          </div>
        </div>

        <!-- Fetched Article Preview Box (Hidden until fetched) -->
        <div id="fetchPreviewBox" class="hidden p-4 rounded-2xl bg-white border border-[#EAE8E1] space-y-3 text-xs shadow-xs">
          <div class="flex items-center justify-between text-emerald-700 font-bold border-b border-[#EAE8E1] pb-2">
            <span>✓ Article & Image Successfully Fetched!</span>
            <span id="fetchStatsBadge" class="text-[#6E6B63] font-mono">Ready</span>
          </div>
          <div class="flex gap-4 items-start">
            <img id="fetchedThumbImg" class="w-24 h-24 object-cover rounded-xl border border-[#EAE8E1] flex-shrink-0 bg-[#F3F1EC]">
            <div class="flex-1 min-w-0 space-y-1">
              <h4 id="fetchedTitlePreview" class="font-bold text-[#1C1B18] text-sm line-clamp-2"></h4>
              <p id="fetchedSummaryPreview" class="text-[#6E6B63] line-clamp-2 leading-relaxed"></p>
              <div class="flex items-center space-x-3 text-[11px] text-[#8A867E] pt-1">
                <span class="text-emerald-700 font-mono">✓ Unlinked & Ready for WebP</span>
              </div>
            </div>
          </div>
          <div class="flex items-center justify-between pt-2 border-t border-[#EAE8E1]">
            <span class="text-emerald-700 font-semibold text-xs">✓ Automatically injected into Editor!</span>
            <button type="button" onclick="closeAiModal()" class="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm transition">
              <span>📥 View In Editor Now</span>
            </button>
          </div>
        </div>

        <!-- Step 2: Choose from 15 TK Summary Styles (With Real Brand Logos) -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <label class="block text-xs font-bold uppercase tracking-wider text-[#6E6B63]">2. Choose Editorial News Style (15 Official Presets):</label>
            <span class="text-[11px] text-[#C25E3E] font-mono font-bold" id="selectedStyleBadge">CNN Digital</span>
          </div>

          <!-- Quick Apply Action Bar inside Step 2 -->
          <div class="p-3 bg-white border border-[#EAE8E1] rounded-2xl flex items-center justify-between gap-2 shadow-xs">
            <div class="flex items-center space-x-2 min-w-0">
              <span class="text-xs font-bold text-[#1C1B18] flex-shrink-0">Active:</span>
              <span id="selectedStyleBadgeInline" class="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#C25E3E] text-white shadow-xs truncate">CNN Digital</span>
            </div>
            <button type="button" onclick="executeAiProcess('format')" style="touch-action: manipulation;" class="px-4 py-2 rounded-xl bg-[#C25E3E] hover:bg-[#B05335] text-white font-bold text-xs shadow-md shadow-[#C25E3E]/20 flex items-center space-x-1.5 transition cursor-pointer flex-shrink-0">
              <span id="quickApplyStyleBtnText">⚡ Apply CNN Digital Style</span>
            </button>
          </div>
          
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[360px] overflow-y-auto pr-1" id="styleSelectorGrid">
            
            <!-- 1. CNN -->
            <div onclick="selectStyle('cnn')" ondblclick="onStyleCardDblClick('cnn')" class="style-card selected border border-[#C25E3E] bg-[#FFF5F0] p-3 rounded-2xl cursor-pointer hover:border-[#C25E3E] hover:shadow-xs transition space-y-2 flex flex-col justify-between relative" style="border: 2px solid #C25E3E !important; background-color: #FFF5F0 !important;" data-style="cnn">
              <span class="check-pill absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#C25E3E] text-white text-[10px] font-black flex items-center justify-center shadow">✓</span>
              <div class="flex items-center space-x-2.5">
                <img src="/assets/styles/cnn.png" class="w-7 h-7 object-contain rounded bg-[#F8F7F3] p-0.5 border border-[#EAE8E1]" alt="CNN">
                <div class="text-left min-w-0">
                  <div class="font-bold text-xs text-[#1C1B18] truncate">CNN Digital</div>
                  <div class="text-[10px] text-[#6E6B63] truncate">Editorial News</div>
                </div>
              </div>
              <div class="text-[10px] text-[#C25E3E] bg-[#C25E3E]/10 px-2 py-0.5 rounded border border-[#C25E3E]/20 text-center font-medium">5W1H Inverted Lede</div>
            </div>

            <!-- 2. Daily Mail -->
            <div onclick="selectStyle('dailymail')" ondblclick="onStyleCardDblClick('dailymail')" class="style-card border border-[#EAE8E1] bg-white p-3 rounded-2xl cursor-pointer hover:border-[#C25E3E] hover:shadow-xs transition space-y-2 flex flex-col justify-between relative" data-style="dailymail">
              <span class="check-pill absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#C25E3E] text-white text-[10px] font-black items-center justify-center shadow">✓</span>
              <div class="flex items-center space-x-2.5">
                <img src="/assets/styles/dailymail.png" class="w-7 h-7 object-contain rounded bg-[#F8F7F3] p-0.5 border border-[#EAE8E1]" alt="Daily Mail">
                <div class="text-left min-w-0">
                  <div class="font-bold text-xs text-[#1C1B18] truncate">Daily Mail</div>
                  <div class="text-[10px] text-[#6E6B63] truncate">Tabloid & Drama</div>
                </div>
              </div>
              <div class="text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 text-center font-medium">WHAT WE KNOW Box</div>
            </div>

            <!-- 3. Fox News -->
            <div onclick="selectStyle('foxnews')" ondblclick="onStyleCardDblClick('foxnews')" class="style-card border border-[#EAE8E1] bg-white p-3 rounded-2xl cursor-pointer hover:border-[#C25E3E] hover:shadow-xs transition space-y-2 flex flex-col justify-between relative" data-style="foxnews">
              <span class="check-pill absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#C25E3E] text-white text-[10px] font-black items-center justify-center shadow">✓</span>
              <div class="flex items-center space-x-2.5">
                <img src="/assets/styles/foxnews.png" class="w-7 h-7 object-contain rounded bg-[#F8F7F3] p-0.5 border border-[#EAE8E1]" alt="Fox News">
                <div class="text-left min-w-0">
                  <div class="font-bold text-xs text-[#1C1B18] truncate">Fox News</div>
                  <div class="text-[10px] text-[#6E6B63] truncate">Hard News</div>
                </div>
              </div>
              <div class="text-[10px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-center font-medium">Conflict Frame Lede</div>
            </div>

            <!-- 4. AP Wire -->
            <div onclick="selectStyle('ap')" ondblclick="onStyleCardDblClick('ap')" class="style-card border border-[#EAE8E1] bg-white p-3 rounded-2xl cursor-pointer hover:border-[#C25E3E] hover:shadow-xs transition space-y-2 flex flex-col justify-between relative" data-style="ap">
              <span class="check-pill absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#C25E3E] text-white text-[10px] font-black items-center justify-center shadow">✓</span>
              <div class="flex items-center space-x-2.5">
                <img src="/assets/styles/ap.png" class="w-7 h-7 object-contain rounded bg-[#F8F7F3] p-0.5 border border-[#EAE8E1]" alt="AP">
                <div class="text-left min-w-0">
                  <div class="font-bold text-xs text-[#1C1B18] truncate">AP Wire</div>
                  <div class="text-[10px] text-[#6E6B63] truncate">Wire Service</div>
                </div>
              </div>
              <div class="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-center font-medium">CITY (AP) — Dateline</div>
            </div>

            <!-- 5. People Magazine -->
            <div onclick="selectStyle('people')" ondblclick="onStyleCardDblClick('people')" class="style-card border border-[#EAE8E1] bg-white p-3 rounded-2xl cursor-pointer hover:border-[#C25E3E] hover:shadow-xs transition space-y-2 flex flex-col justify-between relative" data-style="people">
              <span class="check-pill absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#C25E3E] text-white text-[10px] font-black items-center justify-center shadow">✓</span>
              <div class="flex items-center space-x-2.5">
                <img src="/assets/styles/people.png" class="w-7 h-7 object-contain rounded bg-[#F8F7F3] p-0.5 border border-[#EAE8E1]" alt="People">
                <div class="text-left min-w-0">
                  <div class="font-bold text-xs text-[#1C1B18] truncate">People Magazine</div>
                  <div class="text-[10px] text-[#6E6B63] truncate">Celebrity & Culture</div>
                </div>
              </div>
              <div class="text-[10px] text-pink-700 bg-pink-50 px-2 py-0.5 rounded border border-pink-200 text-center font-medium">Person-first lede</div>
            </div>

            <!-- 6. TMZ -->
            <div onclick="selectStyle('tmz')" ondblclick="onStyleCardDblClick('tmz')" class="style-card border border-[#EAE8E1] bg-white p-3 rounded-2xl cursor-pointer hover:border-[#C25E3E] hover:shadow-xs transition space-y-2 flex flex-col justify-between relative" data-style="tmz">
              <span class="check-pill absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#C25E3E] text-white text-[10px] font-black items-center justify-center shadow">✓</span>
              <div class="flex items-center space-x-2.5">
                <img src="/assets/styles/tmz.png" class="w-7 h-7 object-contain rounded bg-[#F8F7F3] p-0.5 border border-[#EAE8E1]" alt="TMZ">
                <div class="text-left min-w-0">
                  <div class="font-bold text-xs text-[#1C1B18] truncate">TMZ</div>
                  <div class="text-[10px] text-[#6E6B63] truncate">Gossip Fast</div>
                </div>
              </div>
              <div class="text-[10px] text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200 text-center font-medium">Here's the deal...</div>
            </div>

            <!-- 7. BuzzFeed -->
            <div onclick="selectStyle('buzzfeed')" ondblclick="onStyleCardDblClick('buzzfeed')" class="style-card border border-[#EAE8E1] bg-white p-3 rounded-2xl cursor-pointer hover:border-[#C25E3E] hover:shadow-xs transition space-y-2 flex flex-col justify-between relative" data-style="buzzfeed">
              <span class="check-pill absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#C25E3E] text-white text-[10px] font-black items-center justify-center shadow">✓</span>
              <div class="flex items-center space-x-2.5">
                <img src="/assets/styles/buzzfeed.png" class="w-7 h-7 object-contain rounded bg-[#F8F7F3] p-0.5 border border-[#EAE8E1]" alt="BuzzFeed">
                <div class="text-left min-w-0">
                  <div class="font-bold text-xs text-[#1C1B18] truncate">BuzzFeed</div>
                  <div class="text-[10px] text-[#6E6B63] truncate">Internet Culture</div>
                </div>
              </div>
              <div class="text-[10px] text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 text-center font-medium">Numbered H2s</div>
            </div>

            <!-- 8. Breaking Express -->
            <div onclick="selectStyle('breaking')" ondblclick="onStyleCardDblClick('breaking')" class="style-card border border-[#EAE8E1] bg-white p-3 rounded-2xl cursor-pointer hover:border-[#C25E3E] hover:shadow-xs transition space-y-2 flex flex-col justify-between relative" data-style="breaking">
              <span class="check-pill absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#C25E3E] text-white text-[10px] font-black items-center justify-center shadow">✓</span>
              <div class="flex items-center space-x-2.5">
                <img src="/assets/styles/breaking.png" class="w-7 h-7 object-contain rounded bg-[#F8F7F3] p-0.5 border border-[#EAE8E1]" alt="Breaking">
                <div class="text-left min-w-0">
                  <div class="font-bold text-xs text-[#1C1B18] truncate">Breaking Express</div>
                  <div class="text-[10px] text-[#6E6B63] truncate">Urgent Alert</div>
                </div>
              </div>
              <div class="text-[10px] text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 text-center font-medium">BREAKING Banner</div>
            </div>

            <!-- 9. Tabloid -->
            <div onclick="selectStyle('tabloid')" ondblclick="onStyleCardDblClick('tabloid')" class="style-card border border-[#EAE8E1] bg-white p-3 rounded-2xl cursor-pointer hover:border-[#C25E3E] hover:shadow-xs transition space-y-2 flex flex-col justify-between relative" data-style="tabloid">
              <span class="check-pill absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#C25E3E] text-white text-[10px] font-black items-center justify-center shadow">✓</span>
              <div class="flex items-center space-x-2.5">
                <img src="/assets/styles/tabloid.png" class="w-7 h-7 object-contain rounded bg-[#F8F7F3] p-0.5 border border-[#EAE8E1]" alt="Tabloid">
                <div class="text-left min-w-0">
                  <div class="font-bold text-xs text-[#1C1B18] truncate">Tabloid</div>
                  <div class="text-[10px] text-[#6E6B63] truncate">Outrage Click</div>
                </div>
              </div>
              <div class="text-[10px] text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 text-center font-medium">BOMBSHELL Opener</div>
            </div>

            <!-- 10. News Analysis -->
            <div onclick="selectStyle('analysis')" ondblclick="onStyleCardDblClick('analysis')" class="style-card border border-[#EAE8E1] bg-white p-3 rounded-2xl cursor-pointer hover:border-[#C25E3E] hover:shadow-xs transition space-y-2 flex flex-col justify-between relative" data-style="analysis">
              <span class="check-pill absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#C25E3E] text-white text-[10px] font-black items-center justify-center shadow">✓</span>
              <div class="flex items-center space-x-2.5">
                <img src="/assets/styles/analysis.png" class="w-7 h-7 object-contain rounded bg-[#F8F7F3] p-0.5 border border-[#EAE8E1]" alt="Analysis">
                <div class="text-left min-w-0">
                  <div class="font-bold text-xs text-[#1C1B18] truncate">News Analysis</div>
                  <div class="text-[10px] text-[#6E6B63] truncate">Interpretive</div>
                </div>
              </div>
              <div class="text-[10px] text-[#6E6B63] bg-[#F3F1EC] px-2 py-0.5 rounded border border-[#E5E2D9] text-center font-medium">Thesis Lede & Outlook</div>
            </div>

            <!-- 11. Axios Express -->
            <div onclick="selectStyle('axios')" ondblclick="onStyleCardDblClick('axios')" class="style-card border border-[#EAE8E1] bg-white p-3 rounded-2xl cursor-pointer hover:border-[#C25E3E] hover:shadow-xs transition space-y-2 flex flex-col justify-between relative" data-style="axios">
              <span class="check-pill absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#C25E3E] text-white text-[10px] font-black items-center justify-center shadow">✓</span>
              <div class="flex items-center space-x-2.5">
                <img src="/assets/styles/axios.svg" class="w-7 h-7 object-contain rounded bg-[#F8F7F3] p-0.5 border border-[#EAE8E1]" alt="Axios">
                <div class="text-left min-w-0">
                  <div class="font-bold text-xs text-[#1C1B18] truncate">Axios Express</div>
                  <div class="text-[10px] text-[#6E6B63] truncate">Smart Brevity</div>
                </div>
              </div>
              <div class="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-center font-medium">1 Big Thing • Numbers</div>
            </div>

            <!-- 12. USA Viral Hook -->
            <div onclick="selectStyle('usaviral')" ondblclick="onStyleCardDblClick('usaviral')" class="style-card border border-[#EAE8E1] bg-white p-3 rounded-2xl cursor-pointer hover:border-[#C25E3E] hover:shadow-xs transition space-y-2 flex flex-col justify-between relative" data-style="usaviral">
              <span class="check-pill absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#C25E3E] text-white text-[10px] font-black items-center justify-center shadow">✓</span>
              <div class="flex items-center space-x-2.5">
                <img src="/assets/styles/usaviral.svg" class="w-7 h-7 object-contain rounded bg-[#F8F7F3] p-0.5 border border-[#EAE8E1]" alt="Viral">
                <div class="text-left min-w-0">
                  <div class="font-bold text-xs text-[#1C1B18] truncate">USA Viral Hook</div>
                  <div class="text-[10px] text-[#6E6B63] truncate">Social Traffic</div>
                </div>
              </div>
              <div class="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-center font-medium">Curiosity Gap • Share</div>
            </div>

            <!-- 13. NYT Explainer -->
            <div onclick="selectStyle('nytexplainer')" ondblclick="onStyleCardDblClick('nytexplainer')" class="style-card border border-[#EAE8E1] bg-white p-3 rounded-2xl cursor-pointer hover:border-[#C25E3E] hover:shadow-xs transition space-y-2 flex flex-col justify-between relative" data-style="nytexplainer">
              <span class="check-pill absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#C25E3E] text-white text-[10px] font-black items-center justify-center shadow">✓</span>
              <div class="flex items-center space-x-2.5">
                <img src="/assets/styles/nyt.svg" class="w-7 h-7 object-contain rounded bg-[#F8F7F3] p-0.5 border border-[#EAE8E1]" alt="NYT">
                <div class="text-left min-w-0">
                  <div class="font-bold text-xs text-[#1C1B18] truncate">NYT Explainer</div>
                  <div class="text-[10px] text-[#6E6B63] truncate">Contextual</div>
                </div>
              </div>
              <div class="text-[10px] text-[#6E6B63] bg-[#F3F1EC] px-2 py-0.5 rounded border border-[#E5E2D9] text-center font-medium">H2 Q&A • Zero Jargon</div>
            </div>

            <!-- 14. Substack / Brew -->
            <div onclick="selectStyle('newsletter')" ondblclick="onStyleCardDblClick('newsletter')" class="style-card border border-[#EAE8E1] bg-white p-3 rounded-2xl cursor-pointer hover:border-[#C25E3E] hover:shadow-xs transition space-y-2 flex flex-col justify-between relative" data-style="newsletter">
              <span class="check-pill absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#C25E3E] text-white text-[10px] font-black items-center justify-center shadow">✓</span>
              <div class="flex items-center space-x-2.5">
                <img src="/assets/styles/substack.svg" class="w-7 h-7 object-contain rounded bg-[#F8F7F3] p-0.5 border border-[#EAE8E1]" alt="Substack">
                <div class="text-left min-w-0">
                  <div class="font-bold text-xs text-[#1C1B18] truncate">Substack / Brew</div>
                  <div class="text-[10px] text-[#6E6B63] truncate">Newsletter</div>
                </div>
              </div>
              <div class="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 text-center font-medium">☕ Greeting • P.S. box</div>
            </div>

            <!-- 15. Investigative -->
            <div onclick="selectStyle('investigative')" ondblclick="onStyleCardDblClick('investigative')" class="style-card border border-[#EAE8E1] bg-white p-3 rounded-2xl cursor-pointer hover:border-[#C25E3E] hover:shadow-xs transition space-y-2 flex flex-col justify-between relative" data-style="investigative">
              <span class="check-pill absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#C25E3E] text-white text-[10px] font-black items-center justify-center shadow">✓</span>
              <div class="flex items-center space-x-2.5">
                <img src="/assets/styles/investigative.svg" class="w-7 h-7 object-contain rounded bg-[#F8F7F3] p-0.5 border border-[#EAE8E1]" alt="Investigative">
                <div class="text-left min-w-0">
                  <div class="font-bold text-xs text-[#1C1B18] truncate">Investigative</div>
                  <div class="text-[10px] text-[#6E6B63] truncate">Evidence-driven</div>
                </div>
              </div>
              <div class="text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 text-center font-medium">The Paper Trail • Accused</div>
            </div>

          </div>
        </div>

        <!-- Step 3: Options (Injection target, word count, WebP unlinking) -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#EAE8E1] text-xs">
          
          <!-- Target Injection View -->
          <div>
            <label class="block font-bold text-[#6E6B63] mb-1.5">Inject Result Into:</label>
            <select id="aiInjectTarget" class="w-full bg-white border border-[#E5E2D9] rounded-xl px-3 py-2 text-xs text-[#1C1B18] focus:outline-none focus:border-[#C25E3E]">
              <option value="both">Both Views (HTML & Post)</option>
              <option value="post">Post View (Visual)</option>
              <option value="html">HTML View (Code)</option>
            </select>
          </div>

          <!-- Target Words (for Rewrite) -->
          <div>
            <label class="block font-bold text-[#6E6B63] mb-1.5">Rewrite Word Target:</label>
            <select id="aiTargetWords" class="w-full bg-white border border-[#E5E2D9] rounded-xl px-3 py-2 text-xs text-[#1C1B18] focus:outline-none focus:border-[#C25E3E]">
              <option value="250">250 Words (Quick Bullet)</option>
              <option value="450" selected>450 Words (Standard)</option>
              <option value="750">750 Words (In-Depth)</option>
              <option value="1200">1200 Words (Longform Investigation)</option>
            </select>
          </div>

          <!-- Image Unlink & WebP check -->
          <div class="flex items-center pt-5">
            <label class="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" id="aiCleanImageCheckbox" checked class="rounded border-[#E5E2D9] text-[#C25E3E] focus:ring-0">
              <span class="text-[#1C1B18] text-[11px] font-semibold">Unlink site & WebP Image</span>
            </label>
          </div>

        </div>

        <!-- Step 4: The 2 Action Buttons (Only Format vs Rewrite) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#EAE8E1]">
          
          <!-- Button 1: Only Format (Keep Original Words) -->
          <button type="button" id="btnOnlyFormat" onclick="executeAiProcess('format')" class="py-3 px-5 rounded-2xl bg-white hover:bg-[#F8F7F3] text-[#1C1B18] font-bold text-xs border border-[#E5E2D9] flex flex-col items-center justify-center transition shadow-xs">
            <div class="flex items-center space-x-2 text-[#C25E3E] font-black">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"/></svg>
              <span>✨ Only Format (រក្សាពាក្យដើម)</span>
            </div>
            <span class="text-[11px] text-[#6E6B63] mt-1 font-normal">Keep original words & quotes; format into signature style</span>
          </button>

          <!-- Button 2: Rewrite with AI (Full rewrite) -->
          <button type="button" id="btnRewriteAi" onclick="executeAiProcess('rewrite')" class="py-3 px-5 rounded-2xl bg-[#C25E3E] hover:bg-[#B05335] text-white font-bold text-xs shadow-md shadow-[#C25E3E]/20 flex flex-col items-center justify-center transition">
            <div class="flex items-center space-x-2 font-black text-amber-200">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
              <span>⚡ AI Rewrite (សរសេរឡើងវិញ)</span>
            </div>
            <span class="text-[11px] text-[#F3F1EC] mt-1 font-normal">Authentic brand tone, vocabulary & structure</span>
          </button>

        </div>

      </div>

      <!-- TAB 2: FREE PRESETS (RULE-BASED, NO AI NEEDED) -->
      <div id="tkFreeTabContent" class="hidden space-y-4">
        <div class="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2">
          <span>💡</span>
          <span><strong>Instant Formatting:</strong> Reorganizes paragraphs, inserts headings, pull-quotes, and drop caps without consuming any AI tokens.</span>
        </div>

        <div class="grid grid-cols-2 gap-3">
          
          <button type="button" onclick="applyFreePreset('wire')" class="p-3.5 rounded-2xl bg-white border border-[#EAE8E1] hover:border-[#C25E3E] hover:shadow-xs text-left transition space-y-1 group">
            <div class="font-bold text-xs text-[#1C1B18] group-hover:text-[#C25E3E]">Classic Wire</div>
            <div class="text-[10px] text-[#6E6B63]">Minimal, tight paragraphs, single H2 max.</div>
          </button>

          <button type="button" onclick="applyFreePreset('feature')" class="p-3.5 rounded-2xl bg-white border border-[#EAE8E1] hover:border-[#C25E3E] hover:shadow-xs text-left transition space-y-1 group">
            <div class="font-bold text-xs text-[#1C1B18] group-hover:text-[#C25E3E]">Magazine Feature</div>
            <div class="text-[10px] text-[#6E6B63]">Drop-cap opener, H2 break, pull-quote callout.</div>
          </button>

          <button type="button" onclick="applyFreePreset('listicle')" class="p-3.5 rounded-2xl bg-white border border-[#EAE8E1] hover:border-[#C25E3E] hover:shadow-xs text-left transition space-y-1 group">
            <div class="font-bold text-xs text-[#1C1B18] group-hover:text-[#C25E3E]">Listicle</div>
            <div class="text-[10px] text-[#6E6B63]">Numbered H2 sections with key takeaways.</div>
          </button>

          <button type="button" onclick="applyFreePreset('tabloid')" class="p-3.5 rounded-2xl bg-white border border-[#EAE8E1] hover:border-[#C25E3E] hover:shadow-xs text-left transition space-y-1 group">
            <div class="font-bold text-xs text-[#1C1B18] group-hover:text-[#C25E3E]">Tabloid Bold</div>
            <div class="text-[10px] text-[#6E6B63]">Large bold lede, ALL-CAPS H2s, punchy paragraphs.</div>
          </button>

          <button type="button" onclick="applyFreePreset('broadsheet')" class="p-3.5 rounded-2xl bg-white border border-[#EAE8E1] hover:border-[#C25E3E] hover:shadow-xs text-left transition space-y-1 group">
            <div class="font-bold text-xs text-[#1C1B18] group-hover:text-[#C25E3E]">Broadsheet Classic</div>
            <div class="text-[10px] text-[#6E6B63]">Serif typography, dateline, formal attribution.</div>
          </button>

          <button type="button" onclick="applyFreePreset('explainer')" class="p-3.5 rounded-2xl bg-white border border-[#EAE8E1] hover:border-[#C25E3E] hover:shadow-xs text-left transition space-y-1 group">
            <div class="font-bold text-xs text-[#1C1B18] group-hover:text-[#C25E3E]">Digital Explainer</div>
            <div class="text-[10px] text-[#6E6B63]">"Why it matters" box, H2s every ~150 words.</div>
          </button>

          <button type="button" onclick="applyFreePreset('breaking')" class="p-3.5 rounded-2xl bg-white border border-[#EAE8E1] hover:border-[#C25E3E] hover:shadow-xs text-left transition space-y-1 group">
            <div class="font-bold text-xs text-[#1C1B18] group-hover:text-[#C25E3E]">Breaking Bulletin</div>
            <div class="text-[10px] text-[#6E6B63]">BREAKING kicker banner + bullet summary.</div>
          </button>

          <button type="button" onclick="applyFreePreset('newsletter')" class="p-3.5 rounded-2xl bg-white border border-[#EAE8E1] hover:border-[#C25E3E] hover:shadow-xs text-left transition space-y-1 group">
            <div class="font-bold text-xs text-[#1C1B18] group-hover:text-[#C25E3E]">Newsletter Style</div>
            <div class="text-[10px] text-[#6E6B63]">Casual greeting, fast facts bullets, P.S. sign-off.</div>
          </button>

        </div>
      </div>

      <!-- Result Applied Alert / Preview -->
      <div id="aiProcessingState" class="hidden p-4 rounded-2xl bg-[#C25E3E]/10 border border-[#C25E3E]/30 text-center text-xs text-[#C25E3E]">
        <span class="animate-spin inline-block mr-2">🌀</span>
        <span id="aiProcessingText">Processing with TK Summary...</span>
      </div>

    </div>
  </div>


  <script>
    const postId = ${post ? post.id : 'null'};
    let currentViewMode = 'post';
    let currentSelectedStyle = 'cnn';
    let fetchedArticleData = null;

    // Load saved Gemini API Key & short links
    function initEditor() {
      const savedKey = localStorage.getItem('gemini_api_key');
      const keyInput = document.getElementById('geminiApiKey');
      if (savedKey && keyInput) {
        keyInput.value = savedKey;
      }
      initSyncListeners();
      updateWordCount();
      syncInitialContent();
      if (postId) {
        loadShortLinks(postId);
      }
      if (new URLSearchParams(window.location.search).get('open_ai') === '1') {
        setTimeout(openAiModal, 150);
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initEditor);
    } else {
      initEditor();
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAiModal();
    });

    // ================= SHORT LINKS CLIENT FUNCTIONS =================
    let generatedShortLinksCache = [];

    async function loadShortLinks(pid) {
      if (!pid) return;
      const listEl = document.getElementById('shortLinksList');
      const actionBox = document.getElementById('shortLinksActionBox');
      const statsEl = document.getElementById('shortLinksStats');
      if (!listEl) return;

      try {
        const res = await fetch('/api/posts/' + pid + '/short-links');
        const data = await res.json();
        if (data.success && data.links) {
          generatedShortLinksCache = data.links;
          renderShortLinksList();
        } else {
          listEl.innerHTML = '<div class="text-[11px] text-[#8A867E] italic py-2 text-center">មិនទាន់មាន short link ទេ។</div>';
        }
      } catch (e) {
        listEl.innerHTML = '<div class="text-[11px] text-rose-500 py-2 text-center">Failed to load short links</div>';
      }
    }

    function renderShortLinksList() {
      const listEl = document.getElementById('shortLinksList');
      const actionBox = document.getElementById('shortLinksActionBox');
      const statsEl = document.getElementById('shortLinksStats');
      if (!listEl) return;

      if (!generatedShortLinksCache || generatedShortLinksCache.length === 0) {
        listEl.innerHTML = '<div class="text-[11px] text-[#8A867E] italic py-2 text-center">មិនទាន់មាន short link ទេ។ ចុច Generate ដើម្បីបង្កើត!</div>';
        if (actionBox) actionBox.classList.add('hidden');
        return;
      }

      const totalClicks = generatedShortLinksCache.reduce((sum, l) => sum + (l.clicks || 0), 0);
      if (actionBox) actionBox.classList.remove('hidden');
      if (statsEl) statsEl.innerText = generatedShortLinksCache.length + ' links (' + totalClicks + ' clicks)';

      listEl.innerHTML = generatedShortLinksCache.map(link => {
        return '<div class="p-2 bg-white rounded-xl border border-[#EAE8E1] flex items-center justify-between text-xs hover:border-indigo-300 transition">' +
          '<div class="truncate mr-2">' +
            '<a href="' + link.url + '" target="_blank" class="font-mono font-bold text-indigo-600 hover:underline text-[11px] block truncate">' + link.url + '</a>' +
            '<span class="text-[9px] text-[#8A867E] font-mono">' + (link.clicks || 0) + ' clicks</span>' +
          '</div>' +
          '<button type="button" onclick="copyShortLink(\'' + link.url + '\', this)" class="px-2 py-1 rounded bg-[#F3F1EC] hover:bg-indigo-50 text-[#1C1B18] hover:text-indigo-600 text-[10px] font-bold border border-[#E5E2D9] transition flex-shrink-0 cursor-pointer">' +
            'Copy' +
          '</button>' +
        '</div>';
      }).join('');
    }

    async function generateShortLinks(pid) {
      if (!pid) return;
      const qtyInput = document.getElementById('shortLinkQuantity');
      const count = parseInt(qtyInput ? qtyInput.value : '10') || 10;
      const btn = document.getElementById('btnGenerateShortLinks');

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span>⚡...</span>';
      }

      try {
        const res = await fetch('/api/posts/' + pid + '/short-links/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ count })
        });
        const data = await res.json();
        if (data.success && data.links) {
          generatedShortLinksCache = [...data.links, ...generatedShortLinksCache];
          renderShortLinksList();
          alert('✓ បានបង្កើត Short Links ៦ ខ្ទង់ចំនួន ' + data.generated + ' ដោយជោគជ័យ!');
        } else {
          alert('Error: ' + (data.error || 'Failed to generate short links'));
        }
      } catch (err) {
        alert('Error: ' + err.message);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<span>⚡ Generate</span>';
        }
      }
    }

    function copyShortLink(url, btn) {
      navigator.clipboard.writeText(url).then(() => {
        if (btn) {
          const orig = btn.innerText;
          btn.innerText = 'Copied!';
          btn.classList.add('bg-emerald-100', 'text-emerald-700');
          setTimeout(() => {
            btn.innerText = orig;
            btn.classList.remove('bg-emerald-100', 'text-emerald-700');
          }, 1500);
        }
      });
    }

    function copyAllShortLinks() {
      if (!generatedShortLinksCache || generatedShortLinksCache.length === 0) return;
      const allUrls = generatedShortLinksCache.map(l => l.url).join('\n');
      navigator.clipboard.writeText(allUrls).then(() => {
        alert('✓ បាន Copy គ្រប់ ' + generatedShortLinksCache.length + ' Links ចូលក្នុង Clipboard រួចរាល់! អាចយកទៅ Paste ក្នុង Facebook/Comments បានភ្លាមៗ។');
      });
    }

    function saveGeminiKey() {
      const key = document.getElementById('geminiApiKey').value.trim();
      localStorage.setItem('gemini_api_key', key);
      alert('✓ Google Gemini API Key saved in your browser!');
    }

    async function promptAddNewCategory() {
      const name = prompt("Enter new category name (e.g. World, Politics, Sports):");
      if (!name || !name.trim()) return;
      try {
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim() })
        });
        const data = await res.json();
        if (data.success && data.category) {
          const select = document.getElementById('categoryInput');
          const opt = document.createElement('option');
          opt.value = data.category.id;
          opt.textContent = data.category.name;
          opt.selected = true;
          select.appendChild(opt);
          alert('✓ Category "' + data.category.name + '" added and selected!');
        } else {
          alert('Error: ' + (data.error || 'Failed to add category'));
        }
      } catch (err) {
        alert('Error adding category: ' + err.message);
      }
    }

    // 1. VIEW SWITCHER (POST, HTML, BOTH)
    function setViewMode(mode) {
      currentViewMode = mode;
      window.currentViewMode = mode;
      
      const btnPost = document.getElementById('btnViewPost');
      const btnHtml = document.getElementById('btnViewHtml');
      const btnBoth = document.getElementById('btnViewBoth');

      const wrapperPost = document.getElementById('postViewWrapper');
      const wrapperHtml = document.getElementById('htmlViewWrapper');
      const wrapperBoth = document.getElementById('bothViewWrapper');

      const postVis = document.getElementById('postVisualEditor');
      const htmlEditor = document.getElementById('htmlCodeEditor');
      const splitHtml = document.getElementById('splitHtmlEditor');
      const splitPost = document.getElementById('splitPostEditor');

      const activeBtnClass = 'px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 bg-white text-[#C25E3E] shadow-sm border border-[#E5E2D9] cursor-pointer';
      const inactiveBtnClass = 'px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#6E6B63] hover:text-[#1C1B18] transition flex items-center space-x-1.5 bg-transparent border border-transparent cursor-pointer';

      // Reset button styles
      if (btnPost) btnPost.className = inactiveBtnClass;
      if (btnHtml) btnHtml.className = inactiveBtnClass;
      if (btnBoth) btnBoth.className = inactiveBtnClass;

      // Hide all wrappers using explicit style.display
      if (wrapperPost) {
        wrapperPost.style.display = 'none';
        wrapperPost.classList.add('hidden');
      }
      if (wrapperHtml) {
        wrapperHtml.style.display = 'none';
        wrapperHtml.classList.add('hidden');
      }
      if (wrapperBoth) {
        wrapperBoth.style.display = 'none';
        wrapperBoth.classList.add('hidden');
      }

      if (mode === 'post') {
        if (btnPost) btnPost.className = activeBtnClass;
        if (wrapperPost) {
          wrapperPost.style.display = 'block';
          wrapperPost.classList.remove('hidden');
        }
        if (htmlEditor && postVis && htmlEditor.value) {
          postVis.innerHTML = htmlEditor.value;
        }
      } else if (mode === 'html') {
        if (btnHtml) btnHtml.className = activeBtnClass;
        if (wrapperHtml) {
          wrapperHtml.style.display = 'block';
          wrapperHtml.classList.remove('hidden');
        }
        if (postVis && htmlEditor) {
          htmlEditor.value = postVis.innerHTML;
        }
      } else if (mode === 'both') {
        if (btnBoth) btnBoth.className = activeBtnClass;
        if (wrapperBoth) {
          wrapperBoth.style.display = 'block';
          wrapperBoth.classList.remove('hidden');
        }
        const content = (postVis ? postVis.innerHTML : '') || (htmlEditor ? htmlEditor.value : '');
        if (splitHtml) splitHtml.value = content;
        if (splitPost) splitPost.innerHTML = content;
      }
      updateWordCount();
    }
    window.setViewMode = setViewMode;

    function initSyncListeners() {
      const postVis = document.getElementById('postVisualEditor');
      const htmlEditor = document.getElementById('htmlCodeEditor');
      const splitHtml = document.getElementById('splitHtmlEditor');
      const splitPost = document.getElementById('splitPostEditor');

      if (postVis && htmlEditor) {
        postVis.addEventListener('input', () => {
          htmlEditor.value = postVis.innerHTML;
          updateWordCount();
        });
        htmlEditor.addEventListener('input', () => {
          postVis.innerHTML = htmlEditor.value;
          updateWordCount();
        });
      }

      if (splitHtml && splitPost && postVis && htmlEditor) {
        splitHtml.addEventListener('input', () => {
          const val = splitHtml.value;
          splitPost.innerHTML = val;
          htmlEditor.value = val;
          postVis.innerHTML = val;
          updateWordCount();
        });
        splitPost.addEventListener('input', () => {
          const val = splitPost.innerHTML;
          splitHtml.value = val;
          htmlEditor.value = val;
          postVis.innerHTML = val;
          updateWordCount();
        });
      }
    }

    function syncInitialContent() {
      const htmlEditor = document.getElementById('htmlCodeEditor');
      const postVis = document.getElementById('postVisualEditor');
      if (htmlEditor && postVis && htmlEditor.value) {
        postVis.innerHTML = htmlEditor.value;
      }
    }

    function updateWordCount() {
      const editor = document.getElementById('postVisualEditor') || document.getElementById('htmlCodeEditor');
      if (!editor) return;
      const text = editor.innerText || editor.value || '';
      const words = text.trim() ? text.trim().split(/\\s+/).length : 0;
      const badge = document.getElementById('wordCountBadge');
      if (badge) badge.textContent = words + ' words';
    }
    window.updateWordCount = updateWordCount;

    // 2. FEATURED IMAGE DRAG & DROP + WEBP CONVERSION & UNLINK
    function handleDragOver(e) {
      e.preventDefault();
      document.getElementById('dropZone').classList.add('border-[#C25E3E]', 'bg-[#F3F1EC]');
    }

    function handleDragLeave(e) {
      e.preventDefault();
      document.getElementById('dropZone').classList.remove('border-[#C25E3E]', 'bg-[#F3F1EC]');
    }

    function handleDrop(e) {
      e.preventDefault();
      document.getElementById('dropZone').classList.remove('border-[#C25E3E]', 'bg-[#F3F1EC]');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processImageFileToWebp(e.dataTransfer.files[0]);
      }
    }

    function handleFileSelect(e) {
      if (e.target.files && e.target.files[0]) {
        processImageFileToWebp(e.target.files[0]);
      }
    }

    function processImageFileToWebp(file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          // Scale down if larger than 1600px width
          const maxWidth = 1600;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to clean WebP
          const webpDataUrl = canvas.toDataURL('image/webp', 0.88);
          setImagePreview(webpDataUrl);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }

    function setImagePreview(url) {
      document.getElementById('imageInput').value = url;
      document.getElementById('imagePreviewImg').src = url;
      document.getElementById('dropZoneEmpty').classList.add('hidden');
      document.getElementById('dropZonePreview').classList.remove('hidden');
    }

    function removeImage() {
      document.getElementById('imageInput').value = '';
      document.getElementById('imagePreviewImg').src = '';
      document.getElementById('dropZonePreview').classList.add('hidden');
      document.getElementById('dropZoneEmpty').classList.remove('hidden');
    }

    function unlinkAndCleanImage() {
      let current = document.getElementById('imageInput').value;
      if (!current) {
        alert('No image to clean');
        return;
      }
      try {
        // If it is a URL, strip query params & tracking
        if (current.startsWith('http')) {
          const parsed = new URL(current);
          current = parsed.origin + parsed.pathname;
          document.getElementById('imageInput').value = current;
          document.getElementById('imagePreviewImg').src = current;
        }
      } catch (e) {}
      alert('✓ Image successfully unlinked from external site and sanitized!');
    }

    // 3. AI POPUP MODAL & 15 TK SUMMARY STYLES SELECTOR
    function openAiModal() {
      const modal = document.getElementById('aiModal');
      const backdrop = document.getElementById('aiModalBackdrop');
      if (backdrop) {
        backdrop.style.display = 'block';
        backdrop.classList.remove('hidden');
      }
      if (modal) {
        modal.style.display = 'flex';
        modal.classList.remove('hidden');
      }
      document.body.style.overflow = 'hidden';
    }
    window.openAiModal = openAiModal;

    function closeAiModal() {
      const modal = document.getElementById('aiModal');
      const backdrop = document.getElementById('aiModalBackdrop');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
      }
      if (backdrop) {
        backdrop.style.display = 'none';
        backdrop.classList.add('hidden');
      }
      document.body.style.overflow = '';
    }
    window.closeAiModal = closeAiModal;

    function getActiveEditorContent() {
      if (currentViewMode === 'html') {
        return document.getElementById('htmlCodeEditor').value;
      } else if (currentViewMode === 'both') {
        return document.getElementById('splitPostEditor').innerHTML || document.getElementById('splitHtmlEditor').value;
      } else {
        return document.getElementById('postVisualEditor').innerHTML || document.getElementById('htmlCodeEditor').value;
      }
    }

    function setAllEditorContent(newContent) {
      document.getElementById('htmlCodeEditor').value = newContent;
      document.getElementById('postVisualEditor').innerHTML = newContent;
      document.getElementById('splitHtmlEditor').value = newContent;
      document.getElementById('splitPostEditor').innerHTML = newContent;
      updateWordCount();
    }

    function applyFreePreset(preset) {
      var content = getActiveEditorContent();
      if (!content || content.trim().length < 5) {
        alert('Please enter or fetch an article first!');
        return;
      }

      // Strip existing .tk-summary-box to prevent duplicates
      var clean = content.replace(/<div class="[^"]*tk-summary-box[^"]*"[\s\S]*?<\/div>/gi, "")
                         .replace(/<blockquote class="[^"]*tk-summary-box[^"]*"[\s\S]*?<\/blockquote>/gi, "")
                         .trim();

      var styledBox = '';
      if (preset === 'wire') {
        styledBox = '<div class="tk-summary-box my-4 p-3.5 rounded-xl bg-[#F8F7F3] border border-[#EAE8E1] text-xs font-mono text-[#1C1B18]"><span class="font-bold text-[#C25E3E]">WASHINGTON (AP) —</span> Essential facts delivered upfront with strict wire attribution and neutral framing.</div>';
      } else if (preset === 'feature') {
        styledBox = '<div class="tk-summary-box my-5 p-4 rounded-2xl bg-[#F8F7F3] border-l-4 border-[#C25E3E] italic text-[#1C1B18]">"A defining moment that challenges established wisdom and paves new territory."</div>';
      } else if (preset === 'explainer') {
        styledBox = '<div class="tk-summary-box my-4 p-4 rounded-2xl bg-sky-50/80 border-l-4 border-sky-600 text-[#1C1B18]"><strong class="text-sky-800 block mb-1">Why it matters:</strong><p class="text-xs text-[#4A4742]">Key developments that directly reshape the current environment.</p></div>';
      } else if (preset === 'breaking') {
        styledBox = '<div class="tk-summary-box my-4 p-4 rounded-2xl bg-red-50/90 border-2 border-red-600 text-red-950"><strong class="text-red-700 uppercase tracking-widest block mb-1">🚨 BREAKING BULLETIN:</strong><p class="text-xs text-[#4A4742]">Developing story unfolding in real time with continuous verification.</p></div>';
      } else if (preset === 'newsletter') {
        styledBox = '<div class="tk-summary-box my-4 p-4 rounded-2xl bg-purple-50/80 border-l-4 border-purple-500 text-xs text-purple-950 space-y-1.5"><p class="font-bold text-purple-800">Good morning ☕ — Here is everything you need to know today:</p><p class="text-[#4A4742]">We broke down the complete story before you start your day, served in quick, punchy takeaways.</p></div>';
      } else if (preset === 'tabloid') {
        styledBox = '<div class="tk-summary-box my-4 p-4 rounded-2xl bg-amber-50/90 border-2 border-amber-500 text-center text-amber-950"><h3 class="text-xs font-black text-amber-800 uppercase mb-1">🔥 BOMBSHELL REVELATION 🔥</h3><p class="text-xs text-[#4A4742]">Shocking new details emerge regarding today unexpectedly!</p></div>';
      } else if (preset === 'listicle') {
        styledBox = '<div class="tk-summary-box my-4 p-4 rounded-2xl bg-rose-50 border-l-4 border-rose-500 text-rose-950"><strong class="text-rose-800 block mb-1">Key Takeaways at a Glance:</strong><ul class="list-disc list-inside text-xs text-[#4A4742] space-y-1"><li>Point 1: Primary institutional announcement.</li><li>Point 2: Core immediate impacts.</li><li>Point 3: Next phase timelines.</li></ul></div>';
      } else if (preset === 'broadsheet') {
        styledBox = '<div class="tk-summary-box my-4 py-2 border-b border-[#EAE8E1] font-serif italic text-xs text-[#6E6B63]">By Special Correspondent • Published in Washington, D.C.</div>';
      }

      var formatted = clean;
      if (formatted.includes('</p>')) {
        formatted = formatted.replace('</p>', '</p>\n' + styledBox + '\n');
      } else {
        formatted = styledBox + '\n' + formatted;
      }

      setAllEditorContent(formatted);
      closeAiModal();
      alert('✓ Applied ' + preset.toUpperCase() + ' preset cleanly into editor!');
    }


    async function fetchArticleFromLink() {
      const url = document.getElementById('fetchUrlInput').value.trim();
      if (!url) {
        alert('Please enter a valid news link URL');
        return;
      }

      const btn = document.getElementById('btnFetchUrl');
      btn.innerHTML = '<span>🌀 Fetching...</span>';
      btn.disabled = true;

      try {
        const res = await fetch('/api/ai/fetch-article', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        const data = await res.json();

        if (data.success) {
          fetchedArticleData = data;
          document.getElementById('fetchedTitlePreview').textContent = data.title;
          document.getElementById('fetchedSummaryPreview').textContent = data.summary;
          if (data.image) {
            document.getElementById('fetchedThumbImg').src = data.image;
            document.getElementById('fetchedThumbImg').classList.remove('hidden');
            setImagePreview(data.image);
          } else {
            document.getElementById('fetchedThumbImg').classList.add('hidden');
          }
          document.getElementById('fetchStatsBadge').textContent = 'Content & Image Ready';
          document.getElementById('fetchPreviewBox').classList.remove('hidden');

          // AUTO-INJECT DIRECTLY INTO EDITOR
          document.getElementById('titleInput').value = data.title;
          if (data.summary) {
            document.getElementById('summaryInput').value = data.summary;
          }
          const content = data.content;
          document.getElementById('htmlCodeEditor').value = content;
          document.getElementById('postVisualEditor').innerHTML = content;
          document.getElementById('splitHtmlEditor').value = content;
          document.getElementById('splitPostEditor').innerHTML = content;
          updateWordCount();
        } else {
          alert('Fetch error: ' + (data.error || 'Failed to scrape article'));
        }
      } catch (e) {
        alert('Network error fetching article: ' + e.message);
      } finally {
        btn.innerHTML = '<span>⚡ Fetch Article & Image</span>';
        btn.disabled = false;
      }
    }

    async function executeAiProcess(mode) {
      const apiKey = document.getElementById('geminiApiKey')?.value?.trim() || '';

      // If translate_khmer, Gemini API key is required
      if (mode === 'translate_khmer' && !apiKey) {
        openAiModal();
        switchTkTab('ai');
        const keyInput = document.getElementById('geminiApiKey');
        if (keyInput) keyInput.focus();
        alert('សូមបញ្ចូល Google Gemini API Key (ឥតគិតថ្លៃ) ក្នុងប្រអប់ TK Summary AI ជាមុនសិន ដើម្បីឱ្យប្រព័ន្ធ AI អាចបកប្រែជាភាសាខ្មែរបាន!');
        return;
      }

      let content = getActiveEditorContent();
      let title = document.getElementById('titleInput')?.value?.trim() || '';

      const isPlaceholder = !content || content === '<p><br></p>' || content === '<br>' || content.includes('Start drafting your news story');

      if (isPlaceholder && fetchedArticleData && fetchedArticleData.content) {
        content = fetchedArticleData.content;
      }
      if (!title && fetchedArticleData && fetchedArticleData.title) {
        title = fetchedArticleData.title;
      }

      if (!title && !content) {
        alert('Please enter a link to fetch first, or type a headline & content in the editor!');
        return;
      }

      const targetWords = parseInt(document.getElementById('aiTargetWords')?.value) || 500;
      const injectTarget = document.getElementById('aiInjectTarget')?.value || 'both';
      const cleanImage = document.getElementById('aiCleanImageCheckbox')?.checked ?? true;

      const activeStyle = window.currentSelectedStyle || currentSelectedStyle || 'cnn';

      // Show processing banner & open modal if not already open
      openAiModal();
      const stateBox = document.getElementById('aiProcessingState');
      const stateText = document.getElementById('aiProcessingText');
      if (stateBox) stateBox.classList.remove('hidden');
      if (stateText) {
        if (mode === 'translate_khmer') {
          stateText.textContent = 'កំពុងបកប្រែអត្ថបទទាំងមូលជាភាសាខ្មែរដោយ AI Gemini...';
        } else if (mode === 'format') {
          stateText.textContent = 'Reformatting into ' + activeStyle.toUpperCase() + ' style (preserving original words)...';
        } else {
          stateText.textContent = 'Rewriting into ' + activeStyle.toUpperCase() + ' style using Gemini AI...';
        }
      }

      try {
        const res = await fetch('/api/ai/format-or-rewrite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey,
            mode,
            style: activeStyle,
            title,
            content,
            targetWords
          })
        });

        const data = await res.json();
        if (data.success) {
          // Inject Title & Summary
          if (data.title) {
            document.getElementById('titleInput').value = data.title;
          }
          if (data.summary) {
            document.getElementById('summaryInput').value = data.summary;
          }

          // Handle Image Injection
          if (fetchedArticleData && fetchedArticleData.image) {
            let imgUrl = fetchedArticleData.image;
            if (cleanImage) {
              try {
                const parsed = new URL(imgUrl);
                imgUrl = parsed.origin + parsed.pathname;
              } catch(e) {}
            }
            setImagePreview(imgUrl);
          }

          // Inject Content to selected view
          const formattedHtml = data.formatted_html;
          setAllEditorContent(formattedHtml);

          // Switch view if requested
          if (injectTarget === 'post') setViewMode('post');
          else if (injectTarget === 'html') setViewMode('html');
          else if (injectTarget === 'both') setViewMode('both');

          closeAiModal();
          alert(mode === 'translate_khmer'
            ? '🇰🇭 បានបកប្រែអត្ថបទជាភាសាខ្មែរដោយជោគជ័យ!'
            : ('✓ Successfully formatted into ' + activeStyle.toUpperCase() + ' news style into ' + injectTarget.toUpperCase() + ' view!'));
        } else {
          alert('TK Summary error: ' + (data.error || 'Failed to process'));
        }
      } catch (e) {
        alert('Network error: ' + e.message);
      } finally {
        if (stateBox) stateBox.classList.add('hidden');
      }
    }

    async function aiFormatCurrent(style) {
      if (typeof window.selectStyle === 'function') {
        window.selectStyle(style);
      } else {
        currentSelectedStyle = style;
      }
      await executeAiProcess('format');
    }

    async function aiKhmerTranslate() {
      await executeAiProcess('translate_khmer');
    }

    function toggleTagsSection() {
      const check = document.getElementById('enableTagsCheck');
      const box = document.getElementById('tagsInputBox');
      if (check && box) {
        if (check.checked) {
          box.classList.remove('hidden');
          box.classList.add('block');
        } else {
          box.classList.add('hidden');
          box.classList.remove('block');
        }
      }
    }

    // Save and deploy
    async function saveAndDeploy(status) {
      if (!status) status = 'published';
      const saveBtn = document.getElementById('saveBtn');
      const draftBtn = document.getElementById('draftBtn');
      const originalSaveHtml = saveBtn ? saveBtn.innerHTML : '';
      const originalDraftHtml = draftBtn ? draftBtn.innerHTML : '';

      if (status === 'published' && saveBtn) {
        saveBtn.innerHTML = '🚀 Publishing...';
      } else if (status === 'draft' && draftBtn) {
        draftBtn.innerHTML = '💾 Saving...';
      }

      const enableTags = document.getElementById('enableTagsCheck') && document.getElementById('enableTagsCheck').checked;
      const tagsValue = enableTags ? document.getElementById('tagsInput').value.trim() : '';

      const payload = {
        id: postId,
        title: document.getElementById('titleInput').value.trim() || 'Untitled Article',
        slug: document.getElementById('slugInput').value.trim(),
        summary: document.getElementById('summaryInput').value.trim(),
        content: document.getElementById('htmlCodeEditor').value || document.getElementById('postVisualEditor').innerHTML,
        category_id: parseInt(document.getElementById('categoryInput').value),
        featured_image: document.getElementById('imageInput').value,
        author_name: document.getElementById('authorInput').value.trim() || 'Editorial Staff',
        read_time: document.getElementById('readTimeInput').value.trim() || '4 min read',
        tags: tagsValue,
        is_breaking: document.getElementById('isBreakingInput').checked,
        status: status
      };

      try {
        const res = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.success) {
          await fetch('/api/cloudflare/purge', { method: 'POST' }).catch(function(){});
          if (saveBtn && status === 'published') {
            saveBtn.innerHTML = '✅ Published!';
          }
          if (draftBtn && status === 'draft') {
            draftBtn.innerHTML = '✅ Draft Saved!';
          }
          setTimeout(function() {
            window.location.href = '/admin';
          }, 600);
        } else {
          alert('Failed to save story: ' + (data.error || 'Unknown error'));
          if (saveBtn) saveBtn.innerHTML = originalSaveHtml;
          if (draftBtn) draftBtn.innerHTML = originalDraftHtml;
        }
      } catch (err) {
        alert('Network error saving story: ' + err.message);
        if (saveBtn) saveBtn.innerHTML = originalSaveHtml;
        if (draftBtn) draftBtn.innerHTML = originalDraftHtml;
      }
    }

    // Explicitly bind all editor functions to window for 100% reliable HTML onclick execution
    if (typeof switchTkTab !== 'undefined') window.switchTkTab = switchTkTab;
    if (typeof selectStyle !== 'undefined') window.selectStyle = selectStyle;
    window.applyFreePreset = applyFreePreset;
    window.fetchArticleFromLink = fetchArticleFromLink;
    window.executeAiProcess = executeAiProcess;
    window.aiFormatCurrent = aiFormatCurrent;
    window.aiKhmerTranslate = aiKhmerTranslate;
    window.saveAndDeploy = saveAndDeploy;
    window.saveGeminiKey = saveGeminiKey;
    window.promptAddNewCategory = promptAddNewCategory;
    window.copyShortLink = copyShortLink;
    window.copyAllShortLinks = copyAllShortLinks;
    window.generateShortLinks = generateShortLinks;
    window.loadShortLinks = loadShortLinks;
    window.unlinkAndCleanImage = unlinkAndCleanImage;
    window.removeImage = removeImage;
    window.toggleTagsSection = toggleTagsSection;
    window.handleDragOver = handleDragOver;
    window.handleDragLeave = handleDragLeave;
    window.handleDrop = handleDrop;
    window.handleFileSelect = handleFileSelect;
    window.processImageFileToWebp = processImageFileToWebp;
    window.setImagePreview = setImagePreview;
  </script>
</body>
</html>`);
};

adminRouter.get("/new", renderEditor);
adminRouter.get("/edit/:id", renderEditor);
