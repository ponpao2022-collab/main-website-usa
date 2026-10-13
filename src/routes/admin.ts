import { Hono } from "hono";
import { db } from "../db/index";

export const adminRouter = new Hono();

// ADMIN DASHBOARD
adminRouter.get("/", (c) => {
  const posts = db.query(`
    SELECT p.*, c.name as category_name 
    FROM posts p 
    LEFT JOIN categories c ON p.category_id = c.id 
    ORDER BY p.id DESC
  `).all() as any[];

  const categories = db.query("SELECT * FROM categories ORDER BY id ASC").all() as any[];
  const totalViews = posts.reduce((acc, p) => acc + (p.views || 0), 0);
  const breakingCount = posts.filter(p => p.is_breaking === 1).length;

  return c.html(`<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NextGen Newsroom CMS - Dashboard</title>
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
  </style>
</head>
<body class="bg-slate-950 text-slate-100 font-sans antialiased min-h-screen flex flex-col selection:bg-indigo-500 selection:text-white">

  <!-- Top Header -->
  <header class="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-50">
    <div class="flex items-center space-x-3">
      <img src="/assets/logo-sm.webp" class="h-9 w-9 rounded-full object-contain shadow-md shadow-indigo-500/20" alt="USA NEWS STORY">
      <div>
        <div class="flex items-center space-x-2">
          <span class="font-bold text-base tracking-wide">USA NEWS STORY CMS</span>
          <span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">Newsroom Panel</span>
        </div>
      </div>
    </div>

    <!-- Right Controls -->
    <div class="flex items-center space-x-4">
      <div class="hidden sm:flex items-center space-x-2 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1 rounded-full text-xs text-emerald-300">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-slow"></span>
        <span class="font-mono text-[11px]">Cloudflare Edge: 100% Operational (24ms)</span>
      </div>

      <a href="/" target="_blank" class="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center space-x-1.5 transition">
        <span>View Live Site</span>
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
      </a>

      <a href="/admin/new" class="px-4 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-500 to-rose-500 hover:from-indigo-400 hover:to-rose-400 text-white shadow-md shadow-indigo-500/25 flex items-center space-x-1.5 transition">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        <span>Write New Story</span>
      </a>
    </div>
  </header>

  <!-- Main Container -->
  <div class="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">
    
    <!-- Stats Row (5 Cards) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      
      <!-- Whos.amung.us Realtime Live Readers Card -->
      <div class="bg-gradient-to-b from-slate-900 to-emerald-950/30 border border-emerald-500/40 p-5 rounded-2xl relative overflow-hidden shadow-lg shadow-emerald-950/20">
        <div class="flex items-center justify-between mb-1">
          <div class="text-xs font-bold uppercase tracking-wider text-emerald-400">Live Readers Now</div>
          <span class="relative flex h-2.5 w-2.5">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
        </div>
        <div id="liveOnlineCount" class="text-3xl font-extrabold text-emerald-400 font-mono">0</div>
        <div class="text-[11px] text-emerald-400/80 mt-2 font-mono flex items-center space-x-1">
          <span>📡</span>
          <span>Whos.amung.us Realtime</span>
        </div>
      </div>

      <div class="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
        <div class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Total Stories</div>
        <div class="text-3xl font-extrabold text-white">${posts.length}</div>
        <div class="text-[11px] text-emerald-400 mt-2">Active in SQLite VPS</div>
      </div>

      <div class="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
        <div class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Breaking News Active</div>
        <div class="text-3xl font-extrabold text-rose-400">${breakingCount}</div>
        <div class="text-[11px] text-rose-400/80 mt-2">Showing on Top Marquee</div>
      </div>

      <div class="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
        <div class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Global Pageviews</div>
        <div class="text-3xl font-extrabold text-indigo-400">${totalViews.toLocaleString()}</div>
        <div class="text-[11px] text-indigo-400/80 mt-2">Real Visitors Tracked Live</div>
      </div>

      <div class="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
        <div>
          <div class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Cloudflare Edge Purge</div>
          <div class="text-xs text-slate-400">Purge cache across 310+ PoPs</div>
        </div>
        <button onclick="purgeCache(this)" class="w-full mt-3 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-emerald-300 flex items-center justify-center space-x-1.5 transition">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          <span>Instant Cache Purge</span>
        </button>
      </div>
    </div>

    <!-- Whos.amung.us Real-Time Active Readers Breakdown -->
    <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <div class="flex items-center space-x-2.5">
          <span class="relative flex h-3 w-3">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <h3 class="font-bold text-sm text-white flex items-center space-x-1.5">
            <span>Whos.amung.us Live Readers Tracker</span>
            <span class="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">Auto-refresh 3s</span>
          </h3>
        </div>
        <div class="text-xs text-slate-400 font-mono">
          <span id="activePagesSummary">0 pages currently active</span>
        </div>
      </div>

      <div id="activePagesList" class="space-y-2">
        <div class="text-xs text-slate-500 italic py-2 text-center">
          Waiting for live readers to connect... (Open the website in another tab or mobile phone to see real-time tracking)
        </div>
      </div>
    </div>

    <!-- Posts Table -->
    <div class="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div class="p-5 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 class="font-bold text-lg text-white">Articles & News Feed</h2>
          <p class="text-xs text-slate-400">Manage, edit, or toggle Breaking News banner in real-time</p>
        </div>
        <div class="flex items-center space-x-2.5">
          <button type="button" onclick="openCategoriesModal()" class="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center space-x-1.5">
            <svg class="w-3.5 h-3.5 text-[#D97757]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
            <span>📁 Categories (${categories.length})</span>
          </button>
          <a href="/admin/new" class="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition flex items-center space-x-1 font-bold">
            <span>+ New Article</span>
          </a>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase font-semibold">
            <tr>
              <th class="py-3 px-5">Headline & Article</th>
              <th class="py-3 px-4">Category</th>
              <th class="py-3 px-4">Author</th>
              <th class="py-3 px-4 text-center">Breaking?</th>
              <th class="py-3 px-4 text-center">Views</th>
              <th class="py-3 px-6 text-center">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/80 text-slate-300">
            ${posts.length === 0 ? `
              <tr>
                <td colspan="6" class="text-center py-12 text-slate-500">
                  <div class="text-sm font-semibold text-slate-400 mb-1">No articles in database</div>
                  <div class="text-xs text-slate-500 mb-4">Old mock data has been cleanly deleted. Start fresh by creating a new article!</div>
                  <a href="/admin/new" class="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs inline-flex items-center space-x-1.5 transition">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                    <span>+ Publish First Story</span>
                  </a>
                </td>
              </tr>
            ` : posts.map(p => `
              <tr class="hover:bg-slate-800/40 transition">
                <td class="py-4 px-5">
                  <div class="flex items-center space-x-3">
                    ${p.featured_image ? `<img src="${p.featured_image}" class="w-12 h-12 rounded-lg object-cover flex-shrink-0">` : ''}
                    <div>
                      <a href="/admin/edit/${p.id}" class="font-bold text-slate-100 hover:text-indigo-400 text-sm line-clamp-1">
                        ${p.title}
                      </a>
                      <div class="text-[11px] text-slate-500 mt-0.5">/article/${p.slug}</div>
                    </div>
                  </div>
                </td>
                <td class="py-4 px-4">
                  <span class="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300">
                    ${p.category_name || 'General'}
                  </span>
                </td>
                <td class="py-4 px-4 font-medium text-slate-300">${p.author_name}</td>
                <td class="py-4 px-4 text-center">
                  ${p.is_breaking === 1 ? `
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
                      BREAKING
                    </span>` : `
                    <span class="text-slate-600 text-[11px]">-</span>`}
                </td>
                <td class="py-4 px-4 text-center font-mono">
                  <span class="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-indigo-950/40 text-indigo-300 border border-indigo-500/20 text-xs font-semibold">
                    <svg class="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    <span>${p.views.toLocaleString()}</span>
                  </span>
                </td>
                <td class="py-4 px-6 text-center whitespace-nowrap">
                  <div class="inline-flex items-center space-x-1.5 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800">
                    <a href="/article/${p.slug}" target="_blank" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1 transition shadow-sm" title="View live article">
                      <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                      <span>View</span>
                    </a>
                    <a href="/admin/edit/${p.id}" class="px-2.5 py-1.5 rounded-lg bg-indigo-600/25 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center space-x-1 transition shadow-sm" title="Edit story">
                      <svg class="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                      <span>Edit</span>
                    </a>
                    <button type="button" onclick="deletePost(${p.id})" class="px-2.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/35 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center space-x-1 transition shadow-sm cursor-pointer" title="Delete story">
                      <svg class="w-3.5 h-3.5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      <span>Delete</span>
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

  <!-- Floating TK Summary Mascot Trigger Button (Bottom Right) -->
  <a href="/admin/new" class="fixed right-6 bottom-6 z-50 flex items-center group cursor-pointer select-none">
    <div class="mr-3 px-3.5 py-1.5 rounded-2xl bg-slate-900/95 border border-blue-500/40 text-xs font-bold text-blue-300 shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0 pointer-events-none flex items-center space-x-2">
      <span class="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
      <span>Create with TK Summary AI</span>
    </div>
    <div class="relative w-16 h-16 sm:w-20 sm:h-20 drop-shadow-2xl transition-transform duration-300 group-hover:scale-110 active:scale-95">
      <img src="/assets/tk-mascot.webp" class="w-full h-full object-contain group-hover:hidden transition-all duration-200 filter drop-shadow-[0_10px_20px_rgba(8,124,218,0.45)]" alt="TK Summary" fetchpriority="high" loading="eager" width="80" height="89">
      <img src="/assets/tk-mascot-happy.webp" class="w-full h-full object-contain hidden group-hover:block transition-all duration-200 filter drop-shadow-[0_12px_26px_rgba(8,124,218,0.7)] animate-bounce" alt="TK Summary Happy" loading="eager" width="80" height="89">
    </div>
  </a>

  <!-- Manage Categories Modal -->
  <div id="catModal" class="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm hidden flex items-center justify-center p-4">
    <div class="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <div class="flex items-center space-x-2">
          <span class="text-base font-bold text-white">📁 Manage News Categories</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300">${categories.length} active</span>
        </div>
        <button onclick="closeCategoriesModal()" class="text-slate-400 hover:text-white text-lg font-bold px-2">&times;</button>
      </div>

      <!-- Add New Category Form -->
      <form onsubmit="handleCreateCategory(event)" class="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3">
        <span class="text-xs font-bold text-slate-300 uppercase tracking-wider block">+ Add New Category</span>
        <div class="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div class="sm:col-span-8">
            <input type="text" id="newCatName" required placeholder="Category Name (e.g. World, Politics, Sports)" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500">
          </div>
          <div class="sm:col-span-4 flex items-center space-x-2">
            <input type="color" id="newCatColor" value="#c25e3e" class="w-9 h-9 rounded-xl border border-slate-700 bg-slate-900 cursor-pointer p-0.5 flex-shrink-0" title="Badge Color">
            <button type="submit" id="addCatBtn" class="flex-1 py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition">Add</button>
          </div>
        </div>
      </form>

      <!-- Existing Categories List -->
      <div class="space-y-2 max-h-60 overflow-y-auto pr-1">
        <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Current Categories:</span>
        <div class="space-y-1.5" id="categoriesListContainer">
          ${categories.map(cat => `
            <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80">
              <div class="flex items-center space-x-2.5">
                <span class="w-3.5 h-3.5 rounded-full flex-shrink-0" style="background-color: ${cat.color}"></span>
                <span class="font-bold text-xs text-white">${cat.name}</span>
                <span class="text-[11px] font-mono text-slate-500">/${cat.slug}</span>
              </div>
              ${categories.length > 1 ? `
                <button type="button" onclick="deleteCategory(${cat.id})" class="text-rose-400 hover:text-rose-300 text-xs px-2 py-0.5 rounded hover:bg-rose-500/10 transition">Delete</button>
              ` : `
                <span class="text-[10px] text-slate-500">Default (Protected)</span>
              `}
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  </div>

  <script>
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

    async function deletePost(id) {
      if (!confirm('Are you sure you want to delete this story?')) return;
      const res = await fetch('/api/posts/' + id, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        window.location.reload();
      }
    }

    // Whos.amung.us Real-Time Live Readers Polling Engine
    async function pollLiveVisitors() {
      try {
        const res = await fetch('/api/track/live');
        const data = await res.json();
        const countEl = document.getElementById('liveOnlineCount');
        if (countEl) countEl.innerText = String(data.totalOnline || 0);
        
        const summaryEl = document.getElementById('activePagesSummary');
        if (summaryEl) {
          const len = (data.activePages || []).length;
          summaryEl.innerText = len + ' active ' + (len === 1 ? 'page' : 'pages');
        }

        const listEl = document.getElementById('activePagesList');
        if (listEl) {
          if (!data.activePages || data.activePages.length === 0) {
            listEl.innerHTML = '<div class="text-xs text-slate-500 italic py-2 text-center">No active readers at this exact moment. Open the site in a tab or on phone to see live tracking!</div>';
          } else {
            listEl.innerHTML = data.activePages.map(function(p) {
              return '<div class="flex items-center justify-between py-2 px-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition text-xs">' +
                '<div class="flex items-center space-x-2.5 truncate mr-3">' +
                  '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0"></span>' +
                  '<a href="' + p.path + '" target="_blank" class="text-slate-200 hover:text-indigo-300 truncate font-medium">' +
                    (p.title || p.path) +
                  '</a>' +
                  '<span class="text-slate-500 font-mono text-[10px] hidden sm:inline">(' + p.path + ')</span>' +
                '</div>' +
                '<span class="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/30 flex-shrink-0 flex items-center space-x-1">' +
                  '<span>🟢</span>' +
                  '<span>' + p.count + ' ' + (p.count === 1 ? 'reader' : 'readers') + ' online</span>' +
                '</span>' +
              '</div>';
            }).join('');
          }
        }
      } catch(e) {}
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
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${post ? 'Edit Story' : 'New Story'} | NextGen Newsroom CMS</title>
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
    .style-card.selected { border-color: #6366f1; background-color: rgba(99, 102, 241, 0.15); ring: 2px; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 font-sans antialiased min-h-screen selection:bg-indigo-500 selection:text-white relative">

  <!-- Top Navigation Bar -->
  <header class="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-30">
    <div class="flex items-center space-x-3">
      <a href="/admin" class="text-slate-400 hover:text-white transition flex items-center space-x-1 text-xs">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        <span>Dashboard</span>
      </a>
      <span class="text-slate-700">|</span>
      <span class="font-bold text-xs uppercase tracking-wider text-slate-300">${post ? 'Edit Story #' + post.id : 'Drafting New Story'}</span>
    </div>

    <!-- Active Collaborators & Actions -->
    <div class="flex items-center space-x-4">
      <div class="flex items-center -space-x-2">
        <div class="w-7 h-7 rounded-full bg-indigo-600 border-2 border-slate-900 flex items-center justify-center text-xs font-semibold" title="You (Lead Editor)">You</div>
        <div class="w-7 h-7 rounded-full bg-purple-600 border-2 border-slate-900 flex items-center justify-center text-xs font-semibold" title="Dara (Reporter)">DR</div>
        <div class="w-7 h-7 rounded-full bg-amber-600 border-2 border-slate-900 flex items-center justify-center text-xs font-semibold" title="Sarah (Fact-checker)">SJ</div>
      </div>

      <button onclick="openAiModal()" type="button" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 flex items-center space-x-1.5 transition">
        <img src="/assets/tk-mascot.webp" class="w-4 h-4 object-contain" alt="TK" loading="eager" width="16" height="16">
        <span>TK Summary AI</span>
      </button>

      <button onclick="saveAndDeploy('draft')" id="draftBtn" type="button" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center space-x-1.5 transition">
        <span>💾 Save Draft</span>
      </button>

      <button onclick="saveAndDeploy('published')" id="saveBtn" type="button" class="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/25 flex items-center space-x-1.5 transition">
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
        <textarea id="titleInput" rows="2" class="w-full bg-transparent text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white placeholder-slate-600 focus:outline-none resize-none leading-tight" placeholder="Enter article headline...">${post ? post.title : ''}</textarea>
        <input type="text" id="summaryInput" class="w-full bg-transparent text-base text-slate-400 placeholder-slate-600 focus:outline-none mt-2 font-normal" placeholder="Add an executive summary or subtitle..." value="${post ? post.summary : ''}">
      </div>

      <!-- Slug & Autosave status bar -->
      <div class="flex flex-wrap items-center justify-between border-y border-slate-800/80 py-2.5 text-xs text-slate-400 gap-2">
        <div class="flex items-center space-x-2">
          <span>Slug:</span>
          <input type="text" id="slugInput" class="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-slate-300 font-mono text-[11px] focus:outline-none focus:border-indigo-500" placeholder="auto-slug" value="${post ? post.slug : ''}">
        </div>
        <div class="flex items-center space-x-3">
          <span id="wordCountBadge" class="font-mono text-indigo-400">0 words</span>
          <span>•</span>
          <div class="flex items-center space-x-1 text-slate-500">
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Autosaved to VPS SQLite</span>
          </div>
        </div>
      </div>

      <!-- VIEW SELECTOR BAR (HTML View, Post View, Both View) -->
      <div class="flex items-center justify-between bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl shadow-lg">
        <div class="flex items-center space-x-1">
          <button type="button" onclick="setViewMode('post')" id="btnViewPost" class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
            <span>📝 Post View</span>
          </button>
          <button type="button" onclick="setViewMode('html')" id="btnViewHtml" class="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition flex items-center space-x-1.5">
            <span>&lt;/&gt; HTML View</span>
          </button>
          <button type="button" onclick="setViewMode('both')" id="btnViewBoth" class="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition flex items-center space-x-1.5">
            <span>◫ Both View (Split)</span>
          </button>
        </div>

        <div class="flex items-center space-x-2 text-xs">
          <button type="button" onclick="aiFormatCurrent('cnn')" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-[11px]">
            ⚡ Quick CNN Format
          </button>
          <button type="button" onclick="aiKhmerTranslate()" class="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition text-[11px]">
            🇰🇭 បកប្រែខ្មែរ
          </button>
        </div>
      </div>

      <!-- EDITOR WORKSPACES (Post, HTML, Both) -->
      <div id="editorWorkspace" class="space-y-4">
        
        <!-- 1. POST VIEW (WYSIWYG Rich Visual Canvas) -->
        <div id="postViewWrapper" class="block">
          <div class="border border-slate-800 bg-slate-900/40 rounded-2xl p-6 min-h-[380px] focus-within:border-indigo-500/50 transition">
            <div id="postVisualEditor" contenteditable="true" class="prose prose-invert max-w-none text-slate-200 text-base leading-relaxed focus:outline-none min-h-[340px]">
              ${post ? post.content : '<p>Start drafting your news story, or click <strong>AI Importer</strong> to format from any link...</p>'}
            </div>
          </div>
        </div>

        <!-- 2. HTML VIEW (Raw Code Editor) -->
        <div id="htmlViewWrapper" class="hidden">
          <div class="border border-slate-800 bg-slate-900/90 rounded-2xl p-4 focus-within:border-indigo-500/50 transition">
            <textarea id="htmlCodeEditor" rows="18" class="w-full bg-transparent font-mono text-sm text-emerald-300 leading-relaxed focus:outline-none resize-y">${post ? post.content : '<p>Start drafting your news story, or click <strong>AI Importer</strong> to format from any link...</p>'}</textarea>
          </div>
        </div>

        <!-- 3. BOTH VIEW (Split-Screen HTML + Post) -->
        <div id="bothViewWrapper" class="hidden">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Left HTML Code -->
            <div class="border border-slate-800 bg-slate-900/90 rounded-2xl p-4 flex flex-col">
              <div class="text-[11px] font-mono text-slate-400 mb-2 font-bold flex items-center justify-between">
                <span>&lt;/&gt; HTML SOURCE CODE</span>
                <span class="text-indigo-400">Live Sync</span>
              </div>
              <textarea id="splitHtmlEditor" rows="16" class="w-full flex-1 bg-transparent font-mono text-xs text-emerald-300 leading-relaxed focus:outline-none resize-none"></textarea>
            </div>
            <!-- Right Visual Post -->
            <div class="border border-slate-800 bg-slate-900/40 rounded-2xl p-5 overflow-y-auto max-h-[500px]">
              <div class="text-[11px] font-mono text-slate-400 mb-2 font-bold flex items-center justify-between">
                <span>📝 LIVE POST PREVIEW</span>
                <span class="text-emerald-400">60 FPS</span>
              </div>
              <div id="splitPostEditor" contenteditable="true" class="prose prose-invert max-w-none text-slate-200 text-sm leading-relaxed focus:outline-none"></div>
            </div>
          </div>
        </div>

      </div>

    </main>

    <!-- Right Settings Inspector Panel -->
    <aside class="w-80 border-l border-slate-800 bg-slate-900/90 p-5 overflow-y-auto space-y-6">
      
      <!-- Dedicated Publish Action Box -->
      <div class="p-4 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/30 shadow-lg space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-300">Publishing Status</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${post && post.status === 'draft' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}">
            ${post ? (post.status === 'draft' ? 'Draft' : 'Published') : 'New Article'}
          </span>
        </div>
        
        <button type="button" onclick="saveAndDeploy('published')" class="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 transition transform active:scale-95">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          <span>Publish Article Now</span>
        </button>

        <div class="flex items-center space-x-2 pt-1">
          <button type="button" onclick="saveAndDeploy('draft')" class="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-medium transition text-center">
            Save as Draft
          </button>
          ${post ? `
            <a href="/article/${post.slug}" target="_blank" class="py-1.5 px-2.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 text-[11px] font-medium transition text-center">
              View Live
            </a>
          ` : ''}
        </div>
      </div>

      <!-- Breaking News Switch -->
      <div class="flex items-center justify-between p-3.5 rounded-2xl bg-rose-950/20 border border-rose-500/30">
        <div>
          <div class="text-xs font-bold text-rose-300">Mark as Breaking News</div>
          <div class="text-[11px] text-slate-400">Push to top marquee banner</div>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" id="isBreakingInput" ${post && post.is_breaking ? 'checked' : ''} class="sr-only peer">
          <div class="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500"></div>
        </label>
      </div>

      <!-- FEATURED IMAGE DRAG & DROP + WEBP CONVERSION & UNLINK -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="block text-xs font-semibold text-slate-200">Featured Image (Thumbnail)</label>
          <span class="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">WebP Auto</span>
        </div>

        <!-- Drag & Drop Container -->
        <div id="dropZone" 
             ondragover="handleDragOver(event)" 
             ondragleave="handleDragLeave(event)" 
             ondrop="handleDrop(event)" 
             onclick="document.getElementById('fileInput').click()" 
             class="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-4 text-center cursor-pointer transition bg-slate-900/80 hover:bg-slate-800/60 relative group">
          
          <input type="file" id="fileInput" accept="image/*" class="hidden" onchange="handleFileSelect(event)">
          
          <!-- Empty State -->
          <div id="dropZoneEmpty" class="${post && post.featured_image ? 'hidden' : 'block'} py-3">
            <svg class="w-8 h-8 text-slate-500 group-hover:text-indigo-400 mx-auto mb-2 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            <div class="text-xs font-bold text-slate-300">Drag & Drop Image or Click</div>
            <div class="text-[10px] text-slate-500 mt-1">Converts automatically to clean WebP</div>
          </div>

          <!-- Preview State -->
          <div id="dropZonePreview" class="${post && post.featured_image ? 'block' : 'hidden'} relative rounded-xl overflow-hidden group/img">
            <img id="imagePreviewImg" src="${post ? (post.featured_image || '') : ''}" class="w-full h-36 object-cover rounded-lg">
            <div class="absolute inset-0 bg-black/70 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center space-x-2">
              <button type="button" onclick="event.stopPropagation(); unlinkAndCleanImage();" class="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold shadow">Unlink Site</button>
              <button type="button" onclick="event.stopPropagation(); removeImage();" class="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[11px] font-bold shadow">Remove</button>
            </div>
            <div class="absolute bottom-1 right-1 bg-slate-950/90 text-emerald-400 text-[9px] font-mono px-1.5 py-0.5 rounded border border-emerald-500/30">
              WebP Unlinked
            </div>
          </div>
        </div>

        <!-- Raw Image URL / Base64 Storage -->
        <input type="hidden" id="imageInput" value="${post ? (post.featured_image || '') : ''}">
        
        <div class="flex items-center justify-between text-[11px] text-slate-400 pt-1">
          <button type="button" onclick="unlinkAndCleanImage()" class="text-indigo-400 hover:text-indigo-300 underline font-medium">Unlink original post reference</button>
          <span class="text-slate-500">100% Clean</span>
        </div>
      </div>

      <!-- Category Picker with Quick Add -->
      <div>
        <div class="flex items-center justify-between mb-1.5">
          <label class="block text-xs font-semibold text-slate-300">Category</label>
          <button type="button" onclick="promptAddNewCategory()" class="text-[11px] text-[#D97757] hover:underline font-semibold flex items-center space-x-1">
            <span>+ Add New</span>
          </button>
        </div>
        <select id="categoryInput" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500">
          ${categories.map(cat => `
            <option value="${cat.id}" ${post && post.category_id === cat.id ? 'selected' : ''}>${cat.name}</option>
          `).join("")}
        </select>
      </div>

      <!-- Author -->
      <div>
        <label class="block text-xs font-semibold text-slate-300 mb-1.5">Author</label>
        <input type="text" id="authorInput" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500" value="${post ? post.author_name : 'Editorial Staff'}">
      </div>

      <!-- Read Time -->
      <div>
        <label class="block text-xs font-semibold text-slate-300 mb-1.5">Read Time</label>
        <input type="text" id="readTimeInput" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500" value="${post ? post.read_time : '5 min read'}">
      </div>

      <!-- Tags Management (Optional / Customizable) -->
      <div class="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2.5">
        <div class="flex items-center justify-between">
          <label for="enableTagsCheck" class="text-xs font-semibold text-slate-300 cursor-pointer flex items-center space-x-2">
            <span>🏷️ Show Tags on Post</span>
          </label>
          <input type="checkbox" id="enableTagsCheck" onchange="toggleTagsSection()" ${post && post.tags && post.tags.trim() ? 'checked' : ''} class="w-4 h-4 rounded text-indigo-500 bg-slate-800 border-slate-700 focus:ring-0 cursor-pointer">
        </div>
        
        <div id="tagsInputBox" class="${post && post.tags && post.tags.trim() ? 'block' : 'hidden'} space-y-1.5 pt-1">
          <label class="block text-[11px] font-medium text-slate-400">Custom Tags (comma separated)</label>
          <input type="text" id="tagsInput" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono" placeholder="USANews, Politics, Breaking" value="${post && post.tags ? post.tags : ''}">
          <p class="text-[10px] text-slate-500 leading-tight">Separate tags with commas. If unticked or empty, no tags will be displayed.</p>
        </div>
      </div>

      <!-- Cloudflare Edge Webhook Status -->
      <div class="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-xs space-y-1">
        <div class="text-slate-300 font-semibold flex items-center justify-between">
          <span>Edge Webhook:</span>
          <span class="text-emerald-400 font-mono text-[11px]">Enabled</span>
        </div>
        <p class="text-[11px] text-slate-400">On Save, Cloudflare CDN automatically invalidates the cache worldwide in &lt;30ms.</p>
      </div>

    </aside>
  </div>

  <!-- FLOATING TK SUMMARY MASCOT TRIGGER BUTTON (BOTTOM RIGHT) -->
  <div id="tkSummaryFloatingBtn" onclick="openAiModal()" role="button" tabindex="0" class="fixed right-6 bottom-6 z-40 flex items-center group cursor-pointer select-none focus:outline-none">
    <!-- Tooltip Pill -->
    <div class="mr-3 px-3.5 py-1.5 rounded-2xl bg-slate-900/95 border border-blue-500/40 text-xs font-bold text-blue-300 shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0 pointer-events-none flex items-center space-x-2">
      <span class="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
      <span>TK Summary AI</span>
    </div>

    <!-- Character Mascot (Transparent PNG, No Background) -->
    <div class="relative w-16 h-16 sm:w-20 sm:h-20 transition-transform duration-300 group-hover:scale-110 active:scale-95 pointer-events-none">
      <img src="/assets/tk-mascot.webp" class="w-full h-full object-contain group-hover:hidden transition-all duration-200 filter drop-shadow-[0_8px_20px_rgba(8,124,218,0.5)]" alt="TK Summary" fetchpriority="high" loading="eager" width="80" height="89">
      <img src="/assets/tk-mascot-happy.webp" class="w-full h-full object-contain hidden group-hover:block transition-all duration-200 filter drop-shadow-[0_12px_28px_rgba(8,124,218,0.75)] animate-bounce" alt="TK Summary Happy" loading="eager" width="80" height="89">
    </div>
  </div>

  <!-- RIGHT-SIDE TK SUMMARY SLIDE-OUT PANEL (POPUP ON EDITOR) -->
  <div id="aiModal" class="hidden fixed inset-y-0 right-0 z-50 w-full sm:w-[560px] lg:w-[620px] bg-slate-900/95 backdrop-blur-2xl border-l border-slate-700/80 shadow-[-24px_0_60px_rgba(0,0,0,0.7)] flex flex-col transition-all duration-300">
    
    <!-- Drawer Header -->
    <div class="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between flex-shrink-0">
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-1 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
          <img src="/assets/tk-mascot.webp" class="w-full h-full object-contain" alt="TK Summary" loading="eager" width="40" height="40">
        </div>
        <div>
          <div class="flex items-center space-x-2">
            <h2 class="text-sm sm:text-base font-black text-white tracking-wide">TK SUMMARY CLASSIC</h2>
            <span class="px-2 py-0.5 rounded text-[10px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/30">v2.5 AI</span>
          </div>
          <p class="text-[11px] text-slate-400">15 Newsroom Presets • Rule-Based Formatter • WebP Image Studio</p>
        </div>
      </div>
      <button onclick="closeAiModal()" type="button" class="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition" title="Close Panel">✕</button>
    </div>

    <!-- Mode Selector Tabs (AI Styles vs Free Presets) -->
    <div class="px-4 sm:px-6 pt-3 pb-2 bg-slate-950/50 border-b border-slate-800/80 flex items-center space-x-2 flex-shrink-0">
      <button type="button" id="tabAiStyles" onclick="switchTkTab('ai')" class="flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 bg-blue-600 text-white shadow-md shadow-blue-600/30">
        <span>⚡ AI Style Rewrite (15 Presets)</span>
      </button>
      <button type="button" id="tabFreePresets" onclick="switchTkTab('free')" class="flex-1 py-2 px-3 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition flex items-center justify-center space-x-2 bg-slate-800/80">
        <span>🎨 Free Presets (No AI)</span>
      </button>
    </div>

    <!-- Drawer Scrollable Content -->
    <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-slate-100">

      <!-- Gemini API Key Input Bar -->
      <div class="p-3.5 rounded-2xl bg-blue-950/20 border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div class="flex-1">
          <label class="block font-bold text-blue-300 mb-1">Google Gemini API Key (Free):</label>
          <div class="flex items-center space-x-2">
            <input type="password" id="geminiApiKey" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500" placeholder="AIzaSy... (Saved in browser)">
            <button type="button" onclick="saveGeminiKey()" class="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold">Save</button>
          </div>
        </div>
        <div class="text-[11px] text-slate-400 sm:text-right">
          <span>Get Free Key:</span>
          <a href="https://aistudio.google.com/app/apikey" target="_blank" class="text-blue-400 hover:underline block font-semibold">aistudio.google.com &rarr;</a>
        </div>
      </div>

      <!-- TAB 1: AI STYLES & LINK SCRAPER -->
      <div id="tkAiTabContent" class="space-y-6">

        <!-- Step 1: Input URL and Fetch Article -->
        <div class="space-y-2">
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-300">1. Paste Article Post Link:</label>
          <div class="flex items-center space-x-2">
            <input type="url" id="fetchUrlInput" class="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" placeholder="https://edition.cnn.com/... or https://topstoryusa.info/...">
            <button type="button" id="btnFetchUrl" onclick="fetchArticleFromLink()" class="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-600/20 flex items-center space-x-2 transition">
              <span>⚡ Fetch Article & Image</span>
            </button>
          </div>
        </div>

        <!-- Fetched Article Preview Box (Hidden until fetched) -->
        <div id="fetchPreviewBox" class="hidden p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
          <div class="flex items-center justify-between text-emerald-400 font-bold border-b border-slate-800 pb-2">
            <span>✓ Article & Image Successfully Fetched!</span>
            <span id="fetchStatsBadge" class="text-slate-400 font-mono">Ready</span>
          </div>
          <div class="flex gap-4 items-start">
            <img id="fetchedThumbImg" class="w-24 h-24 object-cover rounded-xl border border-slate-800 flex-shrink-0 bg-slate-900">
            <div class="flex-1 min-w-0 space-y-1">
              <h4 id="fetchedTitlePreview" class="font-bold text-white text-sm line-clamp-2"></h4>
              <p id="fetchedSummaryPreview" class="text-slate-400 line-clamp-2 leading-relaxed"></p>
              <div class="flex items-center space-x-3 text-[11px] text-slate-500 pt-1">
                <span class="text-emerald-400 font-mono">✓ Unlinked & Ready for WebP</span>
              </div>
            </div>
          </div>
          <div class="flex items-center justify-between pt-2 border-t border-slate-800/80">
            <span class="text-emerald-300 font-semibold text-xs">✓ Automatically injected into Editor!</span>
            <button type="button" onclick="closeAiModal()" class="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-emerald-600/30 transition">
              <span>📥 View In Editor Now</span>
            </button>
          </div>
        </div>

        <!-- Step 2: Choose from 15 TK Summary Styles (With Real Brand Logos) -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-300">2. Choose Editorial News Style (15 Official Presets):</label>
            <span class="text-[11px] text-blue-400 font-mono" id="selectedStyleBadge">CNN Digital</span>
          </div>
          
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[360px] overflow-y-auto pr-1" id="styleSelectorGrid">
            
            <!-- 1. CNN -->
            <div onclick="selectStyle('cnn')" class="style-card selected border border-slate-800 bg-slate-950/70 p-3 rounded-2xl cursor-pointer hover:border-blue-500 transition space-y-2 flex flex-col justify-between" data-style="cnn">
              <div class="flex items-center space-x-2.5">
                <img src="/assets/styles/cnn.png" class="w-7 h-7 object-contain rounded bg-slate-900 p-0.5 border border-slate-800" alt="CNN">
                <div class="text-left min-w-0">
                  <div class="font-bold text-xs text-white truncate">CNN Digital</div>
                  <div class="text-[10px] text-slate-400 truncate">Editorial News</div>
                </div>
              </div>
              <div class="text-[10px] text-blue-400/90 bg-blue-950/30 px-2 py-0.5 rounded border border-blue-500/20 text-center">5W1H Inverted Lede</div>
            </div>

            <!-- 2. Daily Mail -->
            <div onclick="selectStyle('dailymail')" class="style-card border border-slate-800 bg-slate-950/70 p-3 rounded-2xl cursor-pointer hover:border-blue-500 transition space-y-2 flex flex-col justify-between" data-style="dailymail">
              <div class="flex items-center space-x-2.5">
                <img src="/assets/styles/dailymail.png" class="w-7 h-7 object-contain rounded bg-slate-900 p-0.5 border border-slate-800" alt="Daily Mail">
                <div class="text-left min-w-0">
                  <div class="font-bold text-xs text-white truncate">Daily Mail</div>
                  <div class="text-[10px] text-slate-400 truncate">Tabloid & Drama</div>
                </div>
              </div>
              <div class="text-[10px] text-indigo-400/90 bg-indigo-950/30 px-2 py-0.5 rounded border border-indigo-500/20 text-center">WHAT WE KNOW Box</div>
            </div>

            <!-- 3. Fox News -->
            <div onclick="selectStyle('foxnews')" class="style-card border border-slate-800 bg-slate-950/70 p-3 rounded-2xl cursor-pointer hover:border-blue-500 transition space-y-2 flex flex-col justify-between" data-style="foxnews">
              <div class="flex items-center space-x-2.5">
                <img src="/assets/styles/foxnews.png" class="w-7 h-7 object-contain rounded bg-slate-900 p-0.5 border border-slate-800" alt="Fox News">
                <div class="text-left min-w-0">
                  <div class="font-bold text-xs text-white truncate">Fox News</div>
                  <div class="text-[10px] text-slate-400 truncate">Hard News</div>
                </div>
              </div>
              <div class="text-[10px] text-rose-400/90 bg-rose-950/30 px-2 py-0.5 rounded border border-rose-500/20 text-center">Conflict Frame Lede</div>
            </div>

            <!-- 4. AP Wire -->
            <div onclick="selectStyle('ap')" class="style-card border border-slate-800 bg-slate-950/70 p-3 rounded-2xl cursor-pointer hover:border-blue-500 transition space-y-2 flex flex-col justify-between" data-style="ap">
              <div class="flex items-center space-x-2.5">
                <img src="/assets/styles/ap.png" class="w-7 h-7 object-contain rounded bg-slate-900 p-0.5 border border-slate-800" alt="AP">
                <div class="text-left min-w-0">
                  <div class="font-bold text-xs text-white truncate">AP Wire</div>
                  <div class="text-[10px] text-slate-400 truncate">Wire Service</div>
                </div>
              </div>
              <div class="text-[10px] text-amber-400/90 bg-amber-950/30 px-2 py-0.5 rounded border border-amber-500/20 text-center">CITY (AP) — Dateline</div>
            </div>

            <!-- 5. People Magazine -->
            <div onclick="selectStyle('people')" class="style-card border border-slate-800 bg-slate-950/70 p-3 rounded-2xl cursor-pointer hover:border-blue-500 transition space-y-2 flex flex-col justify-between" data-style="people">
              <div class="flex items-center space-x-2.5">
                <img src="/assets/styles/people.png" class="w-7 h-7 object-contain rounded bg-slate-900 p-0.5 border border-slate-800" alt="People">
                <div class="text-left min-w-0">
                  <div class="font-bold text-xs text-white truncate">People Magazine</div>
                  <div class="text-[10px] text-slate-400 truncate">Celebrity & Culture</div>
                </div>
              </div>
              <div class="text-[10px] text-pink-400/90 bg-pink-950/30 px-2 py-0.5 rounded border border-pink-500/20 text-center">Person-first lede</div>
            </div>

            <!-- 6. TMZ -->
            <div onclick="selectStyle('tmz')" class="style-card border border-slate-800 bg-slate-950/70 p-3 rounded-2xl cursor-pointer hover:border-blue-500 transition space-y-2 flex flex-col justify-between" data-style="tmz">
              <div class="flex items-center space-x-2.5">
                <img src="/assets/styles/tmz.png" class="w-7 h-7 object-contain rounded bg-slate-900 p-0.5 border border-slate-800" alt="TMZ">
                <div class="text-left min-w-0">
                  <div class="font-bold text-xs text-white truncate">TMZ</div>
                  <div class="text-[10px] text-slate-400 truncate">Gossip Fast</div>
                </div>
              </div>
              <div class="text-[10px] text-orange-400/90 bg-orange-950/30 px-2 py-0.5 rounded border border-orange-500/20 text-center">Here's the deal...</div>
            </div>

            <!-- 7. BuzzFeed -->
            <div onclick="selectStyle('buzzfeed')" class="style-card border border-slate-800 bg-slate-950/70 p-3 rounded-2xl cursor-pointer hover:border-blue-500 transition space-y-2 flex flex-col justify-between" data-style="buzzfeed">
              <div class="flex items-center space-x-2.5">
                <img src="/assets/styles/buzzfeed.png" class="w-7 h-7 object-contain rounded bg-slate-900 p-0.5 border border-slate-800" alt="BuzzFeed">
                <div class="text-left min-w-0">
                  <div class="font-bold text-xs text-white truncate">BuzzFeed</div>
                  <div class="text-[10px] text-slate-400 truncate">Internet Culture</div>
                </div>
              </div>
              <div class="text-[10px] text-red-400/90 bg-red-950/30 px-2 py-0.5 rounded border border-red-500/20 text-center">Numbered H2s</div>
            </div>

            <!-- 8. Breaking Express -->
            <div onclick="selectStyle('breaking')" class="style-card border border-slate-800 bg-slate-950/70 p-3 rounded-2xl cursor-pointer hover:border-blue-500 transition space-y-2 flex flex-col justify-between" data-style="breaking">
              <div class="flex items-center space-x-2.5">
                <img src="/assets/styles/breaking.png" class="w-7 h-7 object-contain rounded bg-slate-900 p-0.5 border border-slate-800" alt="Breaking">
                <div class="text-left min-w-0">
                  <div class="font-bold text-xs text-white truncate">Breaking Express</div>
                  <div class="text-[10px] text-slate-400 truncate">Urgent Alert</div>
                </div>
              </div>
              <div class="text-[10px] text-red-500/90 bg-red-950/40 px-2 py-0.5 rounded border border-red-500/30 text-center">BREAKING Banner</div>
            </div>

            <!-- 9. Tabloid -->
            <div onclick="selectStyle('tabloid')" class="style-card border border-slate-800 bg-slate-950/70 p-3 rounded-2xl cursor-pointer hover:border-blue-500 transition space-y-2 flex flex-col justify-between" data-style="tabloid">
              <div class="flex items-center space-x-2.5">
                <img src="/assets/styles/tabloid.png" class="w-7 h-7 object-contain rounded bg-slate-900 p-0.5 border border-slate-800" alt="Tabloid">
                <div class="text-left min-w-0">
                  <div class="font-bold text-xs text-white truncate">Tabloid</div>
                  <div class="text-[10px] text-slate-400 truncate">Outrage Click</div>
                </div>
              </div>
              <div class="text-[10px] text-red-400/90 bg-red-950/30 px-2 py-0.5 rounded border border-red-500/20 text-center">BOMBSHELL Opener</div>
            </div>

            <!-- 10. News Analysis -->
            <div onclick="selectStyle('analysis')" class="style-card border border-slate-800 bg-slate-950/70 p-3 rounded-2xl cursor-pointer hover:border-blue-500 transition space-y-2 flex flex-col justify-between" data-style="analysis">
              <div class="flex items-center space-x-2.5">
                <img src="/assets/styles/analysis.png" class="w-7 h-7 object-contain rounded bg-slate-900 p-0.5 border border-slate-800" alt="Analysis">
                <div class="text-left min-w-0">
                  <div class="font-bold text-xs text-white truncate">News Analysis</div>
                  <div class="text-[10px] text-slate-400 truncate">Interpretive</div>
                </div>
              </div>
              <div class="text-[10px] text-slate-300/90 bg-slate-800/50 px-2 py-0.5 rounded border border-slate-700 text-center">Thesis Lede & Outlook</div>
            </div>

            <!-- 11. Axios Express -->
            <div onclick="selectStyle('axios')" class="style-card border border-slate-800 bg-slate-950/70 p-3 rounded-2xl cursor-pointer hover:border-blue-500 transition space-y-2 flex flex-col justify-between" data-style="axios">
              <div class="flex items-center space-x-2.5">
                <img src="/assets/styles/axios.svg" class="w-7 h-7 object-contain rounded bg-slate-900 p-0.5 border border-slate-800" alt="Axios">
                <div class="text-left min-w-0">
                  <div class="font-bold text-xs text-white truncate">Axios Express</div>
                  <div class="text-[10px] text-slate-400 truncate">Smart Brevity</div>
                </div>
              </div>
              <div class="text-[10px] text-blue-400/90 bg-blue-950/30 px-2 py-0.5 rounded border border-blue-500/20 text-center">1 Big Thing • Numbers</div>
            </div>

            <!-- 12. USA Viral Hook -->
            <div onclick="selectStyle('usaviral')" class="style-card border border-slate-800 bg-slate-950/70 p-3 rounded-2xl cursor-pointer hover:border-blue-500 transition space-y-2 flex flex-col justify-between" data-style="usaviral">
              <div class="flex items-center space-x-2.5">
                <img src="/assets/styles/usaviral.svg" class="w-7 h-7 object-contain rounded bg-slate-900 p-0.5 border border-slate-800" alt="Viral">
                <div class="text-left min-w-0">
                  <div class="font-bold text-xs text-white truncate">USA Viral Hook</div>
                  <div class="text-[10px] text-slate-400 truncate">Social Traffic</div>
                </div>
              </div>
              <div class="text-[10px] text-orange-400/90 bg-orange-950/30 px-2 py-0.5 rounded border border-orange-500/20 text-center">Curiosity Gap • Share</div>
            </div>

            <!-- 13. NYT Explainer -->
            <div onclick="selectStyle('nytexplainer')" class="style-card border border-slate-800 bg-slate-950/70 p-3 rounded-2xl cursor-pointer hover:border-blue-500 transition space-y-2 flex flex-col justify-between" data-style="nytexplainer">
              <div class="flex items-center space-x-2.5">
                <img src="/assets/styles/nyt.svg" class="w-7 h-7 object-contain rounded bg-slate-900 p-0.5 border border-slate-800" alt="NYT">
                <div class="text-left min-w-0">
                  <div class="font-bold text-xs text-white truncate">NYT Explainer</div>
                  <div class="text-[10px] text-slate-400 truncate">Contextual</div>
                </div>
              </div>
              <div class="text-[10px] text-slate-300/90 bg-slate-800/50 px-2 py-0.5 rounded border border-slate-700 text-center">H2 Q&A • Zero Jargon</div>
            </div>

            <!-- 14. Substack / Brew -->
            <div onclick="selectStyle('newsletter')" class="style-card border border-slate-800 bg-slate-950/70 p-3 rounded-2xl cursor-pointer hover:border-blue-500 transition space-y-2 flex flex-col justify-between" data-style="newsletter">
              <div class="flex items-center space-x-2.5">
                <img src="/assets/styles/substack.svg" class="w-7 h-7 object-contain rounded bg-slate-900 p-0.5 border border-slate-800" alt="Substack">
                <div class="text-left min-w-0">
                  <div class="font-bold text-xs text-white truncate">Substack / Brew</div>
                  <div class="text-[10px] text-slate-400 truncate">Newsletter</div>
                </div>
              </div>
              <div class="text-[10px] text-purple-400/90 bg-purple-950/30 px-2 py-0.5 rounded border border-purple-500/20 text-center">☕ Greeting • P.S. box</div>
            </div>

            <!-- 15. Investigative -->
            <div onclick="selectStyle('investigative')" class="style-card border border-slate-800 bg-slate-950/70 p-3 rounded-2xl cursor-pointer hover:border-blue-500 transition space-y-2 flex flex-col justify-between" data-style="investigative">
              <div class="flex items-center space-x-2.5">
                <img src="/assets/styles/investigative.svg" class="w-7 h-7 object-contain rounded bg-slate-900 p-0.5 border border-slate-800" alt="Investigative">
                <div class="text-left min-w-0">
                  <div class="font-bold text-xs text-white truncate">Investigative</div>
                  <div class="text-[10px] text-slate-400 truncate">Evidence-driven</div>
                </div>
              </div>
              <div class="text-[10px] text-teal-400/90 bg-teal-950/30 px-2 py-0.5 rounded border border-teal-500/20 text-center">The Paper Trail • Accused</div>
            </div>

          </div>
        </div>

        <!-- Step 3: Options (Injection target, word count, WebP unlinking) -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800 text-xs">
          
          <!-- Target Injection View -->
          <div>
            <label class="block font-bold text-slate-300 mb-1.5">Inject Result Into:</label>
            <select id="aiInjectTarget" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500">
              <option value="both">Both Views (HTML & Post)</option>
              <option value="post">Post View (Visual)</option>
              <option value="html">HTML View (Code)</option>
            </select>
          </div>

          <!-- Target Words (for Rewrite) -->
          <div>
            <label class="block font-bold text-slate-300 mb-1.5">Rewrite Word Target:</label>
            <select id="aiTargetWords" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500">
              <option value="250">250 Words (Quick Bullet)</option>
              <option value="450" selected>450 Words (Standard)</option>
              <option value="750">750 Words (In-Depth)</option>
              <option value="1200">1200 Words (Longform Investigation)</option>
            </select>
          </div>

          <!-- Image Unlink & WebP check -->
          <div class="flex items-center pt-5">
            <label class="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" id="aiCleanImageCheckbox" checked class="rounded border-slate-700 text-blue-600 focus:ring-0">
              <span class="text-slate-300 text-[11px] font-semibold">Unlink site & WebP Image</span>
            </label>
          </div>

        </div>

        <!-- Step 4: The 2 Action Buttons (Only Format vs Rewrite) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-800">
          
          <!-- Button 1: Only Format (Keep Original Words) -->
          <button type="button" id="btnOnlyFormat" onclick="executeAiProcess('format')" class="py-3 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs border border-slate-700 flex flex-col items-center justify-center transition shadow-lg">
            <div class="flex items-center space-x-2 text-blue-400 font-black">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"/></svg>
              <span>✨ Only Format (រក្សាពាក្យដើម)</span>
            </div>
            <span class="text-[11px] text-slate-400 mt-1 font-normal">Keep original words & quotes; format into signature style</span>
          </button>

          <!-- Button 2: Rewrite with AI (Full rewrite) -->
          <button type="button" id="btnRewriteAi" onclick="executeAiProcess('rewrite')" class="py-3 px-5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs shadow-xl shadow-blue-600/30 flex flex-col items-center justify-center transition">
            <div class="flex items-center space-x-2 font-black text-amber-300">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
              <span>⚡ AI Rewrite (សរសេរឡើងវិញ)</span>
            </div>
            <span class="text-[11px] text-blue-100 mt-1 font-normal">Authentic brand tone, vocabulary & structure</span>
          </button>

        </div>

      </div>

      <!-- TAB 2: FREE PRESETS (RULE-BASED, NO AI NEEDED) -->
      <div id="tkFreeTabContent" class="hidden space-y-4">
        <div class="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-xs text-emerald-300 flex items-center space-x-2">
          <span>💡</span>
          <span><strong>Instant Formatting:</strong> Reorganizes paragraphs, inserts headings, pull-quotes, and drop caps without consuming any AI tokens.</span>
        </div>

        <div class="grid grid-cols-2 gap-3">
          
          <button type="button" onclick="applyFreePreset('wire')" class="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500 text-left transition space-y-1 group">
            <div class="font-bold text-xs text-white group-hover:text-emerald-400">Classic Wire</div>
            <div class="text-[10px] text-slate-400">Minimal, tight paragraphs, single H2 max.</div>
          </button>

          <button type="button" onclick="applyFreePreset('feature')" class="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500 text-left transition space-y-1 group">
            <div class="font-bold text-xs text-white group-hover:text-emerald-400">Magazine Feature</div>
            <div class="text-[10px] text-slate-400">Drop-cap opener, H2 break, pull-quote callout.</div>
          </button>

          <button type="button" onclick="applyFreePreset('listicle')" class="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500 text-left transition space-y-1 group">
            <div class="font-bold text-xs text-white group-hover:text-emerald-400">Listicle</div>
            <div class="text-[10px] text-slate-400">Numbered H2 sections with key takeaways.</div>
          </button>

          <button type="button" onclick="applyFreePreset('tabloid')" class="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500 text-left transition space-y-1 group">
            <div class="font-bold text-xs text-white group-hover:text-emerald-400">Tabloid Bold</div>
            <div class="text-[10px] text-slate-400">Large bold lede, ALL-CAPS H2s, punchy paragraphs.</div>
          </button>

          <button type="button" onclick="applyFreePreset('broadsheet')" class="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500 text-left transition space-y-1 group">
            <div class="font-bold text-xs text-white group-hover:text-emerald-400">Broadsheet Classic</div>
            <div class="text-[10px] text-slate-400">Serif typography, dateline, formal attribution.</div>
          </button>

          <button type="button" onclick="applyFreePreset('explainer')" class="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500 text-left transition space-y-1 group">
            <div class="font-bold text-xs text-white group-hover:text-emerald-400">Digital Explainer</div>
            <div class="text-[10px] text-slate-400">"Why it matters" box, H2s every ~150 words.</div>
          </button>

          <button type="button" onclick="applyFreePreset('breaking')" class="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500 text-left transition space-y-1 group">
            <div class="font-bold text-xs text-white group-hover:text-emerald-400">Breaking Bulletin</div>
            <div class="text-[10px] text-slate-400">BREAKING kicker banner + bullet summary.</div>
          </button>

          <button type="button" onclick="applyFreePreset('newsletter')" class="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500 text-left transition space-y-1 group">
            <div class="font-bold text-xs text-white group-hover:text-emerald-400">Newsletter Style</div>
            <div class="text-[10px] text-slate-400">Casual greeting, fast facts bullets, P.S. sign-off.</div>
          </button>

        </div>
      </div>

      <!-- Result Applied Alert / Preview -->
      <div id="aiProcessingState" class="hidden p-4 rounded-2xl bg-blue-950/40 border border-blue-500/40 text-center text-xs text-blue-200">
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

    // Load saved Gemini API Key
    document.addEventListener('DOMContentLoaded', () => {
      const savedKey = localStorage.getItem('gemini_api_key');
      if (savedKey) {
        document.getElementById('geminiApiKey').value = savedKey;
      }
      updateWordCount();
      syncInitialContent();
    });

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
      
      const btnPost = document.getElementById('btnViewPost');
      const btnHtml = document.getElementById('btnViewHtml');
      const btnBoth = document.getElementById('btnViewBoth');

      const wrapperPost = document.getElementById('postViewWrapper');
      const wrapperHtml = document.getElementById('htmlViewWrapper');
      const wrapperBoth = document.getElementById('bothViewWrapper');

      // Reset button styles
      [btnPost, btnHtml, btnBoth].forEach(b => {
        b.className = 'px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition flex items-center space-x-1.5';
      });

      // Hide all wrappers
      wrapperPost.classList.add('hidden');
      wrapperHtml.classList.add('hidden');
      wrapperBoth.classList.add('hidden');

      if (mode === 'post') {
        btnPost.className = 'px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 bg-indigo-600 text-white shadow-md shadow-indigo-600/30';
        wrapperPost.classList.remove('hidden');
        document.getElementById('postVisualEditor').innerHTML = document.getElementById('htmlCodeEditor').value;
      } else if (mode === 'html') {
        btnHtml.className = 'px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 bg-indigo-600 text-white shadow-md shadow-indigo-600/30';
        wrapperHtml.classList.remove('hidden');
        document.getElementById('htmlCodeEditor').value = document.getElementById('postVisualEditor').innerHTML;
      } else if (mode === 'both') {
        btnBoth.className = 'px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 bg-indigo-600 text-white shadow-md shadow-indigo-600/30';
        wrapperBoth.classList.remove('hidden');
        const content = document.getElementById('postVisualEditor').innerHTML || document.getElementById('htmlCodeEditor').value;
        document.getElementById('splitHtmlEditor').value = content;
        document.getElementById('splitPostEditor').innerHTML = content;
      }
      updateWordCount();
    }

    // Synchronize editors
    document.getElementById('postVisualEditor').addEventListener('input', () => {
      document.getElementById('htmlCodeEditor').value = document.getElementById('postVisualEditor').innerHTML;
      updateWordCount();
    });

    document.getElementById('htmlCodeEditor').addEventListener('input', () => {
      document.getElementById('postVisualEditor').innerHTML = document.getElementById('htmlCodeEditor').value;
      updateWordCount();
    });

    document.getElementById('splitHtmlEditor').addEventListener('input', () => {
      const val = document.getElementById('splitHtmlEditor').value;
      document.getElementById('splitPostEditor').innerHTML = val;
      document.getElementById('htmlCodeEditor').value = val;
      document.getElementById('postVisualEditor').innerHTML = val;
      updateWordCount();
    });

    document.getElementById('splitPostEditor').addEventListener('input', () => {
      const val = document.getElementById('splitPostEditor').innerHTML;
      document.getElementById('splitHtmlEditor').value = val;
      document.getElementById('htmlCodeEditor').value = val;
      document.getElementById('postVisualEditor').innerHTML = val;
      updateWordCount();
    });

    function syncInitialContent() {
      const val = document.getElementById('htmlCodeEditor').value;
      document.getElementById('postVisualEditor').innerHTML = val;
    }

    function updateWordCount() {
      const text = document.getElementById('postVisualEditor').innerText || '';
      const words = text.trim() ? text.trim().split(/\\s+/).length : 0;
      document.getElementById('wordCountBadge').textContent = words + ' words';
    }

    // 2. FEATURED IMAGE DRAG & DROP + WEBP CONVERSION & UNLINK
    function handleDragOver(e) {
      e.preventDefault();
      document.getElementById('dropZone').classList.add('border-indigo-500', 'bg-indigo-950/20');
    }

    function handleDragLeave(e) {
      e.preventDefault();
      document.getElementById('dropZone').classList.remove('border-indigo-500', 'bg-indigo-950/20');
    }

    function handleDrop(e) {
      e.preventDefault();
      document.getElementById('dropZone').classList.remove('border-indigo-500', 'bg-indigo-950/20');
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
      if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
      }
    }

    function closeAiModal() {
      const modal = document.getElementById('aiModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
      }
    }

    function switchTkTab(tab) {
      const btnAi = document.getElementById('tabAiStyles');
      const btnFree = document.getElementById('tabFreePresets');
      const contentAi = document.getElementById('tkAiTabContent');
      const contentFree = document.getElementById('tkFreeTabContent');

      if (tab === 'ai') {
        btnAi.className = 'flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 bg-blue-600 text-white shadow-md shadow-blue-600/30';
        btnFree.className = 'flex-1 py-2 px-3 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition flex items-center justify-center space-x-2 bg-slate-800/80';
        contentAi.classList.remove('hidden');
        contentFree.classList.add('hidden');
      } else {
        btnFree.className = 'flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 bg-emerald-600 text-white shadow-md shadow-emerald-600/30';
        btnAi.className = 'flex-1 py-2 px-3 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition flex items-center justify-center space-x-2 bg-slate-800/80';
        contentFree.classList.remove('hidden');
        contentAi.classList.add('hidden');
      }
    }

    function selectStyle(style) {
      currentSelectedStyle = style;
      document.querySelectorAll('.style-card').forEach(el => {
        if (el.getAttribute('data-style') === style) {
          el.classList.add('selected');
        } else {
          el.classList.remove('selected');
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
      const badge = document.getElementById('selectedStyleBadge');
      if (badge) badge.textContent = styleNames[style] || style.toUpperCase();
    }

    function applyFreePreset(preset) {
      var content = document.getElementById('postVisualEditor').innerHTML || document.getElementById('htmlCodeEditor').value;
      if (!content || content.trim().length < 10) {
        alert('Please enter or fetch an article first!');
        return;
      }

      var formatted = content;
      if (preset === 'wire') {
        formatted = '<p class="font-sans font-medium text-slate-200"><strong>WASHINGTON (AP) —</strong> ' + content.replace(/<[^>]*>?/gm, '').slice(0, 250) + '...</p><hr class="my-4 border-slate-800">' + content;
      } else if (preset === 'feature') {
        formatted = '<div class="my-5 p-4 rounded-xl bg-slate-900 border-l-4 border-indigo-500 italic text-slate-200">"A defining moment that challenges established wisdom and paves new territory."</div>' + content;
      } else if (preset === 'explainer') {
        formatted = '<div class="my-4 p-4 rounded-xl bg-blue-950/40 border border-blue-500/40"><strong class="text-blue-400 block mb-1">Why it matters:</strong><p class="text-xs text-slate-300">Key developments that directly reshape the current environment.</p></div>' + content;
      } else if (preset === 'breaking') {
        formatted = '<div class="my-4 p-4 rounded-xl bg-red-950/50 border border-red-600"><strong class="text-red-400 uppercase tracking-widest block mb-1">🚨 BREAKING BULLETIN:</strong><p class="text-xs text-slate-200">Developing story unfolding in real time with continuous verification.</p></div>' + content;
      } else if (preset === 'newsletter') {
        formatted = '<p class="text-sm font-semibold text-purple-300 mb-4">Good morning ☕ — Here is everything you need to know today:</p>' + content + '<p class="text-xs text-slate-400 mt-4"><strong>P.S.</strong> Share this briefing with your team if you found it helpful!</p>';
      } else if (preset === 'tabloid') {
        formatted = '<div class="my-4 p-4 rounded-xl bg-red-950/60 border border-red-500 text-center"><h3 class="text-sm font-black text-red-400 uppercase mb-1">🔥 BOMBSHELL REVELATION 🔥</h3><p class="text-xs text-slate-200">Shocking new details emerge regarding today unexpectedly!</p></div>' + content;
      } else if (preset === 'listicle') {
        formatted = '<div class="my-4 p-4 rounded-xl bg-rose-950/30 border-l-4 border-rose-500"><strong class="text-rose-400 block mb-1">Key Takeaways at a Glance:</strong><ul class="list-disc list-inside text-xs text-slate-300 space-y-1"><li>Point 1: Primary institutional announcement.</li><li>Point 2: Core immediate impacts.</li><li>Point 3: Next phase timelines.</li></ul></div>' + content;
      } else if (preset === 'broadsheet') {
        formatted = '<p class="font-serif italic text-slate-300 text-sm border-b border-slate-800 pb-3 mb-4">By Special Correspondent • Published in Washington, D.C.</p>' + content;
      }

      document.getElementById('htmlCodeEditor').value = formatted;
      document.getElementById('postVisualEditor').innerHTML = formatted;
      document.getElementById('splitHtmlEditor').value = formatted;
      document.getElementById('splitPostEditor').innerHTML = formatted;
      updateWordCount();
      closeAiModal();
      alert('✓ Applied ' + preset.toUpperCase() + ' preset instantly!');
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
      let title = '';
      let content = '';

      if (fetchedArticleData) {
        title = fetchedArticleData.title;
        content = fetchedArticleData.content;
      } else {
        title = document.getElementById('titleInput').value.trim();
        content = document.getElementById('postVisualEditor').innerHTML;
      }

      if (!title && !content) {
        alert('Please enter a link to fetch first, or type a headline & content in the editor!');
        return;
      }

      const apiKey = document.getElementById('geminiApiKey').value.trim();
      const targetWords = parseInt(document.getElementById('aiTargetWords').value) || 500;
      const injectTarget = document.getElementById('aiInjectTarget').value;
      const cleanImage = document.getElementById('aiCleanImageCheckbox').checked;

      // Show processing banner
      const stateBox = document.getElementById('aiProcessingState');
      const stateText = document.getElementById('aiProcessingText');
      stateBox.classList.remove('hidden');
      stateText.textContent = mode === 'format' 
        ? ('Reformatting into ' + currentSelectedStyle.toUpperCase() + ' style (preserving original words)...')
        : ('Rewriting into ' + currentSelectedStyle.toUpperCase() + ' style using Gemini AI...');

      try {
        const res = await fetch('/api/ai/format-or-rewrite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey,
            mode,
            style: currentSelectedStyle,
            title,
            content,
            targetWords
          })
        });

        const data = await res.json();
        if (data.success) {
          // Inject Title & Summary
          document.getElementById('titleInput').value = data.title;
          if (data.summary) {
            document.getElementById('summaryInput').value = data.summary;
          }

          // Handle Image Injection
          if (fetchedArticleData && fetchedArticleData.image) {
            let imgUrl = fetchedArticleData.image;
            if (cleanImage) {
              // Strip external link query params
              try {
                const parsed = new URL(imgUrl);
                imgUrl = parsed.origin + parsed.pathname;
              } catch(e) {}
            }
            setImagePreview(imgUrl);
          }

          // Inject Content to selected view
          const formattedHtml = data.formatted_html;
          document.getElementById('htmlCodeEditor').value = formattedHtml;
          document.getElementById('postVisualEditor').innerHTML = formattedHtml;
          document.getElementById('splitHtmlEditor').value = formattedHtml;
          document.getElementById('splitPostEditor').innerHTML = formattedHtml;

          // Switch view if requested
          if (injectTarget === 'post') setViewMode('post');
          else if (injectTarget === 'html') setViewMode('html');
          else if (injectTarget === 'both') setViewMode('both');

          updateWordCount();
          closeAiModal();
          alert('✓ Successfully generated and injected ' + currentSelectedStyle.toUpperCase() + ' news style into ' + injectTarget.toUpperCase() + ' view!');
        } else {
          alert('AI error: ' + (data.error || 'Failed to process'));
        }
      } catch (e) {
        alert('Network error: ' + e.message);
      } finally {
        stateBox.classList.add('hidden');
      }
    }

    async function aiFormatCurrent(style) {
      currentSelectedStyle = style;
      executeAiProcess('format');
    }

    function aiKhmerTranslate() {
      document.getElementById('titleInput').value = "របកគំហើញថ្មី៖ របៀបដែលបច្ចេកវិទ្យា Edge និង AI កំពុងផ្លាស់ប្តូរឧស្សាហកម្មប្រព័ន្ធផ្សព្វផ្សាយ";
      document.getElementById('summaryInput').value = "ស្ថាបត្យកម្មល្បឿនលឿនកម្រិតខ្ពស់ជាមួយ Cloudflare Edge និង Headless CMS បង្កើតស្តង់ដារថ្មីសម្រាប់ប្រព័ន្ធព័ត៌មានសកល។";
      alert("🇰🇭 ចំណងជើង និងសេចក្តីសង្ខេបត្រូវបានបកប្រែជាភាសាខ្មែរដោយជោគជ័យ!");
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
  </script>
</body>
</html>`);
};

adminRouter.get("/new", renderEditor);
adminRouter.get("/edit/:id", renderEditor);
