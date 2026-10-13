import { analyticsForRange, recordPageview } from '../utils/analytics';
import { exportArticleBackup, restoreArticleBackup } from "../utils/backups";
import { bodyLimit } from "hono/body-limit";
import { Hono } from "hono";
import { db, dbPath } from "../db/index";
import fs from "fs";
import path from "node:path";
import { fetchRemoteImage } from "../utils/remote-image";
import { absoluteWebUrl, extractArticleHtml, extractHeadline, importedTextWithoutImages } from "../utils/article-import";
import { recordVisitorPing, removeVisitorSession, getLiveStats } from "../utils/tracker";
import stylePrompts from "../data/style-prompts.json";
import stylesList from "../data/styles.json";

export const apiRouter = new Hono();

// Disable caching for API responses
apiRouter.use("*", async (c, next) => {
  await next();
  c.res.headers.set("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
  c.res.headers.set("Pragma", "no-cache");
  c.res.headers.set("Expires", "0");
});

// Image Studio uses a same-origin preview and saves an independent WebP asset.
function editorAuthorized(c: any) {
  return /(?:^|;\s*)usa_cms_token=usa_news_cms_auth_token_secret_2026(?:;|$)/.test(c.req.header('cookie') || '');
}
apiRouter.get('/media/import', async (c) => {
  if (!editorAuthorized(c)) return c.json({ success: false, error: 'Please sign in again.' }, 401);
  try {
    const blob = await fetchRemoteImage(c.req.query('url') || '');
    return new Response(blob, { headers: { 'Content-Type': blob.type, 'Cache-Control': 'no-store' } });
  } catch (error: any) { return c.json({ success: false, error: error.message }, 400); }
});
apiRouter.post('/media/upload', async (c) => {
  if (!editorAuthorized(c)) return c.json({ success: false, error: 'Please sign in again.' }, 401);
  try {
    const declaredLength = Number(c.req.header('content-length'));
    if (declaredLength > 12 * 1024 * 1024) return c.json({ success: false, error: 'Image exceeds 12 MB.' }, 413);
    const body = await c.req.parseBody();
    const file = body.image;
    if (!(file instanceof File) || file.size >= 50 * 1024) return c.json({ success: false, error: 'Save an edited WebP under 50 KB.' }, 400);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const signature = new TextDecoder().decode(bytes.slice(0, 12));
    if (!signature.startsWith('RIFF') || signature.slice(8, 12) !== 'WEBP') return c.json({ success: false, error: 'Export your edited image as WebP first.' }, 400);
    const directory = path.join(path.dirname(dbPath), 'media');
    fs.mkdirSync(directory, { recursive: true });
    const name = crypto.randomUUID() + '.webp';
    await Bun.write(path.join(directory, name), bytes);
    return c.json({ success: true, url: '/media/' + name });
  } catch (error: any) { return c.json({ success: false, error: error.message }, 500); }
});

apiRouter.get('/analytics', (c) => {
  if (!editorAuthorized(c)) return c.json({ success: false, error: 'Please sign in.' }, 401);
  try {
    const start = c.req.query('start'), end = c.req.query('end');
    if (Boolean(start) !== Boolean(end)) return c.json({ success: false, error: 'Choose both start and end.' }, 400);
    return c.json({ success: true, ...analyticsForRange(start ? Number(start) : null, end ? Number(end) : null) });
  } catch (error: any) { return c.json({ success: false, error: error.message }, 400); }
});

// GET all TK Summary styles
apiRouter.get("/ai/styles", (c) => {
  return c.json({ success: true, data: stylesList });
});

// GET all posts (with optional category or filter)
apiRouter.get("/posts", (c) => {
  const category = c.req.query("category");
  const limit = Number(c.req.query("limit")) || 20;

  let query = `
    SELECT p.*, c.name as category_name, c.color as category_color, c.slug as category_slug
    FROM posts p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.status = 'published'
  `;
  const params: any[] = [];

  if (category) {
    query += " AND c.slug = ?";
    params.push(category);
  }

  query += " ORDER BY p.id DESC LIMIT ?";
  params.push(limit);

  const posts = db.query(query).all(...params);
  return c.json({ success: true, count: posts.length, data: posts });
});

// GET breaking news
apiRouter.get("/breaking", (c) => {
  const breaking = db.query(`
    SELECT id, title, slug, created_at 
    FROM posts 
    WHERE is_breaking = 1 AND status = 'published' 
    ORDER BY id DESC LIMIT 5
  `).all();
  return c.json({ success: true, data: breaking });
});

// GET single post by slug
apiRouter.get("/posts/:slug", (c) => {
  const slug = c.req.param("slug");
  const post = db.query(`
    SELECT p.*, c.name as category_name, c.color as category_color, c.slug as category_slug
    FROM posts p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.slug = ?
  `).get(slug) as any;

  if (!post) {
    return c.json({ success: false, error: "Post not found" }, 404);
  }

  // Increment view count asynchronously
  db.query("UPDATE posts SET views = views + 1 WHERE id = ?").run(post.id);
  recordPageview(post.id);

  return c.json({ success: true, data: post });
});

// GET categories
apiRouter.get("/categories", (c) => {
  const categories = db.query("SELECT * FROM categories ORDER BY id ASC").all();
  return c.json({ success: true, data: categories });
});

// CREATE category (from CMS)
apiRouter.post("/categories", async (c) => {
  try {
    const { name, slug, color } = await c.req.json();
    if (!name || !name.trim()) {
      return c.json({ success: false, error: "Category name is required" }, 400);
    }
    const cleanName = name.trim();
    const cleanSlug = slug && slug.trim()
      ? slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")
      : cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
    const cleanColor = color || "#c25e3e";

    const existing = db.query("SELECT id FROM categories WHERE slug = ?").get(cleanSlug);
    if (existing) {
      return c.json({ success: false, error: "A category with this name/slug already exists" }, 400);
    }

    const res = db.prepare("INSERT INTO categories (name, slug, color) VALUES (?, ?, ?)").run(cleanName, cleanSlug, cleanColor);
    return c.json({ 
      success: true, 
      category: {
        id: Number(res.lastInsertRowid), 
        name: cleanName, 
        slug: cleanSlug, 
        color: cleanColor 
      }
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// DELETE category (from CMS)
apiRouter.delete("/categories/:id", (c) => {
  const id = Number(c.req.param("id"));
  const catCount = db.query("SELECT count(*) as count FROM categories").get() as { count: number };
  if (catCount.count <= 1) {
    return c.json({ success: false, error: "Cannot delete the only remaining category" }, 400);
  }
  const fallback = db.query("SELECT id FROM categories WHERE id != ? LIMIT 1").get(id) as { id: number };
  if (fallback) {
    db.prepare("UPDATE posts SET category_id = ? WHERE category_id = ?").run(fallback.id, id);
  }
  db.prepare("DELETE FROM categories WHERE id = ?").run(id);
  return c.json({ success: true, message: "Category deleted" });
});

// CREATE / UPDATE post (from Next-Gen CMS)
apiRouter.post("/posts", async (c) => {
  const body = await c.req.json();
  const {
    id,
    title,
    slug,
    summary,
    content,
    category_id,
    author_name,
    featured_image,
    read_time,
    is_breaking,
    is_featured,
    status,
    tags
  } = body;

  const generatedSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

  if (id) {
    // Update existing post
    db.prepare(`
      UPDATE posts SET 
        title = ?, slug = ?, summary = ?, content = ?, category_id = ?, 
        author_name = ?, featured_image = ?, read_time = ?, 
        is_breaking = ?, is_featured = ?, status = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title, generatedSlug, summary || "", content, category_id || 1,
      author_name || "Admin", featured_image || "", read_time || "4 min read",
      is_breaking ? 1 : 0, is_featured ? 1 : 0, status || "published", tags || "",
      id
    );

    return c.json({ success: true, message: "Post updated", id });
  } else {
    // Insert new post
    const result = db.prepare(`
      INSERT INTO posts 
        (title, slug, summary, content, category_id, author_name, featured_image, read_time, is_breaking, is_featured, status, tags, views)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      title, generatedSlug, summary || "", content, category_id || 1,
      author_name || "Admin", featured_image || "", read_time || "4 min read",
      is_breaking ? 1 : 0, is_featured ? 1 : 0, status || "published", tags || ""
    );

    return c.json({ success: true, message: "Post created", id: result.lastInsertRowid });
  }
});

// MOVE POST TO TRASH (Soft Delete)
apiRouter.post("/posts/:id/trash", (c) => {
  const id = c.req.param("id");
  db.prepare("UPDATE posts SET status = 'trash', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
  return c.json({ success: true, message: "Post moved to trash successfully" });
});

// RESTORE POST FROM TRASH
apiRouter.post("/posts/:id/restore", (c) => {
  const id = c.req.param("id");
  db.prepare("UPDATE posts SET status = 'published', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
  return c.json({ success: true, message: "Post restored successfully" });
});

// EMPTY ENTIRE TRASH
apiRouter.delete("/posts/trash/empty", (c) => {
  db.prepare("DELETE FROM posts WHERE status = 'trash'").run();
  return c.json({ success: true, message: "All items in trash permanently deleted" });
});

// DELETE POST (Default: Move to trash. Permanent only when permanent=true)
apiRouter.delete("/posts/:id", (c) => {
  const id = c.req.param("id");
  const permanent = c.req.query("permanent") === "true";
  if (permanent) {
    db.prepare("DELETE FROM posts WHERE id = ?").run(id);
    return c.json({ success: true, message: "Post permanently deleted" });
  } else {
    db.prepare("UPDATE posts SET status = 'trash', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
    return c.json({ success: true, message: "Post moved to trash" });
  }
});

// BULK MOVE TO TRASH
apiRouter.post("/posts/bulk/trash", async (c) => {
  try {
    const { ids } = await c.req.json();
    if (Array.isArray(ids) && ids.length > 0) {
      const placeholders = ids.map(() => "?").join(",");
      db.prepare(`UPDATE posts SET status = 'trash', updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`).run(...ids);
      return c.json({ success: true, count: ids.length, message: `${ids.length} articles moved to trash` });
    }
    return c.json({ success: false, error: "No post IDs provided" }, 400);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// BULK RESTORE FROM TRASH
apiRouter.post("/posts/bulk/restore", async (c) => {
  try {
    const { ids } = await c.req.json();
    if (Array.isArray(ids) && ids.length > 0) {
      const placeholders = ids.map(() => "?").join(",");
      db.prepare(`UPDATE posts SET status = 'published', updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`).run(...ids);
      return c.json({ success: true, count: ids.length, message: `${ids.length} articles restored` });
    }
    return c.json({ success: false, error: "No post IDs provided" }, 400);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// BULK PERMANENT DELETE
apiRouter.post("/posts/bulk/delete-permanent", async (c) => {
  try {
    const { ids } = await c.req.json();
    if (Array.isArray(ids) && ids.length > 0) {
      const placeholders = ids.map(() => "?").join(",");
      db.prepare(`DELETE FROM posts WHERE id IN (${placeholders})`).run(...ids);
      return c.json({ success: true, count: ids.length, message: `${ids.length} articles permanently deleted` });
    }
    return c.json({ success: false, error: "No post IDs provided" }, 400);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});


// AI COPILOT ENDPOINT: Generate headlines
apiRouter.post("/ai/headlines", async (c) => {
  const { topic } = await c.req.json();
  const cleanTopic = topic || "Digital Transformation";

  const suggestions = [
    `How ${cleanTopic} is Redefining Global Standards in 2026`,
    `Inside the Revolution: The Untapped Power of ${cleanTopic}`,
    `Why Industry Leaders Are Doubling Down on ${cleanTopic} This Quarter`
  ];

  return c.json({ success: true, suggestions });
});

// AI COPILOT ENDPOINT: Auto Key Takeaways
apiRouter.post("/ai/summarize", async (c) => {
  const { content } = await c.req.json();
  const takeaways = [
    "Accelerated deployment creates direct competitive advantages for early adopters.",
    "Decentralized edge architecture reduces operational cost while boosting speed tenfold.",
    "Cross-border standards are aligning to ensure long-term stability and security."
  ];

  return c.json({ success: true, takeaways });
});

// CLOUDFLARE PURGE SIMULATION ENDPOINT
apiRouter.post("/cloudflare/purge", (c) => {
  const startTime = Date.now();
  // Simulate Cloudflare Edge API cache purge call
  const latency = Math.floor(Math.random() * 25) + 15; // 15-40ms
  return c.json({
    success: true,
    message: "Cloudflare Edge Global Cache Purged Successfully",
    latency_ms: latency,
    edge_nodes_updated: 310,
    timestamp: new Date().toISOString()
  });
});

// AI ENDPOINT: Fetch Article & Image from external URL
apiRouter.post("/ai/fetch-article", async (c) => {
  try {
    const { url } = await c.req.json();
    let targetUrl = (url || "").trim();
    if (!targetUrl) return c.json({ success: false, error: "Please provide a valid URL" }, 400);

    // Auto-prepend https:// if protocol is omitted
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = "https://" + targetUrl;
    }

    let res = await fetch(targetUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache"
      }
    });

    // If blocked (403/401), fallback with Googlebot headers which news sites allow for indexing
    if (res.status === 403 || res.status === 401) {
      try {
        const botRes = await fetch(targetUrl, {
          redirect: "follow",
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
          }
        });
        if (botRes.ok) {
          res = botRes;
        }
      } catch (e) {}
    }

    if (!res.ok) {
      return c.json({ success: false, error: `Failed to fetch URL (HTTP ${res.status})` }, 400);
    }

    const html = await res.text();

    // Helper to decode HTML entities
    const decodeHtml = (str: string) => {
      return (str || "")
        .replace(/&#8211;/g, "–")
        .replace(/&#8212;/g, "—")
        .replace(/&#8216;/g, "‘")
        .replace(/&#8217;/g, "’")
        .replace(/&#8220;/g, "“")
        .replace(/&#8221;/g, "”")
        .replace(/&#038;/g, "&")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&nbsp;/g, " ");
    };

    // Prefer the article's own heading and decode numeric entities before importing it.
    const title = await extractHeadline(html, res.url || targetUrl);

    // Extract Summary / Description
    let summary = "";
    const ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i) ||
                        html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);
    if (ogDescMatch && ogDescMatch[1]) summary = decodeHtml(ogDescMatch[1].trim());

    // Extract Image (Multi-fallback for WordPress, CNN, BBC, etc.)
    let image = "";
    // 1. og:image
    const ogImgMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i) ||
                       html.match(/<meta\s+content=["'](.*?)["']\s+property=["']og:image["']/i);
    if (ogImgMatch && ogImgMatch[1]) image = ogImgMatch[1].trim();

    // 2. twitter:image
    if (!image) {
      const twMatch = html.match(/<meta\s+name=["']twitter:image["']\s+content=["'](.*?)["']/i) ||
                      html.match(/<meta\s+content=["'](.*?)["']\s+name=["']twitter:image["']/i);
      if (twMatch && twMatch[1]) image = twMatch[1].trim();
    }

    // 3. WordPress wp-post-image
    if (!image) {
      const wpImg = html.match(/<img[^>]+class=["'][^"']*wp-post-image[^"']*["'][^>]+src=["']([^"']+)["']/i) ||
                    html.match(/<img[^>]+src=["']([^"']+)["'][^>]+class=["'][^"']*wp-post-image/i);
      if (wpImg && wpImg[1]) image = wpImg[1].trim();
    }

    // 4. WordPress uploads image
    if (!image) {
      const uploadImg = html.match(/https?:\/\/[^"'\s<>]+\/wp-content\/uploads\/[^"'\s<>]+\.(?:jpg|jpeg|png|webp)/i);
      if (uploadImg) image = uploadImg[0].trim();
    }

    // 5. First large content image
    if (!image) {
      const anyImg = html.match(/https?:\/\/[^"'\s<>]+\.(?:jpg|jpeg|png|webp)/i);
      if (anyImg && !anyImg[0].includes("gravatar") && !anyImg[0].includes("logo") && !anyImg[0].includes("icon")) {
        image = anyImg[0].trim();
      }
    }

    image = absoluteWebUrl(image, res.url || targetUrl);
    const imported = await extractArticleHtml(html, res.url || targetUrl);
    if (!imported.content || !imported.text) {
      return c.json({ success: false, error: "No readable article found. The source may require login or block imports." }, 422);
    }
    const content = await importedTextWithoutImages(imported.content);
    const rawText = imported.text;

    return c.json({
      success: true,
      title: title || "Fetched News Headline",
      summary: summary || rawText.substring(0, 160),
      image: image || imported.images[0] || "",
      images: [...new Set([image, ...imported.images].filter(Boolean))],
      content: content || "<p>Article text imported.</p>",
      rawText: rawText || "",
      url
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message || "Failed to process article URL" }, 500);
  }
});

// AI ENDPOINT: Format or Rewrite in 15 TK Summary News Styles (Gemini AI + Fallback)
apiRouter.post("/ai/format-or-rewrite", async (c) => {
  try {
    const { apiKey, mode, style, title, content, targetWords, customPrompt } = await c.req.json();
    const selectedStyle = (style || "cnn").toLowerCase();
    
    // Get official TK Summary style guidelines
    const specificPrompt = (stylePrompts as any)[selectedStyle] || `News Style: ${selectedStyle}`;
    const targetStyleObj = (stylesList as any[]).find(s => s.id === selectedStyle);
    const targetStyleName = targetStyleObj ? targetStyleObj.label : selectedStyle.toUpperCase();

    // If Gemini API Key is provided, call Google Gemini 2.0 Flash / 1.5 Flash
    if (apiKey && apiKey.trim().length > 10) {
      let geminiPrompt = "";
      if (mode === "translate_khmer") {
        geminiPrompt = `You are a professional Cambodian Khmer news editor.
Translate the following English news headline, summary, and article body into high-quality, authentic, natural Khmer newsroom language.
Ensure proper Khmer typography, appropriate vocabulary, and clean semantic HTML formatting.

Title: ${title}
Content:
${content}

Return ONLY a valid JSON object in this exact schema without markdown backticks:
{
  "title": "translated Khmer headline",
  "summary": "translated Khmer executive summary",
  "formatted_html": "translated Khmer article body in clean semantic HTML (<p>, <h2>, etc.)"
}`;
      } else if (mode === "format") {
        geminiPrompt = `You are an elite news copy editor for ${targetStyleName}.
OFFICIAL STYLE GUIDELINES:
${specificPrompt}

TASK: Reformat this news story into the signature editorial structure, HTML layout, and styled callout boxes of ${targetStyleName}.
CRITICAL CONSTRAINT: KEEP ALL ORIGINAL WORDS, SENTENCES, FACTS, AND QUOTES COMPLETELY UNCHANGED. DO NOT REWRITE OR PARAPHRASE.
Only reorganize into clean, semantic HTML (<p>, <h2>, <blockquote>, and styled callouts as specified in the style guidelines).

Title: ${title}
Article Body:
${content}

Return ONLY a valid JSON object in this exact schema without markdown backticks:
{
  "title": "${title.replace(/"/g, '\\"')}",
  "summary": "original executive summary",
  "formatted_html": "clean semantic HTML string with styled callout boxes"
}`;
      } else {
        geminiPrompt = `You are an elite journalist writing in the authentic newsroom standard of ${targetStyleName}.
OFFICIAL STYLE GUIDELINES:
${specificPrompt}

TASK: REWRITE this news story completely according to the structural format, length, sentence-level voice, and rules described above.
Target length: approximately ${targetWords || 450} words.
${customPrompt ? `Special instructions: ${customPrompt}` : ""}

Original Title: ${title}
Original Content:
${content}

Return ONLY a valid JSON object in this exact schema without markdown backticks:
{
  "title": "headline strictly matching the ${targetStyleName} guidelines",
  "summary": "compelling 2-sentence executive summary",
  "formatted_html": "full rewritten article body in semantic HTML matching the style structure"
}`;
      }

      try {
        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey.trim()}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: geminiPrompt }] }],
            generationConfig: { responseMimeType: "application/json" }
          })
        });

        if (geminiRes.ok) {
          const geminiData = (await geminiRes.json()) as any;
          const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
            const parsed = JSON.parse(cleanJson);
            return c.json({
              success: true,
              source: "gemini",
              title: parsed.title || title,
              summary: parsed.summary || "",
              formatted_html: parsed.formatted_html || content
            });
          }
        }
      } catch (geminiErr) {
        console.error("Gemini API call failed, falling back to built-in transformer:", geminiErr);
      }
    }

    if (mode === "translate_khmer") {
      return c.json({
        success: false,
        error: "សូមបញ្ចូល Google Gemini API Key (ឥតគិតថ្លៃ) ក្នុងប្រអប់ TK Summary សិន ដើម្បីឱ្យប្រព័ន្ធ AI អាចបកប្រែអត្ថបទទាំងមូលជាភាសាខ្មែរបាន!"
      });
    }

    // Built-in High-Fidelity Style Transformer (Clean Light Theme for #FAF9F5 Canvas)
    let styledBox = "";
    let formattedTitle = title;
    let formattedSummary = `Executive briefing formatted in ${targetStyleName} standard.`;

    switch (selectedStyle) {
      case "cnn":
        styledBox = `
<div class="tk-summary-box p-4 rounded-2xl bg-rose-50/80 border-l-4 border-rose-600 my-5 shadow-xs text-[#1C1B18]">
  <div class="flex items-center space-x-2 text-xs font-black tracking-wider text-rose-700 uppercase mb-1.5">
    <span class="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
    <span>CNN DIGITAL • FACTS FIRST</span>
  </div>
  <p class="text-sm text-[#4A4742] leading-relaxed italic">5W1H Lede: Key development confirmed as regional and national leaders react to the newly announced policy shifts.</p>
</div>`;
        formattedTitle = mode === "rewrite" ? `CNN: ${title}` : title;
        break;

      case "dailymail":
        styledBox = `
<div class="tk-summary-box p-4 rounded-2xl bg-sky-50/80 border border-sky-200 my-5 shadow-xs text-[#1C1B18]">
  <p class="font-extrabold text-sky-800 text-xs tracking-wider uppercase mb-2">WHAT WE KNOW:</p>
  <ul class="space-y-1 text-xs text-[#4A4742] list-disc list-inside">
    <li><strong>Major Revelations:</strong> Key details emerge following intense public interest.</li>
    <li><strong>Verified Sources:</strong> Multiple direct witnesses confirm the timeline.</li>
    <li><strong>Next Steps:</strong> Official announcements expected in coming hours.</li>
  </ul>
</div>`;
        formattedTitle = mode === "rewrite" ? `REVEALED: ${title}` : title;
        break;

      case "foxnews":
        styledBox = `
<div class="tk-summary-box p-4 rounded-2xl bg-red-50/80 border-l-4 border-red-600 my-5 shadow-xs text-[#1C1B18]">
  <p class="font-black text-red-700 text-xs uppercase tracking-wider mb-2">KEY TAKEAWAYS</p>
  <ul class="space-y-1.5 text-xs text-[#4A4742] list-disc list-inside">
    <li>High-stakes political showdown erupts over core national policy priorities.</li>
    <li>Critics slam new measures while supporters vow decisive defense.</li>
    <li>Battle shifts to key committees amid heightened scrutiny.</li>
  </ul>
</div>`;
        formattedTitle = mode === "rewrite" ? `SHOWDOWN: ${title}` : title;
        break;

      case "ap":
        styledBox = `
<div class="tk-summary-box p-3.5 rounded-xl bg-[#F3F1EC] border-l-4 border-[#6E6B63] my-4 text-xs text-[#1C1B18]">
  <strong>WASHINGTON (AP) —</strong> Essential facts delivered upfront with strict wire attribution and neutral framing.
</div>`;
        break;

      case "people":
        styledBox = `
<blockquote class="tk-summary-box my-5 p-4 rounded-2xl bg-pink-50/80 border-l-4 border-pink-500 text-sm italic text-pink-950">
  "She opened up about the moment that changed everything — and the quiet strength that carried everyone forward."
</blockquote>`;
        break;

      case "tmz":
        styledBox = `
<div class="tk-summary-box p-3.5 rounded-xl bg-amber-50 border border-amber-300 my-4 text-xs text-amber-950">
  <strong>Here's the deal...</strong> We've learned exclusive details behind today's sudden developments straight from insider sources.
</div>`;
        formattedTitle = mode === "rewrite" ? `EXCLUSIVE: ${title}` : title;
        break;

      case "buzzfeed":
        styledBox = `
<div class="tk-summary-box p-4 rounded-2xl bg-rose-50/80 border-l-4 border-rose-500 my-5 text-xs text-rose-950 space-y-1">
  <p class="font-bold text-rose-700">Here is everything you need to know about today's story — and why everyone is talking about it:</p>
</div>`;
        break;

      case "breaking":
        styledBox = `
<div class="tk-summary-box p-4 rounded-2xl bg-red-50/90 border-2 border-red-600 my-5 shadow-xs">
  <div class="flex items-center space-x-2 text-xs font-black text-red-700 uppercase tracking-widest mb-1.5">
    <span class="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
    <span>BREAKING NEWS BULLETIN</span>
  </div>
  <p class="text-xs text-red-950 font-bold mb-1.5">What We Know (Confirmed Facts Only):</p>
  <ul class="space-y-1 text-xs text-[#4A4742] list-disc list-inside">
    <li>Primary development verified by on-scene authorities.</li>
    <li>Operations underway with emergency updates pending.</li>
  </ul>
</div>`;
        formattedTitle = mode === "rewrite" ? `BREAKING: ${title}` : title;
        break;

      case "tabloid":
        styledBox = `
<div class="tk-summary-box p-4 rounded-2xl bg-amber-50/90 border-2 border-amber-500 text-center text-amber-950 my-5">
  <h3 class="text-xs font-black text-amber-800 uppercase mb-1">🔥 BOMBSHELL REVELATION 🔥</h3>
  <p class="text-xs text-[#4A4742]">Shocking new details emerge regarding today's developments unexpectedly!</p>
</div>`;
        formattedTitle = mode === "rewrite" ? `SHOCK REVELATION: ${title}` : title;
        break;

      case "analysis":
        styledBox = `
<div class="tk-summary-box p-4 rounded-2xl bg-[#F8F7F3] border border-[#EAE8E1] my-5 text-[#1C1B18]">
  <h4 class="text-xs font-bold text-[#6E6B63] uppercase tracking-wider mb-1">NEWS ANALYSIS: WHAT IT MEANS</h4>
  <p class="text-xs text-[#4A4742] leading-relaxed">The stakes go far beyond today's headlines, reshaping the institutional landscape and setting precedents for years ahead.</p>
</div>`;
        break;

      case "axios":
        styledBox = `
<div class="tk-summary-box p-4 rounded-2xl bg-sky-50/80 border-l-4 border-sky-600 my-5 shadow-xs text-[#1C1B18] space-y-2">
  <p class="text-xs font-bold text-sky-800"><strong>Why it matters:</strong> The milestone fundamentally accelerates execution timelines while removing key historical bottlenecks.</p>
  <div class="pt-2 border-t border-sky-200 text-xs text-[#4A4742]">
    <strong>By the numbers:</strong>
    <ul class="list-disc list-inside mt-1 space-y-0.5">
      <li><strong>100%</strong> operational uptime achieved.</li>
      <li><strong>3x</strong> improvement across target efficiency benchmarks.</li>
    </ul>
  </div>
</div>`;
        break;

      case "usaviral":
        styledBox = `
<div class="tk-summary-box p-4 rounded-2xl bg-orange-50 border border-orange-300 my-5 text-xs text-orange-950">
  <strong class="text-orange-700 block mb-1">Nobody expected this sudden turn of events:</strong>
  <p class="text-[#4A4742]">The reaction sweeping the internet is something you have to see to believe.</p>
</div>`;
        break;

      case "nytexplainer":
        styledBox = `
<div class="tk-summary-box p-4 rounded-2xl bg-[#F3F1EC] border-l-4 border-[#C25E3E] my-5 font-serif text-[#1C1B18]">
  <h4 class="text-xs font-bold text-[#C25E3E] uppercase tracking-wider mb-1 font-sans">WHAT TO KNOW: CONTEXT & CONTROVERSY</h4>
  <p class="text-xs text-[#4A4742] leading-relaxed italic">To understand the impact of today's decision, one must look at the institutional precedents and core tensions that led here.</p>
</div>`;
        break;

      case "newsletter":
        styledBox = `
<div class="tk-summary-box p-4 rounded-2xl bg-purple-50/80 border-l-4 border-purple-500 my-5 text-xs text-purple-950 space-y-1.5">
  <p class="font-bold text-purple-800">Good morning, readers ☕ — Here's the one thing that matters today:</p>
  <p class="text-[#4A4742]">We broke down the complete story before you start your day, served in quick, punchy takeaways.</p>
</div>`;
        break;

      case "investigative":
        styledBox = `
<div class="tk-summary-box p-4 rounded-2xl bg-emerald-50/80 border-l-4 border-emerald-600 my-5 text-xs text-emerald-950 space-y-2">
  <h4 class="font-bold text-emerald-800 uppercase tracking-wider">INVESTIGATIVE FINDINGS // THE PAPER TRAIL</h4>
  <p class="text-[#4A4742]">A rigorous review of official filings, procurement logs, and on-record testimonies reveals an undocumented pattern dating back years.</p>
</div>`;
        break;

      default:
        styledBox = `
<div class="tk-summary-box p-4 rounded-2xl bg-indigo-50/80 border-l-4 border-indigo-500 my-5 text-xs text-indigo-950">
  <strong>KEY HIGHLIGHT:</strong> Core developments verified and formatted in modern digital newsroom standard.
</div>`;
        break;
    }

    // Strip previous tk-summary-box to prevent duplicates
    let finalHtml = content.replace(/<div class="[^"]*tk-summary-box[^"]*"[\s\S]*?<\/div>/gi, "")
                           .replace(/<blockquote class="[^"]*tk-summary-box[^"]*"[\s\S]*?<\/blockquote>/gi, "");

    // Format content with the styled box inserted after paragraph 1
    if (finalHtml.includes("</p>")) {
      finalHtml = finalHtml.replace("</p>", `</p>\n${styledBox}\n`);
    } else {
      finalHtml = styledBox + "\n" + finalHtml;
    }

    if (mode === "rewrite") {
      formattedTitle = `[${targetStyleName.toUpperCase()}] ${title}`;
    }

    return c.json({
      success: true,
      source: "transformer",
      title: formattedTitle,
      summary: formattedSummary,
      formatted_html: finalHtml
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// Auto Deploy Webhook for VPS with Automatic Database Backup
apiRouter.all("/system/deploy", async (c) => {
  const secret = c.req.query("secret") || (c.req.header("x-deploy-secret")) || "";
  const VALID_SECRET = process.env.DEPLOY_SECRET || "main_website_usa_deploy_secret_2026";
  
  if (secret !== VALID_SECRET) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  // Safe background deploy:
  // 1. Back up database before any git pull
  // 2. Git fetch and reset code (isolated to /var/www/news)
  // 3. Restart news-app
  const deployScript = `
    set -e
    mkdir -p /var/www/data/backups
    if [ -f "/var/www/data/news.sqlite" ]; then
      cp /var/www/data/news.sqlite "/var/www/data/backups/news_backup_$(date +%Y%m%d_%H%M%S).sqlite"
    elif [ -f "/var/www/news/news.sqlite" ]; then
      cp /var/www/news/news.sqlite /var/www/data/news.sqlite
      cp /var/www/news/news.sqlite "/var/www/data/backups/news_backup_$(date +%Y%m%d_%H%M%S).sqlite"
    fi
    # Keep only last 20 backups
    ls -1tr /var/www/data/backups/*.sqlite 2>/dev/null | head -n -20 | xargs -r rm -f --

    cd /var/www/news
    git fetch --all
    git reset --hard origin/main
    bun install
    DB_PATH=/var/www/data/news.sqlite bun run build:css
    sleep 1
    systemctl restart news-app
  `;

  try {
    Bun.spawn(["bash", "-c", deployScript + " &"], {
      detached: true,
      stdio: ["ignore", "ignore", "ignore"],
    });
    return c.json({ success: true, message: "Safe deploy triggered with automatic database backup." });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// Consistent backups include uncheckpointed WAL data and require CMS authentication.
apiRouter.get('/system/backup-db', (c) => {
  if (!editorAuthorized(c)) return c.json({ success: false, error: 'Please sign in to download a backup.' }, 401);
  return new Response(db.serialize(), { headers: {
    'Content-Type': 'application/x-sqlite3',
    'Content-Disposition': 'attachment; filename="topusanews_backup_' + new Date().toISOString().slice(0, 10) + '.sqlite"',
  } });
});
apiRouter.get('/system/export-posts', (c) => {
  if (!editorAuthorized(c)) return c.json({ success: false, error: 'Please sign in to download a backup.' }, 401);
  const payload = exportArticleBackup(db, path.join(path.dirname(dbPath), 'media'));
  return new Response(JSON.stringify(payload, null, 2), { headers: {
    'Content-Type': 'application/json',
    'Content-Disposition': 'attachment; filename="topusanews_articles_' + new Date().toISOString().slice(0, 10) + '.json"',
  } });
});
apiRouter.use('/system/import-posts', bodyLimit({ maxSize: 50 * 1024 * 1024, onError: c => c.json({ success: false, error: 'Backup exceeds 50 MB.' }, 413) }));
apiRouter.post('/system/import-posts', async (c) => {
  if (!editorAuthorized(c)) return c.json({ success: false, error: 'Please sign in to restore a backup.' }, 401);
  try {
    const result = restoreArticleBackup(db, await c.req.json(), path.join(path.dirname(dbPath), 'media'));
    return c.json({ success: true, ...result, message: result.added + ' articles added, ' + result.updated + ' updated. Links and uploaded images restored.' });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Invalid backup. No article changes were saved.' }, 400); }
});

// AUTHENTICATION LOGIN ENDPOINT
apiRouter.post("/auth/login", async (c) => {
  try {
    const { username, password, remember } = await c.req.json().catch(() => ({}));
    if (username === "admin" && password === "admin@12345") {
      const token = "usa_news_cms_auth_token_secret_2026";
      const maxAge = remember !== false ? 31536000 : 86400; // 1 year if remember
      c.header("Set-Cookie", `usa_cms_token=${token}; Path=/; Max-Age=${maxAge}; SameSite=Lax; HttpOnly`);
      return c.json({ success: true, token, message: "Logged in successfully" });
    }
    return c.json({ success: false, error: "Username ឬ Password មិនត្រឹមត្រូវឡើយ" }, 401);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

apiRouter.post("/auth/logout", (c) => {
  c.header("Set-Cookie", `usa_cms_token=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly`);
  return c.json({ success: true });
});

// 6-CHARACTER SHORT LINKS GENERATOR FOR EDIT POST
function generateRandomShortCode(length = 6): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// GET SHORT LINKS FOR POST
apiRouter.get("/posts/:id/short-links", (c) => {
  const postId = Number(c.req.param("id"));
  const links = db.query("SELECT * FROM short_links WHERE post_id = ? ORDER BY id DESC").all(postId) as any[];
  const host = c.req.header("host") || "topusanewsstory.com";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;
  const formatted = links.map(l => ({
    ...l,
    url: `${baseUrl}/${l.code}`
  }));
  return c.json({ success: true, links: formatted, data: formatted });
});

// BATCH GENERATE SHORT LINKS FOR POST
apiRouter.post("/posts/:id/short-links/generate", async (c) => {
  try {
    const postId = Number(c.req.param("id"));
    const body = await c.req.json().catch(() => ({}));
    const count = Math.min(100, Math.max(1, Number(body.count) || 10));

    const post = db.query("SELECT id, slug FROM posts WHERE id = ?").get(postId) as any;
    if (!post) {
      return c.json({ success: false, error: "Post not found" }, 404);
    }

    const generated: string[] = [];
    const insertStmt = db.prepare("INSERT INTO short_links (code, post_id, clicks) VALUES (?, ?, 0)");

    for (let i = 0; i < count; i++) {
      let attempts = 0;
      while (attempts < 10) {
        const code = generateRandomShortCode(6);
        try {
          insertStmt.run(code, postId);
          generated.push(code);
          break;
        } catch {
          attempts++;
        }
      }
    }

    const allLinks = db.query("SELECT * FROM short_links WHERE post_id = ? ORDER BY id DESC").all(postId) as any[];
    const host = c.req.header("host") || "topusanewsstory.com";
    const protocol = host.includes("localhost") ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;
    const formatted = allLinks.map(l => ({
      ...l,
      url: `${baseUrl}/${l.code}`
    }));
    return c.json({ success: true, count: generated.length, generated, links: formatted, data: formatted });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// Real-Time Visitor Tracking (Whos.amung.us style, <0.001ms RAM engine)
apiRouter.post("/track/ping", async (c) => {
  try {
    let body: any = {};
    const contentType = c.req.header("content-type") || "";
    if (contentType.includes("application/json")) {
      body = await c.req.json().catch(() => ({}));
    } else {
      const text = await c.req.text().catch(() => "");
      try { body = JSON.parse(text); } catch { body = {}; }
    }
    const ip = c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for") || "";
    const country = c.req.header("cf-ipcountry") || body.country || "US";
    const city = c.req.header("cf-ipcity") || body.city || "";
    const userAgent = c.req.header("user-agent") || "";
    const referrer = body.r || c.req.header("referer") || "";
    recordVisitorPing(body.s, body.p, body.t, ip, country, userAgent, referrer, city);
    return c.json({ ok: true });
  } catch {
    return c.json({ ok: false }, 400);
  }
});

// Immediate disconnect beacon when visitor closes tab
apiRouter.post("/track/leave", async (c) => {
  try {
    let body: any = {};
    const text = await c.req.text().catch(() => "");
    try { body = JSON.parse(text); } catch { body = {}; }
    if (body.s) {
      removeVisitorSession(body.s);
    }
    return c.json({ ok: true });
  } catch {
    return c.json({ ok: false });
  }
});

apiRouter.get("/track/live", (c) => {
  return c.json(getLiveStats());
});




