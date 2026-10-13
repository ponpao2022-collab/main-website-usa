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

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | THE CHRONICLE DIGITAL</title>
  <script src="https://www.gstatic.com/antigravity/web/dev/tailwindcss.min.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Battambang:wght@400;700&family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
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
    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .no-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased selection:bg-rose-500 selection:text-white">

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

      <!-- Primary Navigation (Desktop) -->
      <nav class="hidden lg:flex items-center space-x-6">
        <a href="/" class="text-sm font-semibold tracking-wide transition ${currentPath === '/' ? 'text-rose-400 font-bold' : 'text-slate-300 hover:text-white'}">HOME</a>
        <a href="/news" class="text-sm font-semibold tracking-wide transition ${currentPath.startsWith('/news') ? 'text-rose-400 font-bold' : 'text-slate-300 hover:text-white'}">NEWS</a>
        <a href="/about-us" class="text-sm font-semibold tracking-wide transition ${currentPath === '/about-us' ? 'text-rose-400 font-bold' : 'text-slate-300 hover:text-white'}">About Us</a>
        <a href="/contact-us" class="text-sm font-semibold tracking-wide transition ${currentPath === '/contact-us' ? 'text-rose-400 font-bold' : 'text-slate-300 hover:text-white'}">Contact Us</a>
        <a href="/privacy-policy" class="text-sm font-semibold tracking-wide transition ${currentPath === '/privacy-policy' ? 'text-rose-400 font-bold' : 'text-slate-300 hover:text-white'}">Privacy Policy</a>
        <a href="/terms-and-conditions" class="text-sm font-semibold tracking-wide transition ${currentPath === '/terms-and-conditions' ? 'text-rose-400 font-bold' : 'text-slate-300 hover:text-white'}">Terms & Conditions</a>
      </nav>

      <!-- Right Header Actions -->
      <div class="flex items-center space-x-3">
        <a href="/admin" class="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm shadow-indigo-600/30 flex items-center space-x-1.5">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          <span>CMS Panel</span>
        </a>
      </div>
    </div>

    <!-- Mobile Nav Bar (Horizontal Scrollable) -->
    <div class="lg:hidden flex items-center space-x-4 overflow-x-auto py-2.5 px-4 border-t border-slate-800/80 text-xs no-scrollbar bg-slate-900/60">
      <a href="/" class="whitespace-nowrap font-semibold ${currentPath === '/' ? 'text-rose-400 font-bold' : 'text-slate-300'}">HOME</a>
      <a href="/news" class="whitespace-nowrap font-semibold ${currentPath.startsWith('/news') ? 'text-rose-400 font-bold' : 'text-slate-300'}">NEWS</a>
      <a href="/about-us" class="whitespace-nowrap font-semibold ${currentPath === '/about-us' ? 'text-rose-400 font-bold' : 'text-slate-300'}">About Us</a>
      <a href="/contact-us" class="whitespace-nowrap font-semibold ${currentPath === '/contact-us' ? 'text-rose-400 font-bold' : 'text-slate-300'}">Contact Us</a>
      <a href="/privacy-policy" class="whitespace-nowrap font-semibold ${currentPath === '/privacy-policy' ? 'text-rose-400 font-bold' : 'text-slate-300'}">Privacy Policy</a>
      <a href="/terms-and-conditions" class="whitespace-nowrap font-semibold ${currentPath === '/terms-and-conditions' ? 'text-rose-400 font-bold' : 'text-slate-300'}">Terms & Conditions</a>
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
          High-performance digital journalism engineered with NextGen CMS, Edge Caching, and Sub-second Global Delivery.
        </p>
      </div>

      <div>
        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">Site Navigation</h4>
        <ul class="space-y-2 text-xs">
          <li><a href="/" class="hover:text-rose-400 transition">HOME</a></li>
          <li><a href="/news" class="hover:text-rose-400 transition">NEWS</a></li>
          <li><a href="/about-us" class="hover:text-rose-400 transition">About Us</a></li>
          <li><a href="/contact-us" class="hover:text-rose-400 transition">Contact Us</a></li>
          <li><a href="/privacy-policy" class="hover:text-rose-400 transition">Privacy Policy</a></li>
          <li><a href="/terms-and-conditions" class="hover:text-rose-400 transition">Terms & Conditions</a></li>
        </ul>
      </div>

      <div>
        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">Categories</h4>
        <ul class="space-y-2 text-xs">
          ${categories.map(c => `<li><a href="/category/${c.slug}" class="hover:text-indigo-400 transition">${c.name}</a></li>`).join("")}
        </ul>
      </div>

      <div class="space-y-2 text-xs">
        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-200 mb-2">NextGen Publishing</h4>
        <div class="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-300">
          <div class="flex justify-between items-center mb-1">
            <span>Editor Engine:</span>
            <span class="text-emerald-400 font-bold">TK Summary v2.5</span>
          </div>
          <div class="flex justify-between items-center text-[11px] text-slate-400">
            <span>Delivery:</span>
            <span class="font-mono text-emerald-400">Hostinger VPS + Edge</span>
          </div>
        </div>
        <div class="pt-2">
          <a href="/admin/new" class="inline-flex items-center space-x-1 text-xs text-indigo-400 hover:text-indigo-300">
            <span>+ Write & Publish Article</span>
            <span>&rarr;</span>
          </a>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 lg:px-8 border-t border-slate-800 pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500">
      <div>© 2026 The Chronicle Digital Media. All rights reserved.</div>
      <div class="mt-2 sm:mt-0 flex space-x-4">
        <a href="/privacy-policy" class="hover:text-slate-400">Privacy Policy</a>
        <span>•</span>
        <a href="/terms-and-conditions" class="hover:text-slate-400">Terms & Conditions</a>
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

  let content = "";

  if (!featured && allPosts.length === 0) {
    // Beautiful clean welcome banner when database is empty
    content = `
      <section class="max-w-4xl mx-auto py-16 px-4 text-center">
        <div class="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-rose-500/20 via-indigo-500/20 to-blue-500/20 border border-slate-800 text-rose-400 mb-6 shadow-2xl">
          <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg>
        </div>
        <h1 class="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4">Welcome to The Chronicle Digital</h1>
        <p class="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed mb-8">
          The database has been cleanly reset and the news platform is ready for your fresh editorial content. Publish articles instantly using the NextGen CMS with TK Summary AI formatting.
        </p>
        <div class="flex flex-wrap items-center justify-center gap-4">
          <a href="/admin/new" class="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-xl shadow-emerald-500/20 flex items-center space-x-2 transition transform hover:-translate-y-0.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            <span>Publish Your First Article in CMS</span>
          </a>
          <a href="/about-us" class="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold text-sm transition">
            <span>Learn About Us</span>
          </a>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 text-left">
          <div class="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div class="text-rose-400 font-bold text-base mb-1">⚡ Sub-Second Speed</div>
            <p class="text-xs text-slate-400">Powered by Bun runtime and high-speed SQLite.</p>
          </div>
          <div class="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div class="text-indigo-400 font-bold text-base mb-1">🤖 TK Summary AI</div>
            <p class="text-xs text-slate-400">15 professional media editorial styles built in.</p>
          </div>
          <div class="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div class="text-emerald-400 font-bold text-base mb-1">🚀 1-Click Publish</div>
            <p class="text-xs text-slate-400">Deploy directly to web readers with instant cache purge.</p>
          </div>
          <div class="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div class="text-amber-400 font-bold text-base mb-1">📱 Fully Responsive</div>
            <p class="text-xs text-slate-400">Optimized reading experience across desktop and mobile.</p>
          </div>
        </div>
      </section>
    `;
  } else {
    content = `
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
                  <img src="${featured.author_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}" class="w-6 h-6 rounded-full border border-slate-700">
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
                <img src="${post.featured_image || 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800'}" alt="${post.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
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
                    <img src="${post.author_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}" class="w-4 h-4 rounded-full">
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
  }

  return c.html(layout("Home", content, "/"));
});

// 2. NEWS FEED PAGE ROUTE (/news)
frontendRouter.get("/news", (c) => {
  const posts = db.query(`
    SELECT p.*, c.name as category_name, c.color as category_color, c.slug as category_slug
    FROM posts p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.status = 'published'
    ORDER BY p.id DESC
  `).all() as any[];

  const content = `
    <div class="mb-8 border-b border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div class="flex items-center space-x-3">
          <span class="w-3 h-8 rounded-full bg-rose-600"></span>
          <h1 class="text-3xl font-black text-white">All News & Dispatches</h1>
        </div>
        <p class="text-xs text-slate-400 mt-2">Comprehensive coverage from our editorial newsroom across all beats</p>
      </div>

      <div class="flex items-center space-x-2 text-xs">
        <a href="/admin/new" class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition flex items-center space-x-1">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          <span>Write Story</span>
        </a>
      </div>
    </div>

    ${posts.length === 0 ? `
      <div class="text-center py-20 bg-slate-900/40 rounded-3xl border border-slate-800 p-8 max-w-2xl mx-auto">
        <div class="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg>
        </div>
        <h3 class="text-lg font-bold text-white mb-2">No News Articles Published Yet</h3>
        <p class="text-xs text-slate-400 mb-6">Articles published from the NextGen CMS will immediately appear here for your audience.</p>
        <a href="/admin/new" class="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition inline-flex items-center space-x-1.5">
          <span>🚀 Publish First Article</span>
        </a>
      </div>
    ` : `
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        ${posts.map(post => `
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
                <span>By ${post.author_name}</span>
                <span>${post.read_time}</span>
              </div>
            </div>
          </article>
        `).join("")}
      </div>
    `}
  `;

  return c.html(layout("News", content, "/news"));
});

// 3. ABOUT US PAGE ROUTE (/about-us)
frontendRouter.get("/about-us", (c) => {
  const content = `
    <div class="max-w-4xl mx-auto py-8">
      <!-- Breadcrumb -->
      <nav class="flex items-center space-x-2 text-xs text-slate-400 mb-6">
        <a href="/" class="hover:text-indigo-400">Home</a>
        <span>/</span>
        <span class="text-slate-200">About Us</span>
      </nav>

      <div class="border-b border-slate-800 pb-6 mb-8">
        <span class="text-xs font-bold uppercase tracking-widest text-rose-400">Editorial Mission & Organization</span>
        <h1 class="text-3xl sm:text-5xl font-black text-white tracking-tight mt-2">About The Chronicle Digital</h1>
        <p class="text-base sm:text-lg text-slate-300 mt-4 leading-relaxed">
          The Chronicle is an independent global news agency committed to accurate, verified, and rapid digital journalism.
        </p>
      </div>

      <div class="space-y-10 text-slate-300 text-sm sm:text-base leading-relaxed">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
          <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800">
            <div class="text-2xl font-black text-rose-500 mb-2">100%</div>
            <div class="text-xs uppercase font-bold text-white tracking-wider mb-1">Editorial Independence</div>
            <p class="text-xs text-slate-400">Zero corporate or political alignment. Rigorous fact-checking on every dispatch.</p>
          </div>
          <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800">
            <div class="text-2xl font-black text-indigo-400 mb-2">&lt; 20ms</div>
            <div class="text-xs uppercase font-bold text-white tracking-wider mb-1">Global Edge Delivery</div>
            <p class="text-xs text-slate-400">Cached globally across 310+ Cloudflare edge points for instant load times.</p>
          </div>
          <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800">
            <div class="text-2xl font-black text-emerald-400 mb-2">24 / 7</div>
            <div class="text-xs uppercase font-bold text-white tracking-wider mb-1">Continuous Monitoring</div>
            <p class="text-xs text-slate-400">Breaking news desk delivering verified alerts in real time.</p>
          </div>
        </div>

        <section class="space-y-4">
          <h2 class="text-xl sm:text-2xl font-bold text-white">Our Journalistic Principles</h2>
          <p>
            Founded on the pillars of transparency, verifiability, and fearless reporting, The Chronicle delivers deep-dive investigative pieces, wire dispatches, and breaking developments. We believe that informed societies require objective, unbiased facts delivered at modern digital speed.
          </p>
          <p>
            Our newsroom adheres strictly to the Society of Professional Journalists (SPJ) Code of Ethics: seeking truth and reporting it, minimizing harm, acting independently, and remaining accountable and transparent to our readership.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl sm:text-2xl font-bold text-white">NextGen Newsroom Technology</h2>
          <p>
            Media technology should never hinder journalistic storytelling. Our custom-engineered publishing stack is built on Bun, SQLite, and modern edge infrastructure to ensure that stories publish within milliseconds and load effortlessly on any device or network bandwidth.
          </p>
        </section>

        <section class="space-y-4 border-t border-slate-800 pt-8">
          <h2 class="text-xl sm:text-2xl font-bold text-white">Editorial Leadership</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center space-x-4">
              <div class="w-12 h-12 rounded-xl bg-indigo-600/30 text-indigo-400 font-bold flex items-center justify-center text-base">ED</div>
              <div>
                <div class="font-bold text-white text-sm">Editorial Board</div>
                <div class="text-xs text-slate-400">The Chronicle Newsroom</div>
                <div class="text-[11px] text-slate-500">editor@thechronicle.news</div>
              </div>
            </div>
            <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center space-x-4">
              <div class="w-12 h-12 rounded-xl bg-rose-600/30 text-rose-400 font-bold flex items-center justify-center text-base">DC</div>
              <div>
                <div class="font-bold text-white text-sm">Washington Bureau</div>
                <div class="text-xs text-slate-400">National & Policy Coverage</div>
                <div class="text-[11px] text-slate-500">dc.bureau@thechronicle.news</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  `;

  return c.html(layout("About Us", content, "/about-us"));
});

// 4. CONTACT US PAGE ROUTE (/contact-us)
frontendRouter.get("/contact-us", (c) => {
  const content = `
    <div class="max-w-4xl mx-auto py-8">
      <!-- Breadcrumb -->
      <nav class="flex items-center space-x-2 text-xs text-slate-400 mb-6">
        <a href="/" class="hover:text-indigo-400">Home</a>
        <span>/</span>
        <span class="text-slate-200">Contact Us</span>
      </nav>

      <div class="border-b border-slate-800 pb-6 mb-8">
        <span class="text-xs font-bold uppercase tracking-widest text-indigo-400">Get in Touch</span>
        <h1 class="text-3xl sm:text-5xl font-black text-white tracking-tight mt-2">Contact Our Newsroom</h1>
        <p class="text-base sm:text-lg text-slate-300 mt-4 leading-relaxed">
          Submit news tips, press releases, editorial feedback, or general inquiries to our 24/7 editorial desk.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-12 gap-8">
        <!-- Contact Information (Col 5) -->
        <div class="md:col-span-5 space-y-6">
          <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 class="font-bold text-white text-base">Direct Channels</h3>
            
            <div class="space-y-3 text-xs">
              <div>
                <span class="text-slate-400 block">News Tips & Breaking Leaks:</span>
                <span class="text-rose-400 font-mono font-semibold">tips@thechronicle.news</span>
              </div>
              <div>
                <span class="text-slate-400 block">Press Releases:</span>
                <span class="text-slate-200 font-mono">press@thechronicle.news</span>
              </div>
              <div>
                <span class="text-slate-400 block">Corrections & Ethics:</span>
                <span class="text-slate-200 font-mono">ethics@thechronicle.news</span>
              </div>
              <div>
                <span class="text-slate-400 block">Syndication & Licensing:</span>
                <span class="text-slate-200 font-mono">syndication@thechronicle.news</span>
              </div>
            </div>
          </div>

          <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <h3 class="font-bold text-white text-base">Headquarters Bureau</h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              The Chronicle Digital Media<br>
              1200 Pennsylvania Avenue NW<br>
              Washington, D.C. 20004<br>
              United States
            </p>
          </div>
        </div>

        <!-- Contact Form (Col 7) -->
        <div class="md:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8">
          <h3 class="font-bold text-lg text-white mb-2">Send an Editorial Message</h3>
          <p class="text-xs text-slate-400 mb-6">Fill in the form below and your message will route directly to the relevant editorial desk.</p>

          <form onsubmit="alert('Thank you! Your inquiry has been dispatched to our newsroom.'); return false;" class="space-y-4 text-xs">
            <div>
              <label class="block font-semibold text-slate-300 mb-1.5">Your Name</label>
              <input type="text" required placeholder="Full Name" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500">
            </div>

            <div>
              <label class="block font-semibold text-slate-300 mb-1.5">Email Address</label>
              <input type="email" required placeholder="email@example.com" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500">
            </div>

            <div>
              <label class="block font-semibold text-slate-300 mb-1.5">Inquiry Topic</label>
              <select class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500">
                <option>News Tip / Confidential Information</option>
                <option>Story Correction Request</option>
                <option>Press Release Submission</option>
                <option>Editorial Feedback</option>
                <option>General Media Inquiry</option>
              </select>
            </div>

            <div>
              <label class="block font-semibold text-slate-300 mb-1.5">Message / Story Details</label>
              <textarea rows="5" required placeholder="Provide details, sources, or documents..." class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"></textarea>
            </div>

            <button type="submit" class="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition shadow-lg shadow-indigo-600/20">
              Submit Message to Editors
            </button>
          </form>
        </div>
      </div>
    </div>
  `;

  return c.html(layout("Contact Us", content, "/contact-us"));
});

// 5. PRIVACY POLICY PAGE ROUTE (/privacy-policy)
frontendRouter.get("/privacy-policy", (c) => {
  const content = `
    <div class="max-w-4xl mx-auto py-8">
      <!-- Breadcrumb -->
      <nav class="flex items-center space-x-2 text-xs text-slate-400 mb-6">
        <a href="/" class="hover:text-indigo-400">Home</a>
        <span>/</span>
        <span class="text-slate-200">Privacy Policy</span>
      </nav>

      <div class="border-b border-slate-800 pb-6 mb-8">
        <span class="text-xs font-bold uppercase tracking-widest text-emerald-400">Legal Compliance</span>
        <h1 class="text-3xl sm:text-5xl font-black text-white tracking-tight mt-2">Privacy Policy</h1>
        <p class="text-xs text-slate-400 mt-3">Last updated: October 13, 2026</p>
      </div>

      <div class="space-y-8 text-slate-300 text-sm sm:text-base leading-relaxed">
        <section class="space-y-3">
          <h2 class="text-lg sm:text-xl font-bold text-white">1. Introduction</h2>
          <p>
            The Chronicle Digital Media ("we," "our," or "us") respects your privacy and is dedicated to protecting personal information collected through our website, mobile interfaces, and digital services (collectively, the "Services"). This Privacy Policy explains our practices regarding collection, use, and disclosure of your data.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-lg sm:text-xl font-bold text-white">2. Information We Collect</h2>
          <ul class="list-disc list-inside space-y-2 text-slate-300 pl-2">
            <li><strong>Usage Information:</strong> Device type, browser user-agent, operating system, IP address, page views, and reading timestamps to deliver optimized edge caching.</li>
            <li><strong>Voluntarily Provided Information:</strong> When you subscribe to our newsletter or contact our newsroom, we collect your name, email address, and inquiry text.</li>
            <li><strong>Cookies & Session Identifiers:</strong> We utilize essential technical cookies to ensure sub-second global caching and security compliance.</li>
          </ul>
        </section>

        <section class="space-y-3">
          <h2 class="text-lg sm:text-xl font-bold text-white">3. How We Use Information</h2>
          <p>
            Collected information is utilized strictly to provide, maintain, and optimize news delivery, analyze readership traffic trends, safeguard our digital infrastructure against DDoS attacks, and communicate with readers who have requested news updates. We do not sell or monetize personal data to third-party data brokers.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-lg sm:text-xl font-bold text-white">4. California Consumer Privacy Act (CCPA)</h2>
          <p>
            If you are a California resident, you have the right to request access to the personal information we maintain, request deletion of your information, and opt-out of any future data sharing. To exercise these rights, please email our compliance desk at <span class="text-indigo-400 font-mono">privacy@thechronicle.news</span>.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-lg sm:text-xl font-bold text-white">5. European Union (GDPR) Compliance</h2>
          <p>
            Readers within the European Economic Area (EEA) have legal rights regarding data access, rectification, portability, and erasure under GDPR. Our lawful basis for processing technical metrics is legitimate interest in delivering secure, rapid journalism.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-lg sm:text-xl font-bold text-white">6. Contact Our Data Protection Officer</h2>
          <p>
            If you have questions regarding this policy or our data protection safeguards, contact us at:
            <br>
            <strong class="text-white">Email:</strong> privacy@thechronicle.news<br>
            <strong class="text-white">Address:</strong> The Chronicle Digital Media, Attn: Legal & Privacy Bureau, 1200 Pennsylvania Ave NW, Washington, D.C. 20004
          </p>
        </section>
      </div>
    </div>
  `;

  return c.html(layout("Privacy Policy", content, "/privacy-policy"));
});

// 6. TERMS & CONDITIONS PAGE ROUTE (/terms-and-conditions)
frontendRouter.get("/terms-and-conditions", (c) => {
  const content = `
    <div class="max-w-4xl mx-auto py-8">
      <!-- Breadcrumb -->
      <nav class="flex items-center space-x-2 text-xs text-slate-400 mb-6">
        <a href="/" class="hover:text-indigo-400">Home</a>
        <span>/</span>
        <span class="text-slate-200">Terms & Conditions</span>
      </nav>

      <div class="border-b border-slate-800 pb-6 mb-8">
        <span class="text-xs font-bold uppercase tracking-widest text-amber-400">Reader Agreement</span>
        <h1 class="text-3xl sm:text-5xl font-black text-white tracking-tight mt-2">Terms and Conditions of Use</h1>
        <p class="text-xs text-slate-400 mt-3">Effective Date: October 13, 2026</p>
      </div>

      <div class="space-y-8 text-slate-300 text-sm sm:text-base leading-relaxed">
        <section class="space-y-3">
          <h2 class="text-lg sm:text-xl font-bold text-white">1. Acceptance of Terms</h2>
          <p>
            By accessing or browsing The Chronicle Digital ("the Service"), you agree to be bound by these Terms and Conditions and all applicable laws and regulations. If you do not agree with any part of these terms, you are prohibited from using or accessing this site.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-lg sm:text-xl font-bold text-white">2. Intellectual Property & Copyright</h2>
          <p>
            All content published on this website—including articles, headlines, investigative summaries, graphics, audio, logos, and software code—is the property of The Chronicle Digital Media or licensed content partners, protected by international copyright, trademark, and intellectual property laws.
          </p>
          <p class="text-xs text-slate-400 bg-slate-900 p-4 rounded-xl border border-slate-800">
            <strong>Fair Use & Quotation:</strong> Brief excerpts of articles (up to 100 words) may be quoted with prominent attribution and a direct hyperlink to the original article URL on The Chronicle. Full reproduction or automated scraping without written consent is strictly prohibited.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-lg sm:text-xl font-bold text-white">3. User Conduct and Newsroom Ethics</h2>
          <p>
            When submitting news tips, letters to the editor, or interacting with our platform, you agree not to submit fraudulent, defamatory, or unlawful materials. We reserve the right to verify credentials and sources prior to publication.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-lg sm:text-xl font-bold text-white">4. Editorial Disclaimers</h2>
          <p>
            While our journalists strive for impeccable accuracy, news stories represent reporting based on verified information available at publication time. Material on this website is provided for informational and journalistic purposes only and does not constitute formal financial, legal, or medical counsel.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-lg sm:text-xl font-bold text-white">5. Governing Law</h2>
          <p>
            These terms are governed by and construed in accordance with the laws of the District of Columbia and the United States, without regard to conflict of law provisions.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-lg sm:text-xl font-bold text-white">6. Inquiries Regarding Terms</h2>
          <p>
            For licensing requests, syndication agreements, or legal notices, contact our counsel at:
            <br>
            <span class="text-indigo-400 font-mono">legal@thechronicle.news</span>
          </p>
        </section>
      </div>
    </div>
  `;

  return c.html(layout("Terms & Conditions", content, "/terms-and-conditions"));
});

// 7. SINGLE ARTICLE DETAIL PAGE ROUTE
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
      <a href="/news" class="hover:text-indigo-400">News</a>
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
            <img src="${post.author_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}" class="w-10 h-10 rounded-full border-2 border-slate-700">
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
        <div class="rounded-2xl overflow-hidden mb-8 border border-slate-800 shadow-2xl">
          <img src="${post.featured_image}" alt="${post.title}" class="w-full max-h-[500px] object-cover">
        </div>` : ''}

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
            ${related.length === 0 ? `<p class="text-xs text-slate-500">More stories coming soon.</p>` : related.map(r => `
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

// 8. CATEGORY PAGE ROUTE
frontendRouter.get("/category/:slug", (c) => {
  const slug = c.req.param("slug");
  const category = db.query("SELECT * FROM categories WHERE slug = ?").get(slug) as any;

  if (!category) {
    return c.html(layout("Category Not Found", `<div class="text-center py-20"><h1 class="text-2xl font-bold">Category Not Found</h1><a href="/" class="text-indigo-400 mt-4 inline-block">Return to Homepage</a></div>`));
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

    ${posts.length === 0 ? `
      <div class="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800 p-8 max-w-xl mx-auto">
        <p class="text-slate-400 text-sm mb-4">No stories published in this category yet.</p>
        <a href="/admin/new" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition inline-flex items-center space-x-1">
          <span>+ Write First ${category.name} Story</span>
        </a>
      </div>
    ` : `
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
    `}
  `;

  return c.html(layout(category.name, content, `/category/${slug}`));
});
