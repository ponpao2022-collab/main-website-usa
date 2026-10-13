import { Database } from 'bun:sqlite';
import { createHash } from 'node:crypto';
import fs from 'node:fs';

const databasePath = process.env.DB_PATH || 'news.sqlite';
let content = '';
if (fs.existsSync(databasePath)) {
  const database = new Database(databasePath, { readonly: true });
  try { content = (database.query('SELECT content FROM posts').all() as {content: string}[]).map(post => post.content || '').join('\n'); }
  finally { database.close(); }
}
if (process.env.PUBLIC_CSS_SNAPSHOT && fs.existsSync(process.env.PUBLIC_CSS_SNAPSHOT)) {
  const snapshot = await Bun.file(process.env.PUBLIC_CSS_SNAPSHOT).json();
  content += '\n' + (snapshot.posts || []).map((post: any) => post.content || '').join('\n');
}
fs.mkdirSync('.cache', { recursive: true });
await Bun.write('.cache/public-post-content.html', content);
const result = Bun.spawnSync([process.execPath, 'node_modules/tailwindcss/lib/cli.js', '-c', 'tailwind.public.config.cjs', '-i', 'styles/public.css', '-o', '.cache/public-compiled.css', '--minify']);
if (result.exitCode !== 0) throw Error(result.stderr.toString());
const css = await Bun.file('.cache/public-compiled.css').text();
const hash = createHash('sha256').update(css).digest('hex').slice(0, 12);
const filename = 'public-' + hash + '.css';
await Bun.write('public/assets/' + filename, css);
await Bun.write('src/data/public-css.json', JSON.stringify({ css: '/assets/' + filename }, null, 2) + '\n');
console.log('Visitor CSS built: ' + css.length + ' bytes.');
