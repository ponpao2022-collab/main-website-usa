import { expect, test } from 'bun:test';
import { Script } from 'node:vm';
process.env.DB_PATH = ':memory:';
const { apiRouter } = await import('../src/routes/api');
const { Hono } = await import('hono');
const app = new Hono().route('/api', apiRouter);
const cookie = 'usa_cms_token=usa_news_cms_auth_token_secret_2026';

test('Image Studio script parses independently of the generated editor', async () => {
  new Script(await Bun.file('public/assets/editor-studio.js').text());
});
test('media import requires editor sign-in and rejects private hosts', async () => {
  expect((await app.request('/api/media/import?url=https://example.com/image.jpg')).status).toBe(401);
  const response = await app.request('/api/media/import?url=http://127.0.0.1/private', { headers: { cookie } });
  expect(response.status).toBe(400);
  expect(((await response.json()) as { error: string }).error).toContain('public image hosts');
});
test('media upload enforces the under-50-KB WebP requirement', async () => {
  for (const [size, signature] of [[51 * 1024, 'RIFF0000WEBP'], [32, 'invalid']] as const) {
    const bytes = new Uint8Array(size); bytes.set(new TextEncoder().encode(signature));
    const body = new FormData(); body.append('image', new Blob([bytes]), 'edited.webp');
    const response = await app.request('/api/media/upload', { method: 'POST', headers: { cookie }, body });
    expect(response.status).toBe(400);
    expect(((await response.json()) as { success: boolean }).success).toBe(false);
  }
});
