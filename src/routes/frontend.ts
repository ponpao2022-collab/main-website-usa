import { Hono } from "hono";
import { db } from "../db/index";

export const frontendRouter = new Hono();

// Helper: Common HTML Layout Wrapper
function layout(title: string, content: string, currentPath = "/") {
  const categories = db.query("SELECT * FROM categories ORDER BY id ASC").all() as any[];
  const breaking = db.query("SELECT title, slug FROM posts WHERE is_breaking = 1 AND status = 'published' ORDER BY id DESC LIMIT 5").all() as any[];

  const breakingTickerHtml = breaking.map(b => `
    <a href="/article/${b.slug}" class="hover:underline flex items-center space-x-2 flex-shrink-0">
      <span class="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block"></span>
      <span>${b.title}</span>
    </a>
  `).join(`<span class="text-slate-600 px-3">•</span>`);

  const categoryNavHtml = categories.map(cat => `
    <a href="/category/${cat.slug}" class="text-sm font-medium hover:text-indigo-400 transition ${currentPath.includes(cat.slug) ? 'text-indigo-400 font-semibold' : 'text-slate-300'}">
      ${cat.name}
    </a>
  `).join("");

  return `<!DOCTYPE html>
<html lang="km" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | THE CHRONICLE DIGITAL</title>
  <script src="https://www.gstatic.com/antigravity/web/dev/tailwindcss.min.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Battambang:wght@400;700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', 'Battambang', sans-serif; }
    @keyframes marquee {
      0% { transform: translateX(0%); }
      100% { transform: translateX(-50%); }
    }
    .animate-marquee {
      display: inline-flex;
      white-space: nowrap;
      animation: marquee 35s linear infinite;
    }
    .animate-marquee:hover {
      animation-play-state: paused;
    }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased selection:bg-rose-500 selection:text-white">

  <!-- Utility Top Bar -->
  <div class="border-b border-slate-800/80 bg-slate-900/60 text-xs text-slate-400 px-4 lg:px-8 py-1.5 flex justify-between items-center">
    <div class="flex items-center space-x-3">
      <span id="currentDate">Tuesday, October 13, 2026</span>
      <span>•</span>
      <span class="flex items-center space-x-1">
        <span>📍 Washington, D.C. 19°C</span>
        <span class="text-slate-300 font-medium">| New York 18°C</span>
      </span>
      <span class="hidden lg:inline">•</span>
      <span class="hidden lg:inline text-emerald-400 font-mono text-[11px]">📈 S&P 500 5,864 (+0.8%) | NASDAQ 18,340 (+1.2%)</span>
    </div>
    <div class="flex items-center space-x-4">
      <a href="/admin" class="flex items-center space-x-1 text-indigo-400 hover:text-indigo-300 font-medium transition">
        <span>⚡ Open NextGen CMS</span>
      </a>
      <span class="hidden md:inline">•</span>
      <span class="hidden md:inline text-emerald-400 text-[11px] font-mono flex items-center space-x-1">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
        <span>Cloudflare CDN: Cached</span>
      </span>
    </div>
  </div>

  <!-- Main Brand Header -->
  <header class="border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
    <div class="max-w-7xl mx-auto px-4 lg:px-8 py-4 flex items-center justify-between">
      <!-- Logo -->
      <a href="/" class="flex items-center space-x-3 group">
        <div class="h-9 w-9 rounded-xl bg-gradient-to-tr from-rose-600 via-indigo-600 to-amber-500 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-rose-500/20 group-hover:scale-105 transition transform">
          C
        </div>
        <div>
          <span class="text-xl md:text-2xl font-black tracking-tight text-white block leading-none">THE CHRONICLE</span>
          <span class="text-[10px] tracking-widest text-slate-400 uppercase font-semibold">Digital News & Insights</span>
        </div>
      </a>

      <!-- Category Navigation (Desktop) -->
      <nav class="hidden lg:flex items-center space-x-6">
        <a href="/" class="text-sm font-semibold text-white hover:text-rose-400 transition">Home</a>
        ${categoryNavHtml}
      </nav>

      <!-- Right Header Actions -->
      <div class="flex items-center space-x-3">
        <a href="/admin" class="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm shadow-indigo-600/30 flex items-center space-x-1.5">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          <span>Write / CMS</span>
        </a>
      </div>
    </div>

    <!-- Breaking News Ticker -->
    ${breaking.length > 0 ? `
    <div class="bg-rose-950/40 border-t border-b border-rose-500/20 py-1.5 px-4 lg:px-8 flex items-center text-xs overflow-hidden">
      <div class="flex items-center space-x-2 bg-rose-600 text-white font-bold px-2.5 py-0.5 rounded text-[11px] uppercase tracking-wider flex-shrink-0 z-10 shadow-sm">
        <span class="w-1.5 h-1.5 rounded-full bg-white animate-ping mr-0.5"></span>
        Breaking
      </div>
      <div class="overflow-hidden relative w-full ml-3 text-slate-200">
        <div class="animate-marquee space-x-4">
          ${breakingTickerHtml}
          ${breakingTickerHtml}
        </div>
      </div>
    </div>` : ''}
  </header>

  <!-- Page Content -->
  <main class="flex-grow max-w-7xl mx-auto w-full px-4 lg:px-8 py-8">
    ${content}
  </main>

  <!-- Footer -->
  <footer class="border-t border-slate-800/80 bg-slate-900/50 mt-16 py-12 text-sm text-slate-400">
    <div class="max-w-7xl mx-auto px-4 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
      <div class="space-y-3">
        <div class="flex items-center space-x-2">
          <div class="h-6 w-6 rounded-lg bg-rose-600 flex items-center justify-center font-bold text-white text-xs">C</div>
          <span class="font-bold text-white tracking-wide">THE CHRONICLE</span>
        </div>
        <p class="text-xs text-slate-400 leading-relaxed">
          High-performance modern media publishing platform engineered with Next-Gen CMS, Edge Caching, and Sub-second Global Delivery.
        </p>
      </div>

      <div>
        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">Categories</h4>
        <ul class="space-y-2 text-xs">
          ${categories.map(c => `<li><a href="/category/${c.slug}" class="hover:text-indigo-400 transition">${c.name}</a></li>`).join("")}
        </ul>
      </div>

      <div>
        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">NextGen CMS</h4>
        <ul class="space-y-2 text-xs">
          <li><a href="/admin" class="hover:text-indigo-400 transition">CMS Control Panel</a></li>
          <li><a href="/admin" class="hover:text-indigo-400 transition">Write New Story</a></li>
          <li><a href="/api/posts" target="_blank" class="hover:text-indigo-400 transition">RESTful API (JSON)</a></li>
        </ul>
      </div>

      <div class="space-y-2 text-xs">
        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-200 mb-2">Cloudflare Infrastructure</h4>
        <div class="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-300">
          <div class="flex justify-between items-center mb-1">
            <span>Edge Status:</span>
            <span class="text-emerald-400 font-bold">100% Operational</span>
          </div>
          <div class="flex justify-between items-center text-[11px] text-slate-400">
            <span>Cache TTFB:</span>
            <span class="font-mono text-emerald-400">18ms</span>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 lg:px-8 border-t border-slate-800 pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500">
      <div>© 2026 The Chronicle Digital Media. All rights reserved.</div>
      <div class="mt-2 sm:mt-0 flex space-x-4">
        <span>Hosted on VPS</span>
        <span>•</span>
        <span>CDN & DNS via Cloudflare</span>
      </div>
    </div>
  </footer>

</body>
</html>`;
}

// 1. HOME PAGE ROUTE
frontendRouter.get("/", (c) => {
  const featured = db.query(`
    SELECT p.*, c.name as category_name, c.color as category_color, c.slug as category_slug
    FROM posts p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_featured = 1 AND p.status = 'published'
    LIMIT 1
  `).get() as any || db.query(`
    SELECT p.*, c.name as category_name, c.color as category_color, c.slug as category_slug
    FROM posts p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.status = 'published'
    ORDER BY p.id DESC LIMIT 1
  `).get() as any;

  const trending = db.query(`
    SELECT p.*, c.name as category_name, c.color as category_color, c.slug as category_slug
    FROM posts p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id != ? AND p.status = 'published'
    ORDER BY p.views DESC, p.id DESC
    LIMIT 4
  `).all(featured ? featured.id : 0) as any[];

  const allPosts = db.query(`
    SELECT p.*, c.name as category_name, c.color as category_color, c.slug as category_slug
    FROM posts p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id != ? AND p.status = 'published'
    ORDER BY p.id DESC
    LIMIT 8
  `).all(featured ? featured.id : 0) as any[];

  const usPosts = db.query(`
    SELECT p.*, c.name as category_name, c.color as category_color, c.slug as category_slug
    FROM posts p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE c.slug = 'us-news' AND p.status = 'published'
    ORDER BY p.id DESC
    LIMIT 3
  `).all() as any[];

  const content = `
    <!-- Hero Section -->
    <section class="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
      <!-- Main Featured Story (Col 8) -->
      ${featured ? `
      <div class="lg:col-span-8 group">
        <a href="/article/${featured.slug}" class="block relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl">
          <div class="relative h-72 sm:h-96 md:h-[420px] overflow-hidden">
            <img src="${featured.featured_image || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200'}" alt="${featured.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500 ease-out">
            <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
            
            <div class="absolute bottom-0 left-0 right-0 p-6 md:p-8">
              <div class="flex items-center space-x-3 mb-3">
                <span class="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider text-white" style="background-color: ${featured.category_color || '#4f46e5'}">
                  ${featured.category_name || 'Featured'}
                </span>
                <span class="text-xs text-slate-300">${featured.read_time}</span>
              </div>
              <h2 class="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white leading-tight mb-3 group-hover:text-indigo-300 transition">
                ${featured.title}
              </h2>
              <p class="text-sm md:text-base text-slate-300 line-clamp-2 mb-4 leading-relaxed font-normal">
                ${featured.summary}
              </p>
              <div class="flex items-center space-x-3 text-xs text-slate-300">
                <img src="${featured.author_avatar}" class="w-6 h-6 rounded-full border border-slate-700">
                <span>By ${featured.author_name}</span>
                <span>•</span>
                <span>${new Date(featured.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </a>
      </div>` : ''}

      <!-- Trending Top Stories (Col 4) -->
      <div class="lg:col-span-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-5 border-b border-slate-800 pb-3">
            <h3 class="text-xs font-bold uppercase tracking-widest text-rose-400 flex items-center space-x-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
              <span>Trending Top Stories</span>
            </h3>
            <span class="text-[11px] text-slate-500 font-medium">Real-time</span>
          </div>

          <div class="space-y-4">
            ${trending.map((t, idx) => `
              <a href="/article/${t.slug}" class="flex items-start space-x-4 group pb-4 border-b border-slate-800/60 last:border-b-0">
                <span class="text-2xl font-black text-slate-700 group-hover:text-indigo-400 transition font-mono">${idx + 1}</span>
                <div class="flex-1 min-w-0">
                  <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block mb-1">${t.category_name}</span>
                  <h4 class="text-sm font-semibold text-slate-200 group-hover:text-white transition line-clamp-2 leading-snug">
                    ${t.title}
                  </h4>
                  <div class="flex items-center space-x-2 mt-1.5 text-[11px] text-slate-500">
                    <span>${t.read_time}</span>
                    <span>•</span>
                    <span>${t.views.toLocaleString()} views</span>
                  </div>
                </div>
                ${t.featured_image ? `
                <img src="${t.featured_image}" class="w-16 h-16 rounded-lg object-cover flex-shrink-0 group-hover:scale-105 transition">` : ''}
              </a>
            `).join("")}
          </div>
        </div>
      </div>
    </section>

    <!-- US News & National Dispatch Spotlight -->
    ${usPosts.length > 0 ? `
    <section class="mb-14 bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/30 border border-blue-500/30 rounded-3xl p-6 lg:p-8 shadow-2xl relative overflow-hidden">
      <div class="absolute -right-10 -bottom-10 w-60 h-60 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-blue-500/20 gap-3">
        <div class="flex items-center space-x-3">
          <span class="px-2.5 py-1 rounded-lg text-xs font-black bg-blue-600 text-white uppercase tracking-wider flex items-center space-x-1.5 shadow-md shadow-blue-500/20">
            <span>🇺🇸</span>
            <span>U.S. EDITION</span>
          </span>
          <h2 class="text-xl sm:text-2xl font-black text-white">United States News & National Dispatch</h2>
        </div>
        <a href="/category/us-news" class="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center space-x-1 transition">
          <span>View All US Coverage</span>
          <span>&rarr;</span>
        </a>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        ${usPosts.map(post => `
          <article class="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden hover:border-blue-500/50 transition duration-300 flex flex-col group shadow-lg">
            <a href="/article/${post.slug}" class="block relative h-48 overflow-hidden">
              <img src="${post.featured_image}" alt="${post.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
              <span class="absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-600 text-white shadow">
                U.S. News
              </span>
            </a>
            <div class="p-5 flex-1 flex flex-col justify-between">
              <div>
                <a href="/article/${post.slug}">
                  <h3 class="font-bold text-base text-slate-100 group-hover:text-blue-400 transition line-clamp-2 leading-snug mb-2">
                    ${post.title}
                  </h3>
                </a>
                <p class="text-xs text-slate-400 line-clamp-3 leading-relaxed mb-4">
                  ${post.summary}
                </p>
              </div>
              <div class="flex items-center justify-between text-[11px] text-slate-500 pt-3 border-t border-slate-800">
                <span>By ${post.author_name}</span>
                <span>${post.read_time}</span>
              </div>
            </div>
          </article>
        `).join("")}
      </div>
    </section>` : ''}

    <!-- Latest Articles Feed Grid -->
    <section>
      <div class="flex items-center justify-between mb-6 border-b border-slate-800 pb-3">
        <h2 class="text-xl font-bold text-white flex items-center space-x-2">
          <span>Latest News Stories</span>
        </h2>
        <span class="text-xs text-slate-400">Live feed updated in real-time</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        ${allPosts.map(post => `
          <article class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition flex flex-col group">
            <a href="/article/${post.slug}" class="block relative h-48 overflow-hidden">
              <img src="${post.featured_image || 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800'}" alt="${post.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
              <span class="absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white shadow" style="background-color: ${post.category_color || '#4f46e5'}">
                ${post.category_name}
              </span>
            </a>
            <div class="p-5 flex-1 flex flex-col justify-between">
              <div>
                <a href="/article/${post.slug}">
                  <h3 class="font-bold text-base text-slate-100 group-hover:text-indigo-300 transition line-clamp-2 leading-snug mb-2">
                    ${post.title}
                  </h3>
                </a>
                <p class="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                  ${post.summary}
                </p>
              </div>
              <div class="flex items-center justify-between text-[11px] text-slate-500 pt-3 border-t border-slate-800/80">
                <div class="flex items-center space-x-2">
                  <img src="${post.author_avatar}" class="w-4 h-4 rounded-full">
                  <span>${post.author_name}</span>
                </div>
                <span>${post.read_time}</span>
              </div>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;

  return c.html(layout("Home", content, "/"));
});

// 2. SINGLE ARTICLE DETAIL PAGE ROUTE
frontendRouter.get("/article/:slug", (c) => {
  const slug = c.req.param("slug");
  const post = db.query(`
    SELECT p.*, c.name as category_name, c.color as category_color, c.slug as category_slug
    FROM posts p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.slug = ?
  `).get(slug) as any;

  if (!post) {
    return c.html(layout("Article Not Found", `<div class="text-center py-20"><h1 class="text-2xl font-bold">404 - Article Not Found</h1><a href="/" class="text-indigo-400 mt-4 inline-block">Return to Homepage</a></div>`));
  }

  // Increment views
  db.query("UPDATE posts SET views = views + 1 WHERE id = ?").run(post.id);

  // Must Read Next
  const related = db.query(`
    SELECT p.*, c.name as category_name, c.color as category_color 
    FROM posts p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id != ? AND p.status = 'published'
    LIMIT 3
  `).all(post.id) as any[];

  const content = `
    <!-- Breadcrumb -->
    <nav class="flex items-center space-x-2 text-xs text-slate-400 mb-6">
      <a href="/" class="hover:text-indigo-400">Home</a>
      <span>/</span>
      <a href="/category/${post.category_slug}" class="hover:text-indigo-400">${post.category_name}</a>
      <span>/</span>
      <span class="text-slate-500 truncate max-w-xs">${post.title}</span>
    </nav>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-10">
      
      <!-- Sticky Social Sharing Bar (Col 1 on desktop) -->
      <div class="hidden lg:block lg:col-span-1">
        <div class="sticky top-28 flex flex-col items-center space-y-3 bg-slate-900/60 p-2.5 rounded-2xl border border-slate-800">
          <a href="https://t.me/share/url?url=${encodeURIComponent('https://thechronicle.news/article/' + post.slug)}&text=${encodeURIComponent(post.title)}" target="_blank" class="w-8 h-8 rounded-xl bg-sky-500/10 hover:bg-sky-500 text-sky-400 hover:text-white flex items-center justify-center transition" title="Share to Telegram">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>
          </a>
          <button onclick="navigator.clipboard.writeText(window.location.href); alert('Link copied to clipboard!');" class="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition" title="Copy Link">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
          </button>
          <div class="w-4 border-t border-slate-800 my-1"></div>
          <button onclick="changeFontSize(1)" class="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition" title="Increase text size">A+</button>
          <button onclick="changeFontSize(-1)" class="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition" title="Decrease text size">A-</button>
        </div>
      </div>

      <!-- Main Article Column (Col 8) -->
      <article class="lg:col-span-8">
        
        <!-- Header & Category -->
        <div class="mb-4">
          <span class="px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider text-white shadow" style="background-color: ${post.category_color || '#4f46e5'}">
            ${post.category_name}
          </span>
        </div>

        <h1 class="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight mb-4">
          ${post.title}
        </h1>

        <p class="text-lg text-slate-300 font-normal leading-relaxed mb-6">
          ${post.summary}
        </p>

        <!-- Author Meta -->
        <div class="flex items-center justify-between border-y border-slate-800 py-3.5 mb-8 text-xs text-slate-400">
          <div class="flex items-center space-x-3">
            <img src="${post.author_avatar}" class="w-10 h-10 rounded-full border-2 border-slate-700">
            <div>
              <div class="font-bold text-slate-200 text-sm">${post.author_name}</div>
              <div class="text-[11px] text-slate-400">Published on ${new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
            </div>
          </div>
          <div class="flex items-center space-x-3">
            <span>⏱️ ${post.read_time}</span>
            <span>•</span>
            <span>👁️ ${post.views.toLocaleString()} views</span>
          </div>
        </div>

        <!-- Featured Hero Image -->
        ${post.featured_image ? `
        <figure class="mb-8 rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-xl">
          <img src="${post.featured_image}" alt="${post.title}" class="w-full max-h-[500px] object-cover">
          <figcaption class="p-3 text-[11px] text-slate-400 bg-slate-900/90 text-center italic border-t border-slate-800">
            Source & Photography credit: Editorial News Agency
          </figcaption>
        </figure>` : ''}

        <!-- Key Takeaways Box (Modern News UX) -->
        <div class="p-5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 mb-8 shadow-lg">
          <h4 class="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center space-x-2 mb-3">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            <span>Key Takeaways (សង្ខេបចំណុចសំខាន់ៗ)</span>
          </h4>
          <ul class="text-sm text-slate-200 space-y-2 list-disc list-inside leading-relaxed">
            <li>អត្ថបទនេះបង្ហាញពីការវិវឌ្ឍចុងក្រោយដែលជះឥទ្ធិពលផ្ទាល់ដល់វិស័យទាំងមូល។</li>
            <li>បច្ចេកវិទ្យាថ្មី និងដំណោះស្រាយ Edge កំពុងពន្លឿនល្បឿននៃការផ្តល់សេវា។</li>
            <li>អ្នកជំនាញណែនាំឱ្យមានការត្រៀមខ្លួនសម្រាប់ស្តង់ដារអន្តរជាតិនាពេលខាងមុខ។</li>
          </ul>
        </div>

        <!-- Article Body -->
        <div id="articleBodyText" class="text-base sm:text-lg text-slate-200 leading-relaxed space-y-6 prose prose-invert max-w-none">
          ${post.content}
        </div>

        <!-- Bottom Share & Tags -->
        <div class="mt-12 pt-6 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div class="flex items-center space-x-2 text-xs">
            <span class="text-slate-400">Tags:</span>
            <span class="px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono">#Digital</span>
            <span class="px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono">#News2026</span>
            <span class="px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono">#EdgeSpeed</span>
          </div>

          <a href="/admin" class="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1">
            <span>Edit this story in CMS</span>
            <span>&rarr;</span>
          </a>
        </div>
      </article>

      <!-- Right Sidebar (Col 3) -->
      <aside class="lg:col-span-3 space-y-8">
        
        <!-- Must Read Next -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4 pb-2 border-b border-slate-800">
            Must Read Next
          </h3>
          <div class="space-y-4">
            ${related.map(r => `
              <a href="/article/${r.slug}" class="block group">
                <span class="text-[10px] font-bold uppercase text-indigo-400 block mb-1">${r.category_name}</span>
                <h4 class="text-xs font-semibold text-slate-200 group-hover:text-indigo-300 transition line-clamp-2 leading-snug">
                  ${r.title}
                </h4>
                <span class="text-[10px] text-slate-500 mt-1 block">${r.read_time}</span>
              </a>
            `).join("")}
          </div>
        </div>

        <!-- Newsletter Subscription Card -->
        <div class="bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-500/20 rounded-2xl p-5 text-center">
          <div class="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-3">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
          </div>
          <h4 class="font-bold text-sm text-white mb-1">Morning Dispatch</h4>
          <p class="text-xs text-slate-400 mb-4">Get top stories delivered to your inbox every morning at 7 AM.</p>
          <form onsubmit="alert('Thank you for subscribing!'); return false;" class="space-y-2">
            <input type="email" required placeholder="Your email address" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500">
            <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg py-2 text-xs transition">Subscribe</button>
          </form>
        </div>

      </aside>

    </div>

    <script>
      let currentSize = 18;
      function changeFontSize(delta) {
        currentSize += delta * 2;
        if (currentSize < 14) currentSize = 14;
        if (currentSize > 26) currentSize = 26;
        document.getElementById('articleBodyText').style.fontSize = currentSize + 'px';
      }
    </script>
  `;

  return c.html(layout(post.title, content, `/article/${post.slug}`));
});

// 3. CATEGORY PAGE ROUTE
frontendRouter.get("/category/:slug", (c) => {
  const slug = c.req.param("slug");
  const category = db.query("SELECT * FROM categories WHERE slug = ?").get(slug) as any;

  if (!category) {
    return c.html(layout("Category Not Found", `<div class="text-center py-20"><h1 class="text-2xl font-bold">Category Not Found</h1></div>`));
  }

  const posts = db.query(`
    SELECT p.*, c.name as category_name, c.color as category_color, c.slug as category_slug
    FROM posts p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE c.slug = ? AND p.status = 'published'
    ORDER BY p.id DESC
  `).all(slug) as any[];

  const content = `
    <div class="mb-8 border-b border-slate-800 pb-5">
      <div class="flex items-center space-x-3">
        <span class="w-3 h-8 rounded-full" style="background-color: ${category.color}"></span>
        <h1 class="text-3xl font-black text-white">${category.name}</h1>
      </div>
      <p class="text-xs text-slate-400 mt-2">Showing all stories categorized under ${category.name}</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      ${posts.map(post => `
        <article class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition flex flex-col group">
          <a href="/article/${post.slug}" class="block relative h-48 overflow-hidden">
            <img src="${post.featured_image || 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800'}" alt="${post.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
          </a>
          <div class="p-5 flex-1 flex flex-col justify-between">
            <div>
              <a href="/article/${post.slug}">
                <h3 class="font-bold text-base text-slate-100 group-hover:text-indigo-300 transition line-clamp-2 leading-snug mb-2">
                  ${post.title}
                </h3>
              </a>
              <p class="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                ${post.summary}
              </p>
            </div>
            <div class="flex items-center justify-between text-[11px] text-slate-500 pt-3 border-t border-slate-800/80">
              <span>${post.author_name}</span>
              <span>${post.read_time}</span>
            </div>
          </div>
        </article>
      `).join("")}
    </div>
  `;

  return c.html(layout(category.name, content, `/category/${slug}`));
});
