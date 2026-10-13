import { Hono } from "hono";
import { db } from "../db/index";

export const frontendRouter = new Hono();

// Ultra-High Speed Edge Cache-Control:
// Allows Cloudflare Edge (310+ global locations) to cache rendered HTML, delivering pages in <25ms!
// Browser max-age=0 ensures visitors never see stale or deleted posts on their phones.
frontendRouter.use("*", async (c, next) => {
  await next();
  if (c.req.method === "GET" || c.req.method === "HEAD") {
    if (c.res.status === 301 || c.res.status === 302) {
      // 302 Short link: Never cache in browser or edge so click counts are always fresh
      c.res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
      c.res.headers.set("CDN-Cache-Control", "no-store");
      c.res.headers.set("Cloudflare-CDN-Cache-Control", "no-store");
    } else {
      // HTML Pages (Homepage, Category, Articles):
      // Browser: max-age=0, must-revalidate (phone browser always checks with Edge, never shows deleted posts)
      // Edge CDN: s-maxage=60, stale-while-revalidate=300 (Cloudflare Edge responds in <25ms globally)
      c.res.headers.set("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=300, must-revalidate");
      c.res.headers.set("CDN-Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
      c.res.headers.set("Cloudflare-CDN-Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    }
  }
});

// Helper: Format Article with Read More strictly after Paragraph 2 with Smooth Blur & Balanced Justified Text
function formatArticleWithReadMore(content: string) {
  const pRegex = /<p[\s\S]*?<\/p>/gi;
  const paragraphs = content.match(pRegex);

  if (!paragraphs || paragraphs.length <= 2) {
    return `
      <div id="articleBodyText" class="article-prose text-base sm:text-lg text-[#2B2926] leading-relaxed space-y-6 max-w-none font-normal article-justified">
        ${content}
      </div>
    `;
  }

  // Paragraph 1 & 2 (Fully Visible, 100% Crisp & Balanced Justified)
  const para1And2 = paragraphs.slice(0, 2).join("\n");
  // Paragraph 3 onwards (Collapsible with Progressive Gradient Blur - No Sharp Cut-off Line)
  const remainingParas = paragraphs.slice(2).join("\n");

  return `
    <div id="articleBodyText" class="article-prose text-base sm:text-lg text-[#2B2926] leading-relaxed space-y-6 max-w-none font-normal">
      <!-- Paragraphs 1 & 2 (Fully Visible, Crisp, Justified) -->
      <div class="space-y-6 article-justified">
        ${para1And2}
      </div>

      <!-- Collapsible Section Strictly Starting After Paragraph 2 (100% Smooth Transparent Fade, Zero Hard Line) -->
      <div class="relative mt-6">
        <!-- Container for Paragraph 3 Onwards with Smooth CSS Gradient Mask -->
        <div id="articleRestContainer" class="max-h-[140px] overflow-hidden relative transition-all duration-700 ease-in-out" style="-webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 25%, rgba(0,0,0,0.2) 70%, rgba(0,0,0,0) 100%); mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 25%, rgba(0,0,0,0.2) 70%, rgba(0,0,0,0) 100%);">
          <div class="space-y-6 article-justified">
            ${remainingParas}
          </div>
        </div>

        <!-- 100% Matching Terracotta Circle Button & Pure Gradient Fade (Zero Backdrop Blur, Zero Line) -->
        <div id="readMoreOverlay" class="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#FAF9F5] from-30% via-[#FAF9F5]/85 via-65% to-transparent flex flex-col items-center justify-end pb-1 pt-4 transition-all duration-500 z-20 pointer-events-auto">
          <button onclick="revealFullArticle()" type="button" class="group flex flex-col items-center focus:outline-none cursor-pointer select-none">
            <div class="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#C25E3E] hover:bg-[#B05335] text-white flex items-center justify-center shadow-xl shadow-[#C25E3E]/30 transition-all duration-300 transform group-hover:scale-110 active:scale-95 mb-2">
              <svg class="w-6 h-6 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <span class="font-black text-sm sm:text-base tracking-widest text-[#C25E3E] uppercase">READ MORE</span>
            <span class="text-xs text-[#C25E3E]/85 font-medium mt-0.5">Continue reading the full story!</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

// Helper: Common HTML Layout Wrapper in Claude AI Light Mode (60-30-10 Rule)
function layout(title: string, content: string, currentPath = "/") {
  const categories = db.query("SELECT * FROM categories ORDER BY id ASC").all() as any[];
  const breaking = db.query("SELECT title, slug FROM posts WHERE is_breaking = 1 AND status = 'published' ORDER BY id DESC LIMIT 5").all() as any[];

  const breakingTickerHtml = breaking.map(b => `
    <a href="/article/${b.slug}" class="hover:underline flex items-center space-x-2 flex-shrink-0 text-[#2B2926]">
      <span class="w-1.5 h-1.5 rounded-full bg-[#C25E3E] inline-block"></span>
      <span class="hover:text-[#C25E3E] transition">${b.title}</span>
    </a>
  `).join(`<span class="text-[#D3D0C8] px-3">•</span>`);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | USA NEWS STORY</title>
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/assets/favicon-16x16.png">
  <link rel="preload" href="/assets/logo-sm.webp" as="image" type="image/webp">
  <link rel="preload" href="/assets/tailwindcss.min.js" as="script">
  <script src="/assets/tailwindcss.min.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Battambang:wght@400;700&family=Newsreader:opsz,wght@6..72,600;6..72,700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    body { 
      font-family: 'Inter', 'Battambang', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: #FAF9F5; /* 60% Dominant Claude Light Canvas */
      color: #1F1E1B;            /* 30% Structural Contrast Typography */
    }
    .font-headline {
      font-family: 'Newsreader', Georgia, serif;
    }
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
    /* Smooth gradient blur without hard cut-off line */
    .readmore-blur-box {
      -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 35%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0) 100%);
      mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 35%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0) 100%);
    }
    .readmore-blur-box.expanded {
      max-height: none !important;
      -webkit-mask-image: none !important;
      mask-image: none !important;
    }

    /* Mobile Menu Hamburger-to-X Morph Animation */
    #mobileMenuToggleBtn .bar-line {
      display: block;
      width: 100%;
      height: 2px;
      background-color: #1C1B18;
      border-radius: 9999px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      transform-origin: center;
    }
    #mobileMenuToggleBtn.is-active .bar-line:nth-child(1) {
      transform: translateY(6px) rotate(45deg);
      background-color: #C25E3E;
    }
    #mobileMenuToggleBtn.is-active .bar-line:nth-child(2) {
      opacity: 0;
      transform: scaleX(0);
    }
    #mobileMenuToggleBtn.is-active .bar-line:nth-child(3) {
      transform: translateY(-6px) rotate(-45deg);
      background-color: #C25E3E;
    }

    /* Mobile Dropdown Panel Smooth Popup Overlay (Zero Layout Push) */
    #mobileNavPanel {
      max-height: 0;
      opacity: 0;
      overflow: hidden;
      transform: translateY(-8px);
      pointer-events: none;
      transition: max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease, transform 0.25s ease;
    }
    #mobileNavPanel.is-open {
      max-height: 550px;
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }

    /* Clean, Natural Balanced Justification (Zero unnatural stretched word gaps on mobile) */
    .article-justified,
    #articleBodyText,
    #articleRestContainer {
      text-align: justify;
      text-align-last: left;
      text-justify: inter-word;
      hyphens: auto;
      -webkit-hyphens: auto;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    .article-justified p,
    #articleBodyText p,
    #articleRestContainer p {
      text-align: justify;
      text-align-last: left;
      hyphens: auto;
      -webkit-hyphens: auto;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    @media (max-width: 640px) {
      .article-justified,
      .article-justified p,
      #articleBodyText,
      #articleRestContainer,
      #articleBodyText p,
      #articleRestContainer p {
        text-align: justify;
        text-align-last: left;
        text-justify: inter-word;
        hyphens: auto;
        -webkit-hyphens: auto;
        word-spacing: -0.015em;
        letter-spacing: -0.01em;
        line-height: 1.75;
      }
    }
  </style>
</head>
<body class="bg-[#FAF9F5] text-[#1F1E1B] min-h-screen flex flex-col antialiased selection:bg-[#C25E3E] selection:text-white">

  <!-- Main Brand Header (Claude Light 60-30-10 Palette) -->
  <header class="border-b border-[#EAE8E1] bg-white/95 backdrop-blur-md sticky top-0 z-40 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
    <div class="max-w-7xl mx-auto px-4 lg:px-8 py-3.5 flex items-center justify-between">
      
      <!-- Brand Logo & Name (USA NEWS STORY) -->
      <a href="/" class="flex items-center space-x-3 group">
        <!-- Official Statue of Liberty Emblem Logo -->
        <div class="h-10 w-10 sm:h-11 sm:w-11 rounded-full shadow-md shadow-blue-900/10 flex items-center justify-center group-hover:scale-105 transition transform flex-shrink-0">
          <img src="/assets/logo-sm.webp" class="w-full h-full object-contain rounded-full" alt="USA NEWS STORY Logo" width="44" height="44">
        </div>
        <div>
          <span class="text-xl md:text-2xl font-black tracking-tight text-[#1C1B18] block leading-none">USA NEWS STORY</span>
          <span class="text-[10px] tracking-widest text-[#6E6B63] uppercase font-semibold">American & Global Journalism</span>
        </div>
      </a>

      <!-- Primary Navigation (Desktop) -->
      <nav class="hidden lg:flex items-center space-x-7">
        <a href="/" class="text-sm font-semibold tracking-wide transition ${currentPath === '/' ? 'text-[#C25E3E] font-bold' : 'text-[#4A4742] hover:text-[#C25E3E]'}">HOME</a>
        <a href="/news" class="text-sm font-semibold tracking-wide transition ${currentPath.startsWith('/news') ? 'text-[#C25E3E] font-bold' : 'text-[#4A4742] hover:text-[#C25E3E]'}">NEWS</a>
        <a href="/about-us" class="text-sm font-semibold tracking-wide transition ${currentPath === '/about-us' ? 'text-[#C25E3E] font-bold' : 'text-[#4A4742] hover:text-[#C25E3E]'}">About Us</a>
        <a href="/contact-us" class="text-sm font-semibold tracking-wide transition ${currentPath === '/contact-us' ? 'text-[#C25E3E] font-bold' : 'text-[#4A4742] hover:text-[#C25E3E]'}">Contact Us</a>
        <a href="/privacy-policy" class="text-sm font-semibold tracking-wide transition ${currentPath === '/privacy-policy' ? 'text-[#C25E3E] font-bold' : 'text-[#4A4742] hover:text-[#C25E3E]'}">Privacy Policy</a>
        <a href="/terms-and-conditions" class="text-sm font-semibold tracking-wide transition ${currentPath === '/terms-and-conditions' ? 'text-[#C25E3E] font-bold' : 'text-[#4A4742] hover:text-[#C25E3E]'}">Terms & Conditions</a>
      </nav>

      <!-- Right Controls: Hamburger Menu Button (Mobile) -->
      <div class="flex items-center space-x-3">
        <!-- Mobile Animated Hamburger Menu Button (☰ ➔ ✕ Like Celeb BNews) -->
        <button type="button" id="mobileMenuToggleBtn" onclick="toggleMobileMenu()" class="lg:hidden p-2.5 rounded-xl text-[#1C1B18] hover:bg-[#F3F1EC] border border-[#E5E2D9] transition flex items-center justify-center focus:outline-none cursor-pointer" aria-label="Toggle Navigation Menu">
          <div class="w-5 h-3.5 relative flex flex-col justify-between" id="hamburgerBox">
            <span class="bar-line"></span>
            <span class="bar-line"></span>
            <span class="bar-line"></span>
          </div>
        </button>
      </div>
    </div>

    <!-- Mobile Navigation Panel (Popup / Floating Overlay - Does NOT push page down) -->
    <div id="mobileNavPanel" class="lg:hidden absolute top-full left-0 right-0 z-50 border-t border-[#33302A] bg-[#1F1E1B] text-white shadow-[-4px_20px_40px_rgba(0,0,0,0.5)]">
      <!-- Search Box (like Celeb BNews) -->
      <form action="/news" method="GET" class="p-4 pb-3 flex items-center gap-2 border-b border-[#2C2A26]">
        <input type="search" name="q" placeholder="Search news stories..." class="flex-1 bg-[#2D2B26] border border-[#3E3C36] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#8E8B83] focus:outline-none focus:border-[#C25E3E]">
        <button type="submit" class="px-4 py-2.5 bg-[#C25E3E] hover:bg-[#B05335] text-white text-xs font-bold rounded-xl transition shadow-sm">Go</button>
      </form>

      <nav class="flex flex-col text-sm font-semibold divide-y divide-[#2C2A26] py-1">
        <a href="/" class="flex items-center justify-between px-5 py-3 hover:bg-[#2D2B26] transition ${currentPath === '/' ? 'text-[#C25E3E] font-bold bg-[#2D2B26]/50' : 'text-slate-100'}">
          <span>Home</span>
          <svg class="w-3.5 h-3.5 text-[#6E6B63]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
        </a>
        <a href="/news" class="flex items-center justify-between px-5 py-3 hover:bg-[#2D2B26] transition ${currentPath.startsWith('/news') ? 'text-[#C25E3E] font-bold bg-[#2D2B26]/50' : 'text-slate-100'}">
          <span>News</span>
          <svg class="w-3.5 h-3.5 text-[#6E6B63]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
        </a>
        <a href="/about-us" class="flex items-center justify-between px-5 py-3 hover:bg-[#2D2B26] transition ${currentPath === '/about-us' ? 'text-[#C25E3E] font-bold bg-[#2D2B26]/50' : 'text-slate-100'}">
          <span>About Us</span>
          <svg class="w-3.5 h-3.5 text-[#6E6B63]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
        </a>
        <a href="/contact-us" class="flex items-center justify-between px-5 py-3 hover:bg-[#2D2B26] transition ${currentPath === '/contact-us' ? 'text-[#C25E3E] font-bold bg-[#2D2B26]/50' : 'text-slate-100'}">
          <span>Contact Us</span>
          <svg class="w-3.5 h-3.5 text-[#6E6B63]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
        </a>
        <a href="/privacy-policy" class="flex items-center justify-between px-5 py-3 hover:bg-[#2D2B26] transition ${currentPath === '/privacy-policy' ? 'text-[#C25E3E] font-bold bg-[#2D2B26]/50' : 'text-slate-100'}">
          <span>Privacy Policy</span>
          <svg class="w-3.5 h-3.5 text-[#6E6B63]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
        </a>
        <a href="/terms-and-conditions" class="flex items-center justify-between px-5 py-3 hover:bg-[#2D2B26] transition ${currentPath === '/terms-and-conditions' ? 'text-[#C25E3E] font-bold bg-[#2D2B26]/50' : 'text-slate-100'}">
          <span>Terms & Conditions</span>
          <svg class="w-3.5 h-3.5 text-[#6E6B63]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
        </a>
      </nav>
    </div>

    <!-- Breaking News Ticker in Light Mode -->
    ${breaking.length > 0 ? `
    <div class="bg-[#FDF8F6] border-t border-b border-[#F2DFD9] py-1.5 px-4 lg:px-8 flex items-center text-xs overflow-hidden">
      <div class="flex items-center space-x-2 bg-[#C25E3E] text-white font-black px-2.5 py-0.5 rounded text-[11px] uppercase tracking-wider flex-shrink-0 z-10 shadow-sm">
        <span class="w-1.5 h-1.5 rounded-full bg-white animate-ping mr-0.5"></span>
        Breaking
      </div>
      <div class="overflow-hidden relative w-full ml-3 text-[#2B2926]">
        <div class="animate-marquee space-x-4">
          ${breakingTickerHtml}
          ${breakingTickerHtml}
        </div>
      </div>
    </div>` : ''}
  </header>

  <!-- Page Content Container -->
  <main class="flex-grow max-w-7xl mx-auto w-full px-4 lg:px-8 py-8">
    ${content}
  </main>

  <!-- Footer in Light Mode -->
  <footer class="border-t border-[#EAE8E1] bg-[#F4F2EC] mt-16 py-12 text-sm text-[#6E6B63]">
    <div class="max-w-7xl mx-auto px-4 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
      
      <!-- Brand & Mission -->
      <div class="space-y-3">
        <div class="flex items-center space-x-2.5">
          <img src="/assets/logo-sm.webp" class="h-7 w-7 rounded-full object-contain" alt="USA NEWS STORY" width="28" height="28">
          <span class="font-bold text-[#1C1B18] tracking-wide font-headline">USA NEWS STORY</span>
        </div>
        <p class="text-xs text-[#6E6B63] leading-relaxed">
          Independent American news agency delivering verified journalism, investigative reporting, economic analysis, and national dispatches.
        </p>
      </div>

      <!-- Site Navigation -->
      <div>
        <h4 class="text-xs font-bold uppercase tracking-wider text-[#1C1B18] mb-3">Navigation</h4>
        <ul class="space-y-2 text-xs">
          <li><a href="/" class="hover:text-[#C25E3E] transition">HOME</a></li>
          <li><a href="/news" class="hover:text-[#C25E3E] transition">NEWS</a></li>
          <li><a href="/about-us" class="hover:text-[#C25E3E] transition">About Us</a></li>
          <li><a href="/contact-us" class="hover:text-[#C25E3E] transition">Contact Us</a></li>
          <li><a href="/privacy-policy" class="hover:text-[#C25E3E] transition">Privacy Policy</a></li>
          <li><a href="/terms-and-conditions" class="hover:text-[#C25E3E] transition">Terms & Conditions</a></li>
        </ul>
      </div>

      <!-- Categories -->
      <div>
        <h4 class="text-xs font-bold uppercase tracking-wider text-[#1C1B18] mb-3">Categories</h4>
        <ul class="space-y-2 text-xs">
          ${categories.map(c => `<li><a href="/category/${c.slug}" class="hover:text-[#C25E3E] transition">${c.name}</a></li>`).join("")}
        </ul>
      </div>

      <!-- Editorial Bureau -->
      <div class="space-y-2 text-xs">
        <h4 class="text-xs font-bold uppercase tracking-wider text-[#1C1B18] mb-2">Editorial Bureau</h4>
        <p class="text-xs text-[#6E6B63] leading-relaxed">
          National Headquarters:<br>
          1200 Pennsylvania Ave NW<br>
          Washington, D.C. 20004<br>
          Press Desk: <span class="text-[#C25E3E] font-medium">tips@usanewsstory.com</span>
        </p>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 lg:px-8 border-t border-[#E5E2D9] pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-[#8A867E]">
      <div>© 2026 USA NEWS STORY. All rights reserved.</div>
      <div class="mt-2 sm:mt-0 flex space-x-4">
        <a href="/privacy-policy" class="hover:text-[#1C1B18]">Privacy Policy</a>
        <span>•</span>
        <a href="/terms-and-conditions" class="hover:text-[#1C1B18]">Terms & Conditions</a>
      </div>
    </div>
  </footer>

  <script>
    function toggleMobileMenu() {
      const panel = document.getElementById('mobileNavPanel');
      const btn = document.getElementById('mobileMenuToggleBtn');
      if (!panel || !btn) return;
      panel.classList.toggle('is-open');
      btn.classList.toggle('is-active');
    }

    // Auto-close popup when clicked outside
    document.addEventListener('click', (e) => {
      const panel = document.getElementById('mobileNavPanel');
      const btn = document.getElementById('mobileMenuToggleBtn');
      if (!panel || !btn) return;
      if (panel.classList.contains('is-open') && !panel.contains(e.target) && !btn.contains(e.target)) {
        panel.classList.remove('is-open');
        btn.classList.remove('is-active');
      }
    });

    // Real-Time Visitor Heartbeat Beacon (Whos.amung.us style, silent & non-blocking)
    (function() {
      try {
        let sid = sessionStorage.getItem('_us_sid');
        if (!sid) {
          sid = 's_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
          sessionStorage.setItem('_us_sid', sid);
        }
        function pingVisitor() {
          let cHint = "";
          try {
            const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || "").toLowerCase();
            if (tz.includes("phnom_penh") || tz.includes("asia/phnom_penh")) cHint = "KH";
            else if (tz.includes("bangkok")) cHint = "TH";
            else if (tz.includes("tokyo")) cHint = "JP";
            else if (tz.includes("seoul")) cHint = "KR";
            else if (tz.includes("singapore")) cHint = "SG";
            else if (tz.includes("london")) cHint = "GB";
            else if (tz.includes("paris")) cHint = "FR";
            else if (tz.includes("berlin")) cHint = "DE";
            else if (tz.includes("toronto") || tz.includes("vancouver") || tz.includes("montreal")) cHint = "CA";
            else if (tz.includes("new_york") || tz.includes("chicago") || tz.includes("los_angeles") || tz.includes("denver") || tz.includes("america/")) cHint = "US";
          } catch(e) {}
          const payload = JSON.stringify({ s: sid, p: window.location.pathname, t: document.title, country: cHint, r: document.referrer || "" });
          if (navigator.sendBeacon) {
            navigator.sendBeacon('/api/track/ping', payload);
          } else {
            fetch('/api/track/ping', { method: 'POST', body: payload, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(function(){});
          }
        }
        pingVisitor();
        setInterval(pingVisitor, 30000);
      } catch(e) {}
    })();
  </script>

</body>
</html>`;
}

// 6-Character Clean Viral Short Link Redirect (e.g. /asdfef -> /article/original-slug with NO tail)
frontendRouter.get("/:code{[a-zA-Z0-9]{6}}", (c) => {
  const code = c.req.param("code").toLowerCase();
  const link = db.query(`
    SELECT sl.*, p.slug 
    FROM short_links sl
    JOIN posts p ON sl.post_id = p.id
    WHERE LOWER(sl.code) = ? AND p.status = 'published'
  `).get(code) as any;

  if (link && link.slug) {
    db.prepare("UPDATE short_links SET clicks = clicks + 1 WHERE id = ?").run(link.id);
    return c.redirect(`/article/${link.slug}`, 302);
  }
  return c.redirect("/", 302);
});


// 1. HOME PAGE ROUTE (Light Mode)
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
    LIMIT 24
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
    content = `
      <section class="max-w-4xl mx-auto py-16 px-4 text-center">
        <div class="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-[#C25E3E]/10 border border-[#C25E3E]/20 text-[#C25E3E] mb-6 shadow-sm">
          <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg>
        </div>
        <h1 class="text-3xl sm:text-5xl font-black text-[#1C1B18] tracking-tight mb-4 font-headline">Welcome to USA NEWS STORY</h1>
        <p class="text-base sm:text-lg text-[#6E6B63] max-w-2xl mx-auto leading-relaxed mb-8">
          Independent American journalism delivering timely, verified reporting on national affairs, economy, politics, and global developments.
        </p>
        <div class="flex flex-wrap items-center justify-center gap-4">
          <a href="/news" class="px-6 py-3 rounded-xl bg-[#C25E3E] hover:bg-[#B05335] text-white font-bold text-sm shadow-md shadow-[#C25E3E]/20 flex items-center space-x-2 transition transform hover:-translate-y-0.5">
            <span>Explore All News Coverage</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
          </a>
          <a href="/about-us" class="px-6 py-3 rounded-xl bg-white hover:bg-[#F7F5F0] border border-[#E5E2D9] text-[#2B2926] font-semibold text-sm transition">
            <span>About Our Newsroom</span>
          </a>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 text-left">
          <div class="p-5 rounded-2xl bg-white border border-[#E8E6DF] shadow-sm">
            <div class="text-[#C25E3E] font-bold text-base mb-1">🏛️ National Affairs</div>
            <p class="text-xs text-[#6E6B63]">In-depth reporting on policy, governance, and civic developments.</p>
          </div>
          <div class="p-5 rounded-2xl bg-white border border-[#E8E6DF] shadow-sm">
            <div class="text-[#C25E3E] font-bold text-base mb-1">📈 Economy & Markets</div>
            <p class="text-xs text-[#6E6B63]">Labor trends, jobs data, inflation, and business coverage.</p>
          </div>
          <div class="p-5 rounded-2xl bg-white border border-[#E8E6DF] shadow-sm">
            <div class="text-[#C25E3E] font-bold text-base mb-1">🌍 Global Intelligence</div>
            <p class="text-xs text-[#6E6B63]">Worldwide correspondents and diplomatic affairs.</p>
          </div>
          <div class="p-5 rounded-2xl bg-white border border-[#E8E6DF] shadow-sm">
            <div class="text-[#C25E3E] font-bold text-base mb-1">⚡ Verified News</div>
            <p class="text-xs text-[#6E6B63]">Adherence to SPJ ethical code and fact verification.</p>
          </div>
        </div>
      </section>
    `;
  } else {
    content = `
      <!-- Hero Section in Light Mode -->
      <section class="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        <!-- Main Featured Story (Col 8) -->
        ${featured ? `
        <div class="lg:col-span-8 group">
          <a href="/article/${featured.slug}" class="block relative rounded-2xl overflow-hidden border border-[#E8E6DF] bg-white shadow-md hover:shadow-xl transition duration-300">
            <div class="relative h-72 sm:h-96 md:h-[420px] overflow-hidden">
              <img src="${featured.featured_image || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200'}" alt="${featured.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500 ease-out">
              <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent"></div>
              
              <div class="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                <div class="flex items-center space-x-3 mb-3">
                  <span class="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider text-white shadow" style="background-color: ${featured.category_color || '#C25E3E'}">
                    ${featured.category_name || 'Featured'}
                  </span>
                  <span class="text-xs text-white/80">${featured.read_time}</span>
                </div>
                <h2 class="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white leading-tight mb-3 group-hover:text-[#F3B39E] transition font-headline">
                  ${featured.title}
                </h2>
                <p class="text-sm md:text-base text-white/90 line-clamp-2 mb-4 leading-relaxed font-normal">
                  ${featured.summary}
                </p>
                <div class="flex items-center space-x-3 text-xs text-white/75">
                  <img src="${featured.author_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}" class="w-6 h-6 rounded-full border border-white/30">
                  <span>By ${featured.author_name}</span>
                  <span>•</span>
                  <span>${new Date(featured.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </a>
        </div>` : ''}

        <!-- Trending Top Stories (Col 4) -->
        <div class="lg:col-span-4 bg-white border border-[#E8E6DF] rounded-2xl p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div class="flex items-center justify-between mb-5 border-b border-[#EAE8E1] pb-3">
              <h3 class="text-xs font-bold uppercase tracking-widest text-[#C25E3E] flex items-center space-x-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                <span>Trending Top Stories</span>
              </h3>
              <span class="text-[11px] text-[#8A867E] font-medium">Real-time</span>
            </div>

            <div class="space-y-4">
              ${trending.map((t, idx) => `
                <a href="/article/${t.slug}" class="flex items-start space-x-4 group pb-4 border-b border-[#F0EEE9] last:border-b-0">
                  <span class="text-2xl font-black text-[#D3D0C8] group-hover:text-[#C25E3E] transition font-mono">${idx + 1}</span>
                  <div class="flex-1 min-w-0">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-[#C25E3E] block mb-1">${t.category_name}</span>
                    <h4 class="text-sm font-semibold text-[#1C1B18] group-hover:text-[#C25E3E] transition line-clamp-2 leading-snug font-headline">
                      ${t.title}
                    </h4>
                    <div class="flex items-center space-x-2 mt-1.5 text-[11px] text-[#8A867E]">
                      <span>${t.read_time}</span>
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
      <section class="mb-14 bg-white border border-[#E8E6DF] rounded-3xl p-6 lg:p-8 shadow-sm relative overflow-hidden">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-[#EAE8E1] gap-3">
          <div class="flex items-center space-x-3">
            <span class="px-2.5 py-1 rounded-lg text-xs font-black bg-[#C25E3E] text-white uppercase tracking-wider flex items-center space-x-1.5 shadow-sm">
              <span>🇺🇸</span>
              <span>U.S. EDITION</span>
            </span>
            <h2 class="text-xl sm:text-2xl font-black text-[#1C1B18] font-headline">United States News & National Dispatch</h2>
          </div>
          <a href="/category/us-news" class="text-xs font-bold text-[#C25E3E] hover:underline flex items-center space-x-1 transition">
            <span>View All US Coverage</span>
            <span>&rarr;</span>
          </a>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          ${usPosts.map(post => `
            <article class="bg-[#FAF9F5] border border-[#E8E6DF] rounded-2xl overflow-hidden hover:border-[#C25E3E]/50 transition duration-300 flex flex-col group shadow-sm hover:shadow-md">
              <a href="/article/${post.slug}" class="block relative h-48 overflow-hidden">
                <img src="${post.featured_image || 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800'}" alt="${post.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
                <span class="absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#C25E3E] text-white shadow">
                  U.S. News
                </span>
              </a>
              <div class="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <a href="/article/${post.slug}">
                    <h3 class="font-bold text-base text-[#1C1B18] group-hover:text-[#C25E3E] transition line-clamp-2 leading-snug mb-2 font-headline">
                      ${post.title}
                    </h3>
                  </a>
                  <p class="text-xs text-[#6E6B63] line-clamp-3 leading-relaxed mb-4">
                    ${post.summary}
                  </p>
                </div>
                <div class="flex items-center justify-between text-[11px] text-[#8A867E] pt-3 border-t border-[#EAE8E1]">
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
        <div class="flex items-center justify-between mb-6 border-b border-[#EAE8E1] pb-3">
          <h2 class="text-xl font-bold text-[#1C1B18] flex items-center space-x-2 font-headline">
            <span>Latest News Stories</span>
          </h2>
          <span class="text-xs text-[#6E6B63]">Verified newsroom feed</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          ${allPosts.map(post => `
            <article class="bg-white border border-[#E8E6DF] rounded-2xl overflow-hidden hover:border-[#C25E3E]/40 transition flex flex-col group shadow-sm hover:shadow-md">
              <a href="/article/${post.slug}" class="block relative h-48 overflow-hidden">
                <img src="${post.featured_image || 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800'}" alt="${post.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
                <span class="absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white shadow" style="background-color: ${post.category_color || '#C25E3E'}">
                  ${post.category_name}
                </span>
              </a>
              <div class="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <a href="/article/${post.slug}">
                    <h3 class="font-bold text-base text-[#1C1B18] group-hover:text-[#C25E3E] transition line-clamp-2 leading-snug mb-2 font-headline">
                      ${post.title}
                    </h3>
                  </a>
                  <p class="text-xs text-[#6E6B63] line-clamp-2 leading-relaxed mb-4">
                    ${post.summary}
                  </p>
                </div>
                <div class="flex items-center justify-between text-[11px] text-[#8A867E] pt-3 border-t border-[#EAE8E1]">
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
  const q = c.req.query("q")?.trim() || "";
  let posts: any[] = [];
  if (q) {
    posts = db.query(`
      SELECT p.*, c.name as category_name, c.color as category_color, c.slug as category_slug
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'published' AND (p.title LIKE ? OR p.summary LIKE ?)
      ORDER BY p.id DESC
    `).all(`%${q}%`, `%${q}%`) as any[];
  } else {
    posts = db.query(`
      SELECT p.*, c.name as category_name, c.color as category_color, c.slug as category_slug
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'published'
      ORDER BY p.id DESC
    `).all() as any[];
  }

  const content = `
    <div class="mb-8 border-b border-[#EAE8E1] pb-5">
      <div class="flex items-center space-x-3">
        <span class="w-3 h-8 rounded-full bg-[#C25E3E]"></span>
        <h1 class="text-3xl font-black text-[#1C1B18] font-headline">${q ? `Search: "${q}"` : 'All News & Dispatches'}</h1>
      </div>
      <p class="text-xs text-[#6E6B63] mt-2">${q ? `Found ${posts.length} stories matching your search` : 'Comprehensive coverage from our editorial newsroom across all beats'}</p>
    </div>

    ${posts.length === 0 ? `
      <div class="text-center py-20 bg-white rounded-3xl border border-[#E8E6DF] p-8 max-w-2xl mx-auto shadow-sm">
        <h3 class="text-lg font-bold text-[#1C1B18] mb-2 font-headline">No News Articles Published Yet</h3>
        <p class="text-xs text-[#6E6B63]">Please check back soon for breaking reports and dispatches.</p>
      </div>
    ` : `
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        ${posts.map(post => `
          <article class="bg-white border border-[#E8E6DF] rounded-2xl overflow-hidden hover:border-[#C25E3E]/40 transition flex flex-col group shadow-sm hover:shadow-md">
            <a href="/article/${post.slug}" class="block relative h-48 overflow-hidden">
              <img src="${post.featured_image || 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800'}" alt="${post.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
              <span class="absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white shadow" style="background-color: ${post.category_color || '#C25E3E'}">
                ${post.category_name}
              </span>
            </a>
            <div class="p-5 flex-1 flex flex-col justify-between">
              <div>
                <a href="/article/${post.slug}">
                  <h3 class="font-bold text-base text-[#1C1B18] group-hover:text-[#C25E3E] transition line-clamp-2 leading-snug mb-2 font-headline">
                    ${post.title}
                  </h3>
                </a>
                <p class="text-xs text-[#6E6B63] line-clamp-2 leading-relaxed mb-4">
                  ${post.summary}
                </p>
              </div>
              <div class="flex items-center justify-between text-[11px] text-[#8A867E] pt-3 border-t border-[#EAE8E1]">
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
      <div class="border-b border-[#EAE8E1] pb-6 mb-8">
        <span class="text-xs font-bold uppercase tracking-widest text-[#C25E3E]">Editorial Mission</span>
        <h1 class="text-3xl sm:text-5xl font-black text-[#1C1B18] tracking-tight mt-2 font-headline">About USA NEWS STORY</h1>
        <p class="text-base sm:text-lg text-[#6E6B63] mt-4 leading-relaxed">
          USA NEWS STORY is an independent national and international news agency committed to accurate, verified, and transparent digital journalism.
        </p>
      </div>

      <div class="space-y-10 text-[#2B2926] text-sm sm:text-base leading-relaxed">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
          <div class="p-6 rounded-2xl bg-white border border-[#E8E6DF] shadow-sm">
            <div class="text-2xl font-black text-[#C25E3E] mb-2 font-headline">100%</div>
            <div class="text-xs uppercase font-bold text-[#1C1B18] tracking-wider mb-1">Editorial Independence</div>
            <p class="text-xs text-[#6E6B63]">Zero commercial or political influence. Complete dedication to facts.</p>
          </div>
          <div class="p-6 rounded-2xl bg-white border border-[#E8E6DF] shadow-sm">
            <div class="text-2xl font-black text-[#C25E3E] mb-2 font-headline">SPJ</div>
            <div class="text-xs uppercase font-bold text-[#1C1B18] tracking-wider mb-1">Code of Ethics</div>
            <p class="text-xs text-[#6E6B63]">Rigorous multi-source verification on every headline and dispatch.</p>
          </div>
          <div class="p-6 rounded-2xl bg-white border border-[#E8E6DF] shadow-sm">
            <div class="text-2xl font-black text-[#C25E3E] mb-2 font-headline">24 / 7</div>
            <div class="text-xs uppercase font-bold text-[#1C1B18] tracking-wider mb-1">Continuous Monitoring</div>
            <p class="text-xs text-[#6E6B63]">Dedicated breaking desk delivering rapid, verified national alerts.</p>
          </div>
        </div>

        <section class="space-y-4">
          <h2 class="text-xl sm:text-2xl font-bold text-[#1C1B18] font-headline">Our Mission & Standards</h2>
          <p>
            USA NEWS STORY provides readers across America and worldwide with objective coverage of public policy, macroeconomic shifts, foreign relations, and culture. We believe an informed citizenry is the bedrock of democracy.
          </p>
          <p>
            Our journalists adhere strictly to verified sourcing: claims are corroborated with primary documentation, on-the-record statements, and direct reporting before publication.
          </p>
        </section>

        <section class="space-y-4 border-t border-[#EAE8E1] pt-8">
          <h2 class="text-xl sm:text-2xl font-bold text-[#1C1B18] font-headline">Newsroom Leadership</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div class="p-4 rounded-xl bg-white border border-[#E8E6DF] flex items-center space-x-4 shadow-sm">
              <div class="w-12 h-12 rounded-xl bg-[#C25E3E]/10 text-[#C25E3E] font-bold flex items-center justify-center text-base">ED</div>
              <div>
                <div class="font-bold text-[#1C1B18] text-sm">Editorial Board</div>
                <div class="text-xs text-[#6E6B63]">USA News Story Bureau</div>
                <div class="text-[11px] text-[#8A867E]">editor@usanewsstory.com</div>
              </div>
            </div>
            <div class="p-4 rounded-xl bg-white border border-[#E8E6DF] flex items-center space-x-4 shadow-sm">
              <div class="w-12 h-12 rounded-xl bg-[#C25E3E]/10 text-[#C25E3E] font-bold flex items-center justify-center text-base">DC</div>
              <div>
                <div class="font-bold text-[#1C1B18] text-sm">Washington Bureau</div>
                <div class="text-xs text-[#6E6B63]">Policy & Congress Desk</div>
                <div class="text-[11px] text-[#8A867E]">dc@usanewsstory.com</div>
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
      <div class="border-b border-[#EAE8E1] pb-6 mb-8">
        <span class="text-xs font-bold uppercase tracking-widest text-[#C25E3E]">Get in Touch</span>
        <h1 class="text-3xl sm:text-5xl font-black text-[#1C1B18] tracking-tight mt-2 font-headline">Contact Our Newsroom</h1>
        <p class="text-base sm:text-lg text-[#6E6B63] mt-4 leading-relaxed">
          Submit news tips, confidential leaks, editorial feedback, or general press releases to our editors.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div class="md:col-span-5 space-y-6">
          <div class="p-6 rounded-2xl bg-white border border-[#E8E6DF] space-y-4 shadow-sm">
            <h3 class="font-bold text-[#1C1B18] text-base font-headline">Direct Editorial Desks</h3>
            
            <div class="space-y-3 text-xs">
              <div>
                <span class="text-[#6E6B63] block">Confidential News Tips:</span>
                <span class="text-[#C25E3E] font-mono font-semibold">tips@usanewsstory.com</span>
              </div>
              <div>
                <span class="text-[#6E6B63] block">Press Releases:</span>
                <span class="text-[#2B2926] font-mono">press@usanewsstory.com</span>
              </div>
              <div>
                <span class="text-[#6E6B63] block">Corrections & Ethics:</span>
                <span class="text-[#2B2926] font-mono">ethics@usanewsstory.com</span>
              </div>
            </div>
          </div>

          <div class="p-6 rounded-2xl bg-white border border-[#E8E6DF] space-y-2 shadow-sm">
            <h3 class="font-bold text-[#1C1B18] text-base font-headline">Washington Bureau</h3>
            <p class="text-xs text-[#6E6B63] leading-relaxed">
              USA NEWS STORY<br>
              1200 Pennsylvania Avenue NW<br>
              Washington, D.C. 20004<br>
              United States
            </p>
          </div>
        </div>

        <div class="md:col-span-7 bg-white border border-[#E8E6DF] rounded-2xl p-6 sm:p-8 shadow-sm">
          <h3 class="font-bold text-lg text-[#1C1B18] mb-2 font-headline">Send a Newsroom Message</h3>
          <p class="text-xs text-[#6E6B63] mb-6">Fill in the form below and your tip will route securely to our reporting desk.</p>

          <form onsubmit="alert('Thank you! Your message has been submitted to the editorial desk.'); return false;" class="space-y-4 text-xs">
            <div>
              <label class="block font-semibold text-[#1C1B18] mb-1.5">Your Name (or Anonymous)</label>
              <input type="text" placeholder="Full Name or Leave Blank" class="w-full bg-[#FAF9F5] border border-[#E5E2D9] rounded-xl px-3.5 py-2.5 text-[#1C1B18] placeholder-[#9E9A91] focus:outline-none focus:border-[#C25E3E]">
            </div>

            <div>
              <label class="block font-semibold text-[#1C1B18] mb-1.5">Email Address</label>
              <input type="email" required placeholder="email@example.com" class="w-full bg-[#FAF9F5] border border-[#E5E2D9] rounded-xl px-3.5 py-2.5 text-[#1C1B18] placeholder-[#9E9A91] focus:outline-none focus:border-[#C25E3E]">
            </div>

            <div>
              <label class="block font-semibold text-[#1C1B18] mb-1.5">Message / Story Details</label>
              <textarea rows="5" required placeholder="Provide details, sources, or documents..." class="w-full bg-[#FAF9F5] border border-[#E5E2D9] rounded-xl px-3.5 py-2.5 text-[#1C1B18] placeholder-[#9E9A91] focus:outline-none focus:border-[#C25E3E] resize-none"></textarea>
            </div>

            <button type="submit" class="w-full py-3 rounded-xl bg-[#C25E3E] hover:bg-[#B05335] text-white font-bold transition shadow-md shadow-[#C25E3E]/20">
              Submit to News Desk
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
      <div class="border-b border-[#EAE8E1] pb-6 mb-8">
        <span class="text-xs font-bold uppercase tracking-widest text-[#C25E3E]">Legal Notice</span>
        <h1 class="text-3xl sm:text-5xl font-black text-[#1C1B18] tracking-tight mt-2 font-headline">Privacy Policy</h1>
        <p class="text-xs text-[#6E6B63] mt-3">Effective Date: October 13, 2026</p>
      </div>

      <div class="space-y-8 text-[#2B2926] text-sm sm:text-base leading-relaxed">
        <section class="space-y-3">
          <h2 class="text-lg sm:text-xl font-bold text-[#1C1B18] font-headline">1. Commitment to Reader Privacy</h2>
          <p>
            USA NEWS STORY ("we", "our") respects reader confidentiality. We collect only minimal technical diagnostics required to serve digital journalism reliably across web and mobile readers.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-lg sm:text-xl font-bold text-[#1C1B18] font-headline">2. Information Collection</h2>
          <p>
            We do not sell personal reader information to data brokers. Standard browser telemetry is used solely to safeguard against automated abuse.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-lg sm:text-xl font-bold text-[#1C1B18] font-headline">3. Inquiries</h2>
          <p>
            For privacy inquiries, contact our legal bureau at: <span class="text-[#C25E3E]">privacy@usanewsstory.com</span>
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
      <div class="border-b border-[#EAE8E1] pb-6 mb-8">
        <span class="text-xs font-bold uppercase tracking-widest text-[#C25E3E]">Terms of Service</span>
        <h1 class="text-3xl sm:text-5xl font-black text-[#1C1B18] tracking-tight mt-2 font-headline">Terms and Conditions</h1>
        <p class="text-xs text-[#6E6B63] mt-3">Effective Date: October 13, 2026</p>
      </div>

      <div class="space-y-8 text-[#2B2926] text-sm sm:text-base leading-relaxed">
        <section class="space-y-3">
          <h2 class="text-lg sm:text-xl font-bold text-[#1C1B18] font-headline">1. Acceptance of Terms</h2>
          <p>
            By reading or accessing USA NEWS STORY, you agree to comply with all applicable copyright and intellectual property protections.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-lg sm:text-xl font-bold text-[#1C1B18] font-headline">2. Copyright & Fair Use</h2>
          <p>
            All original articles, reporting, and media are copyrighted by USA NEWS STORY. Excerpts of up to 100 words may be quoted with direct attribution and hyperlinking to the original story URL.
          </p>
        </section>
      </div>
    </div>
  `;

  return c.html(layout("Terms & Conditions", content, "/terms-and-conditions"));
});

// 7. SINGLE ARTICLE DETAIL PAGE ROUTE (Light Mode, Clean Header, No Left Sidebar, Real-time View Tracking in DB without Visitor View Badge)
frontendRouter.get("/article/:slug", (c) => {
  const slug = c.req.param("slug");
  const post = db.query(`
    SELECT p.*, c.name as category_name, c.color as category_color, c.slug as category_slug
    FROM posts p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.slug = ?
  `).get(slug) as any;

  if (!post) {
    return c.html(layout("Article Not Found", `<div class="text-center py-20"><h1 class="text-2xl font-bold font-headline text-[#1C1B18]">404 - Article Not Found</h1><a href="/" class="text-[#C25E3E] mt-4 inline-block font-semibold">Return to Homepage</a></div>`));
  }

  // REAL LIVE VIEW TRACKING IN DATABASE (Filtered for genuine human visitors, ignoring automated crawler bots)
  const userAgent = (c.req.header("user-agent") || "").toLowerCase();
  const isBot = /bot|crawl|spider|slurp|curl|wget|mediapartners|lighthouse|headless/i.test(userAgent);
  if (!isBot) {
    db.query("UPDATE posts SET views = views + 1 WHERE id = ?").run(post.id);
  }

  // Related Stories: Prioritize same category, fallback to latest published
  let related = db.query(`
    SELECT p.*, c.name as category_name, c.color as category_color 
    FROM posts p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id != ? AND p.status = 'published' AND p.category_id = ?
    ORDER BY p.id DESC
    LIMIT 3
  `).all(post.id, post.category_id || 1) as any[];

  if (related.length < 3) {
    const excludeIds = [post.id, ...related.map((r: any) => r.id)];
    const placeholders = excludeIds.map(() => "?").join(",");
    const extra = db.query(`
      SELECT p.*, c.name as category_name, c.color as category_color 
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id NOT IN (${placeholders}) AND p.status = 'published'
      ORDER BY p.id DESC
      LIMIT ?
    `).all(...excludeIds, 3 - related.length) as any[];
    related = [...related, ...extra];
  }

  // Render article body with Read More strictly after paragraph 2
  const formattedBody = formatArticleWithReadMore(post.content);

  const content = `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-10">
      
      <!-- Main Article Column (Col 8, Centered & Clean, No Left Toolbar, No Breadcrumb) -->
      <article class="lg:col-span-8">
        
        <!-- Category Badge -->
        <div class="mb-3">
          <span class="px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider text-white shadow-sm" style="background-color: ${post.category_color || '#C25E3E'}">
            ${post.category_name}
          </span>
        </div>

        <!-- Headline -->
        <h1 class="text-3xl sm:text-4xl md:text-5xl font-black text-[#1C1B18] leading-tight mb-4 font-headline">
          ${post.title}
        </h1>

        <!-- Executive Subtitle / Summary -->
        <p class="text-lg text-[#6E6B63] font-normal leading-relaxed mb-6 font-headline italic text-left">
          ${post.summary}
        </p>

        <!-- Clean Author Meta (No Views Counter Badge shown to visitor) -->
        <div class="flex items-center justify-between border-y border-[#EAE8E1] py-3.5 mb-8 text-xs text-[#6E6B63]">
          <div class="flex items-center space-x-3">
            <img src="${post.author_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}" class="w-10 h-10 rounded-full border border-[#E5E2D9]">
            <div>
              <div class="font-bold text-[#1C1B18] text-sm">${post.author_name}</div>
              <div class="text-[11px] text-[#8A867E]">Published on ${new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
            </div>
          </div>
          <div class="flex items-center space-x-2 text-[#6E6B63]">
            <span>⏱️ ${post.read_time}</span>
          </div>
        </div>

        <!-- Featured Hero Image -->
        ${post.featured_image ? `
        <div class="rounded-2xl overflow-hidden mb-8 border border-[#E8E6DF] shadow-sm">
          <img src="${post.featured_image}" alt="${post.title}" class="w-full max-h-[500px] object-cover">
        </div>` : ''}

        <!-- Article Body with Justified Text & Read More Strictly After Paragraph 2 -->
        ${formattedBody}

        <!-- Tags (if any) -->
        ${post.tags && post.tags.trim() ? `
        <div class="mt-8 pt-4 border-t border-[#EAE8E1] flex flex-wrap items-center gap-2 text-xs">
          <span class="text-[#8A867E]">Tags:</span>
          ${post.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0).map((t: string) => `
            <span class="px-2.5 py-1 rounded bg-[#F3F1EC] text-[#2B2926] font-mono border border-[#E5E2D9]">#${t.replace(/^#+/, '')}</span>
          `).join('')}
        </div>` : ''}

        <!-- Related Stories / Related Posts Grid (3 Cards as requested) -->
        ${related.length > 0 ? `
        <section class="mt-10 pt-8 border-t border-[#EAE8E1]">
          <div class="flex items-center justify-between mb-5">
            <div class="flex items-center space-x-2.5">
              <span class="w-2.5 h-2.5 rounded-full bg-[#C25E3E]"></span>
              <h3 class="text-lg sm:text-xl font-bold text-[#1C1B18] font-headline">Related Stories</h3>
            </div>
            <a href="/news" class="text-xs font-semibold text-[#C25E3E] hover:underline flex items-center space-x-1">
              <span>View All News &rarr;</span>
            </a>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            ${related.map((r: any) => `
              <article class="bg-[#FAF9F5] border border-[#E8E6DF] rounded-2xl overflow-hidden hover:border-[#C25E3E]/60 transition-all duration-300 flex flex-col group shadow-xs hover:shadow-md">
                <a href="/article/${r.slug}" class="block relative h-36 overflow-hidden bg-[#EAE8E1]">
                  <img src="${r.featured_image || 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800'}" alt="${r.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
                  <span class="absolute top-2.5 left-2.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white shadow-xs" style="background-color: ${r.category_color || '#C25E3E'}">
                    ${r.category_name}
                  </span>
                </a>
                <div class="p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    <a href="/article/${r.slug}">
                      <h4 class="font-bold text-xs sm:text-sm text-[#1C1B18] group-hover:text-[#C25E3E] transition line-clamp-2 leading-snug mb-1.5 font-headline">
                        ${r.title}
                      </h4>
                    </a>
                  </div>
                  <div class="flex items-center justify-between text-[10px] text-[#8A867E] pt-2 border-t border-[#EAE8E1] mt-2">
                    <span class="truncate max-w-[100px]">${r.author_name || 'Editorial'}</span>
                    <span>${r.read_time || '3 min'}</span>
                  </div>
                </div>
              </article>
            `).join("")}
          </div>
        </section>
        ` : ''}
      </article>

      <!-- Right Sidebar (Col 4) -->
      <aside class="lg:col-span-4 space-y-8">
        
        <!-- Must Read Next -->
        <div class="bg-white border border-[#E8E6DF] rounded-2xl p-5 shadow-sm">
          <h3 class="text-xs font-bold uppercase tracking-wider text-[#C25E3E] mb-4 pb-2 border-b border-[#EAE8E1]">
            Must Read Next
          </h3>
          <div class="space-y-4">
            ${related.length === 0 ? `<p class="text-xs text-[#8A867E]">More dispatches coming soon.</p>` : related.map(r => `
              <a href="/article/${r.slug}" class="block group">
                <span class="text-[10px] font-bold uppercase text-[#C25E3E] block mb-1">${r.category_name}</span>
                <h4 class="text-xs font-semibold text-[#1C1B18] group-hover:text-[#C25E3E] transition line-clamp-2 leading-snug font-headline">
                  ${r.title}
                </h4>
                <span class="text-[10px] text-[#8A867E] mt-1 block">${r.read_time}</span>
              </a>
            `).join("")}
          </div>
        </div>

        <!-- Daily Briefing Newsletter Subscription -->
        <div class="bg-white border border-[#E8E6DF] rounded-2xl p-5 text-center shadow-sm">
          <div class="w-10 h-10 rounded-full bg-[#C25E3E]/10 text-[#C25E3E] flex items-center justify-center mx-auto mb-3">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
          </div>
          <h4 class="font-bold text-sm text-[#1C1B18] mb-1 font-headline">Daily Briefing</h4>
          <p class="text-xs text-[#6E6B63] mb-4">Get top stories delivered to your inbox every morning at 7 AM.</p>
          <form onsubmit="alert('Thank you for subscribing to USA NEWS STORY!'); return false;" class="space-y-2">
            <input type="email" required placeholder="Your email address" class="w-full bg-[#FAF9F5] border border-[#E5E2D9] rounded-lg px-3 py-2 text-xs text-[#1C1B18] placeholder-[#9E9A91] focus:outline-none focus:border-[#C25E3E]">
            <button type="submit" class="w-full bg-[#C25E3E] hover:bg-[#B05335] text-white font-bold rounded-lg py-2 text-xs transition shadow-sm">Subscribe</button>
          </form>
        </div>

      </aside>

    </div>

    <script>
      function revealFullArticle() {
        const container = document.getElementById('articleRestContainer');
        const overlay = document.getElementById('readMoreOverlay');
        if (container) {
          container.classList.remove('max-h-[140px]', 'max-h-[130px]');
          container.classList.add('expanded');
          container.style.maxHeight = 'none';
          container.style.webkitMaskImage = 'none';
          container.style.maskImage = 'none';
        }
        if (overlay) {
          overlay.classList.add('opacity-0', 'pointer-events-none');
          setTimeout(function() {
            overlay.style.display = 'none';
          }, 350);
        }
      }
    </script>
  `;

  return c.html(layout(post.title, content, `/article/${post.slug}`));
});

// 8. CATEGORY PAGE ROUTE (Light Mode)
frontendRouter.get("/category/:slug", (c) => {
  const slug = c.req.param("slug");
  const category = db.query("SELECT * FROM categories WHERE slug = ?").get(slug) as any;

  if (!category) {
    return c.html(layout("Category Not Found", `<div class="text-center py-20"><h1 class="text-2xl font-bold font-headline text-[#1C1B18]">Category Not Found</h1><a href="/" class="text-[#C25E3E] mt-4 inline-block font-semibold">Return to Homepage</a></div>`));
  }

  const posts = db.query(`
    SELECT p.*, c.name as category_name, c.color as category_color, c.slug as category_slug
    FROM posts p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE c.slug = ? AND p.status = 'published'
    ORDER BY p.id DESC
  `).all(slug) as any[];

  const content = `
    <div class="mb-8 border-b border-[#EAE8E1] pb-5">
      <div class="flex items-center space-x-3">
        <span class="w-3 h-8 rounded-full" style="background-color: ${category.color}"></span>
        <h1 class="text-3xl font-black text-[#1C1B18] font-headline">${category.name}</h1>
      </div>
      <p class="text-xs text-[#6E6B63] mt-2">Showing all stories categorized under ${category.name}</p>
    </div>

    ${posts.length === 0 ? `
      <div class="text-center py-16 bg-white rounded-3xl border border-[#E8E6DF] p-8 max-w-xl mx-auto shadow-sm">
        <p class="text-[#6E6B63] text-sm mb-4">No stories published in this category yet.</p>
      </div>
    ` : `
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        ${posts.map(post => `
          <article class="bg-white border border-[#E8E6DF] rounded-2xl overflow-hidden hover:border-[#C25E3E]/40 transition flex flex-col group shadow-sm hover:shadow-md">
            <a href="/article/${post.slug}" class="block relative h-48 overflow-hidden">
              <img src="${post.featured_image || 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800'}" alt="${post.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
            </a>
            <div class="p-5 flex-1 flex flex-col justify-between">
              <div>
                <a href="/article/${post.slug}">
                  <h3 class="font-bold text-base text-[#1C1B18] group-hover:text-[#C25E3E] transition line-clamp-2 leading-snug mb-2 font-headline">
                    ${post.title}
                  </h3>
                </a>
                <p class="text-xs text-[#6E6B63] line-clamp-2 leading-relaxed mb-4">
                  ${post.summary}
                </p>
              </div>
              <div class="flex items-center justify-between text-[11px] text-[#8A867E] pt-3 border-t border-[#EAE8E1]">
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
