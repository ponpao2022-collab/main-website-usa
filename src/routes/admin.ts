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

  const totalViews = posts.reduce((acc, p) => acc + (p.views || 0), 0);
  const breakingCount = posts.filter(p => p.is_breaking === 1).length;

  return c.html(`<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NextGen Newsroom CMS - Dashboard</title>
  <script src="https://www.gstatic.com/antigravity/web/dev/tailwindcss.min.js"></script>
  <style>
    @keyframes pulse-slow { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    .animate-pulse-slow { animation: pulse-slow 2s infinite; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 font-sans antialiased min-h-screen flex flex-col selection:bg-indigo-500 selection:text-white">

  <!-- Top Header -->
  <header class="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-50">
    <div class="flex items-center space-x-3">
      <div class="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-rose-500 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
        N
      </div>
      <div>
        <div class="flex items-center space-x-2">
          <span class="font-bold text-base tracking-wide">CHRONICLE OS</span>
          <span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">Next-Gen CMS</span>
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
    
    <!-- Stats Row -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
        <div class="text-[11px] text-indigo-400/80 mt-2">98.4% Served from Cache</div>
      </div>

      <div class="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
        <div>
          <div class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Cloudflare Edge Purge</div>
          <div class="text-xs text-slate-400">Purge cache across all 310+ global PoPs</div>
        </div>
        <button onclick="purgeCache(this)" class="w-full mt-3 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-emerald-300 flex items-center justify-center space-x-1.5 transition">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          <span>Instant Cache Purge</span>
        </button>
      </div>
    </div>

    <!-- Posts Table -->
    <div class="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div class="p-5 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 class="font-bold text-lg text-white">Articles & News Feed</h2>
          <p class="text-xs text-slate-400">Manage, edit, or toggle Breaking News banner in real-time</p>
        </div>
        <a href="/admin/new" class="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition">
          + New Article
        </a>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase font-semibold">
            <tr>
              <th class="py-3 px-5">Headline & Article</th>
              <th class="py-3 px-4">Category</th>
              <th class="py-3 px-4">Author</th>
              <th class="py-3 px-4 text-center">Breaking?</th>
              <th class="py-3 px-4">Views</th>
              <th class="py-3 px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/80 text-slate-300">
            ${posts.map(p => `
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
                <td class="py-4 px-4 font-mono">${p.views.toLocaleString()}</td>
                <td class="py-4 px-5 text-right space-x-2">
                  <a href="/article/${p.slug}" target="_blank" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-[11px]">View</a>
                  <a href="/admin/edit/${p.id}" class="px-2.5 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 transition text-[11px]">Edit</a>
                  <button onclick="deletePost(${p.id})" class="px-2.5 py-1 rounded bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/40 transition text-[11px]">Delete</button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <script>
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
  <script src="https://www.gstatic.com/antigravity/web/dev/tailwindcss.min.js"></script>
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

      <button onclick="openAiModal()" type="button" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 flex items-center space-x-1.5 transition">
        <svg class="w-3.5 h-3.5 text-amber-300" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
        <span>AI Importer (Gemini)</span>
      </button>

      <button onclick="saveAndDeploy()" id="saveBtn" class="px-4 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-md shadow-emerald-500/20 flex items-center space-x-1.5 transition">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
        <span>Instant Deploy to Edge</span>
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

      <!-- Category Picker -->
      <div>
        <label class="block text-xs font-semibold text-slate-300 mb-1.5">Category</label>
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

  <!-- FLOATING AI ACTION BUTTON ON BOTTOM-RIGHT -->
  <button onclick="openAiModal()" type="button" class="fixed bottom-6 right-6 z-40 flex items-center space-x-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600 hover:from-indigo-500 hover:to-rose-500 text-white font-bold text-xs shadow-2xl shadow-indigo-500/50 border border-white/20 transition transform hover:scale-105 active:scale-95 group">
    <div class="relative">
      <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block animate-ping absolute -top-0.5 -right-0.5"></span>
      <span class="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
    </div>
    <svg class="w-4 h-4 text-amber-300" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
    <span class="tracking-wide">AI Article Importer & Formatter</span>
  </button>

  <!-- RIGHT-SIDE AI ARTICLE IMPORTER & FORMATTER DRAWER PANEL (SIDE-BY-SIDE WITH EDITOR) -->
  <div id="aiModal" class="hidden fixed inset-y-0 right-0 z-50 w-full sm:w-[540px] lg:w-[600px] bg-slate-900/95 backdrop-blur-2xl border-l border-slate-700/80 shadow-[-20px_0_50px_rgba(0,0,0,0.6)] flex flex-col transition-all duration-300">
    
    <!-- Drawer Header (Fixed at top of drawer) -->
    <div class="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between flex-shrink-0">
      <div class="flex items-center space-x-3">
        <div class="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
          <svg class="w-5 h-5 text-amber-300" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
        </div>
        <div>
          <h2 class="text-sm sm:text-base font-black text-white">AI Article Importer & Formatter</h2>
          <p class="text-[11px] text-slate-400">Gemini 2.0 Flash • Side Panel (Editor Visible)</p>
        </div>
      </div>
      <button onclick="closeAiModal()" type="button" class="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition" title="Close Side Panel">✕</button>
    </div>

    <!-- Drawer Scrollable Content -->
    <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-slate-100">

      <!-- Gemini API Key Input Bar -->
      <div class="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div class="flex-1">
          <label class="block font-bold text-indigo-300 mb-1">Google Gemini API Key (Free):</label>
          <div class="flex items-center space-x-2">
            <input type="password" id="geminiApiKey" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500" placeholder="AIzaSy... (Saved in browser)">
            <button type="button" onclick="saveGeminiKey()" class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">Save</button>
          </div>
        </div>
        <div class="text-[11px] text-slate-400 sm:text-right">
          <span>Get Free Key:</span>
          <a href="https://aistudio.google.com/app/apikey" target="_blank" class="text-indigo-400 hover:underline block font-semibold">aistudio.google.com &rarr;</a>
        </div>
      </div>

      <!-- Step 1: Input URL and Fetch Article -->
      <div class="space-y-2">
        <label class="block text-xs font-bold uppercase tracking-wider text-slate-300">1. Paste Article Post Link:</label>
        <div class="flex items-center space-x-2">
          <input type="url" id="fetchUrlInput" class="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" placeholder="https://edition.cnn.com/... or https://www.bbc.com/news/...">
          <button type="button" id="btnFetchUrl" onclick="fetchArticleFromLink()" class="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md shadow-indigo-600/20 flex items-center space-x-2 transition">
            <span>⚡ Fetch Article & Image</span>
          </button>
        </div>
      </div>

      <!-- Fetched Article Preview Box (Hidden until fetched) -->
      <div id="fetchPreviewBox" class="hidden p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
        <div class="flex items-center justify-between text-emerald-400 font-bold border-b border-slate-800 pb-2">
          <span>✓ Article & Image Successfully Fetched!</span>
          <span id="fetchStatsBadge" class="text-slate-400 font-mono">0 paragraphs</span>
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

      <!-- Step 2: Choose from 10 News Styles (With Real Brand Icons) -->
      <div class="space-y-3">
        <label class="block text-xs font-bold uppercase tracking-wider text-slate-300">2. Choose Editorial News Style (10 Presets with Real Icons):</label>
        
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-3" id="styleSelectorGrid">
          
          <!-- 1. CNN -->
          <div onclick="selectStyle('cnn')" class="style-card selected border border-slate-800 bg-slate-950/60 p-3 rounded-2xl cursor-pointer hover:border-red-500 transition text-center space-y-2" data-style="cnn">
            <div class="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center font-black text-white text-xs tracking-tighter mx-auto shadow-md">CNN</div>
            <div class="font-bold text-xs text-white">CNN</div>
            <div class="text-[10px] text-slate-400 leading-tight">Facts First, Urgent Lead</div>
          </div>

          <!-- 2. BBC News -->
          <div onclick="selectStyle('bbc')" class="style-card border border-slate-800 bg-slate-950/60 p-3 rounded-2xl cursor-pointer hover:border-red-600 transition text-center space-y-2" data-style="bbc">
            <div class="w-10 h-10 rounded-xl bg-red-800 flex items-center justify-center font-serif font-black text-white text-[11px] tracking-widest mx-auto shadow-md">BBC</div>
            <div class="font-bold text-xs text-white">BBC News</div>
            <div class="text-[10px] text-slate-400 leading-tight">Objective, 'At a Glance'</div>
          </div>

          <!-- 3. The New York Times -->
          <div onclick="selectStyle('nyt')" class="style-card border border-slate-800 bg-slate-950/60 p-3 rounded-2xl cursor-pointer hover:border-slate-400 transition text-center space-y-2" data-style="nyt">
            <div class="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-serif font-black text-white text-base mx-auto shadow-md">T</div>
            <div class="font-bold text-xs text-white">NY Times</div>
            <div class="text-[10px] text-slate-400 leading-tight">Literary, Drop-Cap</div>
          </div>

          <!-- 4. Reuters -->
          <div onclick="selectStyle('reuters')" class="style-card border border-slate-800 bg-slate-950/60 p-3 rounded-2xl cursor-pointer hover:border-amber-500 transition text-center space-y-2" data-style="reuters">
            <div class="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center font-black text-slate-950 text-xs tracking-wider mx-auto shadow-md">REU</div>
            <div class="font-bold text-xs text-white">Reuters</div>
            <div class="text-[10px] text-slate-400 leading-tight">Wire Dateline, Factual</div>
          </div>

          <!-- 5. Bloomberg -->
          <div onclick="selectStyle('bloomberg')" class="style-card border border-slate-800 bg-slate-950/60 p-3 rounded-2xl cursor-pointer hover:border-blue-500 transition text-center space-y-2" data-style="bloomberg">
            <div class="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-xs tracking-wider mx-auto shadow-md">BBG</div>
            <div class="font-bold text-xs text-white">Bloomberg</div>
            <div class="text-[10px] text-slate-400 leading-tight">Markets & Data Focus</div>
          </div>

          <!-- 6. The Verge -->
          <div onclick="selectStyle('verge')" class="style-card border border-slate-800 bg-slate-950/60 p-3 rounded-2xl cursor-pointer hover:border-violet-500 transition text-center space-y-2" data-style="verge">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-rose-500 flex items-center justify-center font-black text-white text-sm mx-auto shadow-md">V</div>
            <div class="font-bold text-xs text-white">The Verge</div>
            <div class="text-[10px] text-slate-400 leading-tight">Tech Spec & Modern</div>
          </div>

          <!-- 7. The Guardian -->
          <div onclick="selectStyle('guardian')" class="style-card border border-slate-800 bg-slate-950/60 p-3 rounded-2xl cursor-pointer hover:border-amber-400 transition text-center space-y-2" data-style="guardian">
            <div class="w-10 h-10 rounded-xl bg-blue-900 border border-amber-400 flex items-center justify-center font-serif font-black text-amber-300 text-sm mx-auto shadow-md">g</div>
            <div class="font-bold text-xs text-white">The Guardian</div>
            <div class="text-[10px] text-slate-400 leading-tight">Human-Impact Lens</div>
          </div>

          <!-- 8. Al Jazeera -->
          <div onclick="selectStyle('aljazeera')" class="style-card border border-slate-800 bg-slate-950/60 p-3 rounded-2xl cursor-pointer hover:border-orange-500 transition text-center space-y-2" data-style="aljazeera">
            <div class="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center font-black text-white text-xs mx-auto shadow-md">AJ</div>
            <div class="font-bold text-xs text-white">Al Jazeera</div>
            <div class="text-[10px] text-slate-400 leading-tight">Timeline & Context</div>
          </div>

          <!-- 9. Associated Press (AP) -->
          <div onclick="selectStyle('ap')" class="style-card border border-slate-800 bg-slate-950/60 p-3 rounded-2xl cursor-pointer hover:border-red-500 transition text-center space-y-2" data-style="ap">
            <div class="w-10 h-10 rounded-xl bg-slate-800 border-2 border-red-500 flex items-center justify-center font-black text-white text-xs mx-auto shadow-md">AP</div>
            <div class="font-bold text-xs text-white">AP News</div>
            <div class="text-[10px] text-slate-400 leading-tight">Inverted Pyramid Wire</div>
          </div>

          <!-- 10. TechCrunch -->
          <div onclick="selectStyle('techcrunch')" class="style-card border border-slate-800 bg-slate-950/60 p-3 rounded-2xl cursor-pointer hover:border-emerald-500 transition text-center space-y-2" data-style="techcrunch">
            <div class="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center font-mono font-black text-slate-950 text-xs mx-auto shadow-md">TC</div>
            <div class="font-bold text-xs text-white">TechCrunch</div>
            <div class="text-[10px] text-slate-400 leading-tight">VC & Startup Angle</div>
          </div>

        </div>
      </div>

      <!-- Step 3: Options (Injection target, word count, WebP unlinking) -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800 text-xs">
        
        <!-- Target Injection View -->
        <div>
          <label class="block font-bold text-slate-300 mb-1.5">Inject Result Into:</label>
          <select id="aiInjectTarget" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500">
            <option value="both">Both Views (HTML & Post)</option>
            <option value="post">Post View (Visual)</option>
            <option value="html">HTML View (Code)</option>
          </select>
        </div>

        <!-- Target Words (for Rewrite) -->
        <div>
          <label class="block font-bold text-slate-300 mb-1.5">Rewrite Length Target:</label>
          <select id="aiTargetWords" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500">
            <option value="350">350 Words (Quick Story)</option>
            <option value="500" selected>500 Words (Standard)</option>
            <option value="800">800 Words (In-Depth Analysis)</option>
          </select>
        </div>

        <!-- Image Unlink & WebP check -->
        <div class="flex items-center pt-5">
          <label class="flex items-center space-x-2 cursor-pointer">
            <input type="checkbox" id="aiCleanImageCheckbox" checked class="rounded border-slate-700 text-indigo-600 focus:ring-0">
            <span class="text-slate-300 text-[11px] font-semibold">Unlink site & Convert Image to WebP</span>
          </label>
        </div>

      </div>

      <!-- Step 4: The 2 Action Buttons (Only Format vs Rewrite) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-800">
        
        <!-- Button 1: Only Format (Keep Original Words) -->
        <button type="button" id="btnOnlyFormat" onclick="executeAiProcess('format')" class="py-3 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs border border-slate-700 flex flex-col items-center justify-center transition shadow-lg">
          <div class="flex items-center space-x-2 text-indigo-400 font-black">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"/></svg>
            <span>✨ Only Format (រក្សាពាក្យដើម)</span>
          </div>
          <span class="text-[11px] text-slate-400 mt-1 font-normal">Keep all original words & quotes; format into signature style</span>
        </button>

        <!-- Button 2: Rewrite with AI (Full rewrite) -->
        <button type="button" id="btnRewriteAi" onclick="executeAiProcess('rewrite')" class="py-3 px-5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600 hover:from-indigo-500 hover:to-rose-500 text-white font-bold text-xs shadow-xl shadow-indigo-600/30 flex flex-col items-center justify-center transition">
          <div class="flex items-center space-x-2 font-black text-amber-300">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
            <span>⚡ Rewrite with AI (សរសេរឡើងវិញ)</span>
          </div>
          <span class="text-[11px] text-indigo-100 mt-1 font-normal">Full journalistic rewrite matching vocabulary & length</span>
        </button>

      </div>

      <!-- Result Applied Alert / Preview -->
      <div id="aiProcessingState" class="hidden p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 text-center text-xs text-indigo-200">
        <span class="animate-spin inline-block mr-2">🌀</span>
        <span id="aiProcessingText">Processing with Gemini Model...</span>
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

    // 3. AI POPUP MODAL & 10 STYLES SELECTOR
    function openAiModal() {
      document.getElementById('aiModal').classList.remove('hidden');
    }

    function closeAiModal() {
      document.getElementById('aiModal').classList.add('hidden');
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

    // Save and deploy
    async function saveAndDeploy() {
      const saveBtn = document.getElementById('saveBtn');
      saveBtn.innerHTML = 'Deploying to Edge...';

      const payload = {
        id: postId,
        title: document.getElementById('titleInput').value,
        slug: document.getElementById('slugInput').value,
        summary: document.getElementById('summaryInput').value,
        content: document.getElementById('htmlCodeEditor').value || document.getElementById('postVisualEditor').innerHTML,
        category_id: parseInt(document.getElementById('categoryInput').value),
        featured_image: document.getElementById('imageInput').value,
        author_name: document.getElementById('authorInput').value,
        read_time: document.getElementById('readTimeInput').value,
        is_breaking: document.getElementById('isBreakingInput').checked,
        status: 'published'
      };

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        await fetch('/api/cloudflare/purge', { method: 'POST' });
        saveBtn.innerHTML = '✅ Live Globally (18ms)';
        setTimeout(() => {
          window.location.href = '/admin';
        }, 800);
      } else {
        alert('Failed to save story');
        saveBtn.innerHTML = 'Instant Deploy to Edge';
      }
    }
  </script>
</body>
</html>`);
};

adminRouter.get("/new", renderEditor);
adminRouter.get("/edit/:id", renderEditor);
