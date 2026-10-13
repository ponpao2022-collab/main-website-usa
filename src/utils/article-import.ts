const safeTags = new Set(['p', 'a', 'strong', 'b', 'em', 'i', 'u', 's', 'br', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'figure', 'figcaption', 'img']);
const discarded = 'script,style,nav,header,footer,form,button,input,svg,object,embed';
export function absoluteWebUrl(value: string, base: string) {
  try {
    const url = new URL(value.replace(/&amp;/g, '&'), base);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}

// Keep semantic article markup and source links, never executable source-site markup.
export async function extractArticleHtml(html: string, base: string) {
  const article = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)
    || html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  let source = article?.[1] || html;
  source = source.replace(/<(div|section)\b[^>]*(?:id|class)=["'][^"']*(?:comments-area|commentform|related-posts)[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi, '');
  const sanitized = await new HTMLRewriter()
    .on(discarded, { element(el) { el.remove(); } })
    .on('iframe', { element(el) {
      const url = absoluteWebUrl(el.getAttribute('src') || '', base);
      if (!url) { el.remove(); return; }
      const escaped = url.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
      el.replace('<blockquote><a href="' + escaped + '" rel="noopener noreferrer">View embedded post</a></blockquote>', { html: true });
    } })
    .on('*', { element(el) {
      let tag = el.tagName.toLowerCase();
      // Some news publishers put entire paragraphs in h5/h6 elements.
      if (tag === 'h5' || tag === 'h6') { el.tagName = 'p'; tag = 'p'; }
      if (!safeTags.has(tag)) { el.removeAndKeepContent(); return; }
      const isTweet = tag === 'blockquote' && /twitter-tweet/.test(el.getAttribute('class') || '');
      const href = el.getAttribute('href') || '';
      const src = el.getAttribute('data-src') || el.getAttribute('data-lazy-src') || el.getAttribute('src') || '';
      const alt = el.getAttribute('alt') || '';
      for (const [name] of [...el.attributes]) el.removeAttribute(name);
      if (isTweet) { el.setAttribute('class', 'twitter-tweet'); el.setAttribute('data-dnt', 'true'); }
      if (tag === 'a') {
        const url = absoluteWebUrl(href, base);
        if (url) { el.setAttribute('href', url); el.setAttribute('rel', 'noopener noreferrer'); }
        else el.removeAndKeepContent();
      }
      if (tag === 'img') {
        const url = absoluteWebUrl(src, base);
        if (!url) { el.remove(); return; }
        el.setAttribute('src', url); el.setAttribute('alt', alt);
        el.setAttribute('loading', 'lazy');
      }
    } }).transform(new Response(source)).text();
  // Ignore surrounding navigation text, but keep short paragraphs and social post quotes.
  const blocks = sanitized.match(/<(p|h[234]|ul|ol|blockquote|figure)\b[^>]*>[\s\S]*?<\/\1>|<img\b[^>]*>|<a\b[^>]*>[\s\S]*?<\/a>/gi) || [];
  const content = blocks.filter(block => !/^<p>\s*<\/p>$/i.test(block)).map(block => {
    if (/^<a\b/i.test(block) && /href="https?:\/\/(?:www\.)?(?:x|twitter)\.com\/[^"]*\/status\/\d+/i.test(block)) {
      return '<blockquote class="twitter-tweet" data-dnt="true">' + block + '</blockquote>';
    }
    return block;
  }).join('\n\n');
  const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const images = [...content.matchAll(/<img\b[^>]*src="([^"]+)"/gi)].map(m => m[1]!);
  return { content, text, images };
}

export async function extractHeadline(html: string, base: string) {
  const headings: string[] = []; let current = -1, documentTitle = '', ogTitle = '', siteName = '';
  await new HTMLRewriter()
    .on('article h1,.entry-title,[itemprop="headline"]', {
      element() { current = headings.push('') - 1; },
      text(chunk) { if (current >= 0) headings[current] += chunk.text; },
    })
    .on('title', { text(chunk) { documentTitle += chunk.text; } })
    .on('meta', { element(el) {
      const property = el.getAttribute('property') || el.getAttribute('name');
      if (property === 'og:title') ogTitle = el.getAttribute('content') || '';
      if (property === 'og:site_name') siteName = el.getAttribute('content') || '';
    } }).transform(new Response(html)).text();
  const decode = (value: string) => value.replace(/&#(x[\da-f]+|\d+);/gi, (_, code: string) => {
    const point = code.toLowerCase().startsWith('x') ? parseInt(code.slice(1), 16) : Number(code);
    return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : '';
  }).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&hellip;/g, '…').replace(/&ndash;/g, '–').replace(/&mdash;/g, '—').replace(/&nbsp;/g, ' ');
  let title = decode(headings.find(value => value.trim()) || ogTitle || documentTitle).replace(/\s+/g, ' ').trim();
  const names = [decode(siteName), new URL(base).hostname.replace(/^www\./, '')].filter(Boolean);
  for (const name of names) {
    const suffix = new RegExp('\\s+[|–—-]\\s+' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'i');
    title = title.replace(suffix, '');
  }
  return title.replace(/^[\s.…]+/, '').trim();
}

export async function importedTextWithoutImages(content: string) {
  return new HTMLRewriter().on('figure,img', { element(el) { el.remove(); } })
    .transform(new Response(content)).text();
}
