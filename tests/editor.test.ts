import { expect, test } from 'bun:test';
import { Script, createContext } from 'node:vm';

// Render against an isolated database so editor checks never alter saved posts.
process.env.DB_PATH = ':memory:';
const { adminRouter } = await import('../src/routes/admin');
const { Hono } = await import('hono');
const app = new Hono().route('/admin', adminRouter);

async function editorScripts(path = '/admin/new') {
  const response = await app.request(path, {
    headers: { cookie: 'usa_cms_token=usa_news_cms_auth_token_secret_2026' },
  });
  expect(response.status).toBe(200);
  const html = await response.text();
  return [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]!);
}

function editorContext() {
  const elements = new Map<string, any>();
  const element = (id: string) => {
    if (!elements.has(id)) elements.set(id, {
      value: '', innerHTML: '', innerText: '', textContent: '', disabled: false,
      style: {}, classList: { add() {}, remove() {} }, addEventListener() {}, focus() {},
    });
    return elements.get(id);
  };
  const requests: any[] = [];
  const clipboard: string[] = [];
  const context = createContext({
    document: { readyState: 'loading', addEventListener() {}, getElementById: element,
      querySelectorAll: () => [], body: { style: {} } },
    localStorage: { getItem: () => null }, URL, URLSearchParams,
    location: { origin: 'https://example.com', search: '' },
    navigator: { clipboard: { writeText: async (text: string) => { clipboard.push(text); } } },
    alert() {}, prompt() {}, setTimeout() {},
    fetch: async (url: string, options: any) => {
      requests.push({ url, payload: options?.body ? JSON.parse(options.body) : null });
      return { json: async () => ({ success: true, title: 'Fetched headline', summary: 'Summary',
        content: '<p>Fetched article body</p>', image: 'https://example.com/image.webp',
        formatted_html: '<p>Formatted article body</p>' }) };
    },
  });
  context.window = context;
  return { context, element, requests, clipboard };
}

test('every rendered editor script parses and editor controls initialize', async () => {
  const { context } = editorContext();
  for (const source of await editorScripts()) new Script(source).runInContext(context);
  for (const name of ['fetchArticleFromLink', 'executeAiProcess', 'saveAndDeploy',
    'setViewMode', 'applyFreePreset', 'handleFileSelect', 'generateShortLinks', 'execFormat']) {
    expect(typeof context[name]).toBe('function');
  }
});

test('fetch, formatting, presets, view switching, saving and copying work together', async () => {
  const { context, element, requests, clipboard } = editorContext();
  for (const source of await editorScripts()) new Script(source).runInContext(context);
  element('fetchUrlInput').value = 'example.com/story';
  element('imageInput').value = '/media/selected.webp';
  await context.fetchArticleFromLink();
  expect(requests[0].payload.url).toBe('https://example.com/story');
  expect(element('titleInput').value).toBe('Fetched headline');
  for (const id of ['postVisualEditor', 'splitPostEditor']) {
    expect(element(id).innerHTML).toBe('<p>Fetched article body</p>');
  }
  expect(element('htmlCodeEditor').value).toBe('<p>Fetched article body</p>');
  expect(element('btnFetchUrl').disabled).toBe(false);
  expect(element('imageInput').value).toBe('/media/selected.webp');
  context.setViewMode('both');
  expect(element('bothViewWrapper').style.display).toBe('block');
  await context.executeAiProcess('format');
  expect(element('htmlCodeEditor').value).toBe('<p>Formatted article body</p>');
  expect(element('imageInput').value).toBe('/media/selected.webp');
  context.applyFreePreset('wire');
  context.applyFreePreset('wire');
  expect(element('htmlCodeEditor').value.match(/tk-summary-box/g)?.length).toBe(1);
  expect(element('htmlCodeEditor').value).toContain('<p>Formatted article body</p>');
  await context.saveAndDeploy('draft');
  expect(requests.find(request => request.url === '/api/posts').payload.status).toBe('draft');
  new Script("generatedShortLinksCache = [{code: 'aaaaaa'}, {code: 'bbbbbb'}]; copyAllShortLinks();").runInContext(context);
  expect(clipboard[0]).toBe('https://example.com/aaaaaa\nhttps://example.com/bbbbbb');
});
