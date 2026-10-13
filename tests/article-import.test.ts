import { expect, test } from 'bun:test';
import { extractArticleHtml } from '../src/utils/article-import';

test('article import preserves source links, social quotes, images and short text safely', async () => {
  const result = await extractArticleHtml(`<nav><p>Navigation</p></nav><article>
    <h2>Update</h2><p>Short update. <a href="/source?q=1&ref=2" onclick="steal()">Source</a></p>
    <blockquote class="twitter-tweet"><p>A social post</p><a href="https://x.com/reporter/status/123">View on X</a></blockquote>
    <figure><a href="/original-post"><img data-src="/photo.jpg?token=keep" onerror="steal()" alt="Photo"></a><figcaption>Credit</figcaption></figure>
    <script>alert(1)</script><p><a href="javascript:alert(1)">Unsafe URL</a></p>
  </article><footer><p>Footer</p></footer>`, 'https://news.example/story');
  expect(result.content).toContain('https://news.example/source?q=1&ref=2');
  expect(result.content).toContain('https://x.com/reporter/status/123');
  expect(result.content).toContain('Short update.');
  expect(result.content).toContain('class="twitter-tweet"');
  expect(result.images[0]).toBe('https://news.example/photo.jpg?token=keep');
  expect(result.content).not.toMatch(/onclick|onerror|javascript:|<script|Navigation|Footer/);
});

import { splitArticleAfterParagraphs } from '../src/utils/article-display';
test('published article keeps media and headings on both sides of read more', () => {
  const html = '<h2>Headline</h2><p>First</p><figure><img src="/media/first.webp"></figure><p>Second</p><h3>Details</h3><blockquote><p>Social quote</p><a href="https://x.com/a/status/1">X post</a></blockquote><figure><img src="/media/second.webp"></figure><p>Last</p>';
  const parts = splitArticleAfterParagraphs(html)!;
  expect(parts.lead + parts.rest).toBe(html);
  expect(parts.lead).toContain('/media/first.webp');
  expect(parts.rest).toContain('<h3>Details</h3>');
  expect(parts.rest).toContain('/media/second.webp');
  expect(parts.rest).toContain('https://x.com/a/status/1');
});
test('read more does not break a nested social quote', () => {
  const html = '<p>First</p><blockquote><p>Second</p><a href="https://x.com/a/status/1">Source</a></blockquote><p>Third</p>';
  const parts = splitArticleAfterParagraphs(html)!;
  expect(parts.lead).toEndWith('</blockquote>');
  expect(parts.rest).toBe('<p>Third</p>');
});

test('imports publishers that use h5/h6 for the entire article body', async () => {
  const result = await extractArticleHtml('<article><header><h1>Title</h1></header><div class="entry-content"><h5>Actual article text with <a href="/reference">a source link</a>.</h5><h5></h5><h6>Second paragraph.</h6><script>advertisement()</script></div></article>', 'https://news.example/story');
  expect(result.text).toContain('Actual article text');
  expect(result.content).toContain('<p>Second paragraph.</p>');
  expect(result.content).toContain('href="https://news.example/reference"');
  expect(result.content).not.toContain('advertisement()');
});
