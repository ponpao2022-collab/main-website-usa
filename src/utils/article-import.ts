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
