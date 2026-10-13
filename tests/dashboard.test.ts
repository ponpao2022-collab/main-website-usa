import { expect, test } from 'bun:test';
import { Script } from 'node:vm';
process.env.DB_PATH = ':memory:';
const { adminRouter } = await import('../src/routes/admin');
const { Hono } = await import('hono');
const app = new Hono().route('/admin', adminRouter);

test('dashboard renders one navigation and working script syntax without changing editor routes', async () => {
  const response = await app.request('/admin', { headers: { cookie: 'usa_cms_token=usa_news_cms_auth_token_secret_2026' } });
  expect(response.status).toBe(200);
  const html = await response.text();
  for (const source of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) new Script(source[1]!);
  new Script(await Bun.file('public/assets/cms-dashboard.js').text());
  for (const id of ['mainTabArticlesBtn', 'mainTabTrackingBtn', 'cmsArticleSearch', 'cmsStatusFilter', 'cmsCategoryFilter', 'catModal', 'backupModal']) {
    expect(html.match(new RegExp('id="' + id + '"', 'g'))?.length).toBe(1);
  }
  expect(html).toContain('aria-label="CMS navigation"');
  expect(html).not.toContain('100% Operational (24ms)');
});
