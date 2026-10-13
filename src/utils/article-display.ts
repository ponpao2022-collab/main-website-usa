// Split only at a complete top-level block so media, headings and social quotes survive.
export function splitArticleAfterParagraphs(content: string, count = 2) {
  const stack: string[] = [];
  let paragraphs = 0, boundary = -1;
  const voidTags = new Set(['img', 'br', 'hr', 'input', 'meta', 'link', 'source', 'wbr', 'area', 'base', 'col', 'embed', 'param', 'track']);
  for (const match of content.matchAll(/<!--[\s\S]*?-->|<\/?([a-z][a-z0-9]*)\b[^>]*>/gi)) {
    if (!match[1]) continue;
    const tag = match[1].toLowerCase();
    if (match[0].startsWith('</')) {
      if (tag === 'p') paragraphs++;
      const index = stack.lastIndexOf(tag);
      if (index >= 0) stack.length = index;
      if (boundary < 0 && paragraphs >= count && !stack.length) boundary = match.index! + match[0].length;
    } else if (!voidTags.has(tag) && !match[0].endsWith('/>')) stack.push(tag);
  }
  if (paragraphs <= count || boundary < 0) return null;
  return { lead: content.slice(0, boundary), rest: content.slice(boundary) };
}
